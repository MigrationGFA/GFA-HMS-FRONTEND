import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };

export function isPharmacyOpsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

function timezoneOffsetMinutes() {
  return -new Date().getTimezoneOffset();
}

// ---------- Dashboard ----------

export type PharmacyDashboardData = {
  asOf: string;
  timezoneOffsetMinutes: number;
  kpis: {
    prescriptionsToday: number;
    pendingPrescriptions: number;
    dispensedToday: number;
    revenueToday: number;
    lowStock: number;
    outOfStock: number;
    expiringSoon: number;
    expired: number;
    pendingPurchaseOrders: number;
    inpatientWardRequests: number;
    drugReturns: number;
    emergencyDispenses: number;
    auditAlerts: number;
    controlledDrugBalance: number;
  };
  charts: {
    rxTrend: Array<{ d: string; rx: number }>;
    salesTrend: Array<{ d: string; v: number }>;
    fastMoving: Array<{ name: string; qty: number }>;
    slowMoving: Array<{ name: string; qty: number }>;
    stockValue: Array<{ name: string; v: number }>;
    monthlyRevenue: Array<{ m: string; v: number; amount: number }>;
    expiryRisk: Array<{ name: string; value: number; color: string }>;
  };
  alerts: Array<{ tone: string; title: string; count: number; to: string }>;
};

export async function getPharmacyDashboard(): Promise<PharmacyDashboardData> {
  const body = await apiRequest<ApiEnvelope<PharmacyDashboardData>>(
    `/api/pharmacy/dashboard?timezoneOffsetMinutes=${timezoneOffsetMinutes()}`,
  );
  return body.data;
}

// ---------- Inpatient ----------

export type PharmacyInpatientRow = {
  admissionId: number;
  personId: number | null;
  patientName: string;
  hospitalNo: string | null;
  wardId: number | null;
  wardName: string | null;
  bedNo: string | null;
  admissionStatus: string | null;
  admissionDate: string | null;
  prescriptionId: number | null;
  rxNo: string | null;
  rxStatus: string | null;
  paymentStatus: string | null;
  urgency: string | null;
  drugSummary: string;
  itemCount: number;
  pendingItems: number;
  prescribedBy: string | null;
  sentAt: string | null;
  queueStatus:
    | 'Awaiting Pharmacy'
    | 'Awaiting Payment'
    | 'Dispensed'
    | 'No Prescription';
};

export type PharmacyInpatientData = {
  asOf: string;
  summary: {
    admitted: number;
    awaitingPharmacy: number;
    awaitingPayment: number;
    dispensed: number;
    noPrescription: number;
  };
  wards: Array<{ wardId: number; wardName: string }>;
  items: PharmacyInpatientRow[];
  meta: Meta;
};

export async function getPharmacyInpatient(params?: {
  q?: string;
  wardId?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PharmacyInpatientData> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.wardId != null) qs.set('wardId', String(params.wardId));
  if (params?.status) qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<PharmacyInpatientData>>(
    `/api/pharmacy/inpatient?${qs}`,
  );
  return body.data;
}

// ---------- Reports ----------

export type PharmacyReportCatalogItem = {
  type: string;
  label: string;
  description: string;
};

export type PharmacyReportResult = {
  type: string;
  from: string | null;
  to: string | null;
  summary: Record<string, unknown>;
  columns: string[];
  items: Array<Record<string, unknown>>;
  meta: Meta;
};

export async function getPharmacyReportCatalog(): Promise<{
  items: PharmacyReportCatalogItem[];
}> {
  const body = await apiRequest<
    ApiEnvelope<{ items: PharmacyReportCatalogItem[] }>
  >('/api/pharmacy/reports/catalog');
  return body.data;
}

export async function generatePharmacyReport(
  type: string,
  params?: { from?: string; to?: string; page?: number; limit?: number },
): Promise<PharmacyReportResult> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<PharmacyReportResult>>(
    `/api/pharmacy/reports/${encodeURIComponent(type)}?${qs}`,
  );
  return body.data;
}

// ---------- Audit ----------

export type PharmacyAuditStats = {
  asOf: string;
  totalToday: number;
  dispenses: number;
  emergencies: number;
  stockEvents: number;
  returns: number;
  overrides: number;
};

