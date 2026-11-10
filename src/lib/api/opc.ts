/**
 * Psychiatric OPC API client (Phase C dual-mode).
 * When VITE_USE_API=false → pages keep using opc-actions / local db.
 */
import { env } from '@/lib/env';
import { apiRequest } from '@/lib/api/client';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export function isOpcApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export type ApiOpcHealth = {
  module: string;
  status: string;
  dualMode: boolean;
};

export type ApiOpcVisit = {
  visitId: number;
  visitNo: string;
  personId: number;
  visitType: string;
  payer: string;
  priority: string;
  status: string;
  assignedDoctor?: string | null;
  clinic?: string | null;
  reason?: string | null;
  billingStatus: string;
  consultAmount: number;
  checkInAt: string;
  person: {
    personId: number;
    hospitalNo: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    phone: string | null;
  } | null;
};

/** Lightweight readiness probe until full visits CRUD lands. */
export async function getOpcHealth(): Promise<ApiOpcHealth> {
  const body = await apiRequest<ApiEnvelope<ApiOpcHealth>>('/api/psychiatry/opc/health');
  return body.data;
}

export async function listOpcVisits(params?: {
  status?: string;
  q?: string;
  today?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiOpcVisit>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.today) qs.set('today', 'true');
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiOpcVisit>>>(`/api/psychiatry/opc/visits?${qs.toString()}`);
  return body.data;
}

export async function createOpcVisit(payload: {
  personId: number;
  visitType: string;
  payer?: string;
  priority?: string;
  assignedDoctor?: string;
  clinic?: string;
  reason?: string;
}): Promise<ApiOpcVisit> {
  const body = await apiRequest<ApiEnvelope<ApiOpcVisit>>('/api/psychiatry/opc/visits', { method: 'POST', body: payload });
  return body.data;
}

export async function updateOpcVisitStatus(visitId: number, payload: { status: string; note?: string }): Promise<ApiOpcVisit> {
  const body = await apiRequest<ApiEnvelope<ApiOpcVisit>>(`/api/psychiatry/opc/visits/${visitId}/status`, { method: 'PATCH', body: payload });
  return body.data;
}

export async function billOpcVisit(visitId: number): Promise<ApiOpcVisit> {
  const body = await apiRequest<ApiEnvelope<ApiOpcVisit>>(`/api/psychiatry/opc/visits/${visitId}/bill`, { method: 'POST', body: {} });
  return body.data;
}
