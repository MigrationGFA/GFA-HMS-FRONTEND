// Final Billing & Discharge data — aggregation, validation, finance, summary, sync
import { ipdAdmissions, formatNGN } from './ipdData';
export { formatNGN };

export type DischargeStage =
  | 'PENDING_BILLING'           // doctor initiated, awaiting aggregation
  | 'BILL_AGGREGATED'           // final bill generated, awaiting validation
  | 'BILL_VALIDATED'            // anti-manipulation checks passed
  | 'AWAITING_PAYMENT'          // patient must settle
  | 'PARTIAL_PAYMENT'
  | 'PAID'                      // payment cleared
  | 'AWAITING_FINANCE'          // finance clearance pending
  | 'FINANCE_APPROVED'
  | 'BED_RELEASED'
  | 'SUMMARY_GENERATED'
  | 'SYNCED_EMR'
  | 'COMPLETED'
  | 'DISPUTE'                   // flagged for review
  | 'EMERGENCY_OVERRIDE';

export type PaymentChannel = 'POS' | 'SMS Link' | 'Bank Transfer' | 'Patient Dashboard' | 'NHIS' | 'HMO' | 'Cash' | 'USSD';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'FAILED';

export interface ChargeBreakdown {
  bed: number;
  pharmacy: number;
  lab: number;
  procedures: number;
  nursing: number;
  consumables: number;
  imaging: number;
  misc: number;
}

export interface BillFlag {
  type: 'MISSING_LAB_LINK' | 'MISSING_PHARMACY_LINK' | 'MANUAL_OVERRIDE' | 'PRICE_VARIANCE' | 'DUPLICATE_CHARGE' | 'NEGATIVE_BALANCE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  itemRef?: string;
}

export interface DischargePayment {
  id: string;
  channel: PaymentChannel;
  amount: number;
  receivedAt: string;
  receivedBy: string;
  reference: string;
  status: PaymentStatus;
}

export interface DischargeSummary {
  diagnosis: string;
  admissionReason: string;
  treatmentGiven: string[];
  labFindings: string[];
  medicationsAtDischarge: string[];
  followUp: string;
  doctorNotes: string;
  dischargedBy: string;
  generatedAt: string;
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
}

export interface DischargeCase {
  id: string;                   // DIS-2026-001
  admissionId: string;
  patientName: string;
  hospitalId: string;
  age: number;
  gender: 'Male' | 'Female';
  ward: string;
  bedNumber: string;
  admittedOn: string;
  dischargeRequestedOn: string;
  daysAdmitted: number;
  diagnosis: string;
  admittingDoctor: string;
  insurance: 'NHIS' | 'HMO' | 'Private' | 'None';
  isEmergency: boolean;

  stage: DischargeStage;
  outcome: 'Recovered' | 'Improved' | 'Referred' | 'DAMA' | 'Mortality';

  // Aggregated from IPD ledger
  breakdown: ChargeBreakdown;
  totalBill: number;
  paid: number;
  balance: number;
  paymentStatus: PaymentStatus;

  // Validation
  flags: BillFlag[];
  validatedBy?: string;
  validatedAt?: string;

  // Finance
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeNotes?: string;

  // Bed
  bedReleased: boolean;
  bedReleasedAt?: string;

  // Summary
  summary?: DischargeSummary;

  // EMR
  emrSync: 'SYNCED' | 'PENDING' | 'FAILED';
  emrSyncedAt?: string;

  // Payments
  payments: DischargePayment[];

  // Audit trail
  audit: AuditEntry[];
}

// Helper: aggregate an admission's IPD charges into discharge breakdown
const aggregateFromAdmission = (admissionId: string): { breakdown: ChargeBreakdown; total: number } => {
  const adm = ipdAdmissions.find(a => a.id === admissionId);
  const breakdown: ChargeBreakdown = { bed: 0, pharmacy: 0, lab: 0, procedures: 0, nursing: 0, consumables: 0, imaging: 0, misc: 0 };
  if (!adm) return { breakdown, total: 0 };
  adm.charges.forEach(c => {
    switch (c.category) {
      case 'Bed':        breakdown.bed         += c.amount; break;
      case 'Drug':       breakdown.pharmacy    += c.amount; break;
      case 'Lab':        breakdown.lab         += c.amount; break;
      case 'Procedure':  breakdown.procedures  += c.amount; break;
      case 'Nursing':    breakdown.nursing     += c.amount; break;
      case 'Consumable': breakdown.consumables += c.amount; break;
      case 'Imaging':    breakdown.imaging     += c.amount; break;
      case 'Misc':       breakdown.misc        += c.amount; break;
    }
  });
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { breakdown, total };
};

const adm1 = aggregateFromAdmission('ADM-2026-001');
const adm5 = aggregateFromAdmission('ADM-2026-005');
const adm9 = aggregateFromAdmission('ADM-2026-009');

