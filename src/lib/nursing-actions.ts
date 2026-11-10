/**
 * Shared nursing mutations — NursingStore reads/writes db collections
 * (admissions, beds, vitals, mar, nursingNotes, carePlans, nursingTasks,
 *  observations, intakeOutput, handovers, incidents, patientEducation, forms).
 *
 * Cross-module wiring:
 *  - Doctor orders (db.orders)         → MAR + nursing task feed
 *  - Laboratory (LabFlowStore/orders)  → sample collection flips lab order
 *  - Billing (db.invoices)             → discharge balance + billable procedures
 *  - Admission/Ward (db.beds/admissions) → single shared bed source of truth
 */
import { db } from '@/db/database';
import { nextId, nowHuman, nowIso } from '@/db/ids';
import { createInvoiceRecord } from '@/lib/billing-actions';
import { patchLabOrderStatus, newLabSampleId } from '@/lib/lab-actions';
import type {
  Admission, Bed, BedStatus, Vital, MarEntry, MarStatus, NursingNote, NursingNoteType,
  CarePlanEntry, NursingTask, NursingTaskStatus, Observation, IntakeOutputEntry,
  Handover, Incident, PatientEducationRecord, NursingFormInstance, Order,
} from '@/data-access/types';

const now = () => nowHuman();

const audit = (actor: string, action: string, entity: string, entityId: string) =>
  db.audit.add({ actor, role: 'nurse', action, entity, entityId });

// =====================================================================
// BED / ADMISSION (shared with Admission module)
// =====================================================================
export function listAdmissions(): Admission[] {
  return db.admissions.list();
}

export function activeAdmissions(): Admission[] {
  return db.admissions.list().filter(a => a.status === 'ADMITTED' || a.status === 'ON_LEAVE' || a.status === 'DISCHARGE_ORDERED');
}

export function getAdmissionByPatient(patientId: string): Admission | undefined {
  return db.admissions.list().find(a => a.patientId === patientId && a.status !== 'DISCHARGED' && a.status !== 'CANCELLED');
}

export function setBedStatus(bedId: string, status: BedStatus, by = 'Nurse'): Bed | undefined {
  const bed = db.beds.get(bedId);
  if (!bed) return undefined;
  const updated = db.beds.update(bedId, { status, updatedAt: nowIso() });
  db.emit('BED_STATUS_CHANGED', { bedId, status });
  audit(by, `Bed ${bed.label} → ${status}`, 'bed', bedId);
  return updated;
}

export function transferBed(admissionId: string, toBedId: string, by = 'Nurse', reason = 'Clinical transfer') {
  const adm = db.admissions.get(admissionId);
  const toBed = db.beds.get(toBedId);
  if (!adm || !toBed) return { ok: false as const, message: 'Admission or destination bed not found' };
  if (toBed.status === 'OCCUPIED') return { ok: false as const, message: `Bed ${toBed.label} is already occupied` };

  if (adm.bedId) db.beds.update(adm.bedId, { status: 'CLEANING', patientId: undefined, updatedAt: nowIso() });
  db.beds.update(toBedId, { status: 'OCCUPIED', patientId: adm.patientId, updatedAt: nowIso() });
  db.admissions.update(admissionId, {
    wardId: toBed.wardId, wardName: toBed.wardName, bedId: toBed.id, bedLabel: toBed.label,
    updatedAt: nowIso(),
    audit: [...adm.audit, { action: `Transferred to ${toBed.wardName} · ${toBed.label}`, by, at: now(), note: reason }],
  });
  db.emit('BED_TRANSFER', { admissionId, toBedId });
  audit(by, `Transferred ${adm.patientName} → ${toBed.wardName} ${toBed.label}`, 'admission', admissionId);
  return { ok: true as const, message: `${adm.patientName} moved to ${toBed.wardName} · Bed ${toBed.label}` };
}

export function orderDischarge(admissionId: string, by = 'Doctor', reason = '') {
  const adm = db.admissions.get(admissionId);
  if (!adm) return { ok: false as const, message: 'Admission not found' };
  db.admissions.update(admissionId, {
    status: 'DISCHARGE_ORDERED', dischargeOrder: { by, at: now(), reason }, updatedAt: nowIso(),
    audit: [...adm.audit, { action: 'Discharge ordered', by, at: now(), note: reason }],
  });
  db.emit('DISCHARGE_ORDERED', { admissionId });
  return { ok: true as const, message: `Discharge ordered for ${adm.patientName}` };
}

