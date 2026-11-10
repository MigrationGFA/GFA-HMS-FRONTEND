import { apiRequest } from './client';
import { env } from '../env';
import type {
  CardRecord,
  CreatePersonPayload,
  PersonRecord,
  UpdatePersonPayload,
} from './patients';

type ApiEnvelope<T> = { data: T };

/**
 * Patient Entry Engine + Records console APIs under /api/records.
 */

export type RegistrationCharges = {
  regFee: number;
  cardFee: number;
  consultFee: number;
  total: number;
  items: Array<{ code: string; label: string; amount: number; serviceId: number; source: string }>;
};

/** Master Services catalog bundle for first-time registration (read-only in wizard). */
export async function fetchRegistrationCharges(params?: {
  payerType?: string;
  payerId?: number;
}): Promise<RegistrationCharges> {
  const qs = new URLSearchParams();
  if (params?.payerType) qs.set('payerType', params.payerType);
  if (params?.payerId != null) qs.set('payerId', String(params.payerId));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<RegistrationCharges>>(
    `/api/records/registration-charges${suffix}`,
  );
  return body.data;
}

export type RecordsDashboardStats = {
  asOf: string;
  timezoneOffsetMinutes: number;
  totalToday: number;
  newToday: number;
  returningToday: number;
  walkInToday: number;
  emergencyToday: number;
  pendingRegistration: number;
  awaitingTriage: number;
  awaitingConsultation: number;
};

export type DirectoryStats = {
  asOf: string;
  totalPatients: number;
  newThisMonth: number;
  active: number;
  inpatients: number;
  outpatients: number;
  hmoNhia: number;
  incompleteProfiles: number;
  duplicatesFlagged: number;
};

export type DirectoryPatient = {
  id: string;
  personId: number;
  hospitalId: string;
  name: string;
  phone: string;
  nin: string;
  age: number;
  gender: string;
  address: string;
  registeredOn: string;
  source: string;
  bloodGroup: string;
  allergies: string;
  insurance: 'NHIS' | 'HMO' | 'Private' | 'None' | string;
  email: string | null;
  status: string;
  patientType: string;
  clinic: string;
  lastVisit: string;
  nokName: string;
  nokPhone: string;
  nokRelationship: string;
};

export type RecordsAuditEntry = {
  auditId: number;
  time: string | null;
  officer: string;
  role: string;
  action: string;
  item: string | null;
  type: string | null;
  hospitalId: string;
  patient: string;
  personId: number | null;
  module: string;
  status: string;
  newValue: string | null;
  oldValue: string | null;
  userId: number | null;
};

export type RecordsAuditStats = {
  asOf: string;
  activitiesToday: number;
  created: number;
  edited: number;
  uploaded: number;
  printed: number;
  deleted: number;
  suspicious: number;
};

/** Live summary cards for Patient Entry Engine + Records dashboard (same metrics). */
export async function getDashboardStats(): Promise<RecordsDashboardStats> {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const body = await apiRequest<ApiEnvelope<RecordsDashboardStats>>(
    `/api/records/dashboard-stats?timezoneOffsetMinutes=${offsetMinutes}`,
  );
  return body.data;
}

export type RecordsOverviewKpis = {
  totalToday: number;
  newToday: number;
  returningToday: number;
  walkInToday: number;
  emergencyToday: number;
  pendingRegistration: number;
  awaitingTriage: number;
  awaitingConsultation: number;
  totalPatients: number;
  incompleteProfiles: number;
  duplicatesFlagged: number;
  openFileRequests: number;
  openAdmissionRequests: number;
  openTransfers: number;
  openReferrals: number;
  dischargesPending: number;
};

export type RecordsOverviewPendingTasks = {
  openFileRequests: number;
  overdueFileRequests: number;
  openAdmissionRequests: number;
  openTransfers: number;
  openReferrals: number;
  dischargesPending: number;
  archivesDueReview: number;
};

export type RecordsOverviewActivity = {
  id: string;
  actor: string;
  action: string;
  timestamp: string | null;
  module: string;
  href: string;
};

export type RecordsOverviewArrival = {
  arrivalNo: string;
  personId: number;
  name: string;
  hospitalId: string;
  type: string;
  routing: string;
  arrival: string;
  href: string;
};

export type RecordsOverviewAlert = {
  type: 'info' | 'warning' | 'danger' | 'success';
  message: string;
  href?: string;
};

