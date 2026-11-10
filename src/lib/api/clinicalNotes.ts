import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };

export type ClinicalNoteFields = Record<string, string>;

export type ClinicalNoteListItem = {
  clinicalNoteId: number;
  noteNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string | null;
  clinic: string | null;
  noteType: string;
  status: string;
  priority: string;
  version: number;
  authorName: string;
  signedBy: string | null;
  signedAt: string | null;
  submittedAt: string | null;
  returnReason: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type ClinicalNoteDetail = ClinicalNoteListItem & {
  encounterId: number | null;
  fields: ClinicalNoteFields;
  patient: {
    personId: number;
    name: string;
    hospitalNo: string | null;
    age: number | null;
    sex: string | null;
    phone: string | null;
    nhia: string | null;
    nin: string | null;
  };
};

export type ClinicalNoteTemplate = {
  noteType: string;
  desc: string;
  bestFor: string;
  fields: string[];
  fieldCount: number;
};

export type ClinicalNoteSummary = {
  drafts: number;
  awaitingReview: number;
  signedThisMonth: number;
  templates: number;
};

export type ClinicalNoteVersionItem = {
  versionId: number;
  version: number;
  status: string;
  changeSummary: string | null;
  fields: ClinicalNoteFields;
  createdBy: string | null;
  createdAt: string | null;
  isCurrent: boolean;
};

export function isClinicalNotesApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listClinicalNoteTemplates(): Promise<ClinicalNoteTemplate[]> {
  const body = await apiRequest<ApiEnvelope<{ items: ClinicalNoteTemplate[] }>>(
    '/api/clinical-notes/templates',
  );
  return body.data.items;
}

export async function getClinicalNotesSummary(): Promise<ClinicalNoteSummary> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteSummary>>(
    '/api/clinical-notes/summary',
  );
  return body.data;
}

export async function listClinicalNotes(params?: {
  q?: string;
  status?: string;
  noteType?: string;
  personId?: number;
  mine?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ items: ClinicalNoteListItem[]; meta: Meta }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.noteType) qs.set('noteType', params.noteType);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.mine) qs.set('mine', 'true');
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{ items: ClinicalNoteListItem[]; meta: Meta }>
  >(`/api/clinical-notes?${qs}`);
  return body.data;
}

export async function getClinicalNote(id: number): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}`,
  );
  return body.data;
}

export async function createClinicalNote(payload: {
  personId: number;
  noteType: string;
  clinic?: string;
  encounterId?: number;
  priority?: string;
  fields?: ClinicalNoteFields;
}): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    '/api/clinical-notes',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function patchClinicalNote(
  id: number,
  payload: {
    version?: number;
    idempotencyKey?: string;
    fields?: ClinicalNoteFields;
    noteType?: string;
    clinic?: string;
    priority?: string;
    changeSummary?: string;
  },
): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function submitClinicalNote(id: number): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}/submit`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function signClinicalNote(
  id: number,
  attestation?: string,
): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}/sign`,
    { method: 'POST', body: { attestation } },
  );
  return body.data;
}

export async function approveClinicalNote(id: number): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}/approve`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function returnClinicalNote(
  id: number,
  reason: string,
): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}/return`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function voidClinicalNote(id: number): Promise<ClinicalNoteDetail> {
  const body = await apiRequest<ApiEnvelope<ClinicalNoteDetail>>(
    `/api/clinical-notes/${id}/void`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function listClinicalNoteVersions(id: number): Promise<{
  clinicalNoteId: number;
  noteNo: string;
  noteType: string;
  patientName: string;
  hospitalNo: string | null;
  items: ClinicalNoteVersionItem[];
}> {
  const body = await apiRequest<
    ApiEnvelope<{
      clinicalNoteId: number;
      noteNo: string;
      noteType: string;
      patientName: string;
      hospitalNo: string | null;
      items: ClinicalNoteVersionItem[];
    }>
  >(`/api/clinical-notes/${id}/versions`);
  return body.data;
}
