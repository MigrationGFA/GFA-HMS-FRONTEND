/**
 * Shared cashier mutations — the Cashier module reads/writes db collections
 * (wallets, walletTxns, refundRequests, discountRequests, cashierShifts) and
 * builds on the existing billing spine (db.invoices / db.payments) via
 * billing-actions.captureInvoicePayment (which emits INVOICE_PAID so Lab /
 * Pharmacy / Radiology / Consultation proceed automatically).
 */
import { db } from '@/db/database';
import { nextId, nowHuman, nowIso } from '@/db/ids';
import { receiptNo } from '@/lib/brand';
import { captureInvoicePayment } from '@/lib/billing-actions';
import type {
  WalletAccount, WalletTxn, WalletTxnKind, RefundRequest, RefundMethod, RefundStatus,
  DiscountRequest, DiscountKind, CashierShift, PaymentChannel, Invoice,
} from '@/data-access/types';

const now = () => nowHuman();
const audit = (actor: string, action: string, entity: string, entityId: string, invoiceRef?: string) =>
  db.audit.add({ actor, role: 'Cashier', action, entity, entityId, invoiceRef });

// =====================================================================
// SHIFT / DAILY CLOSING
// =====================================================================
export function currentShift(cashier?: string): CashierShift | undefined {
  const open = db.cashierShifts.list().filter(s => s.status === 'OPEN');
  if (cashier) return open.find(s => s.cashier === cashier) ?? open[0];
  return open[0];
}

export function openCashierShift(cashier: string, openingFloat: number): CashierShift {
  const existing = currentShift(cashier);
  if (existing) return existing;
  const row: CashierShift = {
    id: nextId('SHF'), cashier, openingFloat, openedAt: now(), status: 'OPEN',
    totals: { cash: 0, pos: 0, transfer: 0, online: 0, wallet: 0, nhia: 0, hmo: 0 },
    refundsTotal: 0, expectedCash: openingFloat,
  };
  db.cashierShifts.insert(row);
  db.emit('SHIFT_OPENED', { shiftId: row.id });
  audit(cashier, `Opened shift with float ₦${openingFloat.toLocaleString()}`, 'shift', row.id);
  return row;
}

const channelBucket: Record<string, keyof CashierShift['totals']> = {
  'Cash': 'cash', 'POS Card': 'pos', 'Bank Transfer': 'transfer', 'Online Card': 'online',
  'Wallet': 'wallet', 'NHIA': 'nhia', 'HMO': 'hmo',
};

function creditShift(channel: PaymentChannel, amount: number, cashier?: string) {
  const shift = currentShift(cashier);
  if (!shift) return;
  const bucket = channelBucket[channel];
  if (!bucket) return;
  const totals = { ...shift.totals, [bucket]: shift.totals[bucket] + amount };
  db.cashierShifts.update(shift.id, { totals, expectedCash: shift.openingFloat + totals.cash - shift.refundsTotal });
}

export function closeCashierShift(shiftId: string, actualCash: number, note?: string) {
  const shift = db.cashierShifts.get(shiftId);
  if (!shift) return { ok: false as const, message: 'Shift not found' };
  if (shift.status !== 'OPEN') return { ok: false as const, message: 'Shift is already closed' };
  const variance = actualCash - shift.expectedCash;
  db.cashierShifts.update(shiftId, { status: 'CLOSED', closedAt: now(), actualCash, variance, note });
  db.emit('SHIFT_CLOSED', { shiftId });
  audit(shift.cashier, `Closed shift — expected ₦${shift.expectedCash.toLocaleString()}, actual ₦${actualCash.toLocaleString()} (variance ₦${variance.toLocaleString()})`, 'shift', shiftId);
  return { ok: true as const, message: `Shift closed. Variance ${variance === 0 ? 'balanced' : (variance > 0 ? `excess ₦${variance.toLocaleString()}` : `shortage ₦${Math.abs(variance).toLocaleString()}`)}.`, variance };
}

export function approveShift(shiftId: string, supervisor: string) {
  const shift = db.cashierShifts.get(shiftId);
  if (!shift || shift.status !== 'CLOSED') return { ok: false as const, message: 'Shift must be closed before approval' };
  db.cashierShifts.update(shiftId, { status: 'APPROVED', approvedBy: supervisor });
  audit(supervisor, `Approved shift close for ${shift.cashier}`, 'shift', shiftId);
  return { ok: true as const, message: `Shift ${shiftId} approved and locked.` };
}

