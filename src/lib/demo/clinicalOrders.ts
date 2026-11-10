/**
 * Consultation orders stored in this browser.
 * Doctor buttons read the dummy catalogs. Cashier, Pharmacy, Laboratory,
 * Radiology, Records, and Nursing read and update the same orders.
 */
import type { WardRecord, BedRecord } from '@/lib/api/admissions';
import type { ApiAdmissionRequest } from '@/lib/api/admission-requests';
import type { ApiDiagnosisCatalogEntry, ApiPatientDiagnosis } from '@/lib/api/diagnoses';
import type { ApiImagingRequest, ApiImagingReport, ApiImagingStudy } from '@/lib/api/imaging';
import type { ApiLabRequest, ApiLabResult, ApiLabSample, ApiLabTest } from '@/lib/api/laboratory';
import type { ApiDrug } from '@/lib/api/pharmacy';
import type { ApiPrescription, ApiPrescriptionItem } from '@/lib/api/prescriptions';
import type { ApiReferral } from '@/lib/api/referrals';
import type { ApiTransfer } from '@/lib/api/transfers';
import { resolveInpatientApi } from '@/lib/demo/inpatientCase';
import { listStoredPatientQueues } from '@/lib/demo/registrationDesk';

const KEY = 'gfa_clinical_orders_v1';

interface DeskPerson {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
}

interface Store {
  nextId: number;
  prescriptions: ApiPrescription[];
  labRequests: ApiLabRequest[];
  labSamples: ApiLabSample[];
  labResults: ApiLabResult[];
  imagingRequests: ApiImagingRequest[];
  imagingReports: ApiImagingReport[];
  diagnoses: ApiPatientDiagnosis[];
  admissions: ApiAdmissionRequest[];
  referrals: ApiReferral[];
  transfers: ApiTransfer[];
}