/** Nursing-side discharge completion — gated on outstanding balance from billing. */
export function completeDischarge(admissionId: string, by = 'Nurse', opts: { force?: boolean } = {}) {
  const adm = db.admissions.get(admissionId);
  if (!adm) return { ok: false as const, message: 'Admission not found' };
  const balance = outstandingBalance(adm.patientId);
  if (balance > 0 && !opts.force) {
    return { ok: false as const, message: `Outstanding balance of ₦${balance.toLocaleString()} — clear billing or use supervisor override.` };
  }
  if (adm.bedId) db.beds.update(adm.bedId, { status: 'CLEANING', patientId: undefined, updatedAt: nowIso() });
  db.admissions.update(admissionId, {
    status: 'DISCHARGED', updatedAt: nowIso(),
    audit: [...adm.audit, { action: 'Discharged from ward', by, at: now(), note: balance > 0 ? 'Supervisor override' : undefined }],
  });
  db.emit('DISCHARGE_COMPLETED', { admissionId, patientId: adm.patientId });
  audit(by, `Discharged ${adm.patientName} from ward`, 'admission', admissionId);
  return { ok: true as const, message: `${adm.patientName} discharged and bed released for cleaning.` };
}

// =====================================================================
// VITALS  (abnormal detection → doctor escalation)
// =====================================================================
const flagVitals = (v: Partial<Vital>): string[] => {
  const flags: string[] = [];
  if (v.bpSys != null && (v.bpSys >= 140 || v.bpSys <= 90)) flags.push(`BP systolic ${v.bpSys}`);
  if (v.bpDia != null && (v.bpDia >= 90 || v.bpDia <= 50)) flags.push(`BP diastolic ${v.bpDia}`);
  if (v.spo2 != null && v.spo2 < 94) flags.push(`SpO₂ ${v.spo2}%`);
  if (v.temp != null && (v.temp >= 38 || v.temp <= 35)) flags.push(`Temp ${v.temp}°C`);
  if (v.pulse != null && (v.pulse >= 120 || v.pulse <= 50)) flags.push(`Pulse ${v.pulse}`);
  if (v.resp != null && (v.resp >= 24 || v.resp <= 8)) flags.push(`Resp ${v.resp}`);
  if (v.painScore != null && v.painScore >= 7) flags.push(`Pain ${v.painScore}/10`);
  return flags;
};

export function recordVital(input: Omit<Vital, 'id' | 'abnormal' | 'flags' | 'recordedAt' | 'bmi'> & { bmi?: number }): Vital {
  const flags = flagVitals(input);
  const bmi = input.weight && input.height ? +(input.weight / ((input.height / 100) ** 2)).toFixed(1) : undefined;
  const row: Vital = {
    ...input, bmi, flags, abnormal: flags.length > 0,
    id: nextId('VIT'), recordedAt: nowIso(),
  };
  db.vitals.insert(row);
  db.emit('VITALS_RECORDED', { vitalId: row.id, patientId: row.patientId });
  if (row.abnormal) {
    db.emit('VITALS_CRITICAL', { patientId: row.patientId, flags });
    audit(input.recordedBy, `Abnormal vitals flagged (${flags.join(', ')})`, 'vital', row.id);
  }
  return row;
}

export function vitalsForPatient(patientId: string): Vital[] {
  return db.vitals.list().filter(v => v.patientId === patientId);
}

// =====================================================================
// MEDICATION ADMINISTRATION RECORD  (doctor Rx + pharmacy dispensing)
// =====================================================================
export function listMar(): MarEntry[] {
  return db.mar.list();
}