export type PharmacyAuditEntry = {
  auditId: number;
  time: string | null;
  officer: string;
  role: string;
  action: string;
  item: string | null;
  type: string | null;
  entity: string | null;
  entityId: string | null;
  hospitalId: string;
  patient: string;
  personId: number | null;
  module: string;
  status: string;
  newValue: string | null;
  oldValue: string | null;
  category: string;
};

export type PharmacyAuditData = {
  items: PharmacyAuditEntry[];
  meta: Meta;
  stats: PharmacyAuditStats;
};

export async function getPharmacyAudit(params?: {
  q?: string;
  category?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PharmacyAuditData> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  qs.set('timezoneOffsetMinutes', String(timezoneOffsetMinutes()));
  const body = await apiRequest<ApiEnvelope<PharmacyAuditData>>(
    `/api/pharmacy/audit?${qs}`,
  );
  return body.data;
}

export async function getPharmacyAuditStats(): Promise<PharmacyAuditStats> {
  const body = await apiRequest<ApiEnvelope<PharmacyAuditStats>>(
    `/api/pharmacy/audit/stats?timezoneOffsetMinutes=${timezoneOffsetMinutes()}`,
  );
  return body.data;
}

// ---------- Expiry monitoring ----------

export type PharmacyExpiryBucket =
  | 'all'
  | 'expired'
  | 'critical'
  | 'warning'
  | 'soon';

export type PharmacyExpiryRow = {
  batchId: number;
  drugId: number;
  drugName: string;
  batchNo: string;
  qtyAvailable: number;
  expiryDate: string;
  daysLeft: number;
  bucket: Exclude<PharmacyExpiryBucket, 'all'>;
  status: string;
  location: string | null;
  unitPrice: number;
  valueAtRisk: number;
};

export type PharmacyExpiryData = {
  asOf: string;
  thresholds: {
    expiryCriticalDays: number;
    expiryWarningDays: number;
    expiringSoonDays: number;
  };
  summary: {
    expired: number;
    critical: number;
    warning: number;
    soon: number;
    total: number;
    quarantined: number;
    valueAtRisk: number;
  };
  items: PharmacyExpiryRow[];
  meta: Meta;
};

export async function getPharmacyExpiry(params?: {
  bucket?: PharmacyExpiryBucket | string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<PharmacyExpiryData> {
  const qs = new URLSearchParams();
  if (params?.bucket) qs.set('bucket', params.bucket);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<PharmacyExpiryData>>(
    `/api/pharmacy/expiry?${qs}`,
  );
  return body.data;
}

export async function quarantinePharmacyBatch(batchId: number) {
  const body = await apiRequest<
    ApiEnvelope<{
      batchId: number;
      drugId: number;
      drugName: string;
      batchNo: string;
      status: string;
      qtyAvailable: number;
      expiryDate: string | null;
    }>
  >(`/api/pharmacy/expiry/batches/${batchId}/quarantine`, {
    method: 'POST',
  });
  return body.data;
}

// ---------- Analytics ----------

export type PharmacyAnalyticsData = {
  asOf: string;
  from: string;
  to: string;
  timezoneOffsetMinutes: number;
  kpis: {
    revenue: number;
    paidCount: number;
    pendingBills: number;
    prescriptionsSent: number;
    prescriptionsDispensed: number;
    walkInDispensed: number;
    emergencyDispenses: number;
    returnsCount: number;
    returnsValue: number;
    returnsUnits: number;
    lowStock: number;
    outOfStock: number;
    expired: number;
    expiringSoon: number;
    controlledBalance: number;
    controlledDispensed: number;
    pendingPurchaseOrders: number;
    pendingRequests: number;
  };
  charts: {
    revenueTrend: Array<{ d: string; v: number }>;
    topDispensed: Array<{ name: string; qty: number; value: number }>;
    slowDispensed: Array<{ name: string; qty: number; value: number }>;
    channelMix: Array<{ name: string; value: number }>;
    stockValue: Array<{ name: string; v: number }>;
    expiryRisk: Array<{ name: string; value: number; color: string }>;
    inventoryHealth: Array<{ name: string; value: number; color: string }>;
  };
};

export async function getPharmacyAnalytics(params?: {
  from?: string;
  to?: string;
}): Promise<PharmacyAnalyticsData> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  qs.set('timezoneOffsetMinutes', String(timezoneOffsetMinutes()));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<PharmacyAnalyticsData>>(
    `/api/pharmacy/analytics${suffix}`,
  );
  return body.data;
}
