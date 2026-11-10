import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type ClinicalPharmacyAlert = {
  alertId: number;
  alertNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string | null;
  prescriptionId: number | null;
  rxNo: string | null;
  doctorUserId: number | null;
  alertType: string;
  severity: string;
  drugA: string;
  drugB: string | null;
  message: string;
  ruleCode: string | null;
  status: string;
  overrideReason: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
  notifyNote: string | null;
  notifiedAt: string | null;
  notifiedBy: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type ClinicalPharmacyKpis = {
  open: number;
  severe: number;
  allergy: number;
  overriddenToday: number;
};

export type ClinicalPharmacyListResult = {
  items: ClinicalPharmacyAlert[];
  meta: { page: number; limit: number; total: number };
  kpis: ClinicalPharmacyKpis;
};

export function isClinicalPharmacyApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listClinicalPharmacyAlerts(params?: {
  status?: string;
  severity?: string;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<ClinicalPharmacyListResult> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.severity && params.severity !== 'all') qs.set('severity', params.severity);
  if (params?.type && params.type !== 'all') qs.set('type', params.type);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiRequest<ApiEnvelope<ClinicalPharmacyListResult>>(
    `/api/clinical-pharmacy/alerts${query ? `?${query}` : ''}`,
  );
  return res.data;
}

export async function checkClinicalInteractions(body: {
  personId: number;
  drugIds?: number[];
  prescriptionId?: number;
}): Promise<{
  findings: ClinicalPharmacyAlert[];
  medCount: number;
  allergyCount: number;
  ruleCount: number;
}> {
  const res = await apiRequest<
    ApiEnvelope<{
      findings: ClinicalPharmacyAlert[];
      medCount: number;
      allergyCount: number;
      ruleCount: number;
    }>
  >('/api/clinical-pharmacy/check', { method: 'POST', body });
  return res.data;
}

export async function overrideClinicalPharmacyAlert(
  id: number,
  reason: string,
): Promise<ClinicalPharmacyAlert> {
  const res = await apiRequest<ApiEnvelope<ClinicalPharmacyAlert>>(
    `/api/clinical-pharmacy/alerts/${id}/override`,
    { method: 'POST', body: { reason } },
  );
  return res.data;
}

export async function notifyClinicalPharmacyAlert(
  id: number,
  note?: string,
): Promise<ClinicalPharmacyAlert> {
  const res = await apiRequest<ApiEnvelope<ClinicalPharmacyAlert>>(
    `/api/clinical-pharmacy/alerts/${id}/notify`,
    { method: 'POST', body: { note } },
  );
  return res.data;
}

export async function closeClinicalPharmacyAlert(id: number): Promise<ClinicalPharmacyAlert> {
  const res = await apiRequest<ApiEnvelope<ClinicalPharmacyAlert>>(
    `/api/clinical-pharmacy/alerts/${id}/close`,
    { method: 'PATCH' },
  );
  return res.data;
}

export type PatientAllergy = {
  allergyId: number;
  personId: number;
  substance: string;
  reaction: string | null;
  severity: string;
  status: string;
  createdAt?: string | null;
};

export async function listPatientAllergies(personId: number): Promise<PatientAllergy[]> {
  const res = await apiRequest<ApiEnvelope<{ items: PatientAllergy[] }>>(
    `/api/clinical-pharmacy/allergies?personId=${personId}`,
  );
  return res.data.items;
}

export async function createPatientAllergy(body: {
  personId: number;
  substance: string;
  reaction?: string;
  severity?: string;
}): Promise<unknown> {
  const res = await apiRequest<ApiEnvelope<unknown>>('/api/clinical-pharmacy/allergies', {
    method: 'POST',
    body,
  });
  return res.data;
}
