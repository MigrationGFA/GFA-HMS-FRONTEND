/**
 * Radiology / Imaging / ECG API client (Phases 0–8).
 * Dual-mode gate: isImagingApiEnabled() === env.useApi && apiBaseUrl.
 */
import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiImagingStudy = {
  imagingStudyId: number;
  studyCode: string;
  name: string;
  modality: string;
  bodyRegion: string | null;
  turnaround: string | null;
  unitPrice: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApiImagingRequestItem = {
  itemId: number;
  imagingStudyId: number;
  studyCode: string;
  studyName: string;
  modality: string;
  bodyRegion: string | null;
  unitPrice: number;
  lineNotes: string | null;
};

export type ApiImagingRequestPerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  phone: string | null;
};

export type ApiImagingRequest = {
  imagingRequestId: number;
  requestNo: string;
  personId: number;
  encounterId: number | null;
  doctorId: number;
  nursingOrderId?: number | null;
  source: string;
  priority: string;
  clinicalIndication: string | null;
  clinicalNotes: string | null;
  contrast: string | null;
  status: string;
  paymentStatus: string;
  paymentChannel: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  paidBy: string | null;
  totalAmount: number;
  rejectionReason: string | null;
  scheduledAt: string | null;
  scheduledRoom: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  studyUid?: string | null;
  equipmentId?: number | null;
  prepJson?: string | null;
  safetyJson?: string | null;
  paymentCleared?: boolean;
  processingLocked?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  doctorName: string | null;
  items: ApiImagingRequestItem[];
  person: ApiImagingRequestPerson | null;
};

export type ApiRadiologyReport = {
  reportId: number;
  imagingRequestId: number;
  findings: string;
  impression: string | null;
  recommendation: string | null;
  critical: boolean;
  status: string;
  author: string;
  verifier: string | null;
  returnReason: string | null;
  submittedAt: string;
  verifiedAt: string | null;
  releasedAt: string | null;
};

export type ApiEcgStudy = {
  ecgId: number;
  personId: number;
  imagingRequestId: number | null;
  ecgType: string;
  heartRate: number | null;
  rhythm: string | null;
  prMs: number | null;
  qrsMs: number | null;
  qtcMs: number | null;
  stChanges: string | null;
  interpretation: string | null;
  abnormal: boolean;
  critical: boolean;
  status: string;
  recordedBy: string | null;
  interpretedBy: string | null;
  recordedAt: string;
  interpretedAt: string | null;
};

export type ApiRadMetrics = {
  total: number;
  unpaid: number;
  paid: number;
  accepted: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  released: number;
  criticalReports: number;
  criticalEcgs: number;
  reportsAwaiting?: number;
  equipmentOffline?: number;
  lowStock?: number;
  ecgWaiting?: number;
  ecgCompleted?: number;
  pending?: number;
  critical?: number;
  modalityUtilisation?: Array<{ modality: string; count: number }>;
};

export type ApiRadEquipment = {
  equipmentId: number;
  name: string;
  modality: string;
  room: string | null;
  status: string;
  usageHours: number;
};

export type ApiRadConsumable = {
  consumableId: number;
  name: string;
  category: string | null;
  stock: number;
  unit: string | null;
  reorderLevel: number;
  lowStock?: boolean;
};

export type ApiRadForm = {
  formId: number;
  formType: string;
  personId: number;
  imagingRequestId: number | null;
  valuesJson: string;
  signedBy: string;
  createdAt: string;
  patientName?: string;
  hospitalNo?: string | null;
};

export type ApiConsumerResult = ApiRadiologyReport & {
  personId: number | null;
  patientName: string;
  hospitalNo: string | null;
  modality: string;
  studyName: string;
  studyUid: string | null;
  requestNo: string | null;
};

export type CreateImagingRequestPayload = {
  personId: number;
  encounterId?: number;
  priority?: 'Routine' | 'Urgent' | 'Emergency' | 'Stat';
  clinicalIndication?: string;
  clinicalNotes?: string;
  contrast?: string;
  source?: 'Doctor' | 'WalkIn' | 'Ward' | 'Emergency' | 'Nursing' | 'OPC';
  items: Array<{ studyId: number; lineNotes?: string }>;
};

