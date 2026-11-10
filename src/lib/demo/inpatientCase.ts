/**
 * One shared inpatient case stored in the browser database.
 * Records registers it, cashier payment admits it, and the ward departments
 * update the same rows. This module is the only writer for that walk.
 */
import { db } from '@/db/database';
import { on } from '@/db/events';
import { nextId, nowIso } from '@/db/ids';
import { captureInvoicePayment, createVisitWithInvoice } from '@/lib/billing-actions';
import { recordVital } from '@/lib/nursing-actions';
import { acceptRequest, createImagingRequest, submitReport } from '@/lib/radiology-actions';
import type {
  Admission,
  ImagingRequest,
  Order,
  Patient,
  Vital,
} from '@/data-access/types';

export const INPATIENT_DEMO_FLAG = 'inpatient-demo';
export const INPATIENT_SEED_FLAG = 'inpatient-demo-seed';
export const INPATIENT_DEPOSIT = 20_000;
export const INPATIENT_RESULT =
  'Hb 13.2 g/dL · WBC 7.4 · Platelets 210. Within normal limits.';
export const INPATIENT_IMAGING_FINDING =
  'Chest X-ray: clear lung fields. No consolidation.';
export const INPATIENT_DRUG = 'Paracetamol 500mg';

const SEED_PATIENT = {
  name: 'Chinedu Okeke',
  sex: 'Male' as const,
  phone: '08031234567',
  wardId: 'WRD-1',
  diagnosis: 'Acute psychosis — observation',
};

export type RegisterInpatientInput = {
  name: string;
  sex: 'Male' | 'Female';
  phone: string;
  wardId: string;
  diagnosis: string;
  seed?: boolean;
};

export type RegisteredInpatient = {
  patientId: string;
  hospitalId: string;
  invoiceId: string;
  visitCode: string;
  admissionId: string;
  patientName: string;
  amount: number;
  wardName: string;
};

export function demoNumber(id: string): number {
  let n = 2166136261;
  for (let i = 0; i < id.length; i++) {
    n ^= id.charCodeAt(i);
    n = Math.imul(n, 16777619);
  }
  return 800_000 + ((n >>> 0) % 100_000);
}

function cleanPath(path: string) {
  const raw = path.startsWith('/') ? path : `/${path}`;
  return raw.split('?')[0].replace(/\/$/, '');
}

function queryOf(path: string) {
  return new URLSearchParams(path.split('?')[1] ?? '');
}

function paged<T>(items: T[]) {
  return { data: { items, meta: { page: 1, limit: Math.max(items.length, 1), total: items.length } } };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(' ') || parts[0] || name };
}

export function isInpatientDemo(patient: Patient | undefined) {
  return !!patient?.flags?.includes(INPATIENT_DEMO_FLAG);
}

function demoPatientIds() {
  return new Set(db.patients.list().filter(p => isInpatientDemo(p)).map(p => p.id));
}

function invoiceNote(invoiceId: string) {
  return `invoice:${invoiceId}`;
}

function visitNote(visitCode: string) {
  return `visit:${visitCode}`;
}

function noteValue(admission: Admission, prefix: string) {
  const hit = admission.audit.find(entry => entry.note?.startsWith(prefix));
  return hit?.note?.slice(prefix.length);
}

export function listInpatientAdmissions() {
  const ids = demoPatientIds();
  return db.admissions.list().filter(a => ids.has(a.patientId) && a.status !== 'CANCELLED');
}

export function registerInpatient(input: RegisterInpatientInput): RegisteredInpatient {
  const ward = db.wards.get(input.wardId) ?? db.wards.list().find(w => w.type !== 'ICU') ?? db.wards.list()[0];
  const patient = db.patients.create({
    name: input.name.trim(),
    phone: input.phone.trim(),
    sex: input.sex,
    age: 36,
    source: 'Walk-in',
    insurance: 'None',
    allergies: [],
  });
  db.patients.update(patient.id, {
    flags: input.seed ? [INPATIENT_DEMO_FLAG, INPATIENT_SEED_FLAG] : [INPATIENT_DEMO_FLAG],
    age: 36,
  });
  const billed = createVisitWithInvoice({
    patientName: patient.name,
    hospitalId: patient.hospitalId,
    phone: patient.phone,
    department: ward?.name ?? 'Ward',
    type: 'OPD',
    triagePriority: 'Routine',
    amount: INPATIENT_DEPOSIT,
    source: 'Records',
    attendingDoctor: 'Dr. Ngozi Ikedife',
  });
  const admission: Admission = {
    id: nextId('ADM'),
    patientId: patient.id,
    patientName: patient.name,
    hospitalId: patient.hospitalId,
    wardId: ward?.id,
    wardName: ward?.name,
    diagnosis: input.diagnosis.trim(),
    consultant: 'Dr. Ngozi Ikedife',
    assignedNurse: 'NO Adaeze',
    admittedAt: nowIso(),
    type: ward?.type === 'ICU' ? 'ICU' : 'General',
    status: 'PENDING',
    supervisionLevel: 'General',
    audit: [
      { action: 'INPATIENT_DEMO', by: 'Records', at: nowIso(), note: invoiceNote(billed.invoice.invoiceId) },
      { action: 'INPATIENT_DEMO', by: 'Records', at: nowIso(), note: visitNote(billed.visit.visitCode) },
    ],
    updatedAt: nowIso(),
  };
  db.admissions.insert(admission);
  return {
    patientId: patient.id,
    hospitalId: patient.hospitalId,
    invoiceId: billed.invoice.invoiceId,
    visitCode: billed.visit.visitCode,
    admissionId: admission.id,
    patientName: patient.name,
    amount: INPATIENT_DEPOSIT,
    wardName: ward?.name ?? 'Ward',
  };
}

