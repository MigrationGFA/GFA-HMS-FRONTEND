// Billing Initiation System — visits, invoices (auto-generated), reconciliation, audit

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'PARTIAL';
export type PaymentChannel = 'POS Card' | 'Cash' | 'Bank Transfer' | 'SMS Pay Link' | 'USSD' | 'Online Card' | 'Wallet' | 'NHIA' | 'HMO';

export interface Visit {
  id: string;
  visitCode: string;
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  type: 'OPD' | 'Surgery' | 'Maternity' | 'Pediatric' | 'Emergency';
  triagePriority: 'Routine' | 'Urgent' | 'Emergency';
  attendingDoctor: string;
  consultationFee: number;
  invoiceId: string;
  paymentStatus: PaymentStatus;
  consultationUnlocked: boolean;
  emergencyOverride?: { doctor: string; reason: string; timestamp: string; reviewed: boolean };
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceId: string;
  visitCode: string;
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  amount: number;
  amountPaid: number;
  balance: number;
  status: PaymentStatus;
  channelsActive: PaymentChannel[];
  channelUsed?: PaymentChannel;
  ussdCode: string;
  smsSent: boolean;
  virtualAccount: string;
  createdAt: string;
}

export interface BillingTxn {
  id: string;
  ref: string;
  invoiceId: string;
  patientName: string;
  channel: PaymentChannel;
  amount: number;
  status: PaymentStatus;
  posTerminal?: string;
  bankRef?: string;
  cashier?: string;
  timestamp: string;
  matched: boolean;
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  invoiceRef: string;
  channel?: PaymentChannel;
  timestamp: string;
}