export type ImportImagingOrderPayload = {
  personId: number;
  nursingOrderId?: number;
  source?: CreateImagingRequestPayload['source'];
  priority?: CreateImagingRequestPayload['priority'];
  clinicalIndication?: string;
  clinicalNotes?: string;
  items: Array<{ studyId: number; lineNotes?: string }>;
};

export function isImagingApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function isImagingPaymentCleared(r: Pick<ApiImagingRequest, 'paymentStatus' | 'paymentCleared'>) {
  if (typeof r.paymentCleared === 'boolean') return r.paymentCleared;
  return r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived';
}

export function isImagingProcessingLocked(r: Pick<ApiImagingRequest, 'paymentStatus' | 'processingLocked' | 'paymentCleared'>) {
  if (typeof r.processingLocked === 'boolean') return r.processingLocked;
  return !isImagingPaymentCleared(r);
}

export function imagingPatientName(person: ApiImagingRequestPerson | null | undefined) {
  if (!person) return '—';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || '—';
}

export function parsePrepJson(raw?: string | null): Record<string, boolean | string> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, boolean | string>; } catch { return {}; }
}

/* ── Studies ───────────────────────────────────────────────────────── */
export async function listImagingStudies(params?: {
  modality?: string; status?: string; q?: string;
}): Promise<ApiImagingStudy[]> {
  const qs = new URLSearchParams();
  if (params?.modality) qs.set('modality', params.modality);
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ApiImagingStudy[] }>>(
    `/api/radiology/imaging/studies${suffix}`,
  );
  return body.data.items;
}

/* ── Requests ──────────────────────────────────────────────────────── */
export async function createImagingRequest(
  payload: CreateImagingRequestPayload,
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    '/api/radiology/imaging/requests',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listImagingRequests(params?: {
  personId?: number; encounterId?: number; status?: string; paymentStatus?: string;
  source?: string; workQueue?: boolean; q?: string; page?: number; limit?: number;
}): Promise<Paged<ApiImagingRequest>> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.encounterId != null) qs.set('encounterId', String(params.encounterId));
  if (params?.status) qs.set('status', params.status);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.source) qs.set('source', params.source);
  if (params?.workQueue) qs.set('workQueue', 'true');
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<Paged<ApiImagingRequest>>>(
    `/api/radiology/imaging/requests${suffix}`,
  );
  return body.data;
}