/** Build MAR entries from a doctor's drug order (called on ORDER_CREATED kind:'drug'). */
export function importDrugOrderToMar(order: Order) {
  if (order.kind !== 'drug') return;
  const adm = getAdmissionByPatient(order.patientId);
  if (!adm) return;
  const already = db.mar.list().some(m => m.orderId === order.id);
  if (already) return;
  order.items.forEach(item => {
    const row: MarEntry = {
      id: nextId('MAR'), admissionId: adm.id, patientId: order.patientId, orderId: order.id,
      drug: item.name, dose: '', route: 'PO', frequency: 'As prescribed', scheduledTime: 'Due',
      kind: 'Scheduled', status: 'PENDING', pharmacyDispensed: false, updatedAt: nowIso(),
    };
    db.mar.insert(row);
  });
}

/** Pharmacy dispensed a drug order — mark related MAR entries ready. */
export function markMarDispensed(orderId: string) {
  db.mar.list().filter(m => m.orderId === orderId).forEach(m =>
    db.mar.update(m.id, { pharmacyDispensed: true, status: m.status === 'PENDING' ? 'DUE' : m.status, updatedAt: nowIso() }));
}

const setMar = (id: string, status: MarStatus, by: string, extra: Partial<MarEntry> = {}) => {
  const m = db.mar.get(id);
  if (!m) return { ok: false as const, message: 'Medication entry not found' };
  db.mar.update(id, { status, administeredBy: by, administeredAt: nowIso(), updatedAt: nowIso(), ...extra });
  db.emit('MED_ADMINISTERED', { marId: id, status });
  audit(by, `${status} — ${m.drug}`, 'mar', id);
  return { ok: true as const, message: `${m.drug}: ${status.toLowerCase()}` };
};

export const administerMed = (id: string, by = 'Nurse', note?: string) => setMar(id, 'GIVEN', by, { sideEffects: note });
export const refuseMed = (id: string, reason: string, by = 'Nurse') => setMar(id, 'REFUSED', by, { reason });
export const missMed = (id: string, reason: string, by = 'Nurse') => setMar(id, 'MISSED', by, { reason });
export const holdMed = (id: string, reason: string, by = 'Nurse') => setMar(id, 'HELD', by, { reason });

export function addExternalMed(input: Omit<MarEntry, 'id' | 'kind' | 'status' | 'updatedAt'>): MarEntry {
  const row: MarEntry = { ...input, id: nextId('MAR'), kind: 'External', status: 'GIVEN', updatedAt: nowIso() };
  db.mar.insert(row);
  audit(input.administeredBy ?? 'Nurse', `External medication recorded — ${row.drug}`, 'mar', row.id);
  return row;
}

// =====================================================================
// NOTES / CARE PLAN / TASKS
// =====================================================================
export function addNote(input: Omit<NursingNote, 'id' | 'createdAt'>): NursingNote {
  const row: NursingNote = { ...input, id: nextId('NNOTE'), createdAt: nowIso() };
  db.nursingNotes.insert(row);
  db.emit('NURSING_NOTE_ADDED', { noteId: row.id, patientId: row.patientId });
  audit(input.authorBy, `${input.type} note added`, 'nursingNote', row.id);
  return row;
}
export const notesForPatient = (patientId: string) => db.nursingNotes.list().filter(n => n.patientId === patientId);

export function addCarePlan(input: Omit<CarePlanEntry, 'id' | 'createdAt' | 'updatedAt'>): CarePlanEntry {
  const row: CarePlanEntry = { ...input, id: nextId('CPL'), createdAt: nowIso(), updatedAt: nowIso() };
  db.carePlans.insert(row);
  db.emit('CARE_PLAN_UPDATED', { carePlanId: row.id });
  return row;
}
export const updateCarePlan = (id: string, patch: Partial<CarePlanEntry>) =>
  db.carePlans.update(id, { ...patch, updatedAt: nowIso() });

export function addTask(input: Omit<NursingTask, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: NursingTaskStatus }): NursingTask {
  const row: NursingTask = { ...input, status: input.status ?? 'PENDING', id: nextId('NTK'), createdAt: nowIso(), updatedAt: nowIso() };
  db.nursingTasks.insert(row);
  return row;
}
export function setTaskStatus(id: string, status: NursingTaskStatus, by = 'Nurse') {
  db.nursingTasks.update(id, { status, updatedAt: nowIso() });
  db.emit('NURSING_TASK_UPDATED', { taskId: id, status });
  audit(by, `Task ${status}`, 'nursingTask', id);
}