export function ensureInpatientSeed() {
  const seeded = db.patients.list().some(p => p.flags?.includes(INPATIENT_SEED_FLAG));
  if (seeded) return;
  registerInpatient({ ...SEED_PATIENT, seed: true });
}

export function resetInpatientDemo() {
  const ids = demoPatientIds();
  for (const bed of db.beds.list()) {
    if (bed.patientId && ids.has(bed.patientId)) {
      db.beds.update(bed.id, { status: 'AVAILABLE', patientId: undefined });
    }
  }
  const invoiceIds = new Set(
    db.invoices.list().filter(inv => ids.has(inv.patientId)).map(inv => inv.invoiceId),
  );
  db.drop('radiologyReports', row => ids.has(row.patientId));
  db.drop('imagingRequests', row => ids.has(row.patientId));
  db.drop('vitals', row => ids.has(row.patientId));
  db.drop('orders', row => ids.has(row.patientId));
  db.drop('admissions', row => ids.has(row.patientId));
  db.drop('payments', row => invoiceIds.has(row.invoiceId));
  db.drop('invoices', row => ids.has(row.patientId));
  db.drop('visits', row => ids.has(row.patientId));
  db.drop('patients', row => ids.has(row.id));
  ensureInpatientSeed();
}

function nextFreeBed(preferredWardId?: string) {
  const open = db.beds.list().filter(bed => bed.status === 'AVAILABLE' && !bed.isIcu);
  return open.find(bed => bed.wardId === preferredWardId) ?? open[0];
}

export function admitInpatientInvoice(invoiceId: string) {
  const invoice = db.invoices.get(invoiceId);
  if (!invoice || invoice.status !== 'PAID') return { ok: false as const, message: 'Deposit is not paid' };
  const admission = db.admissions.list().find(
    row => row.status === 'PENDING' && row.audit.some(entry => entry.note === invoiceNote(invoiceId)),
  );
  if (!admission) return { ok: false as const, message: 'No inpatient deposit is waiting on this invoice' };
  const bed = nextFreeBed(admission.wardId);
  if (!bed) return { ok: false as const, message: 'No free general bed' };
  db.beds.update(bed.id, { status: 'OCCUPIED', patientId: admission.patientId, updatedAt: nowIso() });
  db.admissions.update(admission.id, {
    status: 'ADMITTED',
    bedId: bed.id,
    bedLabel: bed.label,
    wardId: bed.wardId,
    wardName: bed.wardName,
    admittedAt: nowIso(),
    updatedAt: nowIso(),
    audit: [...admission.audit, { action: 'ADMITTED', by: 'Cashier', at: nowIso(), note: `bed:${bed.id}` }],
  });
  return { ok: true as const, admissionId: admission.id, bedLabel: bed.label };
}

export type UnpaidDeposit = {
  invoiceId: string;
  patientName: string;
  hospitalId: string;
  wardName: string;
  amount: number;
  diagnosis: string;
};

export function listUnpaidDeposits(): UnpaidDeposit[] {
  return listInpatientAdmissions()
    .filter(admission => admission.status === 'PENDING')
    .map(admission => {
      const invoiceId = noteValue(admission, 'invoice:') ?? '';
      const invoice = invoiceId ? db.invoices.get(invoiceId) : undefined;
      if (!invoice || invoice.balance <= 0) return null;
      return {
        invoiceId,
        patientName: admission.patientName,
        hospitalId: admission.hospitalId,
        wardName: admission.wardName ?? 'Ward',
        amount: invoice.balance,
        diagnosis: admission.diagnosis,
      };
    })
    .filter((row): row is UnpaidDeposit => row !== null);
}

export function captureInpatientDeposit(invoiceId: string, cashier = 'Cashier') {
  const invoice = db.invoices.get(invoiceId);
  if (!invoice) return { ok: false as const, message: 'Invoice not found' };
  return captureInvoicePayment({
    invoiceId,
    amount: invoice.balance,
    channel: 'Cash',
    cashier,
  });
}

function coverWithDeposit(invoiceId: string, desc: string, price: number) {
  const invoice = db.invoices.get(invoiceId);
  if (!invoice || invoice.status !== 'PAID') return;
  db.invoices.update(invoice.id, {
    lines: [...(invoice.lines ?? []), { desc: `${desc} (covered by inpatient deposit)`, qty: 1, unitPrice: price, source: 'Inpatient deposit' }],
  });
}

function orderFor(admission: Admission, kind: Order['kind']) {
  const visitCode = noteValue(admission, 'visit:');
  return db.orders.list().find(order => order.patientId === admission.patientId && order.kind === kind && order.visitId === visitCode);
}

