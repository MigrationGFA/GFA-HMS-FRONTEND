// IPD / Admission data — admissions, beds, charges, vitals, nursing, transfers
export type AdmissionStatus =
  | 'PENDING_ADMISSION'    // doctor created request
  | 'BED_RESERVED'         // bed assigned, awaiting deposit
  | 'AWAITING_DEPOSIT'     // billing initiated
  | 'ACTIVE'               // patient in ward
  | 'DISCHARGE_REQUESTED'  // doctor marked discharge
  | 'AWAITING_FINAL_PAYMENT'
  | 'DISCHARGED'           // bed released
  | 'CANCELLED';

export type BedStatusV2 = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
export type WardType = 'General' | 'Private' | 'ICU' | 'Maternity' | 'Pediatric' | 'Isolation';

export interface BedV2 {
  id: string;
  ward: string;
  wardType: WardType;
  bedNumber: string;
  status: BedStatusV2;
  ratePerDay: number;
  patient?: string;
  admissionId?: string;
  occupiedSince?: string;
  gender?: 'Male' | 'Female';
}

export interface VitalSign {
  id: string;
  recordedAt: string;
  recordedBy: string;
  bp: string;        // e.g. "120/80"
  pulse: number;
  temp: number;      // °C
  spo2: number;      // %
  resp: number;      // rate
  notes?: string;
}

export interface NursingNote {
  id: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  nurse: string;
  timestamp: string;
  note: string;
  medsAdministered?: string[];
}

export interface DoctorRound {
  id: string;
  doctor: string;
  timestamp: string;
  assessment: string;
  plan: string;
  newOrders?: string[];
}

export interface IpdCharge {
  id: string;
  category: 'Bed' | 'Drug' | 'Lab' | 'Procedure' | 'Nursing' | 'Consumable' | 'Imaging' | 'Misc';
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  postedAt: string;
  postedBy: string;
  source?: string; // e.g. RX001, LAB003, AUTO
}

export interface Transfer {
  id: string;
  fromWard: string;
  fromBed: string;
  toWard: string;
  toBed: string;
  reason: string;
  authorizedBy: string;
  timestamp: string;
}

export interface AdmissionV2 {
  id: string;                 // ADM-2026-00x
  patientName: string;
  hospitalId: string;
  age: number;
  gender: 'Male' | 'Female';
  diagnosis: string;
  admittingDoctor: string;
  wardRequired: WardType;
  ward?: string;
  bedNumber?: string;
  status: AdmissionStatus;
  admittedOn?: string;
  expectedDischarge?: string;
  daysAdmitted: number;
  depositRequired: number;
  depositPaid: number;
  runningBill: number;
  paid: number;
  balance: number;
  isEmergency: boolean;
  paymentBlocked?: boolean;
  emrSync: 'SYNCED' | 'PENDING' | 'FAILED';
  vitals: VitalSign[];
  nursingNotes: NursingNote[];
  rounds: DoctorRound[];
  charges: IpdCharge[];
  transfers: Transfer[];
  allergies?: string;
  insurance?: 'NHIS' | 'HMO' | 'Private' | 'None';
}

