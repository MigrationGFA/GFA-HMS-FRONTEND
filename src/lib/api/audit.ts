import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiAuditLog = {
  auditId: number;
  type: string | null;
  item: string | null;
  entity: string | null;
  entityId: string | null;
  status: string | null;
  personId: number | null;
  userId: number | null;
  createdBy: string | null;
  createdAt: string | null;
  newValue: string | null;
  oldValue: string | null;
};

export type ApiAuditStats = {
  asOf: string;
  total: number;
  today: number;
  emergencyOverrides: number;
  noteEdits: number;
  prescriptionChanges: number;
  flagged: number;
};

export function isAuditApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function clearDoctorAuditMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = [
    'gfa_doc_audit_master_v1',
    'gfa_doc_audit_exports_v1',
    'gfa_doc_rx_audit_v1',
    'gfa_doc_discharge_audit_v1',
    'gfa_doc_emergency_audit_v1',
    'gfa_doc_results_audit_v1',
    'gfa_doc_lab_audit_v1',
    'gfa_doc_imaging_audit_v1',
    'gfa_doc_admission_audit_v1',
    'gfa_doc_referral_audit_v1',
    'gfa_doc_transfer_audit_v1',
    'gfa_doc_wardround_audit_v1',
    'gfa_doc_crossdept_audit_v1',
    'gfa_doc_diagnosis_audit_v1',
    'gfa_doc_board_audit_v1',
    'gfa_doc_timeline_audit_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function listAuditLogs(params?: {
  type?: string;
  personId?: number;
  userId?: number;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiAuditLog>> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.userId != null) qs.set('userId', String(params.userId));
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<Paged<ApiAuditLog>>>(
    `/api/audit/logs${q ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function fetchAuditStats(params?: {
  timezoneOffsetMinutes?: number;
}): Promise<ApiAuditStats> {
  const qs = new URLSearchParams();
  if (params?.timezoneOffsetMinutes != null) {
    qs.set('timezoneOffsetMinutes', String(params.timezoneOffsetMinutes));
  }
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<ApiAuditStats>>(
    `/api/audit/stats${q ? `?${q}` : ''}`,
  );
  return res.data;
}
