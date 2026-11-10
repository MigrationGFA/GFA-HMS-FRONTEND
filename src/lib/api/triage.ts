import { apiRequest } from './client';
import { env } from '../env';

export type TriageStatus =
  | 'Waiting'
  | 'In Triage'
  | 'Triage Completed'
  | 'Sent to Consultation'
  | 'In Consultation'
  | 'Cancelled';

export type TriagePriority =
  | 'Routine'
  | 'Urgent'
  | 'Emergency'
  | 'VIP'
  | 'Elderly / Special Needs';

export type TriagePersonSummary = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  bloodGroup: string | null;
};

export type TriageRecord = {
  triageId: number;
  personId: number;
  queueNo: string;
  clinic: string | null;
  status: TriageStatus | string;
  priority: TriagePriority | string;
  priorityReason: string | null;
  patientType: string | null;
  arrivalAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bloodPressure: string | null;
  temperatureC: number | null;
  pulseBpm: number | null;
  respiratoryRate: number | null;
  spo2Pct: number | null;
  notes: string | null;
  createdAt: string | null;
  person: TriagePersonSummary | null;
};

export type CreateTriagePayload = {
  personId: number;
  clinic?: string;
  status?: TriageStatus;
  priority?: TriagePriority;
  priorityReason?: string;
  patientType?: 'New' | 'Returning' | 'Emergency';
  arrivalAt?: string;
  weightKg?: number;
  heightCm?: number;
  bloodPressure?: string;
  temperatureC?: number;
  pulseBpm?: number;
  respiratoryRate?: number;
  spo2Pct?: number;
  notes?: string;
};

export type UpdateTriagePayload = Partial<Omit<CreateTriagePayload, 'personId' | 'arrivalAt'>>;

type ApiEnvelope<T> = { data: T };

export async function createTriage(payload: CreateTriagePayload): Promise<TriageRecord> {
  const body = await apiRequest<ApiEnvelope<TriageRecord>>('/api/triage', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function listTriage(params?: {
  status?: string;
  clinic?: string;
  priority?: string;
  q?: string;
}): Promise<TriageRecord[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.clinic) qs.set('clinic', params.clinic);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{ items: TriageRecord[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/triage${suffix}`);
  return body.data.items;
}

export async function updateTriage(
  triageId: number,
  payload: UpdateTriagePayload,
): Promise<TriageRecord> {
  const body = await apiRequest<ApiEnvelope<TriageRecord>>(`/api/triage/${triageId}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export function isTriageApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function personDisplayName(person: TriagePersonSummary | null | undefined) {
  if (!person) return '—';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || '—';
}