// ---------- Beds (rich grid) ----------
export const ipdBeds: BedV2[] = [
  // Ward A – Male Surgical
  { id: 'B-A01', ward: 'Ward A — Male Surgical', wardType: 'General', bedNumber: 'A-01', status: 'OCCUPIED', ratePerDay: 8000, patient: 'John Doe', admissionId: 'ADM-2026-001', occupiedSince: '2026-04-26', gender: 'Male' },
  { id: 'B-A02', ward: 'Ward A — Male Surgical', wardType: 'General', bedNumber: 'A-02', status: 'AVAILABLE', ratePerDay: 8000 },
  { id: 'B-A03', ward: 'Ward A — Male Surgical', wardType: 'Private', bedNumber: 'A-03', status: 'OCCUPIED', ratePerDay: 25000, patient: 'Ibrahim Musa', admissionId: 'ADM-2026-002', occupiedSince: '2026-04-25', gender: 'Male' },
  { id: 'B-A04', ward: 'Ward A — Male Surgical', wardType: 'General', bedNumber: 'A-04', status: 'CLEANING', ratePerDay: 8000 },
  { id: 'B-A05', ward: 'Ward A — Male Surgical', wardType: 'General', bedNumber: 'A-05', status: 'RESERVED', ratePerDay: 8000, patient: 'Kunle Ajayi', admissionId: 'ADM-2026-006', gender: 'Male' },
  // Ward B – Female Medical
  { id: 'B-B01', ward: 'Ward B — Female Medical', wardType: 'General', bedNumber: 'B-01', status: 'OCCUPIED', ratePerDay: 8000, patient: 'Halima Abdullahi', admissionId: 'ADM-2026-003', occupiedSince: '2026-04-27', gender: 'Female' },
  { id: 'B-B02', ward: 'Ward B — Female Medical', wardType: 'General', bedNumber: 'B-02', status: 'MAINTENANCE', ratePerDay: 8000 },
  { id: 'B-B03', ward: 'Ward B — Female Medical', wardType: 'General', bedNumber: 'B-03', status: 'AVAILABLE', ratePerDay: 8000 },
  { id: 'B-B04', ward: 'Ward B — Female Medical', wardType: 'Private', bedNumber: 'B-04', status: 'AVAILABLE', ratePerDay: 25000 },
  // Maternity
  { id: 'B-C01', ward: 'Ward C — Maternity', wardType: 'Maternity', bedNumber: 'C-01', status: 'OCCUPIED', ratePerDay: 15000, patient: 'Funke Adeyemi', admissionId: 'ADM-2026-004', occupiedSince: '2026-04-27', gender: 'Female' },
  { id: 'B-C02', ward: 'Ward C — Maternity', wardType: 'Maternity', bedNumber: 'C-02', status: 'RESERVED', ratePerDay: 15000, patient: 'Ngozi Okoro', admissionId: 'ADM-2026-007', gender: 'Female' },
  { id: 'B-C03', ward: 'Ward C — Maternity', wardType: 'Maternity', bedNumber: 'C-03', status: 'AVAILABLE', ratePerDay: 15000 },
  // ICU
  { id: 'B-ICU01', ward: 'ICU', wardType: 'ICU', bedNumber: 'ICU-01', status: 'OCCUPIED', ratePerDay: 75000, patient: 'Adebayo Ogundimu', admissionId: 'ADM-2026-005', occupiedSince: '2026-04-25', gender: 'Male' },
  { id: 'B-ICU02', ward: 'ICU', wardType: 'ICU', bedNumber: 'ICU-02', status: 'AVAILABLE', ratePerDay: 75000 },
  { id: 'B-ICU03', ward: 'ICU', wardType: 'ICU', bedNumber: 'ICU-03', status: 'CLEANING', ratePerDay: 75000 },
  // Pediatric
  { id: 'B-P01', ward: 'Pediatric Ward', wardType: 'Pediatric', bedNumber: 'P-01', status: 'AVAILABLE', ratePerDay: 10000 },
  { id: 'B-P02', ward: 'Pediatric Ward', wardType: 'Pediatric', bedNumber: 'P-02', status: 'OCCUPIED', ratePerDay: 10000, patient: 'Tobi Adesanya (Child)', admissionId: 'ADM-2026-008', occupiedSince: '2026-04-26', gender: 'Male' },
  // Isolation
  { id: 'B-IS01', ward: 'Isolation Unit', wardType: 'Isolation', bedNumber: 'IS-01', status: 'AVAILABLE', ratePerDay: 30000 },
  { id: 'B-IS02', ward: 'Isolation Unit', wardType: 'Isolation', bedNumber: 'IS-02', status: 'AVAILABLE', ratePerDay: 30000 },
];

// ---------- Admissions ----------
const today = '2026-04-28';