export function sendWardOrders(admissionId: string) {
  const admission = db.admissions.get(admissionId);
  if (!admission) return { ok: false as const, message: 'Admission not found' };
  if (admission.status !== 'ADMITTED') {
    return { ok: false as const, message: 'Cashier must capture the deposit before orders can be sent' };
  }
  const visitCode = noteValue(admission, 'visit:') ?? '';
  const invoiceId = noteValue(admission, 'invoice:') ?? '';
  const patient = db.patients.get(admission.patientId);
  const existingLab = orderFor(admission, 'lab');
  const existingDrug = orderFor(admission, 'drug');
  const existingImaging = orderFor(admission, 'imaging');
  if (existingLab && existingDrug && existingImaging) {
    return {
      ok: true as const,
      message: 'Orders are already on the ward chart',
      labOrderId: existingLab.id,
      drugOrderId: existingDrug.id,
      imagingOrderId: existingImaging.id,
    };
  }

  const stamp = nowIso();
  const lab = existingLab ?? db.orders.insert({
    id: nextId('ORD'),
    patientId: admission.patientId,
    visitId: visitCode,
    kind: 'lab',
    items: [{ code: 'FBC', name: 'Full blood count', price: 4500 }],
    status: 'Sent',
    invoiceId,
    orderedBy: 'Dr. Ngozi Ikedife',
    createdAt: stamp,
    updatedAt: stamp,
    labMeta: {
      patientName: admission.patientName,
      age: patient?.age ?? 36,
      gender: patient?.sex ?? 'Male',
      hospitalNo: admission.hospitalId,
      department: admission.wardName ?? 'Ward',
      ward: admission.wardName,
      source: 'Doctor',
      priority: 'Routine',
      clinicalNote: 'inpatient-demo Full blood count',
      audit: [{ action: 'Ordered', by: 'Dr. Ngozi Ikedife', at: stamp }],
    },
  });
  const drug = existingDrug ?? db.orders.insert({
    id: nextId('ORD'),
    patientId: admission.patientId,
    visitId: visitCode,
    kind: 'drug',
    items: [{ code: 'PCM500', name: INPATIENT_DRUG, price: 500 }],
    status: 'Sent',
    invoiceId,
    orderedBy: 'Dr. Ngozi Ikedife',
    createdAt: stamp,
    updatedAt: stamp,
  });
  const imagingOrder = existingImaging ?? db.orders.insert({
    id: nextId('ORD'),
    patientId: admission.patientId,
    visitId: visitCode,
    kind: 'imaging',
    items: [{ code: 'CXR', name: 'Chest X-ray', price: 8000 }],
    status: 'Sent',
    invoiceId,
    orderedBy: 'Dr. Ngozi Ikedife',
    createdAt: stamp,
    updatedAt: stamp,
  });
  if (!existingImaging) {
    const request = createImagingRequest({
      patientId: admission.patientId,
      modality: 'X-Ray',
      region: 'Chest',
      indication: admission.diagnosis,
      requestedBy: 'Dr. Ngozi Ikedife',
      clinic: 'Ward',
      ward: admission.wardName,
      source: 'Ward',
      clinicalNotes: 'inpatient-demo',
      orderId: imagingOrder.id,
    });
    db.imagingRequests.update(request.id, { paymentStatus: 'PAID', clinicalNotes: 'inpatient-demo' });
  }
  if (!existingLab) coverWithDeposit(invoiceId, 'Full blood count', 4500);
  if (!existingDrug) coverWithDeposit(invoiceId, INPATIENT_DRUG, 500);
  if (!existingImaging) coverWithDeposit(invoiceId, 'Chest X-ray', 8000);
  return {
    ok: true as const,
    message: 'Full blood count, chest X-ray, and paracetamol sent',
    labOrderId: lab.id,
    drugOrderId: drug.id,
    imagingOrderId: imagingOrder.id,
  };
}

export function markLabResult(orderId: string, note = INPATIENT_RESULT) {
  const order = db.orders.get(orderId);
  if (!order || order.kind !== 'lab') return { ok: false as const, message: 'Lab order not found' };
  db.orders.update(order.id, {
    status: 'Validated',
    updatedAt: nowIso(),
    labMeta: {
      ...(order.labMeta ?? {
        patientName: '',
        age: 0,
        gender: 'Male' as const,
        hospitalNo: '',
        department: '',
        source: 'Doctor' as const,
        priority: 'Routine' as const,
        audit: [],
      }),
      clinicalNote: note,
      audit: [...(order.labMeta?.audit ?? []), { action: 'Resulted', by: 'Laboratory', at: nowIso(), note }],
    },
  });
  return { ok: true as const, message: 'Result stored for the doctor', note };
}

export function dispenseDrugOrder(orderId: string) {
  const order = db.orders.get(orderId);
  if (!order || order.kind !== 'drug') return { ok: false as const, message: 'Prescription not found' };
  db.orders.update(order.id, { status: 'Dispensed', updatedAt: nowIso() });
  return { ok: true as const, message: `${order.items[0]?.name ?? 'Drug'} dispensed` };
}

export function releaseImagingByNumber(numericId: number) {
  const request = db.imagingRequests.list().find(row => demoNumber(row.id) === numericId);
  if (!request) return { ok: false as const, message: 'Imaging request not found' };
  return releaseImagingReport(request.id);
}

export function releaseImagingReport(requestId: string) {
  const request = db.imagingRequests.get(requestId);
  if (!request) return { ok: false as const, message: 'Imaging request not found' };
  if (request.status === 'REQUESTED') acceptRequest(request.id, 'Radiology');
  return submitReport({
    requestId: request.id,
    findings: INPATIENT_IMAGING_FINDING,
    impression: 'No acute cardiopulmonary finding.',
    reportedBy: 'Radiology',
  });
}

