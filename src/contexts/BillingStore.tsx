// Shared Billing Store (P0)
// Single source of truth for visits, invoices, transactions and audit.
// Cashier captures here → Doctor's consultation gate unlocks here → everyone reads here.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { db } from '@/db/database';
import { nowHuman } from '@/db/ids';
import { useDbTick } from '@/contexts/DatabaseProvider';
import {
  captureInvoicePayment,
  createInvoiceRecord,
  toAuditLog,
} from '@/lib/billing-actions';
import type {
  Visit,
  BillingInvoice,
  BillingTxn,
  AuditLog,
  PaymentChannel,
} from '@/data/billingData';

type CaptureInput = {
  invoiceId: string;
  amount: number;
  channel: PaymentChannel;
  cashier?: string;
  terminal?: string;
  bankRef?: string;
};

type OverrideInput = {
  visitCode: string;
  doctor: string;
  reason: string;
};

type CreateInvoiceInput = {
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  amount: number;
  visitCode?: string;
  source?: string;
};

type ShiftState = {
  open: boolean;
  cashier: string;
  openedAt?: string;
  openingFloat: number;
  cashIn: number;
  totalCollected: number;
};

interface BillingStoreCtx {
  visits: Visit[];
  invoices: BillingInvoice[];
  txns: BillingTxn[];
  audit: AuditLog[];
  shift: ShiftState;

  capturePayment: (input: CaptureInput) => { ok: boolean; receipt?: string; message: string };
  emergencyOverride: (input: OverrideInput) => void;
  resendPayLink: (invoiceId: string) => void;
  createInvoice: (input: CreateInvoiceInput) => BillingInvoice;
  reverseTxn: (txnId: string, reason: string, supervisor: string) => void;
  reprintReceipt: (txnId: string, by: string) => { ok: boolean; message: string };
  openShift: (cashier: string, openingFloat: number) => void;
  closeShift: () => void;
  logAudit: (entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }) => void;
}

const Ctx = createContext<BillingStoreCtx | null>(null);

export const BillingStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const _tick = useDbTick();
  const [shift, setShift] = useState<ShiftState>({
    open: true,
    cashier: 'Hafsat Bello',
    openedAt: '2026-04-28 07:30',
    openingFloat: 20000,
    cashIn: 0,
    totalCollected: 0,
  });

  const visits = db.visits.list().slice() as Visit[];
  const invoices = db.invoices.list().slice() as BillingInvoice[];
  const txns = db.payments.list().slice() as BillingTxn[];
  const audit = db.audit.list().map(toAuditLog);

  const logAudit = useCallback<BillingStoreCtx['logAudit']>((entry) => {
    db.audit.add({
      actor: entry.actor,
      role: entry.role,
      action: entry.action,
      entity: 'invoice',
      entityId: entry.invoiceRef,
      invoiceRef: entry.invoiceRef,
      channel: entry.channel,
    });
  }, []);

  const capturePayment = useCallback<BillingStoreCtx['capturePayment']>((input) => {
    if (!shift.open && (input.channel === 'Cash' || input.channel === 'POS Card')) {
      return { ok: false, message: 'Shift is closed. Open shift before capturing cash/POS.' };
    }
    const result = captureInvoicePayment(input);
    if (!result.ok) return result;

    if (input.channel === 'Cash' || input.channel === 'POS Card') {
      setShift(s => ({
        ...s,
        cashIn: input.channel === 'Cash' ? s.cashIn + result.amount : s.cashIn,
        totalCollected: s.totalCollected + result.amount,
      }));
    }

    return { ok: true, receipt: result.receipt, message: result.message };
  }, [shift.open]);

  const emergencyOverride = useCallback<BillingStoreCtx['emergencyOverride']>(({ visitCode, doctor, reason }) => {
    const visit = db.visits.get(visitCode);
    db.visits.update(visitCode, {
      consultationUnlocked: true,
      emergencyOverride: { doctor, reason, timestamp: nowHuman(), reviewed: false },
    });
    db.audit.add({
      actor: doctor,
      role: 'Doctor',
      action: `EMERGENCY OVERRIDE — ${reason}`,
      entity: 'visit',
      entityId: visitCode,
      invoiceRef: visit?.invoiceId ?? visitCode,
    });
  }, []);

  const resendPayLink = useCallback<BillingStoreCtx['resendPayLink']>((invoiceId) => {
    const inv = db.invoices.get(invoiceId);
    if (!inv) return;
    db.audit.add({
      actor: 'System',
      role: 'Notification',
      action: `SMS pay link re-sent to ${inv.phone}`,
      entity: 'invoice',
      entityId: invoiceId,
      invoiceRef: invoiceId,
      channel: 'SMS Pay Link',
    });
  }, []);

  const createInvoice = useCallback<BillingStoreCtx['createInvoice']>((input) => {
    return createInvoiceRecord(input) as BillingInvoice;
  }, []);

  const reverseTxn = useCallback<BillingStoreCtx['reverseTxn']>((txnId, reason, supervisor) => {
    const t = db.payments.list().find(x => x.id === txnId);
    if (!t) return;
    db.payments.update(txnId, { status: 'FAILED', matched: false });
    const inv = db.invoices.get(t.invoiceId);
    if (inv) {
      db.invoices.update(t.invoiceId, {
        amountPaid: Math.max(0, inv.amountPaid - t.amount),
        balance: inv.balance + t.amount,
        status: 'PARTIAL',
      });
    }
    db.audit.add({
      actor: supervisor,
      role: 'Supervisor',
      action: `REVERSAL of ${t.ref} (₦${t.amount.toLocaleString()}) — ${reason}`,
      entity: 'payment',
      entityId: txnId,
      invoiceRef: t.invoiceId,
      channel: t.channel,
    });
  }, []);

  const reprintReceipt = useCallback<BillingStoreCtx['reprintReceipt']>((txnId, by) => {
    const t = db.payments.list().find(x => x.id === txnId);
    if (!t) return { ok: false, message: 'Receipt not found' };
    db.audit.add({
      actor: by,
      role: 'Cashier',
      action: `Reprinted receipt ${t.ref} (₦${t.amount.toLocaleString()})`,
      entity: 'payment',
      entityId: txnId,
      invoiceRef: t.invoiceId,
      channel: t.channel,
    });
    return { ok: true, message: `Receipt ${t.ref} sent to printer` };
  }, []);

  const openShift = useCallback<BillingStoreCtx['openShift']>((cashier, openingFloat) => {
    setShift({ open: true, cashier, openedAt: nowHuman(), openingFloat, cashIn: 0, totalCollected: 0 });
    db.audit.add({
      actor: cashier,
      role: 'Cashier',
      action: `Opened shift with float ₦${openingFloat.toLocaleString()}`,
      entity: 'shift',
      entityId: '—',
      invoiceRef: '—',
    });
  }, []);

  const closeShift = useCallback<BillingStoreCtx['closeShift']>(() => {
    db.audit.add({
      actor: shift.cashier,
      role: 'Cashier',
      action: `Closed shift. Collected ₦${shift.totalCollected.toLocaleString()} (cash ₦${shift.cashIn.toLocaleString()})`,
      entity: 'shift',
      entityId: '—',
      invoiceRef: '—',
    });
    setShift(s => ({ ...s, open: false }));
  }, [shift.cashier, shift.totalCollected, shift.cashIn]);

  const value = useMemo<BillingStoreCtx>(() => ({
    visits,
    invoices,
    txns,
    audit,
    shift,
    capturePayment,
    emergencyOverride,
    resendPayLink,
    createInvoice,
    reverseTxn,
    reprintReceipt,
    openShift,
    closeShift,
    logAudit,
  }), [
    _tick,
    visits,
    invoices,
    txns,
    audit,
    shift,
    capturePayment,
    emergencyOverride,
    resendPayLink,
    createInvoice,
    reverseTxn,
    reprintReceipt,
    openShift,
    closeShift,
    logAudit,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useBillingStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBillingStore must be used within BillingStoreProvider');
  return v;
};

export const useInvoice = (invoiceId?: string) => {
  const { invoices } = useBillingStore();
  return invoices.find(i => i.invoiceId === invoiceId);
};

export const useVisitByCode = (visitCode?: string) => {
  const { visits } = useBillingStore();
  return visits.find(v => v.visitCode === visitCode);
};
