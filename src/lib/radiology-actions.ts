/**
 * Shared radiology (RIS) mutations. Builds on db.orders (kind:'imaging') from
 * the doctor, and the billing spine (createInvoiceRecord / captureInvoicePayment
 * → INVOICE_PAID) so payment unlocks scheduling/scanning and Lab/EMR stay in sync.
 * Workflow: REQUEST → (accept) → AWAITING_PAYMENT → PAID → SCHEDULED →
 * IN_PROGRESS → IMAGING_DONE → REPORTED → VERIFIED → RELEASED.
 */
import { db } from '@/db/database';
import { nextId, nowHuman, nowIso } from '@/db/ids';
import { createInvoiceRecord, captureInvoicePayment } from '@/lib/billing-actions';
import { evaluateEcgFlags } from '@/lib/ecg-critical-rules';
import type {
  ImagingRequest, RadModality, RadPriority, RadRequestStatus, RadiologyReport,
  EcgStudy, EcgType, RadEquipment, EquipmentStatus, RadConsumable, RadFormInstance,
  PaymentChannel, Order,
} from '@/data-access/types';

const now = () => nowHuman();
const audit = (actor: string, action: string, entity: string, entityId: string, ref?: string) =>
  db.audit.add({ actor, role: 'Radiology', action, entity, entityId, invoiceRef: ref });

export const MODALITY_PRICE: Record<RadModality, number> = {
  'X-Ray': 8500, 'Ultrasound': 12000, 'CT Scan': 45000, 'MRI': 120000, 'ECG': 5500,
  'EEG': 25000, 'Mammography': 18000, 'Fluoroscopy': 30000, 'Echocardiography': 22000, 'Portable': 15000,
};

const guessModality = (name: string): RadModality => {
  const n = name.toLowerCase();
  if (n.includes('mri')) return 'MRI';
  if (n.includes('ct')) return 'CT Scan';
  if (n.includes('ultrasound') || n.includes('uss') || n.includes('scan') && n.includes('abdo')) return 'Ultrasound';
  if (n.includes('echo')) return 'Echocardiography';
  if (n.includes('ecg') || n.includes('ekg')) return 'ECG';
  if (n.includes('eeg')) return 'EEG';
  if (n.includes('mammo')) return 'Mammography';
  if (n.includes('fluoro')) return 'Fluoroscopy';
  return 'X-Ray';
};

// =====================================================================
// REQUESTS
// =====================================================================
export function listRequests(): ImagingRequest[] { return db.imagingRequests.list(); }

export function createImagingRequest(input: {
  patientId: string; modality: RadModality; region: string; indication: string;
  priority?: RadPriority; requestedBy?: string; clinic?: string; ward?: string;
  source?: ImagingRequest['source']; portable?: boolean; clinicalNotes?: string; orderId?: string;
}): ImagingRequest {
  const p = db.patients.get(input.patientId);
  const amount = MODALITY_PRICE[input.modality] ?? 10000;
  const row: ImagingRequest = {
    id: nextId('RAD'),
    orderId: input.orderId,
    patientId: input.patientId,
    patientName: p?.name ?? 'Unknown',
    hospitalId: p?.hospitalId ?? '—',
    modality: input.modality,
    region: input.region,
    clinic: input.clinic ?? 'GMPC',
    ward: input.ward,
    requestedBy: input.requestedBy ?? 'Doctor',
    priority: input.priority ?? 'ROUTINE',
    source: input.source ?? 'Doctor',
    indication: input.indication,
    clinicalNotes: input.clinicalNotes,
    status: 'REQUESTED',
    paymentStatus: 'UNPAID',
    amount,
    portable: input.portable,
    prep: { status: input.modality === 'CT Scan' || input.modality === 'MRI' ? 'PENDING' : 'NOT_REQUIRED' },
    safety: { pregnancy: 'UNKNOWN', creatinine: getLatestCreatinine(input.patientId), consent: false },
    createdAt: nowIso(), updatedAt: nowIso(),
    audit: [{ action: 'Request created', by: input.requestedBy ?? 'Doctor', at: now() }],
  };
  db.imagingRequests.insert(row);
  db.emit('RAD_REQUEST_CREATED', { requestId: row.id });
  audit(row.requestedBy, `Imaging request ${row.modality} (${row.region}) created`, 'imaging', row.id);
  return row;
}

