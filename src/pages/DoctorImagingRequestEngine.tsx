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
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { useAuth } from '@/contexts/AuthContext';
import { useRadiology } from '@/contexts/RadiologyStore';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { db } from '@/db/database';
import type { ImagingRequest, RadModality, RadPriority, RadReportStatus, RadiologyReport } from '@/data-access/types';
import { ApiError } from '@/lib/api/client';
import {
  createImagingRequest,
  getCriticalFindings,
  isImagingApiEnabled,
  listConsumerImagingResults,
  listImagingRequests,
  listImagingStudies,
  listRadiologyReports,
  type ApiConsumerResult,
  type ApiImagingRequest,
  type ApiImagingStudy,
  type ApiRadiologyReport,
} from '@/lib/api/imaging';
import {
  ScanLine, Search, Plus, Printer, Download, Eye, Trash2, Send, Clock,
  CheckCircle2, AlertTriangle, FileText, History, XCircle, MessageSquare, RefreshCw,
  Stethoscope, CreditCard, Bell, ArrowLeft, UserPlus, Monitor, TrendingUp, ShieldCheck, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const IMG_AUDIT_KEY = 'gfa_doc_imaging_audit_v1';
const IMG_TIMELINE_KEY = 'gfa_doc_imaging_timeline_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Imaging Requests">{children}</DashboardLayout>
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

interface ImagingReportMeta {
  hospitalId: string; age: number; gender: string; clinic: string;
  clinicalHistory: string; indication: string; requestingDoctor: string;
  examination: string; reportNo: string;
}

const SAMPLE_IMAGING_META: ImagingReportMeta = {
  hospitalId: 'GFA-2024-00831', age: 34, gender: 'Male', clinic: 'OPC · Outpatient Clinic',
  clinicalHistory: '34-year-old male with moderate depressive episode on sertraline. Presents with persistent headache and dizziness for 2 weeks. No history of trauma or focal neurological deficit.',
  indication: 'Rule out intracranial pathology — headache in psychiatric patient on SSRI',
  requestingDoctor: 'Dr. Olufemi Hassan', examination: 'CT Brain Plain (Non-contrast)',
  reportNo: 'RAD-RPT-2026-0042',
};

const SAMPLE_IMAGING_REPORT: RadiologyReport = {
  id: 'RAD-RPT-2026-0042',
  requestId: 'IMG-2026-0156',
  patientId: 'q1',
  patientName: 'Tope Adeyemi',
  modality: 'CT Scan',
  technique: 'Non-contrast axial CT of the brain acquired on 256-slice scanner. Contiguous 3 mm slices from skull base to vertex. No intravenous contrast administered.',
  findings: `The ventricular system is normal in size and configuration. No midline shift.\n\nThe cerebral parenchyma shows normal grey-white matter differentiation. No evidence of acute intracranial haemorrhage, established infarct, mass lesion, or extra-axial collection.\n\nThe basal cisterns are patent. The calvarium and skull base appear intact.\n\nMild prominence of cortical sulci and ventricular system suggestive of mild cerebral atrophy, likely age-related.\n\nVisualised paranasal sinuses and mastoid air cells are clear.`,
  impression: 'No acute intracranial abnormality. Mild cerebral atrophy — likely age-related. No mass effect or haemorrhage.',
  recommendations: 'Clinical correlation advised. Consider MRI brain if symptoms persist or neurological signs develop. Continue current psychiatric management.',
  comparison: 'No prior imaging available for comparison.',
  template: 'CT Brain Plain',
  status: 'RELEASED',
  critical: false,
  reportedBy: 'Dr. Ibrahim Musa (Consultant Radiologist)',
  verifiedBy: 'Dr. Funke Adeyemi (Chief Radiologist)',
  createdAt: '2026-05-27T11:45:00',
  updatedAt: '2026-05-27T14:20:00',
  audit: [
    { action: 'Report submitted', by: 'Dr. Ibrahim Musa', at: '2026-05-27T11:45:00' },
    { action: 'Verified & released to EMR', by: 'Dr. Funke Adeyemi', at: '2026-05-27T14:20:00' },
  ],
};

const StandardImagingReportView = ({ report, meta }: { report: RadiologyReport; meta?: ImagingReportMeta }) => {
  const m = meta ?? {
    hospitalId: '—', age: 0, gender: '—', clinic: '—',
    clinicalHistory: '—', indication: '—', requestingDoctor: '—',
    examination: report.technique ?? report.modality, reportNo: report.id,
  };
  return (
    <div className="hms-section border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-80">GFA Demo Hospital · Aro</p>
            <h3 className="font-display text-lg font-bold">Radiology & Imaging Report</h3>
            <p className="text-xs opacity-90 mt-0.5">Department of Radiology · Diagnostic Imaging Services</p>
          </div>
          <div className="text-left sm:text-right text-xs shrink-0">
            <div className="font-mono font-bold text-sm">{m.reportNo}</div>
            <div className="opacity-90">Reported: {report.createdAt?.slice(0, 16).replace('T', ' ') ?? '—'}</div>
            <StatusPill tone="green">{report.status}</StatusPill>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-3 bg-muted/30 border-b grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <div><span className="text-muted-foreground block">Patient</span><span className="font-semibold">{report.patientName}</span></div>
        <div><span className="text-muted-foreground block">Hospital No.</span><span className="font-mono">{m.hospitalId}</span></div>
        <div><span className="text-muted-foreground block">Age / Sex</span><span>{m.age || '—'} yrs · {m.gender}</span></div>
        <div><span className="text-muted-foreground block">Clinic</span><span>{m.clinic}</span></div>
        <div><span className="text-muted-foreground block">Request No.</span><span className="font-mono">{report.requestId}</span></div>
        <div><span className="text-muted-foreground block">Modality</span><span className="font-semibold">{report.modality}</span></div>
        <div><span className="text-muted-foreground block">Examination</span><span>{m.examination}</span></div>
        <div><span className="text-muted-foreground block">Requested By</span><span>{m.requestingDoctor}</span></div>
      </div>

      <div className="px-4 md:px-6 py-3 border-b space-y-3 text-sm">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Clinical History</p>
          <p className="text-xs leading-relaxed">{m.clinicalHistory}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Clinical Question / Indication</p>
          <p className="text-xs leading-relaxed italic">{m.indication}</p>
        </div>
        {report.technique && (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Technique</p>
            <p className="text-xs leading-relaxed">{report.technique}</p>
          </div>
        )}
        {report.comparison && (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Comparison</p>
            <p className="text-xs text-muted-foreground">{report.comparison}</p>
          </div>
        )}
      </div>

      <div className="px-4 md:px-6 py-3 border-b">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Findings</p>
        <div className="text-sm leading-relaxed whitespace-pre-line">{report.findings}</div>
      </div>

      <div className="px-4 md:px-6 py-3 border-b bg-indigo-50/40">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Impression / Conclusion</p>
        <p className="text-sm font-semibold leading-relaxed">{report.impression}</p>
      </div>

      {report.recommendations && (
        <div className="px-4 md:px-6 py-3 border-b">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Recommendations</p>
          <p className="text-sm leading-relaxed">{report.recommendations}</p>
        </div>
      )}

      {report.critical && (
        <div className="px-4 md:px-6 py-3 border-b bg-rose-50 border-rose-200">
          <p className="text-[10px] uppercase text-rose-700 font-semibold mb-1">Critical Finding</p>
          <p className="text-sm text-rose-800 font-medium">{report.criticalFinding ?? report.impression}</p>
        </div>
      )}

      <div className="px-4 md:px-6 py-3 border-t bg-emerald-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <div className="flex items-start gap-2 text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Verified & released to EMR</p>
            <p className="text-emerald-700/80">Reported by {report.reportedBy}</p>
            <p className="text-emerald-700/80">Validated by {report.verifiedBy ?? 'Pending validation'}</p>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-[10px]">PACS Ref · GFA-RAD · Digitally signed</div>
      </div>
    </div>
  );
};

type PageMode = 'overview' | 'patient';
type OverviewTabId = 'all' | 'pending' | 'completed' | 'critical' | 'payment' | 'awaiting_report' | 'rejected';
type PatientTabId = 'new' | 'pending' | 'completed' | 'critical' | 'payment' | 'awaiting_report' | 'rejected' | 'previous';
type KpiFilter = 'pending' | 'completed' | 'critical' | 'payment' | 'awaiting_report' | 'rejected';
type FormPriority = 'Routine' | 'Urgent' | 'Emergency';

interface ImgPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: 'OPC' | 'GMPC'; diagnosis: string; allergies: string;
  pregnancy: string; vitals: string; billingStatus: string; nhiaStatus: string;
}