// =====================================================================
// PAYMENT COLLECTION (wraps billing spine + updates shift totals)
// =====================================================================
export function collectPayment(input: {
  invoiceId: string; amount: number; channel: PaymentChannel;
  cashier: string; terminal?: string; bankRef?: string;
}) {
  const res = captureInvoicePayment({
    invoiceId: input.invoiceId, amount: input.amount, channel: input.channel,
    cashier: input.cashier, terminal: input.terminal, bankRef: input.bankRef,
  });
  if (res.ok) creditShift(input.channel, input.amount, input.cashier);
  return res;
}

/** Mixed / split payment across multiple methods for one invoice. */
export function collectMixedPayment(
  invoiceId: string,
  parts: { channel: PaymentChannel; amount: number; terminal?: string; bankRef?: string }[],
  cashier: string,
) {
  const inv = db.invoices.get(invoiceId);
  if (!inv) return { ok: false as const, message: 'Invoice not found' };
  const total = parts.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) return { ok: false as const, message: 'Enter at least one payment amount' };
  if (total > inv.balance) return { ok: false as const, message: `Total ₦${total.toLocaleString()} exceeds balance ₦${inv.balance.toLocaleString()}` };
  const receipts: string[] = [];
  for (const p of parts) {
    if (p.amount <= 0) continue;
    if (p.channel === 'Wallet') {
      const w = payInvoiceFromWallet(invoiceId, inv.patientId, p.amount, cashier);
      if (!w.ok) return w;
      if (w.receipt) receipts.push(w.receipt);
    } else {
      const r = collectPayment({ invoiceId, amount: p.amount, channel: p.channel, cashier, terminal: p.terminal, bankRef: p.bankRef });
      if (!r.ok) return r;
      if (r.receipt) receipts.push(r.receipt);
    }
  }
  return { ok: true as const, message: `Captured ₦${total.toLocaleString()} across ${parts.filter(p => p.amount > 0).length} method(s). Receipts: ${receipts.join(', ')}`, receipts };
}

// =====================================================================
// PATIENT WALLET
// =====================================================================
export function getOrCreateWallet(patientId: string): WalletAccount | undefined {
  const existing = db.wallets.getByPatient(patientId);
  if (existing) return existing;
  const p = db.patients.get(patientId);
  if (!p) return undefined;
  return db.wallets.insert({
    id: nextId('WAL'), patientId, patientName: p.name, hospitalId: p.hospitalId,
    balance: 0, createdAt: nowIso(), updatedAt: nowIso(),
  });
}

function postWalletTxn(wallet: WalletAccount, kind: WalletTxnKind, amount: number, by: string, opts: { method?: PaymentChannel; invoiceId?: string; note?: string } = {}) {
  const delta = (kind === 'DEPOSIT' || kind === 'TRANSFER_IN' || kind === 'REFUND') ? amount : -amount;
  const balanceAfter = wallet.balance + delta;
  db.wallets.update(wallet.id, { balance: balanceAfter, updatedAt: nowIso() });
  const txn: WalletTxn = {
    id: nextId('WTX'), walletId: wallet.id, patientId: wallet.patientId, kind, amount,
    balanceAfter, method: opts.method, ref: `WTX-${Date.now().toString().slice(-6)}`,
    invoiceId: opts.invoiceId, note: opts.note, by, at: now(),
  };
  db.walletTxns.insert(txn);
  return { txn, balanceAfter };
}

export function fundWallet(patientId: string, amount: number, method: PaymentChannel, by: string, note?: string) {
  if (amount <= 0) return { ok: false as const, message: 'Deposit amount must be greater than zero' };
  const wallet = getOrCreateWallet(patientId);
  if (!wallet) return { ok: false as const, message: 'Patient not found' };
  const { balanceAfter } = postWalletTxn(wallet, 'DEPOSIT', amount, by, { method, note: note ?? 'Wallet deposit' });
  if (method === 'Cash' || method === 'POS Card') creditShift(method, amount, by);
  db.emit('WALLET_FUNDED', { patientId, amount });
  audit(by, `Wallet deposit ₦${amount.toLocaleString()} via ${method}`, 'wallet', wallet.id);
  return { ok: true as const, message: `₦${amount.toLocaleString()} added to ${wallet.patientName}'s wallet. New balance ₦${balanceAfter.toLocaleString()}.`, balance: balanceAfter };
}

