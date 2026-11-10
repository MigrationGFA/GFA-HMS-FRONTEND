import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { db } from '@/db/database';
import { useNursing } from '@/contexts/NursingStore';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { formatCurrency } from '@/data/dummyData';
import { useAuth } from '@/contexts/AuthContext';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';
import { ApiError } from '@/lib/api/client';
import {
  admissionPersonDisplayName,
  completeDischarge as apiCompleteDischarge,
  getAdmission,
  getAdmissionStats,
  isAdmissionsApiEnabled,
  listAdmissions as apiListAdmissions,
  listBeds,
  orderDischarge as apiOrderDischarge,
  transferAdmission,
  type AdmissionRecord,
  type AdmissionStats,
  type BedRecord,
} from '@/lib/api/admissions';
import {
  createNursingCarePlan,
  createNursingFormInstance,
  createNursingIncident,
  createNursingNote,
  createNursingObservation,
  createNursingVital,
  flattenNursingAlerts,
  formTemplateFields,
  getNursingTimeline,
  isNursingCareApiEnabled,
  listNursingAlerts,
  listNursingCarePlans,
  listNursingFormInstances,
  listNursingFormTemplates,
  listNursingIncidents,
  listNursingNotes,
  listNursingObservations,
  listNursingVitals,
  nursingCarePersonName,
  reviewNursingIncident,
  updateNursingCarePlan,
  vitalFlags,
  type NursingAlert,
  type NursingCareIncident,
  type NursingCareNote,
  type NursingCareObservation,
  type NursingCarePlan as ApiCarePlan,
  type NursingCareVital,
  type NursingFormInstance,
  type NursingFormTemplate,
  type NursingTimelineEvent,
} from '@/lib/api/nursing-care';
import {
  acknowledgeNursingHandover,
  acknowledgeNursingOrder,
  administerMar,
  collectNursingSample,
  createExternalMar,
  createIcuInfusion,
  createIcuNote,
  createNursingHandover,
  createNursingMessage,
  createNursingTask,
  endNursingShift,
  generateNursingReport,
  getCurrentNursingShift,
  getNursingAnalytics,
  holdMar,
  isNursingOpsApiEnabled,
  listIcuBoard,
  listNursingHandovers,
  listNursingMar,
  listNursingMessages,
  listNursingOrders,
  listNursingReports,
  listNursingSamples,
  listNursingShifts,
  listNursingTasks,
  markNursingMessageRead,
  missMar,
  nursingOpsPersonName,
  refuseMar,
  startNursingShift,
  updateNursingTask,
  type NursingAnalyticsSummary,
  type NursingHandover,
  type NursingIcuBoardRow,
  type NursingMarEntry,
  type NursingMessage,
  type NursingOpsTask,
  type NursingOrder,
  type NursingReport,
  type NursingShift,
} from '@/lib/api/nursing-ops';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  LayoutDashboard, HeartPulse, Stethoscope, Pill, ClipboardList, FileText, Activity,
  Users, BedDouble, Siren, UserRound, Sparkles, MessageSquare, BarChart3,
  Smartphone, Clock, Baby, Wind, Droplets, Calendar, ArrowRightLeft,
  Plus, Save, CheckCircle2, AlertTriangle, Eye, Search, Download, Send, Mic,
  TrendingUp, ClipboardCheck, BookOpen, ScrollText, Printer, ArrowRight, Bell,
  Repeat, X,
} from 'lucide-react';

/* =====================================================================
   GLOBAL SUCCESS POPUP SYSTEM
   ===================================================================== */
type SuccessAction = { label: string; onClick?: () => void };
type SuccessPayload = { title: string; message: string; actions?: SuccessAction[] };

const NURSE_SUCCESS_EVENT = 'nurse-success';
const notifySuccess = (p: SuccessPayload) => {
  toast.success(p.title, { description: p.message });
  window.dispatchEvent(new CustomEvent(NURSE_SUCCESS_EVENT, { detail: p }));
};

