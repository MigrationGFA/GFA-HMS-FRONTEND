/**
 * Psychiatric OPC (Out-Patient Clinic) mutations on the single `db` source of truth.
 * Cross-module integration is done by reusing existing spines:
 *   - lab/imaging/drug requests → db.orders (+ ORDER_CREATED) so Lab / Radiology / Pharmacy
 *     (and Nursing MAR) pick them up automatically.
 *   - billing → createInvoiceRecord (source 'Psychiatric OPC') → cashier captures → INVOICE_PAID.
 *   - admission requests are surfaced for the Records/Admission + Nursing bed spine.
 */
import { db } from '@/db/database';
import { nextId, nowHuman, nowIso } from '@/db/ids';
import { createInvoiceRecord } from '@/lib/billing-actions';
import type {
  OpcVisit, OpcVisitType, OpcPayer, OpcPriority, OpcVisitStatus,
  PsychAssessment, PsychAssessmentType, PsychDiagnosis, PsychDxType, PsychDxStatus,
  PsychNote, PsychNoteType, OpcTreatmentPlan, OpcRiskAssessment, OpcRiskLevel,
  OpcAdmissionRequest, OpcAdmissionStatus, OpcReferral, OpcReferralTarget,
  OpcAppointment, Order,
} from '@/data-access/types';

const now = () => nowHuman();
const audit = (actor: string, action: string, entity: string, entityId: string, ref?: string) =>
  db.audit.add({ actor, role: 'Psychiatric OPC', action, entity, entityId, invoiceRef: ref });

export const CONSULTATION_FEE = 7500;

// =====================================================================
// QUEUE / VISITS
// =====================================================================
export function listVisits(): OpcVisit[] { return db.opcVisits.list(); }
export function todaysVisits(): OpcVisit[] {
  const d = new Date().toISOString().slice(0, 10);
  return db.opcVisits.list().filter(v => (v.checkInAt ?? '').slice(0, 10) === d);
}

export function checkInVisit(input: {
  patientId: string; visitType: OpcVisitType; payer: OpcPayer; priority?: OpcPriority;
  assignedDoctor?: string; reason?: string; clinic?: string; by?: string;
}): OpcVisit {
  const p = db.patients.get(input.patientId);
  const row: OpcVisit = {
    id: nextId('OPC'),
    patientId: input.patientId,
    patientName: p?.name ?? 'Unknown',
    hospitalId: p?.hospitalId ?? '—',
    visitType: input.visitType,
    payer: input.payer,
    priority: input.priority ?? (input.visitType === 'Emergency' ? 'Emergency' : 'Normal'),
    status: 'WAITING',
    assignedDoctor: input.assignedDoctor,
    clinic: input.clinic ?? 'Adult Psychiatry OPC',
    reason: input.reason,
    checkInAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso(),
    audit: [{ action: 'Checked in', by: input.by ?? 'Records', at: now() }],
  };
  db.opcVisits.insert(row);
  db.emit('OPC_VISIT_CREATED', { visitId: row.id });
  audit(input.by ?? 'Records', `${input.visitType} visit checked in (${input.priority ?? 'Normal'})`, 'opcVisit', row.id);
  return row;
}

export function setVisitStatus(id: string, status: OpcVisitStatus, by = 'OPC', note?: string) {
  const v = db.opcVisits.get(id);
  if (!v) return { ok: false as const, message: 'Visit not found' };
  db.opcVisits.update(id, { status, updatedAt: nowIso(), audit: [...v.audit, { action: `Status → ${status}`, by, at: now(), note }] });
  db.emit('OPC_VISIT_UPDATED', { visitId: id });
  return { ok: true as const, message: `Moved to ${status.replace(/_/g, ' ').toLowerCase()}.` };
}

export function assignDoctor(id: string, doctor: string, by = 'OPC') {
  const v = db.opcVisits.get(id);
  if (!v) return { ok: false as const, message: 'Visit not found' };
  db.opcVisits.update(id, { assignedDoctor: doctor, updatedAt: nowIso(), audit: [...v.audit, { action: `Assigned to ${doctor}`, by, at: now() }] });
  return { ok: true as const, message: `Assigned to ${doctor}.` };
}

