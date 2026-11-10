import { apiRequest } from './client';
import { env } from '../env';

export type AdmissionStatus =
  | 'PENDING'
  | 'BED_ALLOCATED'
  | 'ADMITTED'
  | 'ON_LEAVE'
  | 'DISCHARGE_ORDERED'
  | 'DISCHARGED'
  | 'CANCELLED';

export type BedStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'CLEANING'
  | 'RESERVED'
  | 'OUT_OF_SERVICE';

export interface WardRecord {
  wardId: number;
  code: string;
  name: string;
  wardType: string | null;
  wardClass?: string | null;
  gender?: string | null;
  dailyBedRate?: number;
  admissionDepositDefault?: number;
  status: string;
  totalBeds?: number;
  availableBeds?: number;
  occupiedBeds?: number;
}

export interface BedRecord {
  bedId: number;
  wardId: number;
  label: string;
  status: BedStatus | string;
  ward?: { wardId: number; code: string; name: string } | null;
}

export interface AdmissionPerson {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
}

export interface AdmissionRecord {
  admissionId: number;
  personId: number;
  wardId: number | null;
  bedId: number | null;
  diagnosis: string | null;
  consultant: string | null;
  assignedNurse: string | null;
  admissionType: string | null;
  supervisionLevel: string | null;
  status: AdmissionStatus | string;
  admittedAt: string;
  dischargeOrderedAt: string | null;
  dischargeOrderedBy: string | null;
  dischargeReason: string | null;
  dischargedAt: string | null;
  dischargedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: AdmissionPerson | null;
  ward: { wardId: number; code: string; name: string } | null;
  bed: { bedId: number; label: string; status: string } | null;
}

export interface AdmissionStats {
  active: number;
  availableBeds: number;
  dischargeOrdered: number;
  constantSupervision: number;
  admittedToday?: number;
  dischargedToday?: number;
  total?: number;
}

export interface CreateAdmissionPayload {
  personId: number;
  wardId: number;
  bedId: number;
  diagnosis?: string;
  consultant?: string;
  assignedNurse?: string;
  admissionType?: string;
  supervisionLevel?: string;
  admittedAt?: string;
  admissionRequestId?: number;
}

export type AdmitResult = AdmissionRecord & {
  admissionBill?: {
    admissionBillId: number;
    billNo: string;
    totalAmount: number;
    paymentStatus: string;
  };
};

type ApiEnvelope<T> = { data: T };

type ListEnvelope<T> = { items: T[]; meta?: { page: number; limit: number; total: number } };

export function isAdmissionsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function admissionPersonDisplayName(
  person: AdmissionPerson | null | undefined,
) {
  if (!person) return '—';
  return (
    [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ') || '—'
  );
}

function unwrapList<T>(data: ListEnvelope<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}

export async function listWards(params?: {
  status?: string;
  q?: string;
  personSex?: string;
}): Promise<WardRecord[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.personSex) qs.set('personSex', params.personSex);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<ListEnvelope<WardRecord> | WardRecord[]>>(
    `/api/admissions/wards${suffix}`,
  );
  return unwrapList(body.data);
}

export async function createWard(payload: {
  code: string;
  name: string;
  wardType?: string;
  wardClass?: string;
  gender?: string;
  dailyBedRate?: number;
  admissionDepositDefault?: number;
  bedCount?: number;
}): Promise<WardRecord & { bedsCreated?: number }> {
  const body = await apiRequest<ApiEnvelope<WardRecord & { bedsCreated?: number }>>(
    '/api/admissions/wards',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listBeds(params?: {
  wardId?: number;
  status?: string;
}): Promise<BedRecord[]> {
  const qs = new URLSearchParams();
  if (params?.wardId != null) qs.set('wardId', String(params.wardId));
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<ListEnvelope<BedRecord> | BedRecord[]>>(
    `/api/admissions/beds${suffix}`,
  );
  return unwrapList(body.data);
}

export async function listAdmissions(params?: {
  status?: string;
  q?: string;
  wardId?: number;
  page?: number;
  limit?: number;
}): Promise<{ items: AdmissionRecord[]; meta?: { page: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.wardId != null) qs.set('wardId', String(params.wardId));
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<AdmissionRecord> | AdmissionRecord[]>
  >(`/api/admissions${suffix}`);
  if (Array.isArray(body.data)) {
    return { items: body.data };
  }
  return body.data;
}

export async function getAdmissionStats(): Promise<AdmissionStats> {
  const body = await apiRequest<ApiEnvelope<AdmissionStats>>(
    '/api/admissions/stats',
  );
  return body.data;
}

export async function getAdmission(id: number): Promise<AdmissionRecord> {
  const body = await apiRequest<ApiEnvelope<AdmissionRecord>>(
    `/api/admissions/${id}`,
  );
  return body.data;
}

export async function createAdmission(
  payload: CreateAdmissionPayload,
): Promise<AdmitResult> {
  const body = await apiRequest<ApiEnvelope<AdmitResult>>('/api/admissions', {
    method: 'POST',
    body: {
      personId: payload.personId,
      wardId: payload.wardId,
      bedId: payload.bedId,
      diagnosis: payload.diagnosis,
      consultant: payload.consultant,
      admissionType: payload.admissionType,
      supervisionLevel: payload.supervisionLevel,
      admissionRequestId: payload.admissionRequestId,
    },
  });
  return body.data;
}

export async function transferAdmission(
  id: number,
  payload: { bedId: number },
): Promise<AdmissionRecord> {
  const body = await apiRequest<ApiEnvelope<AdmissionRecord>>(
    `/api/admissions/${id}/transfer`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function orderDischarge(
  id: number,
  payload: { reason?: string } = {},
): Promise<AdmissionRecord> {
  const body = await apiRequest<ApiEnvelope<AdmissionRecord>>(
    `/api/admissions/${id}/order-discharge`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function completeDischarge(
  id: number,
): Promise<AdmissionRecord> {
  const body = await apiRequest<ApiEnvelope<AdmissionRecord>>(
    `/api/admissions/${id}/complete-discharge`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}