const SuccessPopup = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SuccessPayload | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      setData((e as CustomEvent<SuccessPayload>).detail);
      setOpen(true);
    };
    window.addEventListener(NURSE_SUCCESS_EVENT, h);
    return () => window.removeEventListener(NURSE_SUCCESS_EVENT, h);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl">{data?.title}</DialogTitle>
            <DialogDescription className="text-sm">{data?.message}</DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          {(data?.actions ?? []).map((a) => (
            <Button key={a.label} variant="outline" className="w-full" onClick={() => { a.onClick?.(); setOpen(false); }}>
              {a.label}
            </Button>
          ))}
          <Button className="w-full" onClick={() => setOpen(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =====================================================================
   NAVIGATION (cleaned per spec — Admin/Ward, Lab, NOK removed from Nurse)
   ===================================================================== */
const base = '/dashboard/nurse';

export const nursingNav = [
  { label: 'Nursing Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Queues', path: `${base}/queues`, icon: <Users className="h-4 w-4" /> },
  { label: 'Patient Workspace', path: `${base}/workspace`, icon: <UserRound className="h-4 w-4" /> },
  { label: "Doctor's Orders", path: `${base}/orders`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Nursing Tasks', path: `${base}/tasks`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Nursing Notes', path: `${base}/notes`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Vital Signs', path: `${base}/vitals`, icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'Medication Admin (MAR)', path: `${base}/mar`, icon: <Pill className="h-4 w-4" /> },
  { label: 'External Medication', path: `${base}/external-meds`, icon: <Plus className="h-4 w-4" /> },
  { label: 'Sample Collection', path: `${base}/samples`, icon: <Droplets className="h-4 w-4" /> },
  { label: 'Observation Center', path: `${base}/observation`, icon: <Eye className="h-4 w-4" /> },
  { label: 'ICU Nursing', path: `${base}/icu`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Charts & Forms', path: `${base}/forms`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Specialized Charts', path: `${base}/charts`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Nursing Care Plan', path: `${base}/care-plan`, icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Shift Handover', path: `${base}/handover`, icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Shift Dashboard', path: `${base}/shifts`, icon: <Clock className="h-4 w-4" /> },
  { label: 'Admission Monitoring', path: `${base}/admissions`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Patient Transfers', path: `${base}/transfers`, icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Referral Bed Queue', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Discharge Workflow', path: `${base}/discharge`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Incident Reports', path: `${base}/incidents`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Patient Timeline', path: `${base}/timeline`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Clinical Alerts', path: `${base}/alerts`, icon: <Siren className="h-4 w-4" /> },
  { label: 'Communication', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Reports', path: `${base}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Analytics', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Bedside Mode', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={nursingNav} title={`Nursing · ${title}`}>
    <DbBootGate>{children}</DbBootGate>
    <SuccessPopup />
  </DashboardLayout>
);

/* =====================================================================
   SHARED PRIMITIVES
   ===================================================================== */
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
const Pill2 = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

/* =====================================================================
   PATIENT REGISTRY (shared dummy data)
   ===================================================================== */
type Patient = {
  id: string; name: string; sex: string; age: number;
  hospNo: string; ward: string; bed: string; phone: string;
  risk: string; tone: string; dx: string; adm: string; doctor: string;
  admissionId?: string; patientId?: string;
};

const riskTone = (level?: string) => {
  switch (level) {
    case 'Constant': return { risk: 'Critical', tone: 'red' };
    case 'Close': return { risk: 'High', tone: 'amber' };
    default: return { risk: 'Stable', tone: 'green' };
  }
};

const admissionToPatient = (a: AdmissionRecord): Patient => {
  const rt = riskTone(a.supervisionLevel ?? undefined);
  return {
    id: String(a.admissionId),
    admissionId: String(a.admissionId),
    patientId: String(a.personId),
    name: admissionPersonDisplayName(a.person),
    sex: a.person?.sex === 'Female' ? 'F' : 'M',
    age: a.person?.age ?? 0,
    hospNo: a.person?.hospitalNo ?? '—',
    ward: a.ward?.name ?? '—',
    bed: a.bed?.label ?? '—',
    phone: a.person?.phone ?? '—',
    risk: rt.risk,
    tone: rt.tone,
    dx: a.diagnosis ?? '—',
    adm: a.admittedAt.slice(0, 10),
    doctor: a.consultant ?? '—',
  };
};

/** Live ward patients — admissions API when enabled, else local db.admissions. */
const useWardPatients = (): Patient[] => {
  const tick = useDbTick();
  const apiOn = isAdmissionsApiEnabled();
  const [apiPatients, setApiPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (!apiOn) {
      setApiPatients([]);
      return;
    }
    let cancelled = false;
    void apiListAdmissions({ limit: 200 })
      .then((list) => {
        if (cancelled) return;
        setApiPatients(
          list.items
            .filter(a => a.status !== 'DISCHARGED' && a.status !== 'CANCELLED')
            .map(admissionToPatient),
        );
      })
      .catch(() => {
        if (!cancelled) setApiPatients([]);
      });
    return () => { cancelled = true; };
  }, [apiOn, tick]);

  const local = db.admissions.list()
    .filter(a => a.status !== 'DISCHARGED' && a.status !== 'CANCELLED')
    .map(a => {
      const p = db.patients.get(a.patientId);
      const rt = riskTone(a.supervisionLevel);
      return {
        id: a.id,
        admissionId: a.id,
        patientId: a.patientId,
        name: a.patientName,
        sex: p?.sex === 'Female' ? 'F' : 'M',
        age: p?.age ?? 0,
        hospNo: a.hospitalId,
        ward: a.wardName ?? '—',
        bed: a.bedLabel ?? '—',
        phone: p?.phone ?? '—',
        risk: rt.risk,
        tone: rt.tone,
        dx: a.diagnosis,
        adm: a.admittedAt.slice(0, 10),
        doctor: a.consultant,
      } satisfies Patient;
    });

  return apiOn ? (apiPatients.length ? apiPatients : local) : local;
};
const PATIENTS: Patient[] = [
  { id: 'p1', name: 'Tope Adeyemi', sex: 'M', age: 34, hospNo: 'GFA/2026/00891', ward: 'Ward 3B', bed: '12', phone: '0803-444-1290', risk: 'High', tone: 'red', dx: 'Schizophrenia — acute', adm: '14 Apr 2026', doctor: 'Dr. Lawal' },
  { id: 'p2', name: 'Yusuf Kabiru', sex: 'M', age: 28, hospNo: 'GFA/2026/00902', ward: 'Ward 2A', bed: '04', phone: '0805-221-7788', risk: 'Moderate', tone: 'amber', dx: 'Bipolar — manic', adm: '20 May 2026', doctor: 'Dr. Bello' },
  { id: 'p3', name: 'Ngozi Ibekwe', sex: 'F', age: 41, hospNo: 'GFA/2026/00917', ward: 'ICU', bed: '02', phone: '0701-998-3344', risk: 'Critical', tone: 'red', dx: 'Psychiatric ICU obs', adm: '28 May 2026', doctor: 'Dr. Lawal' },
  { id: 'p4', name: 'Bisi Olamide', sex: 'F', age: 22, hospNo: 'GFA/2026/00865', ward: 'Ward 1C', bed: '07', phone: '0802-119-3344', risk: 'Low', tone: 'green', dx: 'MDD — stable', adm: '10 May 2026', doctor: 'Dr. Okafor' },
  { id: 'p5', name: 'Femi Okoro', sex: 'M', age: 19, hospNo: 'GFA/2026/00924', ward: 'C&A Ward', bed: '03', phone: '0802-665-1190', risk: 'High', tone: 'purple', dx: 'Adolescent psychosis', adm: '25 May 2026', doctor: 'Dr. Adeniyi' },
  { id: 'p6', name: 'Mama Aisha', sex: 'F', age: 72, hospNo: 'GFA/2026/00811', ward: 'Psychogeriatric', bed: '09', phone: '0809-111-2244', risk: 'Moderate', tone: 'amber', dx: 'Dementia — wandering', adm: '02 May 2026', doctor: 'Dr. Eze' },
];

/* =====================================================================
   SHARED MODALS
   ===================================================================== */
const PatientSearchModal = ({ open, onOpenChange, onSelect, title = 'Search Patient' }:
  { open: boolean; onOpenChange: (v: boolean) => void; onSelect: (p: Patient) => void; title?: string }) => {
  const [q, setQ] = useState('');
  const wardPatients = useWardPatients();
  const source = wardPatients.length ? wardPatients : PATIENTS;
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return source;
    return source.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.hospNo.toLowerCase().includes(s) ||
      p.ward.toLowerCase().includes(s) ||
      p.bed.toLowerCase().includes(s) ||
      p.phone.includes(s),
    );
  }, [q, source]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search by name, hospital number, ward, bed, or phone.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Start typing…" className="pl-9" autoFocus />
        </div>
        <div className="max-h-[55vh] overflow-y-auto space-y-2">
          {results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p); onOpenChange(false); }}
              className="w-full text-left p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/40 transition">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold">{p.name} <span className="text-xs text-muted-foreground">({p.sex}, {p.age})</span></div>
                  <div className="text-xs text-muted-foreground">{p.hospNo} · {p.ward} · Bed {p.bed} · {p.phone}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.dx} · Adm {p.adm}</div>
                </div>
                <Pill2 tone={p.tone}>{p.risk}</Pill2>
              </div>
            </button>
          ))}
          {results.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No patients matched “{q}”.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ReasonModal = ({ open, onOpenChange, title, options, onConfirm }:
  { open: boolean; onOpenChange: (v: boolean) => void; title: string; options: string[]; onConfirm: (reason: string, note: string) => void }) => {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setReason(''); setNote(''); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Select a reason and add a brief note.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reason *</Label>
            <SearchableSelect
              value={reason}
              onChange={setReason}
              placeholder="Choose reason"
              options={options.map(o => ({ value: o, label: o }))}
            />
          </div>
          <div>
            <Label className="text-xs">Nurse note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Additional context…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!reason} onClick={() => { onConfirm(reason, note); onOpenChange(false); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =====================================================================
   1. NURSING DASHBOARD
   ===================================================================== */
export const NurseDashboard = () => {
  const navigate = useNavigate();
  const wardPatients = useWardPatients();
  useDbTick();
  const [searchOpen, setSearchOpen] = useState(false);
  const mar = db.mar.list();
  const vitals = db.vitals.list();
  const admissions = db.admissions.list();
  const incidents = db.incidents.list();
  const cards = [
    { t: 'Ward Patients', v: String(wardPatients.length), s: `Across ${new Set(wardPatients.map(p => p.ward)).size} wards`, i: Users },
    { t: 'Constant Supervision', v: String(wardPatients.filter(p => p.risk === 'Critical').length), s: 'Highest acuity', i: Activity },
    { t: 'Abnormal Vitals', v: String(vitals.filter(v => v.abnormal).length), s: 'Escalated to doctor', i: HeartPulse },
    { t: 'Medication Due', v: String(mar.filter(m => m.status === 'DUE').length), s: 'Awaiting administration', i: Pill },
    { t: 'Medication Missed', v: String(mar.filter(m => m.status === 'MISSED').length), s: 'Requires follow-up', i: AlertTriangle },
    { t: 'New Admissions', v: String(admissions.filter(a => a.admittedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length), s: 'Today', i: BedDouble },
    { t: 'Discharge Ordered', v: String(admissions.filter(a => a.status === 'DISCHARGE_ORDERED').length), s: 'Awaiting nursing clearance', i: ClipboardCheck },
    { t: 'Pending Handover', v: String(db.handovers.list().filter(h => !h.acknowledged).length), s: 'Not yet acknowledged', i: ArrowRightLeft },
    { t: 'Open Incidents', v: String(incidents.filter(i => i.status !== 'REVIEWED' && i.status !== 'CLOSED').length), s: 'Reported this shift', i: Siren },
    { t: 'Nursing Tasks', v: String(db.nursingTasks.list().filter(t => t.status !== 'COMPLETED').length), s: 'Outstanding', i: ClipboardList },
    { t: 'Care Plans', v: String(db.carePlans.list().filter(c => c.status !== 'resolved').length), s: 'Active / ongoing', i: BookOpen },
    { t: 'Forms Completed', v: String(db.formInstances.list().length), s: 'Signed documents', i: FileText },
  ];
  const quick = [
    { l: 'Search Patient', i: Search, onClick: () => setSearchOpen(true) },
    { l: 'Open Patient Workspace', i: UserRound, onClick: () => navigate(`${base}/workspace`) },
    { l: 'Record Vital Signs', i: HeartPulse, onClick: () => navigate(`${base}/vitals`) },
    { l: 'Administer Medication', i: Pill, onClick: () => navigate(`${base}/mar`) },
    { l: 'Write Nursing Note', i: FileText, onClick: () => navigate(`${base}/notes`) },
    { l: 'Start Shift Handover', i: ArrowRightLeft, onClick: () => navigate(`${base}/handover`) },
    { l: 'Generate Report', i: ScrollText, onClick: () => navigate(`${base}/reports`) },
    { l: 'Open Communication', i: MessageSquare, onClick: () => navigate(`${base}/comms`) },
  ];
  return (
    <Shell title="Dashboard">
      <DepartmentReportBox department="Nursing and wards" officer="Nurse Blessing Okonkwo" />
      <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Nurse Adaeze · Morning Shift"
        desc="Live operational view of your assigned wards, patients, medications, and alerts." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={c.v} subtitle={c.s} icon={c.i} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Ward Snapshot" desc="Tap a patient to open the workspace." />
          <div className="grid sm:grid-cols-2 gap-3">
            {wardPatients.length === 0 ? <div className="text-sm text-muted-foreground col-span-2 text-center py-6">No admitted patients.</div> : wardPatients.map(p => (
              <button key={p.id} onClick={() => navigate(`${base}/workspace?patientId=${encodeURIComponent(p.patientId ?? p.id)}&admissionId=${encodeURIComponent(p.admissionId ?? '')}`)}
                className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 text-left">
                <div>
                  <div className="font-medium text-sm">{p.name} <span className="text-xs text-muted-foreground">({p.sex}, {p.age})</span></div>
                  <div className="text-xs text-muted-foreground">{p.ward} · Bed {p.bed} · {p.dx}</div>
                </div>
                <Pill2 tone={p.tone}>{p.risk}</Pill2>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <Section icon={<Siren className="h-5 w-5" />} title="Clinical Alerts" desc="Live ward alerts" />
          <ul className="space-y-3 text-sm">
            <li className="p-3 border border-rose-200 rounded-lg bg-rose-50/50">
              <div className="font-semibold text-rose-700">Missed medication × 2</div>
              <div className="text-xs text-rose-600">Tope A. — Olanzapine 10mg (15m overdue)</div>
            </li>
            <li className="p-3 border border-amber-200 rounded-lg bg-amber-50/50">
              <div className="font-semibold text-amber-700">Abnormal vitals</div>
              <div className="text-xs text-amber-600">Ngozi I. — BP 168/104, escalate to Dr. Lawal</div>
            </li>
            <li className="p-3 border border-purple-200 rounded-lg bg-purple-50/50">
              <div className="font-semibold text-purple-700">Observation due — L3</div>
              <div className="text-xs text-purple-600">Femi O. — every 15 min check overdue 4m</div>
            </li>
            <li className="p-3 border border-sky-200 rounded-lg bg-sky-50/50">
              <div className="font-semibold text-sky-700">Lab result available</div>
              <div className="text-xs text-sky-600">Tope A. — FBC ready in Patient Timeline</div>
            </li>
          </ul>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate(`${base}/alerts`)}>
            View all alerts <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Card>
      </div>

      <Card>
        <Section icon={<Sparkles className="h-5 w-5" />} title="Quick Actions" desc="One-tap workflows for this shift." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quick.map(a => (
            <button key={a.l} onClick={a.onClick}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-primary/5 hover:border-primary/40 transition text-left">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <a.i className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{a.l}</span>
            </button>
          ))}
        </div>
      </Card>

      <PatientSearchModal open={searchOpen} onOpenChange={setSearchOpen}
        onSelect={(p) => {
          const qs = new URLSearchParams({ patientId: p.patientId ?? p.id, admissionId: p.admissionId ?? '' });
          notifySuccess({
            title: 'Patient selected',
            message: `${p.name} (${p.hospNo}) — opening workspace.`,
            actions: [{ label: 'Open Patient Workspace', onClick: () => navigate(`${base}/workspace?${qs}`) }],
          });
          navigate(`${base}/workspace?${qs}`);
        }} />
    </Shell>
  );
};

/* =====================================================================
   2. PATIENT WORKSPACE
   ===================================================================== */
export const NurseWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const careApi = isNursingCareApiEnabled();
  const admissionsApi = isAdmissionsApiEnabled();
  const [current, setCurrent] = useState<Patient | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pickerSource = wardPatients.length ? wardPatients : PATIENTS;

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const admissionId = searchParams.get('admissionId');
    if (!patientId && !admissionId) return;

    const fromWard = wardPatients.find(p =>
      (patientId && (p.patientId === patientId || p.id === patientId)) ||
      (admissionId && p.admissionId === admissionId),
    );
    if (fromWard) {
      setCurrent(fromWard);
      return;
    }

    if (admissionsApi && admissionId && /^\d+$/.test(admissionId)) {
      void getAdmission(Number(admissionId))
        .then(a => setCurrent(admissionToPatient(a)))
        .catch(e => toast.error(e instanceof ApiError ? e.message : 'Could not load admission'));
    }
  }, [searchParams, wardPatients, admissionsApi]);

  const submitNote = async () => {
    if (!current || note.trim().length < 4) {
      toast.error('Write a short nursing note first');
      return;
    }
    setSubmitting(true);
    try {
      if (careApi && current.patientId && /^\d+$/.test(current.patientId)) {
        await createNursingNote({
          personId: Number(current.patientId),
          admissionId: current.admissionId && /^\d+$/.test(current.admissionId) ? Number(current.admissionId) : undefined,
          noteType: 'Progress',
          format: 'Narrative',
          body: note.trim(),
          authorBy: 'NO Adaeze',
        });
      } else if (current.patientId) {
        nursing.addNote({
          admissionId: current.admissionId ?? '',
          patientId: current.patientId,
          type: 'Progress',
          format: 'Narrative',
          body: note.trim(),
          authorBy: 'NO Adaeze',
        });
      } else {
        toast.error('Select a patient with a valid id');
        return;
      }
      setNote('');
      notifySuccess({
        title: 'Nursing note saved successfully',
        message: `Note recorded for ${current.name} at ${new Date().toLocaleTimeString()}.`,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save note');
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) {
    return (
      <Shell title="Patient Workspace">
        <Section icon={<UserRound className="h-5 w-5" />} title="Patient Workspace"
          desc="Search for a patient to start nursing care, view timeline, or record updates."
          action={<Button onClick={() => setSearchOpen(true)}><Search className="h-3 w-3 mr-1" />Search Patient</Button>} />
        <Card className="mb-5">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, hospital #, ward, bed, or phone…" className="pl-9" onFocus={() => setSearchOpen(true)} readOnly />
          </div>
        </Card>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickerSource.map(p => (
            <Card key={p.id} className="hover:border-primary/50 transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.hospNo}</div>
                </div>
                <Pill2 tone={p.tone}>{p.risk}</Pill2>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {p.ward} · Bed {p.bed} · Adm {p.adm}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="flex-1" onClick={() => setCurrent(p)}>Open Patient</Button>
                <Button size="sm" variant="outline" onClick={() => { setCurrent(p); }}>Start Care</Button>
                <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/timeline?patientId=${encodeURIComponent(p.patientId ?? p.id)}`)}>Timeline</Button>
              </div>
            </Card>
          ))}
        </div>
        <PatientSearchModal open={searchOpen} onOpenChange={setSearchOpen} onSelect={setCurrent} />
      </Shell>
    );
  }

  return (
    <Shell title="Patient Workspace">
      <Section icon={<UserRound className="h-5 w-5" />}
        title={`Nursing Workspace — ${current.name}`}
        desc={`${current.sex} / ${current.age} · ${current.hospNo} · ${current.ward} · Bed ${current.bed}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSwitchOpen(true)}><Repeat className="h-3 w-3 mr-1" />Switch Patient</Button>
            <Button size="sm" onClick={() => notifySuccess({
              title: 'Nursing update saved successfully',
              message: `Shift entry stored for ${current.name}. What next?`,
              actions: [
                { label: 'Continue with Same Patient', onClick: () => {} },
                { label: 'Search Another Patient', onClick: () => setSwitchOpen(true) },
                { label: 'Return to Nurse Dashboard', onClick: () => navigate(base) },
              ],
            })}><Save className="h-3 w-3 mr-1" />Save Shift</Button>
          </div>
        } />

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mb-2">
                {current.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
              </div>
              <div className="font-semibold">{current.name}</div>
              <div className="text-xs text-muted-foreground">{current.sex} · {current.age} · {current.hospNo}</div>
              <Pill2 tone={current.tone}>{current.risk} risk</Pill2>
            </div>
            <div className="mt-4 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Ward / Bed</span><span>{current.ward} / {current.bed}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Admitted</span><span>{current.adm}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Diagnosis</span><span>{current.dx}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>{current.doctor}</span></div>
            </div>
          </Card>
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-500" />Vitals Summary</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[['BP', '124/82'], ['Pulse', '78'], ['Temp', '36.7°C'], ['SpO₂', '98%']].map(([k, v]) => (
                <div key={k} className="p-2 border rounded"><div className="text-muted-foreground">{k}</div><div className="font-semibold">{v}</div></div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Nursing Notes</div>
            <div className="space-y-3">
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Write a new nursing note…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success('Note draft saved')}><Save className="h-3 w-3 mr-1" />Save Draft</Button>
                <LoadingButton size="sm" loading={submitting} loadingText="Saving…" onClick={() => void submitNote()}>
                  <Save className="h-3 w-3 mr-1" />Submit Note
                </LoadingButton>
              </div>
            </div>
          </Card>
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><Bell className="h-4 w-4" />Alerts</div>
            <ul className="text-sm space-y-2">
              <li className="p-2 border rounded flex justify-between"><span>Olanzapine 10mg due 12:00</span><Pill2 tone="amber">Med</Pill2></li>
              <li className="p-2 border rounded flex justify-between"><span>L2 observation due 11:00</span><Pill2 tone="sky">Obs</Pill2></li>
            </ul>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><Pill className="h-4 w-4" />Medication Due</div>
            <ul className="text-xs space-y-2">
              <li className="flex justify-between"><span>Olanzapine 10mg</span><Pill2 tone="green">Given 08:00</Pill2></li>
              <li className="flex justify-between"><span>Sertraline 50mg</span><Pill2 tone="amber">Due 12:00</Pill2></li>
              <li className="flex justify-between"><span>Lorazepam 1mg PRN</span><Pill2 tone="sky">PRN</Pill2></li>
            </ul>
          </Card>
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><Eye className="h-4 w-4" />Observation Status</div>
            <Pill2 tone="amber">Level 2 · 15-min check</Pill2>
            <div className="text-xs text-muted-foreground mt-2">Last check 10:45 · next 11:00</div>
          </Card>
          <Card>
            <div className="font-semibold text-sm mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Doctor Orders</div>
            <ul className="text-xs space-y-1">
              <li>· Continue current regimen</li>
              <li>· Repeat FBC tomorrow</li>
              <li>· 30-min observation level</li>
            </ul>
          </Card>
        </div>
      </div>

      <PatientSearchModal open={switchOpen} onOpenChange={setSwitchOpen} title="Switch Patient"
        onSelect={(p) => { setCurrent(p); notifySuccess({ title: 'Patient switched successfully', message: `Now viewing ${p.name} (${p.hospNo}).` }); }} />
    </Shell>
  );
};

/* =====================================================================
   3. NURSING NOTES CENTER
   ===================================================================== */
const NOTE_TYPES: { value: import('@/data-access/types').NursingNoteType; label: string; tone: string }[] = [
  { value: 'Progress', label: 'Progress Note', tone: 'green' },
  { value: 'General', label: 'General Note', tone: 'blue' },
  { value: 'Shift', label: 'Shift Note', tone: 'sky' },
  { value: 'Incident', label: 'Incident Note', tone: 'red' },
  { value: 'MentalHealth', label: 'Mental Health Note', tone: 'purple' },
  { value: 'WoundCare', label: 'Wound Care Note', tone: 'amber' },
  { value: 'Medication', label: 'Medication Note', tone: 'orange' },
  { value: 'Discharge', label: 'Discharge Note', tone: 'green' },
];
export const NurseNotes = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  const [text, setText] = useState('');
  const [type, setType] = useState<import('@/data-access/types').NursingNoteType>('Progress');
  const [patientId, setPatientId] = useState('');
  const [format, setFormat] = useState<'Narrative' | 'SOAP' | 'DAR'>('Narrative');
  const [tab, setTab] = useState('all');
  const [apiNotes, setApiNotes] = useState<NursingCareNote[]>([]);
  const { run, isBusy } = useAsyncAction();
  useDbTick();

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiNotes(await listNursingNotes());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load notes');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const localNotes = db.nursingNotes.list();
  const nameOf = (pid: string) => {
    if (apiOn) {
      const n = apiNotes.find(x => String(x.personId) === pid);
      if (n?.person) return nursingCarePersonName(n.person);
    }
    return db.patients.get(pid)?.name ?? wardPatients.find(p => p.patientId === pid)?.name ?? pid;
  };
  const today = new Date().toISOString().slice(0, 10);

  const filteredLocal = localNotes.filter(n =>
    tab === 'all' || (tab === 'incident' && n.type === 'Incident') || (tab === 'shift' && n.type === 'Shift') ||
    (tab === 'progress' && n.type === 'Progress'));
  const filteredApi = apiNotes.filter(n =>
    tab === 'all' || (tab === 'incident' && n.noteType === 'Incident') || (tab === 'shift' && n.noteType === 'Shift') ||
    (tab === 'progress' && n.noteType === 'Progress'));

  const submit = () => run(
    'note-submit',
    'Saving nursing note…',
    async () => {
      if (!patientId) return { ok: false as const, message: 'Select a patient' };
      if (text.trim().length < 4) return { ok: false as const, message: 'Note body is too short' };
      const adm = wardPatients.find(p => p.patientId === patientId);
      if (apiOn && /^\d+$/.test(patientId)) {
        await createNursingNote({
          personId: Number(patientId),
          admissionId: adm?.admissionId && /^\d+$/.test(adm.admissionId) ? Number(adm.admissionId) : undefined,
          noteType: type,
          format,
          body: text.trim(),
          authorBy: 'NO Adaeze',
        });
        await refreshApi();
      } else {
        nursing.addNote({ admissionId: adm?.admissionId ?? '', patientId, type, format, body: text.trim(), authorBy: 'NO Adaeze' });
      }
      return { ok: true as const };
    },
    () => `${type} note saved for ${nameOf(patientId)} and stored to the patient timeline.`,
    r => r.message ?? 'Could not save note',
  ).then(r => { if (r && 'ok' in r && r.ok) setText(''); });

  const notesTodayCount = apiOn
    ? apiNotes.filter(n => n.createdAt.slice(0, 10) === today).length
    : localNotes.filter(n => n.createdAt.slice(0, 10) === today).length;
  const totalCount = apiOn ? apiNotes.length : localNotes.length;
  const shiftCount = apiOn ? apiNotes.filter(n => n.noteType === 'Shift').length : localNotes.filter(n => n.type === 'Shift').length;
  const incidentCount = apiOn ? apiNotes.filter(n => n.noteType === 'Incident').length : localNotes.filter(n => n.type === 'Incident').length;

  return (
    <Shell title="Nursing Notes">
      <Section icon={<FileText className="h-5 w-5" />} title="Nursing Notes Center"
        desc="Progress · Shift · Incident · Mental health · Wound · Medication · Discharge notes. SOAP / DAR / narrative." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Notes Today" value={String(notesTodayCount)} icon={FileText} />
        <SummaryCard title="Total Notes" value={String(totalCount)} icon={CheckCircle2} />
        <SummaryCard title="Shift Notes" value={String(shiftCount)} icon={Clock} />
        <SummaryCard title="Incident Notes" value={String(incidentCount)} icon={AlertTriangle} />
        <SummaryCard title="Ward Patients" value={String(wardPatients.length)} icon={Users} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex gap-2 mb-3 flex-wrap">
            <SearchableSelect
              className="w-44"
              value={type}
              onChange={(v) => setType(v as import('@/data-access/types').NursingNoteType)}
              options={NOTE_TYPES.map(t => ({ value: t.value, label: t.label }))}
              placeholder="Note type"
            />
            <SearchableSelect
              className="w-32"
              value={format}
              onChange={(v) => setFormat(v as 'Narrative' | 'SOAP' | 'DAR')}
              options={[
                { value: 'Narrative', label: 'Narrative' },
                { value: 'SOAP', label: 'SOAP' },
                { value: 'DAR', label: 'DAR' },
              ]}
              placeholder="Format"
            />
            <SearchableSelect
              className="flex-1 min-w-[200px]"
              value={patientId}
              onChange={setPatientId}
              placeholder="Select patient"
              options={wardPatients.map(p => ({ value: p.patientId!, label: p.name, sub: `${p.ward}/${p.bed}` }))}
            />
          </div>
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={10} placeholder={format === 'SOAP' ? 'S:\nO:\nA:\nP:' : format === 'DAR' ? 'D:\nA:\nR:' : 'Begin typing the nursing note…'} />
          <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Signed by NO Adaeze · {new Date().toLocaleTimeString()}{apiOn ? ' · API' : ' · Local'}</span>
            <LoadingButton size="sm" loading={isBusy('note-submit')} loadingText="Saving…" onClick={submit}>
              <Save className="h-3 w-3 mr-1" />Submit Note
            </LoadingButton>
          </div>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Recent Notes</div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 mb-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="progress">Prog</TabsTrigger>
              <TabsTrigger value="incident">Inc</TabsTrigger>
              <TabsTrigger value="shift">Shift</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="space-y-2 max-h-[420px] overflow-auto">
              {apiOn ? (
                filteredApi.length === 0 ? <div className="text-xs text-muted-foreground text-center py-6">No notes yet.</div> : filteredApi.map(n => {
                  const meta = NOTE_TYPES.find(t => t.value === n.noteType);
                  return (
                    <div key={n.noteId} className="p-2 border rounded text-xs">
                      <div className="flex justify-between"><span className="font-semibold">{nursingCarePersonName(n.person) || nameOf(String(n.personId))}</span><Pill2 tone={meta?.tone ?? 'blue'}>{n.noteType}</Pill2></div>
                      <div className="text-muted-foreground">{n.createdAt.slice(0, 16).replace('T', ' ')} · {n.authorBy ?? '—'}</div>
                      <div className="mt-1 whitespace-pre-wrap">{n.body}</div>
                    </div>
                  );
                })
              ) : (
                filteredLocal.length === 0 ? <div className="text-xs text-muted-foreground text-center py-6">No notes yet.</div> : filteredLocal.map(n => {
                  const meta = NOTE_TYPES.find(t => t.value === n.type);
                  return (
                    <div key={n.id} className="p-2 border rounded text-xs">
                      <div className="flex justify-between"><span className="font-semibold">{nameOf(n.patientId)}</span><Pill2 tone={meta?.tone ?? 'blue'}>{n.type}</Pill2></div>
                      <div className="text-muted-foreground">{n.createdAt.slice(0, 16).replace('T', ' ')} · {n.authorBy}</div>
                      <div className="mt-1 whitespace-pre-wrap">{n.body}</div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   4. VITAL SIGNS CENTER
   ===================================================================== */
export const NurseVitals = () => {
  const nursing = useNursing();
  const [searchParams] = useSearchParams();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  const [open, setOpen] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vals, setVals] = useState({ bpSys: '', bpDia: '', pulse: '', temp: '', resp: '', spo2: '', weight: '', height: '', bloodSugar: '', painScore: '', notes: '' });
  const [tab, setTab] = useState('all');
  const [apiVitals, setApiVitals] = useState<NursingCareVital[]>([]);
  const { run, isBusy } = useAsyncAction();
  const reset = () => setVals({ bpSys: '', bpDia: '', pulse: '', temp: '', resp: '', spo2: '', weight: '', height: '', bloodSugar: '', painScore: '', notes: '' });

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const personId = searchParams.get('patientId');
      const admissionId = searchParams.get('admissionId');
      setApiVitals(await listNursingVitals({
        personId: personId && /^\d+$/.test(personId) ? Number(personId) : undefined,
        admissionId: admissionId && /^\d+$/.test(admissionId) ? Number(admissionId) : undefined,
      }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load vitals');
    }
  }, [apiOn, searchParams]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const admissionId = searchParams.get('admissionId');
    if (!patientId && !admissionId) return;
    const found = wardPatients.find(p =>
      (patientId && (p.patientId === patientId || p.id === patientId)) ||
      (admissionId && p.admissionId === admissionId),
    );
    if (found) {
      setPatient(found);
      setOpen(true);
    }
  }, [searchParams, wardPatients]);

  useEffect(() => { if (open && !patient && wardPatients[0]) setPatient(wardPatients[0]); }, [open, patient, wardPatients]);

  const allVitals = db.vitals.list();
  const today = new Date().toISOString().slice(0, 10);
  const nameOf = (pid: string) => db.patients.get(pid)?.name ?? wardPatients.find(p => p.patientId === pid)?.name ?? pid;

  const todaysLocal = allVitals.filter(v => v.recordedAt.slice(0, 10) === today);
  const abnormalLocal = allVitals.filter(v => v.abnormal);
  const todaysApi = apiVitals.filter(v => v.recordedAt.slice(0, 10) === today);
  const abnormalApi = apiVitals.filter(v => v.abnormal);
  const rowsLocal = tab === 'critical' || tab === 'abnormal' ? abnormalLocal : tab === 'recorded' ? todaysLocal : allVitals;
  const rowsApi = tab === 'critical' || tab === 'abnormal' ? abnormalApi : tab === 'recorded' ? todaysApi : apiVitals;

  const save = () => run(
    'vital-save',
    `Recording vitals for ${patient?.name}…`,
    async () => {
      if (!patient?.patientId || !patient.admissionId) return { ok: false as const, message: 'Select an admitted patient first' };
      const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
      if (apiOn && /^\d+$/.test(patient.patientId)) {
        const bpSys = num(vals.bpSys);
        const bpDia = num(vals.bpDia);
        const bloodPressure = bpSys != null && bpDia != null ? `${bpSys}/${bpDia}` : undefined;
        const v = await createNursingVital({
          personId: Number(patient.patientId),
          admissionId: /^\d+$/.test(patient.admissionId) ? Number(patient.admissionId) : undefined,
          bloodPressure,
          temperatureC: num(vals.temp),
          pulseBpm: num(vals.pulse),
          respiratoryRate: num(vals.resp),
          spo2Pct: num(vals.spo2),
          weightKg: num(vals.weight),
          heightCm: num(vals.height),
          bloodSugar: num(vals.bloodSugar),
          painScore: num(vals.painScore),
          notes: vals.notes || undefined,
          recordedBy: 'NO Adaeze',
        });
        await refreshApi();
        return { ok: true as const, abnormal: v.abnormal, flags: vitalFlags(v) };
      }
      const v = nursing.recordVital({
        admissionId: patient.admissionId, patientId: patient.patientId,
        bpSys: num(vals.bpSys), bpDia: num(vals.bpDia), pulse: num(vals.pulse), temp: num(vals.temp),
        resp: num(vals.resp), spo2: num(vals.spo2), weight: num(vals.weight), height: num(vals.height),
        bloodSugar: num(vals.bloodSugar), painScore: num(vals.painScore),
        notes: vals.notes, recordedBy: 'NO Adaeze',
      });
      return { ok: true as const, abnormal: v.abnormal, flags: v.flags };
    },
    r => r.abnormal
      ? `⚠ Vitals saved for ${patient?.name} — ABNORMAL: ${r.flags.join(', ')}. Doctor notified.`
      : `Vitals saved for ${patient?.name} — all within normal range.`,
    r => r.message ?? 'Could not save vitals',
  ).then(r => { if (r && 'ok' in r && r.ok) { setOpen(false); reset(); } });

  const todaysCount = apiOn ? todaysApi.length : todaysLocal.length;
  const abnormalCount = apiOn ? abnormalApi.length : abnormalLocal.length;

  return (
    <Shell title="Vital Signs">
      <Section icon={<HeartPulse className="h-5 w-5" />} title="Vital Signs Center" desc="Record, trend, and review patient vitals. Abnormal values auto-escalate to the doctor."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Record Vital</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Vitals Recorded Today" value={String(todaysCount)} icon={HeartPulse} />
        <SummaryCard title="Abnormal / Critical" value={String(abnormalCount)} subtitle="Escalate to doctor" icon={Siren} />
        <SummaryCard title="Ward Patients" value={String(wardPatients.length)} subtitle="Admitted now" icon={Users} />
        <SummaryCard title="Abnormal BP" value={String(apiOn ? apiVitals.filter(v => vitalFlags(v).some(f => f.startsWith('BP'))).length : allVitals.filter(v => v.flags.some(f => f.startsWith('BP'))).length)} subtitle="≥140/90 or low" icon={AlertTriangle} />
        <SummaryCard title="Low SpO₂" value={String(apiOn ? apiVitals.filter(v => vitalFlags(v).some(f => f.startsWith('SpO'))).length : allVitals.filter(v => v.flags.some(f => f.startsWith('SpO'))).length)} subtitle="<94%" icon={Wind} />
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recorded">Today</TabsTrigger>
            <TabsTrigger value="critical">Critical / Abnormal</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>BP</TableHead><TableHead>Pulse</TableHead><TableHead>Temp</TableHead><TableHead>SpO₂</TableHead><TableHead>Flags</TableHead><TableHead>Nurse</TableHead></TableRow></TableHeader>
              <TableBody>
                {apiOn ? (
                  rowsApi.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No vitals recorded yet. Tap “Record Vital”.</TableCell></TableRow>
                  ) : rowsApi.map(v => {
                    const flags = vitalFlags(v);
                    return (
                      <TableRow key={v.vitalId} className={v.abnormal ? 'bg-rose-50/40' : ''}>
                        <TableCell className="font-mono text-xs">{v.recordedAt.slice(11, 16)}</TableCell>
                        <TableCell className="font-medium">{nursingCarePersonName(v.person) || nameOf(String(v.personId))}</TableCell>
                        <TableCell>{v.bloodPressure ?? '—'}</TableCell>
                        <TableCell>{v.pulseBpm ?? '—'}</TableCell>
                        <TableCell>{v.temperatureC ?? '—'}</TableCell>
                        <TableCell>{v.spo2Pct ?? '—'}</TableCell>
                        <TableCell>{flags.length ? <Pill2 tone="red">{flags.join(', ')}</Pill2> : <Pill2 tone="green">Normal</Pill2>}</TableCell>
                        <TableCell className="text-xs">{v.recordedBy ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })
                ) : rowsLocal.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No vitals recorded yet. Tap “Record Vital”.</TableCell></TableRow>
                ) : rowsLocal.map(v => (
                  <TableRow key={v.id} className={v.abnormal ? 'bg-rose-50/40' : ''}>
                    <TableCell className="font-mono text-xs">{v.recordedAt.slice(11, 16)}</TableCell>
                    <TableCell className="font-medium">{nameOf(v.patientId)}</TableCell>
                    <TableCell>{v.bpSys ?? '—'}/{v.bpDia ?? '—'}</TableCell>
                    <TableCell>{v.pulse ?? '—'}</TableCell>
                    <TableCell>{v.temp ?? '—'}</TableCell>
                    <TableCell>{v.spo2 ?? '—'}</TableCell>
                    <TableCell>{v.flags.length ? <Pill2 tone="red">{v.flags.join(', ')}</Pill2> : <Pill2 tone="green">Normal</Pill2>}</TableCell>
                    <TableCell className="text-xs">{v.recordedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record Vital Signs</DialogTitle><DialogDescription>Enter measured values. Abnormal ranges are flagged automatically.</DialogDescription></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Patient</Label>
              <SearchableSelect
                value={patient?.id ?? ''}
                onChange={(v) => setPatient(wardPatients.find(p => p.id === v) ?? null)}
                placeholder="Select admitted patient"
                options={wardPatients.map(p => ({ value: p.id, label: p.name, sub: `${p.ward}/${p.bed}` }))}
              />
            </div>
            {([['BP Systolic', 'bpSys', '120'], ['BP Diastolic', 'bpDia', '80'], ['Pulse', 'pulse', '78'], ['Temperature (°C)', 'temp', '36.7'], ['Respiratory Rate', 'resp', '16'], ['SpO₂ (%)', 'spo2', '98'], ['Weight (kg)', 'weight', '71'], ['Height (cm)', 'height', '174'], ['Blood Sugar (mmol/L)', 'bloodSugar', '5.4'], ['Pain Score (0-10)', 'painScore', '2']] as const).map(([l, k, ph]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input type="number" value={vals[k]} onChange={e => setVals({ ...vals, [k]: e.target.value })} placeholder={ph} /></div>
            ))}
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={vals.notes} onChange={e => setVals({ ...vals, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('vital-save')} loadingText="Saving…" onClick={save}>Save Vitals</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   5. MEDICATION ADMIN (MAR)
   ===================================================================== */
const marTone = (st: string) => {
  switch (st) {
    case 'GIVEN': return 'green';
    case 'DUE': return 'amber';
    case 'MISSED': return 'red';
    case 'REFUSED': return 'orange';
    case 'HELD': return 'purple';
    default: return 'sky';
  }
};
export const NurseMar = () => {
  const nursing = useNursing();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const localRows = nursing.listMar();
  const [apiRows, setApiRows] = useState<NursingMarEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [missOpen, setMissOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const { run, isBusy } = useAsyncAction();

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiRows(await listNursingMar());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load MAR');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const nameOf = (pid: string) => {
    if (apiOn) {
      const n = apiRows.find(x => String(x.personId) === pid);
      if (n?.person) return nursingOpsPersonName(n.person);
    }
    return db.patients.get(pid)?.name ?? pid;
  };
  const today = new Date().toISOString().slice(0, 10);

  type MarView = {
    id: string;
    patientId: string;
    patientName: string;
    drug: string;
    dose: string;
    route: string;
    frequency: string;
    scheduledTime: string;
    kind: string;
    status: string;
    pharmacyDispensed: boolean;
    administeredAt: string | null;
  };

  const rows: MarView[] = apiOn
    ? apiRows.map(r => ({
      id: String(r.marId),
      patientId: String(r.personId),
      patientName: nursingOpsPersonName(r.person) || nameOf(String(r.personId)),
      drug: r.drug,
      dose: r.dose,
      route: r.route,
      frequency: r.frequency,
      scheduledTime: r.scheduledTime,
      kind: r.kind,
      status: r.status,
      pharmacyDispensed: r.pharmacyDispensed,
      administeredAt: r.administeredAt,
    }))
    : localRows.map(r => ({
      id: r.id,
      patientId: r.patientId,
      patientName: nameOf(r.patientId),
      drug: r.drug,
      dose: r.dose,
      route: r.route,
      frequency: r.frequency,
      scheduledTime: r.scheduledTime,
      kind: r.kind,
      status: r.status,
      pharmacyDispensed: r.pharmacyDispensed,
      administeredAt: r.administeredAt ?? null,
    }));

  const active = rows.find(r => r.id === activeId) ?? null;
  const filtered = rows.filter(r =>
    tab === 'all' || (tab === 'due' && r.status === 'DUE') || (tab === 'pending' && r.status === 'PENDING') ||
    (tab === 'given' && r.status === 'GIVEN') || (tab === 'missed' && r.status === 'MISSED') || (tab === 'refused' && r.status === 'REFUSED'));

  const give = () => run(
    `mar-${active?.id}`,
    `Administering ${active?.drug}…`,
    async () => {
      if (!active) return { ok: false as const, message: 'No medication selected' };
      if (apiOn) {
        await administerMar(Number(active.id));
        await refreshApi();
        return { ok: true as const };
      }
      return nursing.administerMed(active.id, 'NO Adaeze');
    },
    () => `${active?.drug} given to ${active?.patientName ?? ''} at ${new Date().toLocaleTimeString()}.`,
    r => (r && 'message' in r ? r.message : undefined) ?? 'Could not record administration',
  ).then(() => setActiveId(null));

  const refuseMissOrHold = async (kind: 'refuse' | 'miss' | 'hold', reason: string) => {
    if (!active) return;
    try {
      if (apiOn) {
        if (kind === 'refuse') await refuseMar(Number(active.id), reason);
        else if (kind === 'miss') await missMar(Number(active.id), reason);
        else await holdMar(Number(active.id), reason);
        await refreshApi();
        toast.success(
          kind === 'refuse' ? 'Medication refused' : kind === 'miss' ? 'Dose marked missed' : 'Medication held',
        );
      } else if (kind === 'refuse') {
        const r = nursing.refuseMed(active.id, reason, 'NO Adaeze');
        toast.success(r.message);
      } else if (kind === 'miss') {
        const r = nursing.missMed(active.id, reason, 'NO Adaeze');
        toast.success(r.message);
      } else {
        const r = nursing.holdMed(active.id, reason, 'NO Adaeze');
        toast.success(r.message);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update medication');
    }
    setActiveId(null);
  };

  return (
    <Shell title="MAR">
      <Section icon={<Pill className="h-5 w-5" />} title="Medication Administration Record"
        desc={`Scheduled · PRN · Emergency · External medications from doctor orders + pharmacy. Administer, refuse, or mark missed.${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Medications Due" value={String(rows.filter(r => r.status === 'DUE').length)} icon={Clock} />
        <SummaryCard title="Given Today" value={String(rows.filter(r => r.status === 'GIVEN' && (r.administeredAt ?? '').slice(0, 10) === today).length)} icon={CheckCircle2} />
        <SummaryCard title="Missed Doses" value={String(rows.filter(r => r.status === 'MISSED').length)} icon={AlertTriangle} />
        <SummaryCard title="Refused" value={String(rows.filter(r => r.status === 'REFUSED').length)} icon={X} />
        <SummaryCard title="Pending / Awaiting Pharmacy" value={String(rows.filter(r => r.status === 'PENDING').length)} icon={Pill} />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="due">Due</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="given">Given</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="refused">Refused</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Table>
              <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Drug</TableHead><TableHead>Route</TableHead><TableHead>Schedule</TableHead><TableHead>Type</TableHead><TableHead>Pharmacy</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No medications in this category. Doctor drug orders appear here automatically.</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.drug}</TableCell>
                    <TableCell>{r.route}</TableCell>
                    <TableCell className="font-mono text-xs">{r.scheduledTime}</TableCell>
                    <TableCell>{r.kind}</TableCell>
                    <TableCell>{r.pharmacyDispensed ? <Pill2 tone="green">Dispensed</Pill2> : <Pill2 tone="amber">Awaiting</Pill2>}</TableCell>
                    <TableCell><Pill2 tone={marTone(r.status)}>{r.status}</Pill2></TableCell>
                    <TableCell><Button size="sm" variant="outline" disabled={r.status === 'GIVEN'} onClick={() => setActiveId(r.id)}>Administer</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActiveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Administer Medication</DialogTitle><DialogDescription>Verify the five rights before recording.</DialogDescription></DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-semibold">{active.patientName}</div></div>
                <div><div className="text-xs text-muted-foreground">Drug</div><div className="font-semibold">{active.drug}</div></div>
                <div><div className="text-xs text-muted-foreground">Route</div><div>{active.route}</div></div>
                <div><div className="text-xs text-muted-foreground">Frequency</div><div>{active.frequency}</div></div>
                <div><div className="text-xs text-muted-foreground">Scheduled</div><div className="font-mono">{active.scheduledTime}</div></div>
                <div><div className="text-xs text-muted-foreground">Pharmacy</div><div>{active.pharmacyDispensed ? 'Dispensed' : 'Awaiting dispensing'}</div></div>
              </div>
              {!active.pharmacyDispensed && <div className="text-xs text-amber-600">⚠ Pharmacy has not confirmed dispensing for this order.</div>}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRefuseOpen(true)}>Refuse</Button>
            <Button variant="outline" className="flex-1" onClick={() => setMissOpen(true)}>Mark Missed</Button>
            <Button variant="outline" className="flex-1" onClick={() => setHoldOpen(true)}>Hold</Button>
            <LoadingButton className="flex-1" loading={isBusy(`mar-${active?.id}`)} loadingText="Recording…" onClick={give}>Give Medication</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonModal open={refuseOpen} onOpenChange={setRefuseOpen} title="Refuse Medication"
        options={['Patient refused', 'Patient asleep', 'Vomiting', 'Doctor withheld', 'Other']}
        onConfirm={(reason) => { void refuseMissOrHold('refuse', reason); }} />
      <ReasonModal open={missOpen} onOpenChange={setMissOpen} title="Mark Dose Missed"
        options={['Patient absent', 'Drug unavailable', 'Procedure ongoing', 'NPO order', 'Other']}
        onConfirm={(reason) => { void refuseMissOrHold('miss', reason); }} />
      <ReasonModal open={holdOpen} onOpenChange={setHoldOpen} title="Hold Medication"
        options={['Doctor order hold', 'NPO', 'Vital signs unstable', 'Awaiting investigation', 'Other']}
        onConfirm={(reason) => { void refuseMissOrHold('hold', reason); }} />
    </Shell>
  );
};

/* =====================================================================
   6. EXTERNAL MEDICATION
   ===================================================================== */
export const NurseExternalMeds = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ patientId: '', drug: '', source: '', prescriber: '', dose: '', freq: '', start: '', notes: '' });
  const [apiRows, setApiRows] = useState<NursingMarEntry[]>([]);
  const { run, isBusy } = useAsyncAction();
  const localExternal = db.mar.list().filter(m => m.kind === 'External');

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiRows(await listNursingMar({ kind: 'External' }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load external medications');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const external = apiOn ? apiRows : null;

  const save = () => run(
    'ext-med-save',
    'Saving external medication…',
    async () => {
      const p = wardPatients.find(w => w.patientId === f.patientId || w.id === f.patientId);
      if (!p?.patientId) return { ok: false as const, message: 'Select an admitted patient' };
      if (!f.drug.trim()) return { ok: false as const, message: 'Drug name is required' };
      if (apiOn && /^\d+$/.test(p.patientId)) {
        await createExternalMar({
          personId: Number(p.patientId),
          admissionId: p.admissionId && /^\d+$/.test(p.admissionId) ? Number(p.admissionId) : undefined,
          drug: f.drug.trim(),
          dose: f.dose || undefined,
          route: 'PO',
          frequency: f.freq || undefined,
          scheduledTime: f.start || undefined,
          source: f.source || undefined,
          prescriber: f.prescriber || undefined,
          notes: f.notes || undefined,
        });
        await refreshApi();
        return { ok: true as const, drug: f.drug.trim(), name: p.name };
      }
      if (!p.admissionId) return { ok: false as const, message: 'Select an admitted patient' };
      const row = nursing.addExternalMed({
        admissionId: p.admissionId,
        patientId: p.patientId,
        drug: f.drug.trim(),
        dose: f.dose || '—',
        route: 'PO',
        frequency: f.freq || '—',
        scheduledTime: f.start || new Date().toISOString(),
        administeredBy: 'NO Adaeze',
        administeredAt: new Date().toISOString(),
        sideEffects: [f.source && `Source: ${f.source}`, f.prescriber && `Rx: ${f.prescriber}`, f.notes].filter(Boolean).join(' · ') || undefined,
      });
      return { ok: true as const, drug: row.drug, name: p.name };
    },
    r => `${r.drug} recorded for ${r.name}`,
    r => (r && 'message' in r ? r.message : undefined) ?? 'Could not save',
  ).then(r => {
    if (r && 'ok' in r && r.ok) {
      setOpen(false);
      setF({ patientId: '', drug: '', source: '', prescriber: '', dose: '', freq: '', start: '', notes: '' });
    }
  });

  const pendingCount = apiOn
    ? (external ?? []).filter(m => m.status === 'PENDING').length
    : localExternal.filter(m => m.status === 'PENDING').length;
  const givenCount = apiOn
    ? (external ?? []).filter(m => m.status === 'GIVEN').length
    : localExternal.filter(m => m.status === 'GIVEN').length;
  const totalCount = apiOn ? (external ?? []).length : localExternal.length;

  return (
    <Shell title="External Medication">
      <Section icon={<Plus className="h-5 w-5" />} title="External Medication Recording"
        desc={`Document drugs brought from outside the hospital pharmacy for full administration history.${apiOn ? ' · API' : ' · Local'}`}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Add External Medication</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="External Meds Recorded" value={String(totalCount)} icon={Pill} />
        <SummaryCard title="Pending Review" value={String(pendingCount)} icon={Clock} />
        <SummaryCard title="Given / Logged" value={String(givenCount)} icon={CheckCircle2} />
        <SummaryCard title="Ward Patients" value={String(wardPatients.length)} icon={Users} />
      </div>
      <Card>
        <div className="font-semibold text-sm mb-3">Recently Logged External Meds</div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Drug</TableHead><TableHead>Dose</TableHead><TableHead>By</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              (external ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No external medications recorded yet.</TableCell></TableRow>
              ) : (external ?? []).slice().reverse().map(m => (
                <TableRow key={m.marId}>
                  <TableCell>{nursingOpsPersonName(m.person) || String(m.personId)}</TableCell>
                  <TableCell>{m.drug}</TableCell>
                  <TableCell>{m.dose}</TableCell>
                  <TableCell className="text-xs">{m.administeredBy ?? m.prescriber ?? '—'}</TableCell>
                  <TableCell className="text-xs">{(m.administeredAt ?? m.createdAt).slice(0, 10)}</TableCell>
                  <TableCell><Pill2 tone="green">{m.status}</Pill2></TableCell>
                </TableRow>
              ))
            ) : localExternal.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No external medications recorded yet.</TableCell></TableRow>
            ) : localExternal.slice().reverse().map(m => (
              <TableRow key={m.id}>
                <TableCell>{db.patients.get(m.patientId)?.name ?? m.patientId}</TableCell>
                <TableCell>{m.drug}</TableCell>
                <TableCell>{m.dose}</TableCell>
                <TableCell className="text-xs">{m.administeredBy ?? '—'}</TableCell>
                <TableCell className="text-xs">{(m.administeredAt ?? m.updatedAt).slice(0, 10)}</TableCell>
                <TableCell><Pill2 tone="green">{m.status}</Pill2></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add External Medication</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Patient</Label>
              <SearchableSelect
                value={f.patientId}
                onChange={v => setF({ ...f, patientId: v })}
                placeholder="Select admitted patient"
                options={wardPatients.map(p => ({ value: p.patientId ?? p.id, label: p.name, sub: `${p.ward}/${p.bed}` }))}
              />
            </div>
            {([['Drug Name', 'drug'], ['Source', 'source'], ['Prescribed By', 'prescriber'], ['Dose', 'dose'], ['Frequency', 'freq'], ['Start Date', 'start']] as const).map(([l, k]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('ext-med-save')} loadingText="Saving…" onClick={save}>Save Record</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   7. OBSERVATION CENTER
   ===================================================================== */
export const NurseObservation = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  useDbTick();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ patientId: '', level: '', behaviour: '', risk: '', notes: '', by: 'N. Adaeze' });
  const [apiRows, setApiRows] = useState<NursingCareObservation[]>([]);
  const { run, isBusy } = useAsyncAction();
  const localRows = db.observations.list().filter(o => o.chart === 'Psychiatric' || o.chart === 'Observation');
  const today = new Date().toISOString().slice(0, 10);

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const rows = await listNursingObservations();
      setApiRows(rows.filter(o => o.chart === 'Psychiatric' || o.chart === 'Observation'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load observations');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const todays = apiOn
    ? apiRows.filter(o => o.recordedAt.slice(0, 10) === today)
    : localRows.filter(o => o.recordedAt.slice(0, 10) === today);
  const high = apiOn
    ? apiRows.filter(o => String(o.fields.risk ?? '').toLowerCase().includes('critical') || String(o.fields.level ?? '') === 'L4' || String(o.fields.level ?? '') === 'L3')
    : localRows.filter(o => String(o.fields.risk ?? '').toLowerCase().includes('critical') || String(o.fields.level ?? '') === 'L4' || String(o.fields.level ?? '') === 'L3');
  const totalCount = apiOn ? apiRows.length : localRows.length;

  const save = () => run(
    'obs-save',
    'Logging observation…',
    async () => {
      const p = wardPatients.find(w => w.patientId === f.patientId || w.id === f.patientId);
      if (!p?.patientId || !p.admissionId) return { ok: false as const, message: 'Select an admitted patient' };
      if (!f.level) return { ok: false as const, message: 'Observation level is required' };
      const fields = { level: f.level, risk: f.risk, behaviour: f.behaviour, notes: f.notes };
      const interval = f.level === 'L2' ? '15min' : f.level === 'L3' || f.level === 'L4' ? '15min' : 'hourly';
      if (apiOn && /^\d+$/.test(p.patientId)) {
        await createNursingObservation({
          personId: Number(p.patientId),
          admissionId: /^\d+$/.test(p.admissionId) ? Number(p.admissionId) : undefined,
          chart: 'Psychiatric',
          interval,
          fields,
          recordedBy: f.by || 'NO Adaeze',
        });
        await refreshApi();
      } else {
        nursing.addObservation({
          admissionId: p.admissionId,
          patientId: p.patientId,
          chart: 'Psychiatric',
          interval: interval as '15min' | '30min' | 'hourly' | '2hourly',
          fields,
          recordedBy: f.by || 'NO Adaeze',
        });
      }
      return { ok: true as const, name: p.name };
    },
    r => `${r.name} · ${f.level} logged`,
    r => r.message ?? 'Could not save',
  ).then(r => {
    if (r && 'ok' in r && r.ok) {
      setOpen(false);
      setF({ patientId: '', level: '', behaviour: '', risk: '', notes: '', by: 'N. Adaeze' });
    }
  });

  return (
    <Shell title="Observation Center">
      <Section icon={<Eye className="h-5 w-5" />} title="Psychiatric Observation Levels"
        desc={`L1 (general) · L2 (15-min) · L3 (constant) · L4 (2:1).${apiOn ? ' · API' : ' · Local'}`}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Log Check</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Logged Today" value={String(todays.length)} icon={CheckCircle2} />
        <SummaryCard title="Total Checks" value={String(totalCount)} icon={Eye} />
        <SummaryCard title="High-Risk (L3/L4)" value={String(high.length)} icon={Siren} />
        <SummaryCard title="Ward Patients" value={String(wardPatients.length)} icon={Users} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Level</TableHead><TableHead>Risk</TableHead><TableHead>Behaviour</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              apiRows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No observation checks logged yet.</TableCell></TableRow>
              ) : apiRows.slice().reverse().map(o => (
                <TableRow key={o.observationId}>
                  <TableCell className="font-mono text-xs">{o.recordedAt.slice(11, 16)}</TableCell>
                  <TableCell>{nursingCarePersonName(o.person) || wardPatients.find(p => p.patientId === String(o.personId))?.name || String(o.personId)}</TableCell>
                  <TableCell><Pill2 tone={String(o.fields.level) === 'L4' ? 'purple' : String(o.fields.level) === 'L3' ? 'red' : 'sky'}>{String(o.fields.level ?? '—')}</Pill2></TableCell>
                  <TableCell>{String(o.fields.risk ?? '—')}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{String(o.fields.behaviour ?? o.fields.notes ?? '—')}</TableCell>
                  <TableCell className="text-xs">{o.recordedBy ?? '—'}</TableCell>
                </TableRow>
              ))
            ) : localRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No observation checks logged yet.</TableCell></TableRow>
            ) : localRows.slice().reverse().map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.recordedAt.slice(11, 16)}</TableCell>
                <TableCell>{db.patients.get(o.patientId)?.name ?? o.patientId}</TableCell>
                <TableCell><Pill2 tone={String(o.fields.level) === 'L4' ? 'purple' : String(o.fields.level) === 'L3' ? 'red' : 'sky'}>{String(o.fields.level ?? '—')}</Pill2></TableCell>
                <TableCell>{String(o.fields.risk ?? '—')}</TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{String(o.fields.behaviour ?? o.fields.notes ?? '—')}</TableCell>
                <TableCell className="text-xs">{o.recordedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Observation Check</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Patient</Label>
              <SearchableSelect
                value={f.patientId}
                onChange={v => setF({ ...f, patientId: v })}
                placeholder="Select patient"
                options={wardPatients.map(p => ({ value: p.patientId ?? p.id, label: p.name, sub: `${p.ward}/${p.bed}` }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Observation Level</Label>
                <SearchableSelect
                  value={f.level}
                  onChange={v => setF({ ...f, level: v })}
                  placeholder="L1–L4"
                  options={['L1', 'L2', 'L3', 'L4'].map(x => ({ value: x, label: x }))}
                />
              </div>
              <div><Label className="text-xs">Risk Status</Label>
                <SearchableSelect
                  value={f.risk}
                  onChange={v => setF({ ...f, risk: v })}
                  placeholder="Low / Mod / High"
                  options={['Low', 'Moderate', 'High', 'Critical'].map(x => ({ value: x, label: x }))}
                />
              </div>
            </div>
            <div><Label className="text-xs">Behaviour Status</Label><Input value={f.behaviour} onChange={e => setF({ ...f, behaviour: e.target.value })} placeholder="Calm, agitated, asleep…" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={3} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
            <div><Label className="text-xs">Checked By</Label><Input value={f.by} onChange={e => setF({ ...f, by: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('obs-save')} loadingText="Saving…" onClick={save}>Save Check</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   8. ICU NURSING
   ===================================================================== */
type IcuBedView = {
  key: string;
  p: string;
  bp: string;
  spo2: string;
  vent: string;
  t: string;
  cls: string;
  personId?: number;
  admissionId?: number;
};

const MOCK_ICU_BEDS: IcuBedView[] = [
  { key: 'm1', p: 'Ngozi Ibekwe — Bed 02', bp: '92/58', spo2: '94%', vent: 'SIMV · FiO₂ 40%', t: 'red', cls: 'critical' },
  { key: 'm2', p: 'Adebayo O. — Bed 01', bp: '118/74', spo2: '97%', vent: 'CPAP · FiO₂ 30%', t: 'amber', cls: 'watch' },
  { key: 'm3', p: 'Kemi A. — Bed 03', bp: '126/80', spo2: '98%', vent: 'Off vent', t: 'green', cls: 'stable' },
];

function icuClassify(row: NursingIcuBoardRow): Pick<IcuBedView, 't' | 'cls'> {
  const spo2 = row.latestNote?.spo2Pct;
  const vent = row.latestNote?.ventSettings ?? '';
  if (spo2 != null && spo2 < 92) return { t: 'red', cls: 'critical' };
  if (vent && !/off/i.test(vent)) return { t: 'amber', cls: 'watch' };
  return { t: 'green', cls: 'stable' };
}

export const NurseIcu = () => {
  const apiOn = isNursingOpsApiEnabled();
  const [board, setBoard] = useState<NursingIcuBoardRow[]>([]);
  const [hourly, setHourly] = useState<IcuBedView | null>(null);
  const [titrate, setTitrate] = useState<IcuBedView | null>(null);
  const [tf, setTf] = useState({ med: '', current: '', next: '', reason: '', note: '' });
  const [hf, setHf] = useState({ bp: '', spo2: '', hr: '', vent: '', note: '' });

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setBoard(await listIcuBoard());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load ICU board');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const apiBeds: IcuBedView[] = board.map(r => {
    const { t, cls } = icuClassify(r);
    const name = nursingOpsPersonName(r.person);
    const bed = r.bedLabel ? ` — ${r.bedLabel}` : '';
    return {
      key: String(r.admissionId),
      p: `${name}${bed}`,
      bp: r.latestNote?.bloodPressure ?? '—',
      spo2: r.latestNote?.spo2Pct != null ? `${r.latestNote.spo2Pct}%` : '—',
      vent: r.latestNote?.ventSettings || 'Off vent',
      t, cls,
      personId: r.personId,
      admissionId: r.admissionId,
    };
  });
  const beds = apiOn && apiBeds.length > 0 ? apiBeds : MOCK_ICU_BEDS;
  const usingApiBoard = apiOn && apiBeds.length > 0;

  const critical = beds.filter(b => b.cls === 'critical').length;
  const watch = beds.filter(b => b.cls === 'watch').length;
  const stable = beds.filter(b => b.cls === 'stable').length;
  const ventCount = beds.filter(b => b.vent !== 'Off vent').length;

  const openHourly = (p: IcuBedView) => {
    setHf({ bp: p.bp === '—' ? '' : p.bp, spo2: p.spo2.replace('%', ''), hr: '', vent: p.vent, note: '' });
    setHourly(p);
  };

  const saveHourly = async () => {
    if (!hourly) return;
    try {
      if (usingApiBoard && hourly.personId != null) {
        await createIcuNote({
          personId: hourly.personId,
          admissionId: hourly.admissionId,
          bloodPressure: hf.bp || undefined,
          spo2Pct: hf.spo2 ? Number(hf.spo2) : undefined,
          heartRate: hf.hr ? Number(hf.hr) : undefined,
          ventSettings: hf.vent || undefined,
          note: hf.note || undefined,
        });
        await refreshApi();
      }
      const p = hourly.p;
      setHourly(null);
      notifySuccess({ title: 'ICU hourly note saved', message: `${p} — hourly entry recorded.` });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save ICU note');
    }
  };

  const saveTitrate = async () => {
    if (!titrate) return;
    try {
      if (usingApiBoard && titrate.personId != null) {
        if (!tf.med.trim()) {
          toast.error('Medication / infusion is required');
          return;
        }
        await createIcuInfusion({
          personId: titrate.personId,
          admissionId: titrate.admissionId,
          medication: tf.med.trim(),
          currentRate: tf.current || undefined,
          newRate: tf.next || undefined,
          reason: tf.reason || undefined,
          note: tf.note || undefined,
        });
        await refreshApi();
      }
      const p = titrate.p;
      setTitrate(null);
      notifySuccess({ title: 'Infusion titrated successfully', message: `${p} — ${tf.med || 'infusion'} updated to ${tf.next || 'new rate'}.` });
      setTf({ med: '', current: '', next: '', reason: '', note: '' });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save titration');
    }
  };

  return (
    <Shell title="ICU Nursing">
      <Section icon={<Activity className="h-5 w-5" />} title="ICU Monitoring Board"
        desc={`Critical vitals · ventilator tracking · hourly ICU notes · drug infusions.${usingApiBoard ? ' · API' : apiOn ? ' · Local fallback' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Critical Patients" value={String(critical)} icon={Activity} />
        <SummaryCard title="Watch Patients" value={String(watch)} icon={Eye} />
        <SummaryCard title="Stable Patients" value={String(stable)} icon={HeartPulse} />
        <SummaryCard title="Ventilator Patients" value={String(ventCount)} icon={Wind} />
        <SummaryCard title="ICU Medication Due" value={usingApiBoard ? '—' : '4'} icon={Pill} />
        <SummaryCard title="Hourly Notes Pending" value={usingApiBoard ? '—' : '2'} icon={Clock} />
      </div>
      <Card>
        <Tabs defaultValue="all">
          <TabsList className="mb-3">
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="watch">Watch</TabsTrigger>
            <TabsTrigger value="stable">Stable</TabsTrigger>
            <TabsTrigger value="vent">Ventilator</TabsTrigger>
            <TabsTrigger value="all">All ICU</TabsTrigger>
          </TabsList>
          {(['critical', 'watch', 'stable', 'vent', 'all'] as const).map(t => (
            <TabsContent key={t} value={t}>
              <div className="grid lg:grid-cols-3 gap-4">
                {beds.filter(b => t === 'all' || (t === 'vent' ? b.vent !== 'Off vent' : b.cls === t)).map(p => (
                  <Card key={p.key}>
                    <div className="font-semibold mb-2">{p.p}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 border rounded"><div className="text-muted-foreground">BP</div><div className="font-bold">{p.bp}</div></div>
                      <div className="p-2 border rounded"><div className="text-muted-foreground">SpO₂</div><div className="font-bold">{p.spo2}</div></div>
                      <div className="col-span-2 p-2 border rounded"><div className="text-muted-foreground">Ventilator</div><div className="font-bold">{p.vent}</div></div>
                    </div>
                    <Pill2 tone={p.t}>{p.t === 'red' ? 'Critical' : p.t === 'amber' ? 'Watch' : 'Stable'}</Pill2>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openHourly(p)}>Hourly Note</Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setTitrate(p)}>Titrate</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <Dialog open={!!hourly} onOpenChange={v => !v && setHourly(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ICU Hourly Note — {hourly?.p}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><Label>BP</Label><Input value={hf.bp} onChange={e => setHf({ ...hf, bp: e.target.value })} /></div>
              <div><Label>SpO₂</Label><Input value={hf.spo2} onChange={e => setHf({ ...hf, spo2: e.target.value })} /></div>
              <div><Label>HR</Label><Input value={hf.hr} onChange={e => setHf({ ...hf, hr: e.target.value })} placeholder="80" /></div>
            </div>
            <div><Label className="text-xs">Vent settings</Label><Input value={hf.vent} onChange={e => setHf({ ...hf, vent: e.target.value })} /></div>
            <div><Label className="text-xs">Hourly note</Label><Textarea rows={4} value={hf.note} onChange={e => setHf({ ...hf, note: e.target.value })} placeholder="Sedation, fluids, output, neuro status…" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHourly(null)}>Cancel</Button>
            <Button onClick={() => { void saveHourly(); }}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!titrate} onOpenChange={v => !v && setTitrate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Titrate Infusion — {titrate?.p}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Medication / Infusion</Label><Input value={tf.med} onChange={e => setTf({ ...tf, med: e.target.value })} placeholder="e.g. Noradrenaline" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Current Rate</Label><Input value={tf.current} onChange={e => setTf({ ...tf, current: e.target.value })} placeholder="0.08 mcg/kg/min" /></div>
              <div><Label className="text-xs">New Rate</Label><Input value={tf.next} onChange={e => setTf({ ...tf, next: e.target.value })} placeholder="0.1 mcg/kg/min" /></div>
            </div>
            <div><Label className="text-xs">Reason</Label><Input value={tf.reason} onChange={e => setTf({ ...tf, reason: e.target.value })} placeholder="MAP < 65" /></div>
            <div><Label className="text-xs">Nurse note</Label><Textarea rows={3} value={tf.note} onChange={e => setTf({ ...tf, note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTitrate(null)}>Cancel</Button>
            <Button onClick={() => { void saveTitrate(); }}>Save Titration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   9. SPECIALIZED CHARTS
   ===================================================================== */
export const NurseCharts = () => {
  const charts = [
    { n: 'Medication Chart', i: Pill }, { n: 'Observation Chart', i: Eye }, { n: 'ICU Chart', i: Activity },
    { n: 'SpO₂ Chart', i: Wind }, { n: 'Turning Chart', i: ArrowRightLeft }, { n: 'Baby Feeding Chart', i: Baby },
    { n: 'Partograph', i: Baby }, { n: 'Fluid Balance Chart', i: Droplets }, { n: '4-Hourly BP Chart', i: HeartPulse },
    { n: 'Level 3 Observation', i: Eye }, { n: 'Level 4 Observation', i: Eye },
  ];
  const [open, setOpen] = useState<string | null>(null);
  const [patient, setPatient] = useState('');
  const [data, setData] = useState('');
  return (
    <Shell title="Specialized Charts">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Specialized Nursing Charts"
        desc="Tap any chart to record bedside data. Charts auto-link to the patient timeline." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map(c => (
          <Card key={c.n} className="hover:border-primary transition">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><c.i className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{c.n}</div>
                <div className="text-xs text-muted-foreground">Open chart workspace</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setOpen(c.n); setPatient(''); setData(''); }}>Open</Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={v => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{open}</DialogTitle><DialogDescription>Search a patient, fill the chart, then save or print.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Patient</Label>
              <SearchableSelect
                value={patient}
                onChange={setPatient}
                placeholder="Select patient"
                options={PATIENTS.map(p => ({ value: p.name, label: p.name, sub: `${p.ward}/${p.bed}` }))}
              />
            </div>
            <div><Label className="text-xs">Chart entries</Label><Textarea rows={6} value={data} onChange={e => setData(e.target.value)} placeholder={`Enter ${open?.toLowerCase()} values, columns, timings…`} /></div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success('Chart draft saved')}><Save className="h-3 w-3 mr-1" />Save Draft</Button>
            <Button variant="outline" onClick={() => toast.success('Chart sent to printer')}><Printer className="h-3 w-3 mr-1" />Print Chart</Button>
            <Button onClick={() => { const n = open; setOpen(null); notifySuccess({ title: 'Chart submitted', message: `${n} saved for ${patient || 'patient'}.` }); }}>Submit Chart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   10. SHIFT DASHBOARD
   ===================================================================== */
const SHIFT_WINDOWS: Record<string, string> = {
  Morning: '07:00 – 14:00',
  Afternoon: '14:00 – 21:00',
  Night: '21:00 – 07:00',
};

export const NurseShifts = () => {
  const apiOn = isNursingOpsApiEnabled();
  const [current, setCurrent] = useState<NursingShift | null>(null);
  const [shifts, setShifts] = useState<NursingShift[]>([]);
  const [startKind, setStartKind] = useState<'Morning' | 'Afternoon' | 'Night'>('Morning');

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const [cur, list] = await Promise.all([
        getCurrentNursingShift(),
        listNursingShifts(),
      ]);
      setCurrent(cur);
      setShifts(list);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load shifts');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const startShift = async () => {
    if (!apiOn) {
      notifySuccess({ title: 'Shift started', message: `${startKind} shift clocked in.` });
      return;
    }
    try {
      await startNursingShift({ shift: startKind, leadNurse: 'NO Adaeze', staffCount: 4 });
      await refreshApi();
      notifySuccess({ title: 'Shift started', message: `${startKind} shift clocked in.` });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start shift');
    }
  };

  const endShift = async () => {
    if (!apiOn) {
      notifySuccess({ title: 'Shift ended', message: 'Shift closed. Handover prompt opened.' });
      return;
    }
    if (!current?.shiftId) {
      toast.error('No active shift to end');
      return;
    }
    try {
      await endNursingShift(current.shiftId, 'Shift closed from nursing console.');
      await refreshApi();
      notifySuccess({ title: 'Shift ended', message: `${current.shift} shift closed. Handover prompt opened.` });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not end shift');
    }
  };

  const recentByKind = (kind: string) =>
    shifts.find(s => s.shift === kind) ?? (current?.shift === kind ? current : null);

  return (
    <Shell title="Shift Dashboard">
      <Section icon={<Clock className="h-5 w-5" />} title="Shift Operations"
        desc={`Current shift status, on-duty staff, tasks, reports, and incidents.${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Current Shift" value={apiOn ? (current?.shift ?? '—') : 'Morning'} subtitle={apiOn ? (current ? SHIFT_WINDOWS[current.shift] ?? current.status : 'No active shift') : '07:00 – 14:00'} icon={Clock} />
        <SummaryCard title="Staff On Duty" value={apiOn ? String(current?.staffCount ?? 0) : '4'} subtitle={apiOn ? `Lead: ${current?.leadNurse ?? '—'}` : 'Lead: Adaeze'} icon={Users} />
        <SummaryCard title="Patients Covered" value={apiOn ? String(current?.patientsCovered ?? 0) : '22'} subtitle={apiOn ? (current?.wardName ?? 'All wards') : 'Across 4 wards'} icon={UserRound} />
        <SummaryCard title="Pending Tasks" value={apiOn ? '—' : '7'} icon={ClipboardList} />
        <SummaryCard title="Shift Reports" value={String(apiOn ? shifts.filter(s => s.status === 'Ended').length : 2)} subtitle={apiOn ? `${shifts.filter(s => s.status === 'Active').length} active` : '1 pending review'} icon={ScrollText} />
        <SummaryCard title="Incidents" value={apiOn ? '—' : '1'} subtitle={apiOn ? undefined : 'Brief agitation 03:20'} icon={AlertTriangle} />
      </div>
      <Card>
        <Section icon={<Sparkles className="h-5 w-5" />} title="Shift Actions" desc="" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-2">
            {apiOn && (
              <SearchableSelect
                value={startKind}
                onChange={v => setStartKind(v as 'Morning' | 'Afternoon' | 'Night')}
                options={['Morning', 'Afternoon', 'Night'].map(s => ({ value: s, label: s }))}
                placeholder="Shift"
              />
            )}
            <Button variant="outline" onClick={() => { void startShift(); }}>Start Shift</Button>
          </div>
          <Button variant="outline" onClick={() => { void endShift(); }}>End Shift</Button>
          <Button variant="outline" onClick={() => toast.success(apiOn ? `Loaded ${shifts.length} shift record(s)` : 'Loading shift tasks…')}>View Shift Tasks</Button>
          <Button onClick={() => notifySuccess({ title: 'Shift summary generated', message: 'Summary saved to reports.' })}>Generate Shift Summary</Button>
        </div>
      </Card>
      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        {(['Morning', 'Afternoon', 'Night'] as const).map(s => {
          const row = apiOn ? recentByKind(s) : null;
          const isActive = apiOn ? current?.shift === s && current.status === 'Active' : s === 'Morning';
          return (
            <Card key={s}>
              <div className="font-semibold mb-2">{s} Shift</div>
              <div className="text-xs text-muted-foreground mb-2">
                {SHIFT_WINDOWS[s]} · {isActive ? 'in progress' : row ? row.status.toLowerCase() : s === 'Afternoon' ? 'upcoming' : 'planned'}
              </div>
              <div className="text-sm">Lead: {apiOn ? (row?.leadNurse ?? '—') : s === 'Morning' ? 'Adaeze' : s === 'Afternoon' ? 'Bola' : 'Bisi'}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {apiOn
                  ? `Team of ${row?.staffCount ?? 0} · ${row?.patientsCovered ?? 0} patients`
                  : 'Team of 4 · 22 patients'}
              </div>
              <Pill2 tone={isActive ? 'green' : 'sky'}>{isActive ? 'Active' : row?.status === 'Ended' ? 'Ended' : 'Scheduled'}</Pill2>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
};

/* =====================================================================
   11. SHIFT HANDOVER
   ===================================================================== */
export const NurseHandover = () => {
  const nursing = useNursing();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const [summary, setSummary] = useState('');
  const [apiRows, setApiRows] = useState<NursingHandover[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({
    'Vitals up to date': true,
    'MAR reconciled': true,
    'Critical patients reviewed': true,
    'Pending tasks documented': false,
    'Incidents logged': true,
    'NOK contacts verified': false,
  });
  const { run, isBusy } = useAsyncAction();
  const localHandovers = db.handovers.list();

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiRows(await listNursingHandovers());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load handovers');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const submit = () => run(
    'handover-submit',
    'Submitting handover…',
    async () => {
      const checklist = Object.entries(checks).filter(([, v]) => v).map(([k]) => k).join('; ');
      const body = summary.trim() || 'Shift handover submitted from nursing console.';
      if (apiOn) {
        await createNursingHandover({
          shift: 'Morning',
          wardName: 'All wards',
          summary: body,
          specialInstructions: checklist ? `Checklist OK: ${checklist}` : undefined,
        });
        await refreshApi();
        return { ok: true as const };
      }
      nursing.submitHandover({
        shift: 'Morning',
        wardName: 'All wards',
        summary: body,
        criticalPatients: [],
        pendingMeds: '',
        pendingLabs: '',
        incidents: '',
        specialInstructions: checklist ? `Checklist OK: ${checklist}` : '',
        handedOverBy: 'NO Adaeze',
      });
      return { ok: true as const };
    },
    () => 'Incoming shift can acknowledge this handover.',
    () => 'Could not submit handover',
  ).then(r => {
    if (r && 'ok' in r && r.ok) setSummary('');
  });

  const acknowledge = async (handoverId: number) => {
    try {
      await acknowledgeNursingHandover(handoverId);
      await refreshApi();
      toast.success('Handover acknowledged');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not acknowledge handover');
    }
  };

  const total = apiOn ? apiRows.length : localHandovers.length;
  const awaiting = apiOn ? apiRows.filter(h => !h.acknowledged).length : localHandovers.filter(h => !h.acknowledged).length;
  const acked = apiOn ? apiRows.filter(h => h.acknowledged).length : localHandovers.filter(h => h.acknowledged).length;

  return (
    <Shell title="Shift Handover">
      <Section icon={<ArrowRightLeft className="h-5 w-5" />} title="Handover · Night → Morning"
        desc={`Structured handover with previous shift summary, pending tasks, alerts and checklist.${apiOn ? ' · API' : ' · Local'}`}
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => toast.success('Handover draft kept in editor')}><Save className="h-3 w-3 mr-1" />Save Draft</Button>
            <LoadingButton size="sm" loading={isBusy('handover-submit')} loadingText="Submitting…" onClick={submit}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Submit Handover
            </LoadingButton>
          </div>
        } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Handovers Logged" value={String(total)} icon={ArrowRightLeft} />
        <SummaryCard title="Awaiting Ack" value={String(awaiting)} icon={Clock} />
        <SummaryCard title="Acknowledged" value={String(acked)} icon={CheckCircle2} />
        <SummaryCard title="This Shift" value="Morning" icon={Users} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold mb-3">Previous Shift Summary (Night)</div>
          <ul className="text-sm space-y-2">
            <li>· Review MAR, vitals, and open incidents before accepting.</li>
            <li>· Use Submit Handover to persist for the incoming team.</li>
          </ul>
        </Card>
        <Card>
          <div className="font-semibold mb-3">Current Shift Notes (Morning)</div>
          <Textarea rows={6} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Write current shift notes…" />
        </Card>
        <Card className="lg:col-span-2">
          <div className="font-semibold mb-3">Handover Checklist</div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {Object.keys(checks).map(c => (
              <label key={c} className="flex items-center gap-2 p-2 border rounded">
                <input type="checkbox" checked={!!checks[c]} onChange={e => setChecks({ ...checks, [c]: e.target.checked })} /> {c}
              </label>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="font-semibold mb-3">Recent Handovers</div>
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Shift</TableHead><TableHead>By</TableHead><TableHead>Summary</TableHead><TableHead>Ack</TableHead></TableRow></TableHeader>
            <TableBody>
              {apiOn ? (
                apiRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No handovers submitted yet.</TableCell></TableRow>
                ) : apiRows.slice().reverse().map(h => (
                  <TableRow key={h.handoverId}>
                    <TableCell className="text-xs">{h.createdAt.slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell>{h.shift}</TableCell>
                    <TableCell className="text-xs">{h.handedOverBy ?? '—'}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate">{h.summary}</TableCell>
                    <TableCell>
                      {h.acknowledged
                        ? <Pill2 tone="green">Ack</Pill2>
                        : <Button size="sm" variant="outline" onClick={() => { void acknowledge(h.handoverId); }}>Acknowledge</Button>}
                    </TableCell>
                  </TableRow>
                ))
              ) : localHandovers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No handovers submitted yet.</TableCell></TableRow>
              ) : localHandovers.slice().reverse().map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{h.createdAt.slice(0, 16).replace('T', ' ')}</TableCell>
                  <TableCell>{h.shift}</TableCell>
                  <TableCell className="text-xs">{h.handedOverBy}</TableCell>
                  <TableCell className="text-sm max-w-[280px] truncate">{h.summary}</TableCell>
                  <TableCell>
                    {h.acknowledged
                      ? <Pill2 tone="green">Ack</Pill2>
                      : <Button size="sm" variant="outline" onClick={() => { nursing.acknowledgeHandover(h.id, 'NO Adaeze'); toast.success('Handover acknowledged'); }}>Acknowledge</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   12. NURSING CARE PLAN
   ===================================================================== */
export const NurseCarePlan = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  useDbTick();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ patientId: '', dx: '', problem: '', goal: '', intv: '', review: '' });
  const [apiPlans, setApiPlans] = useState<ApiCarePlan[]>([]);
  const { run, isBusy } = useAsyncAction();

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiPlans(await listNursingCarePlans());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load care plans');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const plans = db.carePlans.list();
  const nameOf = (pid: string) => db.patients.get(pid)?.name ?? wardPatients.find(p => p.patientId === pid)?.name ?? pid;

  const submit = () => run(
    'careplan-save',
    'Saving care plan…',
    async () => {
      if (!f.patientId) return { ok: false as const, message: 'Select a patient' };
      if (!f.dx.trim() || !f.goal.trim()) return { ok: false as const, message: 'Nursing diagnosis and goal are required' };
      const adm = wardPatients.find(p => p.patientId === f.patientId);
      if (apiOn && /^\d+$/.test(f.patientId)) {
        await createNursingCarePlan({
          personId: Number(f.patientId),
          admissionId: adm?.admissionId && /^\d+$/.test(adm.admissionId) ? Number(adm.admissionId) : undefined,
          diagnosis: f.dx,
          problem: f.problem,
          goal: f.goal,
          intervention: f.intv,
          reviewDate: f.review || undefined,
          status: 'active',
          createdBy: 'NO Adaeze',
        });
        await refreshApi();
      } else {
        nursing.addCarePlan({
          admissionId: adm?.admissionId ?? '', patientId: f.patientId, diagnosis: f.dx, problem: f.problem,
          goal: f.goal, intervention: f.intv, reviewDate: f.review, status: 'active', createdBy: 'NO Adaeze',
        });
      }
      return { ok: true as const };
    },
    () => `Care plan started for ${nameOf(f.patientId)}.`,
    r => r.message ?? 'Could not save care plan',
  ).then(r => { if (r && 'ok' in r && r.ok) { setOpen(false); setF({ patientId: '', dx: '', problem: '', goal: '', intv: '', review: '' }); } });

  const cycle = (id: string, cur: string) => {
    const next = cur === 'active' ? 'ongoing' : cur === 'ongoing' ? 'resolved' : 'active';
    if (apiOn && /^\d+$/.test(id)) {
      void updateNursingCarePlan(Number(id), { status: next })
        .then(() => { void refreshApi(); toast.success(`Care plan → ${next}`); })
        .catch(e => toast.error(e instanceof ApiError ? e.message : 'Could not update care plan'));
      return;
    }
    nursing.updateCarePlan(id, { status: next as 'active' | 'ongoing' | 'resolved' });
    toast.success(`Care plan → ${next}`);
  };

  const displayPlans = apiOn ? apiPlans : null;

  return (
    <Shell title="Nursing Care Plan">
      <Section icon={<BookOpen className="h-5 w-5" />} title="Nursing Care Plans"
        desc="Diagnosis · Problem · Goal · Interventions · Evaluation. Linked to the doctor's treatment plan."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Plan</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Active Care Plans" value={String(displayPlans ? displayPlans.filter(p => p.status === 'active').length : plans.filter(p => p.status === 'active').length)} icon={BookOpen} />
        <SummaryCard title="Ongoing" value={String(displayPlans ? displayPlans.filter(p => p.status === 'ongoing').length : plans.filter(p => p.status === 'ongoing').length)} icon={Clock} />
        <SummaryCard title="Resolved" value={String(displayPlans ? displayPlans.filter(p => p.status === 'resolved').length : plans.filter(p => p.status === 'resolved').length)} icon={CheckCircle2} />
        <SummaryCard title="Total Plans" value={String(displayPlans ? displayPlans.length : plans.length)} icon={ClipboardList} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Nursing Diagnosis</TableHead><TableHead>Goal</TableHead><TableHead>Intervention</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {displayPlans ? (
              displayPlans.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No care plans yet. Tap “Add Plan”.</TableCell></TableRow>
              ) : displayPlans.map(p => (
                <TableRow key={p.carePlanId}>
                  <TableCell className="font-medium">{nursingCarePersonName(p.person) || nameOf(String(p.personId))}</TableCell>
                  <TableCell className="text-sm align-top">{p.diagnosis ?? '—'}</TableCell>
                  <TableCell className="text-sm align-top">{p.goal ?? '—'}</TableCell>
                  <TableCell className="text-sm align-top">{p.intervention || '—'}</TableCell>
                  <TableCell className="text-xs">{p.reviewDate?.slice(0, 10) || '—'}</TableCell>
                  <TableCell><button type="button" onClick={() => cycle(String(p.carePlanId), p.status)}><Pill2 tone={p.status === 'resolved' ? 'green' : p.status === 'ongoing' ? 'amber' : 'sky'}>{p.status}</Pill2></button></TableCell>
                </TableRow>
              ))
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No care plans yet. Tap “Add Plan”.</TableCell></TableRow>
            ) : plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{nameOf(p.patientId)}</TableCell>
                <TableCell className="text-sm align-top">{p.diagnosis}</TableCell>
                <TableCell className="text-sm align-top">{p.goal}</TableCell>
                <TableCell className="text-sm align-top">{p.intervention || '—'}</TableCell>
                <TableCell className="text-xs">{p.reviewDate || '—'}</TableCell>
                <TableCell><button type="button" onClick={() => cycle(p.id, p.status)}><Pill2 tone={p.status === 'resolved' ? 'green' : p.status === 'ongoing' ? 'amber' : 'sky'}>{p.status}</Pill2></button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Care Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Patient</Label>
              <SearchableSelect
                value={f.patientId}
                onChange={v => setF({ ...f, patientId: v })}
                placeholder="Select admitted patient"
                options={wardPatients.map(p => ({ value: p.patientId!, label: p.name, sub: `${p.ward}/${p.bed}` }))}
              />
            </div>
            <div><Label className="text-xs">Nursing Diagnosis *</Label><Input value={f.dx} onChange={e => setF({ ...f, dx: e.target.value })} /></div>
            <div><Label className="text-xs">Patient Problem</Label><Input value={f.problem} onChange={e => setF({ ...f, problem: e.target.value })} /></div>
            <div><Label className="text-xs">Goal / Objective *</Label><Input value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })} /></div>
            <div><Label className="text-xs">Interventions</Label><Textarea rows={2} value={f.intv} onChange={e => setF({ ...f, intv: e.target.value })} /></div>
            <div><Label className="text-xs">Review Date</Label><Input type="date" value={f.review} onChange={e => setF({ ...f, review: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('careplan-save')} loadingText="Saving…" onClick={submit}>Submit Plan</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   13. ADMISSION MONITORING
   ===================================================================== */
export const NurseAdmissions = () => {
  const navigate = useNavigate();
  const nursing = useNursing();
  useDbTick();
  const apiOn = isAdmissionsApiEnabled();
  const { run, isBusy } = useAsyncAction();
  const [transferFor, setTransferFor] = useState<string | null>(null);
  const [toBed, setToBed] = useState('');
  const [apiRows, setApiRows] = useState<AdmissionRecord[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [apiBeds, setApiBeds] = useState<BedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const [list, s, beds] = await Promise.all([
        apiListAdmissions({ limit: 200 }),
        getAdmissionStats(),
        listBeds({ status: 'AVAILABLE' }),
      ]);
      setApiRows(list.items);
      setStats(s);
      setApiBeds(beds);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load admissions');
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const localAdmissions = nursing.listAdmissions().filter(a => a.status !== 'CANCELLED');
  const localActive = localAdmissions.filter(a => a.status !== 'DISCHARGED');
  const localBeds = db.beds.list().filter(b => b.status === 'AVAILABLE');

  const apiActive = apiRows.filter(a => a.status !== 'DISCHARGED' && a.status !== 'CANCELLED');

  type Row = {
    id: string;
    patientId: string;
    patientName: string;
    hospitalId: string;
    wardName: string;
    bedLabel: string;
    consultant: string;
    admittedAt: string;
    status: string;
    supervisionLevel?: string | null;
  };

  const active: Row[] = apiOn
    ? apiActive.map(a => ({
        id: String(a.admissionId),
        patientId: String(a.personId),
        patientName: admissionPersonDisplayName(a.person),
        hospitalId: a.person?.hospitalNo ?? '—',
        wardName: a.ward?.name ?? '—',
        bedLabel: a.bed?.label ?? '—',
        consultant: a.consultant ?? '—',
        admittedAt: a.admittedAt,
        status: a.status,
        supervisionLevel: a.supervisionLevel,
      }))
    : localActive.map(a => ({
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
        hospitalId: a.hospitalId,
        wardName: a.wardName ?? '—',
        bedLabel: a.bedLabel ?? '—',
        consultant: a.consultant,
        admittedAt: a.admittedAt,
        status: a.status,
        supervisionLevel: a.supervisionLevel,
      }));

  const availableBedOptions = apiOn
    ? apiBeds.map(b => ({ value: String(b.bedId), label: b.label, sub: b.ward?.name ?? `Ward ${b.wardId}` }))
    : localBeds.map(b => ({ value: b.id, label: b.label, sub: b.wardName }));

  const doTransfer = () => run(
    'transfer',
    'Transferring patient…',
    async () => {
      if (!transferFor) return { ok: false as const, message: 'No admission selected' };
      if (!toBed) return { ok: false as const, message: 'Select a destination bed' };
      if (apiOn) {
        await transferAdmission(Number(transferFor), { bedId: Number(toBed) });
        await refreshApi();
        return { ok: true as const, message: 'Patient transferred successfully' };
      }
      return nursing.transferBed(transferFor, toBed, 'NO Adaeze');
    },
    r => r.message ?? 'Transferred',
    r => r.message ?? 'Transfer failed',
  ).then(r => { if (r && 'ok' in r && r.ok) { setTransferFor(null); setToBed(''); } });

  const orderDischarge = (id: string, name: string) => run(
    `disch-${id}`,
    `Ordering discharge for ${name}…`,
    async () => {
      if (apiOn) {
        await apiOrderDischarge(Number(id), { reason: 'Clinically fit for discharge' });
        await refreshApi();
        return { ok: true as const, message: `Discharge ordered for ${name}` };
      }
      return nursing.orderDischarge(id, 'Dr. On-call', 'Clinically fit for discharge');
    },
    r => r.message ?? 'Discharge ordered',
    r => r.message ?? 'Could not order discharge',
  );

  const activeCount = apiOn ? (stats?.active ?? active.length) : active.length;
  const bedsCount = apiOn ? (stats?.availableBeds ?? availableBedOptions.length) : availableBedOptions.length;
  const dischargeOrderedCount = apiOn
    ? (stats?.dischargeOrdered ?? apiRows.filter(a => a.status === 'DISCHARGE_ORDERED').length)
    : localAdmissions.filter(a => a.status === 'DISCHARGE_ORDERED').length;
  const constantCount = apiOn
    ? (stats?.constantSupervision ?? active.filter(a => a.supervisionLevel === 'Constant').length)
    : active.filter(a => a.supervisionLevel === 'Constant').length;

  return (
    <Shell title="Admission Monitoring">
      <Section icon={<BedDouble className="h-5 w-5" />} title="Admission Monitoring Center"
        desc={`Live admissions across wards — shared with the Admission module.${apiOn ? (loading ? ' Loading…' : ' · API') : ' · Local demo'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Active Admissions" value={String(activeCount)} icon={Users} />
        <SummaryCard title="Available Beds" value={String(bedsCount)} icon={BedDouble} />
        <SummaryCard title="Discharge Ordered" value={String(dischargeOrderedCount)} icon={ClipboardCheck} />
        <SummaryCard title="Constant Supervision" value={String(constantCount)} icon={Activity} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Ward/Bed</TableHead><TableHead>Consultant</TableHead><TableHead>Admitted</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {active.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No active admissions.</TableCell></TableRow>
            ) : active.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.patientName}<div className="text-xs text-muted-foreground">{a.hospitalId}</div></TableCell>
                <TableCell>{a.wardName} / {a.bedLabel}</TableCell>
                <TableCell>{a.consultant}</TableCell>
                <TableCell className="text-xs">{a.admittedAt.slice(0, 10)}</TableCell>
                <TableCell><Pill2 tone={a.status === 'DISCHARGE_ORDERED' ? 'amber' : 'green'}>{a.status.replace(/_/g, ' ')}</Pill2></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => navigate(`${base}/workspace?patientId=${encodeURIComponent(a.patientId)}&admissionId=${encodeURIComponent(a.id)}`)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => { setTransferFor(a.id); setToBed(''); }}>Transfer</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/vitals?patientId=${encodeURIComponent(a.patientId)}&admissionId=${encodeURIComponent(a.id)}`)}>Vitals</Button>
                    {a.status !== 'DISCHARGE_ORDERED' && (
                      <LoadingButton size="sm" variant="ghost" loading={isBusy(`disch-${a.id}`)} loadingText="…" onClick={() => orderDischarge(a.id, a.patientName)}>Order Discharge</LoadingButton>
                    )}
                    {a.status === 'DISCHARGE_ORDERED' && (
                      <Button size="sm" onClick={() => navigate(`${base}/discharge`)}>Discharge</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!transferFor} onOpenChange={(v) => !v && setTransferFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer Patient</DialogTitle><DialogDescription>Move to an available bed. The old bed is released for cleaning.</DialogDescription></DialogHeader>
          <div><Label className="text-xs">Destination Bed</Label>
            <SearchableSelect
              value={toBed}
              onChange={setToBed}
              placeholder="Select available bed"
              options={availableBedOptions}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferFor(null)}>Cancel</Button>
            <LoadingButton loading={isBusy('transfer')} loadingText="Transferring…" disabled={!toBed} onClick={doTransfer}>Confirm Transfer</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   14. (kept) NOK page — re-route to Records (still routed but not in nav)
   ===================================================================== */
export const NurseNok = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/records/directory', { replace: true });
  }, [navigate]);
  return (
    <Shell title="Next of Kin">
      <Section icon={<UserRound className="h-5 w-5" />} title="Redirecting to Records…"
        desc="Next of Kin lives under Medical Records / Patient Directory." />
      <Card>
        <Button onClick={() => navigate('/records/directory')}>Open Patient Directory</Button>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   15. DISCHARGE WORKFLOW
   ===================================================================== */
export const NurseDischarge = () => {
  const navigate = useNavigate();
  const nursing = useNursing();
  useDbTick();
  const apiOn = isAdmissionsApiEnabled();
  const { run, isBusy } = useAsyncAction();
  const [apiRows, setApiRows] = useState<AdmissionRecord[]>([]);

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const list = await apiListAdmissions({ status: 'DISCHARGE_ORDERED', limit: 200 });
      const discharged = await apiListAdmissions({ status: 'DISCHARGED', limit: 200 });
      setApiRows([...list.items, ...discharged.items]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load discharge queue');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const localAdmissions = nursing.listAdmissions();
  const today = new Date().toISOString().slice(0, 10);

  type DiscRow = {
    id: string;
    patientId: string;
    patientName: string;
    hospitalId: string;
    wardName: string;
    bedLabel: string;
    orderedBy: string;
    status: string;
    updatedAt: string;
  };

  const allRows: DiscRow[] = apiOn
    ? apiRows.map(a => ({
        id: String(a.admissionId),
        patientId: String(a.personId),
        patientName: admissionPersonDisplayName(a.person),
        hospitalId: a.person?.hospitalNo ?? '—',
        wardName: a.ward?.name ?? '—',
        bedLabel: a.bed?.label ?? '—',
        orderedBy: a.dischargeOrderedBy ?? '—',
        status: a.status,
        updatedAt: a.updatedAt ?? a.dischargedAt ?? a.admittedAt,
      }))
    : localAdmissions.map(a => ({
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName,
        hospitalId: a.hospitalId,
        wardName: a.wardName ?? '—',
        bedLabel: a.bedLabel ?? '—',
        orderedBy: a.dischargeOrder?.by ?? '—',
        status: a.status,
        updatedAt: a.updatedAt,
      }));

  const dischargeQueue = allRows.filter(a => a.status === 'DISCHARGE_ORDERED');
  const dischargedToday = allRows.filter(a => a.status === 'DISCHARGED' && a.updatedAt.slice(0, 10) === today);
  // In API mode the discharge draft payment-status endpoint is the authoritative check.
  // For local/demo mode we fall back to the nursing store balance.
  const balanceOf = (pid: string) => (apiOn ? 0 : nursing.outstandingBalance(pid));

  const clear = (a: DiscRow, force = false) => run(
    `disc-${a.id}`,
    `Completing discharge for ${a.patientName}…`,
    async () => {
      if (apiOn) {
        await apiCompleteDischarge(Number(a.id));
        await refreshApi();
        return { ok: true as const, message: `${a.patientName} discharged` };
      }
      return nursing.completeDischarge(a.id, 'NO Adaeze', { force });
    },
    r => r.message ?? 'Discharged',
    r => r.message ?? 'Could not complete discharge',
  );

  return (
    <Shell title="Discharge Workflow">
      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Nursing Discharge Workflow"
        desc={`Complete nursing discharge after the doctor's order.${apiOn ? ' · API' : ' Outstanding billing balances block completion (local).'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Discharge Ordered" value={String(dischargeQueue.length)} icon={Clock} />
        <SummaryCard title="Blocked by Balance" value={String(dischargeQueue.filter(a => balanceOf(a.patientId) > 0).length)} icon={AlertTriangle} />
        <SummaryCard title="Ready to Discharge" value={String(dischargeQueue.filter(a => balanceOf(a.patientId) === 0).length)} icon={CheckCircle2} />
        <SummaryCard title="Discharged Today" value={String(dischargedToday.length)} icon={CheckCircle2} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Ward/Bed</TableHead><TableHead>Ordered By</TableHead><TableHead>Outstanding</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {dischargeQueue.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No patients awaiting discharge. Doctors order discharge from Admission Monitoring.</TableCell></TableRow>
            ) : dischargeQueue.map(a => {
              const bal = balanceOf(a.patientId);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.patientName}<div className="text-xs text-muted-foreground">{a.hospitalId}</div></TableCell>
                  <TableCell>{a.wardName} / {a.bedLabel}</TableCell>
                  <TableCell className="text-xs">{a.orderedBy}</TableCell>
                  <TableCell>{bal > 0 ? <Pill2 tone="red">{formatCurrency(bal)}</Pill2> : <Pill2 tone="green">Cleared</Pill2>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {bal > 0 && <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/cashier/pending')}>Open Cashier</Button>}
                      {bal === 0 ? (
                        <LoadingButton size="sm" loading={isBusy(`disc-${a.id}`)} loadingText="Discharging…" onClick={() => clear(a)}>Complete Discharge</LoadingButton>
                      ) : (
                        <LoadingButton size="sm" variant="destructive" loading={isBusy(`disc-${a.id}`)} loadingText="Overriding…" onClick={() => clear(a, true)}>Supervisor Override</LoadingButton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   16. PATIENT TIMELINE
   ===================================================================== */
export const NurseTimeline = () => {
  const [searchParams] = useSearchParams();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  const [current, setCurrent] = useState<Patient | null>(null);
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<NursingTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (!pid) return;
    const found = wardPatients.find(p => p.patientId === pid || p.id === pid) ?? PATIENTS.find(p => p.id === pid || p.patientId === pid);
    if (found) setCurrent(found);
  }, [searchParams, wardPatients]);

  useEffect(() => {
    if (!current || !apiOn || !current.patientId || !/^\d+$/.test(current.patientId)) {
      setEvents([]);
      return;
    }
    setLoading(true);
    void getNursingTimeline({ personId: Number(current.patientId) })
      .then(setEvents)
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Could not load timeline'))
      .finally(() => setLoading(false));
  }, [current, apiOn]);

  const demoEvents: [string, string, string, string][] = [
    ['14 Apr', 'Admission', `Admitted ${current?.ward ?? ''} Bed ${current?.bed ?? ''} · ${current?.doctor ?? ''}`, 'blue'],
    ['14 Apr', 'Vitals', 'BP 142/96 · pulse 96 · agitated', 'amber'],
    ['16 Apr', 'Medication', 'Olanzapine 10mg started · PO', 'sky'],
    ['20 Apr', 'Nursing Note', 'Improved sleep, reduced agitation', 'green'],
    ['28 Apr', 'Observation', 'Level dropped L3 → L2', 'green'],
    ['28 May', 'Doctor Order', 'Repeat FBC requested', 'sky'],
    ['30 May', 'Lab Result', 'FBC within normal limits', 'green'],
    ['01 Jun', 'External Med', 'Vit C 1000mg purchased (HealthPlus)', 'orange'],
  ];

  return (
    <Shell title="Patient Timeline">
      <Section icon={<Activity className="h-5 w-5" />} title="Unified Patient Timeline"
        desc={apiOn ? 'Clinical events from nursing care API when a patient is selected.' : 'API off — showing demo timeline. Enable VITE_USE_API for live events.'}
        action={<Button onClick={() => setOpen(true)}><Search className="h-3 w-3 mr-1" />Search Patient</Button>} />
      <Card className="mb-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, hospital #, ward, bed…" className="pl-9" onFocus={() => setOpen(true)} readOnly />
        </div>
      </Card>
      {current ? (
        <Card>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-semibold">{current.name}</div>
              <div className="text-xs text-muted-foreground">{current.hospNo} · {current.ward}/{current.bed}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Repeat className="h-3 w-3 mr-1" />Change Patient</Button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading timeline…</div>
          ) : apiOn ? (
            events.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No timeline events for this patient yet.</div>
            ) : (
              <ol className="relative border-l ml-3 space-y-4">
                {events.map((e, i) => (
                  <li key={e.eventId ?? i} className="ml-4">
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                    <div className="text-xs text-muted-foreground">{e.at.slice(0, 16).replace('T', ' ')} · {e.kind}</div>
                    <div className="text-sm font-medium">{e.title}</div>
                    {e.detail && <div className="text-sm text-muted-foreground">{e.detail}</div>}
                    <Pill2 tone={e.tone ?? 'sky'}>{e.kind}</Pill2>
                  </li>
                ))}
              </ol>
            )
          ) : (
            <>
              <div className="text-xs text-amber-700 mb-3 p-2 border border-amber-200 rounded bg-amber-50">Nursing care API is off — demo events shown.</div>
              <ol className="relative border-l ml-3 space-y-4">
                {demoEvents.map((e, i) => (
                  <li key={i} className="ml-4"><div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary"></div>
                    <div className="text-xs text-muted-foreground">{e[0]} · {e[1]}</div>
                    <div className="text-sm">{e[2]}</div><Pill2 tone={e[3]}>{e[1]}</Pill2></li>
                ))}
              </ol>
            </>
          )}
        </Card>
      ) : (
        <div className="text-center text-muted-foreground py-10">Select a patient to view their timeline.</div>
      )}
      <PatientSearchModal open={open} onOpenChange={setOpen} onSelect={setCurrent} title="Open Patient Timeline" />
    </Shell>
  );
};

/* =====================================================================
   17. CLINICAL ALERTS
   ===================================================================== */
export const NurseAlerts = () => {
  const apiOn = isNursingCareApiEnabled();
  const [active, setActive] = useState<{ group: string; item: string } | null>(null);
  const [alerts, setAlerts] = useState<NursingAlert[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    void listNursingAlerts()
      .then((payload) => setAlerts(flattenNursingAlerts(payload)))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Could not load alerts'));
  }, [apiOn]);

  const demoGroups = [
    { t: 'Critical Alerts', items: ['Ngozi I. — BP 168/104'], tone: 'red' },
    { t: 'Medication Alerts', items: ['Tope A. — Sertraline 50mg (12:00)', 'Mama Aisha — Donepezil (12:30)'], tone: 'amber' },
    { t: 'Vitals Alerts', items: ['Adebayo O. — SpO₂ 92%'], tone: 'orange' },
    { t: 'Observation Alerts', items: ['Femi O. — L3 overdue 4m', 'Yusuf K. — L2 due'], tone: 'sky' },
    { t: 'Discharge Alerts', items: ['Bisi O. — nursing clearance required'], tone: 'purple' },
  ];

  const groups = apiOn
    ? (() => {
        const byGroup = new Map<string, { t: string; items: string[]; tone: string }>();
        for (const a of alerts) {
          const key = a.group || 'Clinical Alerts';
          const tone =
            /critical/i.test(key) || /critical/i.test(a.severity ?? '') ? 'red'
              : /med/i.test(key) ? 'amber'
                : /vital/i.test(key) ? 'orange'
                  : /obs/i.test(key) ? 'sky'
                    : /discharge/i.test(key) ? 'purple'
                      : 'blue';
          const entry = byGroup.get(key) ?? { t: key, items: [], tone };
          entry.items.push(a.patientName ? `${a.patientName} — ${a.message}` : a.message);
          byGroup.set(key, entry);
        }
        return Array.from(byGroup.values());
      })()
    : demoGroups;

  return (
    <Shell title="Clinical Alerts">
      <Section icon={<Siren className="h-5 w-5" />} title="Clinical Alerts"
        desc={apiOn ? 'Abnormal vitals, incidents, and care alerts from the nursing API.' : 'Demo alerts (API off). Acknowledge / Escalate are toast-only.'} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {(groups.length ? groups : demoGroups).map(g => <SummaryCard key={g.t} title={g.t} value={String(g.items.length)} icon={Bell} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {(groups.length ? groups : [{ t: 'No alerts', items: ['No open nursing alerts'], tone: 'green' }]).map(g => (
          <Card key={g.t}>
            <div className="flex justify-between items-center mb-2"><div className="font-semibold">{g.t}</div><Pill2 tone={g.tone}>{g.items.length}</Pill2></div>
            <ul className="text-sm space-y-2">
              {g.items.map(x => (
                <li key={x} className="p-2 border rounded-lg flex justify-between items-center">
                  <span>{x}</span>
                  <Button size="sm" variant="ghost" onClick={() => setActive({ group: g.t, item: x })}>Open</Button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Dialog open={!!active} onOpenChange={v => !v && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{active?.group}</DialogTitle><DialogDescription>{active?.item}</DialogDescription></DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { const a = active; setActive(null); notifySuccess({ title: 'Alert acknowledged', message: a?.item || '' }); }}>Acknowledge</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setActive(null); notifySuccess({ title: 'Opening patient', message: active?.item || '' }); }}>Open Patient</Button>
            <Button className="flex-1" onClick={() => { const a = active; setActive(null); notifySuccess({ title: 'Escalated to doctor', message: `${a?.item} — escalated to on-call doctor.` }); }}>Escalate to Doctor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   18. NURSING COMMUNICATION
   ===================================================================== */
type ChatMsg = { who: string; t: string; m: string; me?: boolean };
const COMM_CHANNELS = [
  { id: 'Doctors', name: 'Doctors', sub: 'Ward 3B team', unread: 2 },
  { id: 'Pharmacy', name: 'Pharmacy', sub: 'Inpatient pharmacy', unread: 0 },
  { id: 'Lab', name: 'Laboratory', sub: 'Sample dispatch', unread: 1 },
  { id: 'Ward', name: 'Ward Team', sub: '# Ward 3B', unread: 4 },
  { id: 'Admin', name: 'Admin', sub: 'Nursing admin office', unread: 0 },
] as const;
const COMM_SEED: Record<string, ChatMsg[]> = {
  Doctors: [{ who: 'Dr. Lawal', t: '11:02', m: 'Please prepare Tope A. for rounds at 11:30.' }],
  Pharmacy: [{ who: 'Pharm. Tunde', t: '11:05', m: 'Sertraline supplied for 12:00 round.' }],
  Lab: [{ who: 'Lab Mr. Eze', t: '11:07', m: 'Tope A. FBC sample received.' }],
  Ward: [{ who: 'N. Bisi', t: '07:55', m: 'Handover note ready for review.' }],
  Admin: [{ who: 'Matron', t: '08:30', m: 'Submit incident report by EOD.' }],
};
export const NurseComms = () => {
  const apiOn = isNursingOpsApiEnabled();
  const [activeId, setActiveId] = useState<string>('Doctors');
  const [threads, setThreads] = useState<Record<string, ChatMsg[]>>(COMM_SEED);
  const [apiMsgs, setApiMsgs] = useState<NursingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [staffOpen, setStaffOpen] = useState(false);

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const msgs = await listNursingMessages(activeId);
      setApiMsgs(msgs);
      const unread = msgs.filter(m => !m.isMine && !m.readAt).slice(0, 20);
      if (unread.length > 0) {
        await Promise.all(
          unread.map(m => markNursingMessageRead(m.messageId).catch(() => null)),
        );
        setApiMsgs(await listNursingMessages(activeId));
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load messages');
    }
  }, [apiOn, activeId]);

  useEffect(() => {
    if (!apiOn) {
      setThreads(COMM_SEED);
      return;
    }
    void refreshApi();
  }, [apiOn, refreshApi]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft.trim();
    if (apiOn) {
      try {
        await createNursingMessage({ channel: activeId, body });
        setDraft('');
        await refreshApi();
        toast.success('Message sent');
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not send message');
      }
      return;
    }
    setThreads(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), { who: 'You (N. Adaeze)', t: new Date().toLocaleTimeString().slice(0, 5), m: body, me: true }],
    }));
    setDraft('');
    toast.success('Message sent');
  };

  const active = COMM_CHANNELS.find(c => c.id === activeId) ?? COMM_CHANNELS[0];
  const localMsgs = threads[activeId] ?? [];
  const displayMsgs: ChatMsg[] = apiOn
    ? apiMsgs.map(m => ({
      who: m.isMine ? 'You (N. Adaeze)' : (m.fromLabel ?? 'Staff'),
      t: m.createdAt.slice(11, 16),
      m: m.body,
      me: m.isMine,
    }))
    : localMsgs;

  return (
    <Shell title="Communication">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Nursing Communication Center"
        desc={`Chat with Doctors, Pharmacy, Laboratory, Ward Team, and Admin. Patient-linked threads and attachments supported.${apiOn ? ' · API' : ' · Local'}`}
        action={<Button variant="outline" size="sm" onClick={() => setStaffOpen(true)}><Search className="h-3 w-3 mr-1" />Staff Search</Button>} />
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <div className="font-semibold text-sm mb-3">Inbox</div>
          <ul className="space-y-1 text-sm">
            {COMM_CHANNELS.map(c => (
              <li key={c.id}>
                <button onClick={() => setActiveId(c.id)} className={`w-full text-left p-2 rounded-md flex justify-between items-center ${activeId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                  <span>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.sub}</div>
                  </span>
                  {!apiOn && c.unread > 0 && <Pill2 tone="red">{c.unread}</Pill2>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-3 flex flex-col">
          <div className="font-semibold text-sm mb-3 flex justify-between">
            <span># {active.name}</span>
            <Pill2 tone="sky">Patient-linked: Tope Adeyemi</Pill2>
          </div>
          <div className="flex-1 space-y-3 min-h-[280px] max-h-[420px] overflow-y-auto pr-1">
            {displayMsgs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">No messages yet.</div>
            ) : displayMsgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.me ? 'justify-end' : ''}`}>
                {!m.me && <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">{m.who.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>}
                <div className={`max-w-[75%] ${m.me ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-2`}>
                  <div className="text-[10px] opacity-70">{m.who} · {m.t}</div>
                  <div className="text-sm">{m.m}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="icon" onClick={() => toast.success('Attachment picker opened')}><Plus className="h-4 w-4" /></Button>
            <Input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && void send()} placeholder={`Message #${active.name}…`} />
            <Button size="sm" onClick={() => { void send(); }}><Send className="h-3 w-3" /></Button>
          </div>
        </Card>
      </div>
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Staff Search</DialogTitle></DialogHeader>
          <Input placeholder="Search staff by name, role, department…" />
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {[['Dr. Lawal', 'Psychiatry'], ['Pharm. Tunde', 'Pharmacy'], ['Lab Mr. Eze', 'Laboratory'], ['N. Bisi', 'Ward 3B'], ['Matron Adebowale', 'Nursing Admin']].map(([n, r]) => (
              <button key={n} onClick={() => { setStaffOpen(false); toast.success(`Opening chat with ${n}`); }}
                className="w-full text-left p-2 border rounded hover:bg-muted/50">
                <div className="text-sm font-medium">{n}</div>
                <div className="text-xs text-muted-foreground">{r}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   19. NURSING REPORTS
   ===================================================================== */
const REPORT_TYPE_MAP: Record<string, string> = {
  'Daily Ward': 'DailyWard',
  Shift: 'Shift',
  Medication: 'Medication',
  Observation: 'Observation',
  Admission: 'Admission',
  Discharge: 'Discharge',
  'Monthly Nursing': 'Monthly',
  Incident: 'Incident',
};
const REPORT_CARDS = [
  'Daily Ward Report', 'Shift Report', 'Medication Report', 'Observation Report',
  'Admission Report', 'Discharge Report', 'Monthly Nursing Report', 'Incident Report',
];

export const NurseReports = () => {
  const apiOn = isNursingOpsApiEnabled();
  const [genOpen, setGenOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const [reviewReport, setReviewReport] = useState<NursingReport | null>(null);
  const [recent, setRecent] = useState<NursingReport[]>([]);
  const [g, setG] = useState({ type: '', range: '', ward: '', notes: '' });

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setRecent(await listNursingReports());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load reports');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const generate = async () => {
    if (apiOn) {
      const reportType = REPORT_TYPE_MAP[g.type];
      if (!reportType) {
        toast.error('Choose a report type');
        return;
      }
      try {
        const row = await generateNursingReport({
          reportType,
          rangeLabel: g.range || undefined,
          notes: g.notes || undefined,
        });
        await refreshApi();
        setGenOpen(false);
        notifySuccess({
          title: 'Report generated successfully',
          message: `${g.type || 'Report'} for ${g.range || 'today'} is ready.`,
          actions: [
            { label: 'Download PDF', onClick: () => toast.success('PDF downloaded') },
            { label: 'Print', onClick: () => toast.success('Sent to printer') },
          ],
        });
        setReviewReport(row);
        setReviewOpen(g.type || row.reportType);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not generate report');
      }
      return;
    }
    setGenOpen(false);
    notifySuccess({
      title: 'Report generated successfully',
      message: `${g.type || 'Report'} for ${g.range || 'today'} is ready.`,
      actions: [
        { label: 'Download PDF', onClick: () => toast.success('PDF downloaded') },
        { label: 'Print', onClick: () => toast.success('Sent to printer') },
      ],
    });
  };

  const shiftCount = apiOn ? recent.filter(r => r.reportType === 'Shift').length : 22;
  const wardCount = apiOn ? recent.filter(r => r.reportType === 'DailyWard').length : 14;
  const monthlyCount = apiOn ? recent.filter(r => r.reportType === 'Monthly').length : 2;

  return (
    <Shell title="Reports">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Nursing Reports"
        desc={`Generate, preview, and export reports for shifts, wards, medications, and admissions.${apiOn ? ' · API' : ' · Local'}`}
        action={<Button onClick={() => setGenOpen(true)}><Plus className="h-3 w-3 mr-1" />Generate New Report</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Reports Generated" value={String(apiOn ? recent.length : 48)} subtitle={apiOn ? 'From API' : 'This month'} icon={ScrollText} />
        <SummaryCard title="Pending Reports" value={apiOn ? '0' : '3'} icon={Clock} />
        <SummaryCard title="Shift Reports" value={String(shiftCount)} icon={Clock} />
        <SummaryCard title="Ward Reports" value={String(wardCount)} icon={BedDouble} />
        <SummaryCard title="Monthly Reports" value={String(monthlyCount)} icon={Calendar} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_CARDS.map(r => {
          const typeKey = r.replace(/ Report$/, '');
          const apiType = REPORT_TYPE_MAP[typeKey] ?? REPORT_TYPE_MAP[typeKey.replace(' Nursing', '')];
          const last = apiOn && apiType ? recent.find(x => x.reportType === apiType) : null;
          return (
            <Card key={r}>
              <div className="font-semibold text-sm mb-1">{r}</div>
              <div className="text-xs text-muted-foreground mb-3">
                {last ? `Last: ${last.createdAt.slice(0, 16).replace('T', ' ')}` : 'Last generated: 09:00 today'}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setReviewReport(last); setReviewOpen(r); }}>Review</Button>
                <Button size="sm" variant="outline" onClick={() => notifySuccess({ title: 'PDF downloaded', message: `${r} saved to your downloads.` })}><Download className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${r} exported as CSV`)}>CSV</Button>
                <Button size="sm" variant="ghost" onClick={() => toast.success(`${r} sent to printer`)}><Printer className="h-3 w-3" /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      {apiOn && recent.length > 0 && (
        <Card className="mt-5">
          <div className="font-semibold text-sm mb-3">Recent Reports</div>
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Range</TableHead><TableHead>By</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>
              {recent.slice(0, 10).map(r => (
                <TableRow key={r.reportId}>
                  <TableCell>{r.reportType}</TableCell>
                  <TableCell className="text-xs">{r.rangeLabel ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.generatedBy ?? '—'}</TableCell>
                  <TableCell className="text-xs">{r.createdAt.slice(0, 16).replace('T', ' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate New Report</DialogTitle><DialogDescription>Configure the report parameters.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Report Type</Label>
              <SearchableSelect
                value={g.type}
                onChange={v => setG({ ...g, type: v })}
                placeholder="Choose report"
                options={['Daily Ward', 'Shift', 'Medication', 'Observation', 'Admission', 'Discharge', 'Monthly Nursing', 'Incident'].map(x => ({ value: x, label: x }))}
              />
            </div>
            <div><Label className="text-xs">Date Range</Label>
              <SearchableSelect
                value={g.range}
                onChange={v => setG({ ...g, range: v })}
                placeholder="Choose range"
                options={['Today', 'Yesterday', 'This week', 'This month'].map(x => ({ value: x, label: x }))}
              />
            </div>
            <div><Label className="text-xs">Ward</Label><Input value={g.ward} onChange={e => setG({ ...g, ward: e.target.value })} placeholder="All wards / specific ward" /></div>
            <div><Label className="text-xs">Notes (optional)</Label><Textarea rows={2} value={g.notes} onChange={e => setG({ ...g, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={() => { void generate(); }}>Generate Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewOpen} onOpenChange={v => { if (!v) { setReviewOpen(null); setReviewReport(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{reviewOpen}</DialogTitle><DialogDescription>Preview — GFA Demo Hospital Abeokuta</DialogDescription></DialogHeader>
          <div className="border rounded-lg p-4 space-y-2 text-sm max-h-[55vh] overflow-y-auto">
            <div className="font-semibold">{reviewOpen}</div>
            <div className="text-xs text-muted-foreground">
              Generated by {reviewReport?.generatedBy ?? 'Nurse Adaeze'} · {reviewReport?.createdAt ? reviewReport.createdAt.slice(0, 16).replace('T', ' ') : new Date().toLocaleString()}
            </div>
            {reviewReport?.notes && <div>· Notes: {reviewReport.notes}</div>}
            {reviewReport?.rangeLabel && <div>· Range: {reviewReport.rangeLabel}</div>}
            {!reviewReport && (
              <>
                <div>· 22 patients covered across 4 wards.</div>
                <div>· 62 medications administered, 3 missed, 1 refused.</div>
                <div>· 48 observation checks logged; 4 high-risk under continuous watch.</div>
                <div>· 5 new admissions; 3 pending discharge.</div>
                <div>· 1 incident logged: Femi O. — brief agitation 03:20, settled.</div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.success('PDF downloaded')}><Download className="h-3 w-3 mr-1" />PDF</Button>
            <Button variant="outline" onClick={() => toast.success('Sent to printer')}><Printer className="h-3 w-3 mr-1" />Print</Button>
            <Button onClick={() => { const r = reviewOpen; setReviewOpen(null); setReviewReport(null); notifySuccess({ title: 'Report reviewed', message: `${r} marked as reviewed.` }); }}>Mark Reviewed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   20. ANALYTICS (kept)
   ===================================================================== */
export const NurseAnalytics = () => {
  const apiOn = isNursingOpsApiEnabled();
  const [summary, setSummary] = useState<NursingAnalyticsSummary | null>(null);

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setSummary(await getNursingAnalytics());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load analytics');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const demoTiles: [string, string, string][] = [
    ['Admissions (mo)', '142', '+12%'], ['Discharges (mo)', '128', '+8%'], ['DAMA', '6', '-2'],
    ['Trial Leave', '22', '+4'], ['Referrals', '18', '+1'], ['Deaths', '2', '—'],
    ['Med Compliance', '94%', '+3%'], ['Obs Compliance', '98%', '+1%'],
  ];
  const apiTiles: [string, string, string][] | null = summary ? [
    ['Admissions (mo)', String(summary.admissions), '—'],
    ['Discharges (mo)', String(summary.discharges), '—'],
    ['DAMA', String(summary.dama), '—'],
    ['Trial Leave', String(summary.trialLeave), '—'],
    ['Referrals', String(summary.referrals), '—'],
    ['Deaths', String(summary.deaths), '—'],
    ['Med Compliance', `${summary.medCompliance}%`, '—'],
    ['Obs Compliance', `${summary.obsCompliance}%`, '—'],
  ] : null;
  const tiles = apiOn && apiTiles ? apiTiles : demoTiles;

  const wardRows = apiOn && summary
    ? summary.wardOccupancy.map(w => ({ name: w.name || w.code, pct: w.pct }))
    : [
      { name: 'Ward 1C', pct: 78 }, { name: 'Ward 2A', pct: 92 }, { name: 'Ward 3B', pct: 100 },
      { name: 'ICU', pct: 75 }, { name: 'C&A', pct: 60 }, { name: 'Psychogeriatric', pct: 85 },
    ];

  return (
    <Shell title="Analytics">
      <Section icon={<BarChart3 className="h-5 w-5" />} title="Nursing Analytics"
        desc={`Admissions · discharges · trial leave · DAMA · referrals · ward occupancy · medication · observation.${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Admissions (mo)" value={tiles[0][1]} subtitle={apiOn ? undefined : '+12%'} icon={Users} />
        <SummaryCard title="Discharges (mo)" value={tiles[1][1]} subtitle={apiOn ? undefined : '+8%'} icon={ClipboardCheck} />
        <SummaryCard title="Med Compliance" value={tiles[6][1]} subtitle={apiOn ? undefined : '+3%'} icon={Pill} />
        <SummaryCard title="Obs Compliance" value={tiles[7][1]} subtitle={apiOn ? undefined : '+1%'} icon={Eye} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {tiles.map(([k, v, d]) => (
          <Card key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="text-2xl font-bold">{v}</div><Pill2 tone="green">{d}</Pill2></Card>
        ))}
      </div>
      {apiOn && summary && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <SummaryCard title="Open Incidents" value={String(summary.openIncidents)} icon={AlertTriangle} />
          <SummaryCard title="MAR Due / Given / Missed" value={`${summary.marDue} / ${summary.marGiven} / ${summary.marMissed}`} icon={Pill} />
          <SummaryCard title="Tasks Pending" value={String(summary.tasksPending)} icon={ClipboardList} />
          <SummaryCard title="Tasks Completed" value={String(summary.tasksCompleted)} icon={CheckCircle2} />
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold mb-2">Ward Occupancy</div>
          {wardRows.map(r => (
            <div key={r.name} className="mb-2"><div className="flex justify-between text-xs"><span>{r.name}</span><span>{r.pct}%</span></div><Progress value={r.pct} /></div>
          ))}
        </Card>
        <Card>
          <div className="font-semibold mb-2">Medication Statistics — last 15d</div>
          <div className="h-40 flex items-end gap-1">{[80, 92, 88, 94, 91, 86, 90, 95, 93, 89, 92, 96, 98, 94, 90].map((v, i) => (
            <div key={i} className="flex-1 bg-emerald-300 rounded-t" style={{ height: `${v}%` }}></div>
          ))}</div>
          <div className="text-xs text-muted-foreground mt-2">Daily compliance %</div>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   21. BEDSIDE / MOBILE
   ===================================================================== */
export const NurseMobile = () => {
  const navigate = useNavigate();
  return (
    <Shell title="Bedside Mode">
      <Section icon={<Smartphone className="h-5 w-5" />} title="Bedside Mode" desc="Optimized for phones and tablets. One-tap nursing actions." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Quick Vitals" value="Tap" subtitle="Open vitals center" icon={HeartPulse} />
        <SummaryCard title="MAR Due" value="—" subtitle="Medication admin" icon={Pill} />
        <SummaryCard title="Observations" value="—" subtitle="Checks due" icon={Eye} />
        <SummaryCard title="Queue" value="OPD" subtitle="Patient Queues" icon={Users} />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold mb-3">Mobile · Quick Capture</div>
          <div className="space-y-2">
            {([['Quick Vitals', HeartPulse, `${base}/vitals`], ['Administer Med', Pill, `${base}/mar`], ['Observation Check', Eye, `${base}/observation`], ['Incident Report', AlertTriangle, `${base}/incidents`]] as const).map(([l, Icon, to]) => (
              <button key={l} onClick={() => navigate(to)} className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
                <span className="text-sm font-medium">{l}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div className="font-semibold mb-3">Tablet · Round Mode</div>
          <div className="space-y-2">
            {([['Shift Handover', ArrowRightLeft, `${base}/handover`], ['Patient Monitoring', Stethoscope, `${base}/workspace`], ['Nursing Notes', FileText, `${base}/notes`], ['Charts & Trends', TrendingUp, `${base}/charts`]] as const).map(([l, Icon, to]) => (
              <button key={l} onClick={() => navigate(to)} className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
                <span className="text-sm font-medium">{l}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   22. DOCTOR'S ORDERS (reads db.orders — lab / drug / imaging)
   ===================================================================== */
const orderKindLabel: Record<string, string> = { lab: 'Laboratory', drug: 'Medication', imaging: 'Radiology' };
export const NurseDoctorOrders = () => {
  const navigate = useNavigate();
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const [apiOrders, setApiOrders] = useState<NursingOrder[]>([]);
  const { run, isBusy } = useAsyncAction();

  const admittedIds = new Set(wardPatients.map(p => p.patientId));
  const wardPersonIds = new Set(
    wardPatients
      .map(p => p.patientId)
      .filter((id): id is string => Boolean(id && /^\d+$/.test(id)))
      .map(Number),
  );

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiOrders(await listNursingOrders());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load orders');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const localOrders = db.orders.list().filter(o => admittedIds.has(o.patientId));
  const filteredApi = apiOrders.filter(o => wardPersonIds.size === 0 || wardPersonIds.has(o.personId));
  const nameOfLocal = (pid: string) => db.patients.get(pid)?.name ?? pid;
  const nameOfApi = (o: NursingOrder) => nursingOpsPersonName(o.person) || String(o.personId);

  type OrderRow =
    | { mode: 'api'; id: number; patientName: string; kind: string; kindRaw: string; items: string; status: string; orderedBy: string; acknowledged: boolean }
    | { mode: 'local'; id: string; patientName: string; kind: string; kindRaw: string; items: string; status: string; orderedBy: string; local: import('@/data-access/types').Order };

  const rows: OrderRow[] = apiOn
    ? filteredApi.map(o => ({
      mode: 'api' as const,
      id: o.orderId,
      patientName: nameOfApi(o),
      kind: orderKindLabel[o.kind] ?? o.kind,
      kindRaw: o.kind,
      items: o.items.map(i => i.name).join(', '),
      status: o.status,
      orderedBy: o.orderedBy ?? '—',
      acknowledged: Boolean(o.acknowledgedAt),
    }))
    : localOrders.map(o => ({
      mode: 'local' as const,
      id: o.id,
      patientName: nameOfLocal(o.patientId),
      kind: orderKindLabel[o.kind] ?? o.kind,
      kindRaw: o.kind,
      items: o.items.map(i => i.name).join(', '),
      status: o.status,
      orderedBy: o.orderedBy,
      local: o,
    }));

  const acknowledgeOrder = (row: OrderRow) => run(
    `ord-${row.id}`,
    'Acknowledging order…',
    async () => {
      if (row.mode === 'api') {
        await acknowledgeNursingOrder(row.id);
        await refreshApi();
        return { ok: true as const, name: row.patientName };
      }
      nursing.addTask({
        admissionId: wardPatients.find(p => p.patientId === row.local.patientId)?.admissionId,
        patientId: row.local.patientId,
        patientName: row.patientName,
        title: `${row.kind} order: ${row.items}`,
        category: row.kindRaw === 'lab' ? 'Sample' : row.kindRaw === 'drug' ? 'Medication' : 'Procedure',
        sourceOrderId: row.local.id,
        assignedTo: 'NO Adaeze',
      });
      return { ok: true as const, name: row.patientName };
    },
    r => `Order acknowledged — task created for ${r.name}.`,
    () => 'Could not acknowledge order',
  );

  return (
    <Shell title="Doctor's Orders">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Doctor's Orders"
        desc={`Live orders from doctors for your ward patients. Acknowledge to create a nursing task; lab orders flow to Sample Collection.${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Total Orders" value={String(rows.length)} icon={ClipboardList} />
        <SummaryCard title="Medication" value={String(rows.filter(o => o.kindRaw === 'drug').length)} icon={Pill} />
        <SummaryCard title="Laboratory" value={String(rows.filter(o => o.kindRaw === 'lab').length)} icon={Droplets} />
        <SummaryCard title="Radiology" value={String(rows.filter(o => o.kindRaw === 'imaging').length)} icon={Activity} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead>Ordered By</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No doctor orders for admitted patients yet.</TableCell></TableRow>
            ) : rows.map(o => (
              <TableRow key={String(o.id)}>
                <TableCell className="font-medium">{o.patientName}</TableCell>
                <TableCell><Pill2 tone={o.kindRaw === 'lab' ? 'sky' : o.kindRaw === 'drug' ? 'green' : 'purple'}>{o.kind}</Pill2></TableCell>
                <TableCell className="text-sm">{o.items}</TableCell>
                <TableCell className="text-xs">{o.status}</TableCell>
                <TableCell className="text-xs">{o.orderedBy}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {o.mode === 'api' && o.acknowledged ? (
                      <Pill2 tone="green">Acknowledged</Pill2>
                    ) : (
                      <LoadingButton size="sm" variant="outline" loading={isBusy(`ord-${o.id}`)} loadingText="…" onClick={() => acknowledgeOrder(o)}>Acknowledge</LoadingButton>
                    )}
                    {o.kindRaw === 'lab' && <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/samples`)}>Collect Sample</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   23. NURSING TASKS
   ===================================================================== */
const taskTone = (s: string) => s === 'COMPLETED' ? 'green' : s === 'IN_PROGRESS' ? 'amber' : s === 'MISSED' ? 'red' : s === 'ESCALATED' ? 'purple' : 'sky';
export const NurseTasks = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const localTasks = db.nursingTasks.list();
  const [apiTasks, setApiTasks] = useState<NursingOpsTask[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ patientId: '', title: '', category: 'Vitals' as import('@/data-access/types').NursingTask['category'], dueAt: '' });
  const { run, isBusy } = useAsyncAction();

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiTasks(await listNursingTasks());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load tasks');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const nameOf = (pid?: string | null) => {
    if (!pid) return '—';
    if (apiOn) {
      const t = apiTasks.find(x => x.personId != null && String(x.personId) === pid);
      if (t?.patientName) return t.patientName;
    }
    return db.patients.get(pid)?.name ?? pid;
  };

  const add = () => run(
    'task-add',
    'Creating task…',
    async () => {
      if (!f.title.trim()) return { ok: false as const, message: 'Task title is required' };
      const adm = wardPatients.find(p => p.patientId === f.patientId);
      if (apiOn) {
        await createNursingTask({
          personId: f.patientId && /^\d+$/.test(f.patientId) ? Number(f.patientId) : undefined,
          admissionId: adm?.admissionId && /^\d+$/.test(adm.admissionId) ? Number(adm.admissionId) : undefined,
          patientName: adm?.name,
          title: f.title.trim(),
          category: f.category,
          dueAt: f.dueAt || undefined,
          assignedTo: 'NO Adaeze',
        });
        await refreshApi();
        return { ok: true as const };
      }
      nursing.addTask({ patientId: f.patientId || undefined, admissionId: adm?.admissionId, patientName: adm?.name, title: f.title, category: f.category, dueAt: f.dueAt, assignedTo: 'NO Adaeze' });
      return { ok: true as const };
    },
    () => `Task “${f.title}” added.`,
    r => (r && 'message' in r ? r.message : undefined) ?? 'Could not add task',
  ).then(r => { if (r && 'ok' in r && r.ok) { setOpen(false); setF({ patientId: '', title: '', category: 'Vitals', dueAt: '' }); } });

  const advance = async (id: string, cur: string) => {
    const next = cur === 'PENDING' ? 'IN_PROGRESS' : cur === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';
    if (apiOn) {
      try {
        await updateNursingTask(Number(id), { status: next });
        await refreshApi();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not update task');
      }
      return;
    }
    nursing.setTaskStatus(id, next as import('@/data-access/types').NursingTask['status'], 'NO Adaeze');
  };

  const escalate = async (id: string) => {
    if (apiOn) {
      try {
        await updateNursingTask(Number(id), { status: 'ESCALATED' });
        await refreshApi();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not escalate task');
      }
      return;
    }
    nursing.setTaskStatus(id, 'ESCALATED', 'NO Adaeze');
  };

  const pending = apiOn ? apiTasks.filter(t => t.status === 'PENDING').length : localTasks.filter(t => t.status === 'PENDING').length;
  const inProg = apiOn ? apiTasks.filter(t => t.status === 'IN_PROGRESS').length : localTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completed = apiOn ? apiTasks.filter(t => t.status === 'COMPLETED').length : localTasks.filter(t => t.status === 'COMPLETED').length;
  const missed = apiOn
    ? apiTasks.filter(t => t.status === 'MISSED' || t.status === 'ESCALATED').length
    : localTasks.filter(t => t.status === 'MISSED' || t.status === 'ESCALATED').length;

  return (
    <Shell title="Nursing Tasks">
      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Nursing Task Board"
        desc={`Daily nursing duties — auto-created from doctor orders plus manual tasks.${apiOn ? ' · API' : ' · Local'}`}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Task</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending" value={String(pending)} icon={Clock} />
        <SummaryCard title="In Progress" value={String(inProg)} icon={Activity} />
        <SummaryCard title="Completed" value={String(completed)} icon={CheckCircle2} />
        <SummaryCard title="Missed / Escalated" value={String(missed)} icon={AlertTriangle} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Patient</TableHead><TableHead>Category</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              apiTasks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No tasks. Acknowledge doctor orders or add a task.</TableCell></TableRow>
              ) : apiTasks.map(t => (
                <TableRow key={t.taskId}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.patientName || nameOf(t.personId != null ? String(t.personId) : undefined)}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-xs">{t.dueAt ? t.dueAt.slice(0, 16).replace('T', ' ') : '—'}</TableCell>
                  <TableCell><Pill2 tone={taskTone(t.status)}>{t.status.replace('_', ' ')}</Pill2></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { void advance(String(t.taskId), t.status); }}>Advance</Button>
                      {t.status !== 'ESCALATED' && <Button size="sm" variant="ghost" onClick={() => { void escalate(String(t.taskId)); }}>Escalate</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : localTasks.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No tasks. Acknowledge doctor orders or add a task.</TableCell></TableRow>
            ) : localTasks.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>{nameOf(t.patientId)}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell className="text-xs">{t.dueAt || '—'}</TableCell>
                <TableCell><Pill2 tone={taskTone(t.status)}>{t.status.replace('_', ' ')}</Pill2></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { void advance(t.id, t.status); }}>Advance</Button>
                    {t.status !== 'ESCALATED' && <Button size="sm" variant="ghost" onClick={() => { void escalate(t.id); }}>Escalate</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Nursing Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title *</Label><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Change dressing" /></div>
            <div><Label className="text-xs">Patient (optional)</Label>
              <SearchableSelect
                value={f.patientId}
                onChange={v => setF({ ...f, patientId: v })}
                placeholder="Ward patient"
                options={wardPatients.map(p => ({ value: p.patientId!, label: p.name }))}
                allowClear
              />
            </div>
            <div><Label className="text-xs">Category</Label>
              <SearchableSelect
                value={f.category}
                onChange={v => setF({ ...f, category: v as typeof f.category })}
                options={['Vitals', 'Medication', 'Sample', 'Procedure', 'Round', 'Discharge', 'Monitoring', 'Feeding', 'Dressing', 'Other'].map(c => ({ value: c, label: c }))}
                placeholder="Category"
              />
            </div>
            <div><Label className="text-xs">Due</Label><Input value={f.dueAt} onChange={e => setF({ ...f, dueAt: e.target.value })} placeholder="e.g. 12:00 or hourly" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('task-add')} loadingText="Adding…" onClick={add}>Add Task</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   24. SAMPLE COLLECTION (integrates with Laboratory)
   ===================================================================== */
export const NurseSamples = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingOpsApiEnabled();
  useDbTick();
  const { run, isBusy } = useAsyncAction();
  const [apiSamples, setApiSamples] = useState<NursingOrder[]>([]);
  const admittedIds = new Set(wardPatients.map(p => p.patientId));
  const localLabOrders = db.orders.list().filter(o => o.kind === 'lab' && admittedIds.has(o.patientId));
  const cleared = ['PAID', 'NHIA_APPROVED', 'HMO_APPROVED', 'WAIVED'];

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiSamples(await listNursingSamples());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load samples');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const wardPersonIds = new Set(
    wardPatients
      .map(p => p.patientId)
      .filter((id): id is string => Boolean(id && /^\d+$/.test(id)))
      .map(Number),
  );
  const filteredApiSamples = apiSamples.filter(
    o => wardPersonIds.size === 0 || wardPersonIds.has(o.personId),
  );

  const nameOf = (pid: string) => {
    if (apiOn) {
      const n = apiSamples.find(x => String(x.personId) === pid);
      if (n?.person) return nursingOpsPersonName(n.person);
    }
    return db.patients.get(pid)?.name ?? pid;
  };

  const collectLocal = (o: import('@/data-access/types').Order) => run(
    `smp-${o.id}`,
    `Collecting sample for ${nameOf(o.patientId)}…`,
    () => nursing.collectSampleForLabOrder(o.id, 'NO Adaeze'),
    r => r.message,
    r => r.message,
  );

  const collectApi = (o: NursingOrder) => run(
    `smp-${o.orderId}`,
    `Collecting sample for ${nursingOpsPersonName(o.person) || nameOf(String(o.personId))}…`,
    async () => {
      const row = await collectNursingSample(o.orderId);
      await refreshApi();
      return { ok: true as const, message: row.sampleId ? `Sample ${row.sampleId} — sent to laboratory.` : 'Sample collected and sent to lab' };
    },
    r => r.message,
    () => 'Could not collect sample',
  );

  const readyCount = apiOn
    ? filteredApiSamples.filter(o => o.paymentCleared && o.labStatus !== 'SAMPLE_COLLECTED').length
    : localLabOrders.filter(o => cleared.includes(o.status)).length;
  const awaitingCount = apiOn
    ? filteredApiSamples.filter(o => !o.paymentCleared && o.labStatus !== 'SAMPLE_COLLECTED').length
    : localLabOrders.filter(o => o.status === 'AWAITING_PAYMENT' || o.status === 'SENT_TO_BILLING').length;
  const collectedCount = apiOn
    ? filteredApiSamples.filter(o => o.labStatus === 'SAMPLE_COLLECTED').length
    : localLabOrders.filter(o => o.status === 'SAMPLE_COLLECTED').length;
  const total = apiOn ? filteredApiSamples.length : localLabOrders.length;

  return (
    <Shell title="Sample Collection">
      <Section icon={<Droplets className="h-5 w-5" />} title="Sample Collection"
        desc={`Collect specimens for payment-cleared lab orders. Collection flips the order in the Laboratory module and generates a sample ID.${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Lab Orders (ward)" value={String(total)} icon={Droplets} />
        <SummaryCard title="Ready to Collect" value={String(readyCount)} icon={CheckCircle2} />
        <SummaryCard title="Awaiting Payment" value={String(awaitingCount)} icon={Clock} />
        <SummaryCard title="Collected" value={String(collectedCount)} icon={CheckCircle2} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Tests</TableHead><TableHead>Status</TableHead><TableHead>Sample ID</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              filteredApiSamples.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No lab orders for ward patients.</TableCell></TableRow>
              ) : filteredApiSamples.map(o => {
                const collected = o.labStatus === 'SAMPLE_COLLECTED';
                const statusLabel = collected ? 'SAMPLE_COLLECTED' : o.paymentCleared ? (o.paymentStatus || 'READY') : (o.paymentStatus || 'AWAITING_PAYMENT');
                return (
                  <TableRow key={o.orderId}>
                    <TableCell className="font-medium">{nursingOpsPersonName(o.person) || nameOf(String(o.personId))}</TableCell>
                    <TableCell className="text-sm">{o.items.map(i => i.name).join(', ')}</TableCell>
                    <TableCell><Pill2 tone={collected ? 'sky' : o.paymentCleared ? 'green' : 'amber'}>{statusLabel.replace(/_/g, ' ')}</Pill2></TableCell>
                    <TableCell className="font-mono text-xs">{o.sampleId ?? '—'}</TableCell>
                    <TableCell>
                      {collected
                        ? <span className="text-xs text-muted-foreground">Sent to lab</span>
                        : <LoadingButton size="sm" disabled={!o.paymentCleared} loading={isBusy(`smp-${o.orderId}`)} loadingText="Collecting…" onClick={() => collectApi(o)}>Collect Sample</LoadingButton>}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : localLabOrders.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No lab orders for ward patients.</TableCell></TableRow>
            ) : localLabOrders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{nameOf(o.patientId)}</TableCell>
                <TableCell className="text-sm">{o.items.map(i => i.name).join(', ')}</TableCell>
                <TableCell><Pill2 tone={cleared.includes(o.status) ? 'green' : o.status === 'SAMPLE_COLLECTED' ? 'sky' : 'amber'}>{o.status.replace(/_/g, ' ')}</Pill2></TableCell>
                <TableCell className="font-mono text-xs">{o.labMeta?.sampleId ?? '—'}</TableCell>
                <TableCell>
                  {o.status === 'SAMPLE_COLLECTED' ? <span className="text-xs text-muted-foreground">Sent to lab</span>
                    : <LoadingButton size="sm" disabled={!cleared.includes(o.status)} loading={isBusy(`smp-${o.id}`)} loadingText="Collecting…" onClick={() => collectLocal(o)}>Collect Sample</LoadingButton>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   25. INCIDENT REPORTS
   ===================================================================== */
const INCIDENT_TYPES = ['Fall', 'MedicationError', 'Aggression', 'Absconding', 'Injury', 'EquipmentFailure', 'Emergency', 'Death', 'Security', 'NeedleStick', 'Other'] as const;
export const NurseIncidents = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const apiOn = isNursingCareApiEnabled();
  useDbTick();
  const localIncidents = db.incidents.list();
  const [apiIncidents, setApiIncidents] = useState<NursingCareIncident[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ patientId: '', type: 'Fall' as typeof INCIDENT_TYPES[number], severity: 'Moderate' as import('@/data-access/types').Incident['severity'], description: '', actionTaken: '' });
  const { run, isBusy } = useAsyncAction();
  const nameOf = (pid?: string) => (pid ? db.patients.get(pid)?.name ?? wardPatients.find(p => p.patientId === pid)?.name ?? pid : 'Unassigned');

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      setApiIncidents(await listNursingIncidents());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load incidents');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  const submit = () => run(
    'incident-add',
    'Filing incident report…',
    async () => {
      if (!f.description.trim()) return { ok: false as const, message: 'Description is required' };
      const adm = wardPatients.find(p => p.patientId === f.patientId);
      if (apiOn) {
        await createNursingIncident({
          personId: f.patientId && /^\d+$/.test(f.patientId) ? Number(f.patientId) : undefined,
          admissionId: adm?.admissionId && /^\d+$/.test(adm.admissionId) ? Number(adm.admissionId) : undefined,
          patientName: adm?.name,
          incidentType: f.type,
          description: f.description,
          actionTaken: f.actionTaken || undefined,
          severity: f.severity,
          reportedBy: 'NO Adaeze',
        });
        await refreshApi();
      } else {
        nursing.reportIncident({ patientId: f.patientId || undefined, admissionId: adm?.admissionId, patientName: adm?.name, type: f.type, severity: f.severity, description: f.description, actionTaken: f.actionTaken, reportedBy: 'NO Adaeze' });
      }
      return { ok: true as const };
    },
    () => `${f.type} incident reported (${f.severity}) and escalated to supervisor.`,
    r => r.message ?? 'Could not file incident',
  ).then(r => { if (r && 'ok' in r && r.ok) { setOpen(false); setF({ patientId: '', type: 'Fall', severity: 'Moderate', description: '', actionTaken: '' }); } });

  const review = (id: string) => {
    if (apiOn && /^\d+$/.test(id)) {
      void reviewNursingIncident(Number(id), { reviewNote: 'Reviewed' })
        .then(() => { void refreshApi(); toast.success('Incident reviewed by supervisor.'); })
        .catch(e => toast.error(e instanceof ApiError ? e.message : 'Could not review incident'));
      return;
    }
    nursing.reviewIncident(id, 'Matron', 'Reviewed');
    toast.success('Incident reviewed by supervisor.');
  };

  const total = apiOn ? apiIncidents.length : localIncidents.length;
  const reported = apiOn ? apiIncidents.filter(i => i.status === 'REPORTED').length : localIncidents.filter(i => i.status === 'REPORTED').length;
  const high = apiOn
    ? apiIncidents.filter(i => i.severity === 'Critical' || i.severity === 'High').length
    : localIncidents.filter(i => i.severity === 'Critical' || i.severity === 'High').length;
  const reviewed = apiOn ? apiIncidents.filter(i => i.status === 'REVIEWED').length : localIncidents.filter(i => i.status === 'REVIEWED').length;

  return (
    <Shell title="Incident Reports">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Incident Reporting"
        desc={`Report ward incidents — falls, medication errors, aggression, absconding, and more.${apiOn ? ' · API' : ' · Local'}`}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Report Incident</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Total Incidents" value={String(total)} icon={AlertTriangle} />
        <SummaryCard title="Reported" value={String(reported)} icon={Clock} />
        <SummaryCard title="Critical / High" value={String(high)} icon={Siren} />
        <SummaryCard title="Reviewed" value={String(reviewed)} icon={CheckCircle2} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Patient</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              apiIncidents.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No incidents reported.</TableCell></TableRow>
              ) : apiIncidents.map(i => (
                <TableRow key={i.incidentId}>
                  <TableCell className="font-medium">{i.incidentType}</TableCell>
                  <TableCell>{i.patientName ?? nursingCarePersonName(i.person) ?? (i.personId ? nameOf(String(i.personId)) : 'Unassigned')}</TableCell>
                  <TableCell><Pill2 tone={i.severity === 'Critical' ? 'red' : i.severity === 'High' ? 'orange' : i.severity === 'Moderate' ? 'amber' : 'sky'}>{i.severity}</Pill2></TableCell>
                  <TableCell className="text-sm max-w-[280px] truncate">{i.description}</TableCell>
                  <TableCell><Pill2 tone={i.status === 'REVIEWED' ? 'green' : 'amber'}>{i.status}</Pill2></TableCell>
                  <TableCell>{i.status !== 'REVIEWED' && <Button size="sm" variant="outline" onClick={() => review(String(i.incidentId))}>Review</Button>}</TableCell>
                </TableRow>
              ))
            ) : localIncidents.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No incidents reported.</TableCell></TableRow>
            ) : localIncidents.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.type}</TableCell>
                <TableCell>{nameOf(i.patientId)}</TableCell>
                <TableCell><Pill2 tone={i.severity === 'Critical' ? 'red' : i.severity === 'High' ? 'orange' : i.severity === 'Moderate' ? 'amber' : 'sky'}>{i.severity}</Pill2></TableCell>
                <TableCell className="text-sm max-w-[280px] truncate">{i.description}</TableCell>
                <TableCell><Pill2 tone={i.status === 'REVIEWED' ? 'green' : 'amber'}>{i.status}</Pill2></TableCell>
                <TableCell>{i.status !== 'REVIEWED' && <Button size="sm" variant="outline" onClick={() => review(i.id)}>Review</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Type</Label>
                <SearchableSelect
                  value={f.type}
                  onChange={v => setF({ ...f, type: v as any })}
                  options={INCIDENT_TYPES.map(t => ({ value: t, label: t }))}
                  placeholder="Type"
                />
              </div>
              <div><Label className="text-xs">Severity</Label>
                <SearchableSelect
                  value={f.severity}
                  onChange={v => setF({ ...f, severity: v as any })}
                  options={['Low', 'Moderate', 'High', 'Critical'].map(s => ({ value: s, label: s }))}
                  placeholder="Severity"
                />
              </div>
            </div>
            <div><Label className="text-xs">Patient (optional)</Label>
              <SearchableSelect
                value={f.patientId}
                onChange={v => setF({ ...f, patientId: v })}
                placeholder="Ward patient"
                options={wardPatients.map(p => ({ value: p.patientId!, label: p.name }))}
                allowClear
              />
            </div>
            <div><Label className="text-xs">Description *</Label><Textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
            <div><Label className="text-xs">Action Taken</Label><Textarea rows={2} value={f.actionTaken} onChange={e => setF({ ...f, actionTaken: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('incident-add')} loadingText="Filing…" onClick={submit}>File Report</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   26. CHARTS & FORMS ENGINE (schema-driven, Super-Admin configurable)
   ===================================================================== */
export const NurseForms = () => {
  const nursing = useNursing();
  const wardPatients = useWardPatients();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const apiOn = isNursingCareApiEnabled();
  useDbTick();
  const localTemplates = nursing.activeTemplates();
  const localInstances = db.formInstances.list();
  const [apiTemplates, setApiTemplates] = useState<NursingFormTemplate[]>([]);
  const [apiInstances, setApiInstances] = useState<NursingFormInstance[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const { run, isBusy } = useAsyncAction();
  const nameOf = (pid: string) => db.patients.get(pid)?.name ?? wardPatients.find(p => p.patientId === pid)?.name ?? pid;

  const refreshApi = useCallback(async () => {
    if (!apiOn) return;
    try {
      const [templates, instances] = await Promise.all([
        listNursingFormTemplates({ active: true }),
        listNursingFormInstances(),
      ]);
      setApiTemplates(templates.filter(t => t.active !== false));
      setApiInstances(instances);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load forms');
    }
  }, [apiOn]);

  useEffect(() => { void refreshApi(); }, [refreshApi]);

  type UiField = { key: string; label: string; type: string; required?: boolean; options?: string[]; showIf?: { key: string; equals: string | number | boolean } };
  type UiTemplate = { id: string; code: string; title: string; category?: string; fields: UiField[] };

  const templates: UiTemplate[] = apiOn
    ? apiTemplates.map(t => ({
        id: String(t.templateId),
        code: t.code,
        title: t.title,
        category: t.category,
        fields: formTemplateFields(t),
      }))
    : localTemplates.map(t => ({
        id: t.id,
        code: t.code,
        title: t.title,
        category: t.category,
        fields: t.fields,
      }));

  const template = templates.find(t => t.id === templateId);

  const setVal = (k: string, v: string | number | boolean) => setValues(prev => ({ ...prev, [k]: v }));
  const visible = (field: UiField) =>
    !field.showIf || values[field.showIf.key] === field.showIf.equals;

  const save = () => run(
    'form-save',
    `Saving ${template?.title}…`,
    async () => {
      if (!template) return { ok: false as const, message: 'Select a form template' };
      if (!patientId) return { ok: false as const, message: 'Select a patient' };
      const adm = wardPatients.find(p => p.patientId === patientId);
      if (apiOn && /^\d+$/.test(template.id) && /^\d+$/.test(patientId)) {
        await createNursingFormInstance({
          templateId: Number(template.id),
          personId: Number(patientId),
          admissionId: adm?.admissionId && /^\d+$/.test(adm.admissionId) ? Number(adm.admissionId) : undefined,
          values,
          signedBy: 'NO Adaeze',
        });
        await refreshApi();
        return { ok: true as const };
      }
      const res = nursing.saveFormInstance(template.id, patientId, values, 'NO Adaeze', adm?.admissionId, 'SIGNED');
      if ('ok' in res && res.ok === false) return res;
      return { ok: true as const };
    },
    () => `${template?.title} signed and saved for ${nameOf(patientId)}.`,
    r => ('message' in r ? r.message : 'Could not save form'),
  ).then(r => { if (r && 'ok' in r && r.ok) { setValues({}); } });

  const instanceCount = apiOn ? apiInstances.length : localInstances.length;
  const categoryCount = new Set(templates.map(t => t.category).filter(Boolean)).size;

  return (
    <Shell title="Charts & Forms">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Nursing Forms & Charts"
        desc={`Schema-driven digital forms (admission assessment, pain, fall risk, wound, psychiatric observation, seclusion, discharge).${apiOn ? ' · API' : ' · Local'}`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Available Forms" value={String(templates.length)} icon={ClipboardList} />
        <SummaryCard title="Forms Completed" value={String(instanceCount)} icon={CheckCircle2} />
        <SummaryCard title="Ward Patients" value={String(wardPatients.length)} icon={Users} />
        <SummaryCard title="Categories" value={String(categoryCount)} icon={BookOpen} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex gap-2 mb-4 flex-wrap">
            <SearchableSelect
              className="w-64"
              value={templateId}
              onChange={(v) => { setTemplateId(v); setValues({}); }}
              placeholder="Select form"
              options={templates.map(t => ({ value: t.id, label: `${t.code} · ${t.title}` }))}
            />
            <SearchableSelect
              className="flex-1 min-w-[180px]"
              value={patientId}
              onChange={setPatientId}
              placeholder="Select patient"
              options={wardPatients.map(p => ({ value: p.patientId!, label: p.name, sub: `${p.ward}/${p.bed}` }))}
            />
          </div>
          {!template ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Choose a form to begin.</div>
          ) : (
            <div className="space-y-3">
              {template.fields.filter(visible).map(field => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}{field.required && ' *'}</Label>
                  {field.type === 'textarea' ? (
                    <Textarea rows={2} value={(values[field.key] as string) ?? ''} onChange={e => setVal(field.key, e.target.value)} />
                  ) : field.type === 'select' ? (
                    <SearchableSelect
                      value={(values[field.key] as string) ?? ''}
                      onChange={v => setVal(field.key, v)}
                      placeholder="Select"
                      options={(field.options ?? []).map(o => ({ value: o, label: o }))}
                    />
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!values[field.key]} onChange={e => setVal(field.key, e.target.checked)} /><span className="text-xs text-muted-foreground">Yes</span></div>
                  ) : field.type === 'signature' ? (
                    <Input value={(values[field.key] as string) ?? ''} onChange={e => setVal(field.key, e.target.value)} placeholder="Type full name to sign" />
                  ) : (
                    <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'} value={(values[field.key] as string) ?? ''} onChange={e => setVal(field.key, e.target.value)} />
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <LoadingButton loading={isBusy('form-save')} loadingText="Signing…" onClick={save}><Save className="h-3 w-3 mr-1" />Sign & Save</LoadingButton>
              </div>
            </div>
          )}
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Completed Forms</div>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {apiOn ? (
              apiInstances.length === 0 ? <div className="text-xs text-muted-foreground text-center py-6">No forms completed yet.</div> : apiInstances.map(i => (
                <div key={i.instanceId} className="p-2 border rounded text-xs">
                  <div className="flex justify-between"><span className="font-semibold">{i.templateCode ?? `T-${i.templateId}`}</span><Pill2 tone="green">{i.status ?? 'SIGNED'}</Pill2></div>
                  <div className="text-muted-foreground">{nursingCarePersonName(i.person) || nameOf(String(i.personId))} · {i.createdAt.slice(0, 16).replace('T', ' ')}</div>
                  <div className="text-muted-foreground">Signed by {i.signedBy ?? '—'}</div>
                </div>
              ))
            ) : localInstances.length === 0 ? <div className="text-xs text-muted-foreground text-center py-6">No forms completed yet.</div> : localInstances.map(i => (
              <div key={i.id} className="p-2 border rounded text-xs">
                <div className="flex justify-between"><span className="font-semibold">{i.templateCode}</span><Pill2 tone="green">{i.status}</Pill2></div>
                <div className="text-muted-foreground">{nameOf(i.patientId)} · {i.createdAt.slice(0, 16).replace('T', ' ')}</div>
                <div className="text-muted-foreground">Signed by {i.signedBy}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isSuperAdmin && !apiOn && (
        <Card className="mt-5">
          <Section icon={<ClipboardList className="h-5 w-5" />} title="Template Configuration (Super Admin)" desc="Enable or disable the digital nursing forms available to the whole hospital." />
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Fields</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {nursing.allTemplates().map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{t.fields.length}</TableCell>
                  <TableCell><Pill2 tone={t.active ? 'green' : 'amber'}>{t.active ? 'Active' : 'Disabled'}</Pill2></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => { nursing.toggleTemplate(t.id, user?.name ?? 'Super Admin'); toast.success(`${t.code} ${t.active ? 'disabled' : 'enabled'}.`); }}>{t.active ? 'Disable' : 'Enable'}</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Shell>
  );
};
