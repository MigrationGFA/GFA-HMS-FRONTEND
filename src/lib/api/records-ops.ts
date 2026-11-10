import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type FileRequestRow = {
  requestId: number;
  requestNo: string;
  personId: number;
  hospitalNo: string | null;
  patientName: string;
  requestedBy: string;
  department: string;
  reason: string;
  location: string;
  dueDate: string | null;
  status: string;
  createdAt: string | null;
};

export type ArchiveRow = {
  archiveId: number;
  archiveNo: string;
  personId: number;
  hospitalNo: string | null;
  patientName: string;
  category: string;
  accessLevel: string;
  lastVisit: string | null;
  archiveDate: string;
  retentionUntil: string | null;
  dueReview: string | null;
  status: string;
  notes: string | null;
};

export type ReportSummary = {
  totalRegistered: number;
  newToday: number;
  returning: number;
  walkIn: number;
  referrals: number;
  admissions: number;
  discharges: number;
  documents: number;
};

export type ReportGenerateResult = {
  snapshotId: number;
  reportType: string;
  from: string;
  to: string;
  department: string | null;
  rows: { col: string; val: string }[];
  metrics: Record<string, unknown>;
};

export type RecordsAnalyticsResult = {
  range: string;
  from: string;
  to: string;
  kpis: {
    totalRegistered: number;
    newInPeriod: number;
    returningApprox: number;
    avgRegMinutes: number | null;
    peakHourLabel: string;
    topClinic: string;
    topCategory: string;
  };
  trends: { label: string; registrations: number; triage: number }[];
  demographics: { label: string; count: number }[];
  operations: { label: string; count: number }[];
};

export function isRecordsOpsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listFileRequests(params?: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<
    ApiEnvelope<{
      items: FileRequestRow[];
      meta: { page: number; limit: number; total: number };
      kpis: {
        today: number;
        released: number;
        transit: number;
        overdue: number;
        returned: number;
        missing: number;
        requested: number;
      };
    }>
  >(`/api/records/file-requests${q ? `?${q}` : ''}`);
  return res.data;
}

export async function createFileRequest(body: {
  personId: number;
  department: string;
  reason: string;
  dueDate?: string;
  requestedBy?: string;
}) {
  const res = await apiRequest<ApiEnvelope<FileRequestRow>>('/api/records/file-requests', {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function updateFileRequestStatus(
  id: number,
  body: { status: string; note?: string; location?: string },
) {
  const res = await apiRequest<ApiEnvelope<FileRequestRow>>(
    `/api/records/file-requests/${id}/status`,
    { method: 'PATCH', body },
  );
  return res.data;
}

export async function listArchives(params?: {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<
    ApiEnvelope<{
      items: ArchiveRow[];
      meta: { page: number; limit: number; total: number };
      kpis: {
        archived: number;
        inactive: number;
        deceased: number;
        longStay: number;
        dueReview: number;
        restricted: number;
      };
    }>
  >(`/api/records/archives${q ? `?${q}` : ''}`);
  return res.data;
}

export async function createArchive(body: {
  personId: number;
  category: string;
  accessLevel?: string;
  retentionUntil?: string;
  dueReviewAt?: string;
  notes?: string;
}) {
  const res = await apiRequest<ApiEnvelope<ArchiveRow>>('/api/records/archives', {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function restoreArchive(id: number) {
  const res = await apiRequest<ApiEnvelope<ArchiveRow>>(`/api/records/archives/${id}/restore`, {
    method: 'POST',
  });
  return res.data;
}

export async function updateArchive(
  id: number,
  body: {
    accessLevel?: string;
    retentionUntil?: string;
    dueReviewAt?: string;
    category?: string;
    notes?: string;
  },
) {
  const res = await apiRequest<ApiEnvelope<ArchiveRow>>(`/api/records/archives/${id}`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function requestArchiveAccess(id: number, reason?: string) {
  const res = await apiRequest<ApiEnvelope<{ ok: boolean; message: string }>>(
    `/api/records/archives/${id}/access-request`,
    { method: 'POST', body: { reason } },
  );
  return res.data;
}

export async function getReportsSummary(timezoneOffsetMinutes = 60) {
  const res = await apiRequest<ApiEnvelope<ReportSummary>>(
    `/api/records/reports/summary?timezoneOffsetMinutes=${timezoneOffsetMinutes}`,
  );
  return res.data;
}

export async function generateRecordsReport(body: {
  reportType: string;
  from: string;
  to: string;
  department?: string;
}) {
  const res = await apiRequest<ApiEnvelope<ReportGenerateResult>>(
    '/api/records/reports/generate',
    { method: 'POST', body },
  );
  return res.data;
}

export async function getRecordsAnalytics(params?: {
  range?: string;
  timezoneOffsetMinutes?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.range) qs.set('range', params.range);
  qs.set('timezoneOffsetMinutes', String(params?.timezoneOffsetMinutes ?? 60));
  const res = await apiRequest<ApiEnvelope<RecordsAnalyticsResult>>(
    `/api/records/analytics?${qs}`,
  );
  return res.data;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