// =====================================================================
// OBSERVATIONS / INTAKE-OUTPUT
// =====================================================================
export function addObservation(input: Omit<Observation, 'id' | 'recordedAt'>): Observation {
  const row: Observation = { ...input, id: nextId('OBS'), recordedAt: nowIso() };
  db.observations.insert(row);
  return row;
}

export function addIntakeOutput(input: Omit<IntakeOutputEntry, 'id' | 'recordedAt'>): IntakeOutputEntry {
  const row: IntakeOutputEntry = { ...input, id: nextId('IO'), recordedAt: nowIso() };
  db.intakeOutput.insert(row);
  return row;
}
export function fluidBalance(patientId: string): { intake: number; output: number; balance: number } {
  const rows = db.intakeOutput.list().filter(r => r.patientId === patientId);
  const intake = rows.filter(r => r.kind === 'intake').reduce((s, r) => s + r.volumeMl, 0);
  const output = rows.filter(r => r.kind === 'output').reduce((s, r) => s + r.volumeMl, 0);
  return { intake, output, balance: intake - output };
}

// =====================================================================
// HANDOVER / INCIDENT / EDUCATION
// =====================================================================
export function submitHandover(input: Omit<Handover, 'id' | 'createdAt' | 'acknowledged'>): Handover {
  const row: Handover = { ...input, id: nextId('HOV'), acknowledged: false, createdAt: nowIso() };
  db.handovers.insert(row);
  db.emit('HANDOVER_SUBMITTED', { handoverId: row.id });
  audit(input.handedOverBy, `${input.shift} shift handover submitted`, 'handover', row.id);
  return row;
}
export function acknowledgeHandover(id: string, receivedBy: string) {
  db.handovers.update(id, { acknowledged: true, receivedBy });
  audit(receivedBy, 'Handover acknowledged', 'handover', id);
}

export function reportIncident(input: Omit<Incident, 'id' | 'createdAt' | 'status'> & { status?: Incident['status'] }): Incident {
  const row: Incident = { ...input, status: input.status ?? 'REPORTED', id: nextId('INC'), createdAt: nowIso() };
  db.incidents.insert(row);
  db.emit('INCIDENT_REPORTED', { incidentId: row.id, severity: row.severity });
  audit(input.reportedBy, `Incident reported — ${input.type} (${input.severity})`, 'incident', row.id);
  return row;
}
export function reviewIncident(id: string, by: string, note?: string) {
  db.incidents.update(id, { status: 'REVIEWED', supervisorReview: { by, at: now(), note } });
  audit(by, 'Incident reviewed', 'incident', id);
}

export function addEducation(input: Omit<PatientEducationRecord, 'id' | 'createdAt'>): PatientEducationRecord {
  const row: PatientEducationRecord = { ...input, id: nextId('EDU'), createdAt: nowIso() };
  db.patientEducation.insert(row);
  return row;
}

// =====================================================================
// FORMS ENGINE
// =====================================================================
export function activeTemplates() {
  return db.formTemplates.list().filter(t => t.active);
}

export function allTemplates() {
  return db.formTemplates.list();
}

/** Super Admin: toggle a form template on/off for the whole hospital. */
export function toggleTemplate(id: string, by = 'Super Admin') {
  const tpl = db.formTemplates.get(id);
  if (!tpl) return;
  db.formTemplates.update(id, { active: !tpl.active, updatedAt: nowIso() });
  audit(by, `Form template ${tpl.code} ${tpl.active ? 'disabled' : 'enabled'}`, 'formTemplate', id);
}

/** Super Admin: create a new configurable form template. */
export function addFormTemplate(input: {
  code: string; title: string;
  category: import('@/data-access/types').NursingFormTemplate['category'];
  fields: import('@/data-access/types').FormField[];
  by?: string;
}) {
  const row: import('@/data-access/types').NursingFormTemplate = {
    id: nextId('FRM') + '-T', code: input.code, title: input.title, category: input.category,
    fields: input.fields, active: true, version: 1, updatedAt: nowIso(),
  };
  db.formTemplates.insert(row);
  audit(input.by ?? 'Super Admin', `Form template ${input.code} created`, 'formTemplate', row.id);
  return row;
}