function findByDemoNumber<T extends { id: string }>(rows: T[], numericId: number) {
  return rows.find(row => demoNumber(row.id) === numericId);
}

function personOf(patient: Patient | undefined, personId: number) {
  const name = splitName(patient?.name ?? 'Unknown');
  return {
    personId,
    hospitalNo: patient?.hospitalId ?? null,
    firstName: name.firstName,
    lastName: name.lastName,
    middleName: null,
    sex: patient?.sex ?? null,
    dateOfBirth: patient?.dob ?? null,
    age: patient?.age ?? null,
    phone: patient?.phone ?? null,
  };
}

function toAdmissionRecord(admission: Admission) {
  const patient = db.patients.get(admission.patientId);
  const personId = demoNumber(admission.patientId);
  const name = splitName(patient?.name ?? admission.patientName);
  return {
    admissionId: demoNumber(admission.id),
    personId,
    wardId: admission.wardId ? demoNumber(admission.wardId) : null,
    bedId: admission.bedId ? demoNumber(admission.bedId) : null,
    diagnosis: admission.diagnosis,
    consultant: admission.consultant,
    assignedNurse: admission.assignedNurse ?? null,
    admissionType: admission.type,
    supervisionLevel: admission.supervisionLevel ?? 'General',
    status: admission.status,
    admittedAt: admission.admittedAt,
    dischargeOrderedAt: null,
    dischargeOrderedBy: null,
    dischargeReason: null,
    dischargedAt: null,
    dischargedBy: null,
    createdAt: admission.admittedAt,
    updatedAt: admission.updatedAt,
    person: {
      personId,
      hospitalNo: admission.hospitalId,
      firstName: name.firstName,
      lastName: name.lastName,
      middleName: null,
      sex: patient?.sex ?? null,
      age: patient?.age ?? null,
      phone: patient?.phone ?? null,
    },
    ward: admission.wardName
      ? { wardId: demoNumber(admission.wardId ?? admission.wardName), code: admission.wardId ?? 'WARD', name: admission.wardName }
      : null,
    bed: admission.bedLabel
      ? { bedId: demoNumber(admission.bedId ?? admission.bedLabel), label: admission.bedLabel, status: 'OCCUPIED' }
      : null,
  };
}

function toLabRequest(order: Order) {
  const patient = db.patients.get(order.patientId);
  const personId = demoNumber(order.patientId);
  const resulted = order.status === 'Validated';
  const note = order.labMeta?.clinicalNote ?? '';
  return {
    labRequestId: demoNumber(order.id),
    requestNo: order.id,
    personId,
    encounterId: null,
    doctorId: 8,
    source: 'Doctor',
    priority: 'Routine',
    clinicalIndication: order.labMeta?.clinicalNote ?? null,
    clinicalNotes: note,
    status: resulted ? 'Validated' : 'Sent',
    labStatus: resulted ? 'Validated' : 'AwaitingCollection',
    paymentStatus: 'Paid',
    paymentChannel: 'Cash',
    paymentRef: order.invoiceId ?? null,
    paidAt: order.createdAt,
    paidBy: 'Cashier',
    totalAmount: order.items.reduce((sum, item) => sum + item.price, 0),
    paymentCleared: true,
    processingLocked: false,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    doctorName: order.orderedBy,
    items: order.items.map((item, index) => ({
      itemId: index + 1,
      labTestId: index + 1,
      testCode: item.code,
      testName: item.name,
      category: 'Haematology',
      specimenType: 'Blood',
      unitPrice: item.price,
      lineNotes: null,
      observation: resulted ? note : null,
      conclusion: resulted ? 'Within normal limits' : null,
      remark: null,
    })),
    person: personOf(patient, personId),
  };
}

function toPrescription(order: Order) {
  const patient = db.patients.get(order.patientId);
  const personId = demoNumber(order.patientId);
  const dispensed = order.status === 'Dispensed';
  const admission = db.admissions.list().find(row => row.patientId === order.patientId);
  return {
    prescriptionId: demoNumber(order.id),
    rxNo: order.id,
    personId,
    status: dispensed ? 'Dispensed' : 'Sent',
    urgency: 'Routine',
    paymentStatus: 'Paid',
    paymentChannel: 'Cash',
    paymentRef: order.invoiceId ?? null,
    paidAt: order.createdAt,
    paidBy: 'Cashier',
    diagnosis: admission?.diagnosis ?? null,
    allergiesNote: null,
    clinic: admission?.wardName ?? 'Ward',
    notes: 'inpatient-demo',
    pharmacyNotes: null,
    sentAt: order.createdAt,
    prescribedBy: order.orderedBy,
    dispensedBy: dispensed ? 'Pharmacist' : null,
    dispensedAt: dispensed ? order.updatedAt : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item, index) => ({
      itemId: index + 1,
      drugId: index + 1,
      drugName: item.name,
      strength: '500mg',
      form: 'Tablet',
      route: 'Oral',
      dose: '1g',
      frequency: 'TDS',
      duration: '3 days',
      quantity: 12,
      qtyDispensed: dispensed ? 12 : 0,
      source: 'Ward',
      instructions: 'After food',
      indication: admission?.diagnosis ?? null,
      lineStatus: dispensed ? 'Dispensed' : 'Pending',
      unitPrice: item.price,
    })),
    person: personOf(patient, personId),
    total: order.items.reduce((sum, item) => sum + item.price, 0),
    auditTrail: [{ at: order.createdAt, actor: order.orderedBy, action: 'Prescribed' }],
  };
}