/** Import a doctor's imaging order (db.orders kind:'imaging') into the RIS. Idempotent by orderId. */
export function importImagingOrder(order: Order): ImagingRequest | undefined {
  if (order.kind !== 'imaging') return;
  if (db.imagingRequests.list().some(r => r.orderId === order.id)) return;
  const first = order.items[0];
  if (!first) return;
  const modality = guessModality(first.name);
  return createImagingRequest({
    patientId: order.patientId,
    modality,
    region: first.name,
    indication: 'Doctor imaging order',
    orderId: order.id,
    source: 'Doctor',
  });
}

const patchRequest = (id: string, patch: Partial<ImagingRequest>, action?: string, by = 'Radiology', note?: string) => {
  const r = db.imagingRequests.get(id);
  if (!r) return;
  const auditTrail = action ? [...r.audit, { action, by, at: now(), note }] : r.audit;
  db.imagingRequests.update(id, { ...patch, updatedAt: nowIso(), audit: auditTrail });
};

export function acceptRequest(id: string, by = 'Radiology') {
  patchRequest(id, { status: 'ACCEPTED' }, 'Accepted', by);
  db.emit('RAD_REQUEST_ACCEPTED', { requestId: id });
  return { ok: true as const, message: 'Request accepted.' };
}
export function rejectRequest(id: string, reason: string, by = 'Radiology') {
  if (reason.trim().length < 4) return { ok: false as const, message: 'Provide a rejection reason.' };
  patchRequest(id, { status: 'REJECTED' }, 'Rejected', by, reason);
  return { ok: true as const, message: 'Request rejected.' };
}

// =====================================================================
// BILLING
// =====================================================================
export function generateRadInvoice(id: string, by = 'Cashier'): string {
  const r = db.imagingRequests.get(id);
  if (!r) return '';
  if (r.invoiceId && db.invoices.get(r.invoiceId)) return r.invoiceId;
  const p = db.patients.get(r.patientId);
  const inv = createInvoiceRecord({
    patientName: r.patientName,
    hospitalId: p?.hospitalId ?? r.hospitalId,
    phone: p?.phone ?? '',
    department: 'Radiology',
    amount: r.amount,
    source: 'Radiology',
    lines: [{ desc: `${r.modality} — ${r.region}`, qty: 1, unitPrice: r.amount, source: 'Radiology' }],
  });
  patchRequest(id, { status: 'AWAITING_PAYMENT', invoiceId: inv.invoiceId, paymentStatus: 'PENDING' }, `Invoice ${inv.invoiceId} generated`, by);
  return inv.invoiceId;
}

const payChannel = (method: 'Cash' | 'POS' | 'Transfer' | 'Wallet' | 'NHIA' | 'HMO'): PaymentChannel => {
  switch (method) {
    case 'POS': return 'POS Card';
    case 'Transfer': return 'Bank Transfer';
    case 'Wallet': return 'Wallet';
    case 'NHIA': return 'NHIA';
    case 'HMO': return 'HMO';
    default: return 'Cash';
  }
};

export function markRadPaid(id: string, p: { amount: number; method: 'Cash' | 'POS' | 'Transfer' | 'Wallet' | 'NHIA' | 'HMO'; ref?: string; cashier: string }) {
  let r = db.imagingRequests.get(id);
  if (!r) return { ok: false as const, message: 'Request not found' };
  if (!r.invoiceId || !db.invoices.get(r.invoiceId)) { generateRadInvoice(id, p.cashier); r = db.imagingRequests.get(id); }
  if (!r?.invoiceId) return { ok: false as const, message: 'Could not create invoice' };
  const res = captureInvoicePayment({ invoiceId: r.invoiceId, amount: p.amount, channel: payChannel(p.method), cashier: p.cashier, bankRef: p.ref, terminal: p.method === 'POS' ? p.ref : undefined });
  if (!res.ok) return res;
  patchRequest(id, { status: 'PAID', paymentStatus: 'PAID' }, `Payment captured ₦${p.amount.toLocaleString()} via ${p.method}`, p.cashier);
  return { ok: true as const, receipt: res.receipt, message: `Payment captured. ${res.message}` };
}

