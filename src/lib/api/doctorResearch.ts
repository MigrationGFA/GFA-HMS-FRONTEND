import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type ResearchSummary = {
  diagnosis: number;
  admissions: number;
  mortality: string;
  los: string;
  readmissions: number;
  drugs: number;
  registry: number;
  trials: number;
  auditProjects: number;
  outcomes: number;
  psychiatric: number;
  exported: number;
};

export type ResearchDiagnosisRow = {
  diagnosis: string;
  code: string;
  patients: number;
  newCases: number;
  admissions: number;
  readmissions: number;
  los: string;
  outcome: string;
};

export type ResearchWardRow = {
  ward: string;
  admissions: number;
  discharges: number;
  transfers: number;
  dama: number;
  deaths: number;
  los: string;
  occupancy: number;
};

export type ResearchDrugRow = {
  drug: string;
  rx: number;
  patients: number;
  dept: string;
  cost: string;
  stock: string;
};

export type RegistryEntry = {
  id: number;
  personId: number | null;
  patient: string;
  diagnosis: string;
  eligibility: string;
  consent: string;
  enrolledBy: string;
  studyGroup: string;
  status: string;
  clinic: string;
};

export type TrialEntry = {
  id: number;
  name: string;
  pi: string;
  eligible: number;
  enrolled: number;
  startDate: string | null;
  status: string;
};

export type AuditProject = {
  id: number;
  title: string;
  department: string;
  lead: string;
  indicator: string;
  standard: string;
  performance: string;
  status: string;
};

export function isDoctorResearchApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

export function clearDoctorResearchMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  for (const k of [
    'gfa_doc_research_registry_v1',
    'gfa_doc_audit_projects_v1',
    'gfa_doc_research_audit_v1',
  ]) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function fetchResearchSummary(): Promise<ResearchSummary> {
  const res = await apiRequest<ApiEnvelope<ResearchSummary>>('/api/doctor/research/summary');
  return res.data;
}

export async function fetchResearchDiagnoses(): Promise<ResearchDiagnosisRow[]> {
  const res = await apiRequest<ApiEnvelope<{ items: ResearchDiagnosisRow[] }>>(
    '/api/doctor/research/diagnoses',
  );
  return res.data.items ?? [];
}

export async function fetchResearchAdmissionsByWard(): Promise<ResearchWardRow[]> {
  const res = await apiRequest<ApiEnvelope<{ items: ResearchWardRow[] }>>(
    '/api/doctor/research/admissions-by-ward',
  );
  return res.data.items ?? [];
}

export async function fetchResearchDrugUtilization(): Promise<ResearchDrugRow[]> {
  const res = await apiRequest<ApiEnvelope<{ items: ResearchDrugRow[] }>>(
    '/api/doctor/research/drug-utilization',
  );
  return res.data.items ?? [];
}

export async function listResearchRegistry(): Promise<RegistryEntry[]> {
  const res = await apiRequest<ApiEnvelope<{ items: RegistryEntry[] }>>(
    '/api/doctor/research/registry',
  );
  return res.data.items ?? [];
}

export async function createResearchRegistry(body: {
  patientLabel: string;
  diagnosis: string;
  studyGroup: string;
  personId?: number;
  eligibility?: string;
  consent?: string;
  enrolledBy?: string;
  status?: string;
  clinic?: string;
}): Promise<RegistryEntry> {
  const res = await apiRequest<ApiEnvelope<RegistryEntry>>('/api/doctor/research/registry', {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function listResearchTrials(): Promise<TrialEntry[]> {
  const res = await apiRequest<ApiEnvelope<{ items: TrialEntry[] }>>(
    '/api/doctor/research/trials',
  );
  return res.data.items ?? [];
}

export async function createResearchTrial(body: {
  name: string;
  pi: string;
  eligibleCount?: number;
  enrolledCount?: number;
  startDate?: string;
  status?: string;
}): Promise<TrialEntry> {
  const res = await apiRequest<ApiEnvelope<TrialEntry>>('/api/doctor/research/trials', {
    method: 'POST',
    body,
  });
  return res.data;
}

export async function listClinicalAuditProjects(): Promise<AuditProject[]> {
  const res = await apiRequest<ApiEnvelope<{ items: AuditProject[] }>>(
    '/api/doctor/research/audit-projects',
  );
  return res.data.items ?? [];
}

export async function createClinicalAuditProject(body: {
  title: string;
  department: string;
  lead: string;
  indicator: string;
  standard: string;
  performance?: string;
  status?: string;
}): Promise<AuditProject> {
  const res = await apiRequest<ApiEnvelope<AuditProject>>(
    '/api/doctor/research/audit-projects',
    { method: 'POST', body },
  );
  return res.data;
}
