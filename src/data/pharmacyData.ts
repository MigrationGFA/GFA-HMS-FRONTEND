// ============================================================
// PHARMACY MODULE — Comprehensive data model
// Drug catalog, prescriptions, dispenses, stock movements, audit
// ============================================================

export interface DrugItem {
  id: string;
  name: string;
  genericName: string;
  category: 'Antimalarial' | 'Antibiotic' | 'Analgesic' | 'Antihypertensive' | 'Antidiabetic' | 'Supplement' | 'IV Fluid' | 'Antifungal' | 'Antiviral';
  form: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Bag' | 'Cream';
  unit: string;
  strength: string;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
  expiry: string;
  batch: string;
  shelf: string;
  status: 'Active' | 'Low' | 'Out of Stock' | 'Expired';
  controlled?: boolean;
  alternatives?: string[]; // drug ids
}

export const drugCatalog: DrugItem[] = [
  { id: 'DRG001', name: 'Coartem', genericName: 'Artemether/Lumefantrine 80/480mg', category: 'Antimalarial', form: 'Tablet', unit: 'tab', strength: '80/480mg', unitPrice: 250, stock: 1240, reorderLevel: 500, expiry: '2027-08', batch: 'BATCH-A12', shelf: 'A-3', status: 'Active', alternatives: ['DRG010'] },
  { id: 'DRG002', name: 'Amoxicillin',  genericName: 'Amoxicillin 500mg',          category: 'Antibiotic',   form: 'Capsule', unit: 'cap', strength: '500mg', unitPrice: 80, stock: 320, reorderLevel: 400, expiry: '2027-02', batch: 'BATCH-B05', shelf: 'B-1', status: 'Low', alternatives: ['DRG011'] },
  { id: 'DRG003', name: 'Paracetamol',  genericName: 'Paracetamol 500mg',          category: 'Analgesic',    form: 'Tablet', unit: 'tab', strength: '500mg', unitPrice: 20, stock: 4500, reorderLevel: 1000, expiry: '2028-01', batch: 'BATCH-C19', shelf: 'C-2', status: 'Active' },
  { id: 'DRG004', name: 'Metformin',    genericName: 'Metformin HCl 500mg',        category: 'Antidiabetic', form: 'Tablet', unit: 'tab', strength: '500mg', unitPrice: 60, stock: 0,   reorderLevel: 300, expiry: '2027-05', batch: 'BATCH-D02', shelf: 'D-1', status: 'Out of Stock', alternatives: ['DRG012'] },
  { id: 'DRG005', name: 'Lisinopril',   genericName: 'Lisinopril 10mg',            category: 'Antihypertensive', form: 'Tablet', unit: 'tab', strength: '10mg', unitPrice: 120, stock: 850, reorderLevel: 300, expiry: '2027-11', batch: 'BATCH-E07', shelf: 'E-2', status: 'Active' },
  { id: 'DRG006', name: 'Ferrous Sulphate', genericName: 'Ferrous Sulphate 200mg', category: 'Supplement',   form: 'Tablet', unit: 'tab', strength: '200mg', unitPrice: 30, stock: 2100, reorderLevel: 500, expiry: '2027-09', batch: 'BATCH-F11', shelf: 'F-1', status: 'Active' },
  { id: 'DRG007', name: 'Normal Saline 0.9%', genericName: 'Sodium Chloride 0.9% IV', category: 'IV Fluid',  form: 'Bag',   unit: 'bag', strength: '500ml', unitPrice: 850, stock: 180, reorderLevel: 100, expiry: '2027-04', batch: 'BATCH-G03', shelf: 'IV-A', status: 'Active' },
  { id: 'DRG008', name: 'Diclofenac',   genericName: 'Diclofenac Sodium 50mg',     category: 'Analgesic',    form: 'Tablet', unit: 'tab', strength: '50mg', unitPrice: 50, stock: 95,  reorderLevel: 200, expiry: '2026-09', batch: 'BATCH-H14', shelf: 'C-3', status: 'Low' },
  { id: 'DRG009', name: 'Folic Acid',   genericName: 'Folic Acid 5mg',             category: 'Supplement',   form: 'Tablet', unit: 'tab', strength: '5mg',  unitPrice: 15, stock: 3200, reorderLevel: 400, expiry: '2028-03', batch: 'BATCH-I06', shelf: 'F-2', status: 'Active' },
  { id: 'DRG010', name: 'Quinine',      genericName: 'Quinine Sulphate 300mg',     category: 'Antimalarial', form: 'Tablet', unit: 'tab', strength: '300mg', unitPrice: 110, stock: 420, reorderLevel: 200, expiry: '2027-06', batch: 'BATCH-J01', shelf: 'A-4', status: 'Active' },
  { id: 'DRG011', name: 'Azithromycin', genericName: 'Azithromycin 500mg',         category: 'Antibiotic',   form: 'Tablet', unit: 'tab', strength: '500mg', unitPrice: 320, stock: 240, reorderLevel: 150, expiry: '2027-10', batch: 'BATCH-K22', shelf: 'B-2', status: 'Active' },
  { id: 'DRG012', name: 'Glibenclamide', genericName: 'Glibenclamide 5mg',         category: 'Antidiabetic', form: 'Tablet', unit: 'tab', strength: '5mg',  unitPrice: 25, stock: 980, reorderLevel: 300, expiry: '2027-07', batch: 'BATCH-L08', shelf: 'D-2', status: 'Active' },
  { id: 'DRG013', name: 'Morphine',     genericName: 'Morphine Sulphate 10mg/ml',  category: 'Analgesic',    form: 'Injection', unit: 'amp', strength: '10mg', unitPrice: 1800, stock: 42, reorderLevel: 30, expiry: '2027-01', batch: 'BATCH-M03', shelf: 'CTRL-1', status: 'Active', controlled: true },
];