export function payInvoiceFromWallet(invoiceId: string, patientId: string, amount: number, by: string) {
  const wallet = db.wallets.getByPatient(patientId);
  if (!wallet) return { ok: false as const, message: 'Patient has no wallet' };
  if (amount > wallet.balance) return { ok: false as const, message: `Insufficient wallet balance (₦${wallet.balance.toLocaleString()})` };
  const res = captureInvoicePayment({ invoiceId, amount, channel: 'Wallet', cashier: by });
  if (!res.ok) return res;
  postWalletTxn(wallet, 'PAYMENT', amount, by, { method: 'Wallet', invoiceId, note: `Payment for ${invoiceId}` });
  creditShift('Wallet', amount, by);
  db.emit('WALLET_PAYMENT', { patientId, invoiceId, amount });
  audit(by, `Wallet payment ₦${amount.toLocaleString()} for ${invoiceId}`, 'wallet', wallet.id, invoiceId);
  return { ok: true as const, receipt: res.receipt, message: `Paid ₦${amount.toLocaleString()} from wallet. ${res.message}` };
}

export function walletHistory(patientId: string): WalletTxn[] {
  return db.walletTxns.list().filter(t => t.patientId === patientId);
}

// =====================================================================
// REFUNDS & REVERSALS (approval workflow — no free deletes)
// =====================================================================
export function requestRefund(input: {
  paymentId?: string; invoiceId?: string; patientId: string; patientName: string;
  amount: number; kind: 'REFUND' | 'REVERSAL'; reason: string; method: RefundMethod;
  document?: string; requestedBy: string;
}) {
  if (input.amount <= 0) return { ok: false as const, message: 'Refund amount must be greater than zero' };
  if (input.reason.trim().length < 6) return { ok: false as const, message: 'Provide a clear reason (min 6 chars)' };
  const row: RefundRequest = {
    id: nextId('REF'), ...input, status: 'PENDING', createdAt: nowIso(), updatedAt: nowIso(),
    audit: [{ action: 'Requested', by: input.requestedBy, at: now(), note: input.reason }],
  };
  db.refundRequests.insert(row);
  db.emit('REFUND_REQUESTED', { refundId: row.id });
  audit(input.requestedBy, `Requested ${input.kind.toLowerCase()} ₦${input.amount.toLocaleString()} — ${input.reason}`, 'refund', row.id, input.invoiceId);
  return { ok: true as const, message: `${input.kind === 'REVERSAL' ? 'Reversal' : 'Refund'} request ${row.id} submitted for approval.`, id: row.id };
}

export function approveRefund(refundId: string, approver: string) {
  const r = db.refundRequests.get(refundId);
  if (!r) return { ok: false as const, message: 'Refund request not found' };
  if (r.status !== 'PENDING') return { ok: false as const, message: `Request already ${r.status.toLowerCase()}` };

  // Reverse the original payment on the invoice if provided.
  if (r.paymentId) {
    const pay = db.payments.list().find(p => p.id === r.paymentId);
    if (pay) db.payments.update(pay.id, { status: 'FAILED', matched: false });
  }
  if (r.invoiceId) {
    const inv = db.invoices.get(r.invoiceId);
    if (inv) {
      const newPaid = Math.max(0, inv.amountPaid - r.amount);
      db.invoices.update(r.invoiceId, { amountPaid: newPaid, balance: inv.amount - newPaid, status: newPaid === 0 ? 'UNPAID' : 'PARTIAL' });
    }
  }
  // If refunding to wallet, credit the wallet.
  if (r.method === 'Wallet') {
    const wallet = getOrCreateWallet(r.patientId);
    if (wallet) postWalletTxn(wallet, 'REFUND', r.amount, approver, { method: 'Wallet', invoiceId: r.invoiceId, note: `Refund ${refundId}` });
  } else {
    const shift = currentShift();
    if (shift && r.method === 'Cash') {
      db.cashierShifts.update(shift.id, { refundsTotal: shift.refundsTotal + r.amount, expectedCash: shift.openingFloat + shift.totals.cash - (shift.refundsTotal + r.amount) });
    }
  }
  db.refundRequests.update(refundId, {
    status: 'PAID', approvedBy: approver, updatedAt: nowIso(),
    audit: [...r.audit, { action: 'Approved & paid', by: approver, at: now() }],
  });
  db.emit('REFUND_APPROVED', { refundId });
  audit(approver, `Approved ${r.kind.toLowerCase()} ₦${r.amount.toLocaleString()} via ${r.method}`, 'refund', refundId, r.invoiceId);
  return { ok: true as const, message: `${r.kind === 'REVERSAL' ? 'Reversal' : 'Refund'} of ₦${r.amount.toLocaleString()} approved and processed via ${r.method}.` };
}

