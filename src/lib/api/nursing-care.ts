import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

type ListEnvelope<T> = { items: T[]; meta?: { page: number; limit: number; total: number } };

function unwrapList<T>(data: ListEnvelope<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}

export function isNursingCareApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export interface NursingCarePerson {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
}

export function nursingCarePersonName(
  person: NursingCarePerson | null | undefined,
) {
  if (!person) return '—';
  return (
    [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ') || '—'
  );
}

/* ── Notes ─────────────────────────────────────────────────────────── */

export type NursingCareNoteType =
  | 'General'
  | 'Shift'
  | 'Incident'
  | 'Progress'
  | 'MentalHealth'
  | 'Emergency'
  | 'WoundCare'
  | 'Medication'
  | 'Discharge';

export interface NursingCareNote {
  noteId: number;
  admissionId: number | null;
  personId: number;
  noteType: NursingCareNoteType | string;
  format: 'Narrative' | 'SOAP' | 'DAR' | string;
  body: string;
  authorBy: string | null;
  createdAt: string;
  person?: NursingCarePerson | null;
}

export interface CreateNursingNotePayload {
  personId: number;
  admissionId?: number;
  noteType?: NursingCareNoteType | string;
  format?: 'Narrative' | 'SOAP' | 'DAR' | string;
  body: string;
  authorBy?: string;
}

export async function listNursingNotes(params?: {
  personId?: number;
  admissionId?: number;
  type?: string;
}): Promise<NursingCareNote[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.type) qs.set('type', params.type);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingCareNote> | NursingCareNote[]>
  >(`/api/nursing/notes${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingNote(
  payload: CreateNursingNotePayload,
): Promise<NursingCareNote> {
  // Author comes from JWT on the server — do not send authorBy (forbidNonWhitelisted).
  const body = await apiRequest<ApiEnvelope<NursingCareNote>>(
    '/api/nursing/notes',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        admissionId: payload.admissionId,
        noteType: payload.noteType ?? 'General',
        format: payload.format,
        body: payload.body,
      },
    },
  );
  return body.data;
}

/* ── Ward vitals ───────────────────────────────────────────────────── */

export interface NursingCareVital {
  vitalId: number;
  admissionId: number | null;
  personId: number;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bloodPressure: string | null;
  temperatureC: number | null;
  pulseBpm: number | null;
  respiratoryRate: number | null;
  spo2Pct: number | null;
  bloodSugar: number | null;
  painScore: number | null;
  abnormal: boolean;
  flags: string[] | string | null;
  notes: string | null;
  recordedBy: string | null;
  recordedAt: string;
  person?: NursingCarePerson | null;
}

export interface CreateNursingVitalPayload {
  personId: number;
  admissionId?: number;
  weightKg?: number;
  heightCm?: number;
  bloodPressure?: string;
  temperatureC?: number;
  pulseBpm?: number;
  respiratoryRate?: number;
  spo2Pct?: number;
  bloodSugar?: number;
  painScore?: number;
  notes?: string;
  recordedBy?: string;
}

export async function listNursingVitals(params?: {
  personId?: number;
  admissionId?: number;
  abnormal?: boolean;
}): Promise<NursingCareVital[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.abnormal != null) qs.set('abnormal', String(params.abnormal));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingCareVital> | NursingCareVital[]>
  >(`/api/nursing/vitals${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingVital(
  payload: CreateNursingVitalPayload,
): Promise<NursingCareVital> {
  const body = await apiRequest<ApiEnvelope<NursingCareVital>>(
    '/api/nursing/vitals',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        admissionId: payload.admissionId,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        bloodPressure: payload.bloodPressure,
        temperatureC: payload.temperatureC,
        pulseBpm: payload.pulseBpm,
        respiratoryRate: payload.respiratoryRate,
        spo2Pct: payload.spo2Pct,
        bloodSugar: payload.bloodSugar,
        painScore: payload.painScore,
        notes: payload.notes,
      },
    },
  );
  return body.data;
}

export function vitalFlags(v: NursingCareVital): string[] {
  if (Array.isArray(v.flags)) return v.flags;
  if (typeof v.flags === 'string' && v.flags.trim()) {
    return v.flags.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/* ── Care plans ────────────────────────────────────────────────────── */

export interface NursingCarePlan {
  carePlanId: number;
  admissionId: number | null;
  personId: number;
  diagnosis: string | null;
  problem: string | null;
  goal: string | null;
  intervention: string | null;
  actionTaken: string | null;
  evaluation: string | null;
  reviewDate: string | null;
  status: 'active' | 'ongoing' | 'resolved' | string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  person?: NursingCarePerson | null;
}

export interface CreateNursingCarePlanPayload {
  personId: number;
  admissionId?: number;
  diagnosis?: string;
  problem?: string;
  goal?: string;
  intervention?: string;
  reviewDate?: string;
  status?: string;
  createdBy?: string;
}

export interface UpdateNursingCarePlanPayload {
  diagnosis?: string;
  problem?: string;
  goal?: string;
  intervention?: string;
  actionTaken?: string;
  evaluation?: string;
  reviewDate?: string;
  status?: string;
}

export async function listNursingCarePlans(params?: {
  personId?: number;
  admissionId?: number;
  status?: string;
}): Promise<NursingCarePlan[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingCarePlan> | NursingCarePlan[]>
  >(`/api/nursing/care-plans${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingCarePlan(
  payload: CreateNursingCarePlanPayload,
): Promise<NursingCarePlan> {
  const body = await apiRequest<ApiEnvelope<NursingCarePlan>>(
    '/api/nursing/care-plans',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        admissionId: payload.admissionId,
        diagnosis: payload.diagnosis,
        problem: payload.problem,
        goal: payload.goal,
        intervention: payload.intervention,
        reviewDate: payload.reviewDate,
        status: payload.status,
      },
    },
  );
  return body.data;
}

export async function updateNursingCarePlan(
  id: number,
  payload: UpdateNursingCarePlanPayload,
): Promise<NursingCarePlan> {
  const body = await apiRequest<ApiEnvelope<NursingCarePlan>>(
    `/api/nursing/care-plans/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

/* ── Observations ──────────────────────────────────────────────────── */

export interface NursingCareObservation {
  observationId: number;
  admissionId: number | null;
  personId: number;
  chart: string;
  interval: string | null;
  fields: Record<string, string | number | boolean | null>;
  recordedBy: string | null;
  recordedAt: string;
  person?: NursingCarePerson | null;
}

export interface CreateNursingObservationPayload {
  personId: number;
  admissionId?: number;
  chart?: string;
  interval?: string;
  fields: Record<string, string | number | boolean | null>;
  recordedBy?: string;
}

export async function listNursingObservations(params?: {
  personId?: number;
  admissionId?: number;
  chart?: string;
}): Promise<NursingCareObservation[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.admissionId != null) qs.set('admissionId', String(params.admissionId));
  if (params?.chart) qs.set('chart', params.chart);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingCareObservation> | NursingCareObservation[]>
  >(`/api/nursing/observations${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingObservation(
  payload: CreateNursingObservationPayload,
): Promise<NursingCareObservation> {
  const body = await apiRequest<ApiEnvelope<NursingCareObservation>>(
    '/api/nursing/observations',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        admissionId: payload.admissionId,
        chart: payload.chart ?? 'Observation',
        interval: payload.interval,
        fields: payload.fields,
      },
    },
  );
  return body.data;
}

/* ── Incidents ─────────────────────────────────────────────────────── */

export interface NursingCareIncident {
  incidentId: number;
  admissionId: number | null;
  personId: number | null;
  patientName: string | null;
  incidentType: string;
  description: string;
  actionTaken: string | null;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  status: 'REPORTED' | 'ESCALATED' | 'REVIEWED' | 'CLOSED' | string;
  reportedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  person?: NursingCarePerson | null;
}

export interface CreateNursingIncidentPayload {
  personId?: number;
  admissionId?: number;
  patientName?: string;
  incidentType: string;
  description: string;
  actionTaken?: string;
  severity?: string;
  reportedBy?: string;
}

export async function listNursingIncidents(params?: {
  personId?: number;
  status?: string;
  severity?: string;
}): Promise<NursingCareIncident[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.status) qs.set('status', params.status);
  if (params?.severity) qs.set('severity', params.severity);
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingCareIncident> | NursingCareIncident[]>
  >(`/api/nursing/incidents${suffix}`);
  return unwrapList(body.data);
}

export async function createNursingIncident(
  payload: CreateNursingIncidentPayload,
): Promise<NursingCareIncident> {
  const body = await apiRequest<ApiEnvelope<NursingCareIncident>>(
    '/api/nursing/incidents',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        admissionId: payload.admissionId,
        patientName: payload.patientName,
        incidentType: payload.incidentType,
        description: payload.description,
        actionTaken: payload.actionTaken,
        severity: payload.severity,
      },
    },
  );
  return body.data;
}

export async function reviewNursingIncident(
  id: number,
  payload: { reviewNote?: string; note?: string; reviewedBy?: string } = {},
): Promise<NursingCareIncident> {
  const note = payload.note ?? payload.reviewNote;
  const body = await apiRequest<ApiEnvelope<NursingCareIncident>>(
    `/api/nursing/incidents/${id}/review`,
    {
      method: 'PATCH',
      body: note != null && note !== '' ? { note } : {},
    },
  );
  return body.data;
}

/* ── Forms ─────────────────────────────────────────────────────────── */

export interface NursingFormField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  showIf?: { key: string; equals: string | number | boolean };
}

export interface NursingFormTemplate {
  templateId: number;
  code: string;
  title: string;
  active: boolean;
  /** Backend stores field defs under `schema` (often `{ fields: [...] }`). */
  schema?: Record<string, unknown> | { fields?: NursingFormField[] };
  /** Normalized locally when present on seed/local templates. */
  fields?: NursingFormField[];
  category?: string;
  createdAt?: string;
}

export function formTemplateFields(t: NursingFormTemplate): NursingFormField[] {
  if (Array.isArray(t.fields) && t.fields.length) return t.fields;
  const schema = t.schema;
  if (schema && typeof schema === 'object' && Array.isArray((schema as { fields?: unknown }).fields)) {
    return (schema as { fields: NursingFormField[] }).fields;
  }
  return [];
}

export interface NursingFormInstance {
  instanceId: number;
  templateId: number;
  templateCode?: string;
  admissionId: number | null;
  personId: number;
  values: Record<string, string | number | boolean>;
  signedBy: string | null;
  status?: string;
  createdAt: string;
  person?: NursingCarePerson | null;
  template?: { templateId: number; code: string; title: string } | null;
}

export interface CreateNursingFormInstancePayload {
  templateId: number;
  personId: number;
  admissionId?: number;
  values: Record<string, string | number | boolean>;
  signedBy?: string;
}

export async function listNursingFormTemplates(params?: {
  active?: boolean;
}): Promise<NursingFormTemplate[]> {
  const qs = new URLSearchParams();
  if (params?.active != null) qs.set('active', String(params.active));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingFormTemplate> | NursingFormTemplate[]>
  >(`/api/nursing/forms/templates${suffix}`);
  return unwrapList(body.data);
}

export async function listNursingFormInstances(params?: {
  personId?: number;
  templateId?: number;
}): Promise<NursingFormInstance[]> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.templateId != null) qs.set('templateId', String(params.templateId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<NursingFormInstance> | NursingFormInstance[]>
  >(`/api/nursing/forms/instances${suffix}`);
  return unwrapList(body.data);
}

export async function getNursingFormInstance(
  id: number,
): Promise<NursingFormInstance> {
  const body = await apiRequest<ApiEnvelope<NursingFormInstance>>(
    `/api/nursing/forms/instances/${id}`,
  );
  return body.data;
}

export async function createNursingFormInstance(
  payload: CreateNursingFormInstancePayload,
): Promise<NursingFormInstance> {
  const body = await apiRequest<ApiEnvelope<NursingFormInstance>>(
    '/api/nursing/forms/instances',
    {
      method: 'POST',
      body: {
        templateId: payload.templateId,
        personId: payload.personId,
        admissionId: payload.admissionId,
        values: payload.values,
      },
    },
  );
  return body.data;
}

/* ── Timeline & alerts ─────────────────────────────────────────────── */

export interface NursingTimelineEvent {
  eventId?: string | number;
  at: string;
  kind: string;
  title: string;
  detail?: string | null;
  tone?: string | null;
  source?: string | null;
}

interface TimelineApiItem {
  type: string;
  id: number;
  at: string;
  summary: string;
  data?: unknown;
}

function timelineTone(kind: string): string {
  switch (kind) {
    case 'vital':
      return 'amber';
    case 'incident':
      return 'red';
    case 'observation':
      return 'sky';
    case 'care-plan':
      return 'purple';
    case 'note':
      return 'green';
    default:
      return 'blue';
  }
}

export async function getNursingTimeline(params: {
  personId: number;
}): Promise<NursingTimelineEvent[]> {
  const qs = new URLSearchParams();
  qs.set('personId', String(params.personId));
  const body = await apiRequest<
    ApiEnvelope<ListEnvelope<TimelineApiItem> | TimelineApiItem[] | NursingTimelineEvent[]>
  >(`/api/nursing/timeline?${qs}`);
  const raw = body.data;
  const items = Array.isArray(raw) ? raw : unwrapList(raw);
  return items.map((e) => {
    if ('kind' in e && 'title' in e) {
      return e as NursingTimelineEvent;
    }
    const item = e as TimelineApiItem;
    const data = item.data && typeof item.data === 'object' ? (item.data as Record<string, unknown>) : null;
    const detail =
      (data && typeof data.body === 'string' && data.body) ||
      (data && typeof data.description === 'string' && data.description) ||
      (data && typeof data.bloodPressure === 'string' && `BP ${data.bloodPressure}`) ||
      item.summary;
    return {
      eventId: item.id,
      at: item.at,
      kind: item.type,
      title: item.summary,
      detail,
      tone: timelineTone(item.type),
      source: item.type,
    };
  });
}

export interface NursingAlert {
  alertId: string | number;
  group: string;
  severity?: string | null;
  message: string;
  personId?: number | null;
  patientName?: string | null;
  admissionId?: number | null;
  createdAt?: string | null;
  acknowledged?: boolean;
}

export interface NursingAlertsPayload {
  abnormalVitals48h: NursingCareVital[];
  openHighIncidents: NursingCareIncident[];
  dischargeOrderedCount: number;
}

export async function listNursingAlerts(): Promise<NursingAlertsPayload> {
  const body = await apiRequest<ApiEnvelope<NursingAlertsPayload>>(
    '/api/nursing/alerts',
  );
  return body.data;
}

/** Flatten alerts payload into UI-friendly rows. */
export function flattenNursingAlerts(payload: NursingAlertsPayload): NursingAlert[] {
  const vitals = payload.abnormalVitals48h.map((v) => ({
    alertId: `vital-${v.vitalId}`,
    group: 'Vitals Alerts',
    severity: 'High',
    message: `Person #${v.personId} — ${vitalFlags(v).join(', ') || v.bloodPressure || 'Abnormal vitals'}`,
    personId: v.personId,
    admissionId: v.admissionId,
    createdAt: v.recordedAt,
  }));
  const incidents = payload.openHighIncidents.map((i) => ({
    alertId: `incident-${i.incidentId}`,
    group: i.severity === 'Critical' ? 'Critical Alerts' : 'Incident Alerts',
    severity: i.severity,
    message: `${i.patientName ?? (i.personId ? `Person #${i.personId}` : 'Unassigned')} — ${i.incidentType}: ${i.description}`,
    personId: i.personId,
    patientName: i.patientName,
    admissionId: i.admissionId,
    createdAt: i.createdAt,
  }));
  const discharge: NursingAlert[] =
    payload.dischargeOrderedCount > 0
      ? [
          {
            alertId: 'discharge-ordered',
            group: 'Discharge Alerts',
            severity: 'Moderate',
            message: `${payload.dischargeOrderedCount} patient(s) awaiting nursing discharge clearance`,
          },
        ]
      : [];
  return [...vitals, ...incidents, ...discharge];
}