export type RxStatus =
  | 'PENDING_PHARMACY'    // newly arrived from doctor
  | 'AWAITING_PAYMENT'    // billing not cleared
  | 'PAID'                // billing cleared, ready for review
  | 'EMERGENCY'           // override approved
  | 'UNDER_REVIEW'        // pharmacist reviewing
  | 'STOCK_ISSUE'         // out of stock / partial possible
  | 'APPROVED'            // ready to dispense
  | 'PARTIALLY_DISPENSED'
  | 'DISPENSED'           // completed
  | 'REJECTED'
  | 'PENDING_SYNC'
  | 'SYNCED';

export interface RxItem {
  drugId: string;
  drug: string;
  strength: string;
  dose: string;          // "1 tab BD"
  duration: string;      // "5 days"
  qty: number;
  dispensedQty?: number;
  substitutedFrom?: string;
  unitPrice: number;
}

export interface RxAuditEvent {
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface Prescription {
  id: string;            // RX-2026-XXX
  visitId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  prescribedBy: string;
  prescribedAt: string;
  diagnosis?: string;
  allergies?: string;
  items: RxItem[];
  status: RxStatus;
  paymentStatus: 'PAID' | 'UNPAID' | 'EMERGENCY' | 'WAIVED';
  invoiceId?: string;
  total: number;
  reviewedBy?: string;
  reviewedAt?: string;
  dispensedBy?: string;
  dispensedAt?: string;
  rejectionReason?: string;
  emrSync: 'PENDING' | 'SYNCED' | 'FAILED';
  audit: RxAuditEvent[];
}

const sumLine = (items: RxItem[]) => items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

const mk = (p: Omit<Prescription, 'total'>): Prescription => ({ ...p, total: sumLine(p.items) });

export const prescriptionsFull: Prescription[] = [
  mk({
    id: 'RX-2026-001', visitId: 'VIS-2026-0451', patientId: 'GFA HMS/2026/00145', patientName: 'John Doe', age: 42, gender: 'Male',
    prescribedBy: 'Dr. Okafor', prescribedAt: '2026-04-28 10:15', diagnosis: 'Uncomplicated malaria', allergies: 'Penicillin',
    items: [
      { drugId: 'DRG001', drug: 'Coartem', strength: '80/480mg', dose: '4 tabs BD', duration: '3 days', qty: 24, unitPrice: 250 },
      { drugId: 'DRG003', drug: 'Paracetamol', strength: '500mg', dose: '2 tabs TDS', duration: '5 days', qty: 30, unitPrice: 20 },
    ],
    status: 'DISPENSED', paymentStatus: 'PAID', invoiceId: 'INV-22041',
    reviewedBy: 'Pharm. Adeyemi', reviewedAt: '2026-04-28 10:25', dispensedBy: 'Pharm. Adeyemi', dispensedAt: '2026-04-28 10:32',
    emrSync: 'SYNCED',
    audit: [
      { at: '10:15', actor: 'Dr. Okafor',     action: 'Prescription created' },
      { at: '10:16', actor: 'System',         action: 'Invoice INV-22041 generated' },
      { at: '10:20', actor: 'Cashier Kemi',   action: 'Payment confirmed (POS)' },
      { at: '10:25', actor: 'Pharm. Adeyemi', action: 'Reviewed & approved' },
      { at: '10:32', actor: 'Pharm. Adeyemi', action: 'Dispensed', note: '24 Coartem + 30 Paracetamol' },
      { at: '10:33', actor: 'System',         action: 'Stock deducted' },
      { at: '10:34', actor: 'System',         action: 'Synced to EMR' },
    ],
  }),
  mk({
    id: 'RX-2026-002', visitId: 'VIS-2026-0452', patientId: 'GFA HMS/2026/00146', patientName: 'Amina Yusuf', age: 28, gender: 'Female',
    prescribedBy: 'Dr. Okafor', prescribedAt: '2026-04-28 10:40', diagnosis: 'Tonsillitis',
    items: [
      { drugId: 'DRG002', drug: 'Amoxicillin', strength: '500mg', dose: '1 cap TDS', duration: '7 days', qty: 21, unitPrice: 80 },
      { drugId: 'DRG003', drug: 'Paracetamol', strength: '500mg', dose: '2 tabs PRN', duration: '5 days', qty: 20, unitPrice: 20 },
    ],
    status: 'PAID', paymentStatus: 'PAID', invoiceId: 'INV-22042',
    emrSync: 'PENDING',
    audit: [
      { at: '10:40', actor: 'Dr. Okafor',   action: 'Prescription created' },
      { at: '10:41', actor: 'System',       action: 'Invoice INV-22042 — paid via NHIS' },
    ],
  }),
  mk({
    id: 'RX-2026-003', visitId: 'VIS-2026-0453', patientId: 'GFA HMS/2026/00147', patientName: 'Chidi Eze', age: 35, gender: 'Male',
    prescribedBy: 'Dr. Ikedife', prescribedAt: '2026-04-28 11:05', diagnosis: 'Hypertension',
    items: [
      { drugId: 'DRG005', drug: 'Lisinopril', strength: '10mg', dose: '1 tab daily', duration: '30 days', qty: 30, unitPrice: 120 },
    ],
    status: 'AWAITING_PAYMENT', paymentStatus: 'UNPAID', invoiceId: 'INV-22043',
    emrSync: 'PENDING',
    audit: [
      { at: '11:05', actor: 'Dr. Ikedife', action: 'Prescription created' },
      { at: '11:05', actor: 'System',      action: 'Invoice INV-22043 generated — awaiting payment' },
    ],
  }),
  mk({
    id: 'RX-2026-004', visitId: 'VIS-2026-0454', patientId: 'GFA HMS/2026/00148', patientName: 'Funke Adeyemi', age: 31, gender: 'Female',
    prescribedBy: 'Dr. Balogun', prescribedAt: '2026-04-27 14:00', diagnosis: 'ANC supplements',
    items: [
      { drugId: 'DRG006', drug: 'Ferrous Sulphate', strength: '200mg', dose: '1 tab daily', duration: '30 days', qty: 30, unitPrice: 30 },
      { drugId: 'DRG009', drug: 'Folic Acid', strength: '5mg', dose: '1 tab daily', duration: '30 days', qty: 30, unitPrice: 15 },
    ],
    status: 'PARTIALLY_DISPENSED', paymentStatus: 'PAID', invoiceId: 'INV-22044',
    reviewedBy: 'Pharm. Adeyemi', reviewedAt: '2026-04-27 14:15', dispensedBy: 'Pharm. Adeyemi', dispensedAt: '2026-04-27 14:20',
    emrSync: 'SYNCED',
    audit: [
      { at: '14:00', actor: 'Dr. Balogun',    action: 'Prescription created' },
      { at: '14:02', actor: 'Cashier Kemi',   action: 'Payment confirmed' },
      { at: '14:15', actor: 'Pharm. Adeyemi', action: 'Reviewed' },
      { at: '14:20', actor: 'Pharm. Adeyemi', action: 'Partial dispense — Ferrous 30 (full), Folic 20 of 30', note: 'Folic Acid stock low' },
    ],
  }),
  mk({
    id: 'RX-2026-005', visitId: 'VIS-2026-0455', patientId: 'GFA HMS/2026/00149', patientName: 'Ibrahim Musa', age: 56, gender: 'Male',
    prescribedBy: 'Dr. Adewale', prescribedAt: '2026-04-28 11:30', diagnosis: 'Type 2 DM',
    items: [
      { drugId: 'DRG004', drug: 'Metformin', strength: '500mg', dose: '1 tab BD', duration: '30 days', qty: 60, unitPrice: 60 },
    ],
    status: 'STOCK_ISSUE', paymentStatus: 'PAID', invoiceId: 'INV-22045',
    reviewedBy: 'Pharm. Adeyemi', reviewedAt: '2026-04-28 11:35',
    emrSync: 'PENDING',
    audit: [
      { at: '11:30', actor: 'Dr. Adewale',    action: 'Prescription created' },
      { at: '11:31', actor: 'Cashier Kemi',   action: 'Payment confirmed' },
      { at: '11:35', actor: 'Pharm. Adeyemi', action: 'Stock check failed — Metformin out of stock', note: 'Suggest substitute Glibenclamide' },
    ],
  }),
  mk({
    id: 'RX-2026-006', visitId: 'VIS-2026-0456', patientId: 'GFA HMS/2026/00150', patientName: 'Ngozi Okoro', age: 47, gender: 'Female',
    prescribedBy: 'Dr. Okafor', prescribedAt: '2026-04-28 11:45', diagnosis: 'Sepsis (suspected)',
    items: [
      { drugId: 'DRG013', drug: 'Morphine', strength: '10mg/ml', dose: '5mg IV stat', duration: 'Once', qty: 1, unitPrice: 1800 },
      { drugId: 'DRG007', drug: 'Normal Saline 0.9%', strength: '500ml', dose: '500ml IV', duration: 'Stat', qty: 2, unitPrice: 850 },
    ],
    status: 'EMERGENCY', paymentStatus: 'EMERGENCY', invoiceId: 'INV-22046',
    emrSync: 'PENDING',
    audit: [
      { at: '11:45', actor: 'Dr. Okafor', action: 'Emergency prescription created' },
      { at: '11:46', actor: 'Dr. Okafor', action: 'Emergency override approved', note: 'Suspected sepsis — flagged for finance review' },
    ],
  }),
  mk({
    id: 'RX-2026-007', visitId: 'VIS-2026-0457', patientId: 'GFA HMS/2026/00151', patientName: 'Tunde Bakare', age: 24, gender: 'Male',
    prescribedBy: 'Dr. Ikedife', prescribedAt: '2026-04-27 15:00', diagnosis: 'Pre-diabetes',
    items: [
      { drugId: 'DRG004', drug: 'Metformin', strength: '500mg', dose: '1 tab BD', duration: '30 days', qty: 60, unitPrice: 60 },
    ],
    status: 'REJECTED', paymentStatus: 'WAIVED',
    reviewedBy: 'Pharm. Olumide', reviewedAt: '2026-04-27 15:10', rejectionReason: 'Patient not yet diabetic — repeat HbA1c first',
    emrSync: 'PENDING',
    audit: [
      { at: '15:00', actor: 'Dr. Ikedife',    action: 'Prescription created' },
      { at: '15:10', actor: 'Pharm. Olumide', action: 'Rejected', note: 'Returned to doctor — repeat HbA1c first' },
    ],
  }),
  mk({
    id: 'RX-2026-008', visitId: 'VIS-2026-0458', patientId: 'GFA HMS/2026/00152', patientName: 'Halima Abdullahi', age: 38, gender: 'Female',
    prescribedBy: 'Dr. Balogun', prescribedAt: '2026-04-28 09:50', diagnosis: 'UTI',
    items: [
      { drugId: 'DRG011', drug: 'Azithromycin', strength: '500mg', dose: '1 tab daily', duration: '5 days', qty: 5, unitPrice: 320 },
    ],
    status: 'PENDING_PHARMACY', paymentStatus: 'PAID', invoiceId: 'INV-22048',
    emrSync: 'PENDING',
    audit: [
      { at: '09:50', actor: 'Dr. Balogun',  action: 'Prescription created' },
      { at: '09:52', actor: 'Cashier Kemi', action: 'Payment confirmed (SMS link)' },
    ],
  }),
];

export interface StockMovement {
  id: string;
  drugId: string;
  drug: string;
  type: 'DISPENSE' | 'RECEIVE' | 'ADJUSTMENT' | 'EXPIRY' | 'TRANSFER';
  qty: number; // negative for outflow
  before: number;
  after: number;
  rxId?: string;
  actor: string;
  at: string;
  note?: string;
}

export const stockMovements: StockMovement[] = [
  { id: 'MV-001', drugId: 'DRG001', drug: 'Coartem',           type: 'DISPENSE', qty: -24, before: 1264, after: 1240, rxId: 'RX-2026-001', actor: 'Pharm. Adeyemi', at: '2026-04-28 10:33' },
  { id: 'MV-002', drugId: 'DRG003', drug: 'Paracetamol',       type: 'DISPENSE', qty: -30, before: 4530, after: 4500, rxId: 'RX-2026-001', actor: 'Pharm. Adeyemi', at: '2026-04-28 10:33' },
  { id: 'MV-003', drugId: 'DRG006', drug: 'Ferrous Sulphate',  type: 'DISPENSE', qty: -30, before: 2130, after: 2100, rxId: 'RX-2026-004', actor: 'Pharm. Adeyemi', at: '2026-04-27 14:20' },
  { id: 'MV-004', drugId: 'DRG009', drug: 'Folic Acid',        type: 'DISPENSE', qty: -20, before: 3220, after: 3200, rxId: 'RX-2026-004', actor: 'Pharm. Adeyemi', at: '2026-04-27 14:20', note: 'Partial — stock low' },
  { id: 'MV-005', drugId: 'DRG002', drug: 'Amoxicillin',       type: 'RECEIVE',  qty: 200, before: 120,  after: 320,  actor: 'Pharm. Olumide', at: '2026-04-26 09:00', note: 'GR-PO-1041 received' },
  { id: 'MV-006', drugId: 'DRG004', drug: 'Metformin',         type: 'ADJUSTMENT', qty: -50, before: 50, after: 0, actor: 'Pharm. Olumide', at: '2026-04-25 16:30', note: 'Damaged batch, written off' },
  { id: 'MV-007', drugId: 'DRG013', drug: 'Morphine',          type: 'DISPENSE', qty: -1, before: 43, after: 42, rxId: 'RX-2026-006', actor: 'Pharm. Adeyemi', at: '2026-04-28 11:48', note: 'Controlled drug — emergency' },
];

export const pharmacyStaff = [
  { id: 'PS-01', name: 'Pharm. Adeyemi', role: 'Pharmacist'         },
  { id: 'PS-02', name: 'Pharm. Olumide', role: 'Senior Pharmacist'  },
  { id: 'PS-03', name: 'Pharm. Halimat', role: 'Pharmacist'         },
  { id: 'PS-04', name: 'Tech. Yusuf',    role: 'Pharmacy Technician' },
];
