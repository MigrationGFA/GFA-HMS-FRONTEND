import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type TransferStatus =
  | 'Draft'
  | 'Submitted'
  | 'NursePreparing'
  | 'AwaitingBed'
  | 'BedReserved'
  | 'ReceivingAccepted'
  | 'InTransit'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export type TransferType =
  | 'WardToWard'
  | 'ClinicToWard'
  | 'WardToClinic'
  | 'Department'
  | 'ICU'
  | 'ExternalReferral'
  | 'Theatre'
  | 'RadiologyEscort';

export type TransferPriority = 'Routine' | 'Urgent' | 'Emergency';

export type ApiTransferPerson = {
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

export type ApiTransferEvent = {
  eventId: number;
  eventType: string;
  actorUserId: number | null;
  actorLabel: string | null;
  note: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
};

export type ApiTransfer = {
  transferId: number;
  transferNo: string;
  personId: number;
  admissionId: number | null;
  transferType: TransferType | string;
  priority: TransferPriority | string;
  fromWardId: number | null;
  toWardId: number | null;
  toWardPreference: string | null;
  destinationLabel: string | null;
  allocatedBedId: number | null;
  reason: string;
  clinicalNotes: string | null;
  handoverNotes: string | null;
  status: TransferStatus | string;
  requestedByUserId: number | null;
  preparedByUserId: number | null;
  preparedAt: string | null;
  allocatedByUserId: number | null;
  allocatedAt: string | null;
  acceptedByUserId: number | null;
  acceptedAt: string | null;
  departedByUserId: number | null;
  departedAt: string | null;
  receivedByUserId: number | null;
  receivedAt: string | null;
  rejectionReason: string | null;
  externalFacility: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiTransferPerson | null;
  fromWard: { wardId: number; code: string; name: string; wardType: string | null; wardClass?: string | null } | null;
  toWard: { wardId: number; code: string; name: string; wardType: string | null; wardClass?: string | null } | null;
  allocatedBed: { bedId: number; label: string; status: string; wardId: number } | null;
  admission: {
    admissionId: number;
    status: string;
    wardId: number | null;
    bedId: number | null;
  } | null;
  events: ApiTransferEvent[];
};

export type CreateTransferPayload = {
  personId: number;
  admissionId?: number;
  transferType: TransferType;
  priority?: TransferPriority;
  fromWardId?: number;
  toWardId?: number;
  toWardPreference?: string;
  destinationLabel?: string;
  reason: string;
  clinicalNotes?: string;
  externalFacility?: string;
  skipPrepare?: boolean;
};

export function isTransfersApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function transferPatientName(t: ApiTransfer): string {
  const p = t.person;
  if (!p) return `Person #${t.personId}`;
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `#${t.personId}`;
}

export async function listTransfers(params?: {
  scope?: 'mine' | 'ward' | 'all';
  status?: string;
  personId?: number;
  admissionId?: number;
  fromWardId?: number;
  toWardId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiTransfer>> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.fromWardId != null) qs.set('fromWardId', String(params.fromWardId));
  if (params?.toWardId != null) qs.set('toWardId', String(params.toWardId));
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<Paged<ApiTransfer>>>(
    `/api/transfers${q ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function getTransfer(id: number): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}`);
  return res.data;
}

export async function createTransfer(payload: CreateTransferPayload): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>('/api/transfers', {
    method: 'POST',
    body: payload,
  });
  return res.data;
}

export async function prepareTransfer(
  id: number,
  body?: { note?: string; ready?: boolean },
): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/prepare`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function allocateTransfer(
  id: number,
  body: { wardId: number; bedId: number; note?: string },
): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/allocate`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function acceptTransfer(id: number, body?: { note?: string }): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/accept`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function departTransfer(
  id: number,
  body?: { handoverNotes?: string; note?: string },
): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/depart`, {
    method: 'PATCH',
    body: body ?? {},
  });
  return res.data;
}

export async function confirmArrivalTransfer(
  id: number,
  body?: { note?: string },
): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(
    `/api/transfers/${id}/confirm-arrival`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function rejectTransfer(id: number, reason: string): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/reject`, {
    method: 'PATCH',
    body: { reason },
  });
  return res.data;
}

export async function cancelTransfer(id: number, reason?: string): Promise<ApiTransfer> {
  const res = await apiRequest<ApiEnvelope<ApiTransfer>>(`/api/transfers/${id}/cancel`, {
    method: 'PATCH',
    body: { reason },
  });
  return res.data;
}