/** INVOICE_PAID listener — flip the matching imaging request to PAID. */
export function onInvoicePaidForRad(invoiceId: string) {
  const r = db.imagingRequests.list().find(x => x.invoiceId === invoiceId);
  if (!r || r.paymentStatus === 'PAID') return;
  patchRequest(r.id, { status: r.status === 'AWAITING_PAYMENT' || r.status === 'REQUESTED' || r.status === 'ACCEPTED' ? 'PAID' : r.status, paymentStatus: 'PAID' }, 'Payment confirmed (cashier)', 'Cashier');
}

// =====================================================================
// SCHEDULING / PREP / EXAMINATION
// =====================================================================
export function scheduleRequest(id: string, opts: { machineId?: string; radiographer?: string; scheduledAt?: string }, by = 'Radiology') {
  const r = db.imagingRequests.get(id);
  if (!r) return { ok: false as const, message: 'Request not found' };
  if (r.paymentStatus !== 'PAID' && r.priority !== 'EMERGENCY') return { ok: false as const, message: 'Payment required before scheduling (except emergencies).' };
  patchRequest(id, { status: 'SCHEDULED', ...opts }, `Scheduled${opts.machineId ? ` on ${opts.machineId}` : ''}`, by);
  db.emit('RAD_SCHEDULED', { requestId: id });
  return { ok: true as const, message: 'Examination scheduled.' };
}

export function updatePrep(id: string, prep: Partial<ImagingRequest['prep']>, by = 'Nurse') {
  const r = db.imagingRequests.get(id);
  if (!r) return;
  patchRequest(id, { prep: { ...r.prep, ...prep } }, 'Preparation updated', by);
}

export function updateSafety(id: string, safety: Partial<ImagingRequest['safety']>, by = 'Radiographer') {
  const r = db.imagingRequests.get(id);
  if (!r) return;
  patchRequest(id, { safety: { ...r.safety, ...safety } }, 'Safety screening updated', by);
}

export function startExam(id: string, radiographer: string) {
  patchRequest(id, { status: 'IN_PROGRESS', arrivalAt: now(), radiographer }, 'Examination started', radiographer);
  return { ok: true as const, message: 'Examination in progress.' };
}

export function completeImaging(id: string, opts: {
  radiographer: string; contrastUsed?: boolean; radiationDose?: number;
  consumableId?: string; machineId?: string; studyUid?: string;
}) {
  const r = db.imagingRequests.get(id);
  if (!r) return { ok: false as const, message: 'Request not found' };
  const studyUid = opts.studyUid?.trim() || `1.2.826.${Date.now()}`;
  patchRequest(id, {
    status: 'IMAGING_DONE', studyUid, contrastUsed: opts.contrastUsed, radiationDose: opts.radiationDose,
    radiographer: opts.radiographer, machineId: opts.machineId ?? r.machineId,
  }, `Imaging completed (Study ${studyUid})`, opts.radiographer);
  if (opts.consumableId) adjustConsumable(opts.consumableId, -1, opts.radiographer);
  if (opts.machineId ?? r.machineId) {
    const eq = db.radEquipment.get((opts.machineId ?? r.machineId)!);
    if (eq) db.radEquipment.update(eq.id, { usageHours: eq.usageHours + 1 });
  }
  db.emit('RAD_IMAGING_DONE', { requestId: id });
  return { ok: true as const, message: `Imaging completed. Study UID ${studyUid}.` };
}

