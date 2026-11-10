import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApplyDocPatient, setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Stethoscope,
  Users,
  CheckCircle2,
  Clock,
  Save,
  Plus,
  AlertTriangle,
  Eye,
  Printer,
  BookOpen,
  Pill,
  FlaskConical,
  ScanLine,
  BedDouble,
  Send,
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  CalendarClock,
} from 'lucide-react';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import {
  formatVitalsLine,
  type ConsultationQueueItem,
  type EncounterRecord,
  type EncounterNote,
  type ClinicalSummary,
  type FollowUpItem,
} from '@/lib/api/encounters';
import {
  localActiveEncounters,
  localClinicalSummary,
  localCompleteEncounter,
  localConsultationQueue,
  localCompletedEncounters,
  localCreateFollowUp,
  localFollowUps,
  localPatchEncounter,
  localSearchPatients,
  localStartEncounter,
  localUpdateFollowUp,
} from '@/lib/demo/consultationLocal';
import { ApiError } from '@/lib/api/client';
import {
  DoctorWorkspaceQuickFlowSheet,
  type WorkspaceQuickAction,
} from '@/components/doctor/DoctorWorkspaceQuickFlowSheet';
import { LabRequestDialog } from '@/components/doctor/LabRequestDialog';
import DoctorHmoCoverageBadge from '@/components/doctor/DoctorHmoCoverageBadge';

const base = '/dashboard/doctor/clinical';

type QPatient = {
  id: string;
  triageId: number;
  personId: number;
  name: string;
  mrn: string;
  age: number | null;
  sex: string;
  clinic: string;
  visit: string;
  arrival: string;
  wait: string;
  priority: string;
  payment: string;
  paymentCleared: boolean;
  canStart: boolean;
  vitals: string;
  vitalsDetail?: ConsultationQueueItem['vitals'];
  last: string;
};

type ActiveConsult = {
  id: string;
  encounterId: number;
  personId: number;
  triageId: number;
  name: string;
  mrn: string;
  age: number | null;
  sex: string;
  clinic: string;
  visit: string;
  priority: string;
  payment: string;
  vitals: string;
  last: string;
  startedAt: string;
  status: string;
  version: number;
  note: EncounterNote;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'local';
  diagnoses: { code: string; label: string; type: 'Primary' | 'Secondary' | 'Differential'; status: string }[];
};

