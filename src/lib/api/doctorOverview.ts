import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type DoctorOverviewKpis = {
  patientsWaiting: number;
  patientsWaitingSubtitle: string;
  activeConsultations: number;
  pendingLabResults: number;
  pendingImaging: number;
  admissionRequests: number;
  urgentAdmissionRequests: number;
  wardRoundPatients: number;
  wardCount: number;
  referralsReceived: number;
  referralsReceivedPending: number;
  referralsSent: number;
  referralsSentAccepted: number;
  dischargesPending: number;
  emergencyCases: number;
  criticalAlerts: number;
};

export type DoctorOverviewQueueItem = {
  triageId: number;
  personId: number;
  name: string;
  patientName: string;
  hospitalNo: string | null;
  sex: string;
  age: number | null;
  status: string;
  statusTone: string;
  mode: string;
  clinic: string | null;
  priority: string;
  canStart: boolean;
  arrivalAt: string;
};

export type DoctorOverviewTabHints = {
  activeCount: number;
  followUpCount: number;
  admittedCount: number;
  referralsReceived: number;
  referralsSent: number;
  pendingLab: number;
  pendingImaging: number;
  dischargesPending: number;
};

export type DoctorOverviewPayload = {
  asOf: string;
  doctorUserId: number;
  kpis: DoctorOverviewKpis;
  queue: DoctorOverviewQueueItem[];
  tabHints: DoctorOverviewTabHints;
};

export function isDoctorOverviewApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function emptyDoctorOverviewKpis(): DoctorOverviewKpis {
  return {
    patientsWaiting: 0,
    patientsWaitingSubtitle: 'No patients waiting',
    activeConsultations: 0,
    pendingLabResults: 0,
    pendingImaging: 0,
    admissionRequests: 0,
    urgentAdmissionRequests: 0,
    wardRoundPatients: 0,
    wardCount: 0,
    referralsReceived: 0,
    referralsReceivedPending: 0,
    referralsSent: 0,
    referralsSentAccepted: 0,
    dischargesPending: 0,
    emergencyCases: 0,
    criticalAlerts: 0,
  };
}

export function emptyDoctorOverviewTabHints(): DoctorOverviewTabHints {
  return {
    activeCount: 0,
    followUpCount: 0,
    admittedCount: 0,
    referralsReceived: 0,
    referralsSent: 0,
    pendingLab: 0,
    pendingImaging: 0,
    dischargesPending: 0,
  };
}

export async function fetchDoctorOverview(params?: {
  timezoneOffsetMinutes?: number;
  queueLimit?: number;
}): Promise<DoctorOverviewPayload> {
  const qs = new URLSearchParams();
  if (params?.timezoneOffsetMinutes != null) {
    qs.set('timezoneOffsetMinutes', String(params.timezoneOffsetMinutes));
  }
  if (params?.queueLimit != null) {
    qs.set('queueLimit', String(params.queueLimit));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiRequest<ApiEnvelope<DoctorOverviewPayload>>(
    `/api/doctor/overview${suffix}`,
  );
  return res.data;
}
