import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ReferralStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'QueuedForDept'
  | 'AwaitingBed'
  | 'BedAllocated'
  | 'Admitted'
  | 'Accepted'
  | 'InAttendance'
  | 'Completed'
  | 'ClearedExternal'
  | 'Returned'
  | 'Rejected'
  | 'Cancelled';

export type ReferralKind = 'Internal' | 'External';
export type CareSetting = 'Outpatient' | 'Inpatient';
export type ReferralPriority = 'Routine' | 'Urgent' | 'Emergency';

export type ApiReferralPerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
};

export type ApiReferralEvent = {
  eventId: number;
  eventType: string;
  actorUserId: number | null;
  actorLabel: string | null;
  note: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
};

export type ApiReferral = {
  referralId: number;
  referralNo: string;
  personId: number;
  encounterId: number | null;
  admissionId: number | null;
  referralKind: ReferralKind | string;
  careSetting: CareSetting | string;
  priority: ReferralPriority | string;
  fromDepartment: string | null;
  toDepartment: string | null;
  toDoctorUserId: number | null;
  toDoctorLabel: string | null;
  externalFacility: string | null;
  externalContact: string | null;
  externalAddress: string | null;
  reason: string;
  provisionalDiagnosis: string | null;
  clinicalSummary: string | null;
  specificQuestion: string | null;
  outcomeNote: string | null;
  status: ReferralStatus | string;
  requestedByUserId: number | null;
  ackedAt: string | null;
  routedAt: string | null;
  allocatedAt: string | null;
  allocatedWardId: number | null;
  allocatedBedId: number | null;
  acceptedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  returnReason: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiReferralPerson | null;
  allocatedWard: { wardId: number; code: string; name: string } | null;
  allocatedBed: {
    bedId: number;
    label: string;
    status: string;
    wardId: number;
  } | null;
  events: ApiReferralEvent[];
};

export type CreateReferralPayload = {
  personId: number;
  encounterId?: number;
  referralKind: ReferralKind;
  careSetting?: CareSetting;
  priority?: ReferralPriority;
  fromDepartment?: string;
  toDepartment?: string;
  toDoctorUserId?: number;
  toDoctorLabel?: string;
  externalFacility?: string;
  externalContact?: string;
  externalAddress?: string;
  reason: string;
  provisionalDiagnosis?: string;
  clinicalSummary?: string;
  specificQuestion?: string;
};

export function isReferralsApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function referralPatientName(r: ApiReferral): string {
  const p = r.person;
  if (!p) return `Person #${r.personId}`;
  return (
    [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') ||
    p.hospitalNo ||
    `#${r.personId}`
  );
}

export function clearDoctorReferralMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = [
    'gfa_doc_referral_audit_v1',
    'gfa_doc_referral_timeline_v1',
    'gfa_doc_referral_requests_v1',
    'gfa_dept_referral_inbound_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function listReferrals(params?: {
  scope?: 'mine' | 'inbound' | 'all';
  status?: string;
  kind?: string;
  toDepartment?: string;
  careSetting?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiReferral>> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.status) qs.set('status', params.status);
  if (params?.kind) qs.set('kind', params.kind);
  if (params?.toDepartment) qs.set('toDepartment', params.toDepartment);
  if (params?.careSetting) qs.set('careSetting', params.careSetting);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<Paged<ApiReferral>>>(
    `/api/referrals${q ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function getReferral(id: number): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}`);
  return res.data;
}

export async function createReferral(payload: CreateReferralPayload): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>('/api/referrals', {
    method: 'POST',
    body: payload,
  });
  return res.data;
}

export async function ackReferral(id: number, body?: { note?: string }): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/ack`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function routeReferral(
  id: number,
  body: {
    toDepartment?: string;
    toDoctorUserId?: number;
    toDoctorLabel?: string;
    note?: string;
  },
): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/route`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function requestBedReferral(
  id: number,
  body?: { note?: string },
): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(
    `/api/referrals/${id}/request-bed`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function allocateReferral(
  id: number,
  body: { wardId: number; bedId: number; note?: string },
): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/allocate`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function admitReferral(id: number, body?: { note?: string }): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/admit`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function acceptReferral(id: number, body?: { note?: string }): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/accept`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function attendReferral(id: number, body?: { note?: string }): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/attend`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function completeReferral(
  id: number,
  body?: { outcomeNote?: string },
): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/complete`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function clearExternalReferral(
  id: number,
  body?: { note?: string },
): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(
    `/api/referrals/${id}/clear-external`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function returnReferral(id: number, reason: string): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/return`, {
    method: 'PATCH',
    body: { reason },
  });
  return res.data;
}

export async function rejectReferral(id: number, reason: string): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/reject`, {
    method: 'PATCH',
    body: { reason },
  });
  return res.data;
}

export async function cancelReferral(id: number, reason?: string): Promise<ApiReferral> {
  const res = await apiRequest<ApiEnvelope<ApiReferral>>(`/api/referrals/${id}/cancel`, {
    method: 'PATCH',
    body: { reason },
  });
  return res.data;
}