function imagingApiStatus(status: ImagingRequest['status']) {
  if (status === 'REQUESTED') return 'Sent';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'REPORTED' || status === 'VERIFIED' || status === 'RELEASED') return 'Completed';
  return status;
}

function toImagingRequest(request: ImagingRequest) {
  const patient = db.patients.get(request.patientId);
  const personId = demoNumber(request.patientId);
  const paid = request.paymentStatus === 'PAID';
  return {
    imagingRequestId: demoNumber(request.id),
    requestNo: request.id,
    personId,
    encounterId: null,
    doctorId: 8,
    source: request.source,
    priority: request.priority === 'EMERGENCY' ? 'Emergency' : request.priority === 'URGENT' ? 'Urgent' : 'Routine',
    clinicalIndication: request.indication,
    clinicalNotes: request.clinicalNotes ?? null,
    contrast: null,
    status: imagingApiStatus(request.status),
    paymentStatus: paid ? 'Paid' : 'Unpaid',
    paymentChannel: paid ? 'Cash' : null,
    paymentRef: null,
    paidAt: paid ? request.updatedAt : null,
    paidBy: paid ? 'Cashier' : null,
    totalAmount: request.amount,
    rejectionReason: null,
    scheduledAt: request.scheduledAt ?? null,
    scheduledRoom: null,
    paymentCleared: paid,
    processingLocked: !paid,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    doctorName: request.requestedBy,
    items: [{
      itemId: 1,
      imagingStudyId: 1,
      studyCode: request.modality,
      studyName: `${request.region} ${request.modality}`,
      modality: request.modality,
      bodyRegion: request.region,
      unitPrice: request.amount,
      lineNotes: null,
    }],
    person: personOf(patient, personId),
  };
}

function localImagingId(numericId: number) {
  return findByDemoNumber(db.imagingRequests.list(), numericId)?.id;
}

function recordsOverview() {
  const patients = db.patients.list();
  const today = new Date().toISOString().slice(0, 10);
  const demo = listInpatientAdmissions();
  const pending = demo.filter(row => row.status === 'PENDING');
  const admitted = demo.filter(row => row.status === 'ADMITTED');
  const arrivals = demo.slice(0, 8).map(row => ({
    arrivalNo: row.id,
    personId: demoNumber(row.patientId),
    name: row.patientName,
    hospitalId: row.hospitalId,
    type: 'Inpatient',
    routing: row.status === 'PENDING' ? 'Cashier deposit' : row.wardName ?? 'Ward',
    arrival: row.admittedAt,
    href: '/dashboard/records',
  }));
  return {
    asOf: new Date().toISOString(),
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
    kpis: {
      totalToday: patients.filter(p => p.createdAt.slice(0, 10) === today).length,
      newToday: patients.filter(p => isInpatientDemo(p) && p.createdAt.slice(0, 10) === today).length,
      returningToday: 0,
      walkInToday: patients.filter(p => isInpatientDemo(p)).length,
      emergencyToday: 0,
      pendingRegistration: 0,
      awaitingTriage: pending.length,
      awaitingConsultation: admitted.length,
      totalPatients: patients.length,
      incompleteProfiles: 0,
      duplicatesFlagged: 0,
      openFileRequests: 0,
      openAdmissionRequests: pending.length,
      openTransfers: 0,
      openReferrals: 0,
      dischargesPending: demo.filter(row => row.status === 'DISCHARGE_ORDERED').length,
    },
    pendingTasks: {
      openFileRequests: 0,
      overdueFileRequests: 0,
      openAdmissionRequests: pending.length,
      openTransfers: 0,
      openReferrals: 0,
      dischargesPending: demo.filter(row => row.status === 'DISCHARGE_ORDERED').length,
      archivesDueReview: 0,
    },
    recentActivity: demo.slice(0, 6).map(row => ({
      id: row.id,
      actor: 'Records',
      action: `${row.patientName} · ${row.status === 'PENDING' ? 'deposit waiting' : row.status.toLowerCase()} · ${row.hospitalId}`,
      timestamp: row.updatedAt,
      module: 'Inpatient',
      href: '/dashboard/records',
    })),
    recentArrivals: arrivals,
    alerts: pending.length
      ? [{ type: 'warning' as const, message: `${pending.length} inpatient deposit${pending.length === 1 ? '' : 's'} waiting at the cashier`, href: '/dashboard/cashier' }]
      : [{ type: 'success' as const, message: 'Inpatient deposits are clear', href: '/dashboard/records' }],
  };
}

function wardAdmissions() {
  return db.admissions.list().filter(row => !['PENDING', 'CANCELLED', 'DISCHARGED'].includes(row.status));
}

function labOrders() {
  return db.orders.list().filter(order => order.kind === 'lab');
}

function drugOrders() {
  return db.orders.list().filter(order => order.kind === 'drug');
}

function matchesQuery(q: string | null, ...parts: string[]) {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  return parts.join(' ').toLowerCase().includes(needle);
}

