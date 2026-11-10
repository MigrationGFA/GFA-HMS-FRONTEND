import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { useApplyDocPatient, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  listAdmissions,
  listWards,
  isAdmissionsApiEnabled,
  admissionPersonDisplayName,
  type AdmissionRecord,
  type WardRecord,
} from '@/lib/api/admissions';
import {
  admissionRequestPatientName,
  createAdmissionRequest,
  isAdmissionRequestsApiEnabled,
  listAdmissionRequests,
  updateAdmissionRequest,
  type ApiAdmissionRequest,
} from '@/lib/api/admission-requests';
import {
  BedDouble, Search, Plus, Printer, Eye, Send, Clock, CheckCircle2,
  FileText, History, XCircle, MessageSquare, RefreshCw,
  Stethoscope, ArrowLeft, UserPlus, Siren, MapPin, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const ADM_AUDIT_KEY = 'gfa_doc_admission_audit_v1';
const ADM_TIMELINE_KEY = 'gfa_doc_admission_timeline_v1';
const ADM_REQ_KEY = 'gfa_doc_admission_requests_v1';
const ADM_INBOUND_KEY = 'gfa_records_admission_inbound_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Admission Requests">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

type PageMode = 'select' | 'overview' | 'patient';
type OverviewTabId = 'mine' | 'all' | 'pending' | 'approved' | 'rejected' | 'beds' | 'history';
type PatientTabId = 'new' | 'pending' | 'approved' | 'admitted' | 'rejected' | 'beds' | 'history';
type KpiFilter = 'pending' | 'approved' | 'admitted' | 'rejected' | 'beds' | 'emergency';
type FormPriority = 'Routine' | 'Urgent' | 'Emergency';
type ApprovalStatus = 'Draft' | 'Pending' | 'Under Review' | 'More Information Required' | 'Approved' | 'Rejected' | 'Cancelled';
type BedAllocStatus = 'Awaiting Bed' | 'Bed Reserved' | 'Bed Assigned' | 'Patient Notified' | 'Ready for Admission';

interface AdmPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: 'OPC' | 'GMPC'; diagnosis: string; allergies: string;
  medications: string; vitals: string; billingStatus: string; nhiaStatus: string; riskFlag: string;
}

interface WardInfo {
  id: string; name: string; total: number; occupied: number; reserved: number; maintenance: number;
  gender: string; unit: string; category: string; status: 'Open' | 'Full' | 'Limited';
  opc?: boolean; gmpc?: boolean;
}

interface AdmissionRequestRow {
  id: string;
  apiId?: number;
  patientId: string;
  patientName: string;
  hospitalId: string;
  ward: string;
  wardId: string;
  priority: FormPriority;
  diagnosis: string;
  requestedBy: string;
  requestTime: string;
  approvalStatus: ApprovalStatus;
  bedStatus?: BedAllocStatus;
  approvedBy?: string;
  approvedTime?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  bedNo?: string;
  admissionType: string;
  estimatedLos: string;
  pendingBed?: boolean;
  form: ReturnType<typeof emptyForm>;
}

interface AdmHistoryRow {
  id: string; admissionDate: string; dischargeDate: string; ward: string;
  diagnosis: string; los: string; outcome: string;
  hospitalId?: string; patientName?: string;
}

const WARDS: WardInfo[] = [
  { id: 'male-acute', name: 'Male Acute Ward', total: 24, occupied: 20, reserved: 2, maintenance: 1, gender: 'Male', unit: 'Psychiatric', category: 'Acute', status: 'Open', opc: true },
  { id: 'female-acute', name: 'Female Acute Ward', total: 22, occupied: 19, reserved: 1, maintenance: 0, gender: 'Female', unit: 'Psychiatric', category: 'Acute', status: 'Open', opc: true },
  { id: 'male-long', name: 'Male Long Stay Ward', total: 18, occupied: 16, reserved: 0, maintenance: 1, gender: 'Male', unit: 'Psychiatric', category: 'Rehabilitation', status: 'Limited', opc: true },
  { id: 'female-long', name: 'Female Long Stay Ward', total: 16, occupied: 14, reserved: 1, maintenance: 0, gender: 'Female', unit: 'Psychiatric', category: 'Rehabilitation', status: 'Limited', opc: true },
  { id: 'addiction', name: 'Addiction / Substance Use Ward', total: 20, occupied: 17, reserved: 1, maintenance: 1, gender: 'Mixed', unit: 'Addiction', category: 'Specialist', status: 'Open', opc: true },
  { id: 'psychogeriatric', name: 'Psychogeriatric Ward', total: 14, occupied: 12, reserved: 0, maintenance: 1, gender: 'Mixed', unit: 'Psychogeriatric', category: 'Specialist', status: 'Open', opc: true },
  { id: 'cap', name: 'Child & Adolescent Ward', total: 12, occupied: 9, reserved: 1, maintenance: 0, gender: 'Mixed', unit: 'CAP', category: 'Paediatric', status: 'Open', opc: true },
  { id: 'eou', name: 'Emergency Observation Unit', total: 8, occupied: 6, reserved: 1, maintenance: 0, gender: 'Mixed', unit: 'Emergency', category: 'Observation', status: 'Open', opc: true, gmpc: true },
  { id: 'medical', name: 'Medical Ward', total: 30, occupied: 26, reserved: 2, maintenance: 1, gender: 'Mixed', unit: 'Medical', category: 'General', status: 'Open', gmpc: true },
  { id: 'isolation', name: 'Isolation Room', total: 4, occupied: 2, reserved: 0, maintenance: 1, gender: 'Mixed', unit: 'Infection Control', category: 'Isolation', status: 'Limited', gmpc: true },
  { id: 'private', name: 'Private Ward', total: 10, occupied: 7, reserved: 1, maintenance: 0, gender: 'Mixed', unit: 'Private', category: 'Private', status: 'Open' },
  { id: 'icu', name: 'ICU / High Dependency', total: 6, occupied: 5, reserved: 0, maintenance: 0, gender: 'Mixed', unit: 'Critical Care', category: 'ICU', status: 'Full', gmpc: true },
];

const PATIENTS: AdmPatient[] = [
  {
    id: 'q1', name: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831', phone: '08031234567',
    nin: '12345678901', nhiaNo: 'NHIA-882910', age: 34, gender: 'M', clinic: 'OPC',
    diagnosis: 'Moderate Depressive Episode (F32.1)', allergies: 'Penicillin',
    medications: 'Sertraline 100mg OD, Diazepam 5mg PRN', vitals: 'BP 122/78 · HR 72 · Temp 36.8°C',
    billingStatus: 'Paid · Wallet ₦12,400', nhiaStatus: 'Active · NHIA-882910', riskFlag: 'Low suicide risk — monitored',
  },
  {
    id: 'q2', name: 'Aisha Bello', hospitalId: 'GFA-2024-00912', phone: '08042345678',
    nin: '23456789012', nhiaNo: 'NHIA-773421', age: 29, gender: 'F', clinic: 'GMPC',
    diagnosis: 'Hypertensive crisis with anxiety', allergies: 'None',
    medications: 'Amlodipine 5mg OD, Escitalopram 10mg OD', vitals: 'BP 168/102 · HR 88 · Temp 36.6°C',
    billingStatus: 'NHIA · Pre-auth pending', nhiaStatus: 'NHIA enrolled', riskFlag: 'Elevated BP — medical admission indicated',
  },
  {
    id: 'q3', name: 'Femi Ojo', hospitalId: 'GFA-2024-00655', phone: '08053456789',
    nin: '34567890123', nhiaNo: '', age: 41, gender: 'M', clinic: 'OPC',
    diagnosis: 'Acute psychotic episode (F23)', allergies: 'None',
    medications: 'Risperidone 2mg BD', vitals: 'BP 130/84 · HR 96 · Temp 37.1°C',
    billingStatus: 'Unpaid · deposit required', nhiaStatus: 'Self-pay', riskFlag: 'High — aggression & self-harm risk',
  },
];

