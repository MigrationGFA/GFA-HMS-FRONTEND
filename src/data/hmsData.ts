// HMS clinical operations data — Patients, Lab, Pharmacy, IPD, Discharge, Sync, POS

export interface PatientRecord {
  id: string;
  hospitalId: string;
  name: string;
  phone: string;
  nin: string;
  age: number;
  gender: 'Male' | 'Female';
  address: string;
  registeredOn: string;
  source: 'Walk-in' | 'Online';
  bloodGroup: string;
  allergies: string;
  insurance: 'NHIS' | 'Private' | 'HMO' | 'None';
}

export const patientRecords: PatientRecord[] = [
  { id: 'PR001', hospitalId: 'GFA HMS/2026/00145', name: 'John Doe', phone: '08012345678', nin: '12345678901', age: 42, gender: 'Male', address: 'No 12, Adeola Odeku St, Lagos', registeredOn: '2026-03-25', source: 'Walk-in', bloodGroup: 'O+', allergies: 'Penicillin', insurance: 'NHIS' },
  { id: 'PR002', hospitalId: 'GFA HMS/2026/00146', name: 'Amina Yusuf', phone: '08023456789', nin: '23456789012', age: 28, gender: 'Female', address: '45 Ojuelegba Rd, Abeokuta', registeredOn: '2026-03-25', source: 'Online', bloodGroup: 'A+', allergies: 'None', insurance: 'Private' },
  { id: 'PR003', hospitalId: 'GFA HMS/2026/00147', name: 'Chidi Eze', phone: '08034567890', nin: '34567890123', age: 35, gender: 'Male', address: '8 Ikoyi Crescent, Ikenne', registeredOn: '2026-03-24', source: 'Walk-in', bloodGroup: 'B+', allergies: 'Sulfa drugs', insurance: 'HMO' },
  { id: 'PR004', hospitalId: 'GFA HMS/2026/00148', name: 'Funke Adeyemi', phone: '08045678901', nin: '45678901234', age: 31, gender: 'Female', address: '23 Owode Rd, Lagos', registeredOn: '2026-03-24', source: 'Online', bloodGroup: 'AB+', allergies: 'Aspirin', insurance: 'NHIS' },
  { id: 'PR005', hospitalId: 'GFA HMS/2026/00149', name: 'Ibrahim Musa', phone: '08056789012', nin: '56789012345', age: 56, gender: 'Male', address: '14 Bola Tinubu Way, Ijebu Ode', registeredOn: '2026-03-23', source: 'Walk-in', bloodGroup: 'O-', allergies: 'None', insurance: 'Private' },
  { id: 'PR006', hospitalId: 'GFA HMS/2026/00150', name: 'Ngozi Okoro', phone: '08067890123', nin: '67890123456', age: 47, gender: 'Female', address: '5 Ago-Iwoye Rd', registeredOn: '2026-03-25', source: 'Walk-in', bloodGroup: 'A-', allergies: 'Latex', insurance: 'NHIS' },
  { id: 'PR007', hospitalId: 'GFA HMS/2026/00151', name: 'Tunde Bakare', phone: '08078901234', nin: '78901234567', age: 24, gender: 'Male', address: '102 OOU Quarters', registeredOn: '2026-03-25', source: 'Online', bloodGroup: 'B-', allergies: 'None', insurance: 'HMO' },
  { id: 'PR008', hospitalId: 'GFA HMS/2026/00152', name: 'Halima Abdullahi', phone: '08089012345', nin: '89012345678', age: 38, gender: 'Female', address: '76 Itamerin, Lagos', registeredOn: '2026-03-24', source: 'Walk-in', bloodGroup: 'O+', allergies: 'Iodine', insurance: 'NHIS' },
];

// ----- Lab Module -----
export interface LabRequest {
  id: string;
  patientName: string;
  hospitalId: string;
  test: string;
  category: 'Haematology' | 'Chemistry' | 'Microbiology' | 'Histology';
  requestedBy: string;
  priority: 'Routine' | 'Urgent' | 'Stat';
  status: 'Pending' | 'Sample Collected' | 'In Progress' | 'Result Ready' | 'Verified' | 'Released';
  sampleId?: string;
  result?: string;
  requestedAt: string;
}

