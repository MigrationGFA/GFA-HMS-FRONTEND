import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  currentShift, openCashierShift, closeCashierShift, approveShift,
  collectPayment, collectMixedPayment, getOrCreateWallet, fundWallet,
  payInvoiceFromWallet, walletHistory, requestRefund, approveRefund, rejectRefund,
  requestDiscount, approveDiscount, verifyReceipt, dashboardMetrics,
  revenueByDepartment, outstandingInvoices, patientPaymentHistory,
} from '@/lib/cashier-actions';
import { createInvoiceRecord } from '@/lib/billing-actions';

const anyPatient = () => db.patients.list()[0];

const makeInvoice = (amount = 10000) => {
  const p = anyPatient();
  return createInvoiceRecord({
    patientName: p.name, hospitalId: p.hospitalId, phone: p.phone ?? '08000000000',
    department: 'Internal Medicine', amount,
    lines: [{ desc: 'Consultation', qty: 1, unitPrice: amount, source: 'Billing' }],
  });
};

describe('cashier-actions (Cashier module)', () => {
  beforeEach(() => { db._testReset(); });
  afterEach(() => { clear(); db._testReset(); });

  it('seeds wallets and an open shift', () => {
    expect(db.wallets.list().length).toBeGreaterThan(0);
    expect(currentShift()).toBeDefined();
  });

  it('collects a full payment and marks the invoice PAID', () => {
    const inv = makeInvoice(10000);
    const res = collectPayment({ invoiceId: inv.invoiceId, amount: 10000, channel: 'Cash', cashier: 'Tester' });
    expect(res.ok).toBe(true);
    expect(db.invoices.get(inv.invoiceId)!.status).toBe('PAID');
  });

  it('credits the open shift cash total and updates expected cash', () => {
    const before = currentShift()!;
    const inv = makeInvoice(5000);
    collectPayment({ invoiceId: inv.invoiceId, amount: 5000, channel: 'Cash', cashier: before.cashier });
    const after = currentShift()!;
    expect(after.totals.cash).toBe(before.totals.cash + 5000);
    expect(after.expectedCash).toBe(before.openingFloat + after.totals.cash - after.refundsTotal);
  });

  it('funds a wallet and pays an invoice from wallet balance', () => {
    const p = anyPatient();
    getOrCreateWallet(p.id);
    const f = fundWallet(p.id, 15000, 'Cash', 'Tester');
    expect(f.ok).toBe(true);
    const inv = makeInvoice(6000);
    const pay = payInvoiceFromWallet(inv.invoiceId, p.id, 6000, 'Tester');
    expect(pay.ok).toBe(true);
    expect(db.wallets.getByPatient(p.id)!.balance).toBeGreaterThanOrEqual(9000);
    expect(walletHistory(p.id).some(t => t.kind === 'PAYMENT')).toBe(true);
  });

  it('rejects wallet payment when balance is insufficient', () => {
    const p = db.patients.list()[3];
    getOrCreateWallet(p.id);
    const inv = makeInvoice(9000);
    const pay = payInvoiceFromWallet(inv.invoiceId, p.id, 9000, 'Tester');
    expect(pay.ok).toBe(false);
  });

  it('processes a mixed payment across cash + POS', () => {
    const inv = makeInvoice(15000);
    const res = collectMixedPayment(inv.invoiceId, [
      { channel: 'Cash', amount: 5000 }, { channel: 'POS Card', amount: 10000 },
    ], 'Tester');
    expect(res.ok).toBe(true);
    expect(db.invoices.get(inv.invoiceId)!.status).toBe('PAID');
  });

  it('runs the refund approval workflow and restores invoice balance', () => {
    const inv = makeInvoice(8000);
    collectPayment({ invoiceId: inv.invoiceId, amount: 8000, channel: 'Cash', cashier: 'Tester' });
    const pay = db.payments.list().find(p => p.invoiceId === inv.invoiceId)!;
    const req = requestRefund({ paymentId: pay.id, invoiceId: inv.invoiceId, patientId: inv.patientId, patientName: inv.patientName, amount: 8000, kind: 'REFUND', reason: 'Duplicate payment', method: 'Cash', requestedBy: 'Tester' });
    expect(req.ok).toBe(true);
    const ap = approveRefund(req.id!, 'Finance');
    expect(ap.ok).toBe(true);
    expect(db.invoices.get(inv.invoiceId)!.balance).toBe(8000);
    expect(db.refundRequests.get(req.id!)!.status).toBe('PAID');
  });

  it('refunds to wallet crediting the patient balance', () => {
    const p = anyPatient();
    const inv = makeInvoice(4000);
    collectPayment({ invoiceId: inv.invoiceId, amount: 4000, channel: 'Cash', cashier: 'Tester' });
    const pay = db.payments.list().find(x => x.invoiceId === inv.invoiceId)!;
    const before = db.wallets.getByPatient(p.id)?.balance ?? 0;
    const req = requestRefund({ paymentId: pay.id, invoiceId: inv.invoiceId, patientId: p.id, patientName: p.name, amount: 4000, kind: 'REFUND', reason: 'Service not rendered', method: 'Wallet', requestedBy: 'Tester' });
    approveRefund(req.id!, 'Finance');
    expect((db.wallets.getByPatient(p.id)!.balance)).toBe(before + 4000);
  });

  it('rejects a refund request without processing funds', () => {
    const inv = makeInvoice(3000);
    collectPayment({ invoiceId: inv.invoiceId, amount: 3000, channel: 'Cash', cashier: 'Tester' });
    const pay = db.payments.list().find(x => x.invoiceId === inv.invoiceId)!;
    const req = requestRefund({ paymentId: pay.id, invoiceId: inv.invoiceId, patientId: inv.patientId, patientName: inv.patientName, amount: 3000, kind: 'REFUND', reason: 'Testing reject', method: 'Cash', requestedBy: 'Tester' });
    rejectRefund(req.id!, 'Finance');
    expect(db.refundRequests.get(req.id!)!.status).toBe('REJECTED');
    expect(db.invoices.get(inv.invoiceId)!.balance).toBe(0);
  });

  it('applies an approved percentage discount to the invoice', () => {
    const inv = makeInvoice(10000);
    const req = requestDiscount({ invoiceId: inv.invoiceId, kind: 'PERCENT', value: 20, category: 'Percentage', reason: 'Welfare support', requestedBy: 'Tester' });
    expect(req.ok).toBe(true);
    approveDiscount(req.id!, 'Finance');
    const updated = db.invoices.get(inv.invoiceId)!;
    expect(updated.amount).toBe(8000);
    expect(updated.balance).toBe(8000);
  });

  it('full waiver clears the outstanding balance', () => {
    const inv = makeInvoice(12000);
    const req = requestDiscount({ invoiceId: inv.invoiceId, kind: 'WAIVER', value: 0, category: 'Full Waiver', reason: 'Emergency exemption', requestedBy: 'Tester' });
    approveDiscount(req.id!, 'Finance');
    expect(db.invoices.get(inv.invoiceId)!.balance).toBe(0);
  });

  it('verifies a receipt by its reference', () => {
    const inv = makeInvoice(2000);
    const r = collectPayment({ invoiceId: inv.invoiceId, amount: 2000, channel: 'Cash', cashier: 'Tester' });
    const v = verifyReceipt(r.receipt!);
    expect(v.ok).toBe(true);
    expect(verifyReceipt('RCP-doesnotexist').ok).toBe(false);
  });

  it('closes and approves a shift computing variance', () => {
    const inv = makeInvoice(5000);
    const shift = currentShift()!;
    collectPayment({ invoiceId: inv.invoiceId, amount: 5000, channel: 'Cash', cashier: shift.cashier });
    const expected = currentShift()!.expectedCash;
    const close = closeCashierShift(shift.id, expected + 500);
    expect(close.ok).toBe(true);
    expect(close.variance).toBe(500);
    const ap = approveShift(shift.id, 'Supervisor');
    expect(ap.ok).toBe(true);
    expect(db.cashierShifts.get(shift.id)!.status).toBe('APPROVED');
  });

  it('aggregates dashboard metrics, department revenue and patient history', () => {
    const p = anyPatient();
    const inv = makeInvoice(7000);
    collectPayment({ invoiceId: inv.invoiceId, amount: 7000, channel: 'POS Card', cashier: 'Tester' });
    const m = dashboardMetrics();
    expect(m.pos).toBeGreaterThanOrEqual(7000);
    expect(revenueByDepartment().length).toBeGreaterThan(0);
    expect(outstandingInvoices()).toBeDefined();
    const hist = patientPaymentHistory(p.id);
    expect(hist.payments.length).toBeGreaterThan(0);
  });
});