const SEED_HISTORY: AdmHistoryRow[] = [
  { id: 'h1', admissionDate: '2025-11-12', dischargeDate: '2025-11-28', ward: 'Male Acute Ward', diagnosis: 'Depressive episode', los: '16 days', outcome: 'Improved — OP follow-up' },
  { id: 'h2', admissionDate: '2025-03-04', dischargeDate: '2025-03-18', ward: 'Male Long Stay Ward', diagnosis: 'Substance-induced psychosis', los: '14 days', outcome: 'Stable discharge' },
];

function emptyForm() {
  return {
    encounter: '', wardId: '', wardCategory: '', priority: 'Routine' as FormPriority,
    priorityReason: '', admissionType: 'New admission', estimatedLos: '',
    provisionalDiagnosis: '', secondaryDiagnosis: '', clinicalIndication: '',
    mentalHealthRisk: '', physicalHealthRisk: '', treatmentPlan: '', requiredMonitoring: '',
    nursingObservation: 'General', isolation: 'No', fallRisk: false, suicideRisk: false,
    violenceRisk: false, withdrawalRisk: false, specialBed: '', consentStatus: 'Obtained',
    nokInformed: 'Yes', doctorNote: '', pendingBedOk: false,
  };
}

function logAdmAudit(action: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(ADM_AUDIT_KEY) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(ADM_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: AdmPatient) {
  try {
    const arr = JSON.parse(localStorage.getItem(ADM_TIMELINE_KEY) || '[]');
    arr.unshift({ event, patient: patient.name, hospitalId: patient.hospitalId, timestamp: new Date().toISOString() });
    localStorage.setItem(ADM_TIMELINE_KEY, JSON.stringify(arr.slice(0, 300)));
  } catch { /* noop */ }
}

function pushToRecordsQueue(req: AdmissionRequestRow) {
  try {
    const arr = JSON.parse(localStorage.getItem(ADM_INBOUND_KEY) || '[]');
    arr.unshift({
      id: req.id, hospitalId: req.hospitalId, name: req.patientName,
      doctor: req.requestedBy, department: req.form.encounter || 'Clinical',
      ward: req.ward, diagnosis: req.diagnosis, note: req.form.clinicalIndication,
      time: req.requestTime.slice(11, 16), status: 'Pending', paymentStatus: 'Cashier',
      bedStatus: 'None', timeline: [{ at: req.requestTime.slice(11, 16), event: `Request created by ${req.requestedBy}` }],
    });
    localStorage.setItem(ADM_INBOUND_KEY, JSON.stringify(arr.slice(0, 200)));
  } catch { /* noop */ }
}

function mapApiStatus(status: string): ApprovalStatus {
  switch (status) {
    case 'Draft': return 'Draft';
    case 'Submitted': return 'Pending';
    case 'UnderReview': return 'Under Review';
    case 'Approved': return 'Approved';
    case 'Rejected': return 'Rejected';
    case 'Cancelled': return 'Cancelled';
    default: return 'Pending';
  }
}

function apiToRow(r: ApiAdmissionRequest): AdmissionRequestRow {
  const priority = (r.priority === 'Urgent' || r.priority === 'Emergency' ? r.priority : 'Routine') as FormPriority;
  return {
    id: r.requestNo,
    apiId: r.admissionRequestId,
    patientId: String(r.personId),
    patientName: admissionRequestPatientName(r.person),
    hospitalId: r.person?.hospitalNo || `PID-${r.personId}`,
    ward: r.ward?.name || r.wardPreference || '—',
    wardId: r.wardId != null ? String(r.wardId) : '',
    priority,
    diagnosis: r.provisionalDiagnosis || '—',
    requestedBy: r.requestedBy || '—',
    requestTime: r.createdAt || new Date().toISOString(),
    approvalStatus: mapApiStatus(r.status),
    rejectionReason: r.rejectionReason ?? undefined,
    admissionType: r.admissionType || 'New admission',
    estimatedLos: r.estimatedLos || '',
    form: {
      ...emptyForm(),
      encounter: r.clinicDepartment || '',
      wardId: r.wardId != null ? String(r.wardId) : '',
      priority,
      priorityReason: r.priorityReason || '',
      admissionType: r.admissionType || 'New admission',
      estimatedLos: r.estimatedLos || '',
      provisionalDiagnosis: r.provisionalDiagnosis || '',
      secondaryDiagnosis: r.secondaryDiagnosis || '',
      clinicalIndication: r.clinicalIndication || '',
      mentalHealthRisk: r.mentalHealthRisk || '',
      physicalHealthRisk: r.physicalHealthRisk || '',
      treatmentPlan: r.treatmentPlan || '',
      requiredMonitoring: r.requiredMonitoring || '',
      nursingObservation: r.nursingObservation || 'General',
      isolation: r.isolationRequired ? 'Yes' : 'No',
      fallRisk: r.fallRisk,
      suicideRisk: r.suicideRisk,
      violenceRisk: r.violenceRisk,
      withdrawalRisk: r.withdrawalRisk,
      specialBed: r.specialBed || '',
      consentStatus: r.consentStatus || 'Obtained',
      nokInformed: r.nokInformed || 'Yes',
      doctorNote: r.doctorNote || '',
    },
  };
}

const SEED_REQUESTS: AdmissionRequestRow[] = [
  {
    id: 'ADM-2026-041', patientId: 'q3', patientName: 'Femi Ojo', hospitalId: 'GFA-2024-00655',
    ward: 'Male Acute Ward', wardId: 'male-acute', priority: 'Emergency', diagnosis: 'Acute psychotic episode (F23)',
    requestedBy: 'Dr. Olufemi Hassan', requestTime: '2026-06-02T08:15:00', approvalStatus: 'Pending',
    admissionType: 'New admission', estimatedLos: '14 days', form: emptyForm(),
  },
  {
    id: 'ADM-2026-038', patientId: 'q2', patientName: 'Aisha Bello', hospitalId: 'GFA-2024-00912',
    ward: 'Medical Ward', wardId: 'medical', priority: 'Urgent', diagnosis: 'Hypertensive crisis',
    requestedBy: 'Dr. Adewale', requestTime: '2026-06-01T14:30:00', approvalStatus: 'Under Review',
    admissionType: 'New admission', estimatedLos: '5 days', form: emptyForm(),
  },
  {
    id: 'ADM-2026-035', patientId: 'q1', patientName: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
    ward: 'Male Long Stay Ward', wardId: 'male-long', priority: 'Routine', diagnosis: 'Moderate Depressive Episode',
    requestedBy: 'Dr. Olufemi Hassan', requestTime: '2026-05-30T10:00:00', approvalStatus: 'Approved',
    bedStatus: 'Awaiting Bed', approvedBy: 'Records Officer — Mrs. Okonkwo', approvedTime: '2026-05-30T15:20:00',
    admissionType: 'New admission', estimatedLos: '21 days', pendingBed: true, form: emptyForm(),
  },
  {
    id: 'ADM-2026-029', patientId: 'q4', patientName: 'Ngozi Ike', hospitalId: 'GFA-2024-00702',
    ward: 'Female Acute Ward', wardId: 'female-acute', priority: 'Urgent', diagnosis: 'Manic episode',
    requestedBy: 'Dr. Hassan', requestTime: '2026-05-28T09:45:00', approvalStatus: 'Approved',
    bedStatus: 'Bed Assigned', bedNo: 'F-12', approvedBy: 'Records Officer — Mrs. Okonkwo', approvedTime: '2026-05-28T11:00:00',
    admissionType: 'New admission', estimatedLos: '10 days', form: emptyForm(),
  },
  {
    id: 'ADM-2026-022', patientId: 'q5', patientName: 'Adamu Sule', hospitalId: 'GFA-2024-00588',
    ward: 'Addiction / Substance Use Ward', wardId: 'addiction', priority: 'Routine', diagnosis: 'Cannabis use disorder',
    requestedBy: 'Dr. Bola', requestTime: '2026-05-25T16:00:00', approvalStatus: 'Rejected',
    rejectedBy: 'Admission Officer', rejectionReason: 'Incomplete risk assessment documentation — resubmit with full MSE and substance history.',
    admissionType: 'Readmission', estimatedLos: '28 days', form: emptyForm(),
  },
];

function losDays(from: string, to?: string | null): string {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  return days === 1 ? '1 day' : `${days} days`;
}

function admissionToHistoryRow(a: AdmissionRecord): AdmHistoryRow {
  return {
    id: `adm-${a.admissionId}`,
    admissionDate: a.admittedAt.slice(0, 10),
    dischargeDate: a.dischargedAt?.slice(0, 10) ?? '—',
    ward: a.ward?.name ?? '—',
    diagnosis: a.diagnosis ?? '—',
    los: losDays(a.admittedAt, a.dischargedAt),
    outcome: a.status === 'DISCHARGED'
      ? (a.dischargeReason ?? 'Discharged')
      : String(a.status),
    hospitalId: a.person?.hospitalNo ?? `PID-${a.personId}`,
    patientName: admissionPersonDisplayName(a.person),
  };
}

function requestToHistoryRow(r: AdmissionRequestRow): AdmHistoryRow {
  return {
    id: `req-${r.id}`,
    admissionDate: r.approvedTime?.slice(0, 10) ?? r.requestTime.slice(0, 10),
    dischargeDate: '—',
    ward: r.ward,
    diagnosis: r.diagnosis,
    los: '—',
    outcome: r.approvalStatus === 'Rejected'
      ? (r.rejectionReason ?? 'Rejected')
      : r.approvalStatus,
    hospitalId: r.hospitalId,
    patientName: r.patientName,
  };
}

function loadStoredRequests(): AdmissionRequestRow[] {
  try {
    return JSON.parse(localStorage.getItem(ADM_REQ_KEY) || '[]');
  } catch { return []; }
}

function saveRequest(req: AdmissionRequestRow) {
  try {
    const stored: AdmissionRequestRow[] = JSON.parse(localStorage.getItem(ADM_REQ_KEY) || '[]').filter((r: AdmissionRequestRow) => r.id !== req.id);
    stored.unshift(req);
    localStorage.setItem(ADM_REQ_KEY, JSON.stringify(stored.slice(0, 100)));
  } catch { /* noop */ }
}

const priorityTone = (p: FormPriority) => p === 'Emergency' ? 'red' : p === 'Urgent' ? 'amber' : 'blue';
const approvalTone = (s: ApprovalStatus) => {
  if (s === 'Approved') return 'green';
  if (s === 'Rejected' || s === 'Cancelled') return 'red';
  if (s === 'Pending' || s === 'Under Review') return 'amber';
  return 'blue';
};

export const DocAdmission = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Dr. User';
  const admApiOn = isAdmissionRequestsApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();
  const wardsApiOn = isAdmissionsApiEnabled();

  const [pageMode, setPageMode] = useState<PageMode>(embedded ? 'patient' : 'select');
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>('mine');
  const [listScope, setListScope] = useState<'mine' | 'all'>('mine');
  const [globalSearch, setGlobalSearch] = useState('');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [patient, setPatient] = useState<AdmPatient | null>(null);
  const [patientTab, setPatientTab] = useState<PatientTabId>('new');
  const [form, setForm] = useState(emptyForm());
  const [requests, setRequests] = useState<AdmissionRequestRow[]>(() =>
    admApiOn ? [] : loadStoredRequests(),
  );
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiWards, setApiWards] = useState<WardRecord[]>([]);
  const [apiPatientResults, setApiPatientResults] = useState<AdmPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [liveAdmissions, setLiveAdmissions] = useState<AdmissionRecord[]>([]);
  const [admissionsLoading, setAdmissionsLoading] = useState(false);
  const [admissionsError, setAdmissionsError] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<AdmHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [patientModal, setPatientModal] = useState(!embedded);
  const [patientModalMode, setPatientModalMode] = useState<'workspace' | 'new'>('new');
  const [patientSearch, setPatientSearch] = useState('');

  const [submitModal, setSubmitModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<AdmissionRequestRow | null>(null);
  const [trackRequest, setTrackRequest] = useState<AdmissionRequestRow | null>(null);
  const [viewRejected, setViewRejected] = useState<AdmissionRequestRow | null>(null);
  const [printRequest, setPrintRequest] = useState<AdmissionRequestRow | null>(null);
  const [viewHistory, setViewHistory] = useState<AdmHistoryRow | null>(null);

  const activeAdmissions = useMemo(
    () => liveAdmissions.filter(a => a.status !== 'DISCHARGED' && a.status !== 'CANCELLED'),
    [liveAdmissions],
  );

  const totalBedsAvailable = wardsApiOn && apiWards.length
    ? apiWards.reduce((s, w) => s + (w.availableBeds ?? 0), 0)
    : 0;

  const kpis = useMemo(() => ({
    pending: requests.filter(r => ['Pending', 'Under Review', 'More Information Required'].includes(r.approvalStatus)).length,
    approved: requests.filter(r => r.approvalStatus === 'Approved' && r.bedStatus !== 'Bed Assigned').length,
    admitted: activeAdmissions.length,
    rejected: requests.filter(r => r.approvalStatus === 'Rejected').length,
    beds: totalBedsAvailable,
    emergency: requests.filter(r => r.priority === 'Emergency' || r.priority === 'Urgent').length,
  }), [requests, activeAdmissions.length, totalBedsAvailable]);

  const ctxToPatient = (ctx: DocPatientContext): AdmPatient => ({
    id: ctx.id, name: ctx.name, hospitalId: ctx.hospitalId, phone: ctx.phone ?? '',
    nin: ctx.nin ?? '', nhiaNo: ctx.nhiaNo ?? '', age: ctx.age ?? 0, gender: ctx.gender ?? 'M',
    clinic: (ctx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
    diagnosis: ctx.diagnosis ?? '—', allergies: ctx.allergies ?? 'None', medications: '—',
    vitals: '—', billingStatus: 'Pending verification', nhiaStatus: ctx.nhiaNo ? `NHIA · ${ctx.nhiaNo}` : '—',
    riskFlag: 'Review required',
  });

  const enterPatientWorkspace = (p: AdmPatient, tab: PatientTabId = 'new') => {
    setPatient(p);
    setPageMode('patient');
    setPatientTab(tab);
    setForm(f => ({
      ...emptyForm(),
      provisionalDiagnosis: p.diagnosis,
      clinicalIndication: p.diagnosis,
      mentalHealthRisk: p.clinic === 'OPC' ? p.riskFlag : '',
      physicalHealthRisk: p.clinic === 'GMPC' ? p.riskFlag : '',
    }));
    setPatientModal(false);
    setPatientSearch('');
  };

  const backToOverview = () => {
    setPageMode(admApiOn ? 'overview' : 'select');
    setPatient(null);
    toast.info(admApiOn ? 'Admission request queue' : 'Select a patient to continue');
  };

  const refreshRequests = async (scope: 'mine' | 'all' = listScope) => {
    if (!admApiOn) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await listAdmissionRequests({
        scope,
        q: globalSearch.trim() || undefined,
        page: 1,
        limit: 100,
      });
      setRequests(data.items.map(apiToRow));
    } catch (err) {
      setQueueError(err instanceof ApiError ? err.message : 'Could not load admission requests');
      setRequests([]);
    } finally {
      setQueueLoading(false);
    }
  };

  const refreshAdmissions = async () => {
    if (!wardsApiOn) return;
    setAdmissionsLoading(true);
    setAdmissionsError(null);
    try {
      const data = await listAdmissions({ limit: 200 });
      setLiveAdmissions(data.items);
    } catch (err) {
      setAdmissionsError(err instanceof ApiError ? err.message : 'Could not load admissions');
      setLiveAdmissions([]);
    } finally {
      setAdmissionsLoading(false);
    }
  };

  const refreshHistory = async (scope: 'mine' | 'all' = listScope) => {
    if (!admApiOn) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const [reqData, admData] = await Promise.all([
        listAdmissionRequests({ status: 'Admitted,Cancelled,Rejected', scope, limit: 100 }),
        listAdmissions({ limit: 200 }),
      ]);
      const rows: AdmHistoryRow[] = [
        ...admData.items.map(admissionToHistoryRow),
        ...reqData.items.map(r => requestToHistoryRow(apiToRow(r))),
      ];
      rows.sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
      setHistoryRows(rows);
    } catch (err) {
      setHistoryError(err instanceof ApiError ? err.message : 'Could not load admission history');
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!admApiOn) return;
    void refreshRequests(listScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admApiOn, listScope]);

  useEffect(() => {
    if (!wardsApiOn) return;
    listWards({ status: 'Active' })
      .then(setApiWards)
      .catch(() => setApiWards([]));
    void refreshAdmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardsApiOn]);

  useEffect(() => {
    if (!admApiOn) return;
    if (overviewTab === 'history' || patientTab === 'history') {
      void refreshHistory(listScope);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admApiOn, overviewTab, patientTab, listScope]);

  useEffect(() => {
    if (!patientModal || !patientsApiOn) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setApiPatientResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPatientSearchLoading(true);
      searchPersons(q)
        .then((rows) => {
          if (cancelled) return;
          setApiPatientResults(
            rows.map((r) => {
              const age = r.dateOfBirth
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(r.dateOfBirth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
                    ),
                  )
                : 0;
              return {
                id: String(r.personId),
                name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
                hospitalId: r.hospitalNo || `PID-${r.personId}`,
                phone: r.patientPhoneNo ?? '',
                nin: r.identityNo ?? '',
                nhiaNo: r.nhisNo ?? '',
                age,
                gender: r.sex ?? 'M',
                clinic: 'OPC' as const,
                diagnosis: '—',
                allergies: 'None',
                medications: '—',
                vitals: '—',
                billingStatus: 'Handled by cashier',
                nhiaStatus: r.nhisNo ? `NHIA · ${r.nhisNo}` : '—',
                riskFlag: 'Review required',
              };
            }),
          );
        })
        .catch(() => {
          if (!cancelled) setApiPatientResults([]);
        })
        .finally(() => {
          if (!cancelled) setPatientSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientModal, patientsApiOn, patientSearch]);

  useClinicalEmbeddedInit({ embedded, patientContext }, (ctx) => {
    enterPatientWorkspace(ctxToPatient(ctx), 'new');
    if (!embedded) toast.success(`Admission workspace for ${ctx.name}`);
  });

  const openPatientModal = (mode: 'workspace' | 'new') => {
    setPatientModalMode(mode);
    setPatientModal(true);
  };

  const matchesSearch = (text: string) =>
    !globalSearch || text.toLowerCase().includes(globalSearch.toLowerCase());

  const filterByKpi = (rows: AdmissionRequestRow[]) => {
    if (!kpiFilter) return rows;
    switch (kpiFilter) {
      case 'pending': return rows.filter(r => ['Pending', 'Under Review', 'More Information Required', 'Draft'].includes(r.approvalStatus));
      case 'approved': return rows.filter(r => r.approvalStatus === 'Approved');
      case 'rejected': return rows.filter(r => r.approvalStatus === 'Rejected');
      case 'emergency': return rows.filter(r => r.priority === 'Emergency' || r.priority === 'Urgent');
      default: return rows;
    }
  };

  const filteredRequests = useMemo(() => {
    let out = requests.filter(r => matchesSearch(`${r.patientName} ${r.hospitalId} ${r.id} ${r.ward} ${r.diagnosis}`));
    out = filterByKpi(out);
    if (patient) out = out.filter(r => r.hospitalId === patient.hospitalId || r.patientName === patient.name);
    return out;
  }, [requests, globalSearch, kpiFilter, patient]);

  const patientRequests = patient
    ? requests.filter(r => r.hospitalId === patient.hospitalId || r.patientName === patient.name)
    : [];

  const submitChecklist = [
    ['Patient selected', !!patient],
    ['Priority selected', !!form.priority],
    ['Diagnosis entered', !!form.provisionalDiagnosis.trim()],
    ['Clinical justification entered', !!form.clinicalIndication.trim()],
    ['Risk assessment completed', patient?.clinic === 'OPC' ? !!form.mentalHealthRisk.trim() : !!form.physicalHealthRisk.trim()],
    ['Estimated length of stay entered', !!form.estimatedLos.trim()],
    ['Consent / next-of-kin captured', form.consentStatus === 'Obtained' && form.nokInformed === 'Yes'],
    ...(form.priority !== 'Routine' ? [['Urgent/emergency reason provided', !!form.priorityReason.trim()] as [string, boolean]] : []),
  ];

  const handleSubmit = async (asDraft = false) => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (!asDraft && submitChecklist.some(([, ok]) => !ok)) {
      setSubmitModal(true);
      return;
    }

    if (admApiOn) {
      const personId = Number(patient.id);
      if (!Number.isFinite(personId) || personId <= 0) {
        toast.error('Patient must be selected from live search (API) before submitting');
        return;
      }
      setSubmitting(true);
      try {
        const encounterId = patientContext?.encounterId
          ? Number(patientContext.encounterId)
          : undefined;
        const created = await createAdmissionRequest({
          personId,
          encounterId: Number.isFinite(encounterId) && (encounterId as number) > 0 ? encounterId : undefined,
          // Ward/bed allocation is Records-only — doctor does not propose ward
          priority: form.priority,
          priorityReason: form.priorityReason.trim() || undefined,
          admissionType: form.admissionType,
          estimatedLos: form.estimatedLos.trim() || undefined,
          provisionalDiagnosis: form.provisionalDiagnosis.trim() || undefined,
          secondaryDiagnosis: form.secondaryDiagnosis.trim() || undefined,
          clinicalIndication: form.clinicalIndication.trim() || undefined,
          mentalHealthRisk: form.mentalHealthRisk.trim() || undefined,
          physicalHealthRisk: form.physicalHealthRisk.trim() || undefined,
          treatmentPlan: form.treatmentPlan.trim() || undefined,
          requiredMonitoring: form.requiredMonitoring.trim() || undefined,
          nursingObservation: form.nursingObservation,
          isolationRequired: form.isolation === 'Yes',
          fallRisk: form.fallRisk,
          suicideRisk: form.suicideRisk,
          violenceRisk: form.violenceRisk,
          withdrawalRisk: form.withdrawalRisk,
          specialBed: form.specialBed.trim() || undefined,
          consentStatus: form.consentStatus,
          nokInformed: form.nokInformed,
          clinicDepartment: form.encounter || undefined,
          doctorNote: form.doctorNote.trim() || undefined,
          asDraft,
        });
        const row = apiToRow(created);
        setRequests((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
        if (!asDraft) {
          logAdmAudit(`Admission request submitted: ${row.id} for ${patient.name}`);
          logTimeline(`Admission request ${row.id} submitted — Records will allocate ward/bed`, patient);
          notifySuccess(
            'Admission request submitted. Records will allocate ward and bed.',
            'Admission Requested',
          );
          if (form.priority !== 'Routine') toast.warning(`${form.priority} admission — ward team notified`);
        } else {
          toast.success('Draft saved');
        }
        setSubmitModal(false);
        setPatientTab('pending');
        setPageMode('overview');
        setOverviewTab('mine');
        setListScope('mine');
        await refreshRequests('mine');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not submit admission request');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const id = `ADM-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    const now = new Date().toISOString();
    const req: AdmissionRequestRow = {
      id, patientId: patient.id, patientName: patient.name, hospitalId: patient.hospitalId,
      ward: '—', wardId: '', priority: form.priority,
      diagnosis: form.provisionalDiagnosis, requestedBy: doctorName, requestTime: now,
      approvalStatus: asDraft ? 'Draft' : 'Pending',
      admissionType: form.admissionType, estimatedLos: form.estimatedLos,
      pendingBed: true, form: { ...form },
    };
    setRequests(prev => [req, ...prev]);
    saveRequest(req);
    if (!asDraft) {
      pushToRecordsQueue(req);
      logAdmAudit(`Admission request submitted: ${id} for ${patient.name}`);
      logTimeline(`Admission request ${id} submitted — Records will allocate ward/bed`, patient);
      notifySuccess(
        'Admission request submitted. Records will allocate ward and bed.',
        'Admission Requested',
      );
      if (form.priority !== 'Routine') toast.warning(`${form.priority} admission — ward team notified`);
    } else {
      toast.success('Draft saved');
    }
    setSubmitModal(false);
    setPatientTab('pending');
  };

  const cancelRequest = async (req: AdmissionRequestRow) => {
    if (admApiOn && req.apiId) {
      try {
        await updateAdmissionRequest(req.apiId, { status: 'Cancelled' });
        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, approvalStatus: 'Cancelled' as ApprovalStatus } : r));
        logAdmAudit(`Cancelled admission request ${req.id}`);
        toast.success('Request cancelled');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not cancel request');
      }
      return;
    }
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, approvalStatus: 'Cancelled' as ApprovalStatus } : r));
    logAdmAudit(`Cancelled admission request ${req.id}`);
    toast.success('Request cancelled');
  };

  const selectPatient = (p: AdmPatient) => {
    enterPatientWorkspace(p, patientModalMode === 'new' ? 'new' : 'pending');
    toast.success(patientModalMode === 'new' ? `New admission for ${p.name}` : `Patient: ${p.name}`);
  };

  const patientResults = patientsApiOn ? apiPatientResults : [];

  const displayedHistory = useMemo(() => {
    if (!patient) return historyRows;
    return historyRows.filter(
      h => h.hospitalId === patient.hospitalId || h.patientName === patient.name,
    );
  }, [historyRows, patient]);

  const renderRequestTable = (rows: AdmissionRequestRow[], emptyMsg: string, actions?: 'full' | 'pending' | 'approved' | 'rejected') => (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm hidden md:table">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Request No.', 'Patient', 'Hospital No.', 'Ward', 'Priority', 'Diagnosis', 'Requested By', 'Time', 'Status', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.id} className={r.priority === 'Emergency' ? 'bg-rose-50/40' : r.priority === 'Urgent' ? 'bg-amber-50/30' : ''}>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2 font-medium">{r.patientName}</td>
              <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
              <td className="px-3 py-2 text-xs">{r.ward}</td>
              <td className="px-3 py-2"><StatusPill tone={priorityTone(r.priority)}>{r.priority}</StatusPill></td>
              <td className="px-3 py-2 text-xs max-w-[140px] truncate">{r.diagnosis}</td>
              <td className="px-3 py-2 text-xs">{r.requestedBy}</td>
              <td className="px-3 py-2 text-xs">{r.requestTime.slice(0, 16).replace('T', ' ')}</td>
              <td className="px-3 py-2"><StatusPill tone={approvalTone(r.approvalStatus)}>{r.approvalStatus}</StatusPill></td>
              <td className="px-3 py-2">
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setViewRequest(r)}><Eye className="h-3 w-3" /></Button>
                  {(actions === 'pending' || actions === 'full') && r.approvalStatus === 'Pending' && (
                    <Button size="sm" variant="ghost" onClick={() => { setForm(r.form); setPatientTab('new'); toast.success('Request loaded for editing'); }}>Edit</Button>
                  )}
                  {actions === 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => setViewRejected(r)}>Reason</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)}><Clock className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setPrintRequest(r)}><Printer className="h-3 w-3" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{emptyMsg}</td></tr>}
        </tbody>
      </table>
      <div className="md:hidden space-y-3">
        {rows.map(r => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between"><span className="font-mono text-xs">{r.id}</span><StatusPill tone={approvalTone(r.approvalStatus)}>{r.approvalStatus}</StatusPill></div>
            <div className="font-medium">{r.patientName}</div>
            <div className="text-xs text-muted-foreground">{r.ward} · <StatusPill tone={priorityTone(r.priority)}>{r.priority}</StatusPill></div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setViewRequest(r)}>View</Button>
              <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)}>Track</Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">{emptyMsg}</p>}
      </div>
    </Card>
  );

  const renderApprovedTable = (rows: AdmissionRequestRow[]) => (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Request No.', 'Patient', 'Approved Ward', 'Priority', 'Approved By', 'Approved Time', 'Bed Status', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2">{r.patientName}</td>
              <td className="px-3 py-2">{r.ward}</td>
              <td className="px-3 py-2"><StatusPill tone={priorityTone(r.priority)}>{r.priority}</StatusPill></td>
              <td className="px-3 py-2 text-xs">{r.approvedBy ?? '—'}</td>
              <td className="px-3 py-2 text-xs">{r.approvedTime?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
              <td className="px-3 py-2"><StatusPill tone="amber">{r.bedStatus ?? 'Awaiting Bed'}</StatusPill></td>
              <td className="px-3 py-2">
                <Button size="sm" variant="ghost" onClick={() => setViewRequest(r)}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)}><Clock className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" disabled title="Ward messaging not yet integrated">
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <PendingIntegrationBanner compact reason="Ward messaging API not yet connected" className="ml-1 align-middle" />
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No approved requests awaiting bed.</td></tr>}
        </tbody>
      </table>
    </Card>
  );

  const renderAdmittedTable = () => {
    if (wardsApiOn && admissionsLoading) {
      return (
        <Card className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading active admissions…
        </Card>
      );
    }
    if (wardsApiOn && admissionsError) {
      return (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-800">{admissionsError}</p>
          <Button size="sm" variant="outline" onClick={() => void refreshAdmissions()}>Retry</Button>
        </Card>
      );
    }
    const rows = patient
      ? activeAdmissions.filter(
          a => a.person?.hospitalNo === patient.hospitalId
            || admissionPersonDisplayName(a.person) === patient.name,
        )
      : activeAdmissions;
    return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Patient', 'Hospital No.', 'Ward', 'Bed', 'Admission Date', 'Doctor', 'Diagnosis', 'Status', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.slice(0, 15).map(a => (
            <tr key={a.admissionId}>
              <td className="px-3 py-2 font-medium">{admissionPersonDisplayName(a.person)}</td>
              <td className="px-3 py-2 text-xs">{a.person?.hospitalNo ?? `PID-${a.personId}`}</td>
              <td className="px-3 py-2">{a.ward?.name ?? '—'}</td>
              <td className="px-3 py-2 font-mono text-xs">{a.bed?.label ?? '—'}</td>
              <td className="px-3 py-2 text-xs">{a.admittedAt.slice(0, 10)}</td>
              <td className="px-3 py-2 text-xs">{a.consultant ?? '—'}</td>
              <td className="px-3 py-2 text-xs max-w-[120px] truncate">{a.diagnosis ?? '—'}</td>
              <td className="px-3 py-2"><StatusPill tone="green">{a.status}</StatusPill></td>
              <td className="px-3 py-2">
                <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/lab`)} title="Lab results"><Stethoscope className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/prescriptions`)} title="Prescriptions"><FileText className="h-3 w-3" /></Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
              {wardsApiOn ? 'No active admissions found.' : 'Live admissions appear when the admissions API is enabled.'}
            </td></tr>
          )}
        </tbody>
      </table>
    </Card>
    );
  };

  const renderBedDashboard = () => (
    <Card>
      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4" /> Bed &amp; ward allocation
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Doctors submit the clinical admission request only. <b>Records</b> chooses the ward (by patient sex and class)
        and assigns a free bed. Use the Records Admission queue to allocate beds.
      </p>
      {wardsApiOn && apiWards.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase">
              <tr>
                {['Ward', 'Gender', 'Class', 'Free', 'Occupied', 'Total'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {apiWards.map((w) => (
                <tr key={w.wardId}>
                  <td className="px-3 py-2 font-medium">{w.name}</td>
                  <td className="px-3 py-2 text-xs">{w.gender ?? 'Mixed'}</td>
                  <td className="px-3 py-2 text-xs">{w.wardClass || w.wardType || '—'}</td>
                  <td className="px-3 py-2 text-emerald-700 font-semibold">{w.availableBeds ?? 0}</td>
                  <td className="px-3 py-2">{w.occupiedBeds ?? 0}</td>
                  <td className="px-3 py-2">{w.totalBeds ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">Read-only occupancy. Selection happens in Records.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Live bed counts appear when the API is enabled. Allocation remains a Records task.
        </p>
      )}
    </Card>
  );

  const renderHistoryTable = () => {
    const rows = displayedHistory;
    if (admApiOn && historyLoading) {
      return (
        <Card className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading admission history…
        </Card>
      );
    }
    if (admApiOn && historyError) {
      return (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-800">{historyError}</p>
          <Button size="sm" variant="outline" onClick={() => void refreshHistory()}>Retry</Button>
        </Card>
      );
    }
    return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Admission Date', 'Discharge Date', 'Ward', 'Diagnosis', 'LOS', 'Outcome', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(h => (
            <tr key={h.id}>
              <td className="px-3 py-2 text-xs">{h.admissionDate}</td>
              <td className="px-3 py-2 text-xs">{h.dischargeDate}</td>
              <td className="px-3 py-2">{h.ward}</td>
              <td className="px-3 py-2 text-xs">{h.diagnosis}</td>
              <td className="px-3 py-2">{h.los}</td>
              <td className="px-3 py-2 text-xs">{h.outcome}</td>
              <td className="px-3 py-2">
                <Button size="sm" variant="ghost" onClick={() => setViewHistory(h)}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (patient) { setForm(f => ({ ...f, provisionalDiagnosis: h.diagnosis, admissionType: 'Readmission' })); setPatientTab('new'); toast.success('Loaded for re-admission'); } else toast.info('Select patient first'); }}><RefreshCw className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setViewHistory(h); window.setTimeout(() => window.print(), 150); }}><Printer className="h-3 w-3" /></Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
              {admApiOn ? 'No admission history found.' : 'Admission history appears when the API is enabled.'}
            </td></tr>
          )}
        </tbody>
      </table>
    </Card>
    );
  };

  const renderNewForm = () => (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {!patient && (
          <Card className="border-amber-200 bg-amber-50/50">
            <p className="text-sm text-amber-900">Select a patient to build an admission request.</p>
            <Button size="sm" className="mt-2" onClick={() => openPatientModal('new')}><UserPlus className="h-4 w-4 mr-1" />Select Patient</Button>
          </Card>
        )}
        {patient && (
          <Card className="border-primary/20 bg-primary/5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <div className="font-semibold">{patient.name}</div>
                <div className="text-xs text-muted-foreground">{patient.hospitalId} · {patient.age}y {patient.gender} · {patient.clinic}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" disabled title="EMR integration pending">
                  Open EMR
                </Button>
                <Button size="sm" variant="outline" disabled title="Timeline integration pending">
                  Timeline
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`${base}/lab`)}>Results</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`${base}/prescriptions`)}>Rx</Button>
              </div>
              <PendingIntegrationBanner compact reason="EMR and clinical timeline routes are not yet integrated" className="mt-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground">Diagnosis</span><div>{patient.diagnosis}</div></div>
              <div><span className="text-muted-foreground">Allergies</span><div className="text-rose-700">{patient.allergies}</div></div>
              <div><span className="text-muted-foreground">Medications</span><div>{patient.medications}</div></div>
              <div><span className="text-muted-foreground">Vitals</span><div>{patient.vitals}</div></div>
              <div className="col-span-2"><span className="text-muted-foreground">Risk</span><div className="text-amber-700">{patient.riskFlag}</div></div>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold mb-3">Admission Request Form</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Requesting Doctor</Label><Input value={doctorName} disabled className="h-9" /></div>
            <div><Label className="text-xs">Clinic / Department</Label>
              <Select value={form.encounter} onValueChange={v => setForm(f => ({ ...f, encounter: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select clinic" /></SelectTrigger>
                <SelectContent>
                  {['OPC · Outpatient', 'GMPC · Medical', 'Emergency', 'Follow-up Clinic', 'CAP', 'Addiction Clinic'].map(c =>
                    <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Encounter Type</Label>
              <Select value={form.admissionType} onValueChange={v => setForm(f => ({ ...f, admissionType: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['New admission', 'Readmission', 'Transfer-in', 'Observation', 'Trial leave return'].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 text-xs p-3 rounded border bg-sky-50 border-sky-200 text-sky-900">
              <b>Ward &amp; bed:</b> Records allocates an appropriate ward and free bed after this request is submitted.
              Doctors do not select ward or bed here.
            </div>
            <div><Label className="text-xs">Priority *</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as FormPriority }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Routine', 'Urgent', 'Emergency'] as const).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.priority !== 'Routine' && (
              <div className="sm:col-span-2"><Label className="text-xs">Urgent / Emergency Reason *</Label>
                <Textarea rows={2} value={form.priorityReason} onChange={e => setForm(f => ({ ...f, priorityReason: e.target.value }))} placeholder="Clinical reason for urgency…" />
              </div>
            )}
            <div><Label className="text-xs">Est. Length of Stay *</Label><Input className="h-9" placeholder="e.g. 14 days" value={form.estimatedLos} onChange={e => setForm(f => ({ ...f, estimatedLos: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Provisional Diagnosis *</Label>
              <Input value={form.provisionalDiagnosis} onChange={e => setForm(f => ({ ...f, provisionalDiagnosis: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Secondary Diagnosis</Label>
              <Input value={form.secondaryDiagnosis} onChange={e => setForm(f => ({ ...f, secondaryDiagnosis: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Clinical Indication for Admission *</Label>
              <Textarea rows={3} value={form.clinicalIndication} onChange={e => setForm(f => ({ ...f, clinicalIndication: e.target.value }))} placeholder="Justification, treatment goals, why inpatient care is required…" /></div>
            {patient?.clinic === 'OPC' && (
              <div className="sm:col-span-2"><Label className="text-xs">Mental Health Risk Assessment *</Label>
                <Textarea rows={2} value={form.mentalHealthRisk} onChange={e => setForm(f => ({ ...f, mentalHealthRisk: e.target.value }))} placeholder="Suicide, self-harm, psychosis, capacity…" /></div>
            )}
            {patient?.clinic === 'GMPC' && (
              <div className="sm:col-span-2"><Label className="text-xs">Physical Health Risk Assessment *</Label>
                <Textarea rows={2} value={form.physicalHealthRisk} onChange={e => setForm(f => ({ ...f, physicalHealthRisk: e.target.value }))} placeholder="Medical instability, vitals, comorbidity…" /></div>
            )}
            {!patient && (
              <div className="sm:col-span-2"><Label className="text-xs">Risk Assessment</Label>
                <Textarea rows={2} disabled placeholder="Select patient — OPC shows psychiatric risk; GMPC shows physical health risk" /></div>
            )}
            <div className="sm:col-span-2"><Label className="text-xs">Treatment Plan During Admission</Label>
              <Textarea rows={2} value={form.treatmentPlan} onChange={e => setForm(f => ({ ...f, treatmentPlan: e.target.value }))} /></div>
            <div><Label className="text-xs">Required Monitoring</Label><Input value={form.requiredMonitoring} onChange={e => setForm(f => ({ ...f, requiredMonitoring: e.target.value }))} placeholder="Vitals q4h, ECG, labs…" /></div>
            <div><Label className="text-xs">Nursing Observation Level</Label>
              <Select value={form.nursingObservation} onValueChange={v => setForm(f => ({ ...f, nursingObservation: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General', 'Enhanced', 'Close', 'Constant (1:1)'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Isolation Required</Label>
              <Select value={form.isolation} onValueChange={v => setForm(f => ({ ...f, isolation: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Consent Status</Label>
              <Select value={form.consentStatus} onValueChange={v => setForm(f => ({ ...f, consentStatus: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Obtained', 'Pending', 'Emergency / Best Interest'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Next of Kin Informed</Label>
              <Select value={form.nokInformed} onValueChange={v => setForm(f => ({ ...f, nokInformed: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              {[
                ['fallRisk', 'Fall risk'], ['suicideRisk', 'Suicide/self-harm'], ['violenceRisk', 'Violence/aggression'], ['withdrawalRisk', 'Substance withdrawal'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs">
                  <Switch checked={form[key as keyof typeof form] as boolean} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Special Bed Requirement</Label>
              <Input value={form.specialBed} onChange={e => setForm(f => ({ ...f, specialBed: e.target.value }))} placeholder="Bariatric, side room, low bed…" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Doctor Note to Ward</Label>
              <Textarea rows={2} value={form.doctorNote} onChange={e => setForm(f => ({ ...f, doctorNote: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Attach Supporting Document</Label><Input type="file" className="h-9" /></div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-4">
          <h3 className="font-semibold text-sm mb-3">Request Preview</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{patient?.name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ward / bed</span><span>Records allocates</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span>
              {form.priority ? <StatusPill tone={priorityTone(form.priority)}>{form.priority}</StatusPill> : '—'}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Diagnosis</span><span className="text-right max-w-[55%] truncate">{form.provisionalDiagnosis || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Est. LOS</span><span>{form.estimatedLos || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusPill tone="blue">Draft</StatusPill></div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => setSubmitModal(true)} disabled={!patient || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Submit Admission Request
            </Button>
            <Button variant="outline" onClick={() => void handleSubmit(true)} disabled={!patient || submitting}>Save Draft</Button>
            <Button variant="ghost" onClick={() => setForm(emptyForm())}>Clear Form</Button>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t lg:hidden flex gap-2 z-40">
        <Button className="flex-1" onClick={() => setSubmitModal(true)} disabled={!patient}><Send className="h-4 w-4 mr-1" />Submit</Button>
      </div>
    </div>
  );

  const kpiCards = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {([
        ['pending', 'Pending', kpis.pending, 'Awaiting approval', Clock, 'amber'],
        ['approved', 'Approved', kpis.approved, 'Awaiting bed', CheckCircle2, 'green'],
        ['admitted', 'Admitted', kpis.admitted, 'Across wards', BedDouble, 'blue'],
        ['rejected', 'Rejected', kpis.rejected, 'Declined requests', XCircle, 'rose'],
        ['beds', 'Bed Available', kpis.beds, 'Hospital-wide', MapPin, 'teal'],
        ['emergency', 'Emergency Priority', kpis.emergency, 'Urgent requests', Siren, 'rose'],
      ] as const).map(([id, title, val, sub, Icon, t]) => (
        <button key={id} type="button" onClick={() => {
          setKpiFilter(kpiFilter === id ? null : id as KpiFilter);
          if (id === 'beds') { setOverviewTab('beds'); setPatientTab('beds'); setPageMode('overview'); }
          else if (id === 'admitted') { setOverviewTab('approved'); setPatientTab('admitted'); setPageMode('overview'); }
          else if (id === 'pending') { setOverviewTab('pending'); setPatientTab('pending'); setPageMode('overview'); }
          else if (id === 'approved') { setOverviewTab('approved'); setPatientTab('approved'); setPageMode('overview'); }
          else if (id === 'rejected') { setOverviewTab('rejected'); setPatientTab('rejected'); setPageMode('overview'); }
        }} className={`text-left rounded-xl transition ring-offset-2 ${kpiFilter === id ? 'ring-2 ring-primary' : ''}`}>
          <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t as 'amber' | 'green' | 'blue' | 'rose' | 'teal'} />
        </button>
      ))}
    </div>
  );

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Admission Request Engine"
      flowTitle="Admission Request Engine"
      flowSubtitle="Request inpatient admission with ward and clinical details"
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Admission Requests</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Request, justify, track, and manage patient admission into hospital wards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openPatientModal('new')}><Search className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button size="sm" onClick={() => openPatientModal('new')}><Plus className="h-4 w-4 mr-1" />New Admission Request</Button>
          <Button variant="outline" size="sm" onClick={() => { setPageMode('overview'); setOverviewTab('mine'); setListScope('mine'); void refreshRequests('mine'); }}>
            <History className="h-4 w-4 mr-1" />My Requests
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPageMode('overview'); setOverviewTab('all'); setListScope('all'); void refreshRequests('all'); }}>
            <History className="h-4 w-4 mr-1" />All Requests
          </Button>
          {admApiOn && (
            <Button variant="outline" size="sm" disabled={queueLoading} onClick={() => void refreshRequests()}>
              {queueLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
          )}
        </div>
      </div>

      {kpiCards}

      {pageMode === 'select' && (
        <Card className="mb-4 p-6 text-center space-y-3">
          <UserPlus className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-semibold">Select a patient to create an admission request</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Payment and bed assignment are handled later by cashier and records. Doctors submit clinical requests only.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => openPatientModal('new')}><UserPlus className="h-4 w-4 mr-1" />Select Patient</Button>
            <Button variant="outline" onClick={() => { setPageMode('overview'); setListScope('mine'); setOverviewTab('mine'); }}>View My Requests</Button>
            <Button variant="outline" onClick={() => { setPageMode('overview'); setListScope('all'); setOverviewTab('all'); }}>View All Requests</Button>
          </div>
        </Card>
      )}

      {(pageMode === 'overview' || pageMode === 'select') && pageMode !== 'patient' ? (
        pageMode === 'overview' ? (
        <>
          <Card className="mb-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search patient, hospital no., request no., ward…" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <p className="text-xs text-muted-foreground">
              {listScope === 'mine' ? 'My admission requests' : 'Hospital-wide admission requests'}
            </p>
            <Button size="sm" onClick={() => openPatientModal('new')}><Plus className="h-4 w-4 mr-1" />New Request</Button>
          </Card>

          {admApiOn && queueLoading && (
            <Card className="mb-4 p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading admission requests…
            </Card>
          )}
          {admApiOn && queueError && !queueLoading && (
            <Card className="mb-4 p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
              <p className="text-sm text-rose-800">{queueError}</p>
              <Button size="sm" variant="outline" onClick={() => void refreshRequests()}>Retry</Button>
            </Card>
          )}

          <Tabs value={overviewTab} onValueChange={v => {
            const next = v as OverviewTabId;
            setOverviewTab(next);
            if (next === 'mine' || next === 'all') {
              setListScope(next);
            }
          }}>
            <TabsList className="flex flex-wrap h-auto mb-4">
              {([
                ['mine', 'My Requests'], ['all', 'All Requests'], ['pending', 'Pending'],
                ['approved', 'Approved / Awaiting Bed'], ['rejected', 'Rejected'], ['beds', 'Bed Availability'], ['history', 'Admission History'],
              ] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="mine">{renderRequestTable(filteredRequests, 'No requests from you yet.', 'full')}</TabsContent>
            <TabsContent value="all">{renderRequestTable(filteredRequests, 'No admission requests found.', 'full')}</TabsContent>
            <TabsContent value="pending">{renderRequestTable(filteredRequests.filter(r => ['Pending', 'Under Review', 'More Information Required', 'Draft'].includes(r.approvalStatus)), 'No pending requests.', 'pending')}</TabsContent>
            <TabsContent value="approved">{renderApprovedTable(filteredRequests.filter(r => r.approvalStatus === 'Approved'))}</TabsContent>
            <TabsContent value="rejected">{renderRequestTable(filteredRequests.filter(r => r.approvalStatus === 'Rejected'), 'No rejected requests.', 'rejected')}</TabsContent>
            <TabsContent value="beds">{renderBedDashboard()}</TabsContent>
            <TabsContent value="history">{renderHistoryTable()}</TabsContent>
          </Tabs>
        </>
        ) : null
      ) : pageMode === 'patient' ? (
        <>
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={backToOverview}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <div className="font-semibold">{patient?.name}</div>
                <div className="text-xs text-muted-foreground">{patient?.hospitalId} · {patient?.clinic}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" disabled title="EMR integration pending">EMR</Button>
              <Button size="sm" variant="outline" onClick={() => setPatientTab('history')}>History</Button>
              <Button size="sm" variant="outline" onClick={() => setPatientTab('beds')}>Beds</Button>
            </div>
          </Card>

          <Tabs value={patientTab} onValueChange={v => setPatientTab(v as PatientTabId)}>
            <TabsList className="flex flex-wrap h-auto mb-4">
              {([
                ['new', 'New Request'], ['pending', 'Pending'], ['approved', 'Approved / Awaiting Bed'],
                ['admitted', 'Admitted'], ['rejected', 'Rejected'], ['beds', 'Bed Availability'], ['history', 'History'],
              ] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="new">{renderNewForm()}</TabsContent>
            <TabsContent value="pending">{renderRequestTable(patientRequests.filter(r => ['Pending', 'Under Review', 'Draft'].includes(r.approvalStatus)), 'No pending requests for this patient.', 'pending')}</TabsContent>
            <TabsContent value="approved">{renderApprovedTable(patientRequests.filter(r => r.approvalStatus === 'Approved'))}</TabsContent>
            <TabsContent value="admitted">{renderAdmittedTable()}</TabsContent>
            <TabsContent value="rejected">{renderRequestTable(patientRequests.filter(r => r.approvalStatus === 'Rejected'), 'No rejected requests.', 'rejected')}</TabsContent>
            <TabsContent value="beds">{renderBedDashboard()}</TabsContent>
            <TabsContent value="history">{renderHistoryTable()}</TabsContent>
          </Tabs>
        </>
      ) : null}

      {/* Patient modal */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{patientModalMode === 'new' ? 'New Admission — Select Patient' : 'Select Patient'}</DialogTitle>
            <DialogDescription>Search by name, hospital number, phone, NHIA, or NIN</DialogDescription>
          </DialogHeader>
          <Input placeholder="Search…" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="mb-3" />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {patientSearchLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>
            )}
            {patientResults.map(p => (
              <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.clinic} · {p.diagnosis}</div>
              </button>
            ))}
            {!patientSearchLoading && patientResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {patientsApiOn ? 'Type at least 2 characters to search patients.' : 'Patient search requires the patients API.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <Dialog open={submitModal} onOpenChange={setSubmitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admission Request</DialogTitle>
            <DialogDescription>Review checklist before submitting to Records / Admission office</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {submitChecklist.map(([label, ok]) => (
              <li key={label} className={`flex items-center gap-2 ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {label}
              </li>
            ))}
          </ul>
          {patient && (
            <div className="text-xs p-3 bg-muted/30 rounded mt-2">
              <b>{patient.name}</b> · {form.priority || '—'} · Est. LOS {form.estimatedLos || '—'}
              <div className="mt-1 text-muted-foreground">Records will allocate ward and bed.</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitModal(false)}>Cancel</Button>
            <Button variant="outline" disabled={submitting} onClick={() => void handleSubmit(true)}>Save Draft</Button>
            <Button disabled={submitChecklist.some(([, ok]) => !ok) || submitting} onClick={() => void handleSubmit(false)}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View request */}
      <Sheet open={!!viewRequest} onOpenChange={v => !v && setViewRequest(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewRequest?.id}</SheetTitle>
            <SheetDescription>{viewRequest?.patientName} · {viewRequest?.ward}</SheetDescription>
          </SheetHeader>
          {viewRequest && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/30 rounded">
                <div><b>Patient:</b> {viewRequest.patientName}</div>
                <div><b>Hospital No:</b> {viewRequest.hospitalId}</div>
                <div><b>Priority:</b> {viewRequest.priority}</div>
                <div><b>Status:</b> {viewRequest.approvalStatus}</div>
                <div><b>Diagnosis:</b> {viewRequest.diagnosis}</div>
                <div><b>Est. LOS:</b> {viewRequest.estimatedLos}</div>
                <div><b>Requested:</b> {viewRequest.requestTime.slice(0, 16).replace('T', ' ')}</div>
              </div>
              {viewRequest.bedStatus && <div className="text-xs"><b>Bed status:</b> {viewRequest.bedStatus} {viewRequest.bedNo && `· ${viewRequest.bedNo}`}</div>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPrintRequest(viewRequest)}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
                {viewRequest.approvalStatus === 'Pending' && (
                  <Button size="sm" variant="outline" onClick={() => cancelRequest(viewRequest)}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Track status */}
      <Dialog open={!!trackRequest} onOpenChange={v => !v && setTrackRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Track Status — {trackRequest?.id}</DialogTitle></DialogHeader>
          {trackRequest && (
            <div className="space-y-3">
              {['Request submitted', 'Records review', 'Clinical approval', 'Bed allocation', 'Patient notified', 'Admitted'].map((step, i) => {
                const done = trackRequest.approvalStatus === 'Approved' ? i <= 4 : i <= 1;
                return (
                  <div key={step} className="flex gap-3 items-start">
                    <div className={`h-3 w-3 rounded-full mt-1 ${done ? 'bg-emerald-500' : 'bg-muted'}`} />
                    <div><div className="text-sm font-medium">{step}</div><div className="text-xs text-muted-foreground">{done ? 'Completed' : 'Pending'}</div></div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><Button onClick={() => setTrackRequest(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection reason */}
      <Dialog open={!!viewRejected} onOpenChange={v => !v && setViewRejected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejection Reason — {viewRejected?.id}</DialogTitle></DialogHeader>
          {viewRejected && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-900">
                <div className="font-semibold mb-1">Rejected by {viewRejected.rejectedBy}</div>
                <p>{viewRejected.rejectionReason}</p>
              </div>
              <Button onClick={() => { setForm(viewRejected.form); setPatientTab('new'); setViewRejected(null); toast.success('Loaded for resubmission'); }}>Edit and Resubmit</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print */}
      <Dialog open={!!printRequest} onOpenChange={v => !v && setPrintRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admission Request Slip</DialogTitle></DialogHeader>
          {printRequest && (
            <div className="border rounded p-4 text-sm space-y-1 font-mono text-xs">
              <div className="text-center font-bold text-base font-display">GFA HMS — Admission Request</div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span>Request No:</span><b>{printRequest.id}</b></div>
                <div className="flex justify-between"><span>Patient:</span><span>{printRequest.patientName}</span></div>
                <div className="flex justify-between"><span>Hospital No:</span><span>{printRequest.hospitalId}</span></div>
                <div className="flex justify-between"><span>Ward:</span><span>{printRequest.ward}</span></div>
                <div className="flex justify-between"><span>Priority:</span><span>{printRequest.priority}</span></div>
                <div className="flex justify-between"><span>Diagnosis:</span><span>{printRequest.diagnosis}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRequest(null)}>Close</Button>
            <Button onClick={() => { window.print(); toast.success('Sent to printer'); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History summary */}
      <Dialog open={!!viewHistory} onOpenChange={v => !v && setViewHistory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admission Summary</DialogTitle></DialogHeader>
          {viewHistory && (
            <div className="text-sm space-y-2">
              <div><b>Ward:</b> {viewHistory.ward}</div>
              <div><b>Admission:</b> {viewHistory.admissionDate}</div>
              <div><b>Discharge:</b> {viewHistory.dischargeDate}</div>
              <div><b>Diagnosis:</b> {viewHistory.diagnosis}</div>
              <div><b>Outcome:</b> {viewHistory.outcome}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClinicalPageShell>
  );
};
