/**
 * Shared billing mutations — used by BillingStore and localRepo.invoices.capture
 * so cashier → consultation gate and repo stay in sync on one db authority.
 */
import { db } from '@/db/database';
import { nextId, nowHuman } from '@/db/ids';
import { invoiceNo, receiptNo, hospitalId, normalizeLegacyHospitalId } from '@/lib/brand';
import type { Invoice, InvoiceLine, PaymentChannel, PaymentStatus, AuditEntry, Visit } from '@/data-access/types';
import type { AuditLog } from '@/data/billingData';

const ussd = (id: string) => `*737*${id.replace(/\D/g, '').slice(-4)}#`;
const vacct = (id: string) => `90${id.replace(/\D/g, '').slice(-7).padStart(7, '0')}`;

export type CapturePaymentInput = {
  invoiceId: string;
  amount: number;
  channel: PaymentChannel;
  cashier?: string;
  terminal?: string;
  bankRef?: string;
};

export type CapturePaymentResult =
  | { ok: true; receipt: string; message: string; amount: number; channel: PaymentChannel }
  | { ok: false; message: string };

export type CreateInvoiceInput = {
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  amount: number;
  visitCode?: string;
  source?: string;
  lines?: InvoiceLine[];
};

export const toAuditLog = (entry: AuditEntry): AuditLog => ({
  id: entry.id,
  actor: entry.actor,
  role: entry.role,
  action: entry.action,
  invoiceRef: entry.invoiceRef ?? entry.entityId ?? '—',
  channel: entry.channel,
  timestamp: entry.at,
});

export function buildInvoice(input: CreateInvoiceInput): Invoice {
  const patient = db.patients.list().find(
    p => p.hospitalId === input.hospitalId || p.name === input.patientName,
  );
  const invKey = nextId('INV');
  const seq = Number(invKey.split('-')[1]);
  const invoiceId = invoiceNo(seq);
  const visitCode = input.visitCode ?? nextId('VST');
  const lines = input.lines ?? [{
    desc: `${input.department} service`,
    qty: 1,
    unitPrice: input.amount,
    source: input.source ?? 'Billing',
  }];

  return {
    id: invoiceId,
    invoiceId,
    visitCode,
    patientId: patient?.id ?? 'PT-unknown',
    patientName: input.patientName,
    hospitalId: patient?.hospitalId ?? input.hospitalId,
    phone: input.phone,
    department: input.department,
    lines,
    amount: input.amount,
    amountPaid: 0,
    balance: input.amount,
    status: 'UNPAID',
    channelsActive: ['POS Card', 'Cash', 'Bank Transfer', 'SMS Pay Link', 'USSD', 'Online Card'],
    ussdCode: ussd(invoiceId),
    smsSent: true,
    virtualAccount: vacct(invoiceId),
    createdAt: nowHuman(),
  };
}

export function createInvoiceRecord(input: CreateInvoiceInput): Invoice {
  const inv = buildInvoice(input);
  db.invoices.insert(inv);
  db.audit.add({
    actor: input.source ?? 'System',
    role: input.source ?? 'Billing Engine',
    action: `Auto-generated invoice ${inv.invoiceId} for ${input.patientName} (₦${input.amount.toLocaleString()})`,
    entity: 'invoice',
    entityId: inv.invoiceId,
    invoiceRef: inv.invoiceId,
  });
  db.emit('INVOICE_CREATED', { invoiceId: inv.invoiceId });
  return inv;
}

export type CreateVisitInput = {
  patientName: string;
  hospitalId?: string;
  phone?: string;
  department: string;
  type: Visit['type'];
  triagePriority: Visit['triagePriority'];
  amount: number;
  source?: string;
  attendingDoctor?: string;
};

