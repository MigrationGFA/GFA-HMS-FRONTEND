import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type CashierReceipt = {
  receiptId: number;
  receiptNo: string;
  sourceType: string;
  sourceId: number;
  personId: number;
  amount: number;
  channel: string;
  paymentRef: string | null;
  cashierUserId: number | null;
  cashierLabel: string | null;
  paidAt: string;
  status: string;
  amountRefunded: number;
  refundableAmount: number;
  patientName: string | null;
  sourceRef: string | null;
};

export type CashierRefundRow = {
  refundId: number;
  refundNo: string;
  receiptId: number;
  receiptNo: string;
  patientName: string | null;
  amount: number;
  kind: string;
  method: string;
  reason: string;
  status: string;
  requestedBy: string | null;
  createdAt: string | null;
};

export type CashierDiscountRow = {
  discountId: number;
  discountNo: string;
  sourceType: string;
  sourceId: number;
  sourceRef: string | null;
  patientName: string | null;
  discKind: string;
  category: string;
  computedAmount: number;
  status: string;
  reason: string;
  createdAt: string | null;
};

export type EligibleDiscountBill = {
  sourceType: string;
  sourceId: number;
  sourceRef: string;
  personId: number;
  patientName: string;
  amount: number;
  department: string;
};

export type ShiftTotals = {
  cash: number;
  pos: number;
  transfer: number;
  online: number;
  wallet: number;
  nhia: number;
  hmo: number;
  refunds: number;
  captured: number;
};

export type CashierCurrentShift = {
  shiftId: number;
  shiftNo: string;
  cashierLabel: string;
  openingFloat: number;
  openedAt: string;
  status: string;
  totals: ShiftTotals;
  expectedCash: number;
};

export type CashierShiftRow = {
  shiftId: number;
  shiftNo: string;
  cashierLabel: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  actualCash: number | null;
  variance: number | null;
  expectedCash: number | null;
  status: string;
  note: string | null;
};

export function isCashierOpsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export type CashierPatientCompact = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  middleName?: string | null;
  lastName: string | null;
  patientPhoneNo: string | null;
};

export async function listRecentCashierPatients(limit = 10) {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await apiRequest<ApiEnvelope<{ items: CashierPatientCompact[] }>>(
    `/api/cashier/patients/recent?${qs}`,
  );
  return res.data.items;
}

export async function searchCashierPatients(q: string, limit = 20) {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  const res = await apiRequest<ApiEnvelope<{ items: CashierPatientCompact[] }>>(
    `/api/cashier/patients/search?${qs}`,
  );
  return res.data.items;
}

export async function listCashierReceipts(params?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      items: CashierReceipt[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/cashier/receipts${suffix}`);
  return res.data;
}

export async function listCashierRefunds(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      kpis: {
        pending: number;
        paid: number;
        rejected: number;
        totalRefunded: number;
      };
      items: CashierRefundRow[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/cashier/refunds${suffix}`);
  return res.data;
}

export async function createCashierRefund(payload: {
  receiptId: number;
  amount: number;
  kind: 'REFUND' | 'REVERSAL';
  method: string;
  reason: string;
}) {
  const res = await apiRequest<ApiEnvelope<{ refundId: number; refundNo: string; status: string }>>(
    '/api/cashier/refunds',
    { method: 'POST', body: payload },
  );
  return res.data;
}

