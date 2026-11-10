// ============================================================
// LAB MODULE — Comprehensive data model
// Lab catalog, requests, samples, results, verification, audit
// ============================================================

export interface LabTestCatalog {
  code: string;
  name: string;
  category: 'Haematology' | 'Chemistry' | 'Microbiology' | 'Histology' | 'Radiology' | 'Serology';
  price: number;
  tat: string; // turn-around time
  specimen: string;
  refRange?: string;
}

export const labCatalog: LabTestCatalog[] = [
  { code: 'FBC',  name: 'Full Blood Count',         category: 'Haematology',  price: 4500,  tat: '2 hrs',  specimen: 'EDTA Blood', refRange: 'Hb 12–16 g/dL' },
  { code: 'MP',   name: 'Malaria Parasite (BF)',    category: 'Microbiology', price: 2500,  tat: '1 hr',   specimen: 'Blood Smear' },
  { code: 'URI',  name: 'Urinalysis',                category: 'Chemistry',    price: 1800,  tat: '1 hr',   specimen: 'Urine' },
  { code: 'LFT',  name: 'Liver Function Test',       category: 'Chemistry',    price: 8500,  tat: '4 hrs',  specimen: 'Serum' },
  { code: 'EUC',  name: 'Electrolytes / Urea / Cr',  category: 'Chemistry',    price: 7500,  tat: '3 hrs',  specimen: 'Serum' },
  { code: 'HBA',  name: 'HbA1c',                     category: 'Chemistry',    price: 6500,  tat: '4 hrs',  specimen: 'EDTA Blood', refRange: '<5.7%' },
  { code: 'PT',   name: 'Pregnancy Test (β-hCG)',    category: 'Chemistry',    price: 2000,  tat: '30 min', specimen: 'Urine' },
  { code: 'UC',   name: 'Urine Culture & Sensitivity', category: 'Microbiology', price: 6500, tat: '48 hrs', specimen: 'Mid-stream Urine' },
  { code: 'XRC',  name: 'Chest X-Ray',               category: 'Radiology',    price: 9500,  tat: '1 hr',   specimen: 'Imaging' },
  { code: 'HIV',  name: 'HIV Screening',             category: 'Serology',     price: 3500,  tat: '1 hr',   specimen: 'Serum' },
  { code: 'HEP',  name: 'Hepatitis B Surface Ag',    category: 'Serology',     price: 4000,  tat: '2 hrs',  specimen: 'Serum' },
];

export type LabStatus =
  | 'REQUESTED'         // doctor created
  | 'AWAITING PAYMENT'  // billing not cleared
  | 'PAID'              // billing cleared, ready for sample
  | 'EMERGENCY'         // emergency override
  | 'SAMPLE COLLECTED'
  | 'PROCESSING'
  | 'COMPLETED'         // tech entered result
  | 'VERIFIED'          // supervisor signed
  | 'RELEASED'          // doctor can see
  | 'PENDING SYNC'      // EMR offline
  | 'SYNCED'
  | 'CANCELLED';

export type LabPriority = 'Routine' | 'Urgent' | 'Stat';