export async function updateImagingRequest(
  id: number,
  payload: {
    status?: string; rejectionReason?: string; scheduledRoom?: string;
    scheduledAt?: string; equipmentId?: number; prepJson?: string; safetyJson?: string;
  },
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/radiology/imaging/requests/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function scheduleImagingRequest(
  id: number,
  payload: { scheduledAt?: string; scheduledRoom?: string; equipmentId?: number },
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/radiology/imaging/requests/${id}/schedule`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function startImagingExam(id: number): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/radiology/imaging/requests/${id}/start`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function completeImagingExam(
  id: number,
  payload?: { studyUid?: string; consumableId?: number; consumableQty?: number },
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/radiology/imaging/requests/${id}/complete-imaging`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

export async function importImagingOrder(
  payload: ImportImagingOrderPayload,
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    '/api/radiology/import-order',
    { method: 'POST', body: payload },
  );
  return body.data;
}

/** Match local/OPC study codes/names to catalog studyIds (creates via import if needed on BE). */
export async function resolveImagingStudyItems(
  items: Array<{ code: string; name: string }>,
): Promise<Array<{ studyId: number; lineNotes?: string }>> {
  const catalog = await listImagingStudies({ status: 'Active' });
  const out: Array<{ studyId: number; lineNotes?: string }> = [];
  for (const item of items) {
    const hit = catalog.find(
      (s) =>
        s.studyCode?.toLowerCase() === item.code.toLowerCase()
        || s.name.toLowerCase() === item.name.toLowerCase()
        || s.name.toLowerCase().includes(item.name.toLowerCase()),
    );
    if (hit) out.push({ studyId: hit.imagingStudyId, lineNotes: item.code });
  }
  return out;
}

/* ── Payment (Phase 3 — cashier) ───────────────────────────────────── */
export async function listCashierImagingRequests(params?: {
  paymentStatus?: string; q?: string; page?: number; limit?: number;
}): Promise<Paged<ApiImagingRequest>> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<Paged<ApiImagingRequest>>>(
    `/api/cashier/payments/imaging-requests${suffix}`,
  );
  return body.data;
}

export async function confirmImagingRequestPayment(
  id: number,
  payload: { paymentChannel: string; paymentRef?: string },
): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/cashier/payments/imaging-requests/${id}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function cancelImagingRequest(id: number): Promise<ApiImagingRequest> {
  const body = await apiRequest<ApiEnvelope<ApiImagingRequest>>(
    `/api/radiology/imaging/requests/${id}/cancel`,
    { method: 'POST' },
  );
  return body.data;
}

export type ApiImagingReport = {
  reportId: number;
  reportNo: string;
  imagingRequestId: number;
  requestNo: string | null;
  personId: number;
  findings: string | null;
  impression: string | null;
  critical: boolean;
  status: string;
  releasedAt: string | null;
  criticalAckAt: string | null;
  criticalAckBy: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  person: ApiImagingRequestPerson | null;
};

export async function listImagingReports(params?: {
  personId?: number;
  imagingRequestId?: number;
  critical?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiImagingReport>> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.imagingRequestId != null) qs.set('imagingRequestId', String(params.imagingRequestId));
  if (params?.critical) qs.set('critical', 'true');
  if (params?.status) qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiImagingReport>>>(
    `/api/radiology/imaging/reports?${qs}`,
  );
  return body.data;
}

export async function getImagingReport(id: number): Promise<ApiImagingReport> {
  const body = await apiRequest<ApiEnvelope<ApiImagingReport>>(
    `/api/radiology/imaging/reports/${id}`,
  );
  return body.data;
}

export async function createImagingReport(payload: {
  imagingRequestId: number;
  findings?: string;
  impression?: string;
  critical?: 'Y' | 'N';
  status?: 'Draft' | 'Released';
}): Promise<ApiImagingReport> {
  const body = await apiRequest<ApiEnvelope<ApiImagingReport>>(
    '/api/radiology/imaging/reports',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function acknowledgeImagingReport(id: number): Promise<ApiImagingReport> {
  const body = await apiRequest<ApiEnvelope<ApiImagingReport>>(
    `/api/radiology/imaging/reports/${id}/acknowledge`,
    { method: 'POST' },
  );
  return body.data;
}

/* ── Reports (Phase 4) ─────────────────────────────────────────────── */
export async function listRadiologyReports(params?: {
  imagingRequestId?: number; status?: string; critical?: boolean;
}): Promise<ApiRadiologyReport[]> {
  const qs = new URLSearchParams();
  if (params?.imagingRequestId != null) qs.set('imagingRequestId', String(params.imagingRequestId));
  if (params?.status) qs.set('status', params.status);
  if (params?.critical != null) qs.set('critical', String(params.critical));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ApiRadiologyReport[] }>>(
    `/api/radiology/reports${suffix}`,
  );
  return body.data.items;
}

export async function submitRadiologyReport(payload: {
  imagingRequestId: number; findings: string; impression?: string;
  recommendation?: string; critical?: boolean;
}): Promise<ApiRadiologyReport> {
  const body = await apiRequest<ApiEnvelope<ApiRadiologyReport>>(
    '/api/radiology/reports',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function verifyRadiologyReport(reportId: number): Promise<ApiRadiologyReport> {
  const body = await apiRequest<ApiEnvelope<ApiRadiologyReport>>(
    `/api/radiology/reports/${reportId}/verify`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function returnRadiologyReport(reportId: number, reason: string): Promise<ApiRadiologyReport> {
  const body = await apiRequest<ApiEnvelope<ApiRadiologyReport>>(
    `/api/radiology/reports/${reportId}/return`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function releaseRadiologyReport(reportId: number): Promise<ApiRadiologyReport> {
  const body = await apiRequest<ApiEnvelope<ApiRadiologyReport>>(
    `/api/radiology/reports/${reportId}/release`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function getCriticalFindings(): Promise<{
  reports: ApiRadiologyReport[];
  ecgs: ApiEcgStudy[];
}> {
  const body = await apiRequest<ApiEnvelope<{ reports: ApiRadiologyReport[]; ecgs: ApiEcgStudy[] }>>(
    '/api/radiology/critical',
  );
  return body.data;
}

export async function getRadiologyMetrics(): Promise<ApiRadMetrics> {
  const body = await apiRequest<ApiEnvelope<ApiRadMetrics>>('/api/radiology/metrics');
  return body.data;
}

/* ── ECG (Phase 5 surface, used by Phase 4 critical + ECG page) ───── */
export async function listEcgStudies(params?: {
  personId?: number; critical?: boolean;
}): Promise<ApiEcgStudy[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.critical != null) qs.set('critical', String(params.critical));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items?: ApiEcgStudy[] } | ApiEcgStudy[]>>(
    `/api/radiology/ecg${suffix}`,
  );
  const data = body.data;
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function recordEcgStudy(payload: {
  personId: number; imagingRequestId?: number; ecgType?: string;
  heartRate?: number; rhythm?: string; prMs?: number; qrsMs?: number;
  qtcMs?: number; stChanges?: string; interpretation?: string;
}): Promise<ApiEcgStudy> {
  const body = await apiRequest<ApiEnvelope<ApiEcgStudy>>(
    '/api/radiology/ecg',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function interpretEcgStudy(
  id: number,
  interpretation: string,
): Promise<ApiEcgStudy> {
  const body = await apiRequest<ApiEnvelope<ApiEcgStudy>>(
    `/api/radiology/ecg/${id}/interpret`,
    { method: 'POST', body: { interpretation } },
  );
  return body.data;
}

/* ── Equipment / consumables ───────────────────────────────────────── */
export async function listRadEquipment(): Promise<ApiRadEquipment[]> {
  const body = await apiRequest<ApiEnvelope<{ items: ApiRadEquipment[] }>>(
    '/api/radiology/equipment',
  );
  return body.data.items;
}

export async function listRadConsumables(): Promise<ApiRadConsumable[]> {
  const body = await apiRequest<ApiEnvelope<{ items: ApiRadConsumable[] }>>(
    '/api/radiology/consumables',
  );
  return body.data.items;
}

export async function updateRadEquipment(
  id: number,
  payload: { status?: string; room?: string; note?: string },
): Promise<ApiRadEquipment> {
  const body = await apiRequest<ApiEnvelope<ApiRadEquipment>>(
    `/api/radiology/equipment/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function createRadEquipment(payload: {
  name: string; modality: string; room?: string; status?: string;
}): Promise<ApiRadEquipment> {
  const body = await apiRequest<ApiEnvelope<ApiRadEquipment>>(
    '/api/radiology/equipment',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function createRadConsumable(payload: {
  name: string; category: string; stock?: number; unit?: string; reorderLevel?: number;
}): Promise<ApiRadConsumable> {
  const body = await apiRequest<ApiEnvelope<ApiRadConsumable>>(
    '/api/radiology/consumables',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function adjustRadConsumable(
  id: number,
  payload: { delta: number; note?: string },
): Promise<ApiRadConsumable> {
  const body = await apiRequest<ApiEnvelope<ApiRadConsumable>>(
    `/api/radiology/consumables/${id}/adjust`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listRadForms(params?: {
  personId?: number; formType?: string;
}): Promise<ApiRadForm[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.formType) qs.set('formType', params.formType);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ApiRadForm[] }>>(
    `/api/radiology/forms${suffix}`,
  );
  return body.data.items;
}

export async function createRadForm(payload: {
  formType: string;
  personId: number;
  imagingRequestId?: number;
  valuesJson?: string;
  signedBy?: string;
}): Promise<ApiRadForm> {
  const body = await apiRequest<ApiEnvelope<ApiRadForm>>(
    '/api/radiology/forms',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listConsumerImagingResults(params?: {
  status?: string; personId?: number; critical?: boolean; limit?: number;
}): Promise<ApiConsumerResult[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.critical != null) qs.set('critical', String(params.critical));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<{ items: ApiConsumerResult[] }>>(
    `/api/radiology/results${suffix}`,
  );
  return body.data.items;
}

