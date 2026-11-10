import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiAdmissionBillPerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  phone: string | null;
};

export type ApiAdmissionBillLine = {
  lineId: number;
  itemCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type ApiAdmissionBill = {
  admissionBillId: number;
  billNo: string;
  personId: number;
  admissionId: number | null;
  admissionRequestId: number | null;
  totalAmount: number;
  paymentStatus: string;
  paymentChannel: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  paidBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiAdmissionBillPerson | null;
  admission: {
    admissionId: number;
    wardId: number | null;
    bedId: number | null;
    status: string;
  } | null;
  lines: ApiAdmissionBillLine[];
};

export function isAdmissionBillsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function admissionBillPatientName(
  person: ApiAdmissionBillPerson | null | undefined,
): string {
  if (!person) return 'Unknown';
  return (
    [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

export async function listAdmissionBills(params?: {
  paymentStatus?: string;
  personId?: number;
  admissionId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiAdmissionBill>> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiAdmissionBill>>>(
    `/api/admission-bills?${qs}`,
  );
  return body.data;
}

export async function getAdmissionBill(id: number): Promise<ApiAdmissionBill> {
  const body = await apiRequest<ApiEnvelope<ApiAdmissionBill>>(
    `/api/admission-bills/${id}`,
  );
  return body.data;
}

export async function listCashierAdmissionBills(params?: {
  paymentStatus?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiAdmissionBill>> {
  const qs = new URLSearchParams();
  qs.set('paymentStatus', params?.paymentStatus ?? 'Unpaid');
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiAdmissionBill>>>(
    `/api/cashier/payments/admission-bills?${qs}`,
  );
  return body.data;
}

export async function confirmAdmissionBillPayment(
  id: number,
  payload: { paymentChannel: string; paymentRef?: string },
): Promise<ApiAdmissionBill> {
  const body = await apiRequest<ApiEnvelope<ApiAdmissionBill>>(
    `/api/cashier/payments/admission-bills/${id}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listAdmissionBillingItems(): Promise<{
  items: Array<{
    itemId: number;
    itemCode: string;
    name: string;
    category: string;
    unitPrice: number;
    status: string;
  }>;
}> {
  const body = await apiRequest<
    ApiEnvelope<{
      items: Array<{
        itemId: number;
        itemCode: string;
        name: string;
        category: string;
        unitPrice: number;
        status: string;
      }>;
    }>
  >(`/api/admissions/billing-items`);
  return body.data;
}