export async function approveCashierRefund(id: number) {
  const res = await apiRequest<ApiEnvelope<{ refundId: number; status: string }>>(
    `/api/cashier/refunds/${id}/approve`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function rejectCashierRefund(id: number) {
  const res = await apiRequest<ApiEnvelope<{ refundId: number; status: string }>>(
    `/api/cashier/refunds/${id}/reject`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function listCashierDiscounts(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      kpis: { pending: number; approved: number; totalDiscounted: number };
      items: CashierDiscountRow[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/cashier/discounts${suffix}`);
  return res.data;
}

export async function listEligibleDiscountBills() {
  const res = await apiRequest<ApiEnvelope<{ items: EligibleDiscountBill[] }>>(
    '/api/cashier/discounts/eligible',
  );
  return res.data;
}

export async function createCashierDiscount(payload: {
  sourceType: string;
  sourceId: number;
  discKind: 'PERCENT' | 'FIXED' | 'WAIVER';
  value?: number;
  category: string;
  reason: string;
}) {
  const res = await apiRequest<
    ApiEnvelope<{ discountId: number; discountNo: string; status: string; computedAmount: number }>
  >('/api/cashier/discounts', { method: 'POST', body: payload });
  return res.data;
}

export async function approveCashierDiscount(id: number) {
  const res = await apiRequest<ApiEnvelope<{ discountId: number; status: string }>>(
    `/api/cashier/discounts/${id}/approve`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function rejectCashierDiscount(id: number) {
  const res = await apiRequest<ApiEnvelope<{ discountId: number; status: string }>>(
    `/api/cashier/discounts/${id}/reject`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function getCurrentCashierShift() {
  const res = await apiRequest<ApiEnvelope<{ shift: CashierCurrentShift | null }>>(
    '/api/cashier/shifts/current',
  );
  return res.data;
}

export async function listCashierShifts(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      items: CashierShiftRow[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/cashier/shifts${suffix}`);
  return res.data;
}

export async function openCashierShift(openingFloat: number) {
  const res = await apiRequest<ApiEnvelope<{ shiftId: number; shiftNo: string; status: string }>>(
    '/api/cashier/shifts/open',
    { method: 'POST', body: { openingFloat } },
  );
  return res.data;
}

export async function closeCashierShift(id: number, payload: { actualCash: number; note?: string }) {
  const res = await apiRequest<
    ApiEnvelope<{ shiftId: number; status: string; variance: number; expectedCash: number }>
  >(`/api/cashier/shifts/${id}/close`, { method: 'POST', body: payload });
  return res.data;
}

export async function approveCashierShift(id: number) {
  const res = await apiRequest<ApiEnvelope<{ shiftId: number; status: string }>>(
    `/api/cashier/shifts/${id}/approve`,
    { method: 'PATCH' },
  );
  return res.data;
}

export type CashierReportsResult = {
  from: string;
  to: string;
  kpis: {
    collected: number;
    refunds: number;
    receiptCount: number;
    outstanding: number;
    discounted: number;
  };
  bySource: { department: string; amount: number }[];
  byChannel: { channel: string; amount: number }[];
  outstandingItems: {
    ref: string;
    patientName: string;
    department: string;
    amount: number;
    createdAt: string | null;
    sourceType: string;
    sourceId: number;
  }[];
  partialErrors?: string[];
};

export type PatientPaymentHistory = {
  person: {
    personId: number;
    hospitalNo: string | null;
    firstName: string | null;
    middleName?: string | null;
    lastName: string | null;
    phone: string | null;
  };
  outstanding: number;
  receipts: {
    receiptNo: string;
    channel: string;
    amount: number;
    paidAt: string;
    sourceType: string;
    sourceRef: string | null;
    status: string;
  }[];
  outstandingBills: {
    sourceType: string;
    sourceRef: string;
    department: string;
    amount: number;
    paymentStatus: string;
  }[];
  refunds: {
    refundNo: string;
    amount: number;
    method: string;
    status: string;
  }[];
  wallet: { balance: number; enabled: boolean };
  walletTxns: {
    kind: string;
    amount: number;
    balanceAfter: number;
    by: string;
    at: string;
  }[];
  partialErrors?: string[];
};

export type CashierAuditRow = {
  auditId: number;
  time: string | null;
  actor: string;
  role: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  status: string;
};

export type CashierAuditStats = {
  totalToday: number;
  payments: number;
  refunds: number;
  discounts: number;
  shifts: number;
};

export type CashierSettings = {
  settingsId: number;
  cashEnabled: boolean;
  posEnabled: boolean;
  bankTransferEnabled: boolean;
  onlineCardEnabled: boolean;
  walletEnabled: boolean;
  nhiaEnabled: boolean;
  hmoEnabled: boolean;
  requireOpenShift: boolean;
  varianceTolerance: number;
  reprintWatermark: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export async function getPatientPaymentHistory(personId: number) {
  const res = await apiRequest<ApiEnvelope<PatientPaymentHistory>>(
    `/api/cashier/patients/${personId}/payment-history`,
  );
  return res.data;
}

export async function getCashierReports(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<ApiEnvelope<CashierReportsResult>>(
    `/api/cashier/reports${suffix}`,
  );
  return res.data;
}

export async function verifyCashierReceipt(receiptNo: string) {
  const qs = new URLSearchParams({ receiptNo });
  const res = await apiRequest<
    ApiEnvelope<{ valid: true; receipt: CashierReceipt }>
  >(`/api/cashier/receipts/verify?${qs}`);
  return res.data;
}

export async function reprintCashierReceipt(id: number) {
  const res = await apiRequest<
    ApiEnvelope<{
      receiptId: number;
      receiptNo: string;
      watermark: boolean;
      reprinted: boolean;
    }>
  >(`/api/cashier/receipts/${id}/reprint`, { method: 'POST' });
  return res.data;
}

export async function listCashierAudit(params?: {
  q?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      items: CashierAuditRow[];
      meta: { page: number; limit: number; total: number };
      stats: CashierAuditStats;
    }>
  >(`/api/cashier/audit${suffix}`);
  return res.data;
}

export async function getCashierAuditStats() {
  const res = await apiRequest<ApiEnvelope<CashierAuditStats>>(
    '/api/cashier/audit/stats',
  );
  return res.data;
}

export async function getCashierSettings() {
  const res = await apiRequest<ApiEnvelope<CashierSettings>>('/api/cashier/settings');
  return res.data;
}

export async function updateCashierSettings(
  payload: Partial<
    Omit<CashierSettings, 'settingsId' | 'updatedBy' | 'updatedAt'>
  >,
) {
  const res = await apiRequest<ApiEnvelope<CashierSettings>>('/api/cashier/settings', {
    method: 'PATCH',
    body: payload,
  });
  return res.data;
}