export type RecordsOverviewResult = {
  asOf: string;
  timezoneOffsetMinutes: number;
  kpis: RecordsOverviewKpis;
  pendingTasks: RecordsOverviewPendingTasks;
  recentActivity: RecordsOverviewActivity[];
  recentArrivals: RecordsOverviewArrival[];
  alerts: RecordsOverviewAlert[];
};

export function emptyRecordsOverviewKpis(): RecordsOverviewKpis {
  return {
    totalToday: 0,
    newToday: 0,
    returningToday: 0,
    walkInToday: 0,
    emergencyToday: 0,
    pendingRegistration: 0,
    awaitingTriage: 0,
    awaitingConsultation: 0,
    totalPatients: 0,
    incompleteProfiles: 0,
    duplicatesFlagged: 0,
    openFileRequests: 0,
    openAdmissionRequests: 0,
    openTransfers: 0,
    openReferrals: 0,
    dischargesPending: 0,
  };
}

export function emptyRecordsOverviewTasks(): RecordsOverviewPendingTasks {
  return {
    openFileRequests: 0,
    overdueFileRequests: 0,
    openAdmissionRequests: 0,
    openTransfers: 0,
    openReferrals: 0,
    dischargesPending: 0,
    archivesDueReview: 0,
  };
}

/** Composite Records Officer Overview for /dashboard/records. */
export async function fetchRecordsOverview(params?: {
  timezoneOffsetMinutes?: number;
  recentLimit?: number;
}): Promise<RecordsOverviewResult> {
  const qs = new URLSearchParams();
  qs.set(
    'timezoneOffsetMinutes',
    String(params?.timezoneOffsetMinutes ?? -new Date().getTimezoneOffset()),
  );
  if (params?.recentLimit != null) qs.set('recentLimit', String(params.recentLimit));
  const body = await apiRequest<ApiEnvelope<RecordsOverviewResult>>(
    `/api/records/overview?${qs}`,
  );
  return body.data;
}

/** Patient Directory summary cards. */
export async function getDirectoryStats(): Promise<DirectoryStats> {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const body = await apiRequest<ApiEnvelope<DirectoryStats>>(
    `/api/records/directory-stats?timezoneOffsetMinutes=${offsetMinutes}`,
  );
  return body.data;
}