export const visits: Visit[] = [
  { id: 'V001', visitCode: 'VST-30025', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', phone: '08012345678', department: 'Internal Medicine', type: 'OPD', triagePriority: 'Routine', attendingDoctor: 'Dr. Okafor', consultationFee: 10000, invoiceId: 'INV-BIL-1001', paymentStatus: 'PAID', consultationUnlocked: true, createdAt: '2026-04-28 08:42' },
  { id: 'V002', visitCode: 'VST-30026', patientName: 'Amina Yusuf', hospitalId: 'GFA HMS/2026/00146', phone: '08023456789', department: 'Maternity', type: 'Maternity', triagePriority: 'Routine', attendingDoctor: 'Dr. Balogun', consultationFee: 35000, invoiceId: 'INV-BIL-1002', paymentStatus: 'PAID', consultationUnlocked: true, createdAt: '2026-04-28 08:55' },
  { id: 'V003', visitCode: 'VST-30027', patientName: 'Chidi Eze', hospitalId: 'GFA HMS/2026/00147', phone: '08034567890', department: 'Internal Medicine', type: 'OPD', triagePriority: 'Routine', attendingDoctor: 'Dr. Ikedife', consultationFee: 10000, invoiceId: 'INV-BIL-1003', paymentStatus: 'UNPAID', consultationUnlocked: false, createdAt: '2026-04-28 09:10' },
  { id: 'V004', visitCode: 'VST-30028', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', phone: '08045678901', department: 'Internal Medicine', type: 'OPD', triagePriority: 'Urgent', attendingDoctor: 'Dr. Okafor', consultationFee: 10000, invoiceId: 'INV-BIL-1004', paymentStatus: 'PENDING', consultationUnlocked: false, createdAt: '2026-04-28 09:22' },
  { id: 'V005', visitCode: 'VST-30029', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', phone: '08056789012', department: 'Cardiology', type: 'Emergency', triagePriority: 'Emergency', attendingDoctor: 'Dr. Adewale', consultationFee: 25000, invoiceId: 'INV-BIL-1005', paymentStatus: 'UNPAID', consultationUnlocked: true, emergencyOverride: { doctor: 'Dr. Adewale', reason: 'Hypertensive emergency — BP 220/130, immediate intervention required.', timestamp: '2026-04-28 09:31', reviewed: false }, createdAt: '2026-04-28 09:30' },
  { id: 'V006', visitCode: 'VST-30030', patientName: 'Ngozi Okoro', hospitalId: 'GFA HMS/2026/00150', phone: '08067890123', department: 'Surgery', type: 'Surgery', triagePriority: 'Routine', attendingDoctor: 'Dr. Adewale', consultationFee: 25000, invoiceId: 'INV-BIL-1006', paymentStatus: 'PARTIAL', consultationUnlocked: false, createdAt: '2026-04-28 09:45' },
  { id: 'V007', visitCode: 'VST-30031', patientName: 'Tunde Bakare', hospitalId: 'GFA HMS/2026/00151', phone: '08078901234', department: 'Pediatrics', type: 'Pediatric', triagePriority: 'Routine', attendingDoctor: 'Dr. Ikedife', consultationFee: 12000, invoiceId: 'INV-BIL-1007', paymentStatus: 'PAID', consultationUnlocked: true, createdAt: '2026-04-28 10:01' },
  { id: 'V008', visitCode: 'VST-30032', patientName: 'Halima Abdullahi', hospitalId: 'GFA HMS/2026/00152', phone: '08089012345', department: 'Internal Medicine', type: 'OPD', triagePriority: 'Routine', attendingDoctor: 'Dr. Okafor', consultationFee: 10000, invoiceId: 'INV-BIL-1008', paymentStatus: 'FAILED', consultationUnlocked: false, createdAt: '2026-04-28 10:15' },
];

const ussd = (id: string) => `*737*${id.replace(/\D/g, '').slice(-4)}#`;
const vacct = (id: string) => `90${id.replace(/\D/g, '').slice(-7).padStart(7, '0')}`;

export const billingInvoices: BillingInvoice[] = visits.map(v => {
  const paid = v.paymentStatus === 'PAID' ? v.consultationFee : v.paymentStatus === 'PARTIAL' ? Math.floor(v.consultationFee * 0.5) : 0;
  return {
    id: v.invoiceId,
    invoiceId: v.invoiceId,
    visitCode: v.visitCode,
    patientName: v.patientName,
    hospitalId: v.hospitalId,
    phone: v.phone,
    department: v.department,
    amount: v.consultationFee,
    amountPaid: paid,
    balance: v.consultationFee - paid,
    status: v.paymentStatus,
    channelsActive: ['POS Card', 'Cash', 'Bank Transfer', 'SMS Pay Link', 'USSD', 'Online Card'],
    channelUsed: v.paymentStatus === 'PAID' || v.paymentStatus === 'PARTIAL' ? 'POS Card' : undefined,
    ussdCode: ussd(v.invoiceId),
    smsSent: true,
    virtualAccount: vacct(v.invoiceId),
    createdAt: v.createdAt,
  };
});

export const billingTxns: BillingTxn[] = [
  { id: 'BTX001', ref: 'GFA HMS-RCP-91001', invoiceId: 'INV-BIL-1001', patientName: 'John Doe', channel: 'POS Card', amount: 10000, status: 'PAID', posTerminal: 'POS-A12', cashier: 'Hafsat Bello', timestamp: '2026-04-28 08:48', matched: true },
  { id: 'BTX002', ref: 'GFA HMS-RCP-91002', invoiceId: 'INV-BIL-1002', patientName: 'Amina Yusuf', channel: 'Bank Transfer', amount: 35000, status: 'PAID', bankRef: 'GTB/REF/77821', timestamp: '2026-04-28 09:01', matched: true },
  { id: 'BTX003', ref: 'GFA HMS-RCP-91003', invoiceId: 'INV-BIL-1004', patientName: 'Funke Adeyemi', channel: 'SMS Pay Link', amount: 10000, status: 'PENDING', timestamp: '2026-04-28 09:24', matched: false },
  { id: 'BTX004', ref: 'GFA HMS-RCP-91004', invoiceId: 'INV-BIL-1006', patientName: 'Ngozi Okoro', channel: 'POS Card', amount: 12500, status: 'PARTIAL', posTerminal: 'POS-B07', cashier: 'Tope Adeleke', timestamp: '2026-04-28 09:48', matched: true },
  { id: 'BTX005', ref: 'GFA HMS-RCP-91005', invoiceId: 'INV-BIL-1007', patientName: 'Tunde Bakare', channel: 'USSD', amount: 12000, status: 'PAID', timestamp: '2026-04-28 10:03', matched: true },
  { id: 'BTX006', ref: 'GFA HMS-RCP-91006', invoiceId: 'INV-BIL-1008', patientName: 'Halima Abdullahi', channel: 'Online Card', amount: 10000, status: 'FAILED', timestamp: '2026-04-28 10:18', matched: false },
  { id: 'BTX007', ref: 'GFA HMS-RCP-91007', invoiceId: 'INV-BIL-9999', patientName: 'Unknown Ref', channel: 'Bank Transfer', amount: 8000, status: 'PAID', bankRef: 'UBA/REF/55310', timestamp: '2026-04-28 10:22', matched: false },
];

export const billingAudit: AuditLog[] = [
  { id: 'BAU001', actor: 'System', role: 'Billing Engine', action: 'Auto-generated invoice INV-BIL-1001 for visit VST-30025', invoiceRef: 'INV-BIL-1001', timestamp: '2026-04-28 08:42' },
  { id: 'BAU002', actor: 'Hafsat Bello', role: 'Cashier', action: 'POS payment confirmed ₦10,000', invoiceRef: 'INV-BIL-1001', channel: 'POS Card', timestamp: '2026-04-28 08:48' },
  { id: 'BAU003', actor: 'System', role: 'Reconciliation', action: 'Matched POS-A12 receipt with INV-BIL-1001', invoiceRef: 'INV-BIL-1001', timestamp: '2026-04-28 08:49' },
  { id: 'BAU004', actor: 'System', role: 'Notification', action: 'SMS pay link sent to 08045678901', invoiceRef: 'INV-BIL-1004', channel: 'SMS Pay Link', timestamp: '2026-04-28 09:23' },
  { id: 'BAU005', actor: 'Dr. Adewale', role: 'Doctor', action: 'EMERGENCY OVERRIDE — consultation unlocked without payment', invoiceRef: 'INV-BIL-1005', timestamp: '2026-04-28 09:31' },
  { id: 'BAU006', actor: 'System', role: 'Reconciliation', action: 'Unmatched bank transfer flagged for review', invoiceRef: 'INV-BIL-9999', channel: 'Bank Transfer', timestamp: '2026-04-28 10:23' },
];

export const statusTone = (s: PaymentStatus): string => {
  switch (s) {
    case 'PAID': return 'badge-success';
    case 'PENDING': return 'badge-warning';
    case 'PARTIAL': return 'badge-partial';
    case 'FAILED': return 'badge-danger';
    case 'UNPAID':
    default: return 'badge-neutral';
  }
};
