import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type AdmissionRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Admitted';

export type ApiAdmissionRequestPerson = {
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

export type ApiAdmissionRequest = {
  admissionRequestId: number;
  requestNo: string;
  personId: number;
  encounterId: number | null;
  wardId: number | null;
  wardPreference: string | null;
  priority: string;
  priorityReason: string | null;
  admissionType: string | null;
  estimatedLos: string | null;
  provisionalDiagnosis: string | null;
  secondaryDiagnosis: string | null;
  clinicalIndication: string | null;
  mentalHealthRisk: string | null;
  physicalHealthRisk: string | null;
  treatmentPlan: string | null;
  requiredMonitoring: string | null;
  nursingObservation: string | null;
  isolationRequired: boolean;
  fallRisk: boolean;
  suicideRisk: boolean;
  violenceRisk: boolean;
  withdrawalRisk: boolean;
  specialBed: string | null;
  consentStatus: string | null;
  nokInformed: string | null;
  clinicDepartment: string | null;
  doctorNote: string | null;
  status: AdmissionRequestStatus | string;
  rejectionReason: string | null;
  requestedByUserId: number | null;
  requestedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiAdmissionRequestPerson | null;
  ward: { wardId: number; code: string; name: string; wardType: string | null } | null;
};

export type CreateAdmissionRequestPayload = {
  personId: number;
  encounterId?: number;
  wardId?: number;
  wardPreference?: string;
  priority?: 'Routine' | 'Urgent' | 'Emergency';
  priorityReason?: string;
  admissionType?: string;
  estimatedLos?: string;
  provisionalDiagnosis?: string;
  secondaryDiagnosis?: string;
  clinicalIndication?: string;
  mentalHealthRisk?: string;
  physicalHealthRisk?: string;
  treatmentPlan?: string;
  requiredMonitoring?: string;
  nursingObservation?: string;
  isolationRequired?: boolean;
  fallRisk?: boolean;
  suicideRisk?: boolean;
  violenceRisk?: boolean;
  withdrawalRisk?: boolean;
  specialBed?: string;
  consentStatus?: string;
  nokInformed?: string;
  clinicDepartment?: string;
  doctorNote?: string;
  asDraft?: boolean;
};

export type UpdateAdmissionRequestPayload = Partial<
  Omit<CreateAdmissionRequestPayload, 'personId' | 'encounterId' | 'asDraft'>
> & {
  status?: AdmissionRequestStatus;
  rejectionReason?: string;
  wardId?: number | null;
};

export function isAdmissionRequestsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function admissionRequestPatientName(
  person: ApiAdmissionRequestPerson | null | undefined,
): string {
  if (!person) return 'Unknown';
  return (
    [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

export async function createAdmissionRequest(
  payload: CreateAdmissionRequestPayload,
): Promise<ApiAdmissionRequest> {
  const body = await apiRequest<ApiEnvelope<ApiAdmissionRequest>>(
    `/api/admission-requests`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listAdmissionRequests(params?: {
  scope?: 'mine' | 'all';
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiAdmissionRequest>> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiAdmissionRequest>>>(
    `/api/admission-requests?${qs}`,
  );
  return body.data;
}

export async function getAdmissionRequest(id: number): Promise<ApiAdmissionRequest> {
  const body = await apiRequest<ApiEnvelope<ApiAdmissionRequest>>(
    `/api/admission-requests/${id}`,
  );
  return body.data;
}

export async function updateAdmissionRequest(
  id: number,
  payload: UpdateAdmissionRequestPayload,
): Promise<ApiAdmissionRequest> {
  const body = await apiRequest<ApiEnvelope<ApiAdmissionRequest>>(
    `/api/admission-requests/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}