export interface LabResultLine {
  parameter: string;
  value: string;
  unit?: string;
  range?: string;
  flag?: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface LabAuditEvent {
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface LabRequestFull {
  id: string;            // LAB-2026-XXX
  visitId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  testCode: string;
  testName: string;
  category: LabTestCatalog['category'];
  price: number;
  priority: LabPriority;
  requestedBy: string;   // doctor
  requestedAt: string;
  status: LabStatus;
  paymentStatus: 'PAID' | 'UNPAID' | 'EMERGENCY' | 'WAIVED';
  invoiceId?: string;
  sampleId?: string;
  collectedBy?: string;
  collectedAt?: string;
  processedBy?: string;
  processingDevice?: string;
  results?: LabResultLine[];
  remarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  releasedAt?: string;
  emrSync: 'PENDING' | 'SYNCED' | 'FAILED';
  audit: LabAuditEvent[];
}

export const labRequestsFull: LabRequestFull[] = [
  {
    id: 'LAB-2026-001', visitId: 'VIS-2026-0451', patientId: 'GFA HMS/2026/00145', patientName: 'John Doe', age: 42, gender: 'Male',
    testCode: 'MP', testName: 'Malaria Parasite (BF)', category: 'Microbiology', price: 2500, priority: 'Urgent',
    requestedBy: 'Dr. Okafor', requestedAt: '2026-04-28 09:12', status: 'RELEASED', paymentStatus: 'PAID', invoiceId: 'INV-22041',
    sampleId: 'SMP-2401', collectedBy: 'Tech. Bola', collectedAt: '2026-04-28 09:25', processedBy: 'Tech. Bola', processingDevice: 'Microscope-3',
    results: [{ parameter: 'Plasmodium falciparum', value: 'Positive (++)', flag: 'High' }],
    remarks: 'Heavy parasitaemia — initiate antimalarial.',
    verifiedBy: 'Sci. Adebanjo', verifiedAt: '2026-04-28 10:02', releasedAt: '2026-04-28 10:03',
    emrSync: 'SYNCED',
    audit: [
      { at: '09:12', actor: 'Dr. Okafor', action: 'Created request' },
      { at: '09:14', actor: 'System',     action: 'Invoice INV-22041 generated' },
      { at: '09:18', actor: 'Cashier Kemi', action: 'Payment confirmed (POS)' },
      { at: '09:25', actor: 'Tech. Bola',  action: 'Sample collected', note: 'SMP-2401' },
      { at: '09:48', actor: 'Tech. Bola',  action: 'Result entered' },
      { at: '10:02', actor: 'Sci. Adebanjo', action: 'Verified & signed' },
      { at: '10:03', actor: 'System',     action: 'Released to doctor' },
      { at: '10:04', actor: 'System',     action: 'Synced to EMR' },
    ],
  },
  {
    id: 'LAB-2026-002', visitId: 'VIS-2026-0452', patientId: 'GFA HMS/2026/00146', patientName: 'Amina Yusuf', age: 28, gender: 'Female',
    testCode: 'FBC', testName: 'Full Blood Count', category: 'Haematology', price: 4500, priority: 'Routine',
    requestedBy: 'Dr. Okafor', requestedAt: '2026-04-28 09:34', status: 'PROCESSING', paymentStatus: 'PAID', invoiceId: 'INV-22042',
    sampleId: 'SMP-2402', collectedBy: 'Tech. Sade', collectedAt: '2026-04-28 09:50', processedBy: 'Tech. Sade', processingDevice: 'Sysmex XN-330',
    emrSync: 'PENDING',
    audit: [
      { at: '09:34', actor: 'Dr. Okafor', action: 'Created request' },
      { at: '09:35', actor: 'System',     action: 'Invoice generated & paid (NHIS)' },
      { at: '09:50', actor: 'Tech. Sade', action: 'Sample collected', note: 'SMP-2402' },
      { at: '10:05', actor: 'Tech. Sade', action: 'Loaded on Sysmex XN-330' },
    ],
  },
  {
    id: 'LAB-2026-003', visitId: 'VIS-2026-0453', patientId: 'GFA HMS/2026/00147', patientName: 'Chidi Eze', age: 35, gender: 'Male',
    testCode: 'LFT', testName: 'Liver Function Test', category: 'Chemistry', price: 8500, priority: 'Routine',
    requestedBy: 'Dr. Ikedife', requestedAt: '2026-04-28 10:02', status: 'AWAITING PAYMENT', paymentStatus: 'UNPAID', invoiceId: 'INV-22043',
    emrSync: 'PENDING',
    audit: [
      { at: '10:02', actor: 'Dr. Ikedife', action: 'Created request' },
      { at: '10:02', actor: 'System',     action: 'Invoice INV-22043 generated — awaiting payment' },
    ],
  },
  {
    id: 'LAB-2026-004', visitId: 'VIS-2026-0454', patientId: 'GFA HMS/2026/00148', patientName: 'Funke Adeyemi', age: 31, gender: 'Female',
    testCode: 'PT', testName: 'Pregnancy Test (β-hCG)', category: 'Chemistry', price: 2000, priority: 'Stat',
    requestedBy: 'Dr. Balogun', requestedAt: '2026-04-28 08:45', status: 'VERIFIED', paymentStatus: 'PAID', invoiceId: 'INV-22044',
    sampleId: 'SMP-2404', collectedBy: 'Tech. Femi', collectedAt: '2026-04-28 08:52', processedBy: 'Tech. Femi',
    results: [{ parameter: 'β-hCG', value: 'Positive', flag: 'Normal' }],
    remarks: 'Pregnancy confirmed. Refer to ANC.',
    verifiedBy: 'Sci. Adebanjo', verifiedAt: '2026-04-28 09:12',
    emrSync: 'PENDING',
    audit: [
      { at: '08:45', actor: 'Dr. Balogun', action: 'Created STAT request' },
      { at: '08:46', actor: 'Cashier Kemi', action: 'Payment confirmed' },
      { at: '08:52', actor: 'Tech. Femi',  action: 'Sample collected' },
      { at: '09:05', actor: 'Tech. Femi',  action: 'Result entered' },
      { at: '09:12', actor: 'Sci. Adebanjo', action: 'Verified & signed' },
    ],
  },
  {
    id: 'LAB-2026-005', visitId: 'VIS-2026-0455', patientId: 'GFA HMS/2026/00149', patientName: 'Ibrahim Musa', age: 56, gender: 'Male',
    testCode: 'UC', testName: 'Urine Culture & Sensitivity', category: 'Microbiology', price: 6500, priority: 'Stat',
    requestedBy: 'Dr. Adewale', requestedAt: '2026-04-28 11:18', status: 'EMERGENCY', paymentStatus: 'EMERGENCY', invoiceId: 'INV-22045',
    emrSync: 'PENDING',
    audit: [
      { at: '11:18', actor: 'Dr. Adewale', action: 'Created STAT request' },
      { at: '11:19', actor: 'Dr. Adewale', action: 'Emergency override approved', note: 'Suspected urosepsis' },
    ],
  },
  {
    id: 'LAB-2026-006', visitId: 'VIS-2026-0456', patientId: 'GFA HMS/2026/00151', patientName: 'Tunde Bakare', age: 24, gender: 'Male',
    testCode: 'HBA', testName: 'HbA1c', category: 'Chemistry', price: 6500, priority: 'Routine',
    requestedBy: 'Dr. Ikedife', requestedAt: '2026-04-27 14:22', status: 'COMPLETED', paymentStatus: 'PAID', invoiceId: 'INV-22046',
    sampleId: 'SMP-2405', collectedBy: 'Tech. Bola', collectedAt: '2026-04-27 14:40', processedBy: 'Tech. Bola', processingDevice: 'Cobas c311',
    results: [{ parameter: 'HbA1c', value: '7.8', unit: '%', range: '<5.7', flag: 'High' }],
    remarks: 'Sub-optimal glycaemic control.',
    emrSync: 'PENDING',
    audit: [
      { at: '14:22', actor: 'Dr. Ikedife', action: 'Created request' },
      { at: '14:25', actor: 'Cashier Kemi', action: 'Payment confirmed' },
      { at: '14:40', actor: 'Tech. Bola',   action: 'Sample collected' },
      { at: '15:30', actor: 'Tech. Bola',   action: 'Result entered — awaiting verify' },
    ],
  },
  {
    id: 'LAB-2026-007', visitId: 'VIS-2026-0457', patientId: 'GFA HMS/2026/00152', patientName: 'Halima Abdullahi', age: 38, gender: 'Female',
    testCode: 'HIV', testName: 'HIV Screening', category: 'Serology', price: 3500, priority: 'Routine',
    requestedBy: 'Dr. Balogun', requestedAt: '2026-04-28 11:40', status: 'PAID', paymentStatus: 'PAID', invoiceId: 'INV-22047',
    emrSync: 'PENDING',
    audit: [
      { at: '11:40', actor: 'Dr. Balogun', action: 'Created request' },
      { at: '11:42', actor: 'Cashier Kemi', action: 'Payment confirmed (SMS link)' },
    ],
  },
  {
    id: 'LAB-2026-008', visitId: 'VIS-2026-0458', patientId: 'GFA HMS/2026/00150', patientName: 'Ngozi Okoro', age: 47, gender: 'Female',
    testCode: 'XRC', testName: 'Chest X-Ray', category: 'Radiology', price: 9500, priority: 'Urgent',
    requestedBy: 'Dr. Okafor', requestedAt: '2026-04-28 10:50', status: 'SAMPLE COLLECTED', paymentStatus: 'PAID', invoiceId: 'INV-22048',
    sampleId: 'IMG-1102', collectedBy: 'Radiog. Yakubu', collectedAt: '2026-04-28 11:15',
    emrSync: 'PENDING',
    audit: [
      { at: '10:50', actor: 'Dr. Okafor',     action: 'Created request' },
      { at: '10:52', actor: 'Cashier Kemi',   action: 'Payment confirmed' },
      { at: '11:15', actor: 'Radiog. Yakubu', action: 'Imaging captured' },
    ],
  },
];

export const labDevices = [
  { id: 'DEV-01', name: 'Sysmex XN-330',  type: 'Haematology Analyzer', status: 'Online' },
  { id: 'DEV-02', name: 'Cobas c311',     type: 'Chemistry Analyzer',   status: 'Online' },
  { id: 'DEV-03', name: 'Microscope-3',   type: 'Microscopy',           status: 'Online' },
  { id: 'DEV-04', name: 'X-Ray DR-Suite', type: 'Radiology',            status: 'Online' },
  { id: 'DEV-05', name: 'BACTEC 9120',    type: 'Culture',              status: 'Maintenance' },
];

export const labStaff = [
  { id: 'LS-01', name: 'Tech. Bola',       role: 'Lab Technician'  },
  { id: 'LS-02', name: 'Tech. Sade',       role: 'Lab Technician'  },
  { id: 'LS-03', name: 'Tech. Femi',       role: 'Lab Technician'  },
  { id: 'LS-04', name: 'Sci. Adebanjo',    role: 'Senior Scientist' },
  { id: 'LS-05', name: 'Sci. Olamide',     role: 'Senior Scientist' },
  { id: 'LS-06', name: 'Radiog. Yakubu',   role: 'Radiographer'    },
];