function vitalFromBody(body: Record<string, unknown>) {
  const personId = Number(body.personId);
  const admissionId = Number(body.admissionId);
  const admission = db.admissions.list().find(row =>
    (Number.isFinite(admissionId) && demoNumber(row.id) === admissionId)
    || (Number.isFinite(personId) && demoNumber(row.patientId) === personId),
  );
  const pressure = typeof body.bloodPressure === 'string' ? body.bloodPressure.split('/') : [];
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
  if (!admission) {
    return {
      vitalId: Date.now() % 100000,
      admissionId: Number.isFinite(admissionId) ? admissionId : null,
      personId: Number.isFinite(personId) ? personId : 0,
      weightKg: num(body.weightKg) ?? null,
      heightCm: num(body.heightCm) ?? null,
      bmi: null,
      bloodPressure: typeof body.bloodPressure === 'string' ? body.bloodPressure : null,
      temperatureC: num(body.temperatureC) ?? null,
      pulseBpm: num(body.pulseBpm) ?? null,
      respiratoryRate: num(body.respiratoryRate) ?? null,
      spo2Pct: num(body.spo2Pct) ?? null,
      bloodSugar: num(body.bloodSugar) ?? null,
      painScore: num(body.painScore) ?? null,
      abnormal: false,
      flags: [],
      notes: typeof body.notes === 'string' ? body.notes : null,
      recordedBy: 'NO Adaeze',
      recordedAt: nowIso(),
    };
  }
  const saved = recordVital({
    admissionId: admission.id,
    patientId: admission.patientId,
    bpSys: pressure[0] ? Number(pressure[0]) : undefined,
    bpDia: pressure[1] ? Number(pressure[1]) : undefined,
    pulse: num(body.pulseBpm),
    temp: num(body.temperatureC),
    resp: num(body.respiratoryRate),
    spo2: num(body.spo2Pct),
    weight: num(body.weightKg),
    height: num(body.heightCm),
    bloodSugar: num(body.bloodSugar),
    painScore: num(body.painScore),
    notes: typeof body.notes === 'string' ? body.notes : undefined,
    recordedBy: 'NO Adaeze',
  });
  return toNursingVital(saved);
}

function toNursingVital(row: Vital) {
  const patient = db.patients.get(row.patientId);
  const personId = demoNumber(row.patientId);
  const name = splitName(patient?.name ?? 'Patient');
  return {
    vitalId: demoNumber(row.id),
    admissionId: demoNumber(row.admissionId),
    personId,
    person: {
      personId,
      hospitalNo: patient?.hospitalId ?? null,
      firstName: name.firstName,
      lastName: name.lastName,
      middleName: null,
    },
    weightKg: row.weight ?? null,
    heightCm: row.height ?? null,
    bmi: row.bmi ?? null,
    bloodPressure: row.bpSys != null && row.bpDia != null ? `${row.bpSys}/${row.bpDia}` : null,
    temperatureC: row.temp ?? null,
    pulseBpm: row.pulse ?? null,
    respiratoryRate: row.resp ?? null,
    spo2Pct: row.spo2 ?? null,
    bloodSugar: row.bloodSugar ?? null,
    painScore: row.painScore ?? null,
    abnormal: row.abnormal,
    flags: row.flags,
    notes: row.notes ?? null,
    recordedBy: row.recordedBy,
    recordedAt: row.recordedAt,
  };
}

function cashierReports() {
  const invoices = db.invoices.list();
  const today = new Date().toISOString().slice(0, 10);
  const paidToday = db.payments.list().filter(payment => payment.timestamp.slice(0, 10) === today);
  const outstanding = invoices.filter(invoice => invoice.balance > 0);
  return {
    from: today,
    to: today,
    kpis: {
      collected: paidToday.reduce((sum, payment) => sum + payment.amount, 0),
      refunds: 0,
      receiptCount: paidToday.length,
      outstanding: outstanding.reduce((sum, invoice) => sum + invoice.balance, 0),
      discounted: 0,
    },
    bySource: [],
    byChannel: [{ channel: 'Cash', amount: paidToday.filter(payment => payment.channel === 'Cash').reduce((sum, payment) => sum + payment.amount, 0) }],
    outstandingItems: outstanding.slice(0, 20).map(invoice => ({
      ref: invoice.invoiceId,
      patientName: invoice.patientName,
      department: invoice.department,
      amount: invoice.balance,
      createdAt: invoice.createdAt,
      sourceType: 'invoice',
      sourceId: demoNumber(invoice.invoiceId),
    })),
  };
}

function labOverview() {
  const orders = labOrders();
  const pending = orders.filter(order => order.status === 'Sent');
  return {
    asOf: new Date().toISOString(),
    kpis: {
      requestsToday: orders.length,
      pendingRequests: pending.length,
      awaitingCollection: pending.length,
      samplesCollected: 0,
      awaitingValidation: 0,
      released: orders.filter(order => order.status === 'Validated').length,
      emergency: 0,
      revenueToday: 0,
    },
    recentActivity: orders.slice(0, 8).map(order => ({
      labRequestId: demoNumber(order.id),
      requestNo: order.id,
      patientName: db.patients.get(order.patientId)?.name ?? 'Patient',
      hospitalNo: db.patients.get(order.patientId)?.hospitalId ?? null,
      testSummary: order.items.map(item => item.name).join(', '),
      charge: order.items.reduce((sum, item) => sum + item.price, 0),
      status: order.status,
      statusTone: 'blue',
      priority: 'Routine',
      labStatus: order.status === 'Validated' ? 'Validated' : 'AwaitingCollection',
      paymentStatus: 'Paid',
      createdAt: order.createdAt,
    })),
    criticalAlerts: [],
    pendingTasks: {
      samplesToCollect: pending.length,
      resultsToEnter: pending.length,
      awaitingValidation: 0,
      emrSyncQueue: 0,
    },
  };
}

