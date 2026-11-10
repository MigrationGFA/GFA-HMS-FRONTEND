import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiDiagnosisCatalogEntry = {
  diagnosisCodeId: number;
  id: string;
  code: string;
  dsmCode: string | null;
  system: string;
  name: string;
  category: string | null;
  description: string | null;
  symptoms: string | null;
  keywords: string | null;
  isPsychiatric: boolean;
  status: string;
};

export type ApiPatientDiagnosis = {
  patientDiagnosisId: number;
  id: string;
  personId: number;
  patientId: string;
  patientName: string;
  hospitalId: string | null;
  encounterId: number | null;
  encounter: string;
  code: string;
  dsmCode: string | null;
  system: string;
  name: string;
  type: string;
  severity: string | null;
  status: string;
  certainty: string | null;
  dateAdded: string | null;
  addedBy: string | null;
  clinic: string | null;
  notes: string;
  onsetDate: string;
  onProblemList: boolean;
  isPsychiatric: boolean;
  isNewThisWeek: boolean;
  reasonConsidered: string | null;
  supportingFindings: string | null;
  againstFindings: string | null;
  controlStatus: string | null;
  lastReview: string | null;
  nextReview: string | null;
  riskLevel: string | null;
  linkedSymptoms: string | null;
  linkedLab: string | null;
  linkedImaging: string | null;
  linkedRx: string | null;
  closedReason: string | null;
  closedBy: string | null;
  closedDate: string | null;
};

export type DiagnosisStats = {
  active: number;
  newThisWeek: number;
  chronic: number;
  psychiatric: number;
  provisional: number;
  differential: number;
  resolved: number;
};

export function isDiagnosesApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listDiagnosisCatalog(params?: {
  q?: string;
  system?: string;
  category?: string;
}): Promise<ApiDiagnosisCatalogEntry[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.system) qs.set('system', params.system);
  if (params?.category) qs.set('category', params.category);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ApiDiagnosisCatalogEntry[] }>>(
    `/api/diagnoses/catalog${suffix}`,
  );
  return body.data.items;
}

export async function listPatientDiagnoses(params?: {
  personId?: number;
  status?: string;
  type?: string;
  tab?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPatientDiagnosis>> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.status) qs.set('status', params.status);
  if (params?.type) qs.set('type', params.type);
  if (params?.tab) qs.set('tab', params.tab);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPatientDiagnosis>>>(
    `/api/diagnoses?${qs}`,
  );
  return body.data;
}

export async function getDiagnosisStats(personId?: number): Promise<DiagnosisStats> {
  const qs = personId != null ? `?personId=${personId}` : '';
  const body = await apiRequest<ApiEnvelope<DiagnosisStats>>(
    `/api/diagnoses/stats${qs}`,
  );
  return body.data;
}

export async function createPatientDiagnosis(payload: {
  personId: number;
  encounterId?: number;
  diagnosisCodeId?: number;
  code?: string;
  name?: string;
  system?: string;
  type?: string;
  severity?: string;
  status?: string;
  certainty?: string;
  onsetDate?: string;
  notes?: string;
  clinic?: string;
  onProblemList?: boolean;
  reasonConsidered?: string;
  supportingFindings?: string;
  againstFindings?: string;
  linkedSymptoms?: string;
  linkedLab?: string;
  linkedImaging?: string;
  linkedRx?: string;
  riskLevel?: string;
}): Promise<ApiPatientDiagnosis> {
  const body = await apiRequest<ApiEnvelope<ApiPatientDiagnosis>>('/api/diagnoses', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function updatePatientDiagnosis(
  id: number,
  payload: {
    type?: string;
    severity?: string;
    status?: string;
    certainty?: string;
    notes?: string;
    onProblemList?: boolean;
    closedReason?: string;
    controlStatus?: string;
    riskLevel?: string;
  },
): Promise<ApiPatientDiagnosis> {
  const body = await apiRequest<ApiEnvelope<ApiPatientDiagnosis>>(
    `/api/diagnoses/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}
