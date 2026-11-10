import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  listRequests, createImagingRequest, importImagingOrder, acceptRequest, rejectRequest,
  generateRadInvoice, markRadPaid, onInvoicePaidForRad, scheduleRequest, updatePrep,
  startExam, completeImaging, submitReport, verifyReport, returnReport, releaseResult,
  criticalFindings, recordEcg, interpretEcg, setEquipmentStatus, adjustConsumable,
  lowStockConsumables, saveRadForm, dashboardMetrics, modalityUtilisation, patientImagingHistory,
} from '@/lib/radiology-actions';
import type { Order } from '@/data-access/types';

const anyPatient = () => db.patients.list()[0];

describe('radiology-actions (Radiology & ECG module)', () => {
  beforeEach(() => { db._testReset(); });
  afterEach(() => { clear(); db._testReset(); });

  it('seeds imaging requests, equipment and consumables', () => {
    expect(listRequests().length).toBeGreaterThan(0);
    expect(db.radEquipment.list().length).toBeGreaterThan(0);
    expect(db.radConsumables.list().length).toBeGreaterThan(0);
  });

  it('creates a billable imaging request with modality pricing', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'CT Scan', region: 'Brain', indication: 'Seizures' });
    expect(r.amount).toBe(45000);
    expect(r.status).toBe('REQUESTED');
    expect(r.paymentStatus).toBe('UNPAID');
  });

  it('imports a doctor imaging order idempotently (cross-module: db.orders)', () => {
    const p = anyPatient();
    const order: Order = {
      id: 'ORD-IMG-1', patientId: p.id, kind: 'imaging',
      items: [{ code: 'CXR', name: 'Chest X-Ray PA', price: 0 }],
    } as Order;
    const first = importImagingOrder(order);
    expect(first).toBeDefined();
    expect(first!.modality).toBe('X-Ray');
    const dup = importImagingOrder(order);
    expect(dup).toBeUndefined();
  });

  it('accept → invoice → pay unlocks scheduling; blocks scheduling before payment', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'X-Ray', region: 'Chest', indication: 'Cough' });
    acceptRequest(r.id);
    const early = scheduleRequest(r.id, { machineId: 'EQ-XR-1' });
    expect(early.ok).toBe(false);
    const pay = markRadPaid(r.id, { amount: 8500, method: 'Cash', cashier: 'Cashier' });
    expect(pay.ok).toBe(true);
    expect(db.imagingRequests.get(r.id)!.paymentStatus).toBe('PAID');
    const sch = scheduleRequest(r.id, { machineId: 'EQ-XR-1', radiographer: 'Musa' });
    expect(sch.ok).toBe(true);
    expect(db.imagingRequests.get(r.id)!.status).toBe('SCHEDULED');
  });

  it('emergency requests can be scheduled without payment', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'CT Scan', region: 'Brain', indication: 'Trauma', priority: 'EMERGENCY' });
    const sch = scheduleRequest(r.id, { machineId: 'EQ-CT-1' });
    expect(sch.ok).toBe(true);
  });

  it('INVOICE_PAID listener flips the matching request to PAID', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'MRI', region: 'Brain', indication: 'Epilepsy' });
    const invId = generateRadInvoice(r.id);
    expect(invId).toBeTruthy();
    captureFullInvoice(invId);
    onInvoicePaidForRad(invId);
    expect(db.imagingRequests.get(r.id)!.paymentStatus).toBe('PAID');
  });

  it('runs full exam → report → verify → release pathway and decrements consumable', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'X-Ray', region: 'Chest', indication: 'TB screen' });
    markRadPaid(r.id, { amount: 8500, method: 'Cash', cashier: 'Cashier' });
    scheduleRequest(r.id, { machineId: 'EQ-XR-1' });
    startExam(r.id, 'Radiographer Musa');
    const filmBefore = db.radConsumables.get('RC-2')!.stock;
    const done = completeImaging(r.id, { radiographer: 'Radiographer Musa', consumableId: 'RC-2', machineId: 'EQ-XR-1' });
    expect(done.ok).toBe(true);
    expect(db.imagingRequests.get(r.id)!.studyUid).toBeTruthy();
    expect(db.radConsumables.get('RC-2')!.stock).toBe(filmBefore - 1);

    const rep = submitReport({ requestId: r.id, findings: 'Clear lung fields', impression: 'Normal chest X-ray', reportedBy: 'Dr. Junior' });
    expect(rep.ok).toBe(true);
    const ver = verifyReport(rep.id!, 'Dr. Consultant');
    expect(ver.ok).toBe(true);
    const rel = releaseResult(rep.id!, 'Dr. Consultant');
    expect(rel.ok).toBe(true);
    expect(db.imagingRequests.get(r.id)!.status).toBe('RELEASED');
  });

  it('blocks release before verification', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'Ultrasound', region: 'Abdomen', indication: 'RUQ pain' });
    markRadPaid(r.id, { amount: 12000, method: 'Cash', cashier: 'Cashier' });
    scheduleRequest(r.id, {}); startExam(r.id, 'Ada'); completeImaging(r.id, { radiographer: 'Ada' });
    const rep = submitReport({ requestId: r.id, findings: 'x', impression: 'Cholelithiasis', reportedBy: 'Dr. Junior' });
    const rel = releaseResult(rep.id!, 'Dr. Consultant');
    expect(rel.ok).toBe(false);
  });

  it('return-for-correction sends the request back to REPORT_PENDING', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'X-Ray', region: 'Spine', indication: 'Back pain' });
    markRadPaid(r.id, { amount: 8500, method: 'Cash', cashier: 'Cashier' });
    scheduleRequest(r.id, {}); startExam(r.id, 'Musa'); completeImaging(r.id, { radiographer: 'Musa' });
    const rep = submitReport({ requestId: r.id, findings: 'x', impression: 'Query', reportedBy: 'Dr. Junior' });
    returnReport(rep.id!, 'Dr. Consultant', 'Please add lateral view');
    expect(db.imagingRequests.get(r.id)!.status).toBe('REPORT_PENDING');
  });

  it('flags a critical imaging report and surfaces it in criticalFindings()', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'CT Scan', region: 'Brain', indication: 'Headache' });
    markRadPaid(r.id, { amount: 45000, method: 'POS', cashier: 'Cashier' });
    scheduleRequest(r.id, {}); startExam(r.id, 'Musa'); completeImaging(r.id, { radiographer: 'Musa' });
    submitReport({ requestId: r.id, findings: 'Hyperdensity', impression: 'Intracranial hemorrhage', critical: true, criticalFinding: 'Intracranial hemorrhage', reportedBy: 'Dr. Junior' });
    expect(criticalFindings().some(c => c.patientId === p.id)).toBe(true);
  });

  it('records ECG and auto-detects a critical rhythm (STEMI)', () => {
    const p = anyPatient();
    const normal = recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 78, rhythm: 'Sinus', qtc: 420 } });
    expect(normal.critical).toBe(false);
    const crit = recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 110, rhythm: 'Sinus tachycardia', stElevation: true } });
    expect(crit.critical).toBe(true);
    const done = interpretEcg(crit.id, 'Anterior STEMI', 'STEMI — activate cath lab', 'Dr. Cardiologist');
    expect(done.ok).toBe(true);
    expect(db.ecgStudies.get(crit.id)!.status).toBe('VERIFIED');
  });

  it('ECG critical matrix: QTc>500, VT, extreme bradycardia', () => {
    const p = anyPatient();
    expect(recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 72, rhythm: 'Sinus', qtc: 520 } }).critical).toBe(true);
    expect(recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 180, rhythm: 'VT', qtc: 400 } }).critical).toBe(true);
    expect(recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 32, rhythm: 'Sinus bradycardia', qtc: 410 } }).critical).toBe(true);
    expect(recordEcg({ patientId: p.id, type: '12-Lead', measurements: { heartRate: 88, rhythm: 'Atrial fibrillation', qtc: 430 } }).abnormal).toBe(true);
  });

  it('emits IMAGING_RESULT_READY on report release', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'X-Ray', region: 'Chest', indication: 'Cough' });
    markRadPaid(r.id, { amount: 8500, method: 'Cash', cashier: 'Cashier' });
    scheduleRequest(r.id, {}); startExam(r.id, 'Musa'); completeImaging(r.id, { radiographer: 'Musa' });
    const sub = submitReport({ requestId: r.id, findings: 'Clear', impression: 'Normal', reportedBy: 'Dr. Junior' });
    expect(sub.ok).toBe(true);
    verifyReport(sub.id!, 'Dr. Consultant');
    let ready = false;
    const off = db.on('IMAGING_RESULT_READY', () => { ready = true; });
    expect(releaseResult(sub.id!, 'Dr. Consultant').ok).toBe(true);
    off();
    expect(ready).toBe(true);
  });

  it('manages equipment status and consumable low-stock alerts', () => {
    const off = setEquipmentStatus('EQ-XR-1', 'OFFLINE', 'Detector fault');
    expect(off.ok).toBe(true);
    expect(db.radEquipment.get('EQ-XR-1')!.status).toBe('OFFLINE');
    adjustConsumable('RC-1', -30, 'Radiographer');
    expect(lowStockConsumables().some(c => c.id === 'RC-1')).toBe(true);
  });

  it('rejects a request with a reason and requires a valid reason', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'X-Ray', region: 'Hand', indication: 'Injury' });
    expect(rejectRequest(r.id, 'no').ok).toBe(false);
    expect(rejectRequest(r.id, 'Wrong modality requested').ok).toBe(true);
    expect(db.imagingRequests.get(r.id)!.status).toBe('REJECTED');
  });

  it('saves a signed radiology form and aggregates metrics + history', () => {
    const p = anyPatient();
    saveRadForm({ type: 'MRI Safety Screening Questionnaire', patientId: p.id, values: { pacemaker: false }, signedBy: 'Radiographer' });
    expect(db.radForms.list().length).toBeGreaterThan(0);
    const m = dashboardMetrics();
    expect(m.totalToday).toBeGreaterThanOrEqual(0);
    expect(modalityUtilisation().length).toBeGreaterThan(0);
    const hist = patientImagingHistory(p.id);
    expect(hist.requests).toBeDefined();
  });

  it('updatePrep marks a patient ready', () => {
    const p = anyPatient();
    const r = createImagingRequest({ patientId: p.id, modality: 'CT Scan', region: 'Chest', indication: 'Nodule' });
    updatePrep(r.id, { fasting: true, status: 'READY' }, 'Nurse');
    expect(db.imagingRequests.get(r.id)!.prep.status).toBe('READY');
  });
});

// Helper: fully settle an invoice on the billing spine (mirrors a cashier capture).
function captureFullInvoice(invoiceId: string) {
  const inv = db.invoices.get(invoiceId)!;
  db.invoices.update(invoiceId, { amountPaid: inv.amount, balance: 0, status: 'PAID' });
}
