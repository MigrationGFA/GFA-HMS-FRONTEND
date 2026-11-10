import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiWalkInSaleItem = {
  itemId: number;
  drugId: number;
  drugName: string;
  strength: string | null;
  form: string | null;
  unit: string | null;
  quantity: number;
  qtyDispensed: number;
  unitPrice: number;
  lineStatus: string;
  lineTotal: number;
};

export type ApiWalkInSalePerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
};

export type ApiWalkInSale = {
  saleId: number;
  saleNo: string;
  personId: number;
  status: string;
  paymentStatus: string;
  paymentChannel: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  paidBy: string | null;
  total: number;
  notes: string | null;
  dispensedAt: string | null;
  dispensedBy: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: ApiWalkInSaleItem[];
  person: ApiWalkInSalePerson | null;
};

export type CreateWalkInSalePayload = {
  personId?: number;
  customerName?: string;
  phone?: string;
  hospitalNo?: string;
  items: { drugId: number; quantity: number }[];
  preferredPaymentChannel?: string;
  notes?: string;
};

export async function createWalkInSale(
  payload: CreateWalkInSalePayload,
): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>('/api/pharmacy/walk-in', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function listWalkInSales(params?: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiWalkInSale>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.paymentStatus && params.paymentStatus !== 'all')
    qs.set('paymentStatus', params.paymentStatus);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiWalkInSale>>>(
    `/api/pharmacy/walk-in?${qs}`,
  );
  return body.data;
}

export async function getWalkInSale(id: number): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>(
    `/api/pharmacy/walk-in/${id}`,
  );
  return body.data;
}

export async function getWalkInSaleByNo(saleNo: string): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>(
    `/api/pharmacy/walk-in/by-no/${encodeURIComponent(saleNo)}`,
  );
  return body.data;
}

export async function dispenseWalkInSale(
  id: number,
  payload?: { pharmacyNotes?: string; items?: { itemId: number; quantity?: number }[] },
): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>(
    `/api/pharmacy/walk-in/${id}/dispense`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

export async function cancelWalkInSale(id: number): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>(
    `/api/pharmacy/walk-in/${id}/cancel`,
    { method: 'PATCH' },
  );
  return body.data;
}

/** Cashier queue for unpaid walk-in sales. */
export async function listCashierPharmacySales(params?: {
  paymentStatus?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiWalkInSale>> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiWalkInSale>>>(
    `/api/cashier/payments/pharmacy-sales?${qs}`,
  );
  return body.data;
}

export async function confirmWalkInSalePayment(
  saleId: number,
  payload: { paymentChannel: string; paymentRef?: string },
): Promise<ApiWalkInSale> {
  const body = await apiRequest<ApiEnvelope<ApiWalkInSale>>(
    `/api/cashier/payments/pharmacy-sales/${saleId}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export function isWalkInSalesApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function walkInCustomerName(person: ApiWalkInSalePerson | null | undefined): string {
  if (!person) return 'Walk-in customer';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || 'Walk-in customer';
}
