import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };

export type CertificateFieldSchema = { key: string; label: string };

export type CertificateTemplate = {
  templateId: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  fieldSchema: CertificateFieldSchema[];
  approvalRequired: boolean;
  layout: string;
  status: string;
};

export type ApiCertificate = {
  certificateId: number;
  docNo: string;
  personId: number;
  templateId: number;
  status: string;
  fields: Record<string, string>;
  layout: string;
  validityUntil: string | null;
  locked: boolean;
  qrCode: string | null;
  signedAt: string | null;
  signedBy: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  authorUserId: number | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: {
    personId: number;
    hospitalNo: string | null;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
  } | null;
  template?: CertificateTemplate | null;
  events?: {
    eventId: number;
    eventType: string;
    actorLabel: string | null;
    note: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    createdAt: string;
  }[];
};

export type CertificateSummary = {
  drafts: number;
  pendingSignature: number;
  pendingApproval: number;
  issuedMonth: number;
  total: number;
};

export function isCertificatesApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function clearCertificateMockStorage() {
  if (typeof localStorage === 'undefined') return;
  for (const k of ['gfa_doc_certificates_v1', 'gfa_doc_cert_audit_v1']) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export function certificatePatientName(c: ApiCertificate): string {
  const p = c.person;
  if (!p) return `Person #${c.personId}`;
  return (
    [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') ||
    p.hospitalNo ||
    `#${c.personId}`
  );
}

export async function listCertificateTemplates(): Promise<CertificateTemplate[]> {
  const body = await apiRequest<ApiEnvelope<CertificateTemplate[]>>(
    '/api/clinical-certificates/templates',
  );
  return body.data;
}

export async function getCertificateSummary(): Promise<CertificateSummary> {
  const body = await apiRequest<ApiEnvelope<CertificateSummary>>(
    '/api/clinical-certificates/summary',
  );
  return body.data;
}

export async function listCertificates(params?: {
  scope?: string;
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ApiCertificate[]; meta: Meta }> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{ items: ApiCertificate[]; meta: Meta }>
  >(`/api/clinical-certificates?${qs}`);
  return body.data;
}

export async function getCertificate(id: number): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}`,
  );
  return body.data;
}

export async function createCertificate(payload: {
  personId: number;
  templateId: number;
  fields?: Record<string, string>;
  layout?: string;
  validityUntil?: string;
}): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    '/api/clinical-certificates',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function updateCertificate(
  id: number,
  payload: {
    fields?: Record<string, string>;
    layout?: string;
    validityUntil?: string | null;
  },
): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function submitCertificateForSign(id: number): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}/submit-sign`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function signCertificate(id: number): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}/sign`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function approveCertificate(id: number): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}/approve`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function cancelCertificate(
  id: number,
  reason?: string,
): Promise<ApiCertificate> {
  const body = await apiRequest<ApiEnvelope<ApiCertificate>>(
    `/api/clinical-certificates/${id}/cancel`,
    { method: 'PATCH', body: { reason } },
  );
  return body.data;
}
