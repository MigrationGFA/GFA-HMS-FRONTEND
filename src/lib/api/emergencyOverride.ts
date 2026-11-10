import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type EmergencyKpis = {
  emergencyPatients: number;
  overrideRequests: number;
  criticalAlerts: number;
  activeSessions: number;
  expiredSessions: number;
  emergencyAdmissions: number;
};

export type EmergencyBoardPatient = {
  personId: number;
  admissionId: number;
  patientName: string;
  hospitalNo: string | null;
  ward: string | null;
  bed: string | null;
  status: string;
  admittedAt: string | null;
};

export type EmergencySession = {
  sessionId: number;
  overrideNo: string;
  personId: number;
  admissionId: number | null;
  patientName: string;
  hospitalNo: string | null;
  reason: string;
  justification: string;
  severity: number;
  durationMinutes: number;
  location: string | null;
  consultant: string | null;
  status: string;
  actions: string[];
  startedAt: string;
  endsAt: string | null;
  endedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type EmergencyAlert = {
  alertId: number;
  personId: number | null;
  patientName: string | null;
  hospitalNo: string | null;
  type: string;
  message: string;
  severity: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export function isEmergencyOverrideApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function clearDoctorEmergencyMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = [
    'gfa_doc_emergency_sessions_v1',
    'gfa_doc_emergency_audit_v1',
    'gfa_doc_emergency_timeline_v1',
    'gfa_doc_emergency_alerts_v1',
    'gfa_doc_emergency_admissions_v1',
    'gfa_doc_emergency_referrals_v1',
    'gfa_doc_emergency_meds_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function fetchEmergencyBoard(): Promise<{
  kpis: EmergencyKpis;
  patients: EmergencyBoardPatient[];
}> {
  const res = await apiRequest<
    ApiEnvelope<{ kpis: EmergencyKpis; patients: EmergencyBoardPatient[] }>
  >('/api/emergency-override/board');
  return res.data;
}

export async function listEmergencySessions(params?: {
  status?: string;
  limit?: number;
}): Promise<EmergencySession[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<{ items: EmergencySession[] }>>(
    `/api/emergency-override/sessions${q ? `?${q}` : ''}`,
  );
  return res.data.items ?? [];
}

export async function createEmergencySession(body: {
  personId: number;
  admissionId?: number;
  reason: string;
  justification: string;
  severity?: number;
  durationMinutes?: number;
  location?: string;
  consultant?: string;
}): Promise<EmergencySession> {
  const res = await apiRequest<ApiEnvelope<EmergencySession>>(
    '/api/emergency-override/sessions',
    { method: 'POST', body },
  );
  return res.data;
}

export async function endEmergencySession(id: number): Promise<EmergencySession> {
  const res = await apiRequest<ApiEnvelope<EmergencySession>>(
    `/api/emergency-override/sessions/${id}/end`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function listEmergencyAlerts(limit = 50): Promise<EmergencyAlert[]> {
  const res = await apiRequest<ApiEnvelope<{ items: EmergencyAlert[] }>>(
    `/api/emergency-override/alerts?limit=${limit}`,
  );
  return res.data.items ?? [];
}

export async function ackEmergencyAlert(id: number): Promise<EmergencyAlert> {
  const res = await apiRequest<ApiEnvelope<EmergencyAlert>>(
    `/api/emergency-override/alerts/${id}/ack`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function listEmergencyAdmissions(): Promise<
  {
    admissionId: number;
    personId: number;
    patientName: string;
    hospitalNo: string | null;
    ward: string | null;
    status: string;
    admittedAt: string | null;
    doctor: string | null;
  }[]
> {
  const res = await apiRequest<ApiEnvelope<{ items: any[] }>>(
    '/api/emergency-override/admissions',
  );
  return res.data.items ?? [];
}

export async function listEmergencyReferrals(): Promise<
  {
    referralId: number;
    referralNo: string;
    personId: number;
    patientName: string;
    destination: string;
    priority: string;
    reason: string;
    status: string;
    createdAt: string | null;
  }[]
> {
  const res = await apiRequest<ApiEnvelope<{ items: any[] }>>(
    '/api/emergency-override/referrals',
  );
  return res.data.items ?? [];
}

export async function listEmergencyMedications(): Promise<
  {
    prescriptionId: number;
    rxNo: string;
    personId: number;
    patientName: string;
    drug: string;
    dose: string | null;
    route: string | null;
    urgency: string;
    paymentStatus: string;
    status: string;
    doctor: string | null;
    createdAt: string | null;
  }[]
> {
  const res = await apiRequest<ApiEnvelope<{ items: any[] }>>(
    '/api/emergency-override/medications',
  );
  return res.data.items ?? [];
}