/** Patient Directory list. */
export async function listDirectory(params?: {
  q?: string;
  sex?: string;
  insurance?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: DirectoryPatient[]; meta: { page: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.sex && params.sex !== 'all') qs.set('sex', params.sex);
  if (params?.insurance && params.insurance !== 'all') qs.set('insurance', params.insurance);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{ items: DirectoryPatient[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/records/directory?${qs}`);
  return body.data;
}

/** Records Audit Trail summary cards. */
export async function getAuditStats(): Promise<RecordsAuditStats> {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const body = await apiRequest<ApiEnvelope<RecordsAuditStats>>(
    `/api/records/audit-stats?timezoneOffsetMinutes=${offsetMinutes}`,
  );
  return body.data;
}

/** Records Audit Trail list. */
export async function listRecordsAudit(params?: {
  q?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: RecordsAuditEntry[]; meta: { page: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.type && params.type !== 'all') qs.set('type', params.type);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{ items: RecordsAuditEntry[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/records/audit?${qs}`);
  return body.data;
}

export type ArrivalRoutingStatus =
  | 'Awaiting Triage'
  | 'In Triage'
  | 'Awaiting Consultation'
  | 'In Consultation'
  | 'Emergency'
  | 'Checked Out';

export type ArrivalRow = {
  triageId: number | null;
  personId: number;
  arrivalNo: string;
  hospitalId: string;
  name: string;
  type: 'Walk-In' | 'Appointment' | 'Referral' | 'Emergency' | string;
  clinic: string;
  arrival: string;
  arrivalAt?: string;
  visit: 'New' | 'Follow-up' | 'Emergency' | string;
  routing: ArrivalRoutingStatus | string;
  payment: 'Paid' | 'Pending' | 'NHIA' | 'HMO' | string;
  lastVisit?: string | null;
  status?: string;
};

export type ArrivalsSummary = {
  total: number;
  walkIn: number;
  appointment: number;
  referral: number;
  emergency: number;
  awaitingTriage: number;
  awaitingConsultation: number;
  checkedOut: number;
};

/** Patient Arrival / Check-In list for /records/arrivals. */
export async function listArrivals(params?: {
  q?: string;
  type?: string;
  routing?: string;
  page?: number;
  limit?: number;
}): Promise<{
  asOf: string;
  summary: ArrivalsSummary;
  items: ArrivalRow[];
  meta: { page: number; limit: number; total: number };
}> {
  const qs = new URLSearchParams();
  const offsetMinutes = -new Date().getTimezoneOffset();
  qs.set('timezoneOffsetMinutes', String(offsetMinutes));
  if (params?.q) qs.set('q', params.q);
  if (params?.type && params.type !== 'all') qs.set('type', params.type);
  if (params?.routing && params.routing !== 'all') qs.set('routing', params.routing);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<
    ApiEnvelope<{
      asOf: string;
      summary: ArrivalsSummary;
      items: ArrivalRow[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/records/arrivals?${qs}`);
  return body.data;
}

/** Route an arrival to triage, consultation, emergency, or check out. */
export async function routeArrival(payload: {
  personId: number;
  triageId?: number | null;
  action: 'triage' | 'consult' | 'emergency' | 'checkout';
  clinic?: string;
}): Promise<ArrivalRow> {
  const body = await apiRequest<ApiEnvelope<ArrivalRow>>(
    '/api/records/arrivals/route',
    {
      method: 'POST',
      body: {
        personId: payload.personId,
        ...(payload.triageId != null ? { triageId: payload.triageId } : {}),
        action: payload.action,
        ...(payload.clinic ? { clinic: payload.clinic } : {}),
      },
    },
  );
  return body.data;
}

/** After step 3: create PERSONS + pending PATIENT_CARDS. */
export async function createRegistration(
  payload: CreatePersonPayload,
): Promise<PersonRecord> {
  const body = await apiRequest<ApiEnvelope<PersonRecord>>(
    '/api/records/registrations',
    { method: 'POST', body: payload },
  );
  return body.data;
}

/** Registration queue for the Patient Entry Engine table. */
export async function listRegistrations(params?: {
  paymentStatus?: string;
  q?: string;
  limit?: number;
}): Promise<CardRecord[]> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.q) qs.set('q', params.q);
  qs.set('limit', String(params?.limit ?? 50));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{ items: CardRecord[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/records/registrations${suffix}`);
  return body.data.items;
}

export type RegistrationResumeResult = {
  person: PersonRecord | null;
  card: CardRecord | null;
  paymentCleared: boolean;
  suggestedStep: number | null;
  registrationComplete: boolean;
};

/** Resume wizard from draft — lookup by personId or phone/hospital no. */
export async function resumeRegistration(params?: {
  personId?: number;
  q?: string;
}): Promise<RegistrationResumeResult> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q?.trim()) qs.set('q', params.q.trim());
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<RegistrationResumeResult>>(
    `/api/records/registrations/resume${suffix}`,
  );
  return body.data;
}

/** Load person + card to continue registration from the queue. */
export async function getRegistration(personId: number): Promise<{
  person: PersonRecord;
  card: CardRecord | null;
  paymentCleared: boolean;
}> {
  const body = await apiRequest<
    ApiEnvelope<{
      person: PersonRecord;
      card: CardRecord | null;
      paymentCleared: boolean;
    }>
  >(`/api/records/registrations/${personId}`);
  return body.data;
}

/** Check whether a card has been paid. */
export async function getRegistrationPaymentStatusByCard(
  cardId: number,
): Promise<{ card: CardRecord; paymentCleared: boolean }> {
  const body = await apiRequest<
    ApiEnvelope<{ card: CardRecord; paymentCleared: boolean }>
  >(`/api/records/cards/${cardId}/payment-status`);
  return body.data;
}

/** Check whether a person's latest card has been paid. */
export async function getRegistrationPaymentStatusByPerson(
  personId: number,
): Promise<{ card: CardRecord; paymentCleared: boolean }> {
  const body = await apiRequest<
    ApiEnvelope<{ card: CardRecord; paymentCleared: boolean }>
  >(`/api/records/persons/${personId}/payment-status`);
  return body.data;
}

/** Complete registration after payment. */
export async function completeRegistration(
  personId: number,
  payload: UpdatePersonPayload = {},
): Promise<PersonRecord> {
  const body = await apiRequest<ApiEnvelope<PersonRecord>>(
    `/api/records/registrations/${personId}/complete`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export function isRecordsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}
