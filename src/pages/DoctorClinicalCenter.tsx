import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useApplyDocPatient, useDocClinicalPatient, patientDisplayLabel, patientMatches, entryTypeToNoteType,
} from '@/utils/docClinicalPatientContext';
import DashboardLayout from '@/components/DashboardLayout';
import { InpatientWardBoard } from '@/components/inpatient/InpatientDemoPanels';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import {
  emptyDoctorOverviewKpis,
  emptyDoctorOverviewTabHints,
  type DoctorOverviewKpis,
  type DoctorOverviewQueueItem,
  type DoctorOverviewTabHints,
} from '@/lib/api/doctorOverview';
import { localDoctorOverview } from '@/lib/demo/consultationLocal';
import {
  LayoutDashboard, Stethoscope, Siren, BedDouble, Users, FileText, ClipboardList,
  Pill, FlaskConical, ScanLine, ArrowRightLeft, Activity, Sparkles, BookOpen,
  ScrollText, Save, Plus, CheckCircle2, AlertTriangle, Clock, Search, Mic, Send,
  Eye, RefreshCw, UserPlus, LogOut, Printer, History, Trash2, Smartphone, Plug,
  Loader2,
} from 'lucide-react';

// ---- Global Success Popup (modal + toast) ----
const SUCCESS_EVT = 'doc-clinical-success';
type SuccessPayload = { title: string; message: string };
export const notifySuccess = (message: string, title = 'Success') => {
  toast.success(message);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SuccessPayload>(SUCCESS_EVT, { detail: { title, message } }));
  }
};
const SuccessPopup = () => {
  const [data, setData] = useState<SuccessPayload | null>(null);
  useEffect(() => {
    const h = (e: Event) => setData((e as CustomEvent<SuccessPayload>).detail);
    window.addEventListener(SUCCESS_EVT, h);
    return () => window.removeEventListener(SUCCESS_EVT, h);
  }, []);
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && setData(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogTitle className="text-center text-xl">{data?.title}</DialogTitle>
          <DialogDescription className="text-center text-base text-foreground/80 pt-1">
            {data?.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => setData(null)} className="min-w-[120px]">OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const base = '/dashboard/doctor/clinical';

import {
  CalendarDays, CalendarClock, ListChecks, MessageSquare, ShieldCheck, FileSignature,
  Video, Bell, FlaskRound, BarChart3, UserCog,
} from 'lucide-react';

export const doctorClinicalNav = [
  { label: 'Overview', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Mode Switcher (GMPC/OPC)', path: `${base}/modes`, icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Consultation Workspace', path: `${base}/workspace`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Clinical Documentation', path: `${base}/documentation`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Doctor Note Timeline', path: `${base}/timeline`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Prescription Engine', path: `${base}/prescriptions`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Lab Request Engine', path: `${base}/lab`, icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Imaging Requests', path: `${base}/imaging`, icon: <ScanLine className="h-4 w-4" /> },
  { label: 'Admission Requests', path: `${base}/admission`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Referral Workflow', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Patient Transfers', path: `${base}/transfers`, icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Active Patient Board', path: `${base}/active`, icon: <Users className="h-4 w-4" /> },
  { label: 'AI Clinical Assistant', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Diagnosis (ICD-11/DSM)', path: `${base}/diagnosis`, icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Ward Round System', path: `${base}/ward-round`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Results Viewer', path: `${base}/results`, icon: <Eye className="h-4 w-4" /> },
  { label: 'Discharge Drafts', path: `${base}/discharge`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Emergency Override', path: `${base}/emergency`, icon: <Siren className="h-4 w-4" /> },
  { label: 'Cross-Department', path: `${base}/cross-dept`, icon: <Plug className="h-4 w-4" /> },
  { label: 'Real-Time Sync', path: `${base}/sync`, icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Mobile / Bedside', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Audit & Compliance', path: `${base}/audit`, icon: <ScrollText className="h-4 w-4" /> },
  // Extended modules
  { label: 'Patient Directory', path: `${base}/patients`, icon: <Search className="h-4 w-4" /> },
  { label: 'My Schedule', path: `${base}/schedule`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Appointment Management', path: `${base}/appointments`, icon: <CalendarClock className="h-4 w-4" /> },
  { label: 'Tasks & Work Queue', path: `${base}/tasks`, icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Clinical Decision Support', path: `${base}/cds`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Certificates & Reports', path: `${base}/certificates`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Telemedicine', path: `${base}/telemedicine`, icon: <Video className="h-4 w-4" /> },
  { label: 'Notifications Center', path: `${base}/notifications`, icon: <Bell className="h-4 w-4" /> },
  { label: 'Research & Clinical Audit', path: `${base}/research`, icon: <FlaskRound className="h-4 w-4" /> },
  { label: 'Reports & Analytics', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'My Profile', path: `${base}/profile`, icon: <UserCog className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title={`Doctor Clinical · ${title}`}>
    {children}
    <SuccessPopup />
  </DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};
const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

// ============ 1. CLINICAL WORKSTATION OVERVIEW ============
export const DocOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DoctorOverviewKpis>(emptyDoctorOverviewKpis);
  const [queue, setQueue] = useState<DoctorOverviewQueueItem[]>([]);
  const [tabHints, setTabHints] = useState<DoctorOverviewTabHints>(emptyDoctorOverviewTabHints);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = localDoctorOverview();
      setKpis(data.kpis);
      setQueue(data.queue ?? []);
      setTabHints(data.tabHints ?? emptyDoctorOverviewTabHints());
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load clinical overview';
      setError(msg);
      setKpis(emptyDoctorOverviewKpis());
      setQueue([]);
      setTabHints(emptyDoctorOverviewTabHints());
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const quickActions = [
    { l: 'Start Consultation', i: Stethoscope, to: `${base}/workspace`, msg: 'Opening patient queue' },
    { l: 'Prescribe Medication', i: Pill, to: `${base}/prescriptions`, msg: 'Prescription engine ready' },
    { l: 'Request Lab', i: FlaskConical, to: `${base}/lab`, msg: 'Lab request engine opened' },
    { l: 'Request Imaging', i: ScanLine, to: `${base}/imaging`, msg: 'Imaging requests opened' },
    { l: 'Admit Patient', i: BedDouble, to: `${base}/admission`, msg: 'Admission workflow opened' },
    { l: 'Refer Patient', i: Send, to: `${base}/referrals`, msg: 'Referral workflow opened' },
    { l: 'View Results', i: Eye, to: `${base}/results`, msg: 'Lab & imaging results' },
    { l: 'Discharge Patient', i: LogOut, to: `${base}/discharge`, msg: 'Discharge dashboard opened' },
  ];

  return (
    <Shell title="Workstation">
      <InpatientWardBoard />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Live clinical workstation overview{loading ? ' · loading…' : ''}.
        </p>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Could not load overview</div>
            <div className="text-rose-700/90">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Patients Waiting"
          value={loading && !error ? '…' : String(kpis.patientsWaiting)}
          subtitle={kpis.patientsWaitingSubtitle}
          icon={Users}
        />
        <SummaryCard
          title="Active Consultations"
          value={loading && !error ? '…' : String(kpis.activeConsultations)}
          subtitle="In progress"
          icon={Stethoscope}
        />
        <SummaryCard
          title="Pending Lab Results"
          value={loading && !error ? '…' : String(kpis.pendingLabResults)}
          subtitle="Awaiting"
          icon={FlaskConical}
        />
        <SummaryCard
          title="Pending Imaging"
          value={loading && !error ? '…' : String(kpis.pendingImaging)}
          subtitle="Awaiting reports"
          icon={ScanLine}
        />
        <SummaryCard
          title="Admission Requests"
          value={loading && !error ? '…' : String(kpis.admissionRequests)}
          subtitle={
            kpis.urgentAdmissionRequests > 0
              ? `${kpis.urgentAdmissionRequests} urgent`
              : 'Open requests'
          }
          icon={BedDouble}
        />
        <SummaryCard
          title="Ward Round Patients"
          value={loading && !error ? '…' : String(kpis.wardRoundPatients)}
          subtitle={
            kpis.wardCount > 0
              ? `Across ${kpis.wardCount} ward${kpis.wardCount === 1 ? '' : 's'}`
              : 'No inpatients'
          }
          icon={ClipboardList}
        />
        <SummaryCard
          title="Referrals Received"
          value={loading && !error ? '…' : String(kpis.referralsReceived)}
          subtitle={
            kpis.referralsReceivedPending > 0
              ? `${kpis.referralsReceivedPending} pending`
              : 'Inbound open'
          }
          icon={UserPlus}
        />
        <SummaryCard
          title="Referrals Sent"
          value={loading && !error ? '…' : String(kpis.referralsSent)}
          subtitle={
            kpis.referralsSentAccepted > 0
              ? `${kpis.referralsSentAccepted} accepted`
              : 'Outbound'
          }
          icon={Send}
        />
        <SummaryCard
          title="Discharges Pending"
          value={loading && !error ? '…' : String(kpis.dischargesPending)}
          subtitle="Awaiting approval"
          icon={FileText}
        />
        <SummaryCard
          title="Emergency Cases"
          value={loading && !error ? '…' : String(kpis.emergencyCases)}
          subtitle={
            kpis.criticalAlerts > 0
              ? `${kpis.criticalAlerts} critical alert${kpis.criticalAlerts === 1 ? '' : 's'}`
              : 'Urgent / emergency triage'
          }
          icon={Siren}
        />
      </div>

      <Card className="mb-6">
        <Section icon={<Activity className="h-5 w-5" />} title="Quick Actions" desc="Jump straight into your most common workflows." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Button key={a.l} variant="outline" className="h-16 flex-col gap-1" onClick={() => { toast.success(a.msg); navigate(a.to); }}>
              <a.i className="h-5 w-5" /> <span className="text-xs">{a.l}</span>
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Workstation Tabs" desc="Live operational snapshot across the clinical day." />
        <Tabs defaultValue="queue">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="active">Active Consultation</TabsTrigger>
            <TabsTrigger value="followup">Follow-Up</TabsTrigger>
            <TabsTrigger value="admitted">Admitted Patients</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="discharge">Discharge</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            {loading && queue.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
              </div>
            ) : queue.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4">
                No patients waiting in today’s consultation queue.{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/workspace`)}>
                  open workspace →
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {queue.map((r) => (
                  <div key={r.triageId} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.mode}</div>
                    </div>
                    <div className="flex gap-2 items-center shrink-0">
                      <StatusPill tone={r.statusTone}>{r.status}</StatusPill>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.success(`Opening consultation: ${r.patientName}`);
                          navigate(`${base}/workspace`);
                        }}
                      >
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="active">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.activeCount} active consultation{tabHints.activeCount === 1 ? '' : 's'} —{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/workspace`)}>
                open workspace →
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="followup">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.followUpCount} follow-up patient{tabHints.followUpCount === 1 ? '' : 's'} scheduled this week.
            </div>
          </TabsContent>
          <TabsContent value="admitted">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.admittedCount} admitted patient{tabHints.admittedCount === 1 ? '' : 's'} —{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/ward-round`)}>
                start ward round →
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="referrals">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.referralsReceived} received · {tabHints.referralsSent} sent —{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/referrals`)}>
                open referrals →
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="results">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.pendingLab} pending lab · {tabHints.pendingImaging} pending imaging —{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/results`)}>
                view results →
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="discharge">
            <div className="text-sm text-muted-foreground p-4">
              {tabHints.dischargesPending} awaiting approval —{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`${base}/discharge`)}>
                open discharge →
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </Shell>
  );
};

// ============ 2. MODE SWITCHER ============
const modeContent: Record<string, { title: string; items: string[] }> = {
  GMPC: { title: 'GMPC Mode — General Medical Practice Clinic', items: ['General Consultation', 'Medical Cases', 'Follow-Up Clinics'] },
  OPC: { title: 'OPC Mode — Psychiatry', items: ['Psychiatric Assessments', 'Mental Health Reviews', 'Addiction Reviews', 'Psychogeriatric Reviews'] },
  Ward: { title: 'Ward Mode — Inpatient', items: ['Inpatients', 'Ward Rounds', 'Admission Reviews'] },
  Emergency: { title: 'Emergency Mode', items: ['Acute Triage', 'Crisis Stabilisation', 'Emergency Override Access'] },
};
export const DocModes = () => {
  const [mode, setMode] = useState<keyof typeof modeContent>('GMPC');
  return (
    <Shell title="Mode Switcher">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Current Mode" value={mode} subtitle="Session-persistent" icon={ArrowRightLeft} />
        <SummaryCard title="Templates Loaded" value={String(modeContent[mode].items.length)} icon={FileText} />
        <SummaryCard title="Active Workflows" value="6" icon={Activity} />
        <SummaryCard title="Last Switch" value="just now" icon={Clock} />
      </div>
      <Card>
        <Section icon={<ArrowRightLeft className="h-5 w-5" />} title="Clinical Mode" desc="Persistent per session — UI, templates, and workflows adapt automatically." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['GMPC', 'OPC', 'Ward', 'Emergency'] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); toast.success(`Switched to ${m} Mode`); }}
              className={`p-4 rounded-xl border-2 text-left transition ${mode === m ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{m}</span>
                <StatusPill tone={mode === m ? 'green' : 'blue'}>{mode === m ? 'Active' : 'Switch'}</StatusPill>
              </div>
              <div className="text-xs text-muted-foreground">{modeContent[m].title.split('—')[1]?.trim() || modeContent[m].title}</div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-3">{modeContent[mode].title}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {modeContent[mode].items.map(it => (
              <div key={it} className="p-3 border rounded-lg flex items-center justify-between bg-muted/30">
                <span className="text-sm font-medium">{it}</span>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${it} opened`)}>Open</Button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 3. CONSULTATION WORKSPACE — see DoctorConsultationWorkspace.tsx ============
export { DocWorkspace } from '@/pages/DoctorConsultationWorkspace';

// ============ 4. CLINICAL DOCUMENTATION — see DoctorClinicalDocumentation.tsx ============
export { DocDocumentation } from '@/pages/DoctorClinicalDocumentation';

// ============ 5. TIMELINE — see DoctorNoteTimeline.tsx ============
export { DocTimeline } from '@/pages/DoctorNoteTimeline';

// ============ 6. PRESCRIPTIONS — see DoctorPrescriptionEngine.tsx ============
export { DocPrescriptions } from '@/pages/DoctorPrescriptionEngine';

// ============ 7. LAB REQUEST — see DoctorLabRequestEngine.tsx ============
export { DocLab } from '@/pages/DoctorLabRequestEngine';

// ============ 8. IMAGING — see DoctorImagingRequestEngine.tsx ============
export { DocImaging } from '@/pages/DoctorImagingRequestEngine';

// ============ 9. ADMISSION — see DoctorAdmissionRequestEngine.tsx ============
export { DocAdmission } from '@/pages/DoctorAdmissionRequestEngine';

// ============ 10. REFERRALS — see DoctorReferralWorkflowEngine.tsx ============
export { DocReferrals } from '@/pages/DoctorReferralWorkflowEngine';

// ============ 11. TRANSFERS — see DoctorPatientTransferEngine.tsx ============
export { DocTransfers } from '@/pages/DoctorPatientTransferEngine';

// ============ 12. ACTIVE PATIENT BOARD — see DoctorActivePatientBoardEngine.tsx ============
export { DocActive } from '@/pages/DoctorActivePatientBoardEngine';

// ============ 13. AI ASSISTANT ============
export const DocAi = () => (
  <Shell title="AI Clinical Assistant">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Emergency Alerts" value="2" subtitle="Active" icon={Siren} />
      <SummaryCard title="High Risk Cases" value="5" icon={AlertTriangle} />
      <SummaryCard title="Suggested Diagnoses" value="7" icon={BookOpen} />
      <SummaryCard title="Suggested Investigations" value="11" icon={FlaskConical} />
    </div>
    <Section icon={<Sparkles className="h-5 w-5" />} title="AI Documentation Assist" desc="Summaries · risk flags · suggested diagnoses. AI does NOT diagnose independently." action={<StatusPill tone="purple">Assist Mode</StatusPill>} />
    <Tabs defaultValue="emergency">
      <TabsList>
        <TabsTrigger value="emergency">Emergency</TabsTrigger>
        <TabsTrigger value="high">High Priority</TabsTrigger>
        <TabsTrigger value="routine">Routine</TabsTrigger>
      </TabsList>
      {(['emergency', 'high', 'routine'] as const).map(k => (
        <TabsContent key={k} value={k}>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <h3 className="font-semibold mb-3">Generated Summary — Tope A.</h3>
              <div className="text-sm space-y-2 text-muted-foreground">
                <p>34-year-old male, 3-week history of insomnia and anhedonia. PHQ-9 score 14 (moderate).</p>
                <p>No suicidal ideation. Family hx: mother with bipolar disorder.</p>
              </div>
              <Button size="sm" className="mt-3" onClick={() => toast.success('AI Summary Inserted Successfully')}>Insert Into Note</Button>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Suggestions ({k})</h3>
              <ul className="space-y-2 text-sm">
                <li className="p-2 border rounded">Possible: <strong>Major Depressive Episode (DSM-5)</strong></li>
                <li className="p-2 border rounded">Consider: PHQ-9, GAD-7 follow-up</li>
                <li className="p-2 border rounded bg-rose-50/40 border-rose-200">⚠ Risk flag: family hx bipolar — consider mood charting</li>
              </ul>
            </Card>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  </Shell>
);

// ============ 14. DIAGNOSIS — see DoctorDiagnosisEngine.tsx ============
export { DocDiagnosis } from '@/pages/DoctorDiagnosisEngine';

// ============ 15. WARD ROUND — see DoctorWardRoundEngine.tsx ============
export { DocWardRound } from '@/pages/DoctorWardRoundEngine';

// ============ 16. RESULTS VIEWER — see DoctorResultsViewerEngine.tsx ============
export { DocResults } from '@/pages/DoctorResultsViewerEngine';

// ============ 17. DISCHARGE — see DoctorDischargeDraftEngine.tsx ============
export { DocDischarge } from '@/pages/DoctorDischargeDraftEngine';

// ============ 18. EMERGENCY — see DoctorEmergencyOverrideEngine.tsx ============
export { DocEmergency } from '@/pages/DoctorEmergencyOverrideEngine';

// ============ 19. CROSS-DEPT — see DoctorCrossDepartmentEngine.tsx ============
export { DocCrossDept } from '@/pages/DoctorCrossDepartmentEngine';

// ============ 20. SYNC ============
export const DocSync = () => {
  const rows = [
    { n: 'Lab Sync', t: 'green', s: 'Synced', last: '2s ago' },
    { n: 'Imaging Sync', t: 'green', s: 'Synced', last: '12s ago' },
    { n: 'Pharmacy Sync', t: 'amber', s: 'Queued', last: '1m ago' },
    { n: 'Legacy EMR Sync', t: 'red', s: 'Failed', last: '5m ago' },
  ];
  return (
    <Shell title="Real-Time Sync">
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <SummaryCard title="Sync Latency" value="180 ms" subtitle="avg last 5m" icon={Activity} />
        <SummaryCard title="Events / min" value="142" icon={RefreshCw} />
        <SummaryCard title="Pending Queue" value="3" icon={Clock} />
      </div>
      <Section icon={<RefreshCw className="h-5 w-5" />} title="Live Synchronization" desc="Instant updates across departments — labs, meds, alerts." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Last Sync</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.n}>
                <TableCell className="font-medium">{r.n}</TableCell>
                <TableCell><StatusPill tone={r.t}>{r.s}</StatusPill></TableCell>
                <TableCell className="text-xs">{r.last}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`${r.n} · details`)}>View Details</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(`${r.n} · retry started`)}>Retry Sync</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success(`${r.n} · history`)}><History className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 21. MOBILE ============
export const DocMobile = () => (
  <Shell title="Mobile & Bedside">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Tablet / Bedside Mode" desc="Ward round capture · voice-to-text · low-bandwidth optimized." />
    <div className="grid sm:grid-cols-3 gap-4">
      <Card>
        <h3 className="font-semibold mb-2">Quick Note</h3>
        <Textarea placeholder="Tap mic to dictate…" rows={4} />
        <Button size="sm" className="mt-2" onClick={() => toast.success('Voice capture started')}><Mic className="h-4 w-4 mr-1" />Voice Note</Button>
      </Card>
      <Card>
        <h3 className="font-semibold mb-2">Today's Round</h3>
        <Progress value={62} className="mb-2" />
        <p className="text-xs text-muted-foreground">5 of 8 patients seen</p>
      </Card>
      <Card>
        <h3 className="font-semibold mb-2">Offline Cache</h3>
        <p className="text-xs text-muted-foreground mb-2">12 notes queued for sync</p>
        <Button size="sm" variant="outline" onClick={() => notifySuccess('Sync started successfully', 'Sync Started')}>Sync Now</Button>
      </Card>
    </div>
  </Shell>
);

// ============ 22. AUDIT — see DoctorAuditComplianceEngine.tsx ============
export { DocAudit } from '@/pages/DoctorAuditComplianceEngine';