export function completeVisit(id: string, by = 'Doctor') {
  return setVisitStatus(id, 'COMPLETED', by);
}

// =====================================================================
// ASSESSMENTS (incl. MSE) & RISK
// =====================================================================
export function saveAssessment(input: {
  patientId: string; visitId?: string; type: PsychAssessmentType;
  values: Record<string, string | number | boolean>; summary?: string; by: string;
}): PsychAssessment {
  const p = db.patients.get(input.patientId);
  const row: PsychAssessment = {
    id: nextId('PSA'), patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    visitId: input.visitId, type: input.type, values: input.values, summary: input.summary,
    by: input.by, createdAt: nowIso(),
  };
  db.psychAssessments.insert(row);
  db.emit('OPC_ASSESSMENT_SAVED', { assessmentId: row.id });
  audit(input.by, `${input.type} saved`, 'psychAssessment', row.id);
  return row;
}

export function assessmentsFor(patientId: string): PsychAssessment[] {
  return db.psychAssessments.list().filter(a => a.patientId === patientId);
}

export function saveRiskAssessment(input: {
  patientId: string; visitId?: string;
  selfHarm: OpcRiskLevel; harmToOthers: OpcRiskLevel; absconding: OpcRiskLevel;
  neglect: OpcRiskLevel; substance: OpcRiskLevel; vulnerableFlag?: boolean; safetyPlan?: string; by: string;
}): OpcRiskAssessment {
  const p = db.patients.get(input.patientId);
  const high = [input.selfHarm, input.harmToOthers, input.absconding, input.neglect, input.substance].includes('High');
  const row: OpcRiskAssessment = {
    id: nextId('PRK'), patientId: input.patientId, patientName: p?.name ?? 'Unknown', visitId: input.visitId,
    selfHarm: input.selfHarm, harmToOthers: input.harmToOthers, absconding: input.absconding,
    neglect: input.neglect, substance: input.substance, vulnerableFlag: !!input.vulnerableFlag,
    crisisAlert: high, safetyPlan: input.safetyPlan, by: input.by, createdAt: nowIso(),
  };
  db.opcRiskAssessments.insert(row);
  if (high) {
    db.emit('OPC_RISK_FLAGGED', { riskId: row.id, patientId: input.patientId });
    audit(input.by, `HIGH RISK flagged — crisis alert raised`, 'opcRisk', row.id);
  } else {
    audit(input.by, `Risk assessment recorded`, 'opcRisk', row.id);
  }
  return row;
}

export function latestRisk(patientId: string): OpcRiskAssessment | undefined {
  return db.opcRiskAssessments.list().filter(r => r.patientId === patientId).slice(-1)[0];
}

// =====================================================================
// DIAGNOSIS
// =====================================================================
export function addDiagnosis(input: {
  patientId: string; code: string; label: string; category: string;
  type?: PsychDxType; by: string;
}): PsychDiagnosis {
  const p = db.patients.get(input.patientId);
  const row: PsychDiagnosis = {
    id: nextId('PDX'), patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    code: input.code, label: input.label, category: input.category, type: input.type ?? 'Primary',
    status: 'Active', by: input.by, createdAt: nowIso(), updatedAt: nowIso(),
    history: [{ action: 'Diagnosed', by: input.by, at: now() }],
  };
  db.psychDiagnoses.insert(row);
  db.emit('OPC_DIAGNOSIS_ADDED', { diagnosisId: row.id });
  audit(input.by, `Diagnosis ${input.code} — ${input.label} (${row.type})`, 'psychDiagnosis', row.id);
  return row;
}

