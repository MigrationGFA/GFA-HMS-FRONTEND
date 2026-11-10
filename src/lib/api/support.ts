import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type SupportIssueType = 'Profile Change' | 'Complaint' | 'Technical Issue';
export type SupportStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type SupportModule =
  | 'pharmacy'
  | 'doctor'
  | 'cashier'
  | 'records'
  | 'laboratory'
  | 'other';

export type SupportRequest = {
  requestId: number;
  requestNo: string;
  userId: number;
  staffName: string;
  roleLabel: string | null;
  issueType: string;
  description: string;
  module: string | null;
  status: string;
  resolvedNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedById: number | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SupportListResult = {
  items: SupportRequest[];
  meta: { page: number; limit: number; total: number };
};

export function isSupportApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export async function createSupportRequest(body: {
  issueType: SupportIssueType;
  description: string;
  module?: SupportModule;
}): Promise<SupportRequest> {
  const res = await apiRequest<ApiEnvelope<SupportRequest>>('/api/support-requests', {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function listSupportRequests(params?: {
  mine?: boolean;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<SupportListResult> {
  const qs = new URLSearchParams();
  if (params?.mine === true) qs.set('mine', 'true');
  if (params?.mine === false) qs.set('mine', 'false');
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiRequest<ApiEnvelope<SupportListResult>>(
    `/api/support-requests${query ? `?${query}` : ''}`,
  );
  return res.data;
}

export async function getSupportRequest(id: number): Promise<SupportRequest> {
  const res = await apiRequest<ApiEnvelope<SupportRequest>>(`/api/support-requests/${id}`);
  return res.data;
}

export async function updateSupportRequest(
  id: number,
  body: { status: SupportStatus; resolvedNote?: string },
): Promise<SupportRequest> {
  const res = await apiRequest<ApiEnvelope<SupportRequest>>(`/api/support-requests/${id}`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

/** Derive support module from current pathname. */
export function supportModuleFromPath(pathname: string): SupportModule {
  const p = pathname.toLowerCase();
  if (p.includes('/pharmacy')) return 'pharmacy';
  if (p.includes('/doctor') || p.includes('/dashboard/doctor')) return 'doctor';
  if (p.includes('/cashier')) return 'cashier';
  if (p.includes('/records') || p.includes('/report')) return 'records';
  if (p.includes('/laboratory') || p.includes('/lab')) return 'laboratory';
  return 'other';
}
