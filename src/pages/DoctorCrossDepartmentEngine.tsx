import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ApiError } from '@/lib/api/client';
import {
  acknowledgeImagingReport,
  acknowledgeLabResult,
  acknowledgeNotification,
  clearDoctorCrossDeptMockStorage,
  fetchCrossDeptAggregates,
  isCrossDeptApiEnabled,
  type CrossDeptAggregates,
} from '@/lib/api/doctorCrossDept';
import { imagingPatientName } from '@/lib/api/imaging';
import { labPatientName } from '@/lib/api/laboratory';
import { referralPatientName, type ApiReferral } from '@/lib/api/referrals';
import {
  Plug, RefreshCw, Send, Plus, ListChecks, Download, MessageSquare, AlertTriangle,
  Clock, CheckCircle2, Printer, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';

const PENDING_MODULE_HEALTH =
  'Cross-department module health monitoring API is not available yet.';
const PENDING_MESSAGES = 'Department messaging API is not available yet.';
const PENDING_SYNC = 'Cross-department sync and integration log API is not available yet.';
const PENDING_CROSS_ACTIONS =
  'Cross-department messaging, tasks, escalation, and export APIs are not available yet.';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Cross-Department">{children}</DashboardLayout>
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
    case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

type TabId = 'modules' | 'pending' | 'messages' | 'tracker' | 'critical' | 'completed' | 'sync';
type RequestStage = 'Created' | 'Sent' | 'Received' | 'In progress' | 'Completed' | 'Returned' | 'Doctor notified';

interface PendingAction {
  id: string; patientId: string; patientName: string; hospitalId: string;
  department: string; requestType: string; priority: string; sentTime: string;
  waitingMin: number; status: string; clinic: 'OPC' | 'GMPC' | 'Ward';
  moduleRoute: string;
}

interface TrackedRequest {
  id: string; requestNo: string; patientId: string; patientName: string; hospitalId: string;
  department: string; request: string; priority: string; dateTime: string;
  stage: RequestStage; status: string; clinic: 'OPC' | 'GMPC' | 'Ward';
  timeline: { stage: RequestStage; time: string; note?: string }[];
  moduleRoute: string;
}

type CriticalSource = 'lab' | 'imaging' | 'notification';

interface CriticalUpdate {
  id: string; source: CriticalSource; apiId: number;
  time: string; patientId: string; patientName: string; hospitalId: string;
  department: string; alertType: string; severity: 'Critical' | 'High' | 'Medium';
  message: string; acknowledged: boolean; clinic: 'OPC' | 'GMPC' | 'Ward';
  moduleRoute: string;
}

interface CompletedAction {
  id: string; patientName: string; hospitalId: string; department: string;
  requestType: string; completedBy: string; completedTime: string; turnaroundMin: number;
}

const DEPT_LIST = [
  'Nursing', 'Lab', 'Pharmacy', 'Radiology', 'Billing', 'Records', 'Psychology',
  'Social Work', 'Therapy', 'NHIA/NHIS', 'Patient Portal Support',
] as const;

function formatApiTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', { hour12: false });
  } catch {
    return iso;
  }
}

function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function clinicFromCareSetting(careSetting: string | null | undefined): 'OPC' | 'GMPC' | 'Ward' {
  if (careSetting === 'Inpatient') return 'Ward';
  if (careSetting === 'GMPC') return 'GMPC';
  return 'OPC';
}

function referralStage(status: string): RequestStage {
  if (['Completed', 'ClearedExternal', 'Admitted'].includes(status)) return 'Completed';
  if (status === 'Returned') return 'Returned';
  if (['Accepted', 'InAttendance'].includes(status)) return 'In progress';
  if (['QueuedForDept', 'AwaitingBed', 'BedAllocated'].includes(status)) return 'Received';
  return 'Sent';
}

function referralModuleRoute(r: ApiReferral): string {
  const dept = (r.toDepartment ?? r.fromDepartment ?? '').toLowerCase();
  if (dept.includes('lab')) return `${base}/lab`;
  if (dept.includes('radiolog') || dept.includes('imaging')) return `${base}/imaging`;
  if (dept.includes('pharm')) return `${base}/prescriptions`;
  if (dept.includes('ward') || dept.includes('bed')) return `${base}/admission`;
  return `${base}/referrals`;
}