const emptyStore = (): Store => ({
  nextId: 51000,
  prescriptions: [],
  labRequests: [],
  labSamples: [],
  labResults: [],
  imagingRequests: [],
  imagingReports: [],
  diagnoses: [],
  admissions: [],
  referrals: [],
  transfers: [],
});

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      ...emptyStore(),
      ...parsed,
      nextId: parsed.nextId || 51000,
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions : [],
      labRequests: Array.isArray(parsed.labRequests) ? parsed.labRequests : [],
      labSamples: Array.isArray(parsed.labSamples) ? parsed.labSamples : [],
      labResults: Array.isArray(parsed.labResults) ? parsed.labResults : [],
      imagingRequests: Array.isArray(parsed.imagingRequests) ? parsed.imagingRequests : [],
      imagingReports: Array.isArray(parsed.imagingReports) ? parsed.imagingReports : [],
      diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
      admissions: Array.isArray(parsed.admissions) ? parsed.admissions : [],
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
    };
  } catch {
    return emptyStore();
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function nowIso() {
  return new Date().toISOString();
}

function envelope<T>(data: T) {
  return { data };
}

function paged<T>(items: T[]) {
  return { data: { items, meta: { page: 1, limit: Math.max(items.length, 1), total: items.length } } };
}

function cleanPath(path: string) {
  const raw = path.startsWith('/') ? path : `/${path}`;
  return raw.split('?')[0].replace(/\/$/, '');
}

function queryOf(path: string) {
  return new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function listed(filter: string | null, value: string) {
  if (!filter) return true;
  return filter.split(',').map((part) => part.trim()).filter(Boolean).includes(value);
}

function hit(q: string | null, ...parts: Array<string | null | undefined>) {
  const term = (q ?? '').trim().toLowerCase();
  if (!term) return true;
  return parts.filter(Boolean).join(' ').toLowerCase().includes(term);
}

function personOf(personId: number): DeskPerson {
  try {
    const raw = localStorage.getItem('gfa_registration_desk_v1');
    const people = raw ? (JSON.parse(raw) as { people?: Array<Record<string, unknown>> }).people : [];
    const row = people?.find((person) => Number(person.personId) === personId);
    if (row) {
      return {
        personId,
        hospitalNo: text(row.hospitalNo) || null,
        firstName: text(row.firstName) || null,
        lastName: text(row.lastName) || null,
        middleName: text(row.middleName) || null,
        sex: text(row.sex) || null,
        dateOfBirth: text(row.dateOfBirth) || null,
        age: null,
        phone: text(row.patientPhoneNo) || text(row.phone) || null,
      };
    }
  } catch {
    /* ignore a bad desk store */
  }
  const queued = listStoredPatientQueues().find((row) => row.personId === personId)?.person;
  if (queued) {
    return {
      personId,
      hospitalNo: queued.hospitalNo,
      firstName: queued.firstName,
      lastName: queued.lastName,
      middleName: queued.middleName,
      sex: queued.sex,
      dateOfBirth: queued.dateOfBirth,
      age: queued.age,
      phone: queued.phone,
    };
  }
  return {
    personId,
    hospitalNo: null,
    firstName: 'Patient',
    lastName: `#${personId}`,
    middleName: null,
    sex: null,
    dateOfBirth: null,
    age: null,
    phone: null,
  };
}

function inpatientItems(path: string, method: string): unknown[] {
  const res = resolveInpatientApi(path, method) as { data?: { items?: unknown[] } } | null;
  return Array.isArray(res?.data?.items) ? res.data.items : [];
}

const DRUGS: ApiDrug[] = [
  ['Paracetamol', 'Analgesic', 'Tablet', '500mg', 50],
  ['Amoxicillin', 'Antibiotic', 'Capsule', '500mg', 80],
  ['Artemether-Lumefantrine', 'Antimalarial', 'Tablet', '80/480mg', 200],
  ['Ibuprofen', 'Analgesic', 'Tablet', '400mg', 40],
  ['Metformin', 'Antidiabetic', 'Tablet', '500mg', 60],
  ['Amlodipine', 'Antihypertensive', 'Tablet', '5mg', 30],
  ['Omeprazole', 'Antacid', 'Capsule', '20mg', 70],
  ['Cetirizine', 'Antihistamine', 'Tablet', '10mg', 20],
  ['Oral Rehydration Salts', 'Fluid', 'Sachet', '20.5g', 100],
  ['Artesunate', 'Antimalarial', 'Injection', '60mg', 500],
  ['Normal Saline', 'Fluid', 'Infusion', '500ml', 300],
  ['Vitamin C', 'Supplement', 'Tablet', '100mg', 15],
].map(([name, category, form, strength, price], index) => ({
  drugId: index + 1,
  name,
  genericName: name,
  category,
  form,
  strength,
  unit: form === 'Infusion' ? 'bottle' : form === 'Sachet' ? 'sachet' : 'tablet',
  unitPrice: Number(price),
  reorderLevel: 20,
  shelf: `A-${index + 1}`,
  controlled: false,
  status: 'Active',
  supplierId: 1,
  supplierName: 'GFA Stores',
  stock: 240,
  earliestExpiry: '2027-12-31',
  earliestBatchNo: `B-2026-${index + 1}`,
  stockStatus: 'Active',
  createdAt: '2026-01-01T00:00:00.000Z',
  batches: [{
    batchId: index + 1,
    batchNo: `B-2026-${index + 1}`,
    mfgDate: '2026-01-01',
    expiryDate: '2027-12-31',
    qtyReceived: 240,
    qtyAvailable: 240,
    unitCost: Number(price) * 0.6,
    sellingPrice: Number(price),
    location: `A-${index + 1}`,
    status: 'Active',
    receivedAt: '2026-01-01T00:00:00.000Z',
  }],
}));

const LAB_TESTS: ApiLabTest[] = [
  ['FBC', 'Full Blood Count', 'Haematology', 'Blood', 'EDTA', '4 hours', 2500],
  ['MP', 'Malaria RDT', 'Parasitology', 'Blood', 'EDTA', '30 minutes', 1500],
  ['UE', 'Urea and Electrolytes', 'Chemistry', 'Blood', 'Serum', '6 hours', 3500],
  ['LFT', 'Liver Function Test', 'Chemistry', 'Blood', 'Serum', '6 hours', 4000],
  ['FBS', 'Fasting Blood Sugar', 'Chemistry', 'Blood', 'Fluoride', '2 hours', 1200],
  ['UR', 'Urinalysis', 'Clinical pathology', 'Urine', 'Universal', '1 hour', 1000],
].map(([testCode, name, category, specimenType, container, turnaround, price], index) => ({
  labTestId: index + 1,
  testCode,
  name,
  category,
  specimenType,
  container,
  turnaround,
  unitPrice: Number(price),
  loincCode: null,
  isPanel: false,
  status: 'Active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
}));

const STUDIES: ApiImagingStudy[] = [
  ['XR-CHEST', 'Chest X-ray', 'X-Ray', 'Chest', '2 hours', 5000],
  ['XR-SKULL', 'Skull X-ray', 'X-Ray', 'Head / Brain', '2 hours', 4500],
  ['US-ABD', 'Abdominal ultrasound', 'Ultrasound', 'Abdomen', '1 day', 8000],
  ['US-PEL', 'Pelvic ultrasound', 'Ultrasound', 'Pelvis', '1 day', 8000],
  ['US-DOP', 'Doppler ultrasound', 'Ultrasound', 'Abdomen', '1 day', 12000],
  ['ECG-12', '12-lead ECG', 'ECG', 'Heart', '30 minutes', 3000],
  ['CT-BRAIN', 'CT brain', 'CT Scan', 'Head / Brain', '1 day', 35000],
  ['MRI-BRAIN', 'MRI brain', 'MRI', 'Head / Brain', '2 days', 55000],
  ['EEG-RT', 'Routine EEG', 'EEG', 'Head / Brain', '1 day', 15000],
  ['ECHO-TTE', 'Transthoracic echo', 'Echocardiography', 'Heart', '1 day', 18000],
  ['FL-BAR', 'Barium swallow', 'Fluoroscopy', 'Chest', '1 day', 14000],
  ['MAM-SCR', 'Mammogram', 'Mammography', 'Breast', '2 days', 12000],
  ['XR-PORT', 'Portable chest X-ray', 'Portable', 'Chest', '1 hour', 7000],
].map(([studyCode, name, modality, bodyRegion, turnaround, price], index) => ({
  imagingStudyId: index + 1,
  studyCode,
  name,
  modality,
  bodyRegion,
  turnaround,
  unitPrice: Number(price),
  status: 'Active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
}));

const DIAGNOSES: ApiDiagnosisCatalogEntry[] = [
  ['1A40', 'Malaria', 'Infectious'],
  ['8A80', 'Tension headache', 'Neurology'],
  ['CA40', 'Upper respiratory infection', 'Respiratory'],
  ['5A11', 'Type 2 diabetes', 'Endocrine'],
  ['BA00', 'Essential hypertension', 'Cardiovascular'],
  ['6A70', 'Depression', 'Mental health'],
].map(([code, name, category], index) => ({
  diagnosisCodeId: index + 1,
  id: `DXC-${index + 1}`,
  code,
  dsmCode: null,
  system: 'ICD-11',
  name,
  category,
  description: name,
  symptoms: null,
  keywords: name.toLowerCase(),
  isPsychiatric: category === 'Mental health',
  status: 'Active',
}));

const WARDS: WardRecord[] = [
  { wardId: 1, code: 'MM', name: 'Male Medical', wardType: 'Medical', gender: 'Male', status: 'Active', totalBeds: 4, availableBeds: 4, occupiedBeds: 0, dailyBedRate: 5000 },
  { wardId: 2, code: 'FM', name: 'Female Medical', wardType: 'Medical', gender: 'Female', status: 'Active', totalBeds: 4, availableBeds: 4, occupiedBeds: 0, dailyBedRate: 5000 },
  { wardId: 3, code: 'P1C', name: 'Psychiatric 1C', wardType: 'Psychiatry', gender: 'Mixed', status: 'Active', totalBeds: 4, availableBeds: 4, occupiedBeds: 0, dailyBedRate: 8000 },
];

const BEDS: BedRecord[] = WARDS.flatMap((ward) => [1, 2].map((n) => ({
  bedId: ward.wardId * 10 + n,
  wardId: ward.wardId,
  label: `${ward.code}-0${n}`,
  status: 'AVAILABLE',
  ward: { wardId: ward.wardId, code: ward.code, name: ward.name },
})));

function wardById(id: number | null | undefined) {
  return WARDS.find((ward) => ward.wardId === id) ?? null;
}

function markPaid<T extends { paymentStatus: string; paymentChannel: string | null; paymentRef: string | null; paidAt: string | null; paidBy: string | null }>(
  row: T,
  body: unknown,
): T {
  const payload = asRecord(body);
  row.paymentStatus = 'Paid';
  row.paymentChannel = text(payload.paymentChannel, 'Cash');
  row.paymentRef = text(payload.paymentRef) || null;
  row.paidAt = nowIso();
  row.paidBy = 'Cashier';
  return row;
}

function prescriptionMatches(row: ApiPrescription, query: URLSearchParams) {
  const person = row.person;
  return listed(query.get('status'), row.status)
    && listed(query.get('paymentStatus'), row.paymentStatus)
    && (query.get('personId') == null || row.personId === Number(query.get('personId')))
    && hit(query.get('q'), row.rxNo, person?.firstName, person?.lastName, person?.hospitalNo, row.items.map((item) => item.drugName).join(' '));
}

function labMatches(row: ApiLabRequest, query: URLSearchParams) {
  const person = row.person;
  return listed(query.get('status'), row.status)
    && listed(query.get('labStatus'), row.labStatus ?? '')
    && listed(query.get('paymentStatus'), row.paymentStatus)
    && (query.get('personId') == null || row.personId === Number(query.get('personId')))
    && (query.get('encounterId') == null || row.encounterId === Number(query.get('encounterId')))
    && hit(query.get('q'), row.requestNo, person?.firstName, person?.lastName, person?.hospitalNo);
}

function imagingMatches(row: ApiImagingRequest, query: URLSearchParams) {
  const person = row.person;
  return listed(query.get('status'), row.status)
    && listed(query.get('paymentStatus'), row.paymentStatus)
    && (query.get('personId') == null || row.personId === Number(query.get('personId')))
    && hit(query.get('q'), row.requestNo, person?.firstName, person?.lastName, person?.hospitalNo, row.items.map((item) => item.studyName).join(' '));
}

function createPrescription(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const id = store.nextId++;
  const items = (Array.isArray(payload.items) ? payload.items : []).map((raw, index) => {
    const line = asRecord(raw);
    const drug = DRUGS.find((row) => row.drugId === num(line.drugId));
    const quantity = Math.max(1, num(line.quantity) || 1);
    const item: ApiPrescriptionItem = {
      itemId: id * 10 + index + 1,
      drugId: drug?.drugId ?? num(line.drugId),
      drugName: drug?.name ?? `Drug ${num(line.drugId)}`,
      strength: text(line.strength, drug?.strength ?? '') || null,
      form: text(line.form, drug?.form ?? '') || null,
      route: text(line.route, 'PO') || null,
      dose: text(line.dose, '1'),
      frequency: text(line.frequency, 'TDS'),
      duration: text(line.duration) || null,
      quantity,
      qtyDispensed: 0,
      source: text(line.source, 'Formulary'),
      instructions: text(line.instructions) || null,
      indication: text(line.indication) || null,
      lineStatus: 'Pending',
      unitPrice: drug?.unitPrice ?? 0,
    };
    return item;
  });
  const row: ApiPrescription = {
    prescriptionId: id,
    rxNo: `RX-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    status: payload.send === false ? 'Draft' : 'Sent',
    urgency: text(payload.urgency, 'Routine'),
    paymentStatus: text(payload.paymentStatus, 'Unpaid'),
    diagnosis: text(payload.diagnosis) || null,
    allergiesNote: text(payload.allergiesNote) || null,
    clinic: text(payload.clinic) || null,
    notes: text(payload.notes) || null,
    pharmacyNotes: null,
    sentAt: nowIso(),
    prescribedBy: 'Dr. Ngozi Ikedife',
    dispensedBy: null,
    dispensedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    items,
    person,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    auditTrail: [{ at: nowIso(), actor: 'Dr. Ngozi Ikedife', action: 'Prescribed' }],
  };
  store.prescriptions.unshift(row);
  save(store);
  return envelope(row);
}

function dispensePrescription(id: number, emergency = false) {
  const store = load();
  const row = store.prescriptions.find((item) => item.prescriptionId === id);
  if (!row) return null;
  row.status = 'Dispensed';
  row.dispensedBy = 'Pharmacist';
  row.dispensedAt = nowIso();
  row.updatedAt = nowIso();
  if (emergency) row.paymentStatus = 'Emergency';
  row.items = row.items.map((item) => ({ ...item, qtyDispensed: item.quantity, lineStatus: 'Dispensed' }));
  row.auditTrail = [...(row.auditTrail ?? []), { at: nowIso(), actor: 'Pharmacist', action: 'Dispensed' }];
  save(store);
  return envelope(row);
}

function createLab(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const id = store.nextId++;
  const items = (Array.isArray(payload.items) ? payload.items : []).map((raw, index) => {
    const line = asRecord(raw);
    const test = LAB_TESTS.find((row) => row.labTestId === num(line.testId));
    return {
      itemId: id * 10 + index + 1,
      labTestId: test?.labTestId ?? num(line.testId),
      testCode: test?.testCode ?? 'TEST',
      testName: test?.name ?? 'Laboratory test',
      category: test?.category ?? null,
      specimenType: test?.specimenType ?? null,
      unitPrice: test?.unitPrice ?? 0,
      lineNotes: text(line.lineNotes) || null,
    };
  });
  const row: ApiLabRequest = {
    labRequestId: id,
    requestNo: `LAB-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    encounterId: payload.encounterId == null ? null : num(payload.encounterId),
    doctorId: 8,
    source: text(payload.source, 'Doctor'),
    priority: text(payload.priority, 'Routine'),
    clinicalIndication: text(payload.clinicalIndication) || null,
    clinicalNotes: text(payload.clinicalNotes) || null,
    status: 'Sent',
    labStatus: 'AwaitingCollection',
    paymentStatus: 'Unpaid',
    paymentChannel: null,
    paymentRef: null,
    paidAt: null,
    paidBy: null,
    totalAmount: items.reduce((sum, item) => sum + item.unitPrice, 0),
    paymentCleared: false,
    processingLocked: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    doctorName: 'Dr. Ngozi Ikedife',
    items,
    person,
  };
  store.labRequests.unshift(row);
  save(store);
  return envelope(row);
}

function payLab(row: ApiLabRequest, body: unknown) {
  markPaid(row, body);
  row.paymentCleared = true;
  row.processingLocked = false;
  row.updatedAt = nowIso();
}

function collectLab(id: number) {
  const store = load();
  const row = store.labRequests.find((item) => item.labRequestId === id);
  if (!row) return null;
  row.labStatus = 'Collected';
  row.updatedAt = nowIso();
  const existing = store.labSamples.filter((sample) => sample.labRequestId === id);
  const samples = existing.length > 0 ? existing : row.items.map((item, index) => {
    const sample: ApiLabSample = {
      sampleId: row.labRequestId * 10 + index + 1,
      sampleNo: `SP-${row.requestNo}-${index + 1}`,
      labRequestId: row.labRequestId,
      specimenType: item.specimenType ?? 'Blood',
      container: 'EDTA',
      status: 'Collected',
      collectedBy: 'Laboratory',
      collectedAt: nowIso(),
      rejectReason: null,
      createdAt: nowIso(),
      requestNo: row.requestNo,
      priority: row.priority,
      labStatus: row.labStatus ?? null,
      personId: row.personId,
      personName: [row.person?.firstName, row.person?.lastName].filter(Boolean).join(' '),
      hospitalNo: row.person?.hospitalNo ?? null,
    };
    store.labSamples.unshift(sample);
    return sample;
  });
  save(store);
  return envelope({ request: row, samples });
}

function saveLabResults(id: number, body: unknown) {
  const store = load();
  const row = store.labRequests.find((item) => item.labRequestId === id);
  if (!row) return null;
  const payload = asRecord(body);
  const lines = Array.isArray(payload.items) ? payload.items : [];
  const results = lines.map((raw, index) => {
    const line = asRecord(raw);
    const item = row.items.find((entry) => entry.itemId === num(line.requestItemId)) ?? row.items[index];
    const result: ApiLabResult = {
      labResultId: id * 10 + index + 1,
      labRequestId: id,
      requestItemId: item?.itemId ?? num(line.requestItemId),
      templateId: line.templateId == null ? 1 : num(line.templateId),
      templateCode: 'TPL-FBC',
      templateName: item?.testName ?? 'Result',
      templateFields: [{ key: 'result', label: 'Result', type: 'text', required: true }],
      values: (line.values && typeof line.values === 'object' ? line.values : { result: 'Within normal limits' }) as ApiLabResult['values'],
      comment: text(line.comment) || 'Within normal limits',
      status: payload.action === 'submit' ? 'AwaitingValidation' : 'Draft',
      enteredBy: 'Laboratory',
      enteredAt: nowIso(),
      validatedBy: null,
      validatedAt: null,
      returnReason: null,
      version: 1,
      testCode: item?.testCode ?? null,
      testName: item?.testName ?? null,
      category: item?.category ?? null,
      specimenType: item?.specimenType ?? null,
      requestNo: row.requestNo,
      priority: row.priority,
      labStatus: row.labStatus ?? null,
      personId: row.personId,
      personName: [row.person?.firstName, row.person?.lastName].filter(Boolean).join(' '),
      hospitalNo: row.person?.hospitalNo ?? null,
      sex: row.person?.sex ?? null,
    };
    return result;
  });
  store.labResults = [...results, ...store.labResults.filter((item) => item.labRequestId !== id)];
  row.labStatus = payload.action === 'submit' ? 'AwaitingValidation' : 'ResultDraft';
  row.updatedAt = nowIso();
  save(store);
  return envelope({ request: row, results });
}

function createImaging(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const id = store.nextId++;
  const items = (Array.isArray(payload.items) ? payload.items : []).map((raw, index) => {
    const line = asRecord(raw);
    const study = STUDIES.find((row) => row.imagingStudyId === num(line.studyId));
    return {
      itemId: id * 10 + index + 1,
      imagingStudyId: study?.imagingStudyId ?? num(line.studyId),
      studyCode: study?.studyCode ?? 'IMG',
      studyName: study?.name ?? 'Imaging study',
      modality: study?.modality ?? 'X-Ray',
      bodyRegion: study?.bodyRegion ?? null,
      unitPrice: study?.unitPrice ?? 0,
      lineNotes: text(line.lineNotes) || null,
    };
  });
  const row: ApiImagingRequest = {
    imagingRequestId: id,
    requestNo: `IMG-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    encounterId: payload.encounterId == null ? null : num(payload.encounterId),
    doctorId: 8,
    source: text(payload.source, 'Doctor'),
    priority: text(payload.priority, 'Routine'),
    clinicalIndication: text(payload.clinicalIndication) || null,
    clinicalNotes: text(payload.clinicalNotes) || null,
    contrast: text(payload.contrast) || null,
    status: 'Sent',
    paymentStatus: 'Unpaid',
    paymentChannel: null,
    paymentRef: null,
    paidAt: null,
    paidBy: null,
    totalAmount: items.reduce((sum, item) => sum + item.unitPrice, 0),
    rejectionReason: null,
    scheduledAt: null,
    scheduledRoom: null,
    paymentCleared: false,
    processingLocked: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    doctorName: 'Dr. Ngozi Ikedife',
    items,
    person,
  };
  store.imagingRequests.unshift(row);
  save(store);
  return envelope(row);
}

function payImaging(row: ApiImagingRequest, body: unknown) {
  markPaid(row, body);
  row.paymentCleared = true;
  row.processingLocked = false;
  row.updatedAt = nowIso();
}

function createDiagnosis(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const catalog = DIAGNOSES.find((row) => row.diagnosisCodeId === num(payload.diagnosisCodeId))
    ?? DIAGNOSES.find((row) => row.code === text(payload.code));
  const id = store.nextId++;
  const row: ApiPatientDiagnosis = {
    patientDiagnosisId: id,
    id: `DX-${id}`,
    personId: person.personId,
    patientId: String(person.personId),
    patientName: [person.firstName, person.lastName].filter(Boolean).join(' '),
    hospitalId: person.hospitalNo,
    encounterId: payload.encounterId == null ? null : num(payload.encounterId),
    encounter: payload.encounterId == null ? 'Consultation' : `Encounter ${num(payload.encounterId)}`,
    code: catalog?.code ?? text(payload.code, '8A80'),
    dsmCode: null,
    system: text(payload.system, catalog?.system ?? 'ICD-11'),
    name: catalog?.name ?? text(payload.name, 'Clinical diagnosis'),
    type: text(payload.type, 'Primary'),
    severity: text(payload.severity) || null,
    status: text(payload.status, 'Active'),
    certainty: text(payload.certainty, 'Confirmed'),
    dateAdded: nowIso(),
    addedBy: 'Dr. Ngozi Ikedife',
    clinic: text(payload.clinic) || null,
    notes: text(payload.notes),
    onsetDate: text(payload.onsetDate, nowIso().slice(0, 10)),
    onProblemList: payload.onProblemList !== false,
    isPsychiatric: catalog?.isPsychiatric ?? false,
    isNewThisWeek: true,
    reasonConsidered: text(payload.reasonConsidered) || null,
    supportingFindings: text(payload.supportingFindings) || null,
    againstFindings: text(payload.againstFindings) || null,
    controlStatus: null,
    lastReview: null,
    nextReview: null,
    riskLevel: text(payload.riskLevel) || null,
    linkedSymptoms: text(payload.linkedSymptoms) || null,
    linkedLab: text(payload.linkedLab) || null,
    linkedImaging: text(payload.linkedImaging) || null,
    linkedRx: text(payload.linkedRx) || null,
    closedReason: null,
    closedBy: null,
    closedDate: null,
  };
  store.diagnoses.unshift(row);
  save(store);
  return envelope(row);
}

function createAdmission(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const ward = wardById(payload.wardId == null ? null : num(payload.wardId));
  const id = store.nextId++;
  const row: ApiAdmissionRequest = {
    admissionRequestId: id,
    requestNo: `ADM-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    encounterId: payload.encounterId == null ? null : num(payload.encounterId),
    wardId: ward?.wardId ?? null,
    wardPreference: text(payload.wardPreference, ward?.name ?? '') || null,
    priority: text(payload.priority, 'Routine'),
    priorityReason: text(payload.priorityReason) || null,
    admissionType: text(payload.admissionType, 'Elective'),
    estimatedLos: text(payload.estimatedLos) || null,
    provisionalDiagnosis: text(payload.provisionalDiagnosis) || null,
    secondaryDiagnosis: text(payload.secondaryDiagnosis) || null,
    clinicalIndication: text(payload.clinicalIndication) || null,
    mentalHealthRisk: text(payload.mentalHealthRisk) || null,
    physicalHealthRisk: text(payload.physicalHealthRisk) || null,
    treatmentPlan: text(payload.treatmentPlan) || null,
    requiredMonitoring: text(payload.requiredMonitoring) || null,
    nursingObservation: text(payload.nursingObservation) || null,
    isolationRequired: Boolean(payload.isolationRequired),
    fallRisk: Boolean(payload.fallRisk),
    suicideRisk: Boolean(payload.suicideRisk),
    violenceRisk: Boolean(payload.violenceRisk),
    withdrawalRisk: Boolean(payload.withdrawalRisk),
    specialBed: text(payload.specialBed) || null,
    consentStatus: text(payload.consentStatus) || null,
    nokInformed: text(payload.nokInformed) || null,
    clinicDepartment: text(payload.clinicDepartment) || null,
    doctorNote: text(payload.doctorNote) || null,
    status: payload.asDraft ? 'Draft' : 'Submitted',
    rejectionReason: null,
    requestedByUserId: 8,
    requestedBy: 'Dr. Ngozi Ikedife',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    person,
    ward: ward ? { wardId: ward.wardId, code: ward.code, name: ward.name, wardType: ward.wardType } : null,
  };
  store.admissions.unshift(row);
  save(store);
  return envelope(row);
}

function createReferral(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const id = store.nextId++;
  const row: ApiReferral = {
    referralId: id,
    referralNo: `REF-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    encounterId: payload.encounterId == null ? null : num(payload.encounterId),
    admissionId: null,
    referralKind: text(payload.referralKind, 'Internal'),
    careSetting: text(payload.careSetting, 'Outpatient'),
    priority: text(payload.priority, 'Routine'),
    fromDepartment: text(payload.fromDepartment, 'General OPD'),
    toDepartment: text(payload.toDepartment) || null,
    toDoctorUserId: payload.toDoctorUserId == null ? null : num(payload.toDoctorUserId),
    toDoctorLabel: text(payload.toDoctorLabel) || null,
    externalFacility: text(payload.externalFacility) || null,
    externalContact: text(payload.externalContact) || null,
    externalAddress: text(payload.externalAddress) || null,
    reason: text(payload.reason, 'Clinical review'),
    provisionalDiagnosis: text(payload.provisionalDiagnosis) || null,
    clinicalSummary: text(payload.clinicalSummary) || null,
    specificQuestion: text(payload.specificQuestion) || null,
    outcomeNote: null,
    status: 'Submitted',
    requestedByUserId: 8,
    ackedAt: null,
    routedAt: null,
    allocatedAt: null,
    allocatedWardId: null,
    allocatedBedId: null,
    acceptedAt: null,
    completedAt: null,
    rejectionReason: null,
    returnReason: null,
    createdBy: 'Dr. Ngozi Ikedife',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    person,
    allocatedWard: null,
    allocatedBed: null,
    events: [{ eventId: id, eventType: 'Submitted', actorUserId: 8, actorLabel: 'Dr. Ngozi Ikedife', note: null, oldStatus: null, newStatus: 'Submitted', createdAt: nowIso() }],
  };
  store.referrals.unshift(row);
  save(store);
  return envelope(row);
}

function patchReferral(id: number, status: string, patch: Partial<ApiReferral> = {}) {
  const store = load();
  const row = store.referrals.find((item) => item.referralId === id);
  if (!row) return null;
  const previous = row.status;
  Object.assign(row, patch, { status, updatedAt: nowIso() });
  row.events = [...row.events, {
    eventId: store.nextId++,
    eventType: status,
    actorUserId: 8,
    actorLabel: 'Records',
    note: null,
    oldStatus: previous,
    newStatus: status,
    createdAt: nowIso(),
  }];
  save(store);
  return envelope(row);
}

function createTransfer(body: unknown) {
  const payload = asRecord(body);
  const store = load();
  const person = personOf(num(payload.personId));
  const fromWard = wardById(payload.fromWardId == null ? null : num(payload.fromWardId));
  const toWard = wardById(payload.toWardId == null ? null : num(payload.toWardId));
  const id = store.nextId++;
  const row: ApiTransfer = {
    transferId: id,
    transferNo: `TR-2026-${String(id).padStart(4, '0')}`,
    personId: person.personId,
    admissionId: payload.admissionId == null ? null : num(payload.admissionId),
    transferType: text(payload.transferType, 'WardToWard'),
    priority: text(payload.priority, 'Routine'),
    fromWardId: fromWard?.wardId ?? null,
    toWardId: toWard?.wardId ?? null,
    toWardPreference: text(payload.toWardPreference) || null,
    destinationLabel: text(payload.destinationLabel, toWard?.name ?? '') || null,
    allocatedBedId: null,
    reason: text(payload.reason, 'Clinical transfer'),
    clinicalNotes: text(payload.clinicalNotes) || null,
    handoverNotes: null,
    status: 'Submitted',
    requestedByUserId: 8,
    preparedByUserId: null,
    preparedAt: null,
    allocatedByUserId: null,
    allocatedAt: null,
    acceptedByUserId: null,
    acceptedAt: null,
    departedByUserId: null,
    departedAt: null,
    receivedByUserId: null,
    receivedAt: null,
    rejectionReason: null,
    externalFacility: text(payload.externalFacility) || null,
    createdBy: 'Dr. Ngozi Ikedife',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    person,
    fromWard: fromWard ? { wardId: fromWard.wardId, code: fromWard.code, name: fromWard.name, wardType: fromWard.wardType } : null,
    toWard: toWard ? { wardId: toWard.wardId, code: toWard.code, name: toWard.name, wardType: toWard.wardType } : null,
    allocatedBed: null,
    admission: null,
    events: [{ eventId: id, eventType: 'Submitted', actorUserId: 8, actorLabel: 'Dr. Ngozi Ikedife', note: null, oldStatus: null, newStatus: 'Submitted', createdAt: nowIso() }],
  };
  store.transfers.unshift(row);
  save(store);
  return envelope(row);
}

function patchTransfer(id: number, status: string, patch: Partial<ApiTransfer> = {}) {
  const store = load();
  const row = store.transfers.find((item) => item.transferId === id);
  if (!row) return null;
  const previous = row.status;
  Object.assign(row, patch, { status, updatedAt: nowIso() });
  row.events = [...row.events, {
    eventId: store.nextId++,
    eventType: status,
    actorUserId: 4,
    actorLabel: 'Nursing',
    note: null,
    oldStatus: previous,
    newStatus: status,
    createdAt: nowIso(),
  }];
  save(store);
  return envelope(row);
}

/** Answers consultation catalogs and the department queues that act on those orders. */
export function resolveClinicalOrders(path: string, method: string, body?: unknown): unknown | null {
  const clean = cleanPath(path);
  const query = queryOf(path);
  const m = method.toUpperCase();

  if (clean === '/api/pharmacy/drugs' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    const category = query.get('category');
    const stock = query.get('stockStatus');
    const items = DRUGS.filter((drug) => {
      const blob = `${drug.name} ${drug.genericName} ${drug.category}`.toLowerCase();
      return (!term || blob.includes(term))
        && (!category || category === 'all' || drug.category === category)
        && (!stock || stock === 'all' || drug.stockStatus === stock);
    });
    return paged(items);
  }
  const drugId = clean.match(/^\/api\/pharmacy\/drugs\/(\d+)$/);
  if (drugId && m === 'GET') {
    return envelope(DRUGS.find((drug) => drug.drugId === Number(drugId[1])) ?? null);
  }

  if (clean === '/api/laboratory/tests' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    const category = query.get('category');
    const items = LAB_TESTS.filter((test) => {
      const blob = `${test.name} ${test.testCode} ${test.category}`.toLowerCase();
      return (!term || blob.includes(term)) && (!category || test.category === category);
    });
    return paged(items);
  }

  if (clean === '/api/radiology/imaging/studies' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    const modality = query.get('modality');
    const items = STUDIES.filter((study) => {
      const blob = `${study.name} ${study.studyCode} ${study.modality}`.toLowerCase();
      return (!term || blob.includes(term)) && (!modality || study.modality === modality);
    });
    return envelope({ items });
  }

  if (clean === '/api/diagnoses/catalog' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    const items = DIAGNOSES.filter((row) => !term || `${row.code} ${row.name} ${row.category}`.toLowerCase().includes(term));
    return envelope({ items });
  }
  if (clean === '/api/diagnoses/stats' && m === 'GET') {
    const personId = query.get('personId');
    const rows = load().diagnoses.filter((row) => !personId || row.personId === Number(personId));
    return envelope({
      active: rows.filter((row) => row.status === 'Active').length,
      newThisWeek: rows.length,
      chronic: 0,
      psychiatric: rows.filter((row) => row.isPsychiatric).length,
      provisional: rows.filter((row) => row.certainty === 'Provisional').length,
      differential: 0,
      resolved: rows.filter((row) => row.status === 'Resolved').length,
    });
  }
  if (clean === '/api/diagnoses' && m === 'GET') {
    const store = load();
    const items = store.diagnoses.filter((row) => {
      return (query.get('personId') == null || row.personId === Number(query.get('personId')))
        && listed(query.get('status'), row.status)
        && hit(query.get('q'), row.name, row.code, row.patientName, row.hospitalId);
    });
    return paged(items);
  }
  if (clean === '/api/diagnoses' && m === 'POST') return createDiagnosis(body);
  const diagnosisId = clean.match(/^\/api\/diagnoses\/(\d+)$/);
  if (diagnosisId && m === 'PATCH') {
    const store = load();
    const row = store.diagnoses.find((item) => item.patientDiagnosisId === Number(diagnosisId[1]));
    if (!row) return null;
    Object.assign(row, asRecord(body));
    save(store);
    return envelope(row);
  }

  if (clean === '/api/admissions/wards' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    return envelope({ items: WARDS.filter((ward) => !term || `${ward.name} ${ward.code}`.toLowerCase().includes(term)) });
  }
  if (clean === '/api/admissions/beds' && m === 'GET') {
    const wardId = query.get('wardId');
    const status = query.get('status');
    const items = BEDS.filter((bed) => (!wardId || bed.wardId === Number(wardId)) && (!status || bed.status === status));
    return envelope({ items });
  }

  if (clean === '/api/clinical-pharmacy/alerts' && m === 'GET') {
    return envelope({
      items: [],
      meta: { page: 1, limit: 20, total: 0 },
      kpis: { open: 0, severe: 0, allergy: 0, overriddenToday: 0 },
    });
  }
  if (clean === '/api/clinical-pharmacy/check' && m === 'POST') {
    return envelope({ findings: [], medCount: 0, allergyCount: 0, ruleCount: 0 });
  }
  if (clean === '/api/clinical-pharmacy/allergies' && m === 'GET') return envelope({ items: [] });

  if (clean === '/api/prescriptions' && m === 'POST') return createPrescription(body);
  if (clean === '/api/prescriptions' && m === 'GET') {
    const local = load().prescriptions.filter((row) => prescriptionMatches(row, query));
    return paged([...local, ...inpatientItems(path, m)]);
  }
  const rxNo = clean.match(/^\/api\/prescriptions\/by-rx\/(.+)$/);
  if (rxNo && m === 'GET') {
    const id = decodeURIComponent(rxNo[1]);
    const row = load().prescriptions.find((item) => item.rxNo === id || String(item.prescriptionId) === id);
    return row ? envelope(row) : null;
  }
  const dispense = clean.match(/^\/api\/prescriptions\/(\d+)\/(?:(emergency-)?)dispense$/);
  if (dispense && m === 'POST') return dispensePrescription(Number(dispense[1]), Boolean(dispense[2]));
  const rxId = clean.match(/^\/api\/prescriptions\/(\d+)$/);
  if (rxId && m === 'GET') {
    const row = load().prescriptions.find((item) => item.prescriptionId === Number(rxId[1]));
    return row ? envelope(row) : null;
  }
  if (rxId && m === 'PATCH') {
    const store = load();
    const row = store.prescriptions.find((item) => item.prescriptionId === Number(rxId[1]));
    if (!row) return null;
    const payload = asRecord(body);
    if (payload.status) row.status = text(payload.status);
    if (payload.paymentStatus) row.paymentStatus = text(payload.paymentStatus);
    if (payload.pharmacyNotes) row.pharmacyNotes = text(payload.pharmacyNotes);
    if (payload.notes) row.notes = text(payload.notes);
    row.updatedAt = nowIso();
    save(store);
    return envelope(row);
  }

  if (clean === '/api/cashier/payments/pharmacy-sales' && m === 'GET') return paged([]);
  if (clean === '/api/cashier/payments/admission-bills' && m === 'GET') return paged([]);

  if (clean === '/api/cashier/payments/prescriptions' && m === 'GET') {
    const items = load().prescriptions.filter((row) => prescriptionMatches(row, query));
    return paged(items);
  }
  const payRx = clean.match(/^\/api\/cashier\/payments\/prescriptions\/(\d+)\/confirm$/);
  if (payRx && m === 'POST') {
    const store = load();
    const row = store.prescriptions.find((item) => item.prescriptionId === Number(payRx[1]));
    if (!row) return null;
    markPaid(row, body);
    row.updatedAt = nowIso();
    save(store);
    return envelope(row);
  }

  if (clean === '/api/laboratory/requests' && m === 'POST') return createLab(body);
  if (clean === '/api/laboratory/requests' && m === 'GET') {
    const local = load().labRequests.filter((row) => labMatches(row, query));
    return paged([...local, ...inpatientItems(path, m)]);
  }
  const labAction = clean.match(/^\/api\/laboratory\/requests\/(\d+)(?:\/(collect|results|cancel))?$/);
  if (labAction) {
    const id = Number(labAction[1]);
    const action = labAction[2];
    const store = load();
    const row = store.labRequests.find((item) => item.labRequestId === id);
    if (!row) return null;
    if (!action && m === 'GET') return envelope(row);
    if (action === 'collect' && m === 'POST') return collectLab(id);
    if (action === 'results' && m === 'POST') return saveLabResults(id, body);
    if (action === 'cancel' && m === 'POST') {
      row.status = 'Cancelled';
      row.updatedAt = nowIso();
      save(store);
      return envelope(row);
    }
  }
  if (clean === '/api/laboratory/samples' && m === 'GET') {
    const requestId = query.get('requestId');
    const items = load().labSamples.filter((sample) => !requestId || sample.labRequestId === Number(requestId));
    return paged(items);
  }
  if (clean === '/api/laboratory/results' && m === 'GET') {
    const requestId = query.get('requestId');
    const local = load().labResults.filter((result) => !requestId || result.labRequestId === Number(requestId));
    return paged([...local, ...inpatientItems(path, m)]);
  }
  const validate = clean.match(/^\/api\/laboratory\/results\/(\d+)\/validate$/);
  if (validate && m === 'POST') {
    const store = load();
    const result = store.labResults.find((item) => item.labResultId === Number(validate[1]));
    if (!result) return null;
    result.status = 'Validated';
    result.validatedBy = 'Laboratory';
    result.validatedAt = nowIso();
    const request = store.labRequests.find((item) => item.labRequestId === result.labRequestId);
    if (request) {
      request.labStatus = 'Validated';
      request.updatedAt = nowIso();
    }
    save(store);
    return envelope(result);
  }
  if (clean === '/api/cashier/payments/lab-requests' && m === 'GET') {
    return paged(load().labRequests.filter((row) => labMatches(row, query)));
  }
  const payLabId = clean.match(/^\/api\/cashier\/payments\/lab-requests\/(\d+)\/confirm$/);
  if (payLabId && m === 'POST') {
    const store = load();
    const row = store.labRequests.find((item) => item.labRequestId === Number(payLabId[1]));
    if (!row) return null;
    payLab(row, body);
    save(store);
    return envelope(row);
  }

  if (clean === '/api/radiology/imaging/requests' && m === 'POST') return createImaging(body);
  if (clean === '/api/radiology/imaging/requests' && m === 'GET') {
    const local = load().imagingRequests.filter((row) => imagingMatches(row, query));
    return paged([...local, ...inpatientItems(path, m)]);
  }
  const imagingId = clean.match(/^\/api\/radiology\/imaging\/requests\/(\d+)$/);
  if (imagingId && (m === 'GET' || m === 'PATCH')) {
    const store = load();
    const row = store.imagingRequests.find((item) => item.imagingRequestId === Number(imagingId[1]));
    if (!row) return null;
    if (m === 'PATCH') {
      const payload = asRecord(body);
      if (payload.status) row.status = text(payload.status);
      if (payload.rejectionReason) row.rejectionReason = text(payload.rejectionReason);
      if (payload.scheduledRoom) row.scheduledRoom = text(payload.scheduledRoom);
      if (payload.scheduledAt) row.scheduledAt = text(payload.scheduledAt);
      row.updatedAt = nowIso();
      save(store);
    }
    return envelope(row);
  }
  if (clean === '/api/radiology/imaging/reports' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const request = store.imagingRequests.find((item) => item.imagingRequestId === num(payload.imagingRequestId));
    if (!request) return null;
    const report: ApiImagingReport = {
      reportId: store.nextId++,
      reportNo: `RPT-${request.requestNo}`,
      imagingRequestId: request.imagingRequestId,
      requestNo: request.requestNo,
      personId: request.personId,
      findings: text(payload.findings, 'No acute finding.'),
      impression: text(payload.impression, 'No acute finding.'),
      critical: text(payload.critical) === 'Y',
      status: text(payload.status, 'Released'),
      releasedAt: nowIso(),
      criticalAckAt: null,
      criticalAckBy: null,
      createdBy: 'Radiology',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      person: request.person,
    };
    request.status = 'Completed';
    request.updatedAt = nowIso();
    store.imagingReports.unshift(report);
    save(store);
    return envelope(report);
  }
  if (clean === '/api/radiology/imaging/reports' && m === 'GET') {
    const requestId = query.get('imagingRequestId');
    const items = load().imagingReports.filter((report) => !requestId || report.imagingRequestId === Number(requestId));
    return paged(items);
  }
  if (clean === '/api/cashier/payments/imaging-requests' && m === 'GET') {
    return paged(load().imagingRequests.filter((row) => imagingMatches(row, query)));
  }
  const payImg = clean.match(/^\/api\/cashier\/payments\/imaging-requests\/(\d+)\/confirm$/);
  if (payImg && m === 'POST') {
    const store = load();
    const row = store.imagingRequests.find((item) => item.imagingRequestId === Number(payImg[1]));
    if (!row) return null;
    payImaging(row, body);
    save(store);
    return envelope(row);
  }

  if (clean === '/api/admission-requests' && m === 'POST') return createAdmission(body);
  if (clean === '/api/admission-requests' && m === 'GET') {
    const items = load().admissions.filter((row) => listed(query.get('status'), row.status)
      && (query.get('personId') == null || row.personId === Number(query.get('personId')))
      && hit(query.get('q'), row.requestNo, row.person?.firstName, row.person?.lastName, row.person?.hospitalNo));
    return paged(items);
  }
  const admissionId = clean.match(/^\/api\/admission-requests\/(\d+)$/);
  if (admissionId && m === 'GET') {
    const row = load().admissions.find((item) => item.admissionRequestId === Number(admissionId[1]));
    return row ? envelope(row) : envelope(null);
  }
  if (admissionId && m === 'PATCH') {
    const store = load();
    const row = store.admissions.find((item) => item.admissionRequestId === Number(admissionId[1]));
    if (!row) return null;
    const payload = asRecord(body);
    if (payload.status) row.status = text(payload.status);
    if (payload.rejectionReason) row.rejectionReason = text(payload.rejectionReason);
    if (payload.wardId != null) {
      const ward = wardById(num(payload.wardId));
      row.wardId = ward?.wardId ?? row.wardId;
      row.ward = ward ? { wardId: ward.wardId, code: ward.code, name: ward.name, wardType: ward.wardType } : row.ward;
    }
    row.updatedAt = nowIso();
    save(store);
    return envelope(row);
  }

  if (clean === '/api/referrals' && m === 'POST') return createReferral(body);
  if (clean === '/api/referrals' && m === 'GET') {
    const items = load().referrals.filter((row) => listed(query.get('status'), row.status)
      && (!query.get('kind') || row.referralKind === query.get('kind'))
      && (query.get('personId') == null || row.personId === Number(query.get('personId')))
      && hit(query.get('q'), row.referralNo, row.person?.firstName, row.person?.lastName, row.toDepartment, row.reason));
    return paged(items);
  }
  const referralAction = clean.match(/^\/api\/referrals\/(\d+)(?:\/(ack|allocate|admit|accept|request-bed))?$/);
  if (referralAction) {
    const id = Number(referralAction[1]);
    const action = referralAction[2];
    if (!action && m === 'GET') {
      const row = load().referrals.find((item) => item.referralId === id);
      return row ? envelope(row) : null;
    }
    if (action === 'ack') return patchReferral(id, 'UnderReview', { ackedAt: nowIso() });
    if (action === 'request-bed') return patchReferral(id, 'AwaitingBed');
    if (action === 'allocate') {
      const payload = asRecord(body);
      const ward = wardById(num(payload.wardId));
      const bed = BEDS.find((item) => item.bedId === num(payload.bedId)) ?? null;
      return patchReferral(id, 'BedAllocated', {
        allocatedAt: nowIso(),
        allocatedWardId: ward?.wardId ?? null,
        allocatedBedId: bed?.bedId ?? null,
        allocatedWard: ward ? { wardId: ward.wardId, code: ward.code, name: ward.name } : null,
        allocatedBed: bed ? { bedId: bed.bedId, label: bed.label, status: bed.status, wardId: bed.wardId } : null,
      });
    }
    if (action === 'admit') return patchReferral(id, 'Admitted');
    if (action === 'accept') return patchReferral(id, 'Accepted', { acceptedAt: nowIso() });
  }

  if (clean === '/api/transfers' && m === 'POST') return createTransfer(body);
  if (clean === '/api/transfers' && m === 'GET') {
    const items = load().transfers.filter((row) => listed(query.get('status'), row.status)
      && (query.get('personId') == null || row.personId === Number(query.get('personId')))
      && hit(query.get('q'), row.transferNo, row.person?.firstName, row.person?.lastName, row.destinationLabel, row.reason));
    return paged(items);
  }
  const transferAction = clean.match(/^\/api\/transfers\/(\d+)(?:\/(prepare|allocate|accept|depart|confirm-arrival|reject|cancel))?$/);
  if (transferAction) {
    const id = Number(transferAction[1]);
    const action = transferAction[2];
    if (!action && m === 'GET') {
      const row = load().transfers.find((item) => item.transferId === id);
      return row ? envelope(row) : null;
    }
    if (action === 'prepare') return patchTransfer(id, 'NursePreparing', { preparedAt: nowIso() });
    if (action === 'allocate') {
      const payload = asRecord(body);
      const ward = wardById(num(payload.wardId));
      const bed = BEDS.find((item) => item.bedId === num(payload.bedId)) ?? null;
      return patchTransfer(id, 'BedReserved', {
        toWardId: ward?.wardId ?? null,
        allocatedBedId: bed?.bedId ?? null,
        allocatedAt: nowIso(),
        toWard: ward ? { wardId: ward.wardId, code: ward.code, name: ward.name, wardType: ward.wardType } : null,
        allocatedBed: bed ? { bedId: bed.bedId, label: bed.label, status: bed.status, wardId: bed.wardId } : null,
      });
    }
    if (action === 'accept') return patchTransfer(id, 'ReceivingAccepted', { acceptedAt: nowIso() });
    if (action === 'depart') return patchTransfer(id, 'InTransit', { departedAt: nowIso(), handoverNotes: text(asRecord(body).handoverNotes) || null });
    if (action === 'confirm-arrival') return patchTransfer(id, 'Completed', { receivedAt: nowIso() });
    if (action === 'reject') return patchTransfer(id, 'Rejected', { rejectionReason: text(asRecord(body).reason) || 'Rejected' });
    if (action === 'cancel') return patchTransfer(id, 'Cancelled');
  }

  return null;
}