// =====================================================================
// REPORTING / VERIFICATION / RELEASE
// =====================================================================
export function submitReport(input: {
  requestId: string; findings: string; impression: string; recommendations?: string;
  technique?: string; template?: string; critical?: boolean; criticalFinding?: string;
  aiAssisted?: boolean; aiSummary?: string; reportedBy: string;
}) {
  const r = db.imagingRequests.get(input.requestId);
  if (!r) return { ok: false as const, message: 'Request not found' };
  if (input.impression.trim().length < 3) return { ok: false as const, message: 'Impression is required' };
  const report: RadiologyReport = {
    id: nextId('RRP'), requestId: input.requestId, patientId: r.patientId, patientName: r.patientName,
    modality: r.modality, technique: input.technique, findings: input.findings, impression: input.impression,
    recommendations: input.recommendations, template: input.template, status: 'SUBMITTED',
    critical: !!input.critical, criticalFinding: input.criticalFinding, aiAssisted: input.aiAssisted, aiSummary: input.aiSummary,
    reportedBy: input.reportedBy, createdAt: nowIso(), updatedAt: nowIso(),
    audit: [{ action: 'Report submitted', by: input.reportedBy, at: now() }],
  };
  db.radiologyReports.insert(report);
  patchRequest(input.requestId, { status: 'REPORTED' }, 'Report submitted', input.reportedBy);
  db.emit('RAD_REPORT_SUBMITTED', { reportId: report.id });
  if (report.critical) {
    db.emit('RAD_CRITICAL_FINDING', { reportId: report.id });
    audit(input.reportedBy, `CRITICAL FINDING flagged — ${input.criticalFinding ?? report.impression}`, 'report', report.id);
  }
  return { ok: true as const, message: report.critical ? 'Report submitted. CRITICAL finding — clinicians notified.' : 'Report submitted for verification.', id: report.id };
}

export function verifyReport(reportId: string, by: string) {
  const rep = db.radiologyReports.get(reportId);
  if (!rep) return { ok: false as const, message: 'Report not found' };
  db.radiologyReports.update(reportId, { status: 'VERIFIED', verifiedBy: by, signature: `${by} · ${now()}`, updatedAt: nowIso(), audit: [...rep.audit, { action: 'Verified', by, at: now() }] });
  patchRequest(rep.requestId, { status: 'VERIFIED' }, 'Report verified', by);
  db.emit('RAD_REPORT_VERIFIED', { reportId });
  return { ok: true as const, message: 'Report verified and signed.' };
}

export function returnReport(reportId: string, by: string, note: string) {
  const rep = db.radiologyReports.get(reportId);
  if (!rep) return { ok: false as const, message: 'Report not found' };
  db.radiologyReports.update(reportId, { status: 'RETURNED', updatedAt: nowIso(), audit: [...rep.audit, { action: 'Returned for correction', by, at: now(), note }] });
  patchRequest(rep.requestId, { status: 'REPORT_PENDING' }, 'Report returned for correction', by, note);
  return { ok: true as const, message: 'Report returned for correction.' };
}

export function releaseResult(reportId: string, by: string) {
  const rep = db.radiologyReports.get(reportId);
  if (!rep) return { ok: false as const, message: 'Report not found' };
  if (rep.status !== 'VERIFIED') return { ok: false as const, message: 'Report must be verified before release.' };
  db.radiologyReports.update(reportId, { status: 'RELEASED', updatedAt: nowIso(), audit: [...rep.audit, { action: 'Released', by, at: now() }] });
  patchRequest(rep.requestId, { status: 'RELEASED' }, 'Result released', by);
  db.emit('RAD_RESULT_RELEASED', { reportId });
  db.emit('IMAGING_RESULT_READY', { reportId, requestId: rep.requestId, patientId: rep.patientId });
  return { ok: true as const, message: 'Result released to doctor/ward/patient portal.' };
}

export function criticalFindings(): RadiologyReport[] {
  return db.radiologyReports.list().filter(r => r.critical);
}