function mapReferralToPending(r: ApiReferral): PendingAction {
  const sent = r.createdAt ?? r.updatedAt ?? '';
  return {
    id: `ref-${r.referralId}`,
    patientId: String(r.personId),
    patientName: referralPatientName(r),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: r.toDepartment ?? r.fromDepartment ?? 'Referral',
    requestType: 'Referral',
    priority: r.priority,
    sentTime: formatApiTime(sent),
    waitingMin: minutesSince(sent),
    status: r.status,
    clinic: clinicFromCareSetting(r.careSetting),
    moduleRoute: referralModuleRoute(r),
  };
}

function mapLabRequestToPending(r: import('@/lib/api/laboratory').ApiLabRequest): PendingAction {
  const sent = r.createdAt ?? r.updatedAt ?? '';
  return {
    id: `lab-${r.labRequestId}`,
    patientId: String(r.personId),
    patientName: labPatientName(r.person),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: 'Laboratory',
    requestType: 'Lab request',
    priority: r.priority,
    sentTime: formatApiTime(sent),
    waitingMin: minutesSince(sent),
    status: r.labStatus ?? r.status,
    clinic: 'OPC',
    moduleRoute: `${base}/lab`,
  };
}

function mapImagingRequestToPending(r: import('@/lib/api/imaging').ApiImagingRequest): PendingAction {
  const sent = r.createdAt ?? r.updatedAt ?? '';
  return {
    id: `img-${r.imagingRequestId}`,
    patientId: String(r.personId),
    patientName: imagingPatientName(r.person),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: 'Radiology / ECG',
    requestType: 'Imaging request',
    priority: r.priority,
    sentTime: formatApiTime(sent),
    waitingMin: minutesSince(sent),
    status: r.status,
    clinic: 'OPC',
    moduleRoute: `${base}/imaging`,
  };
}

function mapReferralToTracked(r: ApiReferral): TrackedRequest {
  const timeline = (r.events ?? []).map((e) => ({
    stage: referralStage(e.newStatus ?? r.status),
    time: formatApiTime(e.createdAt),
    note: e.note ?? undefined,
  }));
  if (timeline.length === 0 && r.createdAt) {
    timeline.push({ stage: 'Created', time: formatApiTime(r.createdAt) });
  }
  return {
    id: `ref-${r.referralId}`,
    requestNo: r.referralNo,
    patientId: String(r.personId),
    patientName: referralPatientName(r),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: r.toDepartment ?? r.fromDepartment ?? 'Referral',
    request: r.reason,
    priority: r.priority,
    dateTime: formatApiTime(r.createdAt),
    stage: referralStage(r.status),
    status: r.status,
    clinic: clinicFromCareSetting(r.careSetting),
    timeline,
    moduleRoute: referralModuleRoute(r),
  };
}

function mapLabRequestToTracked(r: import('@/lib/api/laboratory').ApiLabRequest): TrackedRequest {
  const sent = r.createdAt ?? '';
  const timeline: TrackedRequest['timeline'] = [{ stage: 'Created', time: formatApiTime(sent) }];
  if (r.status === 'Sent') timeline.push({ stage: 'Sent', time: formatApiTime(sent) });
  if (r.labStatus) timeline.push({ stage: 'In progress', time: formatApiTime(r.updatedAt), note: r.labStatus });
  return {
    id: `lab-${r.labRequestId}`,
    requestNo: r.requestNo,
    patientId: String(r.personId),
    patientName: labPatientName(r.person),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: 'Laboratory',
    request: r.items.map((i) => i.testName).join(', ') || r.clinicalIndication || 'Lab request',
    priority: r.priority,
    dateTime: formatApiTime(sent),
    stage: r.labStatus === 'Validated' ? 'Completed' : r.labStatus ? 'In progress' : 'Sent',
    status: r.labStatus ?? r.status,
    clinic: 'OPC',
    timeline,
    moduleRoute: `${base}/lab`,
  };
}

