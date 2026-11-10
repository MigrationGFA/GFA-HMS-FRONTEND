import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import { captureInvoicePayment, createInvoiceRecord, createVisitWithInvoice } from '@/lib/billing-actions';

describe('billing-actions (STEP-08)', () => {
  beforeEach(() => {
    db._testReset();
  });

  afterEach(() => {
    clear();
    db._testReset();
  });

  it('captureInvoicePayment unlocks consultation when invoice fully paid', () => {
    const visitBefore = db.visits.get('VST-30027');
    expect(visitBefore?.paymentStatus).toBe('UNPAID');
    expect(visitBefore?.consultationUnlocked).toBe(false);

    const result = captureInvoicePayment({
      invoiceId: 'INV-BIL-1003',
      amount: 10000,
      channel: 'POS Card',
      cashier: 'Test Cashier',
      terminal: 'POS-TEST',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const inv = db.invoices.get('INV-BIL-1003');
    expect(inv?.status).toBe('PAID');
    expect(inv?.balance).toBe(0);

    const visitAfter = db.visits.get('VST-30027');
    expect(visitAfter?.paymentStatus).toBe('PAID');
    expect(visitAfter?.consultationUnlocked).toBe(true);

    const snap = JSON.parse(localStorage.getItem('gfa_db_v1') ?? '{}');
    expect(snap.visits.find((v: { visitCode: string }) => v.visitCode === 'VST-30027')?.consultationUnlocked).toBe(true);
  });

  it('createInvoiceRecord inserts invoice with canonical invoiceNo format', () => {
    const inv = createInvoiceRecord({
      patientName: 'John Doe',
      hospitalId: 'GFA/HMS/2026/000145',
      phone: '08012345678',
      department: 'Laboratory',
      amount: 5000,
      source: 'Lab',
    });

    expect(inv.invoiceId).toMatch(/^INV-\d{6}$/);
    expect(db.invoices.get(inv.invoiceId)?.amount).toBe(5000);
  });

  it('createVisitWithInvoice links visit and invoice in db', () => {
    const { visit, invoice } = createVisitWithInvoice({
      patientName: 'John Doe',
      department: 'Internal Medicine',
      type: 'OPD',
      triagePriority: 'Routine',
      amount: 10000,
      source: 'Records',
    });
    expect(visit.invoiceId).toBe(invoice.invoiceId);
    expect(db.visits.get(visit.visitCode)?.consultationUnlocked).toBe(false);
    expect(db.invoices.get(invoice.invoiceId)?.balance).toBe(10000);
  });

  it('partial payment does not unlock consultation', () => {
    const result = captureInvoicePayment({
      invoiceId: 'INV-BIL-1006',
      amount: 5000,
      channel: 'Cash',
      cashier: 'Test Cashier',
    });

    expect(result.ok).toBe(true);
    const visit = db.visits.get('VST-30030');
    expect(visit?.paymentStatus).toBe('PARTIAL');
    expect(visit?.consultationUnlocked).toBe(false);
  });
});
