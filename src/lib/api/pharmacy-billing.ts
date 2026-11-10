import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type PharmacyBill = {
  type: 'prescription' | 'walk_in';
  id: number;
  refNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string | null;
  total: number;
  paymentStatus: string;
  paymentChannel: string | null;
  status: string;
  createdAt: string | null;
  paidAt: string | null;
};

export type PharmacyBillingSummary = {
  paidCount: number;
  pendingCount: number;
  paidRxCount: number;
  paidWalkInCount: number;
  pendingRxCount: number;
  pendingWalkInCount: number;
  channelTotals: Record<string, number>;
  revenueTotal: number;
  from: string;
  to: string;
};

export function isPharmacyBillingApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getPharmacyBillingSummary(params?: {
  from?: string;
  to?: string;
}): Promise<PharmacyBillingSummary> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<PharmacyBillingSummary>>(
    `/api/pharmacy/billing/summary${suffix}`,
  );
  return body.data;
}

export async function listPharmacyBills(params?: {
  q?: string;
  paymentStatus?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<PharmacyBill>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.type) qs.set('type', params.type);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<PharmacyBill>>>(
    `/api/pharmacy/billing/bills?${qs}`,
  );
  return body.data;
}

export async function confirmPharmacyBill(
  type: 'prescription' | 'walk_in',
  id: number,
  payload: { paymentChannel: string; paymentRef?: string },
) {
  const body = await apiRequest<
    ApiEnvelope<{ type: string; bill: unknown }>
  >(`/api/pharmacy/billing/bills/${type}/${id}/confirm`, {
    method: 'POST',
    body: payload,
  });
  return body.data;
}