export const dischargeCases: DischargeCase[] = [
  // 1. Patience — discharge already requested by IPD, balance outstanding
  {
    id: 'DIS-2026-001',
    admissionId: 'ADM-2026-009',
    patientName: 'Patience Adeniyi',
    hospitalId: 'GFA HMS/2026/00120',
    age: 29, gender: 'Female',
    ward: 'Ward C — Maternity', bedNumber: 'C-03',
    admittedOn: '2026-04-23', dischargeRequestedOn: '2026-04-28', daysAdmitted: 5,
    diagnosis: 'Normal delivery — recovered',
    admittingDoctor: 'Dr. Balogun',
    insurance: 'NHIS', isEmergency: false,
    stage: 'AWAITING_PAYMENT', outcome: 'Recovered',
    breakdown: adm9.breakdown, totalBill: adm9.total,
    paid: 200000, balance: adm9.total - 200000,
    paymentStatus: adm9.total - 200000 > 0 ? 'PARTIAL' : 'PAID',
    flags: [
      { type: 'MISSING_PHARMACY_LINK', severity: 'WARNING', description: 'Post-natal medication line "Post-natal medications" not linked to RX#', itemRef: 'C3' },
    ],
    validatedBy: 'System Auto-Validator', validatedAt: '2026-04-28 09:15',
    bedReleased: false,
    emrSync: 'PENDING',
    payments: [
      { id: 'PAY-9001', channel: 'POS', amount: 80000, receivedAt: '2026-04-23 11:00', receivedBy: 'Mrs. Hafsat Bello', reference: 'POS-RCP-50801', status: 'PAID' },
      { id: 'PAY-9002', channel: 'NHIS', amount: 120000, receivedAt: '2026-04-26 14:00', receivedBy: 'NHIS Desk', reference: 'NHIS-AUTH-77231', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-28 08:30', actor: 'Dr. Balogun', action: 'Initiated discharge' },
      { timestamp: '2026-04-28 08:31', actor: 'System', action: 'Aggregated 4 charge lines from IPD ledger' },
      { timestamp: '2026-04-28 09:15', actor: 'System Auto-Validator', action: 'Validated bill — 1 warning flag raised' },
    ],
  },
  // 2. John Doe — almost ready, paid partially
  {
    id: 'DIS-2026-002',
    admissionId: 'ADM-2026-001',
    patientName: 'John Doe',
    hospitalId: 'GFA HMS/2026/00145',
    age: 42, gender: 'Male',
    ward: 'Ward A — Male Surgical', bedNumber: 'A-01',
    admittedOn: '2026-04-26', dischargeRequestedOn: '2026-04-28', daysAdmitted: 2,
    diagnosis: 'Post-op observation (Appendectomy) — recovered',
    admittingDoctor: 'Dr. Adewale',
    insurance: 'NHIS', isEmergency: false,
    stage: 'BILL_AGGREGATED', outcome: 'Recovered',
    breakdown: adm1.breakdown, totalBill: adm1.total,
    paid: 50000, balance: adm1.total - 50000,
    paymentStatus: 'PARTIAL',
    flags: [],
    bedReleased: false, emrSync: 'PENDING',
    payments: [
      { id: 'PAY-1001', channel: 'POS', amount: 50000, receivedAt: '2026-04-26 13:30', receivedBy: 'Mrs. Hafsat Bello', reference: 'POS-RCP-50710', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-28 09:00', actor: 'Dr. Adewale', action: 'Initiated discharge' },
      { timestamp: '2026-04-28 09:00', actor: 'System', action: 'Aggregated 8 charge lines from IPD ledger' },
    ],
  },
  // 3. Adebayo — ICU, large bill, finance must clear
  {
    id: 'DIS-2026-003',
    admissionId: 'ADM-2026-005',
    patientName: 'Adebayo Ogundimu',
    hospitalId: 'GFA HMS/2026/00153',
    age: 49, gender: 'Male',
    ward: 'ICU', bedNumber: 'ICU-01',
    admittedOn: '2026-04-25', dischargeRequestedOn: '2026-04-28', daysAdmitted: 3,
    diagnosis: 'Post-op major surgery — stepped down from ICU',
    admittingDoctor: 'Dr. Adewale',
    insurance: 'Private', isEmergency: true,
    stage: 'AWAITING_FINANCE', outcome: 'Improved',
    breakdown: adm5.breakdown, totalBill: adm5.total,
    paid: 300000, balance: adm5.total - 300000,
    paymentStatus: adm5.total - 300000 > 0 ? 'PARTIAL' : 'PAID',
    flags: [
      { type: 'MANUAL_OVERRIDE', severity: 'INFO', description: 'Sedative bundle priced manually (justified by clinical chart)', itemRef: 'C3' },
      { type: 'PRICE_VARIANCE', severity: 'WARNING', description: 'ICU rate +5% vs catalog (after-hours surcharge)' },
    ],
    validatedBy: 'Finance Officer Mr. Akin Salami', validatedAt: '2026-04-28 10:00',
    bedReleased: false, emrSync: 'FAILED',
    payments: [
      { id: 'PAY-5001', channel: 'Bank Transfer', amount: 300000, receivedAt: '2026-04-25 09:30', receivedBy: 'Finance Auto-Recon', reference: 'TRX-FIRSTBANK-88341', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-28 08:00', actor: 'Dr. Adewale', action: 'Initiated discharge from ICU' },
      { timestamp: '2026-04-28 08:01', actor: 'System', action: 'Aggregated 5 charge lines (₦412,000)' },
      { timestamp: '2026-04-28 10:00', actor: 'Finance Officer', action: 'Validated bill — 2 flags reviewed' },
    ],
  },
  // 4. Halima — fully blocked, payment incomplete
  {
    id: 'DIS-2026-004',
    admissionId: 'ADM-2026-003',
    patientName: 'Halima Abdullahi',
    hospitalId: 'GFA HMS/2026/00152',
    age: 38, gender: 'Female',
    ward: 'Ward B — Female Medical', bedNumber: 'B-01',
    admittedOn: '2026-04-27', dischargeRequestedOn: '2026-04-28', daysAdmitted: 1,
    diagnosis: 'Severe malaria with anaemia — improved',
    admittingDoctor: 'Dr. Ikedife',
    insurance: 'NHIS', isEmergency: false,
    stage: 'AWAITING_PAYMENT', outcome: 'Improved',
    breakdown: { bed: 8000, pharmacy: 17000, lab: 9000, procedures: 0, nursing: 0, consumables: 0, imaging: 0, misc: 4500 },
    totalBill: 38500, paid: 20000, balance: 18500, paymentStatus: 'PARTIAL',
    flags: [],
    bedReleased: false, emrSync: 'PENDING',
    payments: [
      { id: 'PAY-3001', channel: 'POS', amount: 20000, receivedAt: '2026-04-27 13:30', receivedBy: 'Mrs. Hafsat Bello', reference: 'POS-RCP-50790', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-28 09:30', actor: 'Dr. Ikedife', action: 'Initiated discharge' },
      { timestamp: '2026-04-28 09:30', actor: 'System', action: 'Aggregated 4 charge lines' },
    ],
  },
  // 5. Segun — completed end-to-end (already discharged & synced)
  {
    id: 'DIS-2026-005',
    admissionId: 'ADM-2026-OLD-131',
    patientName: 'Segun Olaniyi',
    hospitalId: 'GFA HMS/2026/00131',
    age: 36, gender: 'Male',
    ward: 'Ward A', bedNumber: 'A-04',
    admittedOn: '2026-04-15', dischargeRequestedOn: '2026-04-22', daysAdmitted: 7,
    diagnosis: 'Appendectomy recovery',
    admittingDoctor: 'Dr. Adewale',
    insurance: 'HMO', isEmergency: false,
    stage: 'COMPLETED', outcome: 'Recovered',
    breakdown: { bed: 56000, pharmacy: 78000, lab: 36000, procedures: 120000, nursing: 18000, consumables: 8000, imaging: 0, misc: 4000 },
    totalBill: 320000, paid: 320000, balance: 0, paymentStatus: 'PAID',
    flags: [],
    validatedBy: 'System Auto-Validator', validatedAt: '2026-04-22 10:00',
    financeApprovedBy: 'Mr. Akin Salami', financeApprovedAt: '2026-04-22 11:30',
    bedReleased: true, bedReleasedAt: '2026-04-22 12:15',
    summary: {
      diagnosis: 'Acute appendicitis — post-appendectomy recovery',
      admissionReason: 'Right iliac fossa pain, fever, raised WBC',
      treatmentGiven: ['Open appendectomy', 'IV Ceftriaxone 1g BD x 5/7', 'IV Metronidazole 500mg TDS x 5/7', 'PRN Tramadol'],
      labFindings: ['WBC 14.2 → 7.8 (normalised)', 'Histology: acute suppurative appendicitis'],
      medicationsAtDischarge: ['Tab Amoxiclav 625mg BD x 5/7', 'Tab Paracetamol 1g TDS PRN', 'Tab Diclofenac 50mg BD PRN'],
      followUp: 'Surgical OPD review in 2 weeks; suture removal day 10',
      doctorNotes: 'Wound clean and dry. Tolerating diet. Mobile.',
      dischargedBy: 'Dr. Adewale', generatedAt: '2026-04-22 11:45',
    },
    emrSync: 'SYNCED', emrSyncedAt: '2026-04-22 12:20',
    payments: [
      { id: 'PAY-OLD-1', channel: 'HMO', amount: 250000, receivedAt: '2026-04-22 10:30', receivedBy: 'HMO Desk', reference: 'HMO-AVON-44321', status: 'PAID' },
      { id: 'PAY-OLD-2', channel: 'POS', amount: 70000, receivedAt: '2026-04-22 11:00', receivedBy: 'Mrs. Hafsat Bello', reference: 'POS-RCP-50688', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-22 09:30', actor: 'Dr. Adewale', action: 'Initiated discharge' },
      { timestamp: '2026-04-22 10:00', actor: 'System', action: 'Final bill aggregated (₦320,000)' },
      { timestamp: '2026-04-22 11:30', actor: 'Mr. Akin Salami', action: 'Finance approval granted' },
      { timestamp: '2026-04-22 11:45', actor: 'Dr. Adewale', action: 'Discharge summary signed' },
      { timestamp: '2026-04-22 12:15', actor: 'Nurse Blessing', action: 'Bed A-04 released' },
      { timestamp: '2026-04-22 12:20', actor: 'EMR Sync Worker', action: 'Discharge record pushed to EMR (legal archive)' },
    ],
  },
  // 6. DISPUTE case
  {
    id: 'DIS-2026-006',
    admissionId: 'ADM-2026-OLD-138',
    patientName: 'Bola Adekunle',
    hospitalId: 'GFA HMS/2026/00138',
    age: 51, gender: 'Male',
    ward: 'Ward B — Female Medical', bedNumber: 'B-04',
    admittedOn: '2026-04-20', dischargeRequestedOn: '2026-04-24', daysAdmitted: 4,
    diagnosis: 'Pneumonia — improved',
    admittingDoctor: 'Dr. Ikedife',
    insurance: 'None', isEmergency: false,
    stage: 'DISPUTE', outcome: 'Improved',
    breakdown: { bed: 32000, pharmacy: 65000, lab: 28000, procedures: 40000, nursing: 12000, consumables: 5000, imaging: 0, misc: 3000 },
    totalBill: 185000, paid: 120000, balance: 65000, paymentStatus: 'PARTIAL',
    flags: [
      { type: 'DUPLICATE_CHARGE', severity: 'CRITICAL', description: 'Possible duplicate "IV Ceftriaxone" line on 2026-04-22', itemRef: 'C-DUP-1' },
      { type: 'PRICE_VARIANCE', severity: 'WARNING', description: 'CXR billed ₦12,000 vs catalog ₦8,500' },
    ],
    bedReleased: false, emrSync: 'PENDING',
    payments: [
      { id: 'PAY-6001', channel: 'Cash', amount: 120000, receivedAt: '2026-04-24 12:00', receivedBy: 'Mrs. Hafsat Bello', reference: 'RCP-CASH-50772', status: 'PAID' },
    ],
    audit: [
      { timestamp: '2026-04-24 10:00', actor: 'Dr. Ikedife', action: 'Initiated discharge' },
      { timestamp: '2026-04-24 10:30', actor: 'System', action: 'Aggregated 8 charge lines (₦185,000)' },
      { timestamp: '2026-04-24 11:00', actor: 'System Validator', action: 'Flagged for finance review (2 anomalies)' },
      { timestamp: '2026-04-24 14:00', actor: 'Patient (NOK)', action: 'Filed billing dispute on 2 line items' },
    ],
  },
];

// Quick lookup
export const getDischargeById = (id: string) => dischargeCases.find(d => d.id === id);

// KPI helpers
export const dischargeStats = () => {
  const today = dischargeCases.filter(d => d.dischargeRequestedOn.startsWith('2026-04-28'));
  return {
    todayCount: today.length,
    awaitingPayment: dischargeCases.filter(d => ['AWAITING_PAYMENT','PARTIAL_PAYMENT','BILL_AGGREGATED','BILL_VALIDATED'].includes(d.stage)).length,
    awaitingFinance: dischargeCases.filter(d => d.stage === 'AWAITING_FINANCE').length,
    inDispute: dischargeCases.filter(d => d.stage === 'DISPUTE').length,
    completed: dischargeCases.filter(d => d.stage === 'COMPLETED').length,
    totalBilled: dischargeCases.reduce((s,d) => s + d.totalBill, 0),
    totalCollected: dischargeCases.reduce((s,d) => s + d.paid, 0),
    totalOutstanding: dischargeCases.reduce((s,d) => s + Math.max(0, d.balance), 0),
    bedsReleasedToday: dischargeCases.filter(d => d.bedReleasedAt?.startsWith('2026-04-28')).length,
    emrSyncFailed: dischargeCases.filter(d => d.emrSync === 'FAILED').length,
    emrSyncPending: dischargeCases.filter(d => d.emrSync === 'PENDING').length,
  };
};
