import { apiRequest } from './client';
import { env } from '../env';

export type NursingQueueStatus =
  | 'Waiting'
  | 'In Triage'
  | 'Triage Completed'
  | 'Sent to Consultation'
  | 'Cancelled';

export type NursingQueuePerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  bloodGroup: string | null;
};

export type PatientQueueRecord = {
  triageId: number;
  personId: number;
  queueNo: string;
  clinic: string | null;
  status: NursingQueueStatus | string;
  priority: string;
  priorityReason: string | null;
  patientType: string | null;
  arrivalAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bloodPressure: string | null;
  temperatureC: number | null;
  pulseBpm: number | null;
  respiratoryRate: number | null;
  spo2Pct: number | null;
  notes: string | null;
  createdAt: string | null;
  person: NursingQueuePerson | null;
  paymentStatus: string | null;
  cardId: number | null;
  cardNo: string | null;
  totalAmount: number | null;
  paymentCleared: boolean;
  hasVitals: boolean;
  reasonForVisit: string;
};

export type PatientQueueStats = {
  asOf: string;
  timezoneOffsetMinutes: number;
  waiting: number;
  inTriage: number;
  triageCompleted: number;
  vitalsDone: number;
  sentToDoctor: number;
  unpaid: number;
  paid: number;
  total: number;
};

export type RecordQueueVitalsPayload = {
  weightKg?: number;
  heightCm?: number;
  bloodPressure?: string;
  temperatureC?: number;
  pulseBpm?: number;
  respiratoryRate?: number;
  spo2Pct?: number;
  notes?: string;
};

export type SendToDoctorPayload = {
  clinic?: string;
  notes?: string;
};

type ApiEnvelope<T> = { data: T };

export function isNursingApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function nursingPersonDisplayName(
  person: NursingQueuePerson | null | undefined,
) {
  if (!person) return '—';
  return (
    [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ') || '—'
  );
}

export async function listPatientQueues(params?: {
  status?: string;
  clinic?: string;
  priority?: string;
  q?: string;
  paymentStatus?: string;
  date?: string;
  timezoneOffsetMinutes?: number;
  page?: number;
  limit?: number;
}): Promise<{
  items: PatientQueueRecord[];
  meta: { page: number; limit: number; total: number };
}> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.clinic) qs.set('clinic', params.clinic);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.q) qs.set('q', params.q);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.date) qs.set('date', params.date);
  if (params?.timezoneOffsetMinutes != null) {
    qs.set('timezoneOffsetMinutes', String(params.timezoneOffsetMinutes));
  } else {
    qs.set(
      'timezoneOffsetMinutes',
      String(-new Date().getTimezoneOffset()),
    );
  }
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{
      items: PatientQueueRecord[];
      meta: { page: number; limit: number; total: number };
    }>
  >(`/api/nursing/patient-queues${suffix}`);
  return body.data;
}

export async function getPatientQueueStats(params?: {
  date?: string;
  timezoneOffsetMinutes?: number;
}): Promise<PatientQueueStats> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  qs.set(
    'timezoneOffsetMinutes',
    String(
      params?.timezoneOffsetMinutes ?? -new Date().getTimezoneOffset(),
    ),
  );
  const body = await apiRequest<ApiEnvelope<PatientQueueStats>>(
    `/api/nursing/patient-queues/stats?${qs}`,
  );
  return body.data;
}

export async function getPatientQueue(
  triageId: number,
): Promise<PatientQueueRecord> {
  const body = await apiRequest<ApiEnvelope<PatientQueueRecord>>(
    `/api/nursing/patient-queues/${triageId}`,
  );
  return body.data;
}

export async function startPatientQueue(
  triageId: number,
): Promise<PatientQueueRecord> {
  const body = await apiRequest<ApiEnvelope<PatientQueueRecord>>(
    `/api/nursing/patient-queues/${triageId}/start`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function recordQueueVitals(
  triageId: number,
  payload: RecordQueueVitalsPayload,
): Promise<PatientQueueRecord> {
  const body = await apiRequest<ApiEnvelope<PatientQueueRecord>>(
    `/api/nursing/patient-queues/${triageId}/vitals`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function sendToDoctor(
  triageId: number,
  payload: SendToDoctorPayload = {},
): Promise<PatientQueueRecord> {
  const body = await apiRequest<ApiEnvelope<PatientQueueRecord>>(
    `/api/nursing/patient-queues/${triageId}/send-to-doctor`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

/** Ward care documentation clients (notes, vitals, care plans, …). */
export {
  isNursingCareApiEnabled,
  listNursingNotes,
  createNursingNote,
  listNursingVitals,
  createNursingVital,
  listNursingCarePlans,
  createNursingCarePlan,
  updateNursingCarePlan,
  listNursingObservations,
  createNursingObservation,
  listNursingIncidents,
  createNursingIncident,
  reviewNursingIncident,
  listNursingFormTemplates,
  listNursingFormInstances,
  createNursingFormInstance,
  getNursingFormInstance,
  formTemplateFields,
  getNursingTimeline,
  listNursingAlerts,
  flattenNursingAlerts,
  vitalFlags,
  nursingCarePersonName,
} from './nursing-care';

/** Nursing ops clients (MAR, orders, tasks, shifts, ICU, …). */
export {
  isNursingOpsApiEnabled,
  listNursingOrders,
  createNursingOrder,
  acknowledgeNursingOrder,
  listNursingTasks,
  createNursingTask,
  updateNursingTask,
  listNursingMar,
  createExternalMar,
  administerMar,
  refuseMar,
  missMar,
  holdMar,
  dispenseMar,
  listNursingSamples,
  collectNursingSample,
  listNursingShifts,
  getCurrentNursingShift,
  startNursingShift,
  endNursingShift,
  listNursingHandovers,
  createNursingHandover,
  acknowledgeNursingHandover,
  listIcuBoard,
  createIcuNote,
  createIcuInfusion,
  listNursingMessages,
  createNursingMessage,
  markNursingMessageRead,
  listNursingReports,
  generateNursingReport,
  getNursingAnalytics,
  nursingOpsPersonName,
} from './nursing-ops';