type CompletedRow = {
  id: string;
  encounterId: number;
  name: string;
  mrn: string;
  clinic: string;
  dx: string;
  start: string;
  end: string;
  duration: string;
  outcome: string;
  doctor: string;
};

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title={`Doctor Clinical · ${title}`}>
    {children}
  </DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const toneCls = (t: string) => {
  switch (t) {
    case 'green':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${toneCls(t)}`}>{children}</span>
);

const priorityTone = (p: string) =>
  /emergency/i.test(p) ? 'red' : /urgent/i.test(p) ? 'amber' : /follow/i.test(p) ? 'blue' : 'green';

function emptyNote(): EncounterNote {
  return {
    chiefComplaint: '',
    history: '',
    examination: '',
    assessment: '',
    plan: '',
    pastMedicalHistory: '',
    drugHistory: '',
    allergyHistory: '',
    familyHistory: '',
    socialHistory: '',
    followUpPlan: '',
  };
}

function mapQueueItem(item: ConsultationQueueItem): QPatient {
  return {
    id: `t-${item.triageId}`,
    triageId: item.triageId,
    personId: item.personId,
    name: item.name,
    mrn: item.mrn,
    age: item.age,
    sex: item.sex,
    clinic: item.clinic,
    visit: item.visit,
    arrival: item.arrival,
    wait: item.wait,
    priority: item.priority,
    payment: item.paymentStatus,
    paymentCleared: item.paymentCleared,
    canStart: item.canStart,
    vitals: item.vitalsStatus,
    vitalsDetail: item.vitals,
    last: item.lastVisit || '—',
  };
}

function mapActive(e: EncounterRecord): ActiveConsult {
  return {
    id: `e-${e.encounterId}`,
    encounterId: e.encounterId,
    personId: e.personId,
    triageId: e.triageId,
    name: e.patient.name,
    mrn: e.patient.mrn,
    age: e.patient.age,
    sex: e.patient.sex,
    clinic: e.patient.clinic,
    visit: e.patient.visit,
    priority: e.patient.priority,
    payment: e.patient.paymentStatus,
    vitals: e.patient.vitalsStatus,
    last: e.patient.lastVisit || '—',
    startedAt: new Date(e.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: e.status === 'In Consultation' ? 'In Consult' : e.status,
    version: e.version,
    note: { ...emptyNote(), ...e.note },
    saveStatus: 'idle',
    diagnoses: [],
  };
}

function durationLabel(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.round(ms / 60_000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function mapCompleted(e: EncounterRecord): CompletedRow {
  return {
    id: `c-${e.encounterId}`,
    encounterId: e.encounterId,
    name: e.patient.name,
    mrn: e.patient.mrn,
    clinic: e.patient.clinic,
    dx: e.note.assessment?.trim() || e.outcome || '—',
    start: new Date(e.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    end: e.completedAt
      ? new Date(e.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—',
    duration: durationLabel(e.startedAt, e.completedAt),
    outcome: e.outcome || 'Completed',
    doctor: e.doctorName,
  };
}

function noteToApiPayload(note: EncounterNote) {
  return {
    chiefComplaint: note.chiefComplaint,
    history: note.history,
    examination: note.examination,
    assessment: note.assessment,
    plan: note.plan,
    pastMedicalHistory: note.pastMedicalHistory,
    drugHistory: note.drugHistory,
    allergyHistory: note.allergyHistory,
    familyHistory: note.familyHistory,
    socialHistory: note.socialHistory,
    followUpPlan: note.followUpPlan,
  };
}

function toPatientCtx(p: {
  personId: number;
  name: string;
  mrn: string;
  age: number | null;
  sex: string;
  clinic: string;
  phone?: string;
  encounterId?: number;
}): DocPatientContext {
  return {
    id: String(p.personId),
    name: p.name,
    hospitalId: p.mrn,
    age: p.age ?? undefined,
    gender: p.sex,
    clinic: p.clinic,
    phone: p.phone,
    encounterId: p.encounterId != null ? String(p.encounterId) : undefined,
  };
}

export const DocWorkspace = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState<QPatient[]>([]);
  const [queueSummary, setQueueSummary] = useState({ waiting: 0, paymentBlocked: 0, canStart: 0 });
  const [active, setActive] = useState<ActiveConsult[]>([]);
  const [completed, setCompleted] = useState<CompletedRow[]>([]);
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [fuSummary, setFuSummary] = useState({ thisWeek: 0, dueToday: 0, missed: 0, scheduled: 0 });

  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const current = active.find((a) => a.id === activeId) || null;
  const versionRef = useRef(1);
  versionRef.current = current?.version ?? 1;

  const [q, setQ] = useState('');
  const [fClinic, setFClinic] = useState('all');
  const [fPriority, setFPriority] = useState('all');

  const [returnModal, setReturnModal] = useState<QPatient | null>(null);
  const [summaryDrawer, setSummaryDrawer] = useState<QPatient | null>(null);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [noShow, setNoShow] = useState<QPatient | null>(null);
  const [complete, setComplete] = useState(false);
  const [quickAction, setQuickAction] = useState<WorkspaceQuickAction | null>(null);
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [scheduleFU, setScheduleFU] = useState(false);
  const [completedView, setCompletedView] = useState<CompletedRow | null>(null);
  const [outcome, setOutcome] = useState('discharge');
  const [fuDate, setFuDate] = useState('');
  const [fuClinic, setFuClinic] = useState('OPC');
  const [fuTime, setFuTime] = useState('');
  const [fuPriority, setFuPriority] = useState('Routine');
  const [fuReason, setFuReason] = useState('');
  const [fuPersonId, setFuPersonId] = useState<number | null>(null);
  const [fuPatientQ, setFuPatientQ] = useState('');
  const [fuPatientResults, setFuPatientResults] = useState<Array<{ personId: number; name: string; mrn: string }>>([]);
  const [fuSearching, setFuSearching] = useState(false);
  const [activeSummary, setActiveSummary] = useState<ClinicalSummary | null>(null);
  const [activeSummaryLoading, setActiveSummaryLoading] = useState(false);
  const [lastVisitExpanded, setLastVisitExpanded] = useState(false);

  const loadQueue = useCallback(async (filters?: { q?: string; clinic?: string; priority?: string }) => {
    setLoadingQueue(true);
    setError(null);
    try {
      const res = localConsultationQueue({
        q: (filters?.q ?? q) || undefined,
        clinic: filters?.clinic ?? fClinic,
        priority: filters?.priority ?? fPriority,
      });
      setQueue(res.items.map(mapQueueItem));
      setQueueSummary(res.summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load consultation queue';
      setError(msg);
      setQueue([]);
      toast.error(msg);
    } finally {
      setLoadingQueue(false);
    }
  }, [q, fClinic, fPriority]);

  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = localActiveEncounters();
      const mapped = res.items.map((e) => mapActive(e));
      setActive(mapped);
      setActiveId((prev) => {
        if (prev && mapped.some((a) => a.id === prev)) return prev;
        return mapped[0]?.id ?? null;
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load active consultations');
      setActive([]);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const loadCompleted = useCallback(async () => {
    setLoadingCompleted(true);
    try {
      const res = localCompletedEncounters();
      setCompleted(res.items.map(mapCompleted));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load completed consultations');
      setCompleted([]);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  const loadFollowups = useCallback(async () => {
    setLoadingFollowups(true);
    try {
      const res = localFollowUps();
      setFollowups(res.items);
      setFuSummary({
        thisWeek: res.summary.thisWeek,
        dueToday: res.summary.dueToday,
        missed: res.summary.missed,
        scheduled: res.summary.scheduled,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load follow-ups');
      setFollowups([]);
    } finally {
      setLoadingFollowups(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), loadActive(), loadCompleted(), loadFollowups()]);
  }, [loadQueue, loadActive, loadCompleted, loadFollowups]);

  useEffect(() => {
    void loadActive();
    void loadCompleted();
    void loadFollowups();
  }, [loadActive, loadCompleted, loadFollowups]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadQueue();
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, fClinic, fPriority, loadQueue]);

  useEffect(() => {
    if (!current?.personId || tab !== 'active') {
      setActiveSummary(null);
      setLastVisitExpanded(false);
      return;
    }
    void (async () => {
      setActiveSummaryLoading(true);
      setLastVisitExpanded(false);
      try {
        setActiveSummary(localClinicalSummary(current.personId, current.triageId));
      } catch {
        setActiveSummary(null);
      } finally {
        setActiveSummaryLoading(false);
      }
    })();
  }, [current?.personId, current?.triageId, tab]);

  // Autosave active note (3s)
  useEffect(() => {
    if (!current?.encounterId) return;
    const encounterId = current.encounterId;
    const note = current.note;
    const t = window.setTimeout(() => {
      void (async () => {
        setActive((prev) =>
          prev.map((a) => (a.encounterId === encounterId ? { ...a, saveStatus: 'saving' } : a)),
        );
        try {
          const updated = localPatchEncounter(encounterId, noteToApiPayload(note));
          setActive((prev) =>
            prev.map((a) =>
              a.encounterId === encounterId
                ? {
                    ...a,
                    version: updated.version,
                    note: { ...emptyNote(), ...updated.note },
                    status: 'Draft Saved',
                    saveStatus: 'saved',
                  }
                : a,
            ),
          );
        } catch (err) {
          setActive((prev) =>
            prev.map((a) => (a.encounterId === encounterId ? { ...a, saveStatus: 'error' } : a)),
          );
          if (err instanceof ApiError && err.status === 409) {
            toast.error('Note conflict — refreshing');
            void loadActive();
          }
        }
      })();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [current?.encounterId, current?.note, loadActive]);

  const startConsult = async (p: QPatient) => {
    if (!p.canStart || !p.paymentCleared || p.payment === 'Pending') {
      return toast.error('Payment pending — cashier must confirm before consultation can start');
    }
    setActionLoading(true);
    try {
      const enc = localStartEncounter({ triageId: p.triageId, clinic: p.clinic });
      const mapped = mapActive(enc);
      setActive((prev) => [mapped, ...prev.filter((a) => a.encounterId !== enc.encounterId)]);
      setActiveId(mapped.id);
      setQueue((prev) => prev.filter((x) => x.triageId !== p.triageId));
      setTab('active');
      notifySuccess(`Consultation started for ${p.name}.`, 'Consultation Started');
      void loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start consultation');
    } finally {
      setActionLoading(false);
    }
  };

  const patientCtxApplied = useRef(false);
  useApplyDocPatient((ctx) => {
    setQ(ctx.hospitalId || ctx.name);
    if (ctx.clinic === 'OPC' || ctx.clinic === 'GMPC') setFClinic(ctx.clinic);
    if (ctx.autoStartConsult && !patientCtxApplied.current) {
      patientCtxApplied.current = true;
      const match = queue.find(
        (p) =>
          String(p.personId) === ctx.id ||
          p.mrn === ctx.hospitalId ||
          p.name.toLowerCase() === ctx.name.toLowerCase(),
      );
      if (match) void startConsult(match);
      else toast.warning(`${ctx.name} is not in today's queue — search filter applied`);
    } else {
      toast.success(`Queue filtered for ${ctx.name}`);
    }
  });

  const updateNoteField = (key: keyof EncounterNote, value: string) => {
    if (!current) return;
    setActive((prev) =>
      prev.map((a) =>
        a.id === current.id ? { ...a, note: { ...a.note, [key]: value }, saveStatus: 'idle' } : a,
      ),
    );
  };

  const saveDraftNow = async () => {
    if (!current) return;
    setActionLoading(true);
    try {
      const updated = localPatchEncounter(current.encounterId, noteToApiPayload(current.note));
      setActive((prev) =>
        prev.map((a) =>
          a.id === current.id
            ? {
                ...a,
                version: updated.version,
                note: { ...emptyNote(), ...updated.note },
                status: 'Draft Saved',
                saveStatus: 'saved',
              }
            : a,
        ),
      );
      notifySuccess('Draft saved.', 'Draft Saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const finalizeConsult = async () => {
    if (!current) return;
    if (outcome === 'followup' && !fuDate) {
      toast.error('Follow-up date is required');
      return;
    }
    setActionLoading(true);
    try {
      localPatchEncounter(current.encounterId, noteToApiPayload(current.note));
      const outcomeLabel =
        outcome === 'followup'
          ? 'Follow-up'
          : outcome === 'admit'
            ? 'Admitted'
            : outcome === 'refer'
              ? 'Referred'
              : outcome === 'transfer'
                ? 'Transferred'
                : outcome === 'await'
                  ? 'Awaiting Results'
                  : 'Discharged';
      localCompleteEncounter(current.encounterId, {
        outcome: outcomeLabel,
        ...(outcome === 'followup'
          ? {
              followUpDate: fuDate,
              followUpClinic: current.clinic || fuClinic,
              followUpTime: fuTime || undefined,
              followUpPriority: fuPriority,
              followUpReason: fuReason || undefined,
            }
          : {}),
      });
      /* note already stored in this browser */
      setActive((prev) => prev.filter((a) => a.id !== current.id));
      setActiveId(null);
      setComplete(false);
      setFuDate('');
      setFuReason('');
      notifySuccess('Consultation completed successfully.', 'Consultation Completed');
      setTab('completed');
      void loadCompleted();
      void loadFollowups();
      void loadActive();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Complete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openSummary = async (p: QPatient) => {
    setSummaryDrawer(p);
    setSummaryLoading(true);
    setClinicalSummary(null);
    try {
      setClinicalSummary(localClinicalSummary(p.personId, p.triageId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load clinical summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Follow-up patient search for schedule dialog
  useEffect(() => {
    if (!scheduleFU) return;
    const query = fuPatientQ.trim();
    if (query.length < 2) {
      setFuPatientResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setFuSearching(true);
        try {
          const rows = localSearchPatients(query);
          setFuPatientResults(
            rows.map((r) => ({
              personId: r.personId,
              name: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
              mrn: r.hospitalNo || `PID-${r.personId}`,
            })),
          );
        } catch {
          setFuPatientResults([]);
        } finally {
          setFuSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(t);
  }, [fuPatientQ, scheduleFU]);

  const scheduleFollowUp = async () => {
    if (!fuPersonId) return toast.error('Select a patient');
    if (!fuDate) return toast.error('Follow-up date is required');
    setActionLoading(true);
    try {
      localCreateFollowUp({
        personId: fuPersonId,
        date: fuDate,
        clinic: fuClinic,
        time: fuTime || undefined,
        priority: fuPriority,
        reason: fuReason || undefined,
      });
      setScheduleFU(false);
      setFuPersonId(null);
      setFuPatientQ('');
      setFuDate('');
      setFuReason('');
      notifySuccess('Follow-up scheduled successfully.', 'Follow-Up Scheduled');
      void loadFollowups();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Schedule failed');
    } finally {
      setActionLoading(false);
    }
  };

  const noteFields: Array<{ key: keyof EncounterNote; label: string }> = [
    { key: 'chiefComplaint', label: 'Chief Complaint' },
    { key: 'history', label: 'History of Presenting Complaint' },
    { key: 'pastMedicalHistory', label: 'Past Medical History' },
    { key: 'drugHistory', label: 'Drug History' },
    { key: 'allergyHistory', label: 'Allergy History' },
    { key: 'familyHistory', label: 'Family History' },
    { key: 'socialHistory', label: 'Social History' },
    {
      key: 'examination',
      label: current?.clinic === 'OPC' ? 'Mental State Examination' : 'Physical Examination',
    },
    { key: 'assessment', label: 'Assessment / Diagnosis' },
    { key: 'plan', label: 'Treatment Plan' },
    { key: 'followUpPlan', label: 'Follow-Up Plan' },
  ];

  const patientCtxForQuick =
    current &&
    toPatientCtx({
      personId: current.personId,
      name: current.name,
      mrn: current.mrn,
      age: current.age,
      sex: current.sex,
      clinic: current.clinic,
      encounterId: current.encounterId,
    });

  return (
    <Shell title="Consultation Workspace">
      <Card className="mb-4 border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-900">
          This queue is stored in this browser. Patients appear after Records or Nursing records vitals and sends them to consultation.
        </p>
      </Card>
      {error && (
        <Card className="mb-4 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-800">{error}</p>
          <Button size="sm" className="mt-2" variant="outline" onClick={() => void refreshAll()}>
            Retry
          </Button>
        </Card>
      )}

      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={() => void refreshAll()} disabled={loadingQueue}>
          {loadingQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <button type="button" onClick={() => setTab('queue')} className="text-left">
          <SummaryCard
            title="Waiting Queue"
            value={loadingQueue ? '…' : String(queueSummary.waiting || queue.length)}
            subtitle={queueSummary.paymentBlocked ? `${queueSummary.paymentBlocked} payment blocked` : 'To be seen'}
            icon={Users}
          />
        </button>
        <button type="button" onClick={() => setTab('active')} className="text-left">
          <SummaryCard
            title="Active Consultation"
            value={loadingActive ? '…' : String(active.length)}
            subtitle="In progress"
            icon={Stethoscope}
          />
        </button>
        <button type="button" onClick={() => setTab('completed')} className="text-left">
          <SummaryCard
            title="Completed Today"
            value={loadingCompleted ? '…' : String(completed.length)}
            subtitle="So far"
            icon={CheckCircle2}
          />
        </button>
        <button type="button" onClick={() => setTab('followup')} className="text-left">
          <SummaryCard
            title="Follow-Up Patients"
            value={loadingFollowups ? '…' : String(fuSummary.thisWeek || followups.length)}
            subtitle="This week"
            icon={Clock}
          />
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue">Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="active">Active Consultation ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="followup">Follow-Up ({followups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="p-4 mb-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Input placeholder="Search name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select value={fClinic} onValueChange={setFClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clinics</SelectItem>
                  <SelectItem value="OPC">OPC</SelectItem>
                  <SelectItem value="GMPC">GMPC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fPriority} onValueChange={setFPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setQ('');
                  setFClinic('all');
                  setFPriority('all');
                }}
              >
                Reset
              </Button>
            </div>
          </Card>
          <Card className="overflow-x-auto">
            {loadingQueue ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading consultation queue…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Hospital No.</TableHead>
                    <TableHead>Age/Sex</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Visit</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Wait</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Vitals</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((r) => {
                    const blocked = !r.canStart || !r.paymentCleared || r.payment === 'Pending';
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.mrn}</TableCell>
                        <TableCell>
                          {r.age ?? '—'}/{r.sex || '—'}
                        </TableCell>
                        <TableCell>{r.clinic}</TableCell>
                        <TableCell>{r.visit}</TableCell>
                        <TableCell>{r.arrival}</TableCell>
                        <TableCell>{r.wait}</TableCell>
                        <TableCell>
                          <StatusPill tone={priorityTone(r.priority)}>{r.priority}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={r.payment === 'Pending' ? 'amber' : 'green'}>{r.payment}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={r.vitals === 'Pending' ? 'amber' : 'green'}>{r.vitals}</StatusPill>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{r.last}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              disabled={blocked || actionLoading}
                              title={blocked ? 'Payment pending — cashier must confirm' : 'Start consultation'}
                              onClick={() => void startConsult(r)}
                            >
                              Start
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReturnModal(r)}>
                              Return
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void openSummary(r)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setNoShow(r)}
                            >
                              <AlertTriangle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {queue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-6">
                        No patients in the consultation queue.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="active">
          {loadingActive ? (
            <Card className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading active consultations…
            </Card>
          ) : active.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No active consultations. Start one from the Queue tab.
            </Card>
          ) : (
            <div className="grid lg:grid-cols-12 gap-4">
              <Card className="lg:col-span-3 p-3">
                <h3 className="font-semibold text-sm mb-3">Active Patients ({active.length})</h3>
                <div className="space-y-2">
                  {active.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveId(a.id)}
                      className={`w-full text-left p-2 rounded border ${activeId === a.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                    >
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.mrn}</div>
                      <div className="text-xs mt-1 flex flex-wrap gap-1">
                        <StatusPill tone={priorityTone(a.priority)}>{a.priority}</StatusPill>
                        <StatusPill tone={a.saveStatus === 'saved' ? 'green' : 'amber'}>{a.status}</StatusPill>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Started {a.startedAt}</div>
                    </button>
                  ))}
                </div>
              </Card>

              <div className="lg:col-span-9 space-y-3">
                {!current ? (
                  <Card className="p-8 text-center text-muted-foreground">Select a patient from the list.</Card>
                ) : (
                  <>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">
                            {current.name} · {current.sex}, {current.age ?? '—'}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            {current.mrn} · {current.clinic} · {current.visit}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <StatusPill tone={priorityTone(current.priority)}>{current.priority}</StatusPill>
                            <StatusPill tone={current.payment === 'Pending' ? 'amber' : 'green'}>
                              {current.payment}
                            </StatusPill>
                            <DoctorHmoCoverageBadge personId={current.personId} />
                            <StatusPill tone="blue">Last: {current.last}</StatusPill>
                            <StatusPill
                              tone={
                                current.saveStatus === 'saving'
                                  ? 'amber'
                                  : current.saveStatus === 'error'
                                    ? 'red'
                                    : 'green'
                              }
                            >
                              {current.saveStatus === 'saving'
                                ? 'Saving…'
                                : current.saveStatus === 'saved'
                                  ? 'Synced'
                                  : current.saveStatus === 'error'
                                    ? 'Save error'
                                    : 'Autosave 3s'}
                            </StatusPill>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => navigate(`${base}/timeline`)}>
                            Timeline
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.print()}>
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </div>
                      </div>
                    </Card>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {[
                        {
                          l: 'Vitals',
                          v: formatVitalsLine(activeSummary?.vitals) || current.vitals || '—',
                        },
                        {
                          l: 'Allergies',
                          v: activeSummary?.allergies?.length ? activeSummary.allergies.join(', ') : '—',
                        },
                        {
                          l: 'Active Meds',
                          v: activeSummary?.activeMeds?.length
                            ? activeSummary.activeMeds
                                .slice(0, 2)
                                .map((m) => m.drugName)
                                .join(', ')
                            : '—',
                        },
                        {
                          l: 'Prev Dx',
                          v: activeSummary?.previousDiagnoses?.[0]?.label || '—',
                        },
                      ].map((c) => (
                        <Card key={c.l} className="p-3">
                          <div className="text-xs text-muted-foreground">{c.l}</div>
                          <div className="text-sm font-medium">{c.v}</div>
                        </Card>
                      ))}
                    </div>

                    <Card className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-sm">Previous consultations</h3>
                        <Button size="sm" variant="outline" onClick={() => navigate(`${base}/timeline`)}>
                          View full timeline
                        </Button>
                      </div>
                      {activeSummaryLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                        </div>
                      ) : !activeSummary?.recentNotes?.length ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No prior completed consultations for this patient.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const last = activeSummary.recentNotes[0];
                            const snippets = activeSummary.historySnippets;
                            const chip = (label: string, value?: string | null) => (
                              <span
                                key={label}
                                className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                                title={value || undefined}
                              >
                                <span className="font-medium text-foreground/80">{label}</span>
                                <span className="truncate">{(value || '').trim() || '—'}</span>
                              </span>
                            );
                            return (
                              <>
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <StatusPill tone="green">Last visit</StatusPill>
                                    {last.clinic && <StatusPill tone="blue">{last.clinic}</StatusPill>}
                                    {last.outcome && <StatusPill tone="sky">{last.outcome}</StatusPill>}
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {last.completedAt
                                        ? new Date(last.completedAt).toLocaleString()
                                        : new Date(last.startedAt).toLocaleString()}
                                      {' · '}
                                      {last.doctorName}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium leading-snug">{last.summary || 'No summary recorded'}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {chip('PMH', snippets?.pastMedicalHistory)}
                                    {chip('Drugs', snippets?.drugHistory)}
                                    {chip('Allergy', snippets?.allergyHistory)}
                                    {chip('Family', snippets?.familyHistory)}
                                    {chip('Social', snippets?.socialHistory)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setLastVisitExpanded((v) => !v)}
                                  >
                                    {lastVisitExpanded ? 'Hide note details' : 'Show assessment & plan'}
                                  </Button>
                                  {lastVisitExpanded && (
                                    <div className="grid sm:grid-cols-2 gap-2 text-xs border-t pt-2">
                                      <div>
                                        <div className="font-medium text-muted-foreground mb-0.5">Assessment</div>
                                        <div className="whitespace-pre-wrap">{last.note?.assessment?.trim() || '—'}</div>
                                      </div>
                                      <div>
                                        <div className="font-medium text-muted-foreground mb-0.5">Plan</div>
                                        <div className="whitespace-pre-wrap">{last.note?.plan?.trim() || '—'}</div>
                                      </div>
                                      <div className="sm:col-span-2">
                                        <div className="font-medium text-muted-foreground mb-0.5">Chief complaint</div>
                                        <div className="whitespace-pre-wrap">{last.note?.chiefComplaint?.trim() || '—'}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {activeSummary.recentNotes.length > 1 && (
                                  <div className="space-y-1.5">
                                    <div className="text-xs font-medium text-muted-foreground">Earlier visits</div>
                                    {activeSummary.recentNotes.slice(1).map((n) => (
                                      <div
                                        key={n.encounterId}
                                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-2.5 py-2 text-xs hover:bg-muted/30"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium text-foreground truncate">{n.summary || 'Visit note'}</div>
                                          <div className="text-muted-foreground mt-0.5">
                                            {n.doctorName}
                                            {n.clinic ? ` · ${n.clinic}` : ''}
                                          </div>
                                        </div>
                                        <div className="text-muted-foreground whitespace-nowrap">
                                          {n.completedAt
                                            ? new Date(n.completedAt).toLocaleDateString()
                                            : new Date(n.startedAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          Clinical Documentation {current.clinic === 'OPC' ? '(OPC)' : '(GMPC)'}
                        </h3>
                        <span className="text-xs text-muted-foreground">v{current.version} · Autosave 3s</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {noteFields.map((f) => (
                          <div key={f.key}>
                            <Label className="text-xs">{f.label}</Label>
                            <Textarea
                              rows={2}
                              value={current.note[f.key] || ''}
                              onChange={(e) => updateNoteField(f.key, e.target.value)}
                              disabled={actionLoading}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3">
                        <Button size="sm" variant="outline" onClick={() => void saveDraftNow()} disabled={actionLoading}>
                          <Save className="h-3 w-3 mr-1" />
                          Save Draft
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setComplete(true)} disabled={actionLoading}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete Consultation
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
                      <div className="-mx-1 overflow-x-auto pb-1">
                        <div className="flex min-w-max gap-2 px-1">
                          {(
                            [
                              { l: 'Diagnosis' as const, i: BookOpen },
                              { l: 'Prescription' as const, i: Pill },
                              { l: 'Lab Request' as const, i: FlaskConical },
                              { l: 'Imaging Request' as const, i: ScanLine },
                              { l: 'Admission' as const, i: BedDouble },
                              { l: 'Referral' as const, i: Send },
                              { l: 'Transfer' as const, i: ArrowRightLeft },
                            ] as const
                          ).map((a) => (
                            <Button
                              key={a.l}
                              size="sm"
                              variant="outline"
                              className="shrink-0 justify-start"
                              onClick={() => {
                                if (!patientCtxForQuick) return;
                                setDocPatientContext(patientCtxForQuick);
                                if (a.l === 'Lab Request') {
                                  setLabDialogOpen(true);
                                  return;
                                }
                                setQuickAction(a.l);
                              }}
                            >
                              <a.i className="h-3 w-3 mr-1" />
                              {a.l}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          <Card className="overflow-x-auto">
            {loadingCompleted ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading completed consultations…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completed.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.mrn}</TableCell>
                      <TableCell>{c.clinic}</TableCell>
                      <TableCell>{c.dx}</TableCell>
                      <TableCell>{c.start}</TableCell>
                      <TableCell>{c.end}</TableCell>
                      <TableCell>{c.duration}</TableCell>
                      <TableCell>
                        <StatusPill tone="green">{c.outcome}</StatusPill>
                      </TableCell>
                      <TableCell>{c.doctor}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setCompletedView(c)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => window.print()}>
                          <Printer className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {completed.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        No consultations completed today.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="followup">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">This Week</div>
              <div className="text-2xl font-semibold">{fuSummary.thisWeek}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Due Today</div>
              <div className="text-2xl font-semibold">{fuSummary.dueToday}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Missed</div>
              <div className="text-2xl font-semibold">{fuSummary.missed}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div className="text-2xl font-semibold">{fuSummary.scheduled}</div>
            </Card>
          </div>
          <div className="flex justify-end mb-3">
            <Button
              onClick={() => {
                setScheduleFU(true);
                setFuPersonId(null);
                setFuPatientQ('');
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Schedule New
            </Button>
          </div>
          <Card className="overflow-x-auto">
            {loadingFollowups ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading follow-ups…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Previous Dx</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Follow-Up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="font-mono text-xs">{f.mrn}</TableCell>
                      <TableCell>{f.clinic || '—'}</TableCell>
                      <TableCell>{f.prevDx || '—'}</TableCell>
                      <TableCell>{f.lastVisit || '—'}</TableCell>
                      <TableCell>
                        {f.date}
                        {f.time ? ` ${f.time}` : ''}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            f.status === 'Missed'
                              ? 'red'
                              : f.status === 'Due Today'
                                ? 'amber'
                                : f.status === 'Attended'
                                  ? 'green'
                                  : 'blue'
                          }
                        >
                          {f.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              localUpdateFollowUp(f.id, { status: 'Attended' });
                              toast.success('Marked attended');
                              void loadFollowups();
                            } catch (err) {
                              toast.error(err instanceof ApiError ? err.message : 'Update failed');
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          Attended
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              localUpdateFollowUp(f.id, { status: 'Cancelled' });
                              toast.success('Follow-up cancelled');
                              void loadFollowups();
                            } catch (err) {
                              toast.error(err instanceof ApiError ? err.message : 'Update failed');
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {followups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        No follow-ups scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!returnModal} onOpenChange={(o) => !o && setReturnModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Patient · {returnModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              <b>Previous Visit:</b> {returnModal?.last}
            </div>
            <div>
              <b>Payment:</b> {returnModal?.payment}
            </div>
            <div>
              <b>Vitals:</b> {returnModal?.vitals}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={() => {
                if (returnModal) void startConsult(returnModal);
                setReturnModal(null);
              }}
            >
              Start Return Consultation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!summaryDrawer} onOpenChange={(o) => !o && setSummaryDrawer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Summary · {summaryDrawer?.name}</DialogTitle>
          </DialogHeader>
          {summaryLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <b>Demographics:</b> {clinicalSummary?.demographics.age ?? summaryDrawer?.age}/
                {clinicalSummary?.demographics.sex ?? summaryDrawer?.sex}
              </div>
              <div>
                <b>MRN:</b> {clinicalSummary?.demographics.mrn ?? summaryDrawer?.mrn}
              </div>
              <div>
                <b>Phone:</b> {clinicalSummary?.demographics.phone || '—'}
              </div>
              <div>
                <b>Allergies:</b>{' '}
                {clinicalSummary?.allergies?.length ? clinicalSummary.allergies.join(', ') : '—'}
              </div>
              <div>
                <b>Previous Dx:</b> {clinicalSummary?.previousDiagnoses?.[0]?.label || '—'}
              </div>
              <div>
                <b>Last Visit:</b> {clinicalSummary?.lastVisit || summaryDrawer?.last || '—'}
              </div>
              <div>
                <b>Active Meds:</b>{' '}
                {clinicalSummary?.activeMeds?.length
                  ? clinicalSummary.activeMeds.map((m) => m.drugName).join(', ')
                  : '—'}
              </div>
              <div>
                <b>Vitals:</b> {formatVitalsLine(clinicalSummary?.vitals) || summaryDrawer?.vitals || '—'}
              </div>
              <div>
                <b>Payment:</b> {clinicalSummary?.payment.display || summaryDrawer?.payment}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!noShow} onOpenChange={(o) => !o && setNoShow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark No-Show?</DialogTitle>
            <DialogDescription>
              {noShow?.name} will be removed from your local queue view. Re-route from Records if they return.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShow(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setQueue((prev) => prev.filter((x) => x.id !== noShow!.id));
                setNoShow(null);
                notifySuccess('Patient dismissed from queue view.', 'No-Show');
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={complete} onOpenChange={setComplete}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Consultation</DialogTitle>
            <DialogDescription>Choose outcome. Follow-up date is required when scheduling follow-up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discharge">Discharge home</SelectItem>
                  <SelectItem value="followup">Follow-up appointment</SelectItem>
                  <SelectItem value="admit">Admit patient</SelectItem>
                  <SelectItem value="refer">Refer patient</SelectItem>
                  <SelectItem value="transfer">Transfer patient</SelectItem>
                  <SelectItem value="await">Await lab/imaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {outcome === 'followup' && (
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label>Follow-up date</Label>
                  <Input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={fuPriority} onValueChange={setFuPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Reason</Label>
                  <Textarea rows={2} value={fuReason} onChange={(e) => setFuReason(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplete(false)}>
              Cancel
            </Button>
            <Button disabled={actionLoading} onClick={() => void finalizeConsult()}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleFU} onOpenChange={setScheduleFU}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Follow-Up Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Patient</Label>
            <Input
              placeholder="Search registered patient…"
              value={fuPatientQ}
              onChange={(e) => setFuPatientQ(e.target.value)}
            />
            {fuSearching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            <div className="max-h-32 overflow-auto space-y-1">
              {fuPatientResults.map((p) => (
                <button
                  key={p.personId}
                  type="button"
                  className={`w-full text-left text-sm border rounded p-2 hover:bg-accent ${fuPersonId === p.personId ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => {
                    setFuPersonId(p.personId);
                    setFuPatientQ(`${p.name} (${p.mrn})`);
                  }}
                >
                  {p.name} · {p.mrn}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Select value={fuClinic} onValueChange={setFuClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPC">OPC</SelectItem>
                  <SelectItem value="GMPC">GMPC</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
              <Input type="time" value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
              <Select value={fuPriority} onValueChange={setFuPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Reason / notes"
                className="sm:col-span-2"
                value={fuReason}
                onChange={(e) => setFuReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleFU(false)}>
              Cancel
            </Button>
            <Button disabled={actionLoading} onClick={() => void scheduleFollowUp()}>
              <CalendarClock className="h-4 w-4 mr-1" />
              Schedule Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completedView} onOpenChange={(o) => !o && setCompletedView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Consultation · {completedView?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <div>
              <b>MRN:</b> {completedView?.mrn}
            </div>
            <div>
              <b>Clinic:</b> {completedView?.clinic}
            </div>
            <div>
              <b>Assessment:</b> {completedView?.dx}
            </div>
            <div>
              <b>Outcome:</b> {completedView?.outcome}
            </div>
            <div>
              <b>Duration:</b> {completedView?.duration}
            </div>
            <div>
              <b>Doctor:</b> {completedView?.doctor}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              Print Summary
            </Button>
            <Button onClick={() => setCompletedView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoctorWorkspaceQuickFlowSheet
        action={quickAction}
        patientContext={patientCtxForQuick}
        onClose={() => setQuickAction(null)}
        onOpenFull={(path, ctx) => {
          setDocPatientContext(ctx);
          setQuickAction(null);
          navigate(`${base}${path}`, { state: { patient: ctx } });
        }}
      />

      {current && (
        <LabRequestDialog
          open={labDialogOpen}
          onOpenChange={setLabDialogOpen}
          personId={current.personId}
          encounterId={current.encounterId}
          patientName={current.name}
          hospitalNo={current.mrn}
        />
      )}
    </Shell>
  );
};