export function saveFormInstance(
  templateId: string,
  patientId: string,
  values: Record<string, string | number | boolean>,
  signedBy: string,
  admissionId?: string,
  status: 'DRAFT' | 'SIGNED' = 'SIGNED',
): NursingFormInstance | { ok: false; message: string } {
  const tpl = db.formTemplates.get(templateId);
  if (!tpl) return { ok: false, message: 'Form template not found' };
  const missing = tpl.fields.filter(f => f.required && !values[f.key] &&
    (!f.showIf || values[f.showIf.key] === f.showIf.equals));
  if (status === 'SIGNED' && missing.length) {
    return { ok: false, message: `Required: ${missing.map(m => m.label).join(', ')}` };
  }
  const row: NursingFormInstance = {
    id: nextId('FRM'), templateId, templateCode: tpl.code, templateTitle: tpl.title,
    admissionId, patientId, values, signedBy, status, version: tpl.version,
    createdAt: nowIso(), updatedAt: nowIso(),
    history: [{ by: signedBy, at: now(), action: status === 'SIGNED' ? 'Signed' : 'Draft saved' }],
  };
  db.formInstances.insert(row);
  db.emit('NURSING_FORM_SAVED', { formId: row.id, templateCode: tpl.code });
  audit(signedBy, `${tpl.title} ${status.toLowerCase()}`, 'nursingForm', row.id);
  return row;
}
export const formsForPatient = (patientId: string) => db.formInstances.list().filter(f => f.patientId === patientId);

// =====================================================================
// CROSS-MODULE READ HELPERS
// =====================================================================
/** Doctor's Orders feed for a patient (lab / drug / imaging from db.orders). */
export function doctorOrdersForPatient(patientId: string): Order[] {
  return db.orders.list().filter(o => o.patientId === patientId);
}

/** Nurse collects a sample for a doctor lab order → flips lab order in the shared spine. */
export function collectSampleForLabOrder(orderId: string, by = 'Nurse') {
  const order = db.orders.get(orderId);
  if (!order || order.kind !== 'lab') return { ok: false as const, message: 'Lab order not found' };
  const payable = ['PAID', 'NHIA_APPROVED', 'HMO_APPROVED', 'WAIVED'];
  if (!payable.includes(order.status)) {
    return { ok: false as const, message: `Order ${orderId} is not payment-cleared yet (status: ${order.status}).` };
  }
  const sampleId = newLabSampleId();
  patchLabOrderStatus(orderId, 'SAMPLE_COLLECTED', { sampleId }, `Sample ${sampleId} collected at ward`, by);
  db.emit('SAMPLE_COLLECTED', { orderId, sampleId });
  audit(by, `Sample ${sampleId} collected for ${orderId}`, 'order', orderId);
  return { ok: true as const, message: `Sample ${sampleId} collected and sent to laboratory.`, sampleId };
}

/** Outstanding invoice balance for a patient (discharge gate + billing status). */
export function outstandingBalance(patientId: string): number {
  return db.invoices.list()
    .filter(inv => inv.patientId === patientId && inv.status !== 'PAID')
    .reduce((s, inv) => s + (inv.balance ?? 0), 0);
}

/** Raise a billable nursing procedure → real invoice in the cashier queue. */
export function chargeNursingProcedure(input: { patientId: string; description: string; amount: number }) {
  const patient = db.patients.get(input.patientId);
  if (!patient) return { ok: false as const, message: 'Patient not found' };
  const inv = createInvoiceRecord({
    patientName: patient.name, hospitalId: patient.hospitalId, phone: patient.phone,
    department: 'Nursing', amount: input.amount, source: 'Nursing',
    lines: [{ desc: input.description, qty: 1, unitPrice: input.amount, source: 'Nursing' }],
  });
  audit('Nurse', `Charged ${input.description} (₦${input.amount.toLocaleString()})`, 'invoice', inv.invoiceId);
  return { ok: true as const, message: `Invoice ${inv.invoiceId} sent to Cashier for ${input.description}.`, invoiceId: inv.invoiceId };
}