export function rejectRefund(refundId: string, approver: string, note?: string) {
  const r = db.refundRequests.get(refundId);
  if (!r || r.status !== 'PENDING') return { ok: false as const, message: 'Request not pending' };
  db.refundRequests.update(refundId, {
    status: 'REJECTED', approvedBy: approver, updatedAt: nowIso(),
    audit: [...r.audit, { action: 'Rejected', by: approver, at: now(), note }],
  });
  db.emit('REFUND_REJECTED', { refundId });
  audit(approver, `Rejected refund request ${refundId}`, 'refund', refundId);
  return { ok: true as const, message: `Refund request ${refundId} rejected.` };
}

// =====================================================================
// DISCOUNTS / WAIVERS (approval workflow)
// =====================================================================
function computeDiscount(inv: Invoice, kind: DiscountKind, value: number): number {
  if (kind === 'WAIVER') return inv.balance;
  if (kind === 'PERCENT') return Math.round((inv.amount * Math.max(0, Math.min(100, value))) / 100);
  return Math.min(value, inv.balance);
}

export function requestDiscount(input: {
  invoiceId: string; kind: DiscountKind; value: number;
  category: DiscountRequest['category']; reason: string; requestedBy: string;
}) {
  const inv = db.invoices.get(input.invoiceId);
  if (!inv) return { ok: false as const, message: 'Invoice not found' };
  if (input.reason.trim().length < 6) return { ok: false as const, message: 'Provide a reason (min 6 chars)' };
  const computedAmount = computeDiscount(inv, input.kind, input.value);
  const row: DiscountRequest = {
    id: nextId('DSC'), invoiceId: input.invoiceId, patientId: inv.patientId, patientName: inv.patientName,
    kind: input.kind, value: input.value, computedAmount, category: input.category, reason: input.reason,
    status: 'PENDING', requestedBy: input.requestedBy, createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.discountRequests.insert(row);
  db.emit('DISCOUNT_REQUESTED', { discountId: row.id });
  audit(input.requestedBy, `Requested ${input.category} discount ₦${computedAmount.toLocaleString()} on ${input.invoiceId}`, 'discount', row.id, input.invoiceId);
  return { ok: true as const, message: `Discount request ${row.id} (₦${computedAmount.toLocaleString()}) submitted for approval.`, id: row.id };
}

export function approveDiscount(discountId: string, approver: string) {
  const d = db.discountRequests.get(discountId);
  if (!d || d.status !== 'PENDING') return { ok: false as const, message: 'Request not pending' };
  const inv = db.invoices.get(d.invoiceId);
  if (!inv) return { ok: false as const, message: 'Invoice not found' };
  const applied = Math.min(d.computedAmount, inv.balance);
  const newAmount = Math.max(inv.amountPaid, inv.amount - applied);
  const newBalance = newAmount - inv.amountPaid;
  db.invoices.update(d.invoiceId, {
    amount: newAmount, balance: newBalance,
    status: newBalance === 0 ? 'PAID' : inv.amountPaid > 0 ? 'PARTIAL' : 'UNPAID',
  });
  db.discountRequests.update(discountId, { status: 'APPROVED', approvedBy: approver, updatedAt: nowIso() });
  db.emit('DISCOUNT_APPROVED', { discountId });
  audit(approver, `Approved ${d.category} discount ₦${applied.toLocaleString()} on ${d.invoiceId}`, 'discount', discountId, d.invoiceId);
  return { ok: true as const, message: `Discount of ₦${applied.toLocaleString()} applied to ${d.invoiceId}. New balance ₦${newBalance.toLocaleString()}.` };
}

export function rejectDiscount(discountId: string, approver: string) {
  const d = db.discountRequests.get(discountId);
  if (!d || d.status !== 'PENDING') return { ok: false as const, message: 'Request not pending' };
  db.discountRequests.update(discountId, { status: 'REJECTED', approvedBy: approver, updatedAt: nowIso() });
  db.emit('DISCOUNT_REJECTED', { discountId });
  audit(approver, `Rejected discount request ${discountId}`, 'discount', discountId);
  return { ok: true as const, message: `Discount request ${discountId} rejected.` };
}

// =====================================================================
// RECEIPTS
// =====================================================================
export function verifyReceipt(ref: string) {
  const t = db.payments.list().find(p => p.ref.toLowerCase() === ref.trim().toLowerCase());
  if (!t) return { ok: false as const, message: `No receipt found for “${ref}”.` };
  const inv = db.invoices.get(t.invoiceId);
  return {
    ok: true as const,
    receipt: { ref: t.ref, patientName: t.patientName, amount: t.amount, channel: t.channel, cashier: t.cashier, timestamp: t.timestamp, invoiceId: t.invoiceId, status: t.status, department: inv?.department, balance: inv?.balance },
  };
}

export function reprintReceipt(paymentId: string, by: string) {
  const t = db.payments.list().find(p => p.id === paymentId);
  if (!t) return { ok: false as const, message: 'Receipt not found' };
  audit(by, `Reprinted receipt ${t.ref} (₦${t.amount.toLocaleString()}) — REPRINT watermark`, 'payment', paymentId, t.invoiceId);
  return { ok: true as const, message: `Receipt ${t.ref} re-sent to printer with REPRINT watermark.` };
}

// =====================================================================
// REPORTS / AGGREGATIONS
// =====================================================================
const isToday = (ts: string) => (ts ?? '').slice(0, 10) === new Date().toISOString().slice(0, 10);

export function dashboardMetrics() {
  const payments = db.payments.list();
  const paid = payments.filter(p => p.status === 'PAID' || p.status === 'PARTIAL');
  const todays = paid.filter(p => isToday(p.timestamp));
  const byChannel = (c: PaymentChannel) => todays.filter(p => p.channel === c).reduce((s, p) => s + p.amount, 0);
  const invoices = db.invoices.list();
  return {
    totalToday: todays.reduce((s, p) => s + p.amount, 0),
    cash: byChannel('Cash'),
    pos: byChannel('POS Card'),
    transfer: byChannel('Bank Transfer'),
    online: byChannel('Online Card'),
    wallet: byChannel('Wallet'),
    pending: invoices.filter(i => i.status === 'UNPAID' || i.status === 'PENDING').reduce((s, i) => s + i.balance, 0),
    refundsToday: db.refundRequests.list().filter(r => r.status === 'PAID' && isToday(r.updatedAt)).reduce((s, r) => s + r.amount, 0),
    walletDeposits: db.walletTxns.list().filter(t => t.kind === 'DEPOSIT' && isToday(t.at)).reduce((s, t) => s + t.amount, 0),
    unreconciled: payments.filter(p => !p.matched).length,
  };
}

export function revenueByDepartment() {
  const paid = db.payments.list().filter(p => p.status === 'PAID' || p.status === 'PARTIAL');
  const map = new Map<string, number>();
  paid.forEach(p => {
    const inv = db.invoices.get(p.invoiceId);
    const dept = inv?.department ?? 'Unknown';
    map.set(dept, (map.get(dept) ?? 0) + p.amount);
  });
  return Array.from(map.entries()).map(([department, amount]) => ({ department, amount })).sort((a, b) => b.amount - a.amount);
}

export function outstandingInvoices() {
  return db.invoices.list().filter(i => i.balance > 0 && i.status !== 'PAID');
}

export function patientPaymentHistory(patientId: string) {
  const invoices = db.invoices.list().filter(i => i.patientId === patientId);
  const invIds = new Set(invoices.map(i => i.invoiceId));
  const payments = db.payments.list().filter(p => invIds.has(p.invoiceId));
  const wallet = db.wallets.getByPatient(patientId);
  const walletTxns = db.walletTxns.list().filter(t => t.patientId === patientId);
  const refunds = db.refundRequests.list().filter(r => r.patientId === patientId);
  return { invoices, payments, wallet, walletTxns, refunds, outstanding: invoices.reduce((s, i) => s + i.balance, 0) };
}
