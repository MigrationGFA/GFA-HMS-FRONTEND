import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type ListEnvelope<T> = { items: T[] };

function unwrapList<T>(data: ListEnvelope<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}

export function isNursingOpsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export interface NursingOpsPerson {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
}

export function nursingOpsPersonName(person?: NursingOpsPerson | null) {
  if (!person) return '—';
  return (
    [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ') || '—'
  );
}

/* ── Orders ─────────────────────────────────────────────────────────── */

export interface NursingOrderItem {
  code: string;
  name: string;
  price?: number;
  covered?: boolean;
}

export interface NursingOrder {
  orderId: number;
  personId: number;
  admissionId: number | null;
  kind: 'lab' | 'drug' | 'imaging' | string;
  items: NursingOrderItem[];
  status: string;
  orderedBy: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  paymentStatus: string;
  labStatus: string | null;
  sampleId: string | null;
  sampleCollectedAt: string | null;
  sampleCollectedBy: string | null;
  paymentCleared: boolean;
  createdAt: string;
  updatedAt: string | null;
  person?: NursingOpsPerson | null;
}

export async function listNursingOrders(params?: {
  personId?: number;
  admissionId?: number;
  kind?: string;
  status?: string;
}): Promise<NursingOrder[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.kind) qs.set('kind', params.kind);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingOrder> | NursingOrder[]>
  >(`/api/nursing/orders${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingOrder(payload: {
  personId: number;
  admissionId?: number;
  kind: 'lab' | 'drug' | 'imaging' | string;
  items: NursingOrderItem[];
  orderedBy?: string;
  paymentStatus?: string;
}): Promise<NursingOrder> {
  const body = await apiRequest<ApiEnvelope<NursingOrder>>('/api/nursing/orders', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function acknowledgeNursingOrder(
  orderId: number,
): Promise<NursingOrder> {
  const body = await apiRequest<ApiEnvelope<NursingOrder>>(
    `/api/nursing/orders/${orderId}/acknowledge`,
    { method: 'PATCH' },
  );
  return body.data;
}

/* ── Tasks ──────────────────────────────────────────────────────────── */

export interface NursingOpsTask {
  taskId: number;
  personId: number | null;
  admissionId: number | null;
  patientName: string | null;
  title: string;
  category: string;
  status: string;
  dueAt: string | null;
  sourceOrderId: number | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export async function listNursingTasks(params?: {
  personId?: number;
  admissionId?: number;
  status?: string;
  category?: string;
}): Promise<NursingOpsTask[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingOpsTask> | NursingOpsTask[]>
  >(`/api/nursing/tasks${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingTask(payload: {
  personId?: number;
  admissionId?: number;
  patientName?: string;
  title: string;
  category?: string;
  dueAt?: string;
  sourceOrderId?: number;
  assignedTo?: string;
}): Promise<NursingOpsTask> {
  const body = await apiRequest<ApiEnvelope<NursingOpsTask>>(
    '/api/nursing/tasks',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function updateNursingTask(
  taskId: number,
  payload: { status?: string; assignedTo?: string },
): Promise<NursingOpsTask> {
  const body = await apiRequest<ApiEnvelope<NursingOpsTask>>(
    `/api/nursing/tasks/${taskId}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

/* ── MAR ────────────────────────────────────────────────────────────── */

export interface NursingMarEntry {
  marId: number;
  personId: number;
  admissionId: number | null;
  orderId: number | null;
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  scheduledTime: string;
  kind: string;
  status: string;
  reason: string | null;
  sideEffects: string | null;
  source: string | null;
  prescriber: string | null;
  notes: string | null;
  pharmacyDispensed: boolean;
  administeredBy: string | null;
  administeredAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  person?: NursingOpsPerson | null;
}

export async function listNursingMar(params?: {
  personId?: number;
  admissionId?: number;
  status?: string;
  kind?: string;
}): Promise<NursingMarEntry[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.status) qs.set('status', params.status);
  if (params?.kind) qs.set('kind', params.kind);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingMarEntry> | NursingMarEntry[]>
  >(`/api/nursing/mar${suffix}`);
  return unwrapList(body.data);
}

export async function createExternalMar(payload: {
  personId: number;
  admissionId?: number;
  drug: string;
  dose?: string;
  route?: string;
  frequency?: string;
  scheduledTime?: string;
  source?: string;
  prescriber?: string;
  notes?: string;
}): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    '/api/nursing/mar/external',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function administerMar(
  marId: number,
  reason?: string,
): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    `/api/nursing/mar/${marId}/administer`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function refuseMar(
  marId: number,
  reason: string,
): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    `/api/nursing/mar/${marId}/refuse`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function missMar(
  marId: number,
  reason: string,
): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    `/api/nursing/mar/${marId}/miss`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function holdMar(
  marId: number,
  reason: string,
): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    `/api/nursing/mar/${marId}/hold`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function dispenseMar(marId: number): Promise<NursingMarEntry> {
  const body = await apiRequest<ApiEnvelope<NursingMarEntry>>(
    `/api/nursing/mar/${marId}/dispense`,
    { method: 'POST' },
  );
  return body.data;
}

/* ── Samples ────────────────────────────────────────────────────────── */

export async function listNursingSamples(params?: {
  personId?: number;
  admissionId?: number;
}): Promise<NursingOrder[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingOrder> | NursingOrder[]>
  >(`/api/nursing/samples${suffix}`);
  return unwrapList(body.data);
}

export async function collectNursingSample(
  orderId: number,
): Promise<NursingOrder> {
  const body = await apiRequest<ApiEnvelope<NursingOrder>>(
    `/api/nursing/samples/${orderId}/collect`,
    { method: 'POST' },
  );
  return body.data;
}

/* ── Shifts ─────────────────────────────────────────────────────────── */

export interface NursingShift {
  shiftId: number;
  wardId: number | null;
  wardName: string | null;
  wardCode: string | null;
  shift: string;
  status: string;
  leadNurse: string | null;
  staffCount: number;
  patientsCovered: number;
  startAt: string | null;
  endAt: string | null;
  summary: string | null;
  createdAt: string;
}

export async function listNursingShifts(params?: {
  wardId?: number;
  status?: string;
}): Promise<NursingShift[]> {
  const qs = new URLSearchParams();
  if (params?.wardId != null) qs.set('wardId', String(params.wardId));
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingShift> | NursingShift[]>
  >(`/api/nursing/shifts${suffix}`);
  return unwrapList(body.data);
}

export async function getCurrentNursingShift(
  wardId?: number,
): Promise<NursingShift | null> {
  const qs = wardId != null ? `?wardId=${wardId}` : '';
  const body = await apiRequest<ApiEnvelope<NursingShift | null>>(
    `/api/nursing/shifts/current${qs}`,
  );
  return body.data;
}

export async function startNursingShift(payload: {
  wardId?: number;
  shift: 'Morning' | 'Afternoon' | 'Night' | string;
  leadNurse?: string;
  staffCount?: number;
}): Promise<NursingShift> {
  const body = await apiRequest<ApiEnvelope<NursingShift>>(
    '/api/nursing/shifts/start',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function endNursingShift(
  shiftId: number,
  summary?: string,
): Promise<NursingShift> {
  const body = await apiRequest<ApiEnvelope<NursingShift>>(
    `/api/nursing/shifts/${shiftId}/end`,
    { method: 'PATCH', body: { summary } },
  );
  return body.data;
}

/* ── Handovers ──────────────────────────────────────────────────────── */

export interface NursingHandover {
  handoverId: number;
  wardId: number | null;
  wardName: string | null;
  shift: string;
  summary: string;
  criticalPatients: string[];
  pendingMeds: string | null;
  pendingLabs: string | null;
  incidents: string | null;
  specialInstructions: string | null;
  handedOverBy: string | null;
  receivedBy: string | null;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
}

export async function listNursingHandovers(params?: {
  wardId?: number;
}): Promise<NursingHandover[]> {
  const qs = new URLSearchParams();
  if (params?.wardId != null) qs.set('wardId', String(params.wardId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingHandover> | NursingHandover[]>
  >(`/api/nursing/handovers${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingHandover(payload: {
  wardId?: number;
  wardName?: string;
  shift: 'Morning' | 'Afternoon' | 'Night' | string;
  summary: string;
  criticalPatients?: string[];
  pendingMeds?: string;
  pendingLabs?: string;
  incidents?: string;
  specialInstructions?: string;
}): Promise<NursingHandover> {
  const body = await apiRequest<ApiEnvelope<NursingHandover>>(
    '/api/nursing/handovers',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function acknowledgeNursingHandover(
  handoverId: number,
): Promise<NursingHandover> {
  const body = await apiRequest<ApiEnvelope<NursingHandover>>(
    `/api/nursing/handovers/${handoverId}/acknowledge`,
    { method: 'PATCH' },
  );
  return body.data;
}

/* ── ICU ────────────────────────────────────────────────────────────── */

export interface NursingIcuNote {
  icuNoteId: number;
  personId: number;
  admissionId: number | null;
  bloodPressure: string | null;
  spo2Pct: number | null;
  heartRate: number | null;
  ventSettings: string | null;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string;
}

export interface NursingIcuInfusion {
  infusionId: number;
  personId: number;
  admissionId: number | null;
  medication: string;
  currentRate: string | null;
  newRate: string | null;
  reason: string | null;
  note: string | null;
  status: string;
  recordedBy: string | null;
  recordedAt: string;
}

export interface NursingIcuBoardRow {
  admissionId: number;
  personId: number;
  person: NursingOpsPerson | null;
  wardName: string | null;
  bedLabel: string | null;
  diagnosis: string | null;
  latestNote: NursingIcuNote | null;
  latestInfusion: NursingIcuInfusion | null;
}

export async function listIcuBoard(): Promise<NursingIcuBoardRow[]> {
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingIcuBoardRow> | NursingIcuBoardRow[]>
  >('/api/nursing/icu/board');
  return unwrapList(body.data);
}

export async function createIcuNote(payload: {
  personId: number;
  admissionId?: number;
  bloodPressure?: string;
  spo2Pct?: number;
  heartRate?: number;
  ventSettings?: string;
  note?: string;
}): Promise<NursingIcuNote> {
  const body = await apiRequest<ApiEnvelope<NursingIcuNote>>(
    '/api/nursing/icu/notes',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function createIcuInfusion(payload: {
  personId: number;
  admissionId?: number;
  medication: string;
  currentRate?: string;
  newRate?: string;
  reason?: string;
  note?: string;
}): Promise<NursingIcuInfusion> {
  const body = await apiRequest<ApiEnvelope<NursingIcuInfusion>>(
    '/api/nursing/icu/infusions',
    { method: 'POST', body: payload },
  );
  return body.data;
}

/* ── Comms ──────────────────────────────────────────────────────────── */

export interface NursingMessage {
  messageId: number;
  channel: string;
  body: string;
  fromLabel: string | null;
  fromUserId: number | null;
  personId: number | null;
  isMine: boolean;
  readAt: string | null;
  createdAt: string;
}

export async function listNursingMessages(channel?: string): Promise<NursingMessage[]> {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingMessage> | NursingMessage[]>
  >(`/api/nursing/messages${qs}`);
  return unwrapList(body.data);
}

export async function createNursingMessage(payload: {
  channel: string;
  body: string;
  personId?: number;
}): Promise<NursingMessage> {
  const body = await apiRequest<ApiEnvelope<NursingMessage>>(
    '/api/nursing/messages',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function markNursingMessageRead(
  messageId: number,
): Promise<NursingMessage> {
  const body = await apiRequest<ApiEnvelope<NursingMessage>>(
    `/api/nursing/messages/${messageId}/read`,
    { method: 'PATCH' },
  );
  return body.data;
}

/* ── Reports & analytics ────────────────────────────────────────────── */

export interface NursingReport {
  reportId: number;
  reportType: string;
  rangeLabel: string | null;
  wardId: number | null;
  wardName: string | null;
  notes: string | null;
  payload: unknown;
  generatedBy: string | null;
  createdAt: string;
}

export async function listNursingReports(): Promise<NursingReport[]> {
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingReport> | NursingReport[]>
  >('/api/nursing/reports');
  return unwrapList(body.data);
}

export async function generateNursingReport(payload: {
  reportType: string;
  rangeLabel?: string;
  wardId?: number;
  notes?: string;
}): Promise<NursingReport> {
  const body = await apiRequest<ApiEnvelope<NursingReport>>(
    '/api/nursing/reports/generate',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export interface NursingAnalyticsSummary {
  admissions: number;
  discharges: number;
  dama: number;
  trialLeave: number;
  referrals: number;
  deaths: number;
  openIncidents: number;
  marDue: number;
  marGiven: number;
  marMissed: number;
  tasksPending: number;
  tasksCompleted: number;
  medCompliance: number;
  obsCompliance: number;
  wardOccupancy: Array<{
    wardId: number;
    code: string;
    name: string;
    capacity: number;
    occupied: number;
    pct: number;
  }>;
}

export async function getNursingAnalytics(): Promise<NursingAnalyticsSummary> {
  const body = await apiRequest<ApiEnvelope<NursingAnalyticsSummary>>(
    '/api/nursing/analytics/summary',
  );
  return body.data;
}