function mapImagingRequestToTracked(r: import('@/lib/api/imaging').ApiImagingRequest): TrackedRequest {
  const sent = r.createdAt ?? '';
  return {
    id: `img-${r.imagingRequestId}`,
    requestNo: r.requestNo,
    patientId: String(r.personId),
    patientName: imagingPatientName(r.person),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: 'Radiology / ECG',
    request: r.items.map((i) => i.studyName).join(', ') || r.clinicalIndication || 'Imaging request',
    priority: r.priority,
    dateTime: formatApiTime(sent),
    stage: r.status === 'Completed' ? 'Completed' : 'In progress',
    status: r.status,
    clinic: 'OPC',
    timeline: [{ stage: 'Created', time: formatApiTime(sent) }, { stage: 'Sent', time: formatApiTime(sent) }],
    moduleRoute: `${base}/imaging`,
  };
}

function mapAggregatesToCritical(data: CrossDeptAggregates): CriticalUpdate[] {
  const rows: CriticalUpdate[] = [];
  for (const r of data.criticalLab) {
    rows.push({
      id: `lab-${r.labResultId}`,
      source: 'lab',
      apiId: r.labResultId,
      time: formatApiTime(r.validatedAt ?? r.enteredAt),
      patientId: String(r.personId ?? ''),
      patientName: r.personName ?? 'Unknown',
      hospitalId: r.hospitalNo ?? '',
      department: 'Laboratory',
      alertType: 'Critical lab result',
      severity: 'Critical',
      message: r.comment ?? r.testName ?? 'Critical lab finding',
      acknowledged: Boolean(r.criticalAckAt),
      clinic: 'OPC',
      moduleRoute: `${base}/results`,
    });
  }
  for (const r of data.criticalImaging) {
    rows.push({
      id: `img-${r.reportId}`,
      source: 'imaging',
      apiId: r.reportId,
      time: formatApiTime(r.releasedAt ?? r.createdAt),
      patientId: String(r.personId),
      patientName: imagingPatientName(r.person),
      hospitalId: r.person?.hospitalNo ?? '',
      department: 'Radiology / ECG',
      alertType: 'Critical imaging report',
      severity: 'Critical',
      message: r.impression ?? r.findings ?? 'Critical imaging finding',
      acknowledged: Boolean(r.criticalAckAt),
      clinic: 'OPC',
      moduleRoute: `${base}/imaging`,
    });
  }
  for (const n of data.unreadNotifications) {
    rows.push({
      id: `notif-${n.notificationId}`,
      source: 'notification',
      apiId: n.notificationId,
      time: formatApiTime(n.createdAt),
      patientId: n.personId != null ? String(n.personId) : '',
      patientName: n.title,
      hospitalId: '',
      department: n.roleHint ?? 'System',
      alertType: n.type,
      severity: n.type.toLowerCase().includes('critical') ? 'Critical' : 'High',
      message: n.body ?? n.title,
      acknowledged: n.isRead || Boolean(n.acknowledgedAt),
      clinic: 'OPC',
      moduleRoute: n.linkPath ?? `${base}/workspace`,
    });
  }
  return rows.sort((a, b) => (a.time < b.time ? 1 : -1));
}

function mapReferralToCompleted(r: ApiReferral): CompletedAction {
  const done = r.completedAt ?? r.updatedAt ?? r.createdAt ?? '';
  const start = r.createdAt ?? done;
  return {
    id: `ref-${r.referralId}`,
    patientName: referralPatientName(r),
    hospitalId: r.person?.hospitalNo ?? `PID-${r.personId}`,
    department: r.toDepartment ?? r.fromDepartment ?? 'Referral',
    requestType: 'Referral',
    completedBy: r.toDoctorLabel ?? r.toDepartment ?? 'Department',
    completedTime: formatApiTime(done),
    turnaroundMin: minutesSince(start) - minutesSince(done) >= 0 ? minutesSince(start) : 0,
  };
}

