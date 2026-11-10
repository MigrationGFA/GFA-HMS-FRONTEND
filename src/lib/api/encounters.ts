import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };

export type EncounterVitals = {
  status: 'Captured' | 'Pending' | string;
  bloodPressure: string | null;
  temperatureC: number | null;
  pulseBpm: number | null;
  respiratoryRate: number | null;
  spo2Pct: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  notes: string | null;
};

export type ConsultationQueueItem = {
  triageId: number;
  personId: number;
  queueNo: string;
  name: string;
  mrn: string;
  age: number | null;
  sex: string;
  clinic: string;
  visit: string;
  arrival: string;
  arrivalAt: string;
  waitMinutes: number;
  wait: string;
  priority: string;
  paymentStatus: string;
  paymentCleared: boolean;
  vitalsStatus: 'Captured' | 'Pending' | string;
  vitals?: EncounterVitals;
  lastVisit: string | null;
  canStart: boolean;
  triageStatus: string;
};

export type EncounterNote = {
  chiefComplaint: string;
  history: string;
  examination: string;
  assessment: string;
  plan: string;
  pastMedicalHistory: string;
  drugHistory: string;
  allergyHistory: string;
  familyHistory: string;
  socialHistory: string;
  followUpPlan: string;
};

export type EncounterPatient = {
  name: string;
  mrn: string;
  age: number | null;
  sex: string;
  clinic: string;
  visit: string;
  priority: string;
  queueNo: string;
  arrival: string;
  paymentStatus: string;
  vitalsStatus: string;
  vitals?: EncounterVitals;
  lastVisit?: string | null;
};

export type EncounterRecord = {
  encounterId: number;
  personId: number;
  triageId: number;
  doctorId: number;
  doctorName: string;
  status: string;
  version: number;
  startedAt: string;
  completedAt: string | null;
  outcome: string | null;
  note: EncounterNote;
  patient: EncounterPatient;
};

export type ConsultationQueueResult = {
  asOf: string;
  summary: { waiting: number; paymentBlocked: number; canStart: number };
  items: ConsultationQueueItem[];
  meta: Meta;
};

export type ClinicalSummary = {
  personId: number;
  demographics: {
    name: string;
    mrn: string;
    age: number | null;
    sex: string | null;
    dateOfBirth: string | null;
    phone: string | null;
    email: string | null;
    bloodGroup: string | null;
    nhisNo: string | null;
    address: string | null;
    nextOfKin: {
      name: string | null;
      relationship: string | null;
      phone: string | null;
    };
  };
  payment: {
    status: string | null;
    cardNo: string | null;
    display: string;
    cleared: boolean;
  };
  currentVisit: {
    triageId: number;
    queueNo: string;
    clinic: string | null;
    status: string;
    priority: string;
    patientType: string | null;
    arrivalAt: string;
    notes: string | null;
  } | null;
  vitals: EncounterVitals;
  allergies: string[];
  activeMeds: Array<{
    drugName: string;
    dose: string | null;
    frequency: string | null;
    status: string;
    rxNo: string;
  }>;
  previousDiagnoses: Array<{
    label: string;
    source: string;
    date: string | null;
  }>;
  historySnippets: {
    pastMedicalHistory: string;
    drugHistory: string;
    allergyHistory: string;
    familyHistory: string;
    socialHistory: string;
  };
  recentNotes: Array<{
    encounterId: number;
    status: string;
    doctorName: string;
    clinic: string | null;
    startedAt: string;
    completedAt: string | null;
    outcome: string | null;
    summary: string;
    note: EncounterNote;
  }>;
  lastVisit: string | null;
};

export type PatientEncounterNoteItem = {
  encounterId: number;
  personId: number;
  triageId: number;
  status: string;
  doctorId: number;
  doctorName: string;
  clinic: string | null;
  priority: string | null;
  visit: string;
  queueNo: string | null;
  startedAt: string;
  completedAt: string | null;
  outcome: string | null;
  version: number;
  summary: string;
  note: EncounterNote;
};

export function isEncountersApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

/** Doctor waiting queue for Consultation Workspace. */
export async function listConsultationQueue(params?: {
  q?: string;
  clinic?: string;
  priority?: string;
  page?: number;
  limit?: number;
}): Promise<ConsultationQueueResult> {
  const qs = new URLSearchParams();
  const offsetMinutes = -new Date().getTimezoneOffset();
  qs.set('timezoneOffsetMinutes', String(offsetMinutes));
  if (params?.q) qs.set('q', params.q);
  if (params?.clinic && params.clinic !== 'all') qs.set('clinic', params.clinic);
  if (params?.priority && params.priority !== 'all') qs.set('priority', params.priority);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<ConsultationQueueResult>>(
    `/api/encounters/consultation-queue?${qs}`,
  );
  return body.data;
}

/** Logged-in doctor's in-progress encounters. */
export async function listActiveEncounters(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: EncounterRecord[]; meta: Meta }> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{ items: EncounterRecord[]; meta: Meta }>
  >(`/api/encounters/active?${qs}`);
  return body.data;
}

/** Logged-in doctor's consultations completed today. */
export async function listCompletedEncounters(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: EncounterRecord[]; meta: Meta; asOf?: string }> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  qs.set('timezoneOffsetMinutes', String(-new Date().getTimezoneOffset()));
  const body = await apiRequest<
    ApiEnvelope<{ items: EncounterRecord[]; meta: Meta; asOf?: string }>
  >(`/api/encounters/completed?${qs}`);
  return body.data;
}

