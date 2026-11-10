import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  generateLabInvoice,
  markLabOrderPaid,
  onInvoicePaidForLab,
  sendLabOrderToBilling,
} from '@/lib/lab-actions';
import { captureInvoicePayment } from '@/lib/billing-actions';

describe('lab-actions (STEP-09)', () => {
  beforeEach(() => {
    db._testReset();
  });

  afterEach(() => {
    clear();
    db._testReset();
  });

  it('seeds 7 lab orders in db', () => {
    const lab = db.orders.list().filter(o => o.kind === 'lab');
    expect(lab.length).toBe(7);
    expect(lab.find(o => o.id === 'LAB-3201')?.status).toBe('PENDING_DOCTOR');
  });

  it('sendToBilling → generateInvoice creates a real invoice in db.invoices', () => {
    sendLabOrderToBilling('LAB-3201', 'Lab Officer');
    expect(db.orders.get('LAB-3201')?.status).toBe('SENT_TO_BILLING');

    const invoiceId = generateLabInvoice('LAB-3201', 'Cashier');
    expect(invoiceId).toMatch(/^INV-\d{6}$/);

    const inv = db.invoices.get(invoiceId);
    expect(inv?.department).toBe('Laboratory');
    expect(inv?.amount).toBe(5500);
    expect(inv?.lines?.some(l => l.source === 'Lab')).toBe(true);

    const order = db.orders.get('LAB-3201');
    expect(order?.status).toBe('AWAITING_PAYMENT');
    expect(order?.invoiceId).toBe(invoiceId);
  });

  it('cashier capture via billing-actions flips lab order to PAID', () => {
    sendLabOrderToBilling('LAB-3202', 'Lab');
    const invoiceId = generateLabInvoice('LAB-3202', 'Cashier');

    const result = captureInvoicePayment({
      invoiceId,
      amount: 12000,
      channel: 'POS Card',
      cashier: 'Hafsat Bello',
      terminal: 'POS-A12',
    });
    expect(result.ok).toBe(true);

    onInvoicePaidForLab(invoiceId);
    expect(db.orders.get('LAB-3202')?.status).toBe('PAID');
  });

  it('markLabOrderPaid records payment and persists after reload', () => {
    sendLabOrderToBilling('LAB-3201', 'Lab');
    generateLabInvoice('LAB-3201', 'Cashier');

    markLabOrderPaid('LAB-3201', {
      amount: 5500,
      method: 'Cash',
      ref: 'CASH-001',
      cashier: 'Cashier Kemi',
    });

    expect(db.orders.get('LAB-3201')?.status).toBe('PAID');
    const snap = JSON.parse(localStorage.getItem('gfa_db_v1') ?? '{}');
    expect(snap.orders.find((o: { id: string }) => o.id === 'LAB-3201')?.status).toBe('PAID');
  });
});
