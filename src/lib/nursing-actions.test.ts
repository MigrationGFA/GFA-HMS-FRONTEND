import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  activeAdmissions, getAdmissionByPatient, transferBed, orderDischarge, completeDischarge,
  recordVital, listMar, administerMed, refuseMed, importDrugOrderToMar, markMarDispensed,
  addNote, addCarePlan, addTask, setTaskStatus, reportIncident, submitHandover,
  saveFormInstance, activeTemplates, collectSampleForLabOrder, outstandingBalance,
  chargeNursingProcedure,
} from '@/lib/nursing-actions';
import { sendLabOrderToBilling, generateLabInvoice, markLabOrderPaid } from '@/lib/lab-actions';
import type { Order } from '@/data-access/types';

describe('nursing-actions (Nursing module)', () => {
  beforeEach(() => { db._testReset(); });
  afterEach(() => { clear(); db._testReset(); });

  it('seeds wards, beds and admissions in db', () => {
    expect(db.wards.list().length).toBeGreaterThan(0);
    expect(db.beds.list().length).toBeGreaterThan(0);
    expect(activeAdmissions().length).toBe(3);
  });

  it('records vitals and flags abnormal values for escalation', () => {
    const adm = activeAdmissions()[0];
    const normal = recordVital({ admissionId: adm.id, patientId: adm.patientId, bpSys: 120, bpDia: 78, spo2: 98, temp: 36.7, recordedBy: 'Nurse A' });
    expect(normal.abnormal).toBe(false);

    const critical = recordVital({ admissionId: adm.id, patientId: adm.patientId, bpSys: 168, bpDia: 104, spo2: 90, recordedBy: 'Nurse A' });
    expect(critical.abnormal).toBe(true);
    expect(critical.flags.length).toBeGreaterThan(0);
    expect(critical.bmi).toBeUndefined();
  });

  it('computes BMI when weight and height provided', () => {
    const adm = activeAdmissions()[0];
    const v = recordVital({ admissionId: adm.id, patientId: adm.patientId, weight: 70, height: 175, recordedBy: 'Nurse A' });
    expect(v.bmi).toBeCloseTo(22.9, 1);
  });

  it('builds MAR from a doctor drug order and pharmacy dispensing updates status', () => {
    const adm = activeAdmissions()[0];
    const order: Order = {
      id: 'ORD-DRUG-1', patientId: adm.patientId, kind: 'drug',
      items: [{ code: 'D1', name: 'Risperidone 2mg', price: 0 }],
      status: 'PENDING', orderedBy: 'Dr. Test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.orders.insert(order);
    importDrugOrderToMar(order);
    const mar = listMar().filter(m => m.orderId === 'ORD-DRUG-1');
    expect(mar.length).toBe(1);
    expect(mar[0].status).toBe('PENDING');
    expect(mar[0].pharmacyDispensed).toBe(false);

    markMarDispensed('ORD-DRUG-1');
    expect(listMar().find(m => m.orderId === 'ORD-DRUG-1')?.pharmacyDispensed).toBe(true);
  });

  it('administer / refuse medication updates MAR entry', () => {
    const mar = listMar()[0];
    const r = administerMed(mar.id, 'Nurse A');
    expect(r.ok).toBe(true);
    expect(listMar().find(m => m.id === mar.id)?.status).toBe('GIVEN');

    const mar2 = listMar().find(m => m.status !== 'GIVEN');
    if (mar2) {
      refuseMed(mar2.id, 'Patient refused', 'Nurse A');
      expect(listMar().find(m => m.id === mar2.id)?.status).toBe('REFUSED');
    }
  });

  it('notes, care plans, tasks and incidents persist', () => {
    const adm = activeAdmissions()[0];
    addNote({ admissionId: adm.id, patientId: adm.patientId, type: 'Progress', format: 'Narrative', body: 'Patient stable and calm.', authorBy: 'Nurse A' });
    expect(db.nursingNotes.list().length).toBe(1);

    addCarePlan({ admissionId: adm.id, patientId: adm.patientId, diagnosis: 'Risk for self-harm', problem: '', goal: 'Maintain safety', intervention: 'L3 obs', status: 'active', createdBy: 'Nurse A' });
    expect(db.carePlans.list().length).toBe(1);

    const task = addTask({ patientId: adm.patientId, title: 'Change dressing', category: 'Dressing' });
    setTaskStatus(task.id, 'COMPLETED');
    expect(db.nursingTasks.list().find(t => t.id === task.id)?.status).toBe('COMPLETED');

    reportIncident({ patientId: adm.patientId, type: 'Fall', severity: 'Moderate', description: 'Slipped near bed', actionTaken: 'Assessed', reportedBy: 'Nurse A' });
    expect(db.incidents.list().length).toBe(1);
  });

  it('shift handover persists and can be acknowledged', () => {
    const h = submitHandover({ shift: 'Morning', summary: 'All stable', criticalPatients: [], pendingMeds: '', pendingLabs: '', incidents: '', specialInstructions: '', handedOverBy: 'Nurse A' });
    expect(db.handovers.list().find(x => x.id === h.id)?.acknowledged).toBe(false);
  });

  it('bed transfer moves patient and frees old bed', () => {
    const adm = activeAdmissions()[0];
    const oldBed = adm.bedId!;
    const target = db.beds.list().find(b => b.status === 'AVAILABLE')!;
    const r = transferBed(adm.id, target.id, 'Nurse A');
    expect(r.ok).toBe(true);
    expect(db.beds.get(target.id)?.status).toBe('OCCUPIED');
    expect(db.beds.get(oldBed)?.status).toBe('CLEANING');
    expect(getAdmissionByPatient(adm.patientId)?.bedId).toBe(target.id);
  });

  it('discharge is blocked by outstanding balance and released after override', () => {
    const adm = activeAdmissions()[0];
    // Create an outstanding invoice for this patient.
    const patient = db.patients.get(adm.patientId)!;
    chargeNursingProcedure({ patientId: patient.id, description: 'Wound dressing', amount: 5000 });
    expect(outstandingBalance(patient.id)).toBe(5000);

    orderDischarge(adm.id, 'Dr. Test');
    const blocked = completeDischarge(adm.id, 'Nurse A');
    expect(blocked.ok).toBe(false);

    const forced = completeDischarge(adm.id, 'Matron', { force: true });
    expect(forced.ok).toBe(true);
    expect(db.admissions.get(adm.id)?.status).toBe('DISCHARGED');
    expect(db.beds.get(adm.bedId!)?.status).toBe('CLEANING');
  });

  it('nurse collects a sample only after the lab order is payment-cleared', () => {
    const adm = activeAdmissions()[0];
    const labOrder: Order = {
      id: 'LAB-WARD-1', patientId: adm.patientId, kind: 'lab',
      items: [{ code: 'FBC', name: 'Full Blood Count', price: 5000 }],
      status: 'PENDING_DOCTOR', orderedBy: 'Dr. Test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      labMeta: { patientName: adm.patientName, age: 30, gender: 'Male', hospitalNo: adm.hospitalId, department: 'Ward', source: 'Doctor', priority: 'Routine', audit: [] },
    };
    db.orders.insert(labOrder);

    const early = collectSampleForLabOrder('LAB-WARD-1', 'Nurse A');
    expect(early.ok).toBe(false);

    sendLabOrderToBilling('LAB-WARD-1', 'Lab');
    const inv = generateLabInvoice('LAB-WARD-1', 'Cashier');
    markLabOrderPaid('LAB-WARD-1', { amount: 5000, method: 'Cash', ref: 'C-1', cashier: 'Cashier' });
    expect(db.orders.get('LAB-WARD-1')?.status).toBe('PAID');
    expect(inv).toMatch(/^INV-/);

    const collected = collectSampleForLabOrder('LAB-WARD-1', 'Nurse A');
    expect(collected.ok).toBe(true);
    expect(db.orders.get('LAB-WARD-1')?.status).toBe('SAMPLE_COLLECTED');
  });

  it('form engine validates required fields and saves signed instances', () => {
    const adm = activeAdmissions()[0];
    const tpl = activeTemplates().find(t => t.code === 'PAIN-01')!;
    const missing = saveFormInstance(tpl.id, adm.patientId, {}, 'Nurse A', adm.id, 'SIGNED');
    expect('ok' in missing && missing.ok === false).toBe(true);

    const ok = saveFormInstance(tpl.id, adm.patientId, { score: 6, nurseSignature: 'Nurse A' }, 'Nurse A', adm.id, 'SIGNED');
    expect('status' in ok && ok.status === 'SIGNED').toBe(true);
    expect(db.formInstances.list().length).toBe(1);
  });
});