export function setDiagnosisStatus(id: string, status: PsychDxStatus, by: string) {
  const d = db.psychDiagnoses.get(id);
  if (!d) return { ok: false as const, message: 'Diagnosis not found' };
  db.psychDiagnoses.update(id, { status, updatedAt: nowIso(), history: [...d.history, { action: `Marked ${status}`, by, at: now() }] });
  audit(by, `Diagnosis ${d.code} marked ${status}`, 'psychDiagnosis', id);
  return { ok: true as const, message: `Diagnosis marked ${status}.` };
}

export function diagnosesFor(patientId: string): PsychDiagnosis[] {
  return db.psychDiagnoses.list().filter(d => d.patientId === patientId);
}

// =====================================================================
// CLINICAL NOTES
// =====================================================================
export function saveNote(input: {
  id?: string; patientId: string; visitId?: string; type: PsychNoteType;
  content: string; status: 'DRAFT' | 'FINAL'; confidential?: boolean; by: string;
}) {
  if (input.status === 'FINAL' && input.content.trim().length < 3) {
    return { ok: false as const, message: 'Note content is required to finalise' };
  }
  const existing = input.id ? db.psychNotes.get(input.id) : undefined;
  if (existing) {
    db.psychNotes.update(existing.id, {
      content: input.content, status: input.status, type: input.type, confidential: input.confidential,
      updatedAt: nowIso(), history: [...existing.history, { action: input.status === 'FINAL' ? 'Finalised' : 'Draft saved', by: input.by, at: now() }],
    });
    db.emit('OPC_NOTE_SAVED', { noteId: existing.id });
    return { ok: true as const, id: existing.id, message: input.status === 'FINAL' ? 'Note finalised.' : 'Draft saved.' };
  }
  const p = db.patients.get(input.patientId);
  const row: PsychNote = {
    id: nextId('PSN'), patientId: input.patientId, patientName: p?.name ?? 'Unknown', visitId: input.visitId,
    type: input.type, content: input.content, status: input.status, confidential: input.confidential,
    by: input.by, createdAt: nowIso(), updatedAt: nowIso(),
    history: [{ action: input.status === 'FINAL' ? 'Created & finalised' : 'Draft created', by: input.by, at: now() }],
  };
  db.psychNotes.insert(row);
  db.emit('OPC_NOTE_SAVED', { noteId: row.id });
  audit(input.by, `${input.type} note ${input.status.toLowerCase()}`, 'psychNote', row.id);
  return { ok: true as const, id: row.id, message: input.status === 'FINAL' ? 'Note finalised.' : 'Draft saved.' };
}

export function notesFor(patientId: string): PsychNote[] {
  return db.psychNotes.list().filter(n => n.patientId === patientId);
}

// =====================================================================
// TREATMENT PLAN
// =====================================================================
export function saveTreatmentPlan(input: Omit<OpcTreatmentPlan, 'id' | 'patientName' | 'createdAt'>): OpcTreatmentPlan {
  const p = db.patients.get(input.patientId);
  const row: OpcTreatmentPlan = { id: nextId('PTP'), patientName: p?.name ?? 'Unknown', createdAt: nowIso(), ...input };
  db.opcTreatmentPlans.insert(row);
  audit(input.by, `Treatment plan saved`, 'opcTreatmentPlan', row.id);
  return row;
}

export function plansFor(patientId: string): OpcTreatmentPlan[] {
  return db.opcTreatmentPlans.list().filter(t => t.patientId === patientId);
}