interface ImgDraft {
  id: string; patientName: string; hospitalId: string; examination: string; createdBy: string;
  lastSaved: string; form: ReturnType<typeof emptyForm>;
}

const MODALITIES: { label: string; value: RadModality; opc?: boolean; gmpc?: boolean }[] = [
  { label: 'X-Ray', value: 'X-Ray', gmpc: true },
  { label: 'Ultrasound', value: 'Ultrasound', gmpc: true },
  { label: 'ECG', value: 'ECG', gmpc: true, opc: true },
  { label: 'CT Scan', value: 'CT Scan', gmpc: true, opc: true },
  { label: 'MRI', value: 'MRI', gmpc: true, opc: true },
  { label: 'EEG', value: 'EEG', opc: true },
  { label: 'Echocardiography', value: 'Echocardiography', gmpc: true },
  { label: 'Fluoroscopy', value: 'Fluoroscopy' },
  { label: 'Mammography', value: 'Mammography' },
  { label: 'Doppler Scan', value: 'Ultrasound', gmpc: true },
  { label: 'Portable', value: 'Portable' },
];

const BODY_REGIONS = [
  'Head / Brain', 'Chest', 'Abdomen', 'Pelvis', 'Spine', 'Upper Limb', 'Lower Limb',
  'Heart', 'Breast', 'Whole Body', 'Other',
];

const EXAM_SHORTCUTS = [
  { name: 'Chest X-Ray', modality: 'X-Ray' as RadModality, region: 'Chest', exam: 'Chest X-Ray PA' },
  { name: 'Skull X-Ray', modality: 'X-Ray' as RadModality, region: 'Head / Brain', exam: 'Skull X-Ray' },
  { name: 'Abdominal Ultrasound', modality: 'Ultrasound' as RadModality, region: 'Abdomen', exam: 'Abdominal Ultrasound' },
  { name: 'Pelvic Ultrasound', modality: 'Ultrasound' as RadModality, region: 'Pelvis', exam: 'Pelvic Ultrasound' },
  { name: 'ECG', modality: 'ECG' as RadModality, region: 'Heart', exam: '12-Lead ECG' },
  { name: 'CT Brain', modality: 'CT Scan' as RadModality, region: 'Head / Brain', exam: 'CT Brain Plain' },
  { name: 'MRI Brain', modality: 'MRI' as RadModality, region: 'Head / Brain', exam: 'MRI Brain' },
  { name: 'EEG', modality: 'EEG' as RadModality, region: 'Head / Brain', exam: 'Routine EEG' },
  { name: 'Echocardiography', modality: 'Echocardiography' as RadModality, region: 'Heart', exam: 'Transthoracic Echo' },
  { name: 'Doppler Ultrasound', modality: 'Ultrasound' as RadModality, region: 'Abdomen', exam: 'Doppler Ultrasound' },
];

const PATIENTS: ImgPatient[] = [
  {
    id: 'q1', name: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831', phone: '08031234567',
    nin: '12345678901', nhiaNo: 'NHIA-882910', age: 34, gender: 'M', clinic: 'OPC',
    diagnosis: 'Moderate Depressive Episode (F32.1)', allergies: 'Penicillin', pregnancy: 'N/A',
    vitals: 'BP 122/78 · HR 72', billingStatus: 'Paid · Wallet ₦12,400', nhiaStatus: 'Active · NHIA-882910',
  },
  {
    id: 'q2', name: 'Aisha Bello', hospitalId: 'GFA-2024-00912', phone: '08042345678',
    nin: '23456789012', nhiaNo: 'NHIA-773421', age: 29, gender: 'F', clinic: 'GMPC',
    diagnosis: 'Generalized Anxiety Disorder', allergies: 'None', pregnancy: 'Not pregnant',
    vitals: 'BP 118/76 · HR 68', billingStatus: 'NHIA · Pre-auth pending', nhiaStatus: 'NHIA enrolled',
  },
];

function getReportMeta(report: RadiologyReport, patientCtx?: ImgPatient | null): ImagingReportMeta | undefined {
  if (report.id === SAMPLE_IMAGING_REPORT.id) return SAMPLE_IMAGING_META;
  const p = patientCtx ?? PATIENTS.find(x => x.name === report.patientName);
  if (!p) return undefined;
  return {
    hospitalId: p.hospitalId,
    age: p.age,
    gender: p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender,
    clinic: `${p.clinic} · ${p.clinic === 'OPC' ? 'Outpatient Clinic' : 'GMPC'}`,
    clinicalHistory: `${p.age}-year-old ${p.gender === 'M' ? 'male' : 'female'} — ${p.diagnosis}.`,
    indication: `Evaluate ${report.modality} — ${p.diagnosis}`,
    requestingDoctor: 'Referring Clinician',
    examination: report.technique ?? report.modality,
    reportNo: report.id,
  };
}

const PENDING_STATUSES = ['REQUESTED', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'] as const;
const PAYMENT_STATUSES = ['AWAITING_PAYMENT'] as const;
const AWAITING_REPORT_STATUSES = ['IMAGING_DONE', 'REPORT_PENDING'] as const;
const COMPLETED_STATUSES = ['REPORTED', 'VERIFIED', 'RELEASED'] as const;

const TRACK_STEPS = ['Request submitted', 'Payment confirmed', 'Scheduled', 'Patient arrived', 'Imaging performed', 'Report writing', 'Validation', 'Report released'];

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Submitted', ACCEPTED: 'Accepted', REJECTED: 'Rejected', AWAITING_PAYMENT: 'Awaiting Payment',
  PAID: 'Paid', SCHEDULED: 'Scheduled', IN_PROGRESS: 'In Progress', IMAGING_DONE: 'Scan Completed',
  REPORT_PENDING: 'Awaiting Report', REPORTED: 'Reported', VERIFIED: 'Verified', RELEASED: 'Completed', CANCELLED: 'Cancelled',
};