export const ipdAdmissions: AdmissionV2[] = [
  {
    id: 'ADM-2026-001', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', age: 42, gender: 'Male',
    diagnosis: 'Post-op observation (Appendectomy)', admittingDoctor: 'Dr. Adewale', wardRequired: 'General',
    ward: 'Ward A — Male Surgical', bedNumber: 'A-01', status: 'ACTIVE',
    admittedOn: '2026-04-26', expectedDischarge: '2026-04-29', daysAdmitted: 2,
    depositRequired: 50000, depositPaid: 50000, runningBill: 84500, paid: 50000, balance: 34500,
    isEmergency: false, emrSync: 'SYNCED', allergies: 'Penicillin', insurance: 'NHIS',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'Nurse Blessing', bp: '128/82', pulse: 84, temp: 36.9, spo2: 98, resp: 18 },
      { id: 'V2', recordedAt: '2026-04-27 22:00', recordedBy: 'Nurse Tunde', bp: '124/80', pulse: 82, temp: 37.0, spo2: 99, resp: 17 },
      { id: 'V3', recordedAt: '2026-04-27 14:00', recordedBy: 'Nurse Blessing', bp: '130/85', pulse: 88, temp: 37.2, spo2: 97, resp: 19 },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'Nurse Blessing', timestamp: '2026-04-28 07:00', note: 'Patient stable, wound clean, dressing changed.', medsAdministered: ['Paracetamol 1g IV', 'Ceftriaxone 1g IV'] },
      { id: 'N2', shift: 'Night', nurse: 'Nurse Tunde', timestamp: '2026-04-28 02:00', note: 'Slept well, no complaints of pain.', medsAdministered: ['Tramadol 50mg PO'] },
    ],
    rounds: [
      { id: 'R1', doctor: 'Dr. Adewale', timestamp: '2026-04-28 08:30', assessment: 'Recovering well, bowel sounds returning.', plan: 'Continue IV antibiotics. Plan oral feeds today.', newOrders: ['Start sips of water', 'Repeat FBC tomorrow'] },
    ],
    charges: [
      { id: 'C1', category: 'Bed', description: 'General bed (Ward A) × 2 days', qty: 2, unitPrice: 8000, amount: 16000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO', source: 'AUTO-DAILY' },
      { id: 'C2', category: 'Drug', description: 'Ceftriaxone 1g IV × 4 doses', qty: 4, unitPrice: 4500, amount: 18000, postedAt: '2026-04-27 14:00', postedBy: 'Pharm. Yetunde', source: 'RX-IPD-001' },
      { id: 'C3', category: 'Lab', description: 'Full Blood Count', qty: 1, unitPrice: 6500, amount: 6500, postedAt: '2026-04-27 09:00', postedBy: 'Lab', source: 'LAB-IPD-001' },
      { id: 'C4', category: 'Procedure', description: 'Wound dressing × 4', qty: 4, unitPrice: 3500, amount: 14000, postedAt: '2026-04-28 07:00', postedBy: 'Nurse Blessing' },
      { id: 'C5', category: 'Nursing', description: 'Nursing care fee × 2 days', qty: 2, unitPrice: 5000, amount: 10000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C6', category: 'Consumable', description: 'IV cannula, gauze, syringes', qty: 1, unitPrice: 4000, amount: 4000, postedAt: '2026-04-26 14:00', postedBy: 'Ward Stock' },
      { id: 'C7', category: 'Drug', description: 'Tramadol 50mg × 6', qty: 6, unitPrice: 1000, amount: 6000, postedAt: '2026-04-27 22:00', postedBy: 'Pharm. Yetunde', source: 'RX-IPD-002' },
      { id: 'C8', category: 'Misc', description: 'Admission registration fee', qty: 1, unitPrice: 10000, amount: 10000, postedAt: '2026-04-26 13:00', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
  {
    id: 'ADM-2026-002', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', age: 56, gender: 'Male',
    diagnosis: 'Hypertensive emergency', admittingDoctor: 'Dr. Adewale', wardRequired: 'Private',
    ward: 'Ward A — Male Surgical', bedNumber: 'A-03', status: 'ACTIVE',
    admittedOn: '2026-04-25', expectedDischarge: '2026-04-30', daysAdmitted: 3,
    depositRequired: 100000, depositPaid: 100000, runningBill: 142000, paid: 100000, balance: 42000,
    isEmergency: true, emrSync: 'PENDING', allergies: 'None', insurance: 'Private',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'Nurse Blessing', bp: '152/98', pulse: 92, temp: 36.7, spo2: 96, resp: 20, notes: 'Still elevated' },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'Nurse Blessing', timestamp: '2026-04-28 07:30', note: 'BP still high. Notified doctor.', medsAdministered: ['Amlodipine 10mg', 'Lisinopril 20mg'] },
    ],
    rounds: [
      { id: 'R1', doctor: 'Dr. Adewale', timestamp: '2026-04-28 09:00', assessment: 'Suboptimal BP control.', plan: 'Add Hydrochlorothiazide 25mg daily. Repeat U&E.', newOrders: ['HCTZ 25mg PO daily', 'U&E repeat'] },
    ],
    charges: [
      { id: 'C1', category: 'Bed', description: 'Private bed (Ward A) × 3 days', qty: 3, unitPrice: 25000, amount: 75000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C2', category: 'Drug', description: 'Amlodipine + Lisinopril', qty: 6, unitPrice: 2500, amount: 15000, postedAt: '2026-04-28 07:30', postedBy: 'Pharm. Yetunde' },
      { id: 'C3', category: 'Lab', description: 'U&E, ECG', qty: 2, unitPrice: 12000, amount: 24000, postedAt: '2026-04-26 10:00', postedBy: 'Lab' },
      { id: 'C4', category: 'Nursing', description: 'Intensive monitoring × 3 days', qty: 3, unitPrice: 8000, amount: 24000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C5', category: 'Misc', description: 'Admission registration', qty: 1, unitPrice: 4000, amount: 4000, postedAt: '2026-04-25 11:00', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
  {
    id: 'ADM-2026-003', patientName: 'Halima Abdullahi', hospitalId: 'GFA HMS/2026/00152', age: 38, gender: 'Female',
    diagnosis: 'Severe malaria with anaemia', admittingDoctor: 'Dr. Ikedife', wardRequired: 'General',
    ward: 'Ward B — Female Medical', bedNumber: 'B-01', status: 'ACTIVE',
    admittedOn: '2026-04-27', expectedDischarge: '2026-04-30', daysAdmitted: 1,
    depositRequired: 40000, depositPaid: 20000, runningBill: 38500, paid: 20000, balance: 18500,
    isEmergency: false, paymentBlocked: true, emrSync: 'SYNCED', allergies: 'Iodine', insurance: 'NHIS',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'Nurse Adaeze', bp: '108/68', pulse: 102, temp: 38.4, spo2: 95, resp: 22, notes: 'Pyrexial' },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'Nurse Adaeze', timestamp: '2026-04-28 07:00', note: 'Tepid sponging done. Antimalarial commenced.', medsAdministered: ['IV Artesunate 120mg'] },
    ],
    rounds: [],
    charges: [
      { id: 'C1', category: 'Bed', description: 'General bed × 1 day', qty: 1, unitPrice: 8000, amount: 8000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C2', category: 'Drug', description: 'IV Artesunate × 2 doses', qty: 2, unitPrice: 8500, amount: 17000, postedAt: '2026-04-27 18:00', postedBy: 'Pharm. Yetunde' },
      { id: 'C3', category: 'Lab', description: 'MP, FBC', qty: 2, unitPrice: 4500, amount: 9000, postedAt: '2026-04-27 14:00', postedBy: 'Lab' },
      { id: 'C4', category: 'Misc', description: 'Admission fee', qty: 1, unitPrice: 4500, amount: 4500, postedAt: '2026-04-27 13:00', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
  {
    id: 'ADM-2026-004', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', age: 31, gender: 'Female',
    diagnosis: 'Antenatal admission (PIH)', admittingDoctor: 'Dr. Balogun', wardRequired: 'Maternity',
    ward: 'Ward C — Maternity', bedNumber: 'C-01', status: 'ACTIVE',
    admittedOn: '2026-04-27', expectedDischarge: '2026-04-29', daysAdmitted: 1,
    depositRequired: 60000, depositPaid: 60000, runningBill: 28000, paid: 60000, balance: -32000,
    isEmergency: false, emrSync: 'SYNCED', allergies: 'Aspirin', insurance: 'NHIS',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'Nurse Funmi', bp: '142/92', pulse: 88, temp: 36.8, spo2: 98, resp: 18 },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'Nurse Funmi', timestamp: '2026-04-28 07:30', note: 'Foetal heart rate 142 bpm, regular.', medsAdministered: ['Methyldopa 500mg'] },
    ],
    rounds: [],
    charges: [
      { id: 'C1', category: 'Bed', description: 'Maternity bed × 1 day', qty: 1, unitPrice: 15000, amount: 15000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C2', category: 'Drug', description: 'Methyldopa', qty: 4, unitPrice: 750, amount: 3000, postedAt: '2026-04-28 07:30', postedBy: 'Pharm. Yetunde' },
      { id: 'C3', category: 'Misc', description: 'Admission fee', qty: 1, unitPrice: 10000, amount: 10000, postedAt: '2026-04-27 09:00', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
  {
    id: 'ADM-2026-005', patientName: 'Adebayo Ogundimu', hospitalId: 'GFA HMS/2026/00153', age: 49, gender: 'Male',
    diagnosis: 'Post-op major surgery — ICU monitoring', admittingDoctor: 'Dr. Adewale', wardRequired: 'ICU',
    ward: 'ICU', bedNumber: 'ICU-01', status: 'ACTIVE',
    admittedOn: '2026-04-25', expectedDischarge: '2026-05-01', daysAdmitted: 3,
    depositRequired: 300000, depositPaid: 300000, runningBill: 412000, paid: 300000, balance: 112000,
    isEmergency: true, emrSync: 'FAILED', allergies: 'None', insurance: 'Private',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'ICU Nurse Kemi', bp: '118/74', pulse: 96, temp: 37.1, spo2: 97, resp: 18, notes: 'On ventilator support' },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'ICU Nurse Kemi', timestamp: '2026-04-28 06:30', note: 'Sedated, ventilated. Hourly vitals.', medsAdministered: ['Propofol infusion', 'Noradrenaline'] },
    ],
    rounds: [
      { id: 'R1', doctor: 'Dr. Adewale', timestamp: '2026-04-28 08:00', assessment: 'Slow but steady recovery.', plan: 'Continue ventilation. Wean sedation tomorrow.', newOrders: [] },
    ],
    charges: [
      { id: 'C1', category: 'Bed', description: 'ICU bed × 3 days', qty: 3, unitPrice: 75000, amount: 225000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C2', category: 'Procedure', description: 'Mechanical ventilation × 3 days', qty: 3, unitPrice: 35000, amount: 105000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C3', category: 'Drug', description: 'Sedatives + vasopressors', qty: 1, unitPrice: 42000, amount: 42000, postedAt: '2026-04-27 12:00', postedBy: 'Pharm. Yetunde' },
      { id: 'C4', category: 'Lab', description: 'ABG × 6, U&E × 3', qty: 9, unitPrice: 4000, amount: 36000, postedAt: '2026-04-27 18:00', postedBy: 'Lab' },
      { id: 'C5', category: 'Misc', description: 'Admission fee', qty: 1, unitPrice: 4000, amount: 4000, postedAt: '2026-04-25 10:00', postedBy: 'Cashier' },
    ],
    transfers: [
      { id: 'T1', fromWard: 'Theatre', fromBed: 'OR-2', toWard: 'ICU', toBed: 'ICU-01', reason: 'Post-op intensive monitoring', authorizedBy: 'Dr. Adewale', timestamp: '2026-04-25 14:30' },
    ],
  },
  // Pending / new requests
  {
    id: 'ADM-2026-006', patientName: 'Kunle Ajayi', hospitalId: 'GFA HMS/2026/00161', age: 34, gender: 'Male',
    diagnosis: 'Acute appendicitis — for surgery', admittingDoctor: 'Dr. Adewale', wardRequired: 'General',
    ward: 'Ward A — Male Surgical', bedNumber: 'A-05', status: 'AWAITING_DEPOSIT',
    daysAdmitted: 0, depositRequired: 80000, depositPaid: 0, runningBill: 0, paid: 0, balance: 0,
    isEmergency: false, emrSync: 'PENDING', insurance: 'HMO',
    vitals: [], nursingNotes: [], rounds: [], charges: [], transfers: [],
  },
  {
    id: 'ADM-2026-007', patientName: 'Ngozi Okoro', hospitalId: 'GFA HMS/2026/00150', age: 47, gender: 'Female',
    diagnosis: 'Scheduled C-section', admittingDoctor: 'Dr. Balogun', wardRequired: 'Maternity',
    ward: 'Ward C — Maternity', bedNumber: 'C-02', status: 'BED_RESERVED',
    daysAdmitted: 0, depositRequired: 150000, depositPaid: 0, runningBill: 0, paid: 0, balance: 0,
    isEmergency: false, emrSync: 'PENDING', insurance: 'NHIS',
    vitals: [], nursingNotes: [], rounds: [], charges: [], transfers: [],
  },
  {
    id: 'ADM-2026-008', patientName: 'Tobi Adesanya (Child)', hospitalId: 'GFA HMS/2026/00162', age: 6, gender: 'Male',
    diagnosis: 'Severe pneumonia', admittingDoctor: 'Dr. Ikedife', wardRequired: 'Pediatric',
    ward: 'Pediatric Ward', bedNumber: 'P-02', status: 'ACTIVE',
    admittedOn: '2026-04-26', expectedDischarge: '2026-04-30', daysAdmitted: 2,
    depositRequired: 30000, depositPaid: 30000, runningBill: 47000, paid: 30000, balance: 17000,
    isEmergency: false, emrSync: 'SYNCED', insurance: 'NHIS',
    vitals: [
      { id: 'V1', recordedAt: '2026-04-28 06:00', recordedBy: 'Nurse Adaeze', bp: '95/60', pulse: 118, temp: 38.1, spo2: 94, resp: 28 },
    ],
    nursingNotes: [
      { id: 'N1', shift: 'Morning', nurse: 'Nurse Adaeze', timestamp: '2026-04-28 07:00', note: 'Mother present, patient feeding well.', medsAdministered: ['IV Ceftriaxone 500mg'] },
    ],
    rounds: [],
    charges: [
      { id: 'C1', category: 'Bed', description: 'Paediatric bed × 2 days', qty: 2, unitPrice: 10000, amount: 20000, postedAt: '2026-04-28 00:01', postedBy: 'AUTO' },
      { id: 'C2', category: 'Drug', description: 'IV Ceftriaxone × 4', qty: 4, unitPrice: 3000, amount: 12000, postedAt: '2026-04-27 18:00', postedBy: 'Pharm. Yetunde' },
      { id: 'C3', category: 'Lab', description: 'FBC, CXR', qty: 2, unitPrice: 6000, amount: 12000, postedAt: '2026-04-26 16:00', postedBy: 'Lab' },
      { id: 'C4', category: 'Misc', description: 'Admission fee', qty: 1, unitPrice: 3000, amount: 3000, postedAt: '2026-04-26 14:00', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
  {
    id: 'ADM-2026-009', patientName: 'Patience Adeniyi', hospitalId: 'GFA HMS/2026/00120', age: 29, gender: 'Female',
    diagnosis: 'Normal delivery — recovered', admittingDoctor: 'Dr. Balogun', wardRequired: 'Maternity',
    ward: 'Ward C — Maternity', bedNumber: 'C-03', status: 'DISCHARGE_REQUESTED',
    admittedOn: '2026-04-23', expectedDischarge: '2026-04-28', daysAdmitted: 5,
    depositRequired: 80000, depositPaid: 80000, runningBill: 240000, paid: 200000, balance: 40000,
    isEmergency: false, emrSync: 'PENDING', insurance: 'NHIS',
    vitals: [], nursingNotes: [], rounds: [],
    charges: [
      { id: 'C1', category: 'Bed', description: 'Maternity bed × 5 days', qty: 5, unitPrice: 15000, amount: 75000, postedAt: today, postedBy: 'AUTO' },
      { id: 'C2', category: 'Procedure', description: 'Delivery + post-natal care', qty: 1, unitPrice: 120000, amount: 120000, postedAt: '2026-04-23', postedBy: 'Theatre' },
      { id: 'C3', category: 'Drug', description: 'Post-natal medications', qty: 1, unitPrice: 25000, amount: 25000, postedAt: '2026-04-25', postedBy: 'Pharmacy' },
      { id: 'C4', category: 'Misc', description: 'Admission fee', qty: 1, unitPrice: 20000, amount: 20000, postedAt: '2026-04-23', postedBy: 'Cashier' },
    ],
    transfers: [],
  },
];

// ---------- Long-stay flagged accounts ----------
export interface LongStayFlag {
  admissionId: string;
  patientName: string;
  daysAdmitted: number;
  outstandingBalance: number;
  lastPaymentDate: string;
  alertLevel: 'WATCH' | 'WARNING' | 'CRITICAL';
}

export const longStayFlags: LongStayFlag[] = [
  { admissionId: 'ADM-2026-005', patientName: 'Adebayo Ogundimu', daysAdmitted: 3, outstandingBalance: 112000, lastPaymentDate: '2026-04-25', alertLevel: 'WARNING' },
  { admissionId: 'ADM-2026-002', patientName: 'Ibrahim Musa', daysAdmitted: 3, outstandingBalance: 42000, lastPaymentDate: '2026-04-25', alertLevel: 'WATCH' },
  { admissionId: 'ADM-2026-003', patientName: 'Halima Abdullahi', daysAdmitted: 1, outstandingBalance: 18500, lastPaymentDate: '2026-04-27', alertLevel: 'CRITICAL' },
];

// ---------- Sync queue ----------
export interface IpdSyncEntry {
  id: string;
  admissionId: string;
  payload: 'Admission Record' | 'Daily Vitals' | 'Doctor Round' | 'Discharge Summary' | 'Charges Update';
  status: 'SYNCED' | 'PENDING' | 'RETRYING' | 'FAILED';
  attempts: number;
  lastTry: string;
  message: string;
}

export const ipdSyncQueue: IpdSyncEntry[] = [
  { id: 'IS-001', admissionId: 'ADM-2026-001', payload: 'Admission Record', status: 'SYNCED', attempts: 1, lastTry: '2026-04-26 13:10', message: 'OK' },
  { id: 'IS-002', admissionId: 'ADM-2026-001', payload: 'Doctor Round', status: 'SYNCED', attempts: 1, lastTry: '2026-04-28 08:35', message: 'OK' },
  { id: 'IS-003', admissionId: 'ADM-2026-002', payload: 'Daily Vitals', status: 'PENDING', attempts: 0, lastTry: '—', message: 'Queued for next sync window' },
  { id: 'IS-004', admissionId: 'ADM-2026-005', payload: 'Charges Update', status: 'FAILED', attempts: 3, lastTry: '2026-04-28 07:00', message: 'EMR endpoint timeout (504)' },
  { id: 'IS-005', admissionId: 'ADM-2026-009', payload: 'Discharge Summary', status: 'RETRYING', attempts: 2, lastTry: '2026-04-28 09:10', message: 'Retrying in 60s' },
  { id: 'IS-006', admissionId: 'ADM-2026-007', payload: 'Admission Record', status: 'PENDING', attempts: 0, lastTry: '—', message: 'Awaiting deposit confirmation' },
];

export const formatNGN = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });
