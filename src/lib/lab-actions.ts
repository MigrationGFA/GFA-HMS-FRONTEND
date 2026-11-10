/**
 * Shared lab order mutations — LabFlowStore reads/writes db.orders (kind:'lab').
 * sendToBilling → generateInvoice creates real hospital invoices via billing-actions.
 */
import { db } from '@/db/database';
import { nextId, nowHuman, nowIso } from '@/db/ids';
import { sampleNo } from '@/lib/brand';
import { captureInvoicePayment, createInvoiceRecord } from '@/lib/billing-actions';
import { labFlowInputToOrder, orderToLabFlowRequest } from '@/lib/lab-order-map';
import type { Order } from '@/data-access/types';
import type { LabFlowRequest, LabFlowStatus } from '@/contexts/LabFlowStore';
import type { PaymentChannel } from '@/data-access/types';

const now = () => nowHuman();

const getLabOrder = (id: string): Order | undefined => {
  const o = db.orders.get(id);
  return o?.kind === 'lab' && o.labMeta ? o : undefined;
};

const patchLabOrder = (
  id: string,
  patch: Partial<Order>,
  action?: string,
  by = 'Lab User',
  note?: string,
) => {
  const order = getLabOrder(id);
  if (!order?.labMeta) return;
  const labMeta = order.labMeta;
  const nextMeta = patch.labMeta ?? labMeta;
  const audit = action
    ? [...nextMeta.audit, { action, by, at: now(), note }]
    : nextMeta.audit;

  db.orders.update(id, {
    ...patch,
    updatedAt: now(),
    labMeta: { ...nextMeta, audit },
  });
};

export function listLabFlowRequests(): LabFlowRequest[] {
  return db.orders.list()
    .filter(o => o.kind === 'lab' && o.labMeta)
    .map(orderToLabFlowRequest);
}

export function addLabOrder(
  input: Omit<LabFlowRequest, 'audit' | 'createdAt' | 'updatedAt' | 'status'> & { status?: LabFlowStatus },
): LabFlowRequest {
  const id = input.id || nextId('LAB');
  const timestamps = { createdAt: now(), updatedAt: now() };
  const row = labFlowInputToOrder(input, id, timestamps);
  db.orders.insert(row);
  db.emit('ORDER_CREATED', { orderId: id, kind: 'lab' });
  return orderToLabFlowRequest(row);
}

/** Lab Request Center: move to billing queue (invoice created separately in Lab Billing UI). */
export function sendLabOrderToBilling(id: string, by = 'Lab User') {
  patchLabOrder(id, { status: 'SENT_TO_BILLING' }, 'Sent to billing', by);
}

/** Lab Billing: create a real invoice in db so cashier / Billing Initiation can capture payment. */
export function generateLabInvoice(id: string, by = 'Cashier'): string {
  const order = getLabOrder(id);
  if (!order?.labMeta) return '';
  if (order.invoiceId && db.invoices.get(order.invoiceId)) return order.invoiceId;

  const amount = order.items.reduce((s, t) => s + t.price, 0);
  const patient = db.patients.get(order.patientId);
  const inv = createInvoiceRecord({
    patientName: order.labMeta.patientName,
    hospitalId: patient?.hospitalId ?? order.labMeta.hospitalNo,
    phone: patient?.phone ?? '',
    department: 'Laboratory',
    amount,
    source: 'Lab',
    lines: order.items.map(t => ({
      desc: t.name,
      qty: 1,
      unitPrice: t.price,
      source: 'Lab',
    })),
  });

  patchLabOrder(
    id,
    { status: 'AWAITING_PAYMENT', invoiceId: inv.invoiceId },
    `Invoice ${inv.invoiceId} generated`,
    by,
  );
  return inv.invoiceId;
}

const payChannel = (method: 'Cash' | 'POS' | 'Transfer' | 'Wallet'): PaymentChannel => {
  switch (method) {
    case 'POS': return 'POS Card';
    case 'Transfer': return 'Bank Transfer';
    case 'Wallet': return 'Wallet';
    default: return 'Cash';
  }
};

/** Lab Billing "Mark as Paid" — records payment in shared billing db (triggers INVOICE_PAID). */
export function markLabOrderPaid(
  id: string,
  p: { amount: number; method: 'Cash' | 'POS' | 'Transfer' | 'Wallet'; ref: string; cashier: string },
) {
  let order = getLabOrder(id);
  if (!order) return;

  if (!order.invoiceId || !db.invoices.get(order.invoiceId)) {
    generateLabInvoice(id, p.cashier);
    order = getLabOrder(id);
  }
  if (!order?.invoiceId) return;

  const result = captureInvoicePayment({
    invoiceId: order.invoiceId,
    amount: p.amount,
    channel: payChannel(p.method),
    cashier: p.cashier,
    bankRef: p.ref,
    terminal: p.method === 'POS' ? p.ref : undefined,
  });

  if (result.ok) {
    patchLabOrder(
      id,
      {
        status: 'PAID',
        labMeta: {
          ...order.labMeta!,
          paymentType: p.method === 'POS' ? 'POS' : p.method,
          paymentRef: result.receipt,
          cashier: p.cashier,
        },
      },
      `Payment captured ₦${p.amount.toLocaleString()} via ${p.method}`,
      p.cashier,
    );
  }
}

export function onInvoicePaidForLab(invoiceId: string) {
  const order = db.orders.list().find(o => o.invoiceId === invoiceId && o.kind === 'lab');
  if (!order || order.status === 'PAID') return;
  db.orders.update(order.id, { status: 'PAID', updatedAt: nowIso() });
}

export function patchLabOrderStatus(
  id: string,
  status: LabFlowStatus,
  patch: Partial<Order['labMeta']> = {},
  action?: string,
  by = 'Lab User',
  note?: string,
) {
  const order = getLabOrder(id);
  if (!order?.labMeta) return;
  patchLabOrder(id, { status, labMeta: { ...order.labMeta, ...patch } }, action, by, note);
}

export function newLabSampleId(): string {
  const key = nextId('SMP');
  return sampleNo(Number(key.split('-')[1]));
}