export const labRequests: LabRequest[] = [
  { id: 'LAB001', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', test: 'Malaria Parasite', category: 'Microbiology', requestedBy: 'Dr. Okafor', priority: 'Urgent', status: 'Result Ready', sampleId: 'SMP-2401', result: 'Positive (++)', requestedAt: '2026-03-25 09:12' },
  { id: 'LAB002', patientName: 'Amina Yusuf', hospitalId: 'GFA HMS/2026/00146', test: 'Full Blood Count', category: 'Haematology', requestedBy: 'Dr. Okafor', priority: 'Routine', status: 'In Progress', sampleId: 'SMP-2402', requestedAt: '2026-03-25 09:34' },
  { id: 'LAB003', patientName: 'Chidi Eze', hospitalId: 'GFA HMS/2026/00147', test: 'Liver Function Test', category: 'Chemistry', requestedBy: 'Dr. Ikedife', priority: 'Routine', status: 'Sample Collected', sampleId: 'SMP-2403', requestedAt: '2026-03-25 10:02' },
  { id: 'LAB004', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', test: 'Pregnancy Test', category: 'Chemistry', requestedBy: 'Dr. Balogun', priority: 'Stat', status: 'Verified', sampleId: 'SMP-2404', result: 'Positive', requestedAt: '2026-03-25 08:45' },
  { id: 'LAB005', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', test: 'Urine Culture', category: 'Microbiology', requestedBy: 'Dr. Adewale', priority: 'Routine', status: 'Pending', requestedAt: '2026-03-25 11:18' },
  { id: 'LAB006', patientName: 'Tunde Bakare', hospitalId: 'GFA HMS/2026/00151', test: 'HbA1c', category: 'Chemistry', requestedBy: 'Dr. Ikedife', priority: 'Routine', status: 'Released', sampleId: 'SMP-2405', result: '7.8% (Elevated)', requestedAt: '2026-03-24 14:22' },
];

// ----- Pharmacy Module -----
export interface DrugStock {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  expiry: string;
  status: 'Active' | 'Low' | 'Out of Stock' | 'Expired';
}

export const drugStock: DrugStock[] = [
  { id: 'DRG001', name: 'Coartem (Artemether/Lumefantrine)', category: 'Antimalarial', unit: 'Tablet', quantity: 1240, reorderLevel: 500, unitPrice: 250, expiry: '2027-08', status: 'Active' },
  { id: 'DRG002', name: 'Amoxicillin 500mg', category: 'Antibiotic', unit: 'Capsule', quantity: 320, reorderLevel: 400, unitPrice: 80, expiry: '2027-02', status: 'Low' },
  { id: 'DRG003', name: 'Paracetamol 500mg', category: 'Analgesic', unit: 'Tablet', quantity: 4500, reorderLevel: 1000, unitPrice: 20, expiry: '2028-01', status: 'Active' },
  { id: 'DRG004', name: 'Metformin 500mg', category: 'Antidiabetic', unit: 'Tablet', quantity: 0, reorderLevel: 300, unitPrice: 60, expiry: '2027-05', status: 'Out of Stock' },
  { id: 'DRG005', name: 'Lisinopril 10mg', category: 'Antihypertensive', unit: 'Tablet', quantity: 850, reorderLevel: 300, unitPrice: 120, expiry: '2027-11', status: 'Active' },
  { id: 'DRG006', name: 'Ferrous Sulphate', category: 'Supplement', unit: 'Tablet', quantity: 2100, reorderLevel: 500, unitPrice: 30, expiry: '2027-09', status: 'Active' },
  { id: 'DRG007', name: 'IV Normal Saline 500ml', category: 'IV Fluid', unit: 'Bag', quantity: 180, reorderLevel: 100, unitPrice: 850, expiry: '2027-04', status: 'Active' },
  { id: 'DRG008', name: 'Diclofenac 50mg', category: 'Analgesic', unit: 'Tablet', quantity: 95, reorderLevel: 200, unitPrice: 50, expiry: '2026-09', status: 'Low' },
];

export interface Prescription {
  id: string;
  patientName: string;
  hospitalId: string;
  prescribedBy: string;
  items: { drug: string; dose: string; qty: number }[];
  status: 'Pending' | 'Dispensed' | 'Partial' | 'Cancelled';
  date: string;
}

export const prescriptions: Prescription[] = [
  { id: 'RX001', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', prescribedBy: 'Dr. Okafor', items: [{ drug: 'Coartem', dose: '4 tabs BD x 3 days', qty: 24 }, { drug: 'Paracetamol 500mg', dose: '2 tabs TDS x 5 days', qty: 30 }], status: 'Pending', date: '2026-03-25' },
  { id: 'RX002', patientName: 'Amina Yusuf', hospitalId: 'GFA HMS/2026/00146', prescribedBy: 'Dr. Okafor', items: [{ drug: 'Amoxicillin 500mg', dose: '1 cap TDS x 7 days', qty: 21 }], status: 'Dispensed', date: '2026-03-25' },
  { id: 'RX003', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', prescribedBy: 'Dr. Balogun', items: [{ drug: 'Ferrous Sulphate', dose: '1 tab daily', qty: 30 }, { drug: 'Folic Acid 5mg', dose: '1 tab daily', qty: 30 }], status: 'Partial', date: '2026-03-24' },
  { id: 'RX004', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', prescribedBy: 'Dr. Adewale', items: [{ drug: 'Lisinopril 10mg', dose: '1 tab daily', qty: 30 }, { drug: 'Paracetamol 500mg', dose: 'PRN', qty: 20 }], status: 'Pending', date: '2026-03-25' },
  { id: 'RX005', patientName: 'Tunde Bakare', hospitalId: 'GFA HMS/2026/00151', prescribedBy: 'Dr. Ikedife', items: [{ drug: 'Metformin 500mg', dose: '1 tab BD', qty: 60 }], status: 'Cancelled', date: '2026-03-24' },
];

// ----- IPD / Bed Management -----
export interface Bed {
  id: string;
  ward: string;
  bedNumber: string;
  type: 'General' | 'Private' | 'ICU' | 'Maternity' | 'Pediatric';
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
  patient?: string;
  admittedSince?: string;
  rate: number;
}

export const beds: Bed[] = [
  { id: 'B001', ward: 'Ward A — Male Surgical', bedNumber: 'A-01', type: 'General', status: 'Occupied', patient: 'John Doe', admittedSince: '2026-03-23', rate: 8000 },
  { id: 'B002', ward: 'Ward A — Male Surgical', bedNumber: 'A-02', type: 'General', status: 'Available', rate: 8000 },
  { id: 'B003', ward: 'Ward A — Male Surgical', bedNumber: 'A-03', type: 'Private', status: 'Occupied', patient: 'Ibrahim Musa', admittedSince: '2026-03-22', rate: 25000 },
  { id: 'B004', ward: 'Ward B — Female Medical', bedNumber: 'B-01', type: 'General', status: 'Occupied', patient: 'Halima Abdullahi', admittedSince: '2026-03-24', rate: 8000 },
  { id: 'B005', ward: 'Ward B — Female Medical', bedNumber: 'B-02', type: 'General', status: 'Maintenance', rate: 8000 },
  { id: 'B006', ward: 'Ward C — Maternity', bedNumber: 'C-01', type: 'Maternity', status: 'Occupied', patient: 'Funke Adeyemi', admittedSince: '2026-03-24', rate: 15000 },
  { id: 'B007', ward: 'Ward C — Maternity', bedNumber: 'C-02', type: 'Maternity', status: 'Reserved', patient: 'Ngozi Okoro', rate: 15000 },
  { id: 'B008', ward: 'ICU', bedNumber: 'ICU-01', type: 'ICU', status: 'Occupied', patient: 'Adebayo Ogundimu', admittedSince: '2026-03-22', rate: 75000 },
  { id: 'B009', ward: 'ICU', bedNumber: 'ICU-02', type: 'ICU', status: 'Available', rate: 75000 },
  { id: 'B010', ward: 'Pediatric Ward', bedNumber: 'P-01', type: 'Pediatric', status: 'Available', rate: 10000 },
];

export interface Admission {
  id: string;
  patientName: string;
  hospitalId: string;
  ward: string;
  bedNumber: string;
  admittingDoctor: string;
  diagnosis: string;
  admittedOn: string;
  status: 'Active' | 'Pending Approval' | 'Discharged';
  daysAdmitted: number;
}

export const admissions: Admission[] = [
  { id: 'ADM001', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', ward: 'Ward A', bedNumber: 'A-01', admittingDoctor: 'Dr. Adewale', diagnosis: 'Post-op observation (Appendectomy)', admittedOn: '2026-03-23', status: 'Active', daysAdmitted: 2 },
  { id: 'ADM002', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', ward: 'Ward A', bedNumber: 'A-03', admittingDoctor: 'Dr. Adewale', diagnosis: 'Hypertensive emergency', admittedOn: '2026-03-22', status: 'Active', daysAdmitted: 3 },
  { id: 'ADM003', patientName: 'Halima Abdullahi', hospitalId: 'GFA HMS/2026/00152', ward: 'Ward B', bedNumber: 'B-01', admittingDoctor: 'Dr. Ikedife', diagnosis: 'Severe malaria with anaemia', admittedOn: '2026-03-24', status: 'Active', daysAdmitted: 1 },
  { id: 'ADM004', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', ward: 'Ward C', bedNumber: 'C-01', admittingDoctor: 'Dr. Balogun', diagnosis: 'Antenatal admission (PIH)', admittedOn: '2026-03-24', status: 'Active', daysAdmitted: 1 },
  { id: 'ADM005', patientName: 'Adebayo Ogundimu', hospitalId: 'GFA HMS/2026/00153', ward: 'ICU', bedNumber: 'ICU-01', admittingDoctor: 'Dr. Adewale', diagnosis: 'Post-op major surgery — monitoring', admittedOn: '2026-03-22', status: 'Active', daysAdmitted: 3 },
  { id: 'ADM006', patientName: 'Ngozi Okoro', hospitalId: 'GFA HMS/2026/00150', ward: 'Ward C', bedNumber: 'C-02', admittingDoctor: 'Dr. Balogun', diagnosis: 'Scheduled C-section', admittedOn: '2026-03-26', status: 'Pending Approval', daysAdmitted: 0 },
];

// ----- Billing / POS / Payments -----
export interface PosTransaction {
  id: string;
  receiptNo: string;
  patientName: string;
  amount: number;
  method: 'POS Card' | 'Cash' | 'Bank Transfer' | 'SMS Pay Link' | 'USSD';
  cashier: string;
  status: 'Successful' | 'Pending' | 'Failed';
  invoiceId: string;
  timestamp: string;
}

export const posTransactions: PosTransaction[] = [
  { id: 'POS001', receiptNo: 'RCP-50012', patientName: 'Amina Yusuf', amount: 10000, method: 'POS Card', cashier: 'Mrs. Hafsat Bello', status: 'Successful', invoiceId: 'GFA HMS-INV-1002', timestamp: '2026-03-25 09:42' },
  { id: 'POS002', receiptNo: 'RCP-50013', patientName: 'Funke Adeyemi', amount: 50000, method: 'Bank Transfer', cashier: 'Mrs. Hafsat Bello', status: 'Successful', invoiceId: 'GFA HMS-INV-1004', timestamp: '2026-03-24 11:18' },
  { id: 'POS003', receiptNo: 'RCP-50014', patientName: 'Tunde Bakare', amount: 8000, method: 'Cash', cashier: 'Mrs. Hafsat Bello', status: 'Successful', invoiceId: 'GFA HMS-INV-1007', timestamp: '2026-03-25 10:05' },
  { id: 'POS004', receiptNo: 'RCP-50015', patientName: 'Chidi Eze', amount: 18000, method: 'SMS Pay Link', cashier: 'System', status: 'Pending', invoiceId: 'GFA HMS-INV-1003', timestamp: '2026-03-25 10:34' },
  { id: 'POS005', receiptNo: 'RCP-50016', patientName: 'Ngozi Okoro', amount: 80000, method: 'POS Card', cashier: 'Mrs. Hafsat Bello', status: 'Failed', invoiceId: 'GFA HMS-INV-1006', timestamp: '2026-03-25 11:02' },
  { id: 'POS006', receiptNo: 'RCP-50017', patientName: 'John Doe', amount: 5000, method: 'USSD', cashier: 'System', status: 'Successful', invoiceId: 'GFA HMS-INV-1001', timestamp: '2026-03-25 09:15' },
  { id: 'POS007', receiptNo: 'RCP-50018', patientName: 'Adebayo Ogundimu', amount: 300000, method: 'Bank Transfer', cashier: 'Mrs. Hafsat Bello', status: 'Successful', invoiceId: 'GFA HMS-INV-1009', timestamp: '2026-03-22 14:48' },
];

// ----- EMR Sync -----
export interface SyncLog {
  id: string;
  module: 'Patient Registration' | 'Lab Results' | 'Pharmacy' | 'Billing' | 'Admissions' | 'Discharge';
  recordRef: string;
  status: 'Synced' | 'Pending' | 'Failed' | 'Retrying';
  attempt: number;
  message: string;
  timestamp: string;
}

export const syncLogs: SyncLog[] = [
  { id: 'SYN001', module: 'Patient Registration', recordRef: 'GFA HMS/2026/00145', status: 'Synced', attempt: 1, message: 'EMR sync successful', timestamp: '2026-03-25 09:01' },
  { id: 'SYN002', module: 'Lab Results', recordRef: 'LAB001', status: 'Synced', attempt: 1, message: 'Result pushed to EMR', timestamp: '2026-03-25 10:14' },
  { id: 'SYN003', module: 'Billing', recordRef: 'GFA HMS-INV-1006', status: 'Failed', attempt: 3, message: 'EMR endpoint timeout (504)', timestamp: '2026-03-25 11:08' },
  { id: 'SYN004', module: 'Pharmacy', recordRef: 'RX003', status: 'Pending', attempt: 0, message: 'Queued for next sync window', timestamp: '2026-03-25 11:20' },
  { id: 'SYN005', module: 'Admissions', recordRef: 'ADM006', status: 'Retrying', attempt: 2, message: 'Network unstable — retrying in 60s', timestamp: '2026-03-25 11:22' },
  { id: 'SYN006', module: 'Discharge', recordRef: 'ADM-DSC-021', status: 'Synced', attempt: 1, message: 'Discharge summary posted', timestamp: '2026-03-25 08:55' },
  { id: 'SYN007', module: 'Lab Results', recordRef: 'LAB006', status: 'Synced', attempt: 1, message: 'Result pushed to EMR', timestamp: '2026-03-24 14:48' },
  { id: 'SYN008', module: 'Billing', recordRef: 'GFA HMS-INV-1003', status: 'Pending', attempt: 0, message: 'Awaiting payment confirmation', timestamp: '2026-03-25 10:36' },
];

export interface AuditEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  module: string;
  timestamp: string;
}

export const auditTrail: AuditEntry[] = [
  { id: 'AUD001', actor: 'Mrs. Hafsat Bello', role: 'Cashier', action: 'Recorded payment ₦10,000 (POS) for INV-1002', module: 'Billing', timestamp: '2026-03-25 09:42' },
  { id: 'AUD002', actor: 'Dr. Ngozi Ikedife', role: 'Doctor', action: 'Created prescription RX005', module: 'Pharmacy', timestamp: '2026-03-24 13:11' },
  { id: 'AUD003', actor: 'Mr. Sola Adebanjo', role: 'Lab Technician', action: 'Verified result for LAB004', module: 'Laboratory', timestamp: '2026-03-25 09:08' },
  { id: 'AUD004', actor: 'Nurse Blessing Okonkwo', role: 'Nurse', action: 'Admitted patient John Doe to A-01', module: 'IPD', timestamp: '2026-03-23 14:30' },
  { id: 'AUD005', actor: 'Mr. Femi Oduwole', role: 'Records Officer', action: 'Registered new patient GFA HMS/2026/00150', module: 'Patient Mgmt', timestamp: '2026-03-25 08:20' },
  { id: 'AUD006', actor: 'Pharm. Yetunde Salami', role: 'Pharmacist', action: 'Dispensed RX002 (Amoxicillin x21)', module: 'Pharmacy', timestamp: '2026-03-25 11:05' },
];

// Discharge summaries
export interface Discharge {
  id: string;
  patientName: string;
  hospitalId: string;
  ward: string;
  admittedOn: string;
  dischargedOn: string;
  diagnosis: string;
  outcome: 'Recovered' | 'Improved' | 'Referred' | 'DAMA' | 'Mortality';
  totalBill: number;
  paid: number;
  balance: number;
  paymentVerified: boolean;
  financeApproved: boolean;
  bedReleased: boolean;
}

export const discharges: Discharge[] = [
  { id: 'DSC001', patientName: 'Patience Adeniyi', hospitalId: 'GFA HMS/2026/00120', ward: 'Ward C', admittedOn: '2026-03-18', dischargedOn: '2026-03-23', diagnosis: 'Normal Delivery', outcome: 'Recovered', totalBill: 240000, paid: 240000, balance: 0, paymentVerified: true, financeApproved: true, bedReleased: true },
  { id: 'DSC002', patientName: 'Segun Olaniyi', hospitalId: 'GFA HMS/2026/00131', ward: 'Ward A', admittedOn: '2026-03-15', dischargedOn: '2026-03-22', diagnosis: 'Appendectomy recovery', outcome: 'Recovered', totalBill: 320000, paid: 320000, balance: 0, paymentVerified: true, financeApproved: true, bedReleased: true },
  { id: 'DSC003', patientName: 'Bola Adekunle', hospitalId: 'GFA HMS/2026/00138', ward: 'Ward B', admittedOn: '2026-03-20', dischargedOn: '2026-03-24', diagnosis: 'Pneumonia — improved', outcome: 'Improved', totalBill: 185000, paid: 120000, balance: 65000, paymentVerified: false, financeApproved: false, bedReleased: false },
];