// =====================================================================
// CROSS-MODULE ORDERS (lab / imaging / drug) — reuse db.orders spine
// =====================================================================
function insertOrder(kind: Order['kind'], patientId: string, items: Order['items'], by: string): Order {
  const row: Order = {
    id: nextId('ORD'), patientId, kind, items, status: 'REQUESTED',
    orderedBy: by, createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.orders.insert(row);
  db.emit('ORDER_CREATED', { orderId: row.id, kind });
  audit(by, `${kind.toUpperCase()} order — ${items.map(i => i.name).join(', ')}`, 'order', row.id);
  return row;
}

export function requestLab(patientId: string, tests: { code: string; name: string; price: number }[], by: string) {
  const order = insertOrder('lab', patientId, tests, by);
  return { ok: true as const, id: order.id, message: `Lab request sent (${tests.length} test(s)).` };
}
export function requestImaging(patientId: string, study: { code: string; name: string; price: number }, by: string) {
  const order = insertOrder('imaging', patientId, [study], by);
  return { ok: true as const, id: order.id, message: `Imaging request sent to Radiology — ${study.name}.` };
}
export function prescribe(patientId: string, drugs: { code: string; name: string; price: number }[], by: string) {
  const order = insertOrder('drug', patientId, drugs, by);
  return { ok: true as const, id: order.id, message: `Prescription sent to Pharmacy (${drugs.length} item(s)).` };
}

export function ordersFor(patientId: string): Order[] {
  return db.orders.list().filter(o => o.patientId === patientId);
}

// =====================================================================
// BILLING — reuse the billing/cashier spine
// =====================================================================
export function billConsultation(input: { patientId: string; description: string; amount: number; by: string }) {
  const p = db.patients.get(input.patientId);
  if (!p) return { ok: false as const, message: 'Patient not found' };
  const inv = createInvoiceRecord({
    patientName: p.name, hospitalId: p.hospitalId, phone: p.phone ?? '',
    department: 'Psychiatric OPC', amount: input.amount, source: 'Psychiatric OPC',
    lines: [{ desc: input.description, qty: 1, unitPrice: input.amount, source: 'Psychiatric OPC' }],
  });
  audit(input.by, `Invoice ${inv.invoiceId} — ${input.description} (₦${input.amount.toLocaleString()})`, 'invoice', inv.invoiceId, inv.invoiceId);
  return { ok: true as const, invoiceId: inv.invoiceId, message: `Invoice ${inv.invoiceId} sent to cashier.` };
}

// =====================================================================
// ADMISSION REQUESTS (surface to Records/Admission + Nursing bed spine)
// =====================================================================
export function requestAdmission(input: { patientId: string; ward: string; reason: string; priority?: OpcPriority; by: string }): OpcAdmissionRequest {
  const p = db.patients.get(input.patientId);
  const row: OpcAdmissionRequest = {
    id: nextId('OAR'), patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    ward: input.ward, reason: input.reason, priority: input.priority ?? 'Normal', status: 'PENDING',
    by: input.by, createdAt: nowIso(), updatedAt: nowIso(),
    audit: [{ action: 'Admission requested', by: input.by, at: now() }],
  };
  db.opcAdmissionRequests.insert(row);
  db.emit('OPC_ADMISSION_REQUESTED', { requestId: row.id });
  audit(input.by, `Admission requested → ${input.ward} (${row.priority})`, 'opcAdmission', row.id);
  return row;
}

export function setAdmissionStatus(id: string, status: OpcAdmissionStatus, by: string, note?: string) {
  const r = db.opcAdmissionRequests.get(id);
  if (!r) return { ok: false as const, message: 'Admission request not found' };
  db.opcAdmissionRequests.update(id, { status, updatedAt: nowIso(), audit: [...r.audit, { action: `Status → ${status}`, by, at: now(), note }] });
  audit(by, `Admission ${r.id} → ${status}`, 'opcAdmission', id);
  return { ok: true as const, message: `Admission request ${status.replace(/_/g, ' ').toLowerCase()}.` };
}

// =====================================================================
// REFERRALS (Psychology / Social Welfare)
// =====================================================================
export function createReferral(input: { patientId: string; to: OpcReferralTarget; category: string; reason: string; by: string }): OpcReferral {
  const p = db.patients.get(input.patientId);
  const row: OpcReferral = {
    id: nextId('ORF'), patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    to: input.to, category: input.category, reason: input.reason, status: 'PENDING',
    by: input.by, createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.opcReferrals.insert(row);
  db.emit('OPC_REFERRAL_CREATED', { referralId: row.id });
  audit(input.by, `Referral → ${input.to} (${input.category})`, 'opcReferral', row.id);
  return row;
}

export function setReferralStatus(id: string, status: OpcReferral['status'], by: string) {
  const r = db.opcReferrals.get(id);
  if (!r) return { ok: false as const, message: 'Referral not found' };
  db.opcReferrals.update(id, { status, updatedAt: nowIso() });
  audit(by, `Referral ${r.id} → ${status}`, 'opcReferral', id);
  return { ok: true as const, message: `Referral ${status.toLowerCase()}.` };
}

// =====================================================================
// FOLLOW-UP APPOINTMENTS
// =====================================================================
export function bookAppointment(input: { patientId: string; doctor: string; date: string; reason?: string }): OpcAppointment {
  const p = db.patients.get(input.patientId);
  const row: OpcAppointment = {
    id: nextId('OAP'), patientId: input.patientId, patientName: p?.name ?? 'Unknown',
    doctor: input.doctor, date: input.date, reason: input.reason, status: 'SCHEDULED',
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.opcAppointments.insert(row);
  db.emit('OPC_APPT_BOOKED', { appointmentId: row.id });
  audit(input.doctor, `Follow-up booked for ${row.date}`, 'opcAppointment', row.id);
  return row;
}

export function setAppointmentStatus(id: string, status: OpcAppointment['status'], by = 'OPC') {
  const a = db.opcAppointments.get(id);
  if (!a) return { ok: false as const, message: 'Appointment not found' };
  db.opcAppointments.update(id, { status, updatedAt: nowIso() });
  audit(by, `Appointment ${a.id} → ${status}`, 'opcAppointment', id);
  return { ok: true as const, message: `Appointment marked ${status.toLowerCase()}.` };
}

export function rescheduleAppointment(id: string, date: string, by = 'OPC') {
  const a = db.opcAppointments.get(id);
  if (!a) return { ok: false as const, message: 'Appointment not found' };
  db.opcAppointments.update(id, { date, status: 'RESCHEDULED', updatedAt: nowIso() });
  audit(by, `Appointment ${a.id} rescheduled → ${date}`, 'opcAppointment', id);
  return { ok: true as const, message: `Rescheduled to ${date}.` };
}

// =====================================================================
// METRICS / PROFILE
// =====================================================================
export function dashboardMetrics() {
  const visits = todaysVisits();
  const byStatus = (s: OpcVisitStatus) => visits.filter(v => v.status === s).length;
  return {
    seenToday: visits.length,
    waiting: byStatus('WAITING'),
    withDoctor: byStatus('WITH_DOCTOR'),
    withNurse: byStatus('WITH_NURSE'),
    followUp: visits.filter(v => v.visitType === 'Follow-up').length,
    newCases: visits.filter(v => v.visitType === 'New').length,
    emergency: visits.filter(v => v.priority === 'Emergency' || v.priority === 'Crisis').length,
    awaitingLab: byStatus('AWAITING_LAB'),
    awaitingPharmacy: byStatus('AWAITING_PHARMACY'),
    forAdmission: db.opcAdmissionRequests.list().filter(a => a.status !== 'ADMITTED' && a.status !== 'DECLINED').length,
    pendingReferrals: db.opcReferrals.list().filter(r => r.status === 'PENDING').length,
    upcomingFollowUps: db.opcAppointments.list().filter(a => a.status === 'SCHEDULED').length,
    highRisk: db.opcRiskAssessments.list().filter(r => r.crisisAlert).length,
  };
}

export function patientProfile(patientId: string) {
  return {
    patient: db.patients.get(patientId),
    visits: db.opcVisits.list().filter(v => v.patientId === patientId),
    diagnoses: diagnosesFor(patientId),
    assessments: assessmentsFor(patientId),
    notes: notesFor(patientId),
    plans: plansFor(patientId),
    risk: latestRisk(patientId),
    orders: ordersFor(patientId),
    referrals: db.opcReferrals.list().filter(r => r.patientId === patientId),
    appointments: db.opcAppointments.list().filter(a => a.patientId === patientId),
  };
}