function logImgAudit(action: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(IMG_AUDIT_KEY) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(IMG_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: ImgPatient) {
  try {
    const arr = JSON.parse(localStorage.getItem(IMG_TIMELINE_KEY) || '[]');
    arr.unshift({ event, patient: patient.name, hospitalId: patient.hospitalId, timestamp: new Date().toISOString() });
    localStorage.setItem(IMG_TIMELINE_KEY, JSON.stringify(arr.slice(0, 300)));
  } catch { /* noop */ }
}

const emptyForm = () => ({
  encounter: '', modality: '' as RadModality | '', bodyRegion: '', examination: '',
  studyId: '' as string,
  clinicalHistory: '', clinicalQuestion: '', workingDiagnosis: '', priority: 'Routine' as FormPriority,
  pregnancyConfirm: 'N/A', contrast: 'Radiologist to decide', mobility: 'Ambulatory',
  infectionRisk: false, sedation: 'No', previousImaging: 'No',
  preferredDateTime: '', doctorNote: '', priorityReason: '',
});

const mapPriority = (p: FormPriority): RadPriority =>
  p === 'Emergency' ? 'EMERGENCY' : p === 'Urgent' ? 'URGENT' : 'ROUTINE';

export const DocImaging = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rad = useRadiology();
  useDbTick();
  const doctorName = user?.name ?? 'Dr. User';
  const imgApiOn = isImagingApiEnabled();

  const [pageMode, setPageMode] = useState<PageMode>('overview');
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [patient, setPatient] = useState<ImgPatient | null>(null);
  const [patientTab, setPatientTab] = useState<PatientTabId>('new');
  const [form, setForm] = useState(emptyForm());
  const [drafts, setDrafts] = useState<ImgDraft[]>([]);
  const [patientModal, setPatientModal] = useState(false);
  const [patientModalMode, setPatientModalMode] = useState<'workspace' | 'new'>('workspace');
  const [patientSearch, setPatientSearch] = useState('');
  const [apiStudies, setApiStudies] = useState<ApiImagingStudy[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiImagingRequest[]>([]);
  const [apiReports, setApiReports] = useState<RadiologyReport[]>([]);
  const [apiCritical, setApiCritical] = useState<RadiologyReport[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);

  const [submitModal, setSubmitModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<ImagingRequest | null>(null);
  const [trackRequest, setTrackRequest] = useState<ImagingRequest | null>(null);
  const [viewReport, setViewReport] = useState<RadiologyReport | null>(null);
  const [pacsOpen, setPacsOpen] = useState(false);
  const [ackCritical, setAckCritical] = useState<RadiologyReport | null>(null);
  const [ackAction, setAckAction] = useState('');
  const [ackFollowUp, setAckFollowUp] = useState('');
  const [viewRejected, setViewRejected] = useState<ImagingRequest | null>(null);
  const [printRequest, setPrintRequest] = useState<ImagingRequest | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const mapApiReportStatus = (status: string): RadReportStatus => {
    const s = status.toUpperCase();
    if (s === 'RELEASED') return 'RELEASED';
    if (s === 'VERIFIED') return 'VERIFIED';
    if (s === 'RETURNED') return 'RETURNED';
    if (s === 'DRAFT') return 'DRAFT';
    return 'SUBMITTED';
  };

  const mapConsumerToReport = (r: ApiConsumerResult): RadiologyReport => ({
    id: String(r.reportId),
    requestId: r.requestNo ?? String(r.imagingRequestId),
    patientId: r.hospitalNo ?? String(r.personId ?? ''),
    patientName: r.patientName || '—',
    modality: (r.modality || 'X-Ray') as RadModality,
    technique: r.studyName,
    findings: r.findings,
    impression: r.impression ?? '',
    recommendations: r.recommendation ?? undefined,
    status: mapApiReportStatus(r.status),
    critical: r.critical,
    criticalFinding: r.critical ? (r.impression ?? r.findings) : undefined,
    reportedBy: r.author,
    verifiedBy: r.verifier ?? undefined,
    createdAt: r.submittedAt,
    updatedAt: r.releasedAt ?? r.verifiedAt ?? r.submittedAt,
    audit: [],
  });

  const mapApiReportToLocal = (r: ApiRadiologyReport, enrich?: ApiConsumerResult): RadiologyReport => ({
    id: String(r.reportId),
    requestId: enrich?.requestNo ?? String(r.imagingRequestId),
    patientId: enrich?.hospitalNo ?? String(enrich?.personId ?? ''),
    patientName: enrich?.patientName ?? '—',
    modality: (enrich?.modality || 'X-Ray') as RadModality,
    technique: enrich?.studyName,
    findings: r.findings,
    impression: r.impression ?? '',
    recommendations: r.recommendation ?? undefined,
    status: mapApiReportStatus(r.status),
    critical: r.critical,
    criticalFinding: r.critical ? (r.impression ?? r.findings) : undefined,
    reportedBy: r.author,
    verifiedBy: r.verifier ?? undefined,
    createdAt: r.submittedAt,
    updatedAt: r.releasedAt ?? r.verifiedAt ?? r.submittedAt,
    audit: [],
  });

  const mapApiToLocal = (r: ApiImagingRequest): ImagingRequest => {
    const first = r.items[0];
    const person = r.person;
    const name = [person?.firstName, person?.middleName, person?.lastName].filter(Boolean).join(' ') || '—';
    return {
      id: r.requestNo,
      patientId: String(r.personId),
      patientName: name,
      hospitalId: person?.hospitalNo || `PID-${r.personId}`,
      modality: (first?.modality || 'X-Ray') as RadModality,
      region: first ? `${first.bodyRegion || '—'} — ${first.studyName}` : '—',
      indication: r.clinicalIndication || '—',
      priority: mapPriority((r.priority as FormPriority) || 'Routine'),
      status: r.paymentStatus === 'Unpaid' ? 'AWAITING_PAYMENT' : r.status === 'Sent' ? 'REQUESTED' : (r.status as ImagingRequest['status']),
      paymentStatus: r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived' ? 'PAID' : 'UNPAID',
      amount: r.totalAmount,
      requestedBy: r.doctorName || doctorName,
      clinic: 'OPC',
      clinicalNotes: r.clinicalNotes || undefined,
      createdAt: r.createdAt || new Date().toISOString(),
      invoiceId: undefined,
    } as ImagingRequest;
  };

  useEffect(() => {
    if (!imgApiOn) return;
    listImagingStudies({ status: 'Active' })
      .then(setApiStudies)
      .catch(() => setApiStudies([]));
  }, [imgApiOn]);

  useEffect(() => {
    if (!imgApiOn) return;
    setQueueLoading(true);
    listImagingRequests({ page: 1, limit: 100 })
      .then((data) => setApiRequests(data.items))
      .catch(() => setApiRequests([]))
      .finally(() => setQueueLoading(false));
  }, [imgApiOn, patientTab, overviewTab]);

  useEffect(() => {
    if (!imgApiOn) return;
    let cancelled = false;
    void (async () => {
      try {
        const [consumer, criticalBundle, reports] = await Promise.all([
          listConsumerImagingResults({ limit: 100 }).catch(() => [] as ApiConsumerResult[]),
          getCriticalFindings().catch(() => ({ reports: [] as ApiRadiologyReport[], ecgs: [] })),
          listRadiologyReports().catch(() => [] as ApiRadiologyReport[]),
        ]);
        if (cancelled) return;
        const byId = new Map(consumer.map(c => [c.reportId, c]));
        const mappedConsumer = consumer.map(mapConsumerToReport);
        const mappedReports = reports.map(r => mapApiReportToLocal(r, byId.get(r.reportId)));
        const merged = new Map<string, RadiologyReport>();
        for (const r of [...mappedReports, ...mappedConsumer]) merged.set(r.id, r);
        setApiReports(Array.from(merged.values()));

        const critFromConsumer = consumer.filter(c => c.critical).map(mapConsumerToReport);
        const critFromApi = criticalBundle.reports.map(r => mapApiReportToLocal(r, byId.get(r.reportId)));
        const critMerged = new Map<string, RadiologyReport>();
        for (const r of [...critFromApi, ...critFromConsumer]) critMerged.set(r.id, r);
        setApiCritical(Array.from(critMerged.values()));
      } catch {
        if (!cancelled) {
          setApiReports([]);
          setApiCritical([]);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgApiOn, patientTab, overviewTab]);

  const allRequests = useMemo(
    () => (imgApiOn ? apiRequests.map(mapApiToLocal) : rad.listRequests()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imgApiOn, apiRequests, rad],
  );
  const allReports = useMemo(
    () => (imgApiOn ? apiReports : db.radiologyReports.list()),
    [imgApiOn, apiReports, allRequests.length],
  );
  const criticalReports = useMemo(
    () => (imgApiOn ? apiCritical : rad.criticalFindings()),
    [imgApiOn, apiCritical, allReports.length, rad],
  );

  const completedReportsWithSample = useMemo(() => {
    const released = allReports.filter(r => r.status === 'RELEASED' || r.status === 'VERIFIED');
    if (imgApiOn) return released;
    return released.some(r => r.id === SAMPLE_IMAGING_REPORT.id)
      ? released
      : [SAMPLE_IMAGING_REPORT, ...released];
  }, [allReports, imgApiOn]);

  const ctxToPatient = (ctx: DocPatientContext): ImgPatient => ({
    id: ctx.id, name: ctx.name, hospitalId: ctx.hospitalId, phone: ctx.phone ?? '',
    nin: ctx.nin ?? '', nhiaNo: ctx.nhiaNo ?? '', age: ctx.age ?? 0, gender: ctx.gender ?? 'M',
    clinic: (ctx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
    diagnosis: ctx.diagnosis ?? '—', allergies: ctx.allergies ?? 'None', pregnancy: 'N/A',
    vitals: '—', billingStatus: 'Pending verification', nhiaStatus: ctx.nhiaNo ? `NHIA · ${ctx.nhiaNo}` : '—',
  });

  const enterPatientWorkspace = (p: ImgPatient, tab: PatientTabId = 'new') => {
    setPatient(p);
    setPageMode('patient');
    setPatientTab(tab);
    setForm(f => ({ ...emptyForm(), workingDiagnosis: p.diagnosis, clinicalQuestion: p.diagnosis }));
    setPatientModal(false);
    setPatientSearch('');
  };

  const backToOverview = () => {
    setPageMode('overview');
    toast.info('Hospital-wide imaging queue — search or select a patient to order new imaging');
  };

  useClinicalEmbeddedInit({ embedded, patientContext }, (ctx) => {
    const p = PATIENTS.find(x => x.id === ctx.id || x.hospitalId === ctx.hospitalId || x.name === ctx.name) ?? ctxToPatient(ctx);
    enterPatientWorkspace(p, 'new');
    if (!embedded) toast.success(`Imaging workspace ready for ${p.name}`);
  });

  const matchesSearch = (q: string) => {
    if (!globalSearch.trim()) return true;
    return q.toLowerCase().includes(globalSearch.toLowerCase());
  };

  const patientFromRequest = (r: ImagingRequest): ImgPatient =>
    PATIENTS.find(x => x.hospitalId === r.hospitalId || x.name === r.patientName) ?? {
      id: r.patientId, name: r.patientName, hospitalId: r.hospitalId, phone: '', nin: '', nhiaNo: '',
      age: 0, gender: 'M', clinic: r.clinic === 'GMPC' ? 'GMPC' : 'OPC', diagnosis: r.indication,
      allergies: 'None', pregnancy: 'N/A', vitals: '—', billingStatus: r.paymentStatus, nhiaStatus: '—',
    };

  const filterRequests = (list: ImagingRequest[], tab: OverviewTabId | 'patient_pending') => {
    let out = list.filter(r => matchesSearch(`${r.patientName} ${r.hospitalId} ${r.id} ${r.modality} ${r.region}`));
    switch (tab) {
      case 'pending': case 'patient_pending':
        return out.filter(r => PENDING_STATUSES.includes(r.status as typeof PENDING_STATUSES[number]) || r.status === 'PAID');
      case 'payment': return out.filter(r => PAYMENT_STATUSES.includes(r.status as typeof PAYMENT_STATUSES[number]));
      case 'awaiting_report': return out.filter(r => AWAITING_REPORT_STATUSES.includes(r.status as typeof AWAITING_REPORT_STATUSES[number]));
      case 'rejected': return out.filter(r => r.status === 'REJECTED');
      case 'completed': return out.filter(r => COMPLETED_STATUSES.includes(r.status as typeof COMPLETED_STATUSES[number]));
      default: return out;
    }
  };

  const patientRequests = patient
    ? allRequests.filter(r => r.hospitalId === patient.hospitalId || r.patientName === patient.name)
    : [];

  const patientReports = patient
    ? allReports.filter(r => r.patientId === patient.hospitalId || r.patientName === patient.name)
    : [];

  const patientCompletedReports = useMemo(() => {
    const released = patientReports.filter(r => r.status === 'RELEASED' || r.status === 'VERIFIED');
    if (imgApiOn) return released;
    if (!released.some(r => r.id === SAMPLE_IMAGING_REPORT.id)) {
      return [SAMPLE_IMAGING_REPORT, ...released];
    }
    return released;
  }, [patientReports, imgApiOn]);

  const kpis = useMemo(() => ({
    pending: allRequests.filter(r => [...PENDING_STATUSES, 'PAID'].includes(r.status as string)).length || 4,
    completed: allReports.filter(r => r.status === 'RELEASED').length + 16,
    critical: criticalReports.filter(r => !acknowledgedIds.has(r.id)).length || 1,
    payment: allRequests.filter(r => r.status === 'AWAITING_PAYMENT').length,
    awaiting_report: allRequests.filter(r => AWAITING_REPORT_STATUSES.includes(r.status as typeof AWAITING_REPORT_STATUSES[number])).length,
    rejected: allRequests.filter(r => r.status === 'REJECTED').length,
  }), [allRequests, allReports, criticalReports, acknowledgedIds]);

  const kpiClick = (f: KpiFilter) => {
    setPageMode('overview');
    const map: Record<KpiFilter, OverviewTabId> = {
      pending: 'pending', completed: 'completed', critical: 'critical',
      payment: 'payment', awaiting_report: 'awaiting_report', rejected: 'rejected',
    };
    setOverviewTab(map[f]);
  };

  const applyShortcut = (s: typeof EXAM_SHORTCUTS[0]) => {
    const match = apiStudies.find(
      (x) => x.modality === s.modality && (
        x.name.toLowerCase().includes((s.exam || s.name).split(' ')[0].toLowerCase())
        || (s.region && x.bodyRegion === s.region)
      ),
    ) ?? apiStudies.find((x) => x.modality === s.modality);
    setForm((f) => ({
      ...f,
      modality: s.modality,
      bodyRegion: match?.bodyRegion || s.region,
      examination: match?.name || s.exam || s.name,
      studyId: match ? String(match.imagingStudyId) : '',
      clinicalQuestion: f.clinicalQuestion || patient?.diagnosis || '',
    }));
    toast.success(`${match?.name || s.name} loaded`);
  };

  const studiesForModality = useMemo(
    () => (form.modality ? apiStudies.filter((s) => s.modality === form.modality) : apiStudies),
    [apiStudies, form.modality],
  );

  const selectedStudy = apiStudies.find((s) => String(s.imagingStudyId) === form.studyId);
  const estimatedCost = selectedStudy?.unitPrice
    ?? studiesForModality.find((s) => s.name === form.examination)?.unitPrice
    ?? 0;

  const saveDraft = () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    const draft: ImgDraft = {
      id: `DRF-IMG-${Date.now()}`, patientName: patient.name, hospitalId: patient.hospitalId,
      examination: form.examination || 'In progress', createdBy: doctorName,
      lastSaved: new Date().toLocaleString(), form: { ...form },
    };
    setDrafts(prev => [draft, ...prev]);
    logImgAudit(`Imaging draft saved for ${patient.name}`);
    logTimeline(`Imaging draft saved — ${draft.examination}`, patient);
    notifySuccess(`Draft saved for ${patient.name}`, 'Draft Saved');
  };

  const submitRequest = async () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (!form.modality || !form.bodyRegion || !form.examination) { toast.error('Modality, body region, and examination are required'); return; }
    if (!form.clinicalHistory.trim() || !form.clinicalQuestion.trim()) { toast.error('Clinical history and question are required'); return; }
    if (patient.gender === 'F' && patient.pregnancy === 'Not pregnant' && form.modality === 'CT Scan' && form.pregnancyConfirm === 'N/A') {
      toast.error('Confirm pregnancy status for female patients before CT/MRI');
      return;
    }

    if (imgApiOn) {
      const personId = Number(patient.id);
      if (!Number.isFinite(personId) || personId <= 0) {
        toast.error('Select patient from live search before submitting');
        return;
      }
      const study =
        selectedStudy
        ?? studiesForModality.find((s) => s.name === form.examination)
        ?? studiesForModality[0];
      if (!study) {
        toast.error('No priced imaging study found for this modality — check catalog');
        return;
      }
      setSubmitting(true);
      try {
        const encounterId = patientContext?.encounterId
          ? Number(patientContext.encounterId)
          : undefined;
        const created = await createImagingRequest({
          personId,
          encounterId: Number.isFinite(encounterId) && (encounterId as number) > 0
            ? (encounterId as number)
            : undefined,
          priority: form.priority === 'Emergency' ? 'Emergency' : form.priority === 'Urgent' ? 'Urgent' : 'Routine',
          clinicalIndication: form.clinicalQuestion.trim(),
          clinicalNotes: [
            form.clinicalHistory,
            form.doctorNote && `Note: ${form.doctorNote}`,
            form.contrast !== 'No' && `Contrast: ${form.contrast}`,
            form.sedation === 'Yes' && 'Sedation required',
            form.infectionRisk && 'Infection risk flagged',
          ].filter(Boolean).join('\n'),
          contrast: form.contrast,
          source: 'Doctor',
          items: [{ studyId: study.imagingStudyId }],
        });
        setApiRequests((prev) => [created, ...prev.filter((r) => r.imagingRequestId !== created.imagingRequestId)]);
        logImgAudit(`Imaging request ${created.requestNo} submitted for ${patient.name}`);
        logTimeline(`Imaging request submitted — ${study.name} (Unpaid)`, patient);
        setForm(emptyForm());
        setSubmitModal(false);
        setPatientTab('pending');
        notifySuccess(
          `${created.requestNo} submitted · ₦${created.totalAmount.toLocaleString()} Unpaid — cashier collects`,
          'Imaging Requested',
        );
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not submit imaging request');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const req = rad.createImagingRequest({
      patientId: patient.hospitalId,
      modality: form.modality as RadModality,
      region: `${form.bodyRegion} — ${form.examination}`,
      indication: form.clinicalQuestion,
      priority: mapPriority(form.priority),
      requestedBy: doctorName,
      clinic: patient.clinic,
      clinicalNotes: [
        form.clinicalHistory,
        form.doctorNote && `Note: ${form.doctorNote}`,
        form.contrast !== 'No' && `Contrast: ${form.contrast}`,
        form.sedation === 'Yes' && 'Sedation required',
        form.infectionRisk && 'Infection risk flagged',
      ].filter(Boolean).join('\n'),
    });

    logImgAudit(`Imaging request ${req.id} submitted for ${patient.name}`);
    logTimeline(`Imaging request submitted — ${form.examination}`, patient);
    setForm(emptyForm());
    setSubmitModal(false);
    setPatientTab('pending');
    notifySuccess('Imaging request submitted (awaiting cashier payment).', 'Request Submitted');
  };

  const repeatRequest = (r: ImagingRequest) => {
    enterPatientWorkspace(patientFromRequest(r), 'new');
    setForm((f) => ({
      ...emptyForm(),
      modality: r.modality,
      bodyRegion: r.region.split(' — ')[0] ?? r.region,
      examination: r.region.split(' — ')[1] ?? r.region,
      clinicalQuestion: r.indication,
      clinicalHistory: r.clinicalNotes ?? '',
      workingDiagnosis: patient?.diagnosis ?? r.indication,
    }));
    toast.success('Previous imaging copied to New Request');
  };

  const submitChecklist = [
    ['Patient selected', !!patient],
    ['Modality selected', !!form.modality],
    ['Body region entered', !!form.bodyRegion],
    ['Examination / study selected', !!form.examination || !!form.studyId],
    ['Clinical history entered', !!form.clinicalHistory.trim()],
    ['Clinical question entered', !!form.clinicalQuestion.trim()],
    ['Priority selected', !!form.priority],
    ['Pregnancy checked (if applicable)', patient?.gender !== 'F' || form.pregnancyConfirm !== 'N/A' || !['CT Scan', 'MRI'].includes(form.modality as string)],
  ];

  const selectPatient = (p: ImgPatient) => {
    enterPatientWorkspace(p, patientModalMode === 'new' ? 'new' : 'pending');
    if (patientModalMode === 'new') setForm({ ...emptyForm(), workingDiagnosis: p.diagnosis, clinicalQuestion: p.diagnosis });
    toast.success(patientModalMode === 'new' ? `New imaging request for ${p.name}` : `Patient workspace: ${p.name}`);
  };

  const patientResults = PATIENTS.filter(p =>
    !patientSearch || `${p.name} ${p.hospitalId} ${p.phone} ${p.nin} ${p.nhiaNo}`.toLowerCase().includes(patientSearch.toLowerCase()),
  );

  const sortedShortcuts = useMemo(() => {
    if (patient?.clinic === 'OPC') return [...EXAM_SHORTCUTS].sort((a, b) => {
      const opc = ['EEG', 'ECG', 'CT Scan', 'MRI'];
      return (opc.includes(b.modality) ? 1 : 0) - (opc.includes(a.modality) ? 1 : 0);
    });
    return EXAM_SHORTCUTS;
  }, [patient?.clinic]);

  const renderRequestTable = (rows: ImagingRequest[], emptyMsg: string) => (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Request No.', 'Patient', 'Hospital No.', 'Examination', 'Modality', 'Requested By', 'Date', 'Priority', 'Billing', 'Status', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2 font-medium">{r.patientName}</td>
              <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
              <td className="px-3 py-2 text-xs">{r.region}</td>
              <td className="px-3 py-2">{r.modality}</td>
              <td className="px-3 py-2">{r.requestedBy}</td>
              <td className="px-3 py-2 text-xs">{r.createdAt.slice(0, 16)}</td>
              <td className="px-3 py-2"><StatusPill tone={r.priority !== 'ROUTINE' ? 'red' : 'blue'}>{r.priority}</StatusPill></td>
              <td className="px-3 py-2 text-xs">{r.paymentStatus}</td>
              <td className="px-3 py-2"><StatusPill tone="amber">{STATUS_LABEL[r.status] ?? r.status}</StatusPill></td>
              <td className="px-3 py-2">
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setViewRequest(r)}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => enterPatientWorkspace(patientFromRequest(r), 'pending')}><UserPlus className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)}><Clock className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setPrintRequest(r)}><Printer className="h-3 w-3" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </Card>
  );

  const renderReportTable = (rows: RadiologyReport[], emptyMsg: string) => (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{['Report No.', 'Patient', 'Examination', 'Modality', 'Report Date', 'Radiologist', 'Critical', 'Status', 'Actions'].map(h =>
            <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.filter(r => matchesSearch(`${r.patientName} ${r.id} ${r.modality}`)).map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2">{r.patientName}</td>
              <td className="px-3 py-2 text-xs">{r.technique ?? r.modality}</td>
              <td className="px-3 py-2">{r.modality}</td>
              <td className="px-3 py-2 text-xs">{r.createdAt?.slice(0, 16) ?? '—'}</td>
              <td className="px-3 py-2">{r.reportedBy}</td>
              <td className="px-3 py-2">{r.critical ? <StatusPill tone="red">Critical</StatusPill> : '—'}</td>
              <td className="px-3 py-2"><StatusPill tone="green">{r.status}</StatusPill></td>
              <td className="px-3 py-2">
                <Button size="sm" variant="ghost" onClick={() => setViewReport(r)}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setViewReport(r); setPacsOpen(true); }}><Monitor className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => toast.success('Printing…')}><Printer className="h-3 w-3" /></Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </Card>
  );

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Imaging Request Engine"
      flowTitle="Imaging Request Engine"
      flowSubtitle="Order radiology investigations and track reports"
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Imaging Requests</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Request radiology, ECG, ultrasound and other imaging investigations, then track reports from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pageMode === 'patient' && (
            <Button variant="outline" size="sm" onClick={backToOverview}><ArrowLeft className="h-4 w-4 mr-1" />All Patients</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setPatientModalMode('workspace'); setPatientModal(true); }}><Search className="h-4 w-4 mr-1" />Search Patient</Button>
          <Button size="sm" onClick={() => { setPatientModalMode('new'); setPatientModal(true); }}><Plus className="h-4 w-4 mr-1" />New Imaging Request</Button>
          {pageMode === 'overview' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setOverviewTab('pending')}><Clock className="h-4 w-4 mr-1" />Pending Requests</Button>
              <Button variant="outline" size="sm" onClick={() => setOverviewTab('completed')}><Eye className="h-4 w-4 mr-1" />Completed Reports</Button>
              <Button variant="outline" size="sm" onClick={() => toast.success('Reports exported to PDF')}><Download className="h-4 w-4 mr-1" />Export Reports</Button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ['pending', 'Pending Imaging', kpis.pending, 'Awaiting radiology', Clock, 'amber'],
          ['completed', 'Completed Imaging', kpis.completed, 'Today', CheckCircle2, 'green'],
          ['critical', 'Critical Findings', kpis.critical, 'Action required', AlertTriangle, 'rose'],
          ['payment', 'Awaiting Payment', kpis.payment, 'Not yet paid', CreditCard, 'purple'],
          ['awaiting_report', 'Awaiting Report', kpis.awaiting_report, 'Scan done', Eye, 'blue'],
          ['rejected', 'Rejected Requests', kpis.rejected, 'Returned by radiology', XCircle, 'rose'],
        ] as const).map(([key, title, val, sub, Icon, t]) => (
          <button key={key} type="button" onClick={() => kpiClick(key as KpiFilter)} className="text-left">
            <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t} />
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW ========== */}
      {pageMode === 'overview' && (
        <>
          <Card className="mb-4 p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="Search all patients, hospital no., request no., modality…" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="h-9" />
            </div>
            <p className="text-xs text-muted-foreground">Hospital-wide imaging queue — review pending scans and reports without selecting a patient.</p>
            <Button size="sm" onClick={() => { setPatientModalMode('new'); setPatientModal(true); }}><Plus className="h-4 w-4 mr-1" />Order Imaging for Patient</Button>
          </Card>

          <Tabs value={overviewTab} onValueChange={v => setOverviewTab(v as OverviewTabId)}>
            <TabsList className="flex flex-wrap h-auto mb-4">
              {([
                ['all', 'All'], ['pending', 'Pending'], ['completed', 'Completed Reports'],
                ['critical', 'Critical Findings'], ['payment', 'Awaiting Payment'],
                ['awaiting_report', 'Awaiting Report'], ['rejected', 'Rejected'],
              ] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              {renderRequestTable(filterRequests(allRequests, 'all'), 'No imaging requests found.')}
              {allReports.filter(r => r.status === 'RELEASED').length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-sm mb-2">Recent Released Reports</h3>
                  {renderReportTable(allReports.filter(r => r.status === 'RELEASED').slice(0, 10), '')}
                </div>
              )}
            </TabsContent>
            <TabsContent value="pending">{renderRequestTable(filterRequests(allRequests, 'pending'), 'No pending imaging requests.')}</TabsContent>
            <TabsContent value="completed">
              <Card className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">Sample Imaging Report</h3>
                    <p className="text-xs text-muted-foreground">Standard HMS radiology report — CT Brain for Tope Adeyemi</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewReport(SAMPLE_IMAGING_REPORT)}><Eye className="h-3.5 w-3.5 mr-1" />Full View</Button>
                    <Button size="sm" variant="outline" onClick={() => { setViewReport(SAMPLE_IMAGING_REPORT); setPacsOpen(true); }}><Monitor className="h-3.5 w-3.5 mr-1" />PACS</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Printing sample report…')}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
                  </div>
                </div>
                <StandardImagingReportView report={SAMPLE_IMAGING_REPORT} meta={SAMPLE_IMAGING_META} />
              </Card>
              {renderReportTable(completedReportsWithSample, 'No other completed reports yet.')}
            </TabsContent>
            <TabsContent value="critical">
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Examination', 'Critical Finding', 'Report Time', 'Reported By', 'Ack', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {criticalReports.filter(r => matchesSearch(r.patientName)).map(r => (
                      <tr key={r.id} className={!acknowledgedIds.has(r.id) ? 'bg-rose-50/50' : ''}>
                        <td className="px-3 py-2 font-medium">{r.patientName}</td>
                        <td className="px-3 py-2">{r.modality}</td>
                        <td className="px-3 py-2 text-rose-700 text-xs">{r.criticalFinding ?? r.impression}</td>
                        <td className="px-3 py-2 text-xs">{r.createdAt?.slice(0, 16)}</td>
                        <td className="px-3 py-2">{r.reportedBy}</td>
                        <td className="px-3 py-2"><StatusPill tone={acknowledgedIds.has(r.id) ? 'green' : 'red'}>{acknowledgedIds.has(r.id) ? 'Acknowledged' : 'Pending'}</StatusPill></td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => setAckCritical(r)}>Acknowledge</Button>
                          <Button size="sm" variant="ghost" onClick={() => setViewReport(r)}><Eye className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </TabsContent>
            <TabsContent value="payment">{renderRequestTable(filterRequests(allRequests, 'payment'), 'No requests awaiting payment.')}</TabsContent>
            <TabsContent value="awaiting_report">{renderRequestTable(filterRequests(allRequests, 'awaiting_report'), 'No scans awaiting report.')}</TabsContent>
            <TabsContent value="rejected">
              {renderRequestTable(filterRequests(allRequests, 'rejected'), 'No rejected requests.')}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ========== PATIENT WORKSPACE ========== */}
      {pageMode === 'patient' && patient && (
        <>
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-semibold">{patient.name}</div><div className="text-xs font-mono">{patient.hospitalId}</div></div>
              <div><div className="text-xs text-muted-foreground">Age / Gender</div><div>{patient.age} / {patient.gender}</div><StatusPill tone={patient.clinic === 'OPC' ? 'purple' : 'blue'}>{patient.clinic}</StatusPill></div>
              <div><div className="text-xs text-muted-foreground">Diagnosis</div><div>{patient.diagnosis}</div></div>
              <div><div className="text-xs text-muted-foreground">Allergies</div><div className="text-rose-700 font-medium">{patient.allergies}</div></div>
              <div><div className="text-xs text-muted-foreground">Pregnancy</div><div>{patient.pregnancy}</div></div>
              <div><div className="text-xs text-muted-foreground">Vitals</div><div className="text-xs">{patient.vitals}</div></div>
              <div><div className="text-xs text-muted-foreground">Billing</div><div>{patient.billingStatus}</div></div>
              <div><div className="text-xs text-muted-foreground">NHIA / HMO</div><div>{patient.nhiaStatus}</div></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => toast.info('Opening EMR…')}><FileText className="h-3.5 w-3.5 mr-1" />Open EMR</Button>
              <Button size="sm" variant="outline" onClick={() => setPatientTab('previous')}><History className="h-3.5 w-3.5 mr-1" />Previous Imaging</Button>
              <Button size="sm" variant="outline" onClick={() => setPatientTab('completed')}><Eye className="h-3.5 w-3.5 mr-1" />View Results</Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`${base}/diagnosis`)}><Stethoscope className="h-3.5 w-3.5 mr-1" />Diagnosis</Button>
              <Button size="sm" variant="outline" onClick={() => toast.info('Payment is collected by Cashier after submit')}>
                <CreditCard className="h-3.5 w-3.5 mr-1" />Cashier pays
              </Button>
              <Button size="sm" variant="ghost" onClick={backToOverview}><ArrowLeft className="h-3.5 w-3.5 mr-1" />Back to All</Button>
            </div>
          </Card>

          <Tabs value={patientTab} onValueChange={v => setPatientTab(v as PatientTabId)}>
            <TabsList className="flex flex-wrap h-auto mb-4">
              {([
                ['new', 'New Request'], ['pending', 'Pending'], ['completed', 'Completed Reports'],
                ['critical', 'Critical Findings'], ['payment', 'Awaiting Payment'],
                ['awaiting_report', 'Awaiting Report'], ['rejected', 'Rejected'], ['previous', 'Previous Imaging'],
              ] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>

            {/* NEW REQUEST */}
            <TabsContent value="new">
              <div className="grid lg:grid-cols-12 gap-4 pb-20 lg:pb-0">
                <div className="lg:col-span-8 space-y-4">
                  <Card>
                    <h3 className="font-semibold text-sm mb-3">Common Examination Shortcuts</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {sortedShortcuts.map(s => (
                        <button key={s.name} type="button" onClick={() => applyShortcut(s)}
                          className="p-2.5 border rounded-lg text-left text-xs hover:bg-muted/50 hover:border-primary/40 transition-colors">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-muted-foreground mt-0.5">{s.modality}</div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <h3 className="font-semibold mb-3">Imaging Request Form</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div><Label className="text-xs">Patient</Label><Input value={patient.name} readOnly className="h-9 bg-muted/40" /></div>
                      <div><Label className="text-xs">Requesting Doctor</Label><Input value={doctorName} readOnly className="h-9 bg-muted/40" /></div>
                      <div><Label className="text-xs">Clinic / Department</Label><Input value={patient.clinic} readOnly className="h-9 bg-muted/40" /></div>
                      <div><Label className="text-xs">Encounter</Label><Input value={form.encounter} onChange={e => setForm(f => ({ ...f, encounter: e.target.value }))} placeholder="ENC-2026-…" className="h-9" /></div>
                      <div><Label className="text-xs">Modality *</Label>
                        <Select value={form.modality} onValueChange={v => setForm(f => ({ ...f, modality: v as RadModality }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select modality" /></SelectTrigger>
                          <SelectContent>{MODALITIES.map(m => <SelectItem key={m.label} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Body Region *</Label>
                        <Select value={form.bodyRegion} onValueChange={v => setForm(f => ({ ...f, bodyRegion: v }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select region" /></SelectTrigger>
                          <SelectContent>{BODY_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2"><Label className="text-xs">Examination / Study *</Label>
                        {imgApiOn && studiesForModality.length > 0 ? (
                          <Select
                            value={form.studyId}
                            onValueChange={(v) => {
                              const s = apiStudies.find((x) => String(x.imagingStudyId) === v);
                              setForm((f) => ({
                                ...f,
                                studyId: v,
                                examination: s?.name || f.examination,
                                modality: (s?.modality as RadModality) || f.modality,
                                bodyRegion: s?.bodyRegion || f.bodyRegion,
                              }));
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select priced study" /></SelectTrigger>
                            <SelectContent>
                              {studiesForModality.map((s) => (
                                <SelectItem key={s.imagingStudyId} value={String(s.imagingStudyId)}>
                                  {s.name} · ₦{s.unitPrice.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={form.examination} onChange={(e) => setForm((f) => ({ ...f, examination: e.target.value }))} placeholder="e.g. CT Brain Plain" className="h-9" />
                        )}
                      </div>
                      <div className="sm:col-span-2 text-xs p-2 rounded border bg-sky-50 border-sky-200 text-sky-900">
                        Payment is handled by Cashier from the priced study catalog. Doctors do not set billing type.
                      </div>
                      <div className="sm:col-span-2"><Label className="text-xs">Clinical History *</Label><Textarea value={form.clinicalHistory} onChange={e => setForm(f => ({ ...f, clinicalHistory: e.target.value }))} rows={2} /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Clinical Question / Indication *</Label><Textarea value={form.clinicalQuestion} onChange={e => setForm(f => ({ ...f, clinicalQuestion: e.target.value }))} rows={2} /></div>
                      <div><Label className="text-xs">Working Diagnosis</Label><Input value={form.workingDiagnosis} onChange={e => setForm(f => ({ ...f, workingDiagnosis: e.target.value }))} className="h-9" /></div>
                      <div><Label className="text-xs">Priority</Label>
                        <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as FormPriority }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Routine', 'Urgent', 'Emergency'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {patient.gender === 'F' && (
                        <div><Label className="text-xs">Pregnancy Status</Label>
                          <Select value={form.pregnancyConfirm} onValueChange={v => setForm(f => ({ ...f, pregnancyConfirm: v }))}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{['N/A', 'Not pregnant', 'Pregnant', 'Unknown'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      <div><Label className="text-xs">Contrast Required</Label>
                        <Select value={form.contrast} onValueChange={v => setForm(f => ({ ...f, contrast: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Yes', 'No', 'Radiologist to decide'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Mobility</Label>
                        <Select value={form.mobility} onValueChange={v => setForm(f => ({ ...f, mobility: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Ambulatory', 'Wheelchair', 'Bedridden'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Sedation Required</Label>
                        <Select value={form.sedation} onValueChange={v => setForm(f => ({ ...f, sedation: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Previous Imaging Available</Label>
                        <Select value={form.previousImaging} onValueChange={v => setForm(f => ({ ...f, previousImaging: v }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Preferred Date/Time</Label><Input type="datetime-local" value={form.preferredDateTime} onChange={e => setForm(f => ({ ...f, preferredDateTime: e.target.value }))} className="h-9" /></div>
                      <div className="sm:col-span-2 flex items-center gap-2 p-2 border rounded-lg">
                        <Switch checked={form.infectionRisk} onCheckedChange={v => setForm(f => ({ ...f, infectionRisk: v }))} />
                        <Label className="text-xs">Infection risk flag</Label>
                      </div>
                      <div className="sm:col-span-2"><Label className="text-xs">Doctor Note to Radiology</Label><Textarea value={form.doctorNote} onChange={e => setForm(f => ({ ...f, doctorNote: e.target.value }))} rows={2} /></div>
                    </div>
                  </Card>
                </div>

                {/* Preview panel */}
                <div className="lg:col-span-4">
                  <Card className="sticky top-20">
                    <h3 className="font-semibold text-sm mb-3">Request Preview</h3>
                    <div className="border rounded-lg p-3 text-sm space-y-2 bg-muted/20">
                      <div><span className="text-xs text-muted-foreground">Patient</span><div className="font-medium">{patient.name}</div></div>
                      <div><span className="text-xs text-muted-foreground">Examination</span><div>{form.examination || '—'}</div></div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><b>Modality:</b> {form.modality || '—'}</div>
                        <div><b>Region:</b> {form.bodyRegion || '—'}</div>
                        <div><b>Priority:</b> {form.priority}</div>
                        <div><b>Payment:</b> Cashier (Unpaid invoice)</div>
                      </div>
                      <div className="text-xs"><b>Indication:</b> {form.clinicalQuestion || '—'}</div>
                      <div className="text-xs"><b>Catalog price:</b> ₦{estimatedCost.toLocaleString()}</div>
                      <StatusPill tone="blue">Draft</StatusPill>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Button className="w-full" size="sm" disabled={submitting} onClick={() => setSubmitModal(true)}>
                        {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                        Submit Request
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={saveDraft}><FileText className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                        <Button variant="outline" size="sm" onClick={() => { setForm(emptyForm()); toast.info('Form cleared'); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Clear</Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t lg:hidden flex gap-2 z-40">
                <Button className="flex-1" size="sm" onClick={() => setSubmitModal(true)}><Send className="h-4 w-4 mr-1" />Submit Request</Button>
              </div>
            </TabsContent>

            <TabsContent value="pending">{renderRequestTable(patientRequests.filter(r => PENDING_STATUSES.includes(r.status as typeof PENDING_STATUSES[number]) || r.status === 'PAID'), 'No pending requests for this patient.')}</TabsContent>
            <TabsContent value="completed">
              <Card className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">Sample Imaging Report</h3>
                    <p className="text-xs text-muted-foreground">Standard HMS radiology report format — verified & released</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewReport(SAMPLE_IMAGING_REPORT)}><Eye className="h-3.5 w-3.5 mr-1" />Expand</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Exported to PDF')}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
                  </div>
                </div>
                <StandardImagingReportView report={SAMPLE_IMAGING_REPORT} meta={SAMPLE_IMAGING_META} />
              </Card>
              {renderReportTable(patientCompletedReports, 'No other completed reports for this patient.')}
            </TabsContent>
            <TabsContent value="critical">
              {renderReportTable(patientReports.filter(r => r.critical), 'No critical findings for this patient.')}
            </TabsContent>
            <TabsContent value="payment">{renderRequestTable(patientRequests.filter(r => r.status === 'AWAITING_PAYMENT'), 'No payment-pending requests.')}</TabsContent>
            <TabsContent value="awaiting_report">{renderRequestTable(patientRequests.filter(r => AWAITING_REPORT_STATUSES.includes(r.status as typeof AWAITING_REPORT_STATUSES[number])), 'No scans awaiting report.')}</TabsContent>
            <TabsContent value="rejected">{renderRequestTable(patientRequests.filter(r => r.status === 'REJECTED'), 'No rejected requests.')}</TabsContent>
            <TabsContent value="previous">
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Date', 'Examination', 'Modality', 'Findings', 'Impression', 'Requested By', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {patientReports.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-xs">{r.createdAt?.slice(0, 10) ?? '—'}</td>
                        <td className="px-3 py-2">{r.technique ?? r.modality}</td>
                        <td className="px-3 py-2">{r.modality}</td>
                        <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.findings}</td>
                        <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.impression}</td>
                        <td className="px-3 py-2">{r.reportedBy}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="ghost" onClick={() => setViewReport(r)}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { const req = patientRequests.find(x => x.id === r.requestId); if (req) repeatRequest(req); else toast.info('Repeat from report'); }}><RefreshCw className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setViewReport(r); setPacsOpen(true); }}><Monitor className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    ))}
                    {patientReports.length === 0 && patientRequests.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-xs">{r.createdAt.slice(0, 10)}</td>
                        <td className="px-3 py-2">{r.region}</td>
                        <td className="px-3 py-2">{r.modality}</td>
                        <td className="px-3 py-2 text-xs">—</td>
                        <td className="px-3 py-2 text-xs">{STATUS_LABEL[r.status]}</td>
                        <td className="px-3 py-2">{r.requestedBy}</td>
                        <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => repeatRequest(r)}><RefreshCw className="h-3 w-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Patient modal */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{patientModalMode === 'new' ? 'New Imaging Request — Select Patient' : 'Search Patient'}</DialogTitle>
            <DialogDescription>Search by name, hospital number, phone, NHIA, or NIN</DialogDescription>
          </DialogHeader>
          <Input className="mb-2" placeholder="Search…" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} autoFocus />
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {patientResults.map(p => (
              <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.clinic} · {p.phone}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <Dialog open={submitModal} onOpenChange={setSubmitModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Imaging Request</DialogTitle><DialogDescription>Pre-submission checklist</DialogDescription></DialogHeader>
          <ul className="text-sm space-y-2">
            {submitChecklist.map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-2">
                {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs border rounded p-2 bg-muted/20">
            <b>{form.examination}</b> · {form.modality} · ₦{estimatedCost.toLocaleString()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { saveDraft(); setSubmitModal(false); }}>Save Draft</Button>
            <Button disabled={submitting || submitChecklist.some(([, ok]) => !ok)} onClick={() => void submitRequest()}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Submit to Radiology
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View request */}
      <Dialog open={!!viewRequest} onOpenChange={v => !v && setViewRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Imaging Request — {viewRequest?.id}</DialogTitle></DialogHeader>
          {viewRequest && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded text-sm">
              <div><b>Patient:</b> {viewRequest.patientName}</div>
              <div><b>Hospital No:</b> {viewRequest.hospitalId}</div>
              <div><b>Modality:</b> {viewRequest.modality}</div>
              <div><b>Region:</b> {viewRequest.region}</div>
              <div><b>Priority:</b> {viewRequest.priority}</div>
              <div><b>Status:</b> {STATUS_LABEL[viewRequest.status]}</div>
              <div><b>Payment:</b> {viewRequest.paymentStatus} · ₦{viewRequest.amount.toLocaleString()}</div>
              <div><b>Requested:</b> {viewRequest.createdAt.slice(0, 16)}</div>
              <div className="col-span-2"><b>Indication:</b> {viewRequest.indication}</div>
              {viewRequest.clinicalNotes && <div className="col-span-2"><b>Notes:</b> {viewRequest.clinicalNotes}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRequest(null)}>Close</Button>
            {viewRequest && <Button variant="outline" onClick={() => { repeatRequest(viewRequest); setViewRequest(null); }}>Repeat Request</Button>}
            <Button variant="outline" onClick={() => toast.success('Message sent to radiology')}><MessageSquare className="h-4 w-4 mr-1" />Message Radiology</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track status */}
      <Dialog open={!!trackRequest} onOpenChange={v => !v && setTrackRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Track Status — {trackRequest?.id}</DialogTitle></DialogHeader>
          {trackRequest && (
            <div className="space-y-2">
              {TRACK_STEPS.map((step, i) => {
                const statuses = ['REQUESTED', 'PAID', 'SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'REPORT_PENDING', 'VERIFIED', 'RELEASED'];
                const idx = statuses.indexOf(trackRequest.status);
                const done = i <= Math.max(0, idx);
                return (
                  <div key={step} className={`flex items-center gap-3 p-2 rounded border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/20'}`}>
                    {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">{step}</span>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><Button onClick={() => setTrackRequest(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print */}
      <Dialog open={!!printRequest} onOpenChange={v => !v && setPrintRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Imaging Request — Print Preview</DialogTitle></DialogHeader>
          {printRequest && (
            <div className="border rounded-lg p-6 text-sm space-y-3 bg-white text-black">
              <div className="text-center border-b pb-2">
                <div className="font-bold">Federal Neuro-Psychiatric Hospital, Aro</div>
                <div className="text-xs">Radiology / Imaging Request Form</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><b>Request No:</b> {printRequest.id}</div>
                <div><b>Date:</b> {printRequest.createdAt.slice(0, 16)}</div>
                <div><b>Patient:</b> {printRequest.patientName}</div>
                <div><b>Hospital No:</b> {printRequest.hospitalId}</div>
                <div><b>Modality:</b> {printRequest.modality}</div>
                <div><b>Priority:</b> {printRequest.priority}</div>
                <div className="col-span-2"><b>Examination:</b> {printRequest.region}</div>
                <div className="col-span-2"><b>Indication:</b> {printRequest.indication}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRequest(null)}>Close</Button>
            <Button onClick={() => { window.print(); toast.success('Sent to printer'); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report drawer */}
      <Sheet open={!!viewReport} onOpenChange={v => !v && setViewReport(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Imaging Report — {viewReport?.id}</SheetTitle>
            <SheetDescription>{viewReport?.patientName} · {viewReport?.modality}</SheetDescription>
          </SheetHeader>
          {viewReport && (
            <div className="mt-4 space-y-4">
              <StandardImagingReportView report={viewReport} meta={getReportMeta(viewReport, patient)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPacsOpen(true)}><Monitor className="h-3.5 w-3.5 mr-1" />View PACS</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Printing…')}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Exported to PDF')}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`${base}/documentation`)}><FileText className="h-3.5 w-3.5 mr-1" />Add to Note</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* PACS placeholder */}
      <Dialog open={pacsOpen} onOpenChange={setPacsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>PACS Viewer — {viewReport?.modality ?? 'Imaging'}</DialogTitle><DialogDescription>DICOM viewer placeholder — study images and measurement tools</DialogDescription></DialogHeader>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 bg-black rounded-lg flex items-center justify-center text-white/60 text-sm">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-40" />
                Study images · Zoom / Pan · Measurements
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="font-semibold">Series List</div>
              {['Series 1 — Axial', 'Series 2 — Coronal', 'Series 3 — Sagittal'].map(s => (
                <div key={s} className="p-2 border rounded hover:bg-muted/50 cursor-pointer">{s}</div>
              ))}
              {viewReport && (
                <div className="mt-3 p-2 bg-muted/30 rounded border">
                  <div className="font-semibold mb-1">Report Panel</div>
                  <p>{viewReport.impression}</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setPacsOpen(false)}>Close Viewer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledge critical */}
      <Dialog open={!!ackCritical} onOpenChange={v => !v && setAckCritical(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge Critical Finding</DialogTitle></DialogHeader>
          {ackCritical && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm">
                <div className="font-semibold">{ackCritical.modality} — {ackCritical.patientName}</div>
                <p className="text-rose-800 mt-1 text-xs">{ackCritical.criticalFinding ?? ackCritical.impression}</p>
              </div>
              <div><Label>Clinical action taken *</Label><Textarea value={ackAction} onChange={e => setAckAction(e.target.value)} rows={2} /></div>
              <div><Label>Follow-up plan</Label><Textarea value={ackFollowUp} onChange={e => setAckFollowUp(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckCritical(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!ackAction.trim()) { toast.error('Clinical action is required'); return; }
              if (ackCritical) setAcknowledgedIds(prev => new Set(prev).add(ackCritical.id));
              logImgAudit(`Critical imaging finding acknowledged: ${ackCritical?.id}`);
              notifySuccess('Critical finding acknowledged', 'Acknowledged');
              setAckCritical(null); setAckAction(''); setAckFollowUp('');
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejected reason */}
      <Dialog open={!!viewRejected} onOpenChange={v => !v && setViewRejected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejection Reason — {viewRejected?.id}</DialogTitle></DialogHeader>
          {viewRejected && (
            <div className="space-y-2 text-sm">
              <p><b>Patient:</b> {viewRejected.patientName}</p>
              <p><b>Examination:</b> {viewRejected.region}</p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs">
                {viewRejected.audit.find(a => a.action === 'Rejected')?.note ?? 'Request rejected by radiology — contact department for details.'}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRejected(null)}>Close</Button>
            <Button onClick={() => { if (viewRejected) repeatRequest(viewRejected); setViewRejected(null); }}>Edit & Resubmit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClinicalPageShell>
  );
};
