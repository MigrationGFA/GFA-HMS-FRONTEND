import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type DoctorAnalyticsKpis = {
  consultations: number;
  patients: number;
  diagnoses: number;
  procedures: number;
  admissions: number;
  referrals: number;
  prescriptions: number;
  investigations: number;
  discharges: number;
  followUps: number;
  telemedicine: number;
  critical: number;
  avgConsultMinutes: number;
  pendingNotes: number;
};

export type DoctorAnalyticsPayload = {
  from: string;
  to: string;
  clinic: string;
  doctorUserId: number;
  kpis: DoctorAnalyticsKpis;
  charts: {
    consultationTrend: { date: string; count: number }[];
    patientsByClinic: { clinic: string; count: number }[];
    prescriptionVolume: { date: string; count: number }[];
    referralTrend: { date: string; count: number }[];
  };
  tables: {
    consultations: {
      id: string;
      date: string;
      patient: string;
      hospitalId: string;
      patientId: string;
      clinic: string;
      visitType: string;
      start: string;
      end: string;
      duration: string;
      outcome: string;
      payment: string;
    }[];
    diagnoses: {
      diagnosis: string;
      code: string;
      count: number;
      newCases: number;
      followUp: number;
      clinic: string;
      trend: string;
    }[];
    prescriptions: {
      drug: string;
      count: number;
      patients: number;
      clinic: string;
      alerts: number;
      stopped: number;
    }[];
    investigations: {
      name: string;
      type: string;
      count: number;
      completed: number;
      pending: number;
      critical: number;
    }[];
  };
  patients: {
    newCount: number;
    returningCount: number;
    ageBands: { band: string; count: number }[];
    paymentMix: { channel: string; count: number }[];
  };
  admission: {
    admissions: number;
    discharges: number;
    avgLosDays: number;
    pendingDrafts: number;
    wardDistribution: { ward: string; count: number }[];
  };
  referrals: {
    sent: number;
    received: number;
    completed: number;
    pending: number;
    external: number;
  };
};

export function isDoctorAnalyticsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getDoctorAnalytics(params?: {
  from?: string;
  to?: string;
  clinic?: string;
}): Promise<DoctorAnalyticsPayload> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.clinic && params.clinic !== 'all') qs.set('clinic', params.clinic);
  qs.set('timezoneOffsetMinutes', String(-new Date().getTimezoneOffset()));
  const body = await apiRequest<ApiEnvelope<DoctorAnalyticsPayload>>(
    `/api/doctor/analytics?${qs}`,
  );
  return body.data;
}