const toCtx = (p: { id: string; name: string; hospitalId: string; clinic: string }): DocPatientContext => ({
  id: p.id, name: p.name, hospitalId: p.hospitalId,
  clinic: p.clinic === 'GMPC' ? 'GMPC' : p.clinic === 'Ward' ? 'OPC' : 'OPC',
  noteType: 'Cross-Department',
});

const severityTone = (s: string) => (s === 'Critical' ? 'red' : s === 'High' ? 'amber' : 'blue');

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b whitespace-nowrap">{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2.5 border-b align-middle ${className}`}>{children}</td>
);

const EmptyRow = ({ colSpan, message }: { colSpan: number; message: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">{message}</td>
  </tr>
);

const LoadingRow = ({ colSpan }: { colSpan: number }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin inline mr-2" aria-hidden />
      Loading…
    </td>
  </tr>
);

export const DocCrossDept = () => {
  const navigate = useNavigate();
  const useApi = isCrossDeptApiEnabled();

  const [tab, setTab] = useState<TabId>('modules');
  const [loading, setLoading] = useState(useApi);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [ackSubmitting, setAckSubmitting] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction[]>([]);
  const [requests, setRequests] = useState<TrackedRequest[]>([]);
  const [critical, setCritical] = useState<CriticalUpdate[]>([]);
  const [completed, setCompleted] = useState<CompletedAction[]>([]);
  const [overviewPendingLab, setOverviewPendingLab] = useState(0);
  const [overviewPendingImaging, setOverviewPendingImaging] = useState(0);

  const [messageOpen, setMessageOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [trackRequest, setTrackRequest] = useState<TrackedRequest | null>(null);
  const [completedView, setCompletedView] = useState<CompletedAction | null>(null);

  useEffect(() => {
    if (useApi) clearDoctorCrossDeptMockStorage();
  }, [useApi]);

  const applyAggregates = useCallback((data: CrossDeptAggregates) => {
    const pendingRows = [
      ...data.pendingReferrals.map(mapReferralToPending),
      ...data.pendingLabRequests.map(mapLabRequestToPending),
      ...data.pendingImagingRequests.map(mapImagingRequestToPending),
    ];
    setPending(pendingRows);
    setRequests([
      ...data.pendingReferrals.map(mapReferralToTracked),
      ...data.pendingLabRequests.map(mapLabRequestToTracked),
      ...data.pendingImagingRequests.map(mapImagingRequestToTracked),
    ]);
    setCritical(mapAggregatesToCritical(data));
    setCompleted(data.completedReferrals.map(mapReferralToCompleted));
    setOverviewPendingLab(data.overview?.kpis.pendingLabResults ?? data.pendingLabRequests.length);
    setOverviewPendingImaging(data.overview?.kpis.pendingImaging ?? data.pendingImagingRequests.length);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!useApi) return;
    setRefreshSpin(true);
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCrossDeptAggregates();
      applyAggregates(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load cross-department data';
      setLoadError(msg);
      toast.error(msg);
      setPending([]);
      setRequests([]);
      setCritical([]);
      setCompleted([]);
    } finally {
      setLoading(false);
      setRefreshSpin(false);
    }
  }, [useApi, applyAggregates]);

  useEffect(() => {
    if (useApi) void refreshStatus();
  }, [useApi, refreshStatus]);

  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    return {
      connected: 0,
      pending: pending.length,
      unread: critical.filter((c) => c.source === 'notification' && !c.acknowledged).length,
      delayed: pending.filter((p) => p.waitingMin > 60).length,
      critical: critical.filter((c) => !c.acknowledged).length,
      completedToday: completed.filter((c) => {
        try {
          return new Date(c.completedTime).toDateString() === today;
        } catch {
          return false;
        }
      }).length,
      overviewLab: overviewPendingLab,
      overviewImaging: overviewPendingImaging,
    };
  }, [pending, critical, completed, overviewPendingLab, overviewPendingImaging]);

  const navigatePatient = useCallback((
    patientId: string,
    patientName: string,
    hospitalId: string,
    path: string,
    clinic = 'OPC',
  ) => {
    if (!patientId) {
      toast.error('Patient not linked');
      return;
    }
    setDocPatientContext(toCtx({ id: patientId, name: patientName, hospitalId, clinic }));
    navigate(path);
  }, [navigate]);

  const acknowledgeCritical = async (item: CriticalUpdate) => {
    if (!useApi || item.acknowledged) return;
    setAckSubmitting(item.id);
    try {
      if (item.source === 'lab') await acknowledgeLabResult(item.apiId);
      else if (item.source === 'imaging') await acknowledgeImagingReport(item.apiId);
      else await acknowledgeNotification(item.apiId);
      await refreshStatus();
      toast.success('Alert acknowledged');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not acknowledge alert');
    } finally {
      setAckSubmitting(null);
    }
  };

  const offlineBanner = !useApi ? (
    <PendingIntegrationBanner
      reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL to load live cross-department data."
      className="mb-5"
    />
  ) : loadError ? (
    <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</div>
  ) : null;

  return (
    <Shell>
      {offlineBanner}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Cross-Department Coordination</h1>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Live clinical and operational coordination between doctor, nursing, lab, pharmacy, radiology, billing, records, wards, and allied health teams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={!useApi || refreshSpin || loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshSpin ? 'animate-spin' : ''}`} />Refresh Status
          </Button>
          <Button variant="outline" size="sm" disabled={!useApi} onClick={() => { setMessageOpen(true); setTab('messages'); }}>
            <Send className="h-4 w-4 mr-1" />Send Message
          </Button>
          {!useApi && <PendingIntegrationBanner compact reason={PENDING_CROSS_ACTIONS} />}
          <Button variant="outline" size="sm" disabled={!useApi} onClick={() => setTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTab('pending')}><ListChecks className="h-4 w-4 mr-1" />View Pending Actions</Button>
          <Button variant="outline" size="sm" disabled={!useApi} title={PENDING_CROSS_ACTIONS}>
            <Download className="h-4 w-4 mr-1" />Export Log
          </Button>
          {!useApi && <PendingIntegrationBanner compact reason={PENDING_CROSS_ACTIONS} />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { title: 'Connected Modules', value: useApi ? '—' : '0', sub: useApi ? 'Pending integration' : 'API off', icon: Plug, tone: 'teal' as const, tab: 'modules' as TabId },
          { title: 'Pending Actions', value: String(kpis.pending), sub: useApi ? `${kpis.overviewLab} lab · ${kpis.overviewImaging} imaging` : 'Awaiting response', icon: ListChecks, tone: 'amber' as const, tab: 'pending' as TabId },
          { title: 'Unread Messages', value: String(kpis.unread), sub: 'Notifications', icon: MessageSquare, tone: 'blue' as const, tab: 'critical' as TabId },
          { title: 'Delayed Requests', value: String(kpis.delayed), sub: 'Beyond expected TAT', icon: Clock, tone: 'purple' as const, tab: 'pending' as TabId },
          { title: 'Critical Updates', value: String(kpis.critical), sub: 'Urgent department alerts', icon: AlertTriangle, tone: 'rose' as const, tab: 'critical' as TabId },
          { title: 'Completed Today', value: String(kpis.completedToday), sub: 'Closed actions', icon: CheckCircle2, tone: 'green' as const, tab: 'completed' as TabId },
        ].map((k) => (
          <button key={k.title} type="button" onClick={() => setTab(k.tab)} className="text-left rounded-xl">
            <SummaryCard title={k.title} value={k.value} subtitle={k.sub} icon={k.icon} tone={k.tone} />
          </button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="modules">Module Status</TabsTrigger>
          <TabsTrigger value="pending">Pending Actions</TabsTrigger>
          <TabsTrigger value="messages">Department Messages</TabsTrigger>
          <TabsTrigger value="tracker">Request Tracker</TabsTrigger>
          <TabsTrigger value="critical">Critical Updates</TabsTrigger>
          <TabsTrigger value="completed">Completed Actions</TabsTrigger>
          <TabsTrigger value="sync">Sync / Integration Log</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          {useApi ? (
            <PendingIntegrationBanner reason={PENDING_MODULE_HEALTH} />
          ) : (
            <PendingIntegrationBanner reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL." />
          )}
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{['Patient', 'Hospital No.', 'Department', 'Request Type', 'Priority', 'Sent Time', 'Waiting', 'Status', 'Action'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {!useApi && <EmptyRow colSpan={9} message="Connect the backend API to view pending cross-department actions." />}
                  {useApi && loading && <LoadingRow colSpan={9} />}
                  {useApi && !loading && pending.length === 0 && <EmptyRow colSpan={9} message="No pending referrals, lab, or imaging requests." />}
                  {useApi && !loading && pending.map((p) => (
                    <tr key={p.id} className={`hover:bg-muted/40 ${p.waitingMin > 60 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                      <Td className="font-medium">{p.patientName}</Td>
                      <Td className="text-xs">{p.hospitalId}</Td>
                      <Td>{p.department}</Td>
                      <Td>{p.requestType}</Td>
                      <Td><StatusPill tone={p.priority === 'Emergency' || p.priority === 'Stat' ? 'red' : p.priority === 'Urgent' ? 'amber' : 'blue'}>{p.priority}</StatusPill></Td>
                      <Td className="text-xs">{p.sentTime}</Td>
                      <Td className={p.waitingMin > 60 ? 'text-amber-700 font-medium' : ''}>{p.waitingMin} min</Td>
                      <Td>{p.status}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1 items-center">
                          <Button size="sm" variant="ghost" onClick={() => navigate(p.moduleRoute)}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => navigatePatient(p.patientId, p.patientName, p.hospitalId, `${base}/timeline`, p.clinic)}>Timeline</Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          {useApi ? (
            <div className="grid md:grid-cols-4 gap-4 min-h-[420px]">
              <Card className="md:col-span-1 !p-0 overflow-hidden opacity-60 pointer-events-none">
                <div className="p-3 border-b font-medium text-sm">Departments</div>
                <div className="overflow-y-auto max-h-[380px]">
                  {DEPT_LIST.map((d) => (
                    <div key={d} className="w-full text-left px-3 py-2.5 text-sm border-b">{d}</div>
                  ))}
                </div>
              </Card>
              <div className="md:col-span-3">
                <PendingIntegrationBanner reason={PENDING_MESSAGES} />
              </div>
            </div>
          ) : (
            <PendingIntegrationBanner reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL." />
          )}
        </TabsContent>

        <TabsContent value="tracker">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{['Request No.', 'Patient', 'Department', 'Request', 'Priority', 'Date/Time', 'Stage', 'Status', 'Action'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {!useApi && <EmptyRow colSpan={9} message="Connect the backend API to track cross-department requests." />}
                  {useApi && loading && <LoadingRow colSpan={9} />}
                  {useApi && !loading && requests.length === 0 && <EmptyRow colSpan={9} message="No active referrals, lab, or imaging requests to track." />}
                  {useApi && !loading && requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <Td className="font-mono text-xs">{r.requestNo}</Td>
                      <Td className="font-medium">{r.patientName}</Td>
                      <Td>{r.department}</Td>
                      <Td className="max-w-[180px] truncate">{r.request}</Td>
                      <Td><StatusPill tone={r.priority === 'Emergency' || r.priority === 'Stat' ? 'red' : r.priority === 'Urgent' ? 'amber' : 'blue'}>{r.priority}</StatusPill></Td>
                      <Td className="text-xs">{r.dateTime}</Td>
                      <Td>{r.stage}</Td>
                      <Td>{r.status}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)}>Track</Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(r.moduleRoute)}>Open Module</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="critical">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{['Time', 'Patient', 'Department', 'Alert Type', 'Severity', 'Status', 'Action'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {!useApi && <EmptyRow colSpan={7} message="Connect the backend API to view critical lab, imaging, and notification alerts." />}
                  {useApi && loading && <LoadingRow colSpan={7} />}
                  {useApi && !loading && critical.length === 0 && <EmptyRow colSpan={7} message="No critical lab results, imaging reports, or unread notifications." />}
                  {useApi && !loading && critical.map((c) => (
                    <tr key={c.id} className={`hover:bg-muted/40 ${!c.acknowledged ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'opacity-60'}`}>
                      <Td className="text-xs">{c.time}</Td>
                      <Td className="font-medium">{c.patientName}</Td>
                      <Td>{c.department}</Td>
                      <Td>{c.alertType}</Td>
                      <Td><StatusPill tone={severityTone(c.severity)}>{c.severity}</StatusPill></Td>
                      <Td>{c.acknowledged ? 'Acknowledged' : <StatusPill tone="red">Open</StatusPill>}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1 items-center">
                          {!c.acknowledged && (
                            <Button size="sm" disabled={ackSubmitting === c.id} onClick={() => void acknowledgeCritical(c)}>
                              {ackSubmitting === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Acknowledge'}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => navigatePatient(c.patientId, c.patientName, c.hospitalId, c.moduleRoute, c.clinic)}>Open Patient</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{['Patient', 'Department', 'Request Type', 'Completed By', 'Completed Time', 'Turnaround', 'Action'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {!useApi && <EmptyRow colSpan={7} message="Connect the backend API to view completed cross-department actions." />}
                  {useApi && loading && <LoadingRow colSpan={7} />}
                  {useApi && !loading && completed.length === 0 && <EmptyRow colSpan={7} message="No completed referrals yet." />}
                  {useApi && !loading && completed.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <Td className="font-medium">{c.patientName}</Td>
                      <Td>{c.department}</Td>
                      <Td>{c.requestType}</Td>
                      <Td>{c.completedBy}</Td>
                      <Td className="text-xs">{c.completedTime}</Td>
                      <Td>{c.turnaroundMin} min</Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setCompletedView(c)}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          {useApi ? (
            <PendingIntegrationBanner reason={PENDING_SYNC} />
          ) : (
            <PendingIntegrationBanner reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL." />
          )}
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur p-2 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => void refreshStatus()} disabled={!useApi || refreshSpin}><RefreshCw className={`h-4 w-4 ${refreshSpin ? 'animate-spin' : ''}`} /></Button>
        <Button size="sm" className="flex-1" disabled={!useApi} onClick={() => setMessageOpen(true)}><Send className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" className="flex-1" disabled={!useApi} onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => setTab('pending')}><ListChecks className="h-4 w-4" /></Button>
      </div>

      <Sheet open={messageOpen} onOpenChange={setMessageOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Send Department Message</SheetTitle></SheetHeader>
          <PendingIntegrationBanner reason={PENDING_MESSAGES} className="mt-4" />
        </SheetContent>
      </Sheet>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Cross-Department Task</DialogTitle><DialogDescription>Send a task to another department with patient context.</DialogDescription></DialogHeader>
          <PendingIntegrationBanner reason={PENDING_CROSS_ACTIONS} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!trackRequest} onOpenChange={(o) => !o && setTrackRequest(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Request Timeline — {trackRequest?.requestNo}</SheetTitle><SheetDescription>{trackRequest?.patientName} · {trackRequest?.request}</SheetDescription></SheetHeader>
          {trackRequest && (
            <div className="mt-4 space-y-3">
              {(['Created', 'Sent', 'Received', 'In progress', 'Completed', 'Returned', 'Doctor notified'] as RequestStage[]).map((stage) => {
                const hit = trackRequest.timeline.find((t) => t.stage === stage);
                return (
                  <div key={stage} className={`flex gap-3 ${hit ? '' : 'opacity-40'}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${hit ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}`}>
                      {hit ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{stage}</div>
                      {hit && <div className="text-xs text-muted-foreground">{hit.time}{hit.note ? ` — ${hit.note}` : ''}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!completedView} onOpenChange={(o) => !o && setCompletedView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Completed Action Summary</DialogTitle></DialogHeader>
          {completedView && (
            <dl className="text-sm space-y-2">
              {[['Patient', completedView.patientName], ['Hospital No.', completedView.hospitalId], ['Department', completedView.department], ['Request', completedView.requestType], ['Completed by', completedView.completedBy], ['Time', completedView.completedTime], ['Turnaround', `${completedView.turnaroundMin} min`]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-1"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
          <DialogFooter><Button onClick={() => setCompletedView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