// =====================================================================
// ECG
// =====================================================================
export function recordEcg(input: {
  patientId: string; type: EcgType; clinicalHistory?: string; reportedBy?: string;
  measurements: EcgStudy['measurements']; machineInterpretation?: string; requestId?: string;
}): EcgStudy {
  const p = db.patients.get(input.patientId);
  const m = input.measurements;
  const { abnormal, critical } = evaluateEcgFlags({
    heartRate: m.heartRate,
    qtc: m.qtc,
    rhythm: m.rhythm,
    stElevation: m.stElevation,
    stDepression: m.stDepression,
    stChanges: m.stElevation ? 'ST elevation' : m.stDepression ? 'ST depression' : undefined,
  });
  const row: EcgStudy = {
    id: nextId('ECG'), requestId: input.requestId, patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    type: input.type, clinicalHistory: input.clinicalHistory, measurements: m,
    machineInterpretation: input.machineInterpretation, status: 'SUBMITTED', abnormal, critical,
    reportedBy: input.reportedBy, createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.ecgStudies.insert(row);
  db.emit('ECG_RECORDED', { ecgId: row.id });
  if (critical) db.emit('RAD_CRITICAL_FINDING', { ecgId: row.id });
  audit(input.reportedBy ?? 'ECG Tech', `ECG (${input.type}) recorded${critical ? ' — CRITICAL' : abnormal ? ' — abnormal' : ''}`, 'ecg', row.id);
  return row;
}

export function interpretEcg(id: string, cardiologistInterpretation: string, impression: string, by: string) {
  const e = db.ecgStudies.get(id);
  if (!e) return { ok: false as const, message: 'ECG not found' };
  db.ecgStudies.update(id, { cardiologistInterpretation, impression, verifiedBy: by, status: 'VERIFIED', signature: `${by} · ${now()}`, updatedAt: nowIso() });
  db.emit('ECG_VERIFIED', { ecgId: id });
  return { ok: true as const, message: 'ECG interpreted and verified.' };
}

// =====================================================================
// EQUIPMENT & CONSUMABLES
// =====================================================================
export function setEquipmentStatus(id: string, status: EquipmentStatus, note?: string, by = 'Engineer') {
  const eq = db.radEquipment.get(id);
  if (!eq) return { ok: false as const, message: 'Equipment not found' };
  db.radEquipment.update(id, { status, faultNote: status === 'OFFLINE' || status === 'MAINTENANCE' ? note : undefined });
  db.emit('EQUIPMENT_STATUS_CHANGED', { equipmentId: id, status });
  audit(by, `${eq.name} set to ${status}${note ? ` — ${note}` : ''}`, 'equipment', id);
  return { ok: true as const, message: `${eq.name} is now ${status}.` };
}

export function adjustConsumable(id: string, delta: number, by = 'Radiology') {
  const c = db.radConsumables.get(id);
  if (!c) return { ok: false as const, message: 'Consumable not found' };
  const stock = Math.max(0, c.stock + delta);
  db.radConsumables.update(id, { stock });
  audit(by, `${c.name} stock ${delta >= 0 ? '+' : ''}${delta} → ${stock}`, 'consumable', id);
  return { ok: true as const, message: `${c.name} stock updated to ${stock} ${c.unit}.` };
}

export function lowStockConsumables(): RadConsumable[] {
  return db.radConsumables.list().filter(c => c.stock <= c.reorderLevel);
}

// =====================================================================
// FORMS
// =====================================================================
export const RADIOLOGY_FORMS = [
  'Radiology Request Form', 'ECG Request Form', 'Imaging Appointment Form', 'Patient Preparation Checklist',
  'MRI Safety Screening Questionnaire', 'CT Contrast Screening Form', 'Contrast Administration Record',
  'Allergy & Adverse Reaction Form', 'Pregnancy Screening Form', 'Radiographer Examination Worksheet',
  'Radiation Dose Record', 'Portable Imaging Request Form', 'Ultrasound Examination Worksheet',
  'Echocardiography Worksheet', 'ECG Acquisition Form', 'ECG Interpretation Form',
  'Structured Radiology Report Template', 'Critical Findings Communication Log', 'Image Quality Assurance Checklist',
  'Equipment Fault & Maintenance Report', 'Film/CD Release Form', 'Patient Result Collection Form',
  'Incident & Safety Reporting Form', 'Repeat Examination Justification Form', 'Radiology Consent Form',
];

export function saveRadForm(input: { type: string; patientId: string; requestId?: string; values: Record<string, string | number | boolean>; signedBy: string }): RadFormInstance {
  const p = db.patients.get(input.patientId);
  const row: RadFormInstance = {
    id: nextId('RFM'), type: input.type, requestId: input.requestId, patientId: input.patientId,
    patientName: p?.name ?? 'Unknown', values: input.values, signedBy: input.signedBy, createdAt: nowIso(),
  };
  db.radForms.insert(row);
  audit(input.signedBy, `${input.type} completed`, 'radform', row.id);
  return row;
}

// =====================================================================
// CROSS-MODULE READS
// =====================================================================
/** Best-effort creatinine retrieval from Lab orders for contrast safety. */
export function getLatestCreatinine(patientId: string): number | undefined {
  const labs = db.orders.list().filter(o => o.kind === 'lab' && o.patientId === patientId);
  for (const o of labs) {
    const meta: any = (o as any).labMeta;
    const results: any[] = meta?.results ?? meta?.tests ?? [];
    for (const t of results) {
      const name = (t?.name ?? t?.test ?? '').toLowerCase();
      const val = Number(t?.value ?? t?.result);
      if (name.includes('creatinine') && !Number.isNaN(val)) return val;
    }
  }
  return undefined;
}

// =====================================================================
// METRICS / ANALYTICS
// =====================================================================
const isToday = (ts: string) => (ts ?? '').slice(0, 10) === new Date().toISOString().slice(0, 10);

export function dashboardMetrics() {
  const reqs = db.imagingRequests.list();
  const reports = db.radiologyReports.list();
  const ecgs = db.ecgStudies.list();
  const byStatus = (s: RadRequestStatus) => reqs.filter(r => r.status === s).length;
  const waitingModality = (m: RadModality) => reqs.filter(r => r.modality === m && !['RELEASED', 'VERIFIED', 'IMAGING_DONE', 'REPORTED', 'CANCELLED', 'REJECTED'].includes(r.status)).length;
  return {
    totalToday: reqs.filter(r => isToday(r.createdAt)).length,
    pending: byStatus('REQUESTED') + byStatus('ACCEPTED') + byStatus('AWAITING_PAYMENT'),
    scheduled: byStatus('SCHEDULED'),
    inProgress: byStatus('IN_PROGRESS'),
    reportsAwaiting: reports.filter(r => r.status === 'SUBMITTED').length,
    reportsToday: reports.filter(r => isToday(r.updatedAt) && (r.status === 'VERIFIED' || r.status === 'RELEASED')).length,
    critical: reports.filter(r => r.critical && r.status !== 'RELEASED').length + ecgs.filter(e => e.critical).length,
    ecgWaiting: ecgs.filter(e => e.status === 'SUBMITTED').length,
    ecgCompleted: ecgs.filter(e => e.status === 'VERIFIED' || e.status === 'RELEASED').length,
    ultrasoundWaiting: waitingModality('Ultrasound'),
    xrayWaiting: waitingModality('X-Ray'),
    ctWaiting: waitingModality('CT Scan'),
    mriWaiting: waitingModality('MRI'),
    portable: reqs.filter(r => r.portable && r.status !== 'RELEASED').length,
    equipmentOffline: db.radEquipment.list().filter(e => e.status === 'OFFLINE').length,
    revenueToday: db.payments.list().filter(p => isToday(p.timestamp) && (p.status === 'PAID' || p.status === 'PARTIAL'))
      .filter(p => { const inv = db.invoices.get(p.invoiceId); return inv?.department === 'Radiology'; })
      .reduce((s, p) => s + p.amount, 0),
    emergency: reqs.filter(r => r.priority === 'EMERGENCY' && r.status !== 'RELEASED').length,
    lowStock: lowStockConsumables().length,
  };
}

export function modalityUtilisation() {
  const reqs = db.imagingRequests.list();
  const map = new Map<string, number>();
  reqs.forEach(r => map.set(r.modality, (map.get(r.modality) ?? 0) + 1));
  return Array.from(map.entries()).map(([modality, count]) => ({ modality, count })).sort((a, b) => b.count - a.count);
}

export function patientImagingHistory(patientId: string) {
  return {
    requests: db.imagingRequests.list().filter(r => r.patientId === patientId),
    reports: db.radiologyReports.list().filter(r => r.patientId === patientId),
    ecgs: db.ecgStudies.list().filter(e => e.patientId === patientId),
  };
}