/** Start consultation from triage (payment must be cleared). */
export async function startEncounter(payload: {
  triageId: number;
  clinic?: string;
}): Promise<EncounterRecord> {
  const body = await apiRequest<ApiEnvelope<EncounterRecord>>(
    '/api/encounters/start',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function getEncounter(id: number): Promise<EncounterRecord> {
  const body = await apiRequest<ApiEnvelope<EncounterRecord>>(
    `/api/encounters/${id}`,
  );
  return body.data;
}

/** Autosave draft clinical notes with optimistic version. */
export async function patchEncounter(
  id: number,
  payload: {
    version?: number;
    idempotencyKey?: string;
    chiefComplaint?: string;
    history?: string;
    examination?: string;
    assessment?: string;
    plan?: string;
    pastMedicalHistory?: string;
    drugHistory?: string;
    allergyHistory?: string;
    familyHistory?: string;
    socialHistory?: string;
    followUpPlan?: string;
  },
): Promise<EncounterRecord> {
  const body = await apiRequest<ApiEnvelope<EncounterRecord>>(
    `/api/encounters/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function completeEncounter(
  id: number,
  payload?: {
    outcome?: string;
    followUpDate?: string;
    followUpClinic?: string;
    followUpTime?: string;
    followUpPriority?: string;
    followUpReason?: string;
  },
): Promise<EncounterRecord> {
  const body = await apiRequest<ApiEnvelope<EncounterRecord>>(
    `/api/encounters/${id}/complete`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

export type FollowUpItem = {
  id: number;
  personId: number;
  encounterId: number | null;
  name: string;
  mrn: string;
  clinic: string;
  prevDx: string;
  lastVisit: string | null;
  date: string;
  time: string | null;
  priority: string;
  status: 'Scheduled' | 'Due Today' | 'Missed' | 'Attended' | 'Cancelled' | string;
  storedStatus: string;
  reason: string | null;
  reminder: string | null;
  doctorId: number;
  doctorName?: string;
};

export type FollowUpsList = {
  asOf: string;
  summary: {
    thisWeek: number;
    dueToday: number;
    missed: number;
    scheduled: number;
    attended: number;
  };
  items: FollowUpItem[];
  meta: Meta & { from?: string; to?: string };
};

/** List follow-ups for the clinical workspace Follow-Up tab. */
export async function listFollowUps(params?: {
  q?: string;
  clinic?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  timezoneOffsetMinutes?: number;
  mine?: boolean;
}): Promise<FollowUpsList> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.clinic && params.clinic !== 'all') qs.set('clinic', params.clinic);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  qs.set(
    'timezoneOffsetMinutes',
    String(params?.timezoneOffsetMinutes ?? -new Date().getTimezoneOffset()),
  );
  if (params?.mine) qs.set('mine', '1');
  const body = await apiRequest<ApiEnvelope<FollowUpsList>>(
    `/api/encounters/follow-ups?${qs}`,
  );
  return body.data;
}

/** Schedule a follow-up appointment. */
export async function createFollowUp(payload: {
  personId: number;
  scheduledDate: string;
  encounterId?: number;
  clinic?: string;
  scheduledTime?: string;
  priority?: string;
  prevDx?: string;
  reason?: string;
  reminder?: string;
}): Promise<FollowUpItem> {
  const body = await apiRequest<ApiEnvelope<FollowUpItem>>(
    `/api/encounters/follow-ups`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function updateFollowUp(
  id: number,
  payload: {
    status?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    clinic?: string;
    priority?: string;
    reason?: string;
  },
): Promise<FollowUpItem> {
  const body = await apiRequest<ApiEnvelope<FollowUpItem>>(
    `/api/encounters/follow-ups/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

/** Aggregated clinical context for queue eye-view and active consult panels. */
export async function getPatientClinicalSummary(
  personId: number,
  params?: { triageId?: number },
): Promise<ClinicalSummary> {
  const qs = new URLSearchParams();
  if (params?.triageId != null) qs.set('triageId', String(params.triageId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<ClinicalSummary>>(
    `/api/encounters/patients/${personId}/clinical-summary${suffix}`,
  );
  return body.data;
}

/** Paginated encounter notes timeline for a patient. */
export async function listPatientEncounterNotes(
  personId: number,
  params?: { page?: number; limit?: number },
): Promise<{ items: PatientEncounterNoteItem[]; meta: Meta }> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 20));
  const body = await apiRequest<
    ApiEnvelope<{ items: PatientEncounterNoteItem[]; meta: Meta }>
  >(`/api/encounters/patients/${personId}/notes?${qs}`);
  return body.data;
}

export function formatVitalsLine(v?: EncounterVitals | null): string {
  if (!v || v.status === 'Pending') return 'Not captured';
  const parts: string[] = [];
  if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
  if (v.pulseBpm != null) parts.push(`HR ${v.pulseBpm}`);
  if (v.temperatureC != null) parts.push(`Temp ${v.temperatureC}°C`);
  if (v.respiratoryRate != null) parts.push(`RR ${v.respiratoryRate}`);
  if (v.spo2Pct != null) parts.push(`SpO₂ ${v.spo2Pct}%`);
  if (v.weightKg != null) parts.push(`Wt ${v.weightKg}kg`);
  return parts.length ? parts.join(' · ') : 'Captured';
}
