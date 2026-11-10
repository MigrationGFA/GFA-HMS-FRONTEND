import { apiRequest } from './client';

type ApiEnvelope<T> = { data: T };

export type HmoPayerItem = {
  payerId: number;
  code: string;
  name: string;
  status: string;
  adapterKey: string | null;
  integrationStatus: string;
  capabilities: Record<string, boolean> | null;
  checklist: Record<string, boolean> | null;
};

export type HmoEligibilityResult = {
  checkId: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' | 'ERROR' | string;
  member: {
    fullName?: string;
    dob?: string | null;
    gender?: string | null;
    photoUrl?: string | null;
  };
  plan: {
    code?: string | null;
    name?: string | null;
    employer?: string | null;
  };
  validFrom?: string | null;
  validTo?: string | null;
  verifiedAt: string;
  sourceAdapter: string;
  payer: { payerId: number; code: string; name: string };
};

export type HmoBenefitItem = {
  category: string;
  name: string;
  coveragePercent: number;
  limitAmount?: number | null;
  coPayPercent?: number;
  covered: boolean;
  notes?: string;
};

export type HmoBenefitsResult = {
  snapshotId: number;
  planCode?: string | null;
  planName?: string | null;
  benefits: HmoBenefitItem[];
  exclusions: string[];
  sourceAdapter: string;
  fetchedAt: string;
  expiresAt?: string | null;
  payer: { payerId: number; code: string; name: string };
};

export async function listHmoPayers() {
  const body = await apiRequest<ApiEnvelope<{ items: HmoPayerItem[] }>>(
    '/api/insurance/hmo/payers',
  );
  return body.data.items;
}

export type PersonHmoCoverageSummary = {
  personId: number;
  hmoId: number | null;
  coverage: {
    coverageId: number;
    payerId: number;
    payerCode: string;
    payerName: string;
    memberNo: string;
    planCode: string | null;
    planName: string | null;
    employerName: string | null;
    status: string;
    validFrom: string | null;
    validTo: string | null;
  } | null;
  latestEligibility: {
    checkId: number;
    status: string;
    planName: string | null;
    memberName: string | null;
    verifiedAt: string;
    sourceAdapter: string;
  } | null;
};

/** Stored coverage + last eligibility snapshot (no live payer call). */
export async function getPersonHmoCoverage(personId: number) {
  const body = await apiRequest<ApiEnvelope<PersonHmoCoverageSummary>>(
    `/api/insurance/hmo/coverage/${personId}`,
  );
  return body.data;
}

export async function upsertHmoCoverage(payload: {
  personId: number;
  payerId: number;
  memberNo: string;
  planCode?: string;
  planName?: string;
  employerName?: string;
}) {
  const body = await apiRequest<
    ApiEnvelope<{ coverageId: number; memberNo: string; status: string }>
  >('/api/insurance/hmo/coverage', { method: 'POST', body: payload });
  return body.data;
}

export async function verifyHmoEligibility(params: {
  personId: number;
  payerId: number;
  memberNo: string;
  encounterId?: number;
}) {
  const qs = new URLSearchParams({
    personId: String(params.personId),
    payerId: String(params.payerId),
    memberNo: params.memberNo,
  });
  if (params.encounterId != null) qs.set('encounterId', String(params.encounterId));
  const body = await apiRequest<ApiEnvelope<HmoEligibilityResult>>(
    `/api/insurance/hmo/eligibility?${qs.toString()}`,
  );
  return body.data;
}

export async function fetchHmoBenefits(params: {
  personId: number;
  payerId: number;
  memberNo: string;
  serviceCode?: string;
  category?: string;
}) {
  const qs = new URLSearchParams({
    personId: String(params.personId),
    payerId: String(params.payerId),
    memberNo: params.memberNo,
  });
  if (params.serviceCode) qs.set('serviceCode', params.serviceCode);
  if (params.category) qs.set('category', params.category);
  const body = await apiRequest<ApiEnvelope<HmoBenefitsResult>>(
    `/api/insurance/hmo/benefits?${qs.toString()}`,
  );
  return body.data;
}

export async function requestHmoPreAuth(payload: {
  personId: number;
  payerId: number;
  memberNo: string;
  diagnosisCodes: string[];
  procedureCodes?: string[];
  serviceCodes?: string[];
  estimatedAmount?: number;
  notes?: string;
  idempotencyKey?: string;
}) {
  const body = await apiRequest<
    ApiEnvelope<{
      authId: number;
      status: string;
      authCode: string | null;
      approvedAmount: number | null;
      validUntil: string | null;
    }>
  >('/api/insurance/hmo/pre-auth', { method: 'POST', body: payload });
  return body.data;
}

export async function submitHmoClaim(payload: {
  personId: number;
  payerId: number;
  memberNo: string;
  totalAmount: number;
  payerAmount?: number;
  patientAmount?: number;
  diagnosisCodes?: string[];
  lines: Array<{
    serviceCode?: string;
    description?: string;
    quantity?: number;
    unitAmount?: number;
    payerAmount?: number;
    patientAmount?: number;
  }>;
  idempotencyKey?: string;
}) {
  const body = await apiRequest<
    ApiEnvelope<{
      claimId: number;
      status: string;
      externalClaimRef: string | null;
      totalAmount: number;
      payerAmount: number | null;
      patientAmount: number | null;
    }>
  >('/api/insurance/hmo/claims', { method: 'POST', body: payload });
  return body.data;
}
