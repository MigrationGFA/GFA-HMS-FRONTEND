import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type MasterServiceStatus =
  | 'DRAFT'
  | 'PENDING_PRICING'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REJECTED';

export type ServiceCategory = {
  categoryId: number;
  code: string;
  name: string;
  status: string;
};

export type ServiceDepartment = {
  departmentId: number;
  name: string;
  code: string | null;
  status: string;
};

export type ServicePayer = {
  payerId: number;
  payerType: string;
  code: string;
  name: string;
  status: string;
};

export type ServicePayerPrice = {
  payerPriceId: number;
  payerId: number;
  payerType: string;
  payerCode: string;
  payerName: string;
  amount: number;
  effectiveFrom: string;
  status: string;
};

export type DeliveryMode = 'PHYSICAL' | 'ONLINE' | 'BOTH';

export type BookingSettings = {
  onlineBookable: boolean;
  deliveryMode: DeliveryMode | string;
  durationMinutes: number;
  dayStart: string;
  dayEnd: string;
  staffPoolSize?: number;
  onlineSlotLimit?: number;
};

export type MasterService = {
  serviceId: number;
  serviceCode: string;
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  departmentId: number;
  departmentCode: string | null;
  departmentName: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  generalPrice: number | null;
  staffPrice: number | null;
  onlineBookable: boolean;
  appointmentRequired: boolean;
  requiresDoctorOrder: boolean;
  insuranceEligible: boolean;
  ageRestriction: string | null;
  genderRestriction: string | null;
  status: MasterServiceStatus | string;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  bookingSettings?: BookingSettings;
  payerPrices: ServicePayerPrice[];
  recentApprovals: Array<{
    approvalId: number;
    action: string;
    actorLabel: string | null;
    notes: string | null;
    priceSnapshot: unknown;
    createdAt: string;
  }>;
};

export type BookableService = {
  serviceId: number;
  serviceCode: string;
  name: string;
  categoryName: string;
  categoryCode: string;
  departmentName: string;
  departmentCode: string | null;
  generalPrice: number | null;
  durationMinutes: number | null;
  deliveryMode: DeliveryMode | string;
  dayStart?: string;
  dayEnd?: string;
  staffPoolSize?: number;
  onlineSlotLimit?: number;
  appointmentRequired: boolean;
};

export type PagedServices = {
  items: MasterService[];
  meta: { total: number; page: number; limit: number; pageCount: number };
};

export function isBillingServicesApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listServiceCategories(): Promise<{ items: ServiceCategory[] }> {
  const body = await apiRequest<ApiEnvelope<{ items: ServiceCategory[] }>>(
    '/api/billing/service-categories',
  );
  return body.data;
}

export async function listServiceDepartments(params?: {
  status?: string;
  q?: string;
}): Promise<{ items: ServiceDepartment[] }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ServiceDepartment[] }>>(
    `/api/billing/departments${suffix}`,
  );
  return body.data;
}

export async function listMasterServices(params?: {
  categoryId?: number;
  departmentId?: number;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<PagedServices> {
  const qs = new URLSearchParams();
  if (params?.categoryId != null) qs.set('categoryId', String(params.categoryId));
  if (params?.departmentId != null) qs.set('departmentId', String(params.departmentId));
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<PagedServices>>(
    `/api/billing/services${suffix}`,
  );
  return body.data;
}

export async function getMasterService(id: number): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}`,
  );
  return body.data;
}

export async function createMasterService(input: {
  categoryId: number;
  departmentId: number;
  name: string;
  description?: string;
  durationMinutes?: number;
  onlineBookable?: boolean;
  deliveryMode?: DeliveryMode;
  dayStart?: string;
  dayEnd?: string;
  staffPoolSize?: number;
  onlineSlotLimit?: number;
  appointmentRequired?: boolean;
  requiresDoctorOrder?: boolean;
  insuranceEligible?: boolean;
}): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>('/api/billing/services', {
    method: 'POST',
    body: input,
  });
  return body.data;
}

export async function updateMasterService(
  id: number,
  input: Partial<{
    categoryId: number;
    departmentId: number;
    name: string;
    description: string | null;
    durationMinutes: number | null;
    onlineBookable: boolean;
    deliveryMode: DeliveryMode;
    dayStart: string;
    dayEnd: string;
    staffPoolSize: number;
    onlineSlotLimit: number;
    appointmentRequired: boolean;
    requiresDoctorOrder: boolean;
    insuranceEligible: boolean;
    status: string;
  }>,
): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}`,
    { method: 'PATCH', body: input },
  );
  return body.data;
}

export async function setServicePricing(
  id: number,
  input: {
    generalPrice: number;
    staffPrice?: number | null;
    payerPrices?: Array<{ payerId: number; amount: number }>;
    submitForApproval?: boolean;
  },
): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}/pricing`,
    { method: 'PATCH', body: input },
  );
  return body.data;
}

export async function submitServiceApproval(id: number): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}/submit-approval`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function approveService(
  id: number,
  notes?: string,
): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}/approve`,
    { method: 'POST', body: { notes } },
  );
  return body.data;
}

export async function rejectService(
  id: number,
  notes?: string,
): Promise<MasterService> {
  const body = await apiRequest<ApiEnvelope<MasterService>>(
    `/api/billing/services/${id}/reject`,
    { method: 'POST', body: { notes } },
  );
  return body.data;
}

export async function listServicePayers(params?: {
  payerType?: string;
  status?: string;
}): Promise<{ items: ServicePayer[] }> {
  const qs = new URLSearchParams();
  if (params?.payerType) qs.set('payerType', params.payerType);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ServicePayer[] }>>(
    `/api/billing/service-payers${suffix}`,
  );
  return body.data;
}

/** Public landing catalog — no auth. */
export async function listBookableServices(params?: {
  q?: string;
  categoryId?: number;
}): Promise<{ items: BookableService[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.categoryId != null) qs.set('categoryId', String(params.categoryId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: BookableService[] }>>(
    `/api/billing/services/bookable${suffix}`,
    { auth: false },
  );
  return body.data;
}
