import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type DischargeDraftStatus =
  | 'Draft'
  | 'Submitted'
  | 'AwaitingPayment'
  | 'PaymentCleared'
  | 'Discharged'
  | 'Returned'
  | 'Cancelled';

export type ApiDischargePerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  phone: string | null;
};

export type PaymentSnapshot = {
  cleared: boolean;
  unpaidCount: number;
  items: Array<{
    source: string;
    id: number;
    reference: string;
    amount: number | null;
    paymentStatus: string;
  }>;
};

export type ApiDischargeDraft = {
  draftId: number;
  draftNo: string;
  personId: number;
  admissionId: number;
  status: DischargeDraftStatus | string;
  admissionDiagnosis: string | null;
  finalDiagnosis: string | null;
  reasonForAdmission: string | null;
  clinicalSummary: string | null;
  investigations: string | null;
  treatmentGiven: string | null;
  dischargeMedications: string | null;
  medicationsChanged: string | null;
  followUpPlan: string | null;
  nextAppointment: string | null;
  patientEducation: string | null;
  riskSafetyNotes: string | null;
  dischargeType: string | null;
  returnReason: string | null;
  requestedByUserId: number | null;
  submittedAt: string | null;
  paymentClearedAt: string | null;
  finalizedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiDischargePerson | null;
  admission: {
    admissionId: number;
    status: string;
    diagnosis: string | null;
    admittedAt: string | null;
    ward: { wardId: number; code: string; name: string } | null;
    bed: { bedId: number; label: string; status: string } | null;
  } | null;
  payment?: PaymentSnapshot | null;
  events: Array<{
    eventId: number;
    eventType: string;
    actorUserId: number | null;
    actorLabel: string | null;
    note: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    createdAt: string;
  }>;
};

export type DischargeDraftPayload = {
  admissionId?: number;
  dischargeType?: string;
  admissionDiagnosis?: string;
  finalDiagnosis?: string;
  reasonForAdmission?: string;
  clinicalSummary?: string;
  investigations?: string;
  treatmentGiven?: string;
  dischargeMedications?: string;
  medicationsChanged?: string;
  followUpPlan?: string;
  nextAppointment?: string;
  patientEducation?: string;
  riskSafetyNotes?: string;
};

export function isDischargeApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function dischargePatientName(d: ApiDischargeDraft): string {
  const p = d.person;
  if (!p) return `Person #${d.personId}`;
  return (
    [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') ||
    p.hospitalNo ||
    `#${d.personId}`
  );
}

export function clearDoctorDischargeMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  // Keep gfa_doc_board_watchlist_v1 — personal UI preference, not mock clinical data.
  const keys = [
    'gfa_doc_discharge_drafts_v1',
    'gfa_doc_discharge_audit_v1',
    'gfa_doc_discharge_timeline_v1',
    'gfa_doc_board_audit_v1',
    'gfa_doc_wardround_audit_v1',
    'gfa_doc_wardround_notes_v1',
    'gfa_doc_wardround_consult_v1',
    'gfa_doc_wardround_timeline_v1',
    'gfa_doc_patient_dir_recent_v1',
    'gfa_doc_patient_access_audit_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function listDischargeDrafts(params?: {
  scope?: 'mine' | 'queue' | 'all';
  status?: string;
  personId?: number;
  admissionId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiDischargeDraft>> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<Paged<ApiDischargeDraft>>>(
    `/api/discharge-drafts${q ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function getDischargeDraft(id: number): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(`/api/discharge-drafts/${id}`);
  return res.data;
}

export async function createDischargeDraft(
  payload: DischargeDraftPayload & { admissionId: number },
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>('/api/discharge-drafts', {
    method: 'POST',
    body: payload,
  });
  return res.data;
}

export async function updateDischargeDraft(
  id: number,
  payload: DischargeDraftPayload,
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(`/api/discharge-drafts/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return res.data;
}

export async function submitDischargeDraft(
  id: number,
  body?: { note?: string },
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(
    `/api/discharge-drafts/${id}/submit`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function getDischargePaymentStatus(id: number): Promise<PaymentSnapshot> {
  const res = await apiRequest<ApiEnvelope<PaymentSnapshot>>(
    `/api/discharge-drafts/${id}/payment-status`,
  );
  return res.data;
}

export async function clearDischargePayment(
  id: number,
  body?: { note?: string },
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(
    `/api/discharge-drafts/${id}/clear-payment`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function returnDischargeDraft(
  id: number,
  reason: string,
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(
    `/api/discharge-drafts/${id}/return`,
    { method: 'PATCH', body: { reason } },
  );
  return res.data;
}

export async function finalizeDischargeDraft(
  id: number,
  body?: { note?: string },
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(
    `/api/discharge-drafts/${id}/finalize`,
    { method: 'PATCH', body: body ?? {} },
  );
  return res.data;
}

export async function cancelDischargeDraft(
  id: number,
  reason?: string,
): Promise<ApiDischargeDraft> {
  const res = await apiRequest<ApiEnvelope<ApiDischargeDraft>>(
    `/api/discharge-drafts/${id}/cancel`,
    { method: 'PATCH', body: { reason } },
  );
  return res.data;
}