/** Creates visit + linked invoice (Visit → Invoice spine). */
export function createVisitWithInvoice(input: CreateVisitInput): { visit: Visit; invoice: Invoice } {
  const patient = db.patients.list().find(
    p => p.name.toLowerCase() === input.patientName.toLowerCase()
      || (input.hospitalId && (p.hospitalId === input.hospitalId || p.hospitalId === normalizeLegacyHospitalId(input.hospitalId))),
  );
  const visitCode = nextId('VST');
  const inv = createInvoiceRecord({
    patientName: input.patientName,
    hospitalId: patient?.hospitalId ?? input.hospitalId ?? hospitalId(999, new Date().getFullYear()),
    phone: patient?.phone ?? input.phone ?? '08000000000',
    department: input.department,
    amount: input.amount,
    visitCode,
    source: input.source ?? 'Records',
    lines: [{
      desc: `${input.department} consultation`,
      qty: 1,
      unitPrice: input.amount,
      source: input.source ?? 'Billing',
    }],
  });
  const visit: Visit = {
    id: visitCode,
    visitCode,
    patientId: patient?.id ?? 'PT-unknown',
    patientName: input.patientName,
    hospitalId: inv.hospitalId,
    phone: inv.phone,
    department: input.department,
    type: input.type,
    triagePriority: input.triagePriority,
    attendingDoctor: input.attendingDoctor ?? 'Dr. On-call',
    consultationFee: input.amount,
    invoiceId: inv.invoiceId,
    paymentStatus: 'UNPAID',
    consultationUnlocked: false,
    createdAt: nowHuman(),
  };
  db.visits.insert(visit);
  db.emit('VISIT_CREATED', { visitCode, invoiceId: inv.invoiceId });
  return { visit, invoice: inv };
}

export function captureInvoicePayment(input: CapturePaymentInput): CapturePaymentResult {
  const inv = db.invoices.get(input.invoiceId);
  if (!inv) return { ok: false, message: 'Invoice not found' };
  if (input.amount <= 0) return { ok: false, message: 'Amount must be greater than zero' };
  if (input.amount > inv.balance) {
    return { ok: false, message: `Amount exceeds balance (${inv.balance})` };
  }

  const rcpKey = nextId('RCP');
  const receipt = receiptNo(Number(rcpKey.split('-')[1]));
  const newPaid = inv.amountPaid + input.amount;
  const newBal = inv.amount - newPaid;
  const newStatus: PaymentStatus = newBal === 0 ? 'PAID' : 'PARTIAL';

  db.invoices.update(input.invoiceId, {
    amountPaid: newPaid,
    balance: newBal,
    status: newStatus,
    channelUsed: input.channel,
  });

  const visit = db.visits.list().find(v => v.invoiceId === input.invoiceId);
  if (visit) {
    db.visits.update(visit.visitCode, {
      paymentStatus: newStatus,
      consultationUnlocked: newStatus === 'PAID' || visit.consultationUnlocked,
    });
  }

  db.payments.insert({
    id: nextId('BTX'),
    ref: receipt,
    invoiceId: input.invoiceId,
    patientName: inv.patientName,
    channel: input.channel,
    amount: input.amount,
    status: newStatus,
    posTerminal: input.terminal,
    bankRef: input.bankRef,
    cashier: input.cashier,
    timestamp: nowHuman(),
    matched: input.channel !== 'Bank Transfer',
  });

  db.audit.add({
    actor: input.cashier ?? 'Cashier',
    role: 'Cashier',
    action: `Captured ${input.channel} ₦${input.amount.toLocaleString()} → receipt ${receipt}${newStatus === 'PAID' ? ' (Doctor unlocked)' : ''}`,
    entity: 'invoice',
    entityId: input.invoiceId,
    invoiceRef: input.invoiceId,
    channel: input.channel,
  });

  if (newStatus === 'PAID' && visit) {
    db.emit('CONSULTATION_UNLOCKED', { visitCode: visit.visitCode });
  }
  db.emit('INVOICE_PAID', { invoiceId: input.invoiceId });

  return {
    ok: true,
    receipt,
    message: newStatus === 'PAID'
      ? 'Payment captured. Doctor consultation unlocked.'
      : 'Partial payment captured.',
    amount: input.amount,
    channel: input.channel,
  };
}