/** Answer the queue and overview calls before the generic offline lists. */
export function resolveInpatientApi(path: string, method: string, body?: unknown): unknown | null {
  const clean = cleanPath(path);
  const m = method.toUpperCase();
  const query = queryOf(path);

  if (clean === '/api/records/overview' && m === 'GET') {
    return { data: recordsOverview() };
  }

  if (clean === '/api/admissions/stats' && m === 'GET') {
    const rows = wardAdmissions();
    return {
      data: {
        active: rows.length,
        availableBeds: db.beds.list().filter(bed => bed.status === 'AVAILABLE').length,
        dischargeOrdered: rows.filter(row => row.status === 'DISCHARGE_ORDERED').length,
        constantSupervision: rows.filter(row => row.supervisionLevel === 'Constant').length,
      },
    };
  }

  if (clean === '/api/admissions' && m === 'GET') {
    return { data: wardAdmissions().map(toAdmissionRecord) };
  }

  if (clean === '/api/nursing/vitals' && m === 'GET') {
    const personId = query.get('personId');
    const admissionId = query.get('admissionId');
    const rows = db.vitals.list().filter(row => {
      if (personId && demoNumber(row.patientId) !== Number(personId)) return false;
      if (admissionId && demoNumber(row.admissionId) !== Number(admissionId)) return false;
      return true;
    });
    return { data: rows.map(toNursingVital) };
  }

  if (clean === '/api/nursing/vitals' && m === 'POST') {
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    return { data: vitalFromBody(payload) };
  }

  if (clean === '/api/laboratory/overview' && m === 'GET') {
    return { data: labOverview() };
  }

  if (clean === '/api/laboratory/templates' && m === 'GET') {
    return paged([{
      templateId: 1,
      code: 'TPL-FBC',
      name: 'Full blood count',
      category: 'Haematology',
      description: 'Inpatient demo full blood count',
      fields: [{ key: 'result', label: 'Result', type: 'text', required: true }],
      status: 'Active',
      createdBy: 'Laboratory',
      createdAt: nowIso(),
      updatedBy: null,
      updatedAt: nowIso(),
    }]);
  }

  if (clean === '/api/laboratory/results' && m === 'GET') {
    const requestId = query.get('requestId');
    const resulted = labOrders().filter(order => order.status === 'Validated' && (!requestId || demoNumber(order.id) === Number(requestId)));
    return paged(resulted.map(order => ({
      labResultId: demoNumber(`${order.id}:res`),
      labRequestId: demoNumber(order.id),
      requestItemId: 1,
      templateId: 1,
      templateCode: 'TPL-FBC',
      templateName: 'Full blood count',
      templateFields: null,
      values: { result: order.labMeta?.clinicalNote ?? INPATIENT_RESULT },
      comment: order.labMeta?.clinicalNote ?? INPATIENT_RESULT,
      status: 'Validated',
      enteredBy: 'Laboratory',
      enteredAt: order.updatedAt,
    })));
  }

  const labId = clean.match(/^\/api\/laboratory\/requests\/(\d+)(?:\/(results|collect))?$/);
  if (labId) {
    const order = findByDemoNumber(labOrders(), Number(labId[1]));
    if (!order) return { data: null };
    if (m === 'POST' && labId[2] === 'collect') {
      return { data: { request: toLabRequest(order), samples: [] } };
    }
    if (m === 'POST' && labId[2] === 'results') {
      const saved = markLabResult(order.id);
      const request = toLabRequest(db.orders.get(order.id) ?? order);
      return {
        data: {
          request,
          results: [{
            labResultId: demoNumber(`${order.id}:res`),
            labRequestId: request.labRequestId,
            requestItemId: 1,
            templateId: 1,
            templateCode: 'TPL-FBC',
            templateName: 'Full blood count',
            templateFields: null,
            values: { result: saved.ok ? saved.note : INPATIENT_RESULT },
            comment: saved.ok ? saved.note : INPATIENT_RESULT,
            status: 'Validated',
            enteredBy: 'Laboratory',
            enteredAt: nowIso(),
          }],
        },
      };
    }
    return { data: toLabRequest(order) };
  }

  if (clean === '/api/laboratory/requests' && m === 'GET') {
    const status = query.get('status');
    const labStatus = query.get('labStatus');
    const q = query.get('q');
    const items = labOrders()
      .filter(order => isInpatientDemo(db.patients.get(order.patientId)))
      .map(toLabRequest)
      .filter(row => !status || status.split(',').includes(row.status))
      .filter(row => !labStatus || labStatus.split(',').includes(row.labStatus))
      .filter(row => matchesQuery(q, row.requestNo, row.person?.firstName ?? '', row.person?.lastName ?? '', row.person?.hospitalNo ?? ''));
    return paged(items);
  }

  const rxNo = clean.match(/^\/api\/prescriptions\/by-rx\/(.+)$/);
  if (rxNo && m === 'GET') {
    const id = decodeURIComponent(rxNo[1]);
    const order = drugOrders().find(row => row.id === id);
    return { data: order ? toPrescription(order) : null };
  }

  const dispense = clean.match(/^\/api\/prescriptions\/(\d+)\/dispense$/);
  if (dispense && m === 'POST') {
    const order = findByDemoNumber(drugOrders(), Number(dispense[1]));
    if (!order) return { data: null };
    dispenseDrugOrder(order.id);
    return { data: toPrescription(db.orders.get(order.id) ?? order) };
  }

  if (clean === '/api/prescriptions' && m === 'GET') {
    const status = query.get('status');
    const q = query.get('q');
    const items = drugOrders()
      .filter(order => isInpatientDemo(db.patients.get(order.patientId)))
      .map(toPrescription)
      .filter(row => !status || status.split(',').includes(row.status))
      .filter(row => matchesQuery(q, row.rxNo, row.person?.firstName ?? '', row.person?.lastName ?? '', row.items.map(item => item.drugName).join(' ')));
    return paged(items);
  }

  const imagingId = clean.match(/^\/api\/radiology\/imaging\/requests\/(\d+)$/);
  if (imagingId && (m === 'PATCH' || m === 'GET')) {
    const localId = localImagingId(Number(imagingId[1]));
    const request = localId ? db.imagingRequests.get(localId) : undefined;
    if (!request) return null;
    if (m === 'PATCH') {
      const payload = body && typeof body === 'object' ? body as { status?: string } : {};
      if (payload.status === 'Accepted') acceptRequest(request.id, 'Radiology');
      if (payload.status === 'Rejected') db.imagingRequests.update(request.id, { status: 'REJECTED', updatedAt: nowIso() });
    }
    return { data: toImagingRequest(db.imagingRequests.get(request.id) ?? request) };
  }

  if (clean === '/api/radiology/metrics' && m === 'GET') {
    const rows = db.imagingRequests.list().filter(row => row.clinicalNotes?.includes('inpatient-demo') || isInpatientDemo(db.patients.get(row.patientId)));
    return {
      data: {
        total: rows.length,
        unpaid: rows.filter(row => row.paymentStatus !== 'PAID').length,
        paid: rows.filter(row => row.paymentStatus === 'PAID').length,
        accepted: rows.filter(row => row.status === 'ACCEPTED').length,
        scheduled: rows.filter(row => row.status === 'SCHEDULED').length,
        inProgress: rows.filter(row => row.status === 'IN_PROGRESS').length,
        completed: rows.filter(row => row.status === 'REPORTED' || row.status === 'VERIFIED' || row.status === 'RELEASED').length,
        released: rows.filter(row => row.status === 'RELEASED').length,
        criticalReports: 0,
        criticalEcgs: 0,
      },
    };
  }

  if (clean === '/api/radiology/equipment' && m === 'GET') {
    return { data: { items: [] } };
  }

  if (clean === '/api/radiology/imaging/requests' && m === 'GET') {
    return paged(db.imagingRequests.list()
      .filter(row => row.clinicalNotes?.includes('inpatient-demo') || isInpatientDemo(db.patients.get(row.patientId)))
      .map(toImagingRequest));
  }

  if (clean === '/api/cashier/reports' && m === 'GET') return { data: cashierReports() };
  if (clean === '/api/cashier/shifts/current' && m === 'GET') {
    return {
      data: {
        shift: {
          shiftId: 1,
          shiftNo: 'SH-DEMO',
          cashierLabel: 'Cashier',
          openingFloat: 0,
          openedAt: nowIso(),
          status: 'Open',
          totals: { cash: 0, pos: 0, transfer: 0, online: 0, wallet: 0, nhia: 0, hmo: 0, refunds: 0, captured: 0 },
          expectedCash: 0,
        },
      },
    };
  }
  if (clean === '/api/cashier/receipts' && m === 'GET') {
    return { data: { items: [], meta: { page: 1, limit: 8, total: 0 } } };
  }

  return null;
}

export function inpatientChart(admissionId: string) {
  const admission = db.admissions.get(admissionId);
  if (!admission) return null;
  const lab = orderFor(admission, 'lab');
  const drug = orderFor(admission, 'drug');
  const imagingOrder = orderFor(admission, 'imaging');
  const imaging = db.imagingRequests.list().find(row => row.orderId === imagingOrder?.id || (row.patientId === admission.patientId && row.clinicalNotes?.includes('inpatient-demo')));
  const report = imaging ? db.radiologyReports.list().find(row => row.requestId === imaging.id) : undefined;
  const vitals = db.vitals.list().filter(row => row.admissionId === admission.id);
  return { admission, lab, drug, imaging, report, vitals };
}

let listening = false;
function listenForDeposits() {
  if (listening) return;
  listening = true;
  on('INVOICE_PAID', payload => {
    const invoiceId = payload && typeof payload === 'object' && 'invoiceId' in payload
      ? String((payload as { invoiceId?: string }).invoiceId ?? '')
      : '';
    if (invoiceId) admitInpatientInvoice(invoiceId);
  });
}

listenForDeposits();
ensureInpatientSeed();
