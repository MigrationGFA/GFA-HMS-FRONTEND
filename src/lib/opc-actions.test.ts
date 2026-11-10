import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  checkInVisit, setVisitStatus, completeVisit, todaysVisits,
  saveAssessment, saveRiskAssessment, latestRisk,
  addDiagnosis, setDiagnosisStatus, diagnosesFor,
  saveNote, notesFor, saveTreatmentPlan, plansFor,
  requestLab, requestImaging, prescribe,
  billConsultation, requestAdmission, setAdmissionStatus,
  createReferral, setReferralStatus,
  bookAppointment, setAppointmentStatus, rescheduleAppointment,
  dashboardMetrics, patientProfile, CONSULTATION_FEE,
} from '@/lib/opc-actions';

const anyPatient = () => db.patients.list()[0];

describe('opc-actions (Psychiatric OPC module)', () => {
  beforeEach(() => { db._testReset(); });
  afterEach(() => { clear(); db._testReset(); });

  it('seeds OPC visits, a diagnosis and an appointment', () => {
    expect(db.opcVisits.list().length).toBeGreaterThan(0);
    expect(db.psychDiagnoses.list().length).toBeGreaterThan(0);
    expect(db.opcAppointments.list().length).toBeGreaterThan(0);
  });

  it('checks a patient into the queue and moves through statuses', () => {
    const p = anyPatient();
    const v = checkInVisit({ patientId: p.id, visitType: 'New', payer: 'Cash', priority: 'Urgent', by: 'Records' });
    expect(v.status).toBe('WAITING');
    expect(todaysVisits().some(x => x.id === v.id)).toBe(true);

    const r = setVisitStatus(v.id, 'WITH_DOCTOR', 'Dr. A');
    expect(r.ok).toBe(true);
    expect(db.opcVisits.get(v.id)!.status).toBe('WITH_DOCTOR');

    completeVisit(v.id, 'Dr. A');
    expect(db.opcVisits.get(v.id)!.status).toBe('COMPLETED');
  });

  it('saves assessments including MSE', () => {
    const p = anyPatient();
    const a = saveAssessment({ patientId: p.id, type: 'Mental Status Examination', values: { mood: 'Depressed', insight: 'Poor' }, by: 'Dr. A' });
    expect(a.type).toBe('Mental Status Examination');
    expect(patientProfile(p.id).assessments.some(x => x.id === a.id)).toBe(true);
  });

  it('flags a crisis alert when any risk is High', () => {
    const p = anyPatient();
    const r = saveRiskAssessment({ patientId: p.id, selfHarm: 'High', harmToOthers: 'Low', absconding: 'None', neglect: 'None', substance: 'Low', by: 'Dr. A' });
    expect(r.crisisAlert).toBe(true);
    expect(latestRisk(p.id)!.crisisAlert).toBe(true);
    expect(dashboardMetrics().highRisk).toBeGreaterThan(0);
  });

  it('does not raise a crisis alert for low/moderate risk', () => {
    const p = anyPatient();
    const r = saveRiskAssessment({ patientId: p.id, selfHarm: 'Moderate', harmToOthers: 'Low', absconding: 'None', neglect: 'None', substance: 'None', by: 'Dr. A' });
    expect(r.crisisAlert).toBe(false);
  });

  it('records a diagnosis and toggles its status', () => {
    const p = anyPatient();
    const d = addDiagnosis({ patientId: p.id, code: 'F32.1', label: 'Moderate depressive episode', category: 'Mood disorders', type: 'Primary', by: 'Dr. A' });
    expect(d.status).toBe('Active');
    setDiagnosisStatus(d.id, 'Inactive', 'Dr. A');
    expect(db.psychDiagnoses.get(d.id)!.status).toBe('Inactive');
    expect(diagnosesFor(p.id).some(x => x.id === d.id)).toBe(true);
  });

  it('saves a draft note then finalises it', () => {
    const p = anyPatient();
    const draft = saveNote({ patientId: p.id, type: 'SOAP', content: 'Initial impression', status: 'DRAFT', by: 'Dr. A' });
    expect(draft.ok).toBe(true);
    const fin = saveNote({ id: draft.id, patientId: p.id, type: 'SOAP', content: 'Full SOAP note', status: 'FINAL', by: 'Dr. A' });
    expect(fin.ok).toBe(true);
    expect(db.psychNotes.get(draft.id!)!.status).toBe('FINAL');
    expect(notesFor(p.id).length).toBe(1);
  });

  it('blocks finalising an empty note', () => {
    const p = anyPatient();
    const r = saveNote({ patientId: p.id, type: 'Progress', content: '', status: 'FINAL', by: 'Dr. A' });
    expect(r.ok).toBe(false);
  });

  it('saves a treatment plan', () => {
    const p = anyPatient();
    const t = saveTreatmentPlan({ patientId: p.id, medicationPlan: 'Continue depot', psychotherapyPlan: 'CBT weekly', by: 'Dr. A' });
    expect(plansFor(p.id).some(x => x.id === t.id)).toBe(true);
  });

  it('routes lab / imaging / drug requests to db.orders and emits ORDER_CREATED', () => {
    const p = anyPatient();
    const events: string[] = [];
    const off = db.on('ORDER_CREATED', () => { events.push('x'); });

    const lab = requestLab(p.id, [{ code: 'FBC', name: 'Full Blood Count', price: 3500 }], 'Dr. A');
    const img = requestImaging(p.id, { code: 'CT-BR', name: 'CT Brain', price: 45000 }, 'Dr. A');
    const rx = prescribe(p.id, [{ code: 'HAL-5', name: 'Haloperidol 5mg', price: 1200 }], 'Dr. A');
    off();

    expect(lab.ok && img.ok && rx.ok).toBe(true);
    expect(events.length).toBe(3);
    const kinds = db.orders.list().filter(o => o.patientId === p.id).map(o => o.kind);
    expect(kinds).toEqual(expect.arrayContaining(['lab', 'imaging', 'drug']));
  });

  it('bills a consultation to the billing spine', () => {
    const p = anyPatient();
    const r = billConsultation({ patientId: p.id, description: 'OPC consultation', amount: CONSULTATION_FEE, by: 'Dr. A' });
    expect(r.ok).toBe(true);
    const inv = db.invoices.get(r.ok ? r.invoiceId : '');
    expect(inv).toBeTruthy();
    expect(inv!.amount).toBe(CONSULTATION_FEE);
    expect(inv!.department).toBe('Psychiatric OPC');
  });

  it('creates and progresses an admission request', () => {
    const p = anyPatient();
    const req = requestAdmission({ patientId: p.id, ward: 'Acute Male Ward', reason: 'Relapse', priority: 'Urgent', by: 'Dr. A' });
    expect(req.status).toBe('PENDING');
    setAdmissionStatus(req.id, 'APPROVED', 'Records');
    expect(db.opcAdmissionRequests.get(req.id)!.status).toBe('APPROVED');
    expect(dashboardMetrics().forAdmission).toBeGreaterThan(0);
  });

  it('creates referrals to psychology and social welfare', () => {
    const p = anyPatient();
    const psy = createReferral({ patientId: p.id, to: 'Psychology', category: 'CBT', reason: 'Depression', by: 'Dr. A' });
    const soc = createReferral({ patientId: p.id, to: 'Social Welfare', category: 'Financial Support', reason: 'Indigent', by: 'Dr. A' });
    expect(psy.to).toBe('Psychology');
    expect(soc.to).toBe('Social Welfare');
    setReferralStatus(psy.id, 'ACCEPTED', 'Psychology');
    expect(db.opcReferrals.get(psy.id)!.status).toBe('ACCEPTED');
    expect(dashboardMetrics().pendingReferrals).toBeGreaterThanOrEqual(1);
  });

  it('books, reschedules and marks appointments', () => {
    const p = anyPatient();
    const a = bookAppointment({ patientId: p.id, doctor: 'Dr. A', date: '2026-08-01T09:00', reason: 'Review' });
    expect(a.status).toBe('SCHEDULED');
    rescheduleAppointment(a.id, '2026-08-05T09:00', 'Dr. A');
    expect(db.opcAppointments.get(a.id)!.status).toBe('RESCHEDULED');
    setAppointmentStatus(a.id, 'ATTENDED', 'Dr. A');
    expect(db.opcAppointments.get(a.id)!.status).toBe('ATTENDED');
  });

  it('aggregates dashboard metrics', () => {
    const p = anyPatient();
    checkInVisit({ patientId: p.id, visitType: 'New', payer: 'Cash', by: 'Records' });
    const m = dashboardMetrics();
    expect(m.seenToday).toBeGreaterThan(0);
    expect(m.newCases).toBeGreaterThan(0);
  });
});
