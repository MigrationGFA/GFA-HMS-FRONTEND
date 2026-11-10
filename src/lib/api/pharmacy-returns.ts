import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type PharmacyReturnLine = {
  sourceItemId: number;
  drugId: number;
  drugName: string;
  strength: string | null;
  qtyDispensed: number;
  qtyReturned: number;
  qtyReturnable: number;
  unitPrice: number;
};

export type PharmacyReturnLookup = {
  sourceType: 'prescription' | 'walk_in';
  sourceId: number;
  refNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string | null;
  status: string;
  lines: PharmacyReturnLine[];
};

export type PharmacyReturnItem = {
  returnItemId: number;
  drugId: number;
  drugName: string;
  quantity: number;
  sourceItemId: number;
  unitPrice: number;
};

export type PharmacyReturn = {
  returnId: number;
  returnNo: string;
  sourceType: string;
  sourceId: number;
  personId: number;
  status: string;
  reason: string;
  returnedByRole: string;
  returnedByName: string;
  receivedBy: string | null;
  totalValue: number;
  createdAt: string | null;
  items: PharmacyReturnItem[];
  patientName: string | null;
  hospitalNo: string | null;
  sourceRefNo: string | null;
};

export type PharmacyReturnsSummary = {
  todayCount: number;
  todayUnits: number;
  todayValue: number;
  weekCount: number;
  totalCount: number;
};

export function isPharmacyReturnsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getPharmacyReturnsSummary(): Promise<PharmacyReturnsSummary> {
  const body = await apiRequest<ApiEnvelope<PharmacyReturnsSummary>>(
    '/api/pharmacy/returns/summary',
  );
  return body.data;
}

export async function listPharmacyReturns(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<PharmacyReturn>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<PharmacyReturn>>>(
    `/api/pharmacy/returns?${qs}`,
  );
  return body.data;
}

export async function lookupPharmacyReturnSource(
  q: string,
): Promise<PharmacyReturnLookup> {
  const body = await apiRequest<ApiEnvelope<PharmacyReturnLookup>>(
    `/api/pharmacy/returns/lookup?q=${encodeURIComponent(q)}`,
  );
  return body.data;
}

export async function createPharmacyReturn(payload: {
  sourceType: 'prescription' | 'walk_in';
  sourceId: number;
  items: { sourceItemId: number; quantity: number }[];
  reason: string;
  returnedByRole: string;
  returnedByName: string;
}): Promise<PharmacyReturn> {
  const body = await apiRequest<ApiEnvelope<PharmacyReturn>>(
    '/api/pharmacy/returns',
    { method: 'POST', body: payload },
  );
  return body.data;
}
