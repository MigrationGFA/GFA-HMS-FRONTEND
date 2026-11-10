/**
 * Radiology dual-mode workflow pages (Phases 1–4).
 * When VITE_USE_API=true → HMS-BACKEND /api/radiology/*
 * Otherwise → local radiology-actions / db
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { InpatientImagingCard } from '@/components/inpatient/InpatientDemoPanels';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { DesktopOnlyTable, MobileWorklist, MobileWorklistCard } from '@/components/MobileWorklist';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/database';
import { formatCurrency } from '@/data/dummyData';
import { useRadiology } from '@/contexts/RadiologyStore';
import { ApiError } from '@/lib/api/client';
import { searchPersons, type PersonRecord } from '@/lib/api/patients';
import {
  adjustRadConsumable,
  completeImagingExam,
  createImagingRequest,
  createRadConsumable,
  createRadEquipment,
  createRadForm,
  getCriticalFindings,
  getRadiologyMetrics,
  imagingPatientName,
  interpretEcgStudy,
  isImagingApiEnabled,
  listConsumerImagingResults,
  listEcgStudies,
  listImagingRequests,
  listImagingStudies,
  listRadConsumables,
  listRadEquipment,
  listRadForms,
  listRadiologyReports,
  parsePrepJson,
  recordEcgStudy,
  releaseRadiologyReport,
  returnRadiologyReport,
  scheduleImagingRequest,
  startImagingExam,
  submitRadiologyReport,
  updateImagingRequest,
  updateRadEquipment,
  verifyRadiologyReport,
  type ApiConsumerResult,
  type ApiEcgStudy,
  type ApiImagingRequest,
  type ApiImagingStudy,
  type ApiRadConsumable,
  type ApiRadEquipment,
  type ApiRadForm,
  type ApiRadMetrics,
  type ApiRadiologyReport,
} from '@/lib/api/imaging';
import { RADIOLOGY_FORMS } from '@/lib/radiology-actions';
import type { EquipmentStatus, ImagingRequest } from '@/data-access/types';
import {
  LayoutDashboard, FilePlus, ClipboardList, CalendarDays, ClipboardCheck, Play,
  FileSignature, ShieldCheck, AlertTriangle, Send, HeartPulse, CreditCard, Wrench,
  Boxes, Search, Plus, CheckCircle2, Loader2, Radio, FileText, BarChart3, Archive,
  Printer, Bell, Smartphone, Upload, ImageIcon, ExternalLink, MessageSquare,
  Sparkles, History, ScrollText, Eye,
} from 'lucide-react';

const base = '/dashboard/radiology';
const workflowNav = [
  { label: 'Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Request Center', path: `${base}/request`, icon: <FilePlus className="h-4 w-4" /> },
  { label: 'Imaging Worklist', path: `${base}/queue`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Scheduling', path: `${base}/schedule`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Patient Preparation', path: `${base}/preparation`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Examination Room', path: `${base}/exam`, icon: <Play className="h-4 w-4" /> },
  { label: 'Reporting', path: `${base}/report`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Validation', path: `${base}/validation`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Critical Findings', path: `${base}/critical`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Result Release', path: `${base}/release`, icon: <Send className="h-4 w-4" /> },
  { label: 'ECG', path: `${base}/ecg`, icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'EEG', path: `${base}/eeg`, icon: <Radio className="h-4 w-4" /> },
  { label: 'Billing', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Equipment', path: `${base}/equipment`, icon: <Wrench className="h-4 w-4" /> },
  { label: 'Consumables', path: `${base}/consumables`, icon: <Boxes className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={workflowNav} title={`Radiology · ${title}`}>
    <DbBootGate>{children}</DbBootGate>
  </DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action}
  </div>
);
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);
const toneCls = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200', red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200', orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200', sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] ?? 'bg-muted text-foreground border-border');
const Pill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${toneCls(tone)} whitespace-nowrap`}>{children}</span>
);
const useStaff = () => { const { user } = useAuth(); return user?.name ?? 'Radiology Staff'; };
const STATUS_TONE: Record<string, string> = {
  REQUESTED: 'amber', Sent: 'amber', ACCEPTED: 'sky', Accepted: 'sky', REJECTED: 'red', Rejected: 'red',
  AWAITING_PAYMENT: 'orange', Unpaid: 'orange', PAID: 'blue', Paid: 'blue', SCHEDULED: 'sky', Scheduled: 'sky',
  IN_PROGRESS: 'purple', InProgress: 'purple', IMAGING_DONE: 'blue', Completed: 'blue', REPORTED: 'purple',
  Reported: 'purple', VERIFIED: 'green', Verified: 'green', RELEASED: 'green', Released: 'green',
};
const label = (s: string) => s.replace(/_/g, ' ');

/* ─── Dashboard ─────────────────────────────────────────────────────── */
export const LiveRadiologyDashboard = () => {
  useDbTick();
  const rad = useRadiology();
  const navigate = useNavigate();
  const apiOn = isImagingApiEnabled();
  const [m, setM] = useState<ApiRadMetrics | null>(null);
  const [equip, setEquip] = useState<ApiRadEquipment[]>([]);
  const [reqs, setReqs] = useState<ApiImagingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const [metrics, equipment, page] = await Promise.all([
        getRadiologyMetrics(),
        listRadEquipment().catch(() => [] as ApiRadEquipment[]),
        listImagingRequests({ page: 1, limit: 200 }),
      ]);
      setM(metrics && typeof metrics.total === 'number' ? metrics : null);
      setEquip(Array.isArray(equipment) ? equipment : []);
      setReqs(Array.isArray(page?.items) ? page.items : []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (apiOn) void refresh(); }, [apiOn]);

  const local = rad.dashboardMetrics();
  const util = rad.modalityUtilisation();
  const imagingRows = Array.isArray(reqs) ? reqs : [];
  const modalityCount = (mod: string) => imagingRows.filter(r => r.items.some(i => i.modality === mod) && !['Released', 'Rejected', 'Cancelled'].includes(r.status)).length;

  const cards = apiOn && m ? [
    { t: 'Total Requests', v: String(m.total), i: FilePlus },
    { t: 'Awaiting Payment', v: String(m.unpaid), i: CreditCard },
    { t: 'Paid', v: String(m.paid), i: CheckCircle2 },
    { t: 'Accepted', v: String(m.accepted), i: ClipboardCheck },
    { t: 'Scheduled', v: String(m.scheduled), i: CalendarDays },
    { t: 'In Progress', v: String(m.inProgress), i: Play },
    { t: 'Imaging Done', v: String(m.completed), i: Radio },
    { t: 'Released', v: String(m.released), i: Send },
    { t: 'Critical Reports', v: String(m.criticalReports), i: AlertTriangle },
    { t: 'Critical ECGs', v: String(m.criticalEcgs), i: HeartPulse },
    { t: 'X-Ray Queue', v: String(modalityCount('X-Ray')), i: FilePlus },
    { t: 'CT Queue', v: String(modalityCount('CT Scan')), i: FilePlus },
    { t: 'MRI Queue', v: String(modalityCount('MRI')), i: FilePlus },
    { t: 'Ultrasound Queue', v: String(modalityCount('Ultrasound')), i: FilePlus },
    { t: 'Equipment Offline', v: String(equip.filter(e => e.status === 'Offline' || e.status === 'Maintenance').length), i: Wrench },
  ] : [
    { t: 'Requests Today', v: String(local.totalToday), i: FilePlus },
    { t: 'Pending', v: String(local.pending), i: ClipboardList },
    { t: 'Scheduled', v: String(local.scheduled), i: CalendarDays },
    { t: 'Being Scanned', v: String(local.inProgress), i: Play },
    { t: 'Reports Awaiting', v: String(local.reportsAwaiting), i: FileSignature },
    { t: 'Critical Findings', v: String(local.critical), i: AlertTriangle },
    { t: 'ECG Waiting', v: String(local.ecgWaiting), i: HeartPulse },
    { t: 'Revenue Today', v: formatCurrency(local.revenueToday), i: CreditCard },
  ];

  return (
    <Shell title="Dashboard">
      <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Radiology & ECG Dashboard"
        desc={apiOn ? 'Live API metrics from HMS-BACKEND.' : 'Local demo metrics.'}
        action={
          <div className="flex gap-2">
            {apiOn && <Button variant="outline" disabled={loading} onClick={() => void refresh()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}</Button>}
            <Button onClick={() => navigate('/dashboard/radiology/request')}><Plus className="h-4 w-4 mr-1" />New Request</Button>
          </div>
        } />
      <InpatientImagingCard />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={c.v} icon={c.i} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Investigation Distribution</div>
          {apiOn ? (
            (() => {
              const mods = Array.from(new Set(imagingRows.flatMap(r => r.items.map(i => i.modality))));
              const counts = mods.map(mod => ({ modality: mod, count: imagingRows.filter(r => r.items.some(i => i.modality === mod)).length })).sort((a, b) => b.count - a.count);
              if (!counts.length) return <div className="text-sm text-muted-foreground py-6 text-center">No requests yet.</div>;
              const max = counts[0].count || 1;
              return <div className="space-y-2">{counts.map(u => (
                <div key={u.modality}>
                  <div className="flex justify-between text-xs mb-0.5"><span>{u.modality}</span><span>{u.count}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(u.count / max) * 100}%` }} /></div>
                </div>
              ))}</div>;
            })()
          ) : util.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No imaging requests yet.</div> : (
            <div className="space-y-2">{util.map(u => {
              const max = util[0].count || 1;
              return (
                <div key={u.modality}>
                  <div className="flex justify-between text-xs mb-0.5"><span>{u.modality}</span><span>{u.count}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(u.count / max) * 100}%` }} /></div>
                </div>
              );
            })}</div>
          )}
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Machine Status</div>
          <div className="space-y-2">
            {(apiOn ? equip : db.radEquipment.list().map(e => ({ equipmentId: 0, name: e.name, modality: e.modality, room: e.room, status: e.status, usageHours: e.usageHours ?? 0 }))).map((e, i) => (
              <div key={apiOn ? e.equipmentId : i} className="flex justify-between items-center p-2 border rounded-lg text-sm">
                <span>{e.name} <span className="text-muted-foreground text-xs">· {e.room ?? '—'}</span></span>
                <Pill tone={e.status === 'Available' || e.status === 'ONLINE' ? 'green' : e.status === 'Offline' || e.status === 'OFFLINE' ? 'red' : 'amber'}>{e.status}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* ─── Worklist ──────────────────────────────────────────────────────── */
export const LiveRadiologyRequestQueue = () => {
  useDbTick();
  const rad = useRadiology();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const data = await listImagingRequests({ page: 1, limit: 200 });
      setApiRows(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load worklist');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (apiOn) void refresh(); }, [apiOn]);

  const local = rad.listRequests();
  const apiGroups: { key: string; label: string; match: (r: ApiImagingRequest) => boolean }[] = [
    { key: 'waiting', label: 'Waiting', match: r => ['Sent', 'Accepted'].includes(r.status) },
    { key: 'scheduled', label: 'Scheduled', match: r => r.status === 'Scheduled' },
    { key: 'progress', label: 'In Progress', match: r => r.status === 'InProgress' },
    { key: 'done', label: 'Completed', match: r => r.status === 'Completed' },
    { key: 'reported', label: 'Reported', match: r => r.status === 'Reported' },
    { key: 'verified', label: 'Verified/Released', match: r => r.status === 'Verified' || r.status === 'Released' },
    { key: 'emergency', label: 'Emergency', match: r => r.priority === 'Emergency' || r.priority === 'Stat' },
  ];
  const localGroups: { key: string; label: string; match: (r: ImagingRequest) => boolean }[] = [
    { key: 'waiting', label: 'Waiting', match: r => ['REQUESTED', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAID'].includes(r.status) },
    { key: 'scheduled', label: 'Scheduled', match: r => r.status === 'SCHEDULED' },
    { key: 'progress', label: 'In Progress', match: r => r.status === 'IN_PROGRESS' },
    { key: 'done', label: 'Imaging Done', match: r => r.status === 'IMAGING_DONE' },
    { key: 'reported', label: 'Reported', match: r => r.status === 'REPORTED' || r.status === 'REPORT_PENDING' },
    { key: 'verified', label: 'Verified/Released', match: r => r.status === 'VERIFIED' || r.status === 'RELEASED' },
    { key: 'emergency', label: 'Emergency', match: r => r.priority === 'EMERGENCY' },
  ];

  return (
    <Shell title="Imaging Worklist">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Imaging Worklist" desc="Dynamic work queue across every stage."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}</Button> : undefined} />
      {apiOn ? (
        <Tabs defaultValue="waiting">
          <TabsList className="flex-wrap h-auto">{apiGroups.map(g => <TabsTrigger key={g.key} value={g.key}>{g.label} ({apiRows.filter(g.match).length})</TabsTrigger>)}</TabsList>
          {apiGroups.map(g => (
            <TabsContent key={g.key} value={g.key}>
              <Card>
                <MobileWorklist>
                  {apiRows.filter(g.match).length === 0 ? <div className="text-center text-muted-foreground py-8 text-sm">Nothing here.</div> : apiRows.filter(g.match).map(r => (
                    <MobileWorklistCard
                      key={r.imagingRequestId}
                      title={`${imagingPatientName(r.person)} · ${r.requestNo}`}
                      subtitle={r.items.map(i => `${i.modality} · ${i.studyName}`).join(', ')}
                      meta={`${r.scheduledAt?.replace('T', ' ').slice(0, 16) ?? 'Not scheduled'} · ${r.paymentStatus}`}
                      status={<Pill tone={STATUS_TONE[r.status] ?? 'amber'}>{r.status}</Pill>}
                    />
                  ))}
                </MobileWorklist>
                <DesktopOnlyTable>
                <Table>
                  <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Priority</TableHead><TableHead>Payment</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {apiRows.filter(g.match).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nothing here.</TableCell></TableRow> : apiRows.filter(g.match).map(r => (
                      <TableRow key={r.imagingRequestId}>
                        <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                        <TableCell className="font-medium">{imagingPatientName(r.person)}</TableCell>
                        <TableCell className="text-xs">{r.items.map(i => `${i.modality} · ${i.studyName}`).join(', ')}</TableCell>
                        <TableCell><Pill tone={r.priority === 'Emergency' ? 'red' : 'sky'}>{r.priority}</Pill></TableCell>
                        <TableCell><Pill tone={r.paymentStatus === 'Paid' ? 'green' : 'orange'}>{r.paymentStatus}</Pill></TableCell>
                        <TableCell className="text-xs">{r.scheduledAt?.replace('T', ' ').slice(0, 16) ?? '—'}</TableCell>
                        <TableCell><Pill tone={STATUS_TONE[r.status] ?? 'amber'}>{r.status}</Pill></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </DesktopOnlyTable>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Tabs defaultValue="waiting">
          <TabsList className="flex-wrap h-auto">{localGroups.map(g => <TabsTrigger key={g.key} value={g.key}>{g.label} ({local.filter(g.match).length})</TabsTrigger>)}</TabsList>
          {localGroups.map(g => (
            <TabsContent key={g.key} value={g.key}>
              <Card>
                <MobileWorklist>
                  {local.filter(g.match).length === 0 ? <div className="text-center text-muted-foreground py-8 text-sm">Nothing here.</div> : local.filter(g.match).map(r => (
                    <MobileWorklistCard
                      key={r.id}
                      title={r.patientName}
                      subtitle={`${r.modality} · ${r.region}`}
                      meta={label(r.status)}
                      status={<Pill tone={r.priority === 'EMERGENCY' ? 'red' : 'sky'}>{r.priority}</Pill>}
                    />
                  ))}
                </MobileWorklist>
                <DesktopOnlyTable>
                <Table>
                  <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Investigation</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {local.filter(g.match).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nothing here.</TableCell></TableRow> : local.filter(g.match).map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.patientName}</TableCell>
                        <TableCell>{r.modality} · {r.region}</TableCell>
                        <TableCell><Pill tone={r.priority === 'EMERGENCY' ? 'red' : 'sky'}>{r.priority}</Pill></TableCell>
                        <TableCell><Pill tone={STATUS_TONE[r.status]}>{label(r.status)}</Pill></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </DesktopOnlyTable>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </Shell>
  );
};

/* ─── Scheduling ────────────────────────────────────────────────────── */
export const LiveImagingScheduling = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [equip, setEquip] = useState<ApiRadEquipment[]>([]);
  const [form, setForm] = useState<Record<string, { room: string; at: string; equipmentId?: number }>>({});

  const refresh = async () => {
    if (!apiOn) return;
    const [page, eq] = await Promise.all([
      listImagingRequests({ status: 'Accepted,Sent', page: 1, limit: 100 }),
      listRadEquipment().catch(() => [] as ApiRadEquipment[]),
    ]);
    setApiRows(page.items.filter(r => r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived' || r.priority === 'Emergency'));
    setEquip(eq.filter(e => e.status === 'Available' || e.status === 'In Use'));
  };
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const localSchedulable = rad.listRequests().filter(r => ['PAID', 'ACCEPTED'].includes(r.status) || (r.priority === 'EMERGENCY' && r.status !== 'RELEASED' && r.status !== 'SCHEDULED'));
  const machines = db.radEquipment.list().filter(e => e.status === 'ONLINE');

  const scheduleApi = async (r: ApiImagingRequest) => {
    const v = form[String(r.imagingRequestId)] ?? { room: '', at: '' };
    try {
      await scheduleImagingRequest(r.imagingRequestId, {
        scheduledAt: v.at || new Date().toISOString(),
        scheduledRoom: v.room || undefined,
        equipmentId: v.equipmentId,
      });
      toast.success(`Scheduled ${r.requestNo}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Schedule failed — payment may be required');
    }
  };

  return (
    <Shell title="Scheduling">
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Scheduling & Appointments" desc="Payment enforced before scheduling (emergencies exempt)."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()}>Refresh</Button> : undefined} />
      <Card>
        {apiOn ? (
          apiRows.length === 0 ? <div className="text-sm text-muted-foreground text-center py-10">No requests ready to schedule.</div> : (
            <div className="space-y-3">
              {apiRows.map(r => (
                <div key={r.imagingRequestId} className="p-3 border rounded-lg grid md:grid-cols-5 gap-2 items-end">
                  <div>
                    <div className="font-medium text-sm">{imagingPatientName(r.person)}</div>
                    <div className="text-xs text-muted-foreground">{r.requestNo} · {r.items.map(i => i.studyName).join(', ')}</div>
                    <Pill tone={r.paymentStatus === 'Paid' ? 'green' : 'orange'}>{r.paymentStatus}</Pill>
                  </div>
                  <div><Label className="text-xs">Room / Machine</Label>
                    <Select value={form[String(r.imagingRequestId)]?.equipmentId ? String(form[String(r.imagingRequestId)].equipmentId) : ''}
                      onValueChange={v => setForm(f => ({ ...f, [String(r.imagingRequestId)]: { room: equip.find(e => String(e.equipmentId) === v)?.room ?? '', at: f[String(r.imagingRequestId)]?.at ?? '', equipmentId: Number(v) } }))}>
                      <SelectTrigger><SelectValue placeholder="Equipment" /></SelectTrigger>
                      <SelectContent>{equip.map(e => <SelectItem key={e.equipmentId} value={String(e.equipmentId)}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Room label</Label>
                    <Input value={form[String(r.imagingRequestId)]?.room ?? ''} onChange={e => setForm(f => ({ ...f, [String(r.imagingRequestId)]: { ...f[String(r.imagingRequestId)], room: e.target.value, at: f[String(r.imagingRequestId)]?.at ?? '' } }))} /></div>
                  <div><Label className="text-xs">Date / Time</Label>
                    <Input type="datetime-local" value={form[String(r.imagingRequestId)]?.at ?? ''} onChange={e => setForm(f => ({ ...f, [String(r.imagingRequestId)]: { ...f[String(r.imagingRequestId)], at: e.target.value, room: f[String(r.imagingRequestId)]?.room ?? '' } }))} /></div>
                  <LoadingButton loading={isBusy(`sch-${r.imagingRequestId}`)} loadingText="…" onClick={() => void run(`sch-${r.imagingRequestId}`, 'Scheduling…', async () => { await scheduleApi(r); return { ok: true as const, message: 'Scheduled' }; }, x => x.message)}>Schedule</LoadingButton>
                </div>
              ))}
            </div>
          )
        ) : (
          localSchedulable.length === 0 ? <div className="text-sm text-muted-foreground text-center py-10">No requests ready to schedule.</div> : (
            <div className="space-y-3">
              {localSchedulable.map(r => (
                <div key={r.id} className="p-3 border rounded-lg grid md:grid-cols-4 gap-2 items-end">
                  <div><div className="font-medium text-sm">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.modality}</div></div>
                  <div><Label className="text-xs">Machine</Label>
                    <Select onValueChange={v => setForm(f => ({ ...f, [r.id]: { ...f[r.id], room: v, at: f[r.id]?.at ?? '' } }))}><SelectTrigger><SelectValue placeholder="Machine" /></SelectTrigger>
                      <SelectContent>{machines.map(mm => <SelectItem key={mm.id} value={mm.id}>{mm.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">When</Label><Input value={form[r.id]?.at ?? ''} onChange={e => setForm(f => ({ ...f, [r.id]: { room: f[r.id]?.room ?? '', at: e.target.value } }))} /></div>
                  <LoadingButton loading={isBusy(`sch-${r.id}`)} onClick={() => run(`sch-${r.id}`, 'Scheduling…', () => rad.scheduleRequest(r.id, { machineId: form[r.id]?.room, radiographer: staff, scheduledAt: form[r.id]?.at ?? '' }, staff), x => x.message, x => x.message)}>Schedule</LoadingButton>
                </div>
              ))}
            </div>
          )
        )}
      </Card>
    </Shell>
  );
};

/* ─── Preparation ───────────────────────────────────────────────────── */
const PREP_KEYS = ['fasting', 'contrastConsent', 'metalRemoved', 'pregnancyChecked', 'ivAccess', 'sedationRequired', 'wheelchair'] as const;

export const LivePatientPreparation = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);

  const refresh = async () => {
    const data = await listImagingRequests({ status: 'Accepted,Scheduled', page: 1, limit: 100 });
    setApiRows(data.items.filter(r => r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived' || r.priority === 'Emergency'));
  };
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const localReqs = rad.listRequests().filter(r => ['PAID', 'SCHEDULED', 'ACCEPTED'].includes(r.status));

  const toggleApiPrep = async (r: ApiImagingRequest, key: string) => {
    const prep = parsePrepJson(r.prepJson);
    prep[key] = !prep[key];
    try {
      await updateImagingRequest(r.imagingRequestId, { prepJson: JSON.stringify(prep) });
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    }
  };
  const markReadyApi = async (r: ApiImagingRequest) => {
    const prep = { ...parsePrepJson(r.prepJson), status: 'READY' };
    try {
      await updateImagingRequest(r.imagingRequestId, { prepJson: JSON.stringify(prep) });
      toast.success('Marked ready');
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    }
  };

  return (
    <Shell title="Patient Preparation">
      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Patient Preparation" desc="Pre-imaging checklist."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()}>Refresh</Button> : undefined} />
      <div className="space-y-3">
        {apiOn ? (
          apiRows.length === 0 ? <Card><div className="text-sm text-muted-foreground text-center py-8">No patients awaiting preparation.</div></Card> : apiRows.map(r => {
            const prep = parsePrepJson(r.prepJson);
            return (
              <Card key={r.imagingRequestId}>
                <div className="flex justify-between mb-3"><div><span className="font-medium">{imagingPatientName(r.person)}</span><span className="text-xs text-muted-foreground ml-2">{r.requestNo}</span></div>
                  <Pill tone={prep.status === 'READY' ? 'green' : 'amber'}>{String(prep.status ?? 'PENDING')}</Pill></div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PREP_KEYS.map(k => (
                    <Button key={k} size="sm" variant={prep[k] ? 'default' : 'outline'} onClick={() => void toggleApiPrep(r, k)}>
                      {prep[k] ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}{k}
                    </Button>
                  ))}
                </div>
                <Button size="sm" onClick={() => void markReadyApi(r)}>Mark Ready</Button>
              </Card>
            );
          })
        ) : (
          localReqs.length === 0 ? <Card><div className="text-sm text-muted-foreground text-center py-8">No patients awaiting preparation.</div></Card> : localReqs.map(r => (
            <Card key={r.id}>
              <div className="flex justify-between mb-3"><div><span className="font-medium">{r.patientName}</span></div><Pill tone={r.prep.status === 'READY' ? 'green' : 'amber'}>{r.prep.status}</Pill></div>
              <div className="flex flex-wrap gap-2 mb-3">
                {PREP_KEYS.map(k => (
                  <Button key={k} size="sm" variant={r.prep[k] ? 'default' : 'outline'} onClick={() => rad.updatePrep(r.id, { [k]: !r.prep[k] }, staff)}>{k}</Button>
                ))}
              </div>
              <Button size="sm" onClick={() => { rad.updatePrep(r.id, { status: 'READY' }, staff); toast.success('Ready'); }}>Mark Ready</Button>
            </Card>
          ))
        )}
      </div>
    </Shell>
  );
};

/* ─── Examination ───────────────────────────────────────────────────── */
export const LiveExaminationRoom = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [cons, setCons] = useState<ApiRadConsumable[]>([]);
  const [completeForm, setCompleteForm] = useState<Record<number, { consumableId: string; studyUid: string }>>({});

  const refresh = async () => {
    const [page, c] = await Promise.all([
      listImagingRequests({ status: 'Scheduled,InProgress', page: 1, limit: 100 }),
      listRadConsumables().catch(() => [] as ApiRadConsumable[]),
    ]);
    setApiRows(page.items);
    setCons(c);
  };
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const localQueue = rad.listRequests().filter(r => ['SCHEDULED', 'IN_PROGRESS'].includes(r.status));
  const localCons = db.radConsumables.list();
  const [localForm, setLocalForm] = useState<Record<string, { consumableId: string; studyUid: string }>>({});

  const updApi = (id: number, patch: Partial<{ consumableId: string; studyUid: string }>) =>
    setCompleteForm(f => ({ ...f, [id]: { consumableId: cons[0] ? String(cons[0].consumableId) : '', studyUid: '', ...f[id], ...patch } }));
  const updLocal = (id: string, patch: Partial<{ consumableId: string; studyUid: string }>) =>
    setLocalForm(f => ({ ...f, [id]: { consumableId: localCons[0]?.id ?? '', studyUid: '', ...f[id], ...patch } }));

  return (
    <Shell title="Examination Room">
      <Section icon={<Play className="h-5 w-5" />} title="Examination Room" desc="Start and complete examinations. Study UID + consumable recorded on completion."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()}>Refresh</Button> : undefined} />
      <div className="space-y-3">
        {apiOn ? (
          apiRows.length === 0 ? <Card><div className="text-center text-muted-foreground py-8">No exams in queue.</div></Card> : apiRows.map(r => {
            const form = completeForm[r.imagingRequestId] ?? { consumableId: cons[0] ? String(cons[0].consumableId) : '__none__', studyUid: '' };
            return (
              <Card key={r.imagingRequestId}>
                <div className="flex justify-between flex-wrap gap-2 mb-3">
                  <div><div className="font-medium">{imagingPatientName(r.person)}</div><div className="text-xs text-muted-foreground">{r.requestNo} · {r.items.map(i => i.studyName).join(', ')}</div></div>
                  <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                </div>
                {(r.status === 'Scheduled' || r.status === 'InProgress') && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-3">
                    <div>
                      <Label className="text-xs">Consumable</Label>
                      <Select value={form.consumableId || '__none__'} onValueChange={v => updApi(r.imagingRequestId, { consumableId: v })}>
                        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {cons.map(c => <SelectItem key={c.consumableId} value={String(c.consumableId)}>{c.name} ({c.stock})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Study UID (optional)</Label>
                      <Input value={form.studyUid} onChange={e => updApi(r.imagingRequestId, { studyUid: e.target.value })} placeholder="Auto if blank" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {r.status === 'Scheduled' && (
                    <LoadingButton loading={isBusy(`st-${r.imagingRequestId}`)} onClick={() => run(`st-${r.imagingRequestId}`, 'Starting…', async () => { await startImagingExam(r.imagingRequestId); await refresh(); return { ok: true as const, message: 'Exam started' }; }, x => x.message)}>Start Exam</LoadingButton>
                  )}
                  {(r.status === 'Scheduled' || r.status === 'InProgress') && (
                    <LoadingButton loading={isBusy(`cm-${r.imagingRequestId}`)} onClick={() => run(`cm-${r.imagingRequestId}`, 'Completing…', async () => {
                      const cid = form.consumableId && form.consumableId !== '__none__' ? Number(form.consumableId) : undefined;
                      await completeImagingExam(r.imagingRequestId, {
                        consumableId: cid,
                        consumableQty: cid ? 1 : undefined,
                        studyUid: form.studyUid.trim() || undefined,
                      });
                      await refresh();
                      return { ok: true as const, message: 'Imaging completed' };
                    }, x => x.message)}>Complete Imaging</LoadingButton>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          localQueue.length === 0 ? <Card><div className="text-center text-muted-foreground py-8">No exams in queue.</div></Card> : localQueue.map(r => {
            const form = localForm[r.id] ?? { consumableId: localCons[0]?.id ?? '__none__', studyUid: '' };
            return (
              <Card key={r.id}>
                <div className="font-medium mb-2">{r.patientName} · {r.modality}</div>
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <Label className="text-xs">Consumable</Label>
                    <Select value={form.consumableId || '__none__'} onValueChange={v => updLocal(r.id, { consumableId: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {localCons.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.stock})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Study UID</Label>
                    <Input value={form.studyUid} onChange={e => updLocal(r.id, { studyUid: e.target.value })} placeholder="Auto if blank" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status === 'SCHEDULED' && <LoadingButton loading={isBusy(`st-${r.id}`)} onClick={() => run(`st-${r.id}`, 'Starting…', () => rad.startExam(r.id, staff), x => x.message)}>Start</LoadingButton>}
                  <LoadingButton loading={isBusy(`cm-${r.id}`)} onClick={() => run(`cm-${r.id}`, 'Completing…', () => rad.completeImaging(r.id, {
                    radiographer: staff,
                    consumableId: form.consumableId && form.consumableId !== '__none__' ? form.consumableId : undefined,
                    studyUid: form.studyUid.trim() || undefined,
                  }), x => x.message)}>Complete</LoadingButton>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Shell>
  );
};

/* ─── Reporting ─────────────────────────────────────────────────────── */
export const LiveRadiologyReportEntry = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [picked, setPicked] = useState<number | string>('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [critical, setCritical] = useState(false);

  const refresh = async () => {
    const data = await listImagingRequests({ status: 'Completed,InProgress', page: 1, limit: 100 });
    setApiRows(data.items);
  };
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const localDone = rad.listRequests().filter(r => r.status === 'IMAGING_DONE' || r.status === 'REPORT_PENDING');

  const submit = () => {
    if (!picked || findings.trim().length < 3) { toast.error('Select a study and enter findings'); return; }
    if (apiOn) {
      void run('rep', 'Submitting…', async () => {
        await submitRadiologyReport({ imagingRequestId: Number(picked), findings, impression, critical });
        setPicked(''); setFindings(''); setImpression(''); setCritical(false);
        await refresh();
        return { ok: true as const, message: 'Report submitted' };
      }, x => x.message);
      return;
    }
    run('rep', 'Submitting…', () => rad.submitReport({ requestId: String(picked), findings, impression, critical, reportedBy: staff }), x => x.message, x => x.message)
      .then(r => { if (r?.ok) { setPicked(''); setFindings(''); setImpression(''); } });
  };

  return (
    <Shell title="Reporting">
      <Section icon={<FileSignature className="h-5 w-5" />} title="Radiology Reporting" desc="Structured findings, impression and critical flag." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">Ready for Report</h3>
          <div className="space-y-2 max-h-80 overflow-auto">
            {apiOn ? apiRows.map(r => (
              <button key={r.imagingRequestId} type="button" onClick={() => setPicked(r.imagingRequestId)}
                className={`w-full text-left p-3 border rounded-lg ${picked === r.imagingRequestId ? 'border-primary bg-primary/5' : ''}`}>
                <div className="font-medium text-sm">{imagingPatientName(r.person)}</div>
                <div className="text-xs text-muted-foreground">{r.requestNo} · {r.items.map(i => i.studyName).join(', ')}</div>
              </button>
            )) : localDone.map(r => (
              <button key={r.id} type="button" onClick={() => setPicked(r.id)} className={`w-full text-left p-3 border rounded-lg ${picked === r.id ? 'border-primary bg-primary/5' : ''}`}>
                <div className="font-medium text-sm">{r.patientName}</div>
                <div className="text-xs text-muted-foreground">{r.modality} · {r.region}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          <div><Label className="text-xs">Findings</Label><Textarea rows={5} value={findings} onChange={e => setFindings(e.target.value)} /></div>
          <div><Label className="text-xs">Impression</Label><Textarea rows={3} value={impression} onChange={e => setImpression(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} /> Critical finding</label>
          <LoadingButton loading={isBusy('rep')} loadingText="Submitting…" onClick={submit}><Send className="h-4 w-4 mr-1" />Submit Report</LoadingButton>
        </Card>
      </div>
    </Shell>
  );
};

/* ─── Validation ────────────────────────────────────────────────────── */
export const LiveRadiologyValidation = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [reports, setReports] = useState<ApiRadiologyReport[]>([]);
  const [reason, setReason] = useState('');

  const refresh = async () => { setReports(await listRadiologyReports({ status: 'SUBMITTED' })); };
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const localPending = db.radiologyReports.list().filter(r => r.status === 'SUBMITTED' || r.status === 'DRAFT');

  return (
    <Shell title="Report Validation">
      <Section icon={<ShieldCheck className="h-5 w-5" />} title="Report Verification" desc="Consultant verify or return for correction."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()}>Refresh</Button> : undefined} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Request</TableHead><TableHead>Author</TableHead><TableHead>Critical</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              reports.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports awaiting verification.</TableCell></TableRow> : reports.map(r => (
                <TableRow key={r.reportId}>
                  <TableCell className="font-mono text-xs">#{r.reportId}</TableCell>
                  <TableCell className="text-xs">{r.imagingRequestId}</TableCell>
                  <TableCell className="text-xs">{r.author}</TableCell>
                  <TableCell>{r.critical ? <Pill tone="red">CRITICAL</Pill> : '—'}</TableCell>
                  <TableCell className="flex gap-1">
                    <LoadingButton size="sm" loading={isBusy(`v-${r.reportId}`)} onClick={() => run(`v-${r.reportId}`, 'Verifying…', async () => { await verifyRadiologyReport(r.reportId); await refresh(); return { ok: true as const, message: 'Verified' }; }, x => x.message)}>Verify</LoadingButton>
                    <LoadingButton size="sm" variant="outline" loading={isBusy(`rt-${r.reportId}`)} onClick={() => run(`rt-${r.reportId}`, 'Returning…', async () => { await returnRadiologyReport(r.reportId, reason || 'Needs correction'); await refresh(); return { ok: true as const, message: 'Returned' }; }, x => x.message)}>Return</LoadingButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              localPending.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports awaiting verification.</TableCell></TableRow> : localPending.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell className="text-xs">{r.reportedBy}</TableCell>
                  <TableCell>{r.critical ? <Pill tone="red">CRITICAL</Pill> : '—'}</TableCell>
                  <TableCell className="flex gap-1">
                    <LoadingButton size="sm" loading={isBusy(`v-${r.id}`)} onClick={() => run(`v-${r.id}`, 'Verifying…', () => rad.verifyReport(r.id, staff), x => x.message)}>Verify</LoadingButton>
                    <LoadingButton size="sm" variant="outline" loading={isBusy(`rt-${r.id}`)} onClick={() => run(`rt-${r.id}`, 'Returning…', () => rad.returnReport(r.id, reason || 'Needs correction', staff), x => x.message)}>Return</LoadingButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-3"><Label className="text-xs">Return reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Required when returning…" /></div>
      </Card>
    </Shell>
  );
};

/* ─── Critical ──────────────────────────────────────────────────────── */
export const LiveCriticalFindings = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [reports, setReports] = useState<ApiRadiologyReport[]>([]);
  const [ecgs, setEcgs] = useState<ApiEcgStudy[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    void getCriticalFindings().then(d => { setReports(d.reports); setEcgs(d.ecgs); }).catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const localReports = db.radiologyReports.list().filter(r => r.critical);
  const localEcgs = db.ecgStudies.list().filter(e => e.critical);

  return (
    <Shell title="Critical Findings">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Findings" desc="Imaging and ECG crisis alerts." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">Critical Reports</h3>
          {(apiOn ? reports : localReports).length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">None</div> : (
            apiOn ? reports.map(r => (
              <div key={r.reportId} className="p-3 border border-rose-200 bg-rose-50 rounded-lg mb-2 text-sm">
                <div className="font-semibold text-rose-800">Report #{r.reportId}</div>
                <div className="text-xs">{r.impression ?? r.findings.slice(0, 120)}</div>
              </div>
            )) : localReports.map(r => (
              <div key={r.id} className="p-3 border border-rose-200 bg-rose-50 rounded-lg mb-2 text-sm">
                <div className="font-semibold text-rose-800">{r.patientName}</div>
                <div className="text-xs">{r.criticalFinding ?? r.impression}</div>
              </div>
            ))
          )}
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Critical ECGs</h3>
          {apiOn ? (
            ecgs.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">None</div> : ecgs.map(e => (
              <div key={e.ecgId} className="p-3 border border-rose-200 bg-rose-50 rounded-lg mb-2 text-sm">
                <div className="font-semibold text-rose-800">ECG #{e.ecgId} · HR {e.heartRate ?? '—'}</div>
                <div className="text-xs">{e.rhythm} · {e.stChanges}</div>
              </div>
            ))
          ) : (
            localEcgs.map(e => (
              <div key={e.id} className="p-3 border border-rose-200 bg-rose-50 rounded-lg mb-2 text-sm">
                <div className="font-semibold text-rose-800">{e.patientName}</div>
                <div className="text-xs">{e.rhythm} · HR {e.heartRate}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* ─── Release ───────────────────────────────────────────────────────── */
export const LiveResultRelease = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [reports, setReports] = useState<ApiRadiologyReport[]>([]);

  const refresh = async () => setReports(await listRadiologyReports({ status: 'VERIFIED' }));
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const local = db.radiologyReports.list().filter(r => r.status === 'VERIFIED');

  return (
    <Shell title="Result Release">
      <Section icon={<Send className="h-5 w-5" />} title="Result Release" desc="Release verified reports to clinicians / EMR."
        action={apiOn ? <Button variant="outline" onClick={() => void refresh()}>Refresh</Button> : undefined} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Author</TableHead><TableHead>Verified</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              reports.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No verified reports awaiting release.</TableCell></TableRow> : reports.map(r => (
                <TableRow key={r.reportId}>
                  <TableCell className="font-mono text-xs">#{r.reportId}</TableCell>
                  <TableCell className="text-xs">{r.author}</TableCell>
                  <TableCell className="text-xs">{r.verifiedAt?.slice(0, 16) ?? '—'}</TableCell>
                  <TableCell>
                    <LoadingButton size="sm" loading={isBusy(`rel-${r.reportId}`)} onClick={() => run(`rel-${r.reportId}`, 'Releasing…', async () => { await releaseRadiologyReport(r.reportId); await refresh(); return { ok: true as const, message: 'Released' }; }, x => x.message)}>Release</LoadingButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              local.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No verified reports.</TableCell></TableRow> : local.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell className="text-xs">{r.reportedBy}</TableCell>
                  <TableCell className="text-xs">{r.verifiedBy ?? '—'}</TableCell>
                  <TableCell>
                    <LoadingButton size="sm" loading={isBusy(`rel-${r.id}`)} onClick={() => run(`rel-${r.id}`, 'Releasing…', () => rad.releaseResult(r.id, staff), x => x.message)}>Release</LoadingButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ─── ECG ───────────────────────────────────────────────────────────── */
export const LiveEcgReporting = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [ecgs, setEcgs] = useState<ApiEcgStudy[]>([]);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState<number | ''>('');
  const [localPatientId, setLocalPatientId] = useState('');
  const [hr, setHr] = useState('80');
  const [rhythm, setRhythm] = useState('Sinus');
  const [qtc, setQtc] = useState('420');
  const [st, setSt] = useState('None');
  const [interp, setInterp] = useState('');

  const refresh = async () => setEcgs(await listEcgStudies());
  useEffect(() => { if (apiOn) void refresh().catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed')); }, [apiOn]);

  const search = async () => {
    if (q.trim().length < 2) return;
    try { setPeople(await searchPersons(q.trim())); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Search failed'); }
  };

  const record = () => {
    if (apiOn) {
      if (!personId) { toast.error('Select a patient'); return; }
      void run('ecg', 'Recording…', async () => {
        const row = await recordEcgStudy({
          personId: Number(personId), heartRate: Number(hr) || undefined, rhythm, qtcMs: Number(qtc) || undefined, stChanges: st,
        });
        toast.success(row.critical ? 'CRITICAL ECG recorded' : 'ECG recorded');
        await refresh();
        return { ok: true as const, message: row.critical ? 'Critical ECG flagged' : 'ECG saved' };
      }, x => x.message);
      return;
    }
    const p = db.patients.get(localPatientId) ?? db.patients.list()[0];
    if (!p) { toast.error('Select a patient'); return; }
    run('ecg', 'Recording…', () => rad.recordEcg({
      patientId: p.id,
      type: '12-Lead',
      reportedBy: staff,
      measurements: {
        heartRate: Number(hr) || undefined,
        rhythm,
        qtc: Number(qtc) || undefined,
        stElevation: /elevation|stemi/i.test(st),
        stDepression: /depression/i.test(st),
      },
    }), x => `ECG recorded${x.critical ? ' — CRITICAL' : ''}`, () => 'Failed');
  };

  return (
    <Shell title="ECG">
      <Section icon={<HeartPulse className="h-5 w-5" />} title="ECG Management" desc="Record 12-lead ECGs with auto critical detection." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="space-y-3">
          {apiOn ? (
            <>
              <div className="flex gap-2"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient…" /><Button type="button" variant="outline" onClick={() => void search()}><Search className="h-4 w-4" /></Button></div>
              <Select value={personId === '' ? '' : String(personId)} onValueChange={v => setPersonId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{people.map(p => <SelectItem key={p.personId} value={String(p.personId)}>{[p.firstName, p.lastName].filter(Boolean).join(' ')} · {p.hospitalNo}</SelectItem>)}</SelectContent>
              </Select>
            </>
          ) : (
            <Select value={localPatientId} onValueChange={setLocalPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>{db.patients.list().map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">HR</Label><Input value={hr} onChange={e => setHr(e.target.value)} /></div>
            <div><Label className="text-xs">QTc</Label><Input value={qtc} onChange={e => setQtc(e.target.value)} /></div>
            <div><Label className="text-xs">Rhythm</Label><Input value={rhythm} onChange={e => setRhythm(e.target.value)} /></div>
            <div><Label className="text-xs">ST changes</Label><Input value={st} onChange={e => setSt(e.target.value)} /></div>
          </div>
          <LoadingButton loading={isBusy('ecg')} onClick={record}>Record ECG</LoadingButton>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Recent ECGs</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {apiOn ? ecgs.map(e => (
              <div key={e.ecgId} className={`p-2 border rounded-lg text-sm ${e.critical ? 'border-rose-300 bg-rose-50' : ''}`}>
                <div className="flex justify-between"><span>#{e.ecgId} · HR {e.heartRate}</span>{e.critical ? <Pill tone="red">CRITICAL</Pill> : e.abnormal ? <Pill tone="amber">Abnormal</Pill> : <Pill tone="green">OK</Pill>}</div>
                <div className="text-xs text-muted-foreground">{e.rhythm} · {e.status}</div>
                {e.status === 'RECORDED' && (
                  <div className="mt-2 flex gap-2">
                    <Input className="h-8 text-xs" placeholder="Interpretation…" value={interp} onChange={ev => setInterp(ev.target.value)} />
                    <Button size="sm" onClick={() => void run(`i-${e.ecgId}`, '…', async () => { await interpretEcgStudy(e.ecgId, interp || 'Normal sinus rhythm'); await refresh(); return { ok: true as const, message: 'Interpreted' }; }, x => x.message)}>Interpret</Button>
                  </div>
                )}
              </div>
            )) : db.ecgStudies.list().slice().reverse().map(e => (
              <div key={e.id} className={`p-2 border rounded-lg text-sm ${e.critical ? 'border-rose-300 bg-rose-50' : ''}`}>
                <div className="font-medium">{e.patientName}</div>
                <div className="text-xs">{e.rhythm} · HR {e.heartRate}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* ─── EEG ───────────────────────────────────────────────────────────── */
export const LiveEegReporting = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [picked, setPicked] = useState<string>('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  useEffect(() => {
    if (!apiOn) return;
    void listImagingRequests({ status: 'Completed', page: 1, limit: 100 })
      .then(d => setApiRows(d.items.filter(r => r.items.some(i => i.modality === 'EEG'))))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const local = rad.listRequests().filter(r => r.modality === 'EEG' && (r.status === 'IMAGING_DONE' || r.status === 'REPORT_PENDING'));

  return (
    <Shell title="EEG">
      <Section icon={<Radio className="h-5 w-5" />} title="EEG Reporting" desc="EEG studies reuse the imaging report pathway (modality = EEG)." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          {(apiOn ? apiRows : []).length === 0 && apiOn && <div className="text-sm text-muted-foreground py-6 text-center">No completed EEG studies.</div>}
          {apiOn && apiRows.map(r => (
            <button key={r.imagingRequestId} type="button" className={`w-full text-left p-3 border rounded-lg mb-2 ${picked === String(r.imagingRequestId) ? 'border-primary' : ''}`} onClick={() => setPicked(String(r.imagingRequestId))}>
              {imagingPatientName(r.person)} · {r.requestNo}
            </button>
          ))}
          {!apiOn && local.map(r => (
            <button key={r.id} type="button" className={`w-full text-left p-3 border rounded-lg mb-2 ${picked === r.id ? 'border-primary' : ''}`} onClick={() => setPicked(r.id)}>{r.patientName}</button>
          ))}
        </Card>
        <Card className="space-y-3">
          <Textarea rows={4} placeholder="Findings" value={findings} onChange={e => setFindings(e.target.value)} />
          <Textarea rows={2} placeholder="Impression" value={impression} onChange={e => setImpression(e.target.value)} />
          <LoadingButton loading={isBusy('eeg')} onClick={() => {
            if (!picked) { toast.error('Select EEG study'); return; }
            if (apiOn) {
              void run('eeg', 'Submitting…', async () => {
                await submitRadiologyReport({ imagingRequestId: Number(picked), findings, impression });
                setFindings(''); setImpression(''); setPicked('');
                return { ok: true as const, message: 'EEG report submitted' };
              }, x => x.message);
            } else {
              run('eeg', 'Submitting…', () => rad.submitReport({ requestId: picked, findings, impression, reportedBy: staff }), x => x.message);
            }
          }}>Submit EEG Report</LoadingButton>
        </Card>
      </div>
    </Shell>
  );
};

/* ─── Billing ───────────────────────────────────────────────────────── */
export const LiveRadiologyBilling = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [unpaid, setUnpaid] = useState<ApiImagingRequest[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    void listImagingRequests({ paymentStatus: 'Unpaid', page: 1, limit: 100 })
      .then(d => setUnpaid(d.items))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const localUnpaid = rad.listRequests().filter(r => r.paymentStatus !== 'PAID' && r.status !== 'REJECTED' && r.status !== 'CANCELLED');

  return (
    <Shell title="Billing">
      <Section icon={<CreditCard className="h-5 w-5" />} title="Radiology Billing" desc={apiOn ? 'Unpaid imaging requests — cashier confirms payment to unlock scheduling.' : 'Generate invoices and mark paid (local).'}
        action={apiOn ? <Button asChild variant="outline"><Link to="/dashboard/cashier/pharmacy?tab=imaging">Open Cashier Imaging</Link></Button> : undefined} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? (
              unpaid.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No unpaid imaging requests.</TableCell></TableRow> : unpaid.map(r => (
                <TableRow key={r.imagingRequestId}>
                  <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                  <TableCell>{imagingPatientName(r.person)}</TableCell>
                  <TableCell>{formatCurrency(r.totalAmount)}</TableCell>
                  <TableCell><Pill tone="orange">{r.paymentStatus}</Pill></TableCell>
                  <TableCell><Pill tone="sky">Awaiting cashier</Pill></TableCell>
                </TableRow>
              ))
            ) : (
              localUnpaid.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell>{formatCurrency(r.amount)}</TableCell>
                  <TableCell><Pill tone="orange">{r.paymentStatus}</Pill></TableCell>
                  <TableCell className="flex gap-1">
                    {!r.invoiceId && <LoadingButton size="sm" loading={isBusy(`inv-${r.id}`)} onClick={() => run(`inv-${r.id}`, '…', () => { rad.generateRadInvoice(r.id, staff); return { ok: true as const, message: 'Invoice created' }; }, x => x.message)}>Invoice</LoadingButton>}
                    <LoadingButton size="sm" loading={isBusy(`pay-${r.id}`)} onClick={() => run(`pay-${r.id}`, '…', () => rad.markRadPaid(r.id, 'Cash', staff), x => x.message)}>Mark Paid</LoadingButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ─── Equipment / Consumables ───────────────────────────────────────── */
const API_EQ_STATUSES = ['Available', 'Offline', 'Maintenance', 'In Use'] as const;
const LOCAL_EQ_STATUSES: EquipmentStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'CALIBRATION'];

export const LiveRadiologyEquipment = () => {
  useDbTick();
  const rad = useRadiology();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiRadEquipment[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [modality, setModality] = useState('X-Ray');
  const [room, setRoom] = useState('');
  const refresh = async () => {
    if (!apiOn) return;
    try { setRows(await listRadEquipment()); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Load failed'); }
  };
  useEffect(() => { void refresh(); }, [apiOn]);

  const setStatus = (id: number | string, status: string) => {
    void run(`eq-${id}`, 'Updating…', async () => {
      if (apiOn) {
        await updateRadEquipment(Number(id), { status });
        await refresh();
        return { ok: true as const, message: `Status → ${status}` };
      }
      return rad.setEquipmentStatus(String(id), status as EquipmentStatus);
    }, x => x.message);
  };

  return (
    <Shell title="Equipment">
      <Section icon={<Wrench className="h-5 w-5" />} title="Equipment" desc="Modalities and machine status."
        action={apiOn ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Equipment</Button> : undefined} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Modality</TableHead><TableHead>Room</TableHead><TableHead>Status</TableHead><TableHead>Hours</TableHead><TableHead>Set</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? rows.map(e => (
              <TableRow key={e.equipmentId}>
                <TableCell>{e.name}</TableCell><TableCell>{e.modality}</TableCell><TableCell>{e.room ?? '—'}</TableCell>
                <TableCell><Pill tone={e.status === 'Available' ? 'green' : e.status === 'Offline' ? 'red' : 'amber'}>{e.status}</Pill></TableCell>
                <TableCell>{e.usageHours}</TableCell>
                <TableCell>
                  <Select value={e.status === 'InUse' ? 'In Use' : e.status} disabled={isBusy(`eq-${e.equipmentId}`)} onValueChange={v => setStatus(e.equipmentId, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{API_EQ_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            )) : db.radEquipment.list().map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.name}{e.faultNote && <div className="text-xs text-rose-600">{e.faultNote}</div>}</TableCell>
                <TableCell>{e.modality}</TableCell><TableCell>{e.room}</TableCell>
                <TableCell><Pill tone={e.status === 'ONLINE' ? 'green' : e.status === 'OFFLINE' ? 'red' : 'amber'}>{e.status}</Pill></TableCell>
                <TableCell>{e.usageHours}</TableCell>
                <TableCell>
                  <Select value={e.status} disabled={isBusy(`eq-${e.id}`)} onValueChange={v => setStatus(e.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCAL_EQ_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label className="text-xs">Modality</Label><Input value={modality} onChange={e => setModality(e.target.value)} /></div>
            <div><Label className="text-xs">Room</Label><Input value={room} onChange={e => setRoom(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('eq-new')} onClick={() => run('eq-new', 'Creating…', async () => {
              if (!name.trim()) throw new Error('Name required');
              await createRadEquipment({ name: name.trim(), modality, room: room || undefined });
              setOpen(false); setName(''); setRoom('');
              await refresh();
              return { ok: true as const, message: 'Equipment added' };
            }, x => x.message)}>Create</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

export const LiveRadiologyConsumables = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiRadConsumable[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Contrast');
  const [stock, setStock] = useState('50');
  const refresh = async () => {
    if (!apiOn) return;
    try { setRows(await listRadConsumables()); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Load failed'); }
  };
  useEffect(() => { void refresh(); }, [apiOn]);

  const adjust = (id: number | string, delta: number) => {
    void run(`c-${id}-${delta}`, 'Updating stock…', async () => {
      if (apiOn) {
        await adjustRadConsumable(Number(id), { delta, note: staff });
        await refresh();
        return { ok: true as const, message: `Stock ${delta >= 0 ? '+' : ''}${delta}` };
      }
      return rad.adjustConsumable(String(id), delta, staff);
    }, x => x.message);
  };

  return (
    <Shell title="Consumables">
      <Section icon={<Boxes className="h-5 w-5" />} title="Consumables" desc="Contrast, film, electrodes and gels."
        action={apiOn ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button> : undefined} />
      {(apiOn ? rows.filter(c => c.lowStock || c.stock <= c.reorderLevel) : rad.lowStockConsumables()).length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Low-stock items need reorder attention
        </div>
      )}
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Reorder</TableHead><TableHead>Adjust</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn ? rows.map(c => (
              <TableRow key={c.consumableId}>
                <TableCell>{c.name}{c.lowStock && <Pill tone="amber">Low</Pill>}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.stock} {c.unit}</TableCell>
                <TableCell>{c.reorderLevel}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={isBusy(`c-${c.consumableId}--1`)} onClick={() => adjust(c.consumableId, -1)}>−</Button>
                  <Button size="sm" variant="outline" disabled={isBusy(`c-${c.consumableId}-10`)} onClick={() => adjust(c.consumableId, 10)}>+10</Button>
                </TableCell>
              </TableRow>
            )) : db.radConsumables.list().map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.stock} {c.unit}</TableCell>
                <TableCell>{c.reorderLevel}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => adjust(c.id, -1)}>−</Button>
                  <Button size="sm" variant="outline" onClick={() => adjust(c.id, 10)}>+10</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Consumable</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label className="text-xs">Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
            <div><Label className="text-xs">Initial stock</Label><Input value={stock} onChange={e => setStock(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton loading={isBusy('cons-new')} onClick={() => run('cons-new', 'Creating…', async () => {
              if (!name.trim()) throw new Error('Name required');
              await createRadConsumable({ name: name.trim(), category, stock: Number(stock) || 0 });
              setOpen(false); setName('');
              await refresh();
              return { ok: true as const, message: 'Consumable added' };
            }, x => x.message)}>Create</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ─── Forms / Analytics / Archive / Print / Alerts / PACS / Mobile / Upload ─ */
export const LiveRadiologyForms = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [forms, setForms] = useState<ApiRadForm[]>([]);
  const [type, setType] = useState(RADIOLOGY_FORMS[0]);
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState<number | ''>('');

  const refresh = async () => {
    if (!apiOn) return;
    try { setForms(await listRadForms()); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Load forms failed'); }
  };
  useEffect(() => { void refresh(); }, [apiOn]);

  const search = async () => {
    if (q.trim().length < 2) return;
    try { setPeople(await searchPersons(q.trim())); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'Search failed'); }
  };

  const save = () => {
    if (apiOn) {
      if (!personId) { toast.error('Select a patient'); return; }
      void run('form', 'Saving form…', async () => {
        await createRadForm({
          formType: type,
          personId: Number(personId),
          valuesJson: JSON.stringify({ notes }),
          signedBy: staff,
        });
        setNotes('');
        await refresh();
        return { ok: true as const, message: `${type} saved and signed.` };
      }, r => r.message);
      return;
    }
    if (!patientId) { toast.error('Select a patient'); return; }
    void run('form', 'Saving form…', () => {
      rad.saveRadForm({ type, patientId, values: { notes }, signedBy: staff });
      setNotes('');
      return { ok: true as const, message: `${type} saved and signed.` };
    }, r => r.message);
  };

  const localSaved = db.radForms.list();
  const patients = db.patients.list();

  return (
    <Shell title="Forms">
      <Section icon={<FileText className="h-5 w-5" />} title="Radiology & ECG Forms" desc="Standardized electronic forms with e-signature, timestamp and audit trail." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="space-y-3">
            <div><Label className="text-xs">Form</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">{RADIOLOGY_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            {apiOn ? (
              <>
                <div className="flex gap-2">
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient…" />
                  <Button type="button" variant="outline" onClick={() => void search()}>Search</Button>
                </div>
                <Select value={personId === '' ? '' : String(personId)} onValueChange={v => setPersonId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Patient" /></SelectTrigger>
                  <SelectContent>{people.map(p => <SelectItem key={p.personId} value={String(p.personId)}>{[p.firstName, p.lastName].filter(Boolean).join(' ')} · {p.hospitalNo}</SelectItem>)}</SelectContent>
                </Select>
              </>
            ) : (
              <div><Label className="text-xs">Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div><Label className="text-xs">Details / Answers</Label><Textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <LoadingButton className="w-full" loading={isBusy('form')} loadingText="Saving…" onClick={save}><FileSignature className="h-4 w-4 mr-1" />Save & Sign ({staff})</LoadingButton>
          </div>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Completed Forms</div>
          <Table>
            <TableHeader><TableRow><TableHead>Form</TableHead><TableHead>Patient</TableHead><TableHead>Signed By</TableHead></TableRow></TableHeader>
            <TableBody>
              {apiOn
                ? (forms.length === 0
                  ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No forms yet.</TableCell></TableRow>
                  : forms.map(s => (
                    <TableRow key={s.formId}><TableCell className="text-sm">{s.formType}</TableCell><TableCell>{s.patientName ?? `PID-${s.personId}`}</TableCell><TableCell className="text-xs">{s.signedBy}</TableCell></TableRow>
                  )))
                : (localSaved.length === 0
                  ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No forms yet.</TableCell></TableRow>
                  : localSaved.slice().reverse().map(s => (
                    <TableRow key={s.id}><TableCell className="text-sm">{s.type}</TableCell><TableCell>{s.patientName}</TableCell><TableCell className="text-xs">{s.signedBy}</TableCell></TableRow>
                  )))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

export const LiveRadiologyAnalytics = () => {
  useDbTick();
  const rad = useRadiology();
  const apiOn = isImagingApiEnabled();
  const [m, setM] = useState<ApiRadMetrics | null>(null);
  const [equip, setEquip] = useState<ApiRadEquipment[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    void Promise.all([getRadiologyMetrics(), listRadEquipment().catch(() => [] as ApiRadEquipment[])])
      .then(([metrics, eq]) => { setM(metrics); setEquip(eq); })
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const local = rad.dashboardMetrics();
  const util = rad.modalityUtilisation();
  const localEq = db.radEquipment.list();
  const apiUtil = m?.modalityUtilisation ?? [];

  return (
    <Shell title="Analytics">
      <Section icon={<BarChart3 className="h-5 w-5" />} title="Radiology Analytics" desc="Modality utilization, machine status, revenue and turnaround." />
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        {apiOn && m ? (
          <>
            <SummaryCard title="Total Requests" value={String(m.total)} icon={FilePlus} />
            <SummaryCard title="Reports Awaiting" value={String(m.reportsAwaiting ?? 0)} icon={FileSignature} />
            <SummaryCard title="Critical Findings" value={String(m.criticalReports ?? m.critical ?? 0)} icon={AlertTriangle} />
            <SummaryCard title="Low Stock" value={String(m.lowStock ?? 0)} icon={Boxes} />
          </>
        ) : (
          <>
            <SummaryCard title="Requests Today" value={String(local.totalToday)} icon={FilePlus} />
            <SummaryCard title="Revenue Today" value={formatCurrency(local.revenueToday)} icon={CreditCard} />
            <SummaryCard title="Critical Findings" value={String(local.critical)} icon={AlertTriangle} />
            <SummaryCard title="Equipment Offline" value={String(local.equipmentOffline)} icon={Wrench} />
          </>
        )}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Modality Utilization</div>
          <Table><TableHeader><TableRow><TableHead>Modality</TableHead><TableHead className="text-right">Studies</TableHead></TableRow></TableHeader>
            <TableBody>
              {(apiOn ? apiUtil : util).length === 0
                ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>
                : (apiOn ? apiUtil : util).map(u => <TableRow key={u.modality}><TableCell>{u.modality}</TableCell><TableCell className="text-right">{u.count}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Machine Utilization (usage hours)</div>
          <Table><TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Hours</TableHead></TableRow></TableHeader>
            <TableBody>
              {apiOn
                ? equip.map(e => <TableRow key={e.equipmentId}><TableCell>{e.name}</TableCell><TableCell><Pill tone={e.status === 'Available' ? 'green' : 'amber'}>{e.status}</Pill></TableCell><TableCell className="text-right">{e.usageHours}</TableCell></TableRow>)
                : localEq.map(e => <TableRow key={e.id}><TableCell>{e.name}</TableCell><TableCell><Pill tone={e.status === 'ONLINE' ? 'green' : 'amber'}>{e.status}</Pill></TableCell><TableCell className="text-right">{e.usageHours}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

export const LiveImageArchive = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ApiImagingRequest[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    void listImagingRequests({ page: 1, limit: 200 })
      .then(p => setRows(p.items.filter(r => r.studyUid)))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const local = db.imagingRequests.list().filter(r => r.studyUid && (!q || r.patientName.toLowerCase().includes(q.toLowerCase()) || (r.studyUid ?? '').includes(q)));
  const apiFiltered = rows.filter(r => {
    if (!q) return true;
    const name = imagingPatientName(r.person).toLowerCase();
    return name.includes(q.toLowerCase()) || (r.studyUid ?? '').includes(q);
  });

  return (
    <Shell title="Image Archive">
      <Section icon={<Archive className="h-5 w-5" />} title="Image Archive (PACS)" desc="Long-term study storage searchable by patient, study UID, modality and date." />
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient or study UID…" className="pl-9" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Modality</TableHead><TableHead>Study UID</TableHead><TableHead>Dose</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn
              ? (apiFiltered.length === 0
                ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No archived studies.</TableCell></TableRow>
                : apiFiltered.map(r => (
                  <TableRow key={r.imagingRequestId}>
                    <TableCell className="font-medium">{imagingPatientName(r.person)}</TableCell>
                    <TableCell>{r.items[0]?.modality ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.studyUid}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-xs">{(r.completedAt ?? r.updatedAt ?? '').slice(0, 10)}</TableCell>
                    <TableCell><Button size="sm" variant="outline" asChild><Link to={`/dashboard/radiology/pacs?studyUid=${encodeURIComponent(r.studyUid ?? '')}`}>Open</Link></Button></TableCell>
                  </TableRow>
                )))
              : (local.length === 0
                ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No archived studies.</TableCell></TableRow>
                : local.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.modality}</TableCell>
                    <TableCell className="font-mono text-xs">{r.studyUid}</TableCell>
                    <TableCell>{r.radiationDose ? `${r.radiationDose} mGy` : '—'}</TableCell>
                    <TableCell className="text-xs">{(r.updatedAt ?? '').slice(0, 10)}</TableCell>
                    <TableCell><Button size="sm" variant="outline" asChild><Link to={`/dashboard/radiology/pacs?studyUid=${encodeURIComponent(r.studyUid ?? '')}`}>Open</Link></Button></TableCell>
                  </TableRow>
                )))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

export const LiveRadiologyPrintCenter = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiConsumerResult[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    void listConsumerImagingResults({ status: 'RELEASED', limit: 100 })
      .then(setRows)
      .catch(async () => {
        try {
          const reps = await listRadiologyReports({ status: 'Released' });
          setRows(reps.map(r => ({
            ...r,
            personId: null,
            patientName: '—',
            hospitalNo: null,
            modality: '—',
            studyName: `Report #${r.reportId}`,
            studyUid: null,
            requestNo: String(r.imagingRequestId),
          })));
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'Load failed');
        }
      });
  }, [apiOn]);

  const local = db.radiologyReports.list().filter(r => r.status === 'RELEASED' || r.status === 'VERIFIED');
  const printStub = (kind: string) => {
    toast.success(`${kind} sent.`);
    if (kind === 'PDF') window.print();
  };

  return (
    <Shell title="Film / CD Printing">
      <Section icon={<Printer className="h-5 w-5" />} title="Film / CD Printing" desc="Print film, export CD/DVD/USB with viewer, watermark, logo and QR verification." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Status</TableHead><TableHead>Export</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn
              ? (rows.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No studies ready to print.</TableCell></TableRow>
                : rows.map(r => (
                  <TableRow key={r.reportId}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.modality} · {r.studyName}</TableCell>
                    <TableCell><Pill tone="green">{r.status}</Pill></TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => printStub('Film')}>Film</Button>
                      <Button size="sm" variant="outline" onClick={() => printStub('CD/DVD')}>CD</Button>
                      <Button size="sm" variant="outline" onClick={() => printStub('PDF')}>PDF</Button>
                    </div></TableCell>
                  </TableRow>
                )))
              : (local.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No studies ready to print.</TableCell></TableRow>
                : local.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.modality}</TableCell>
                    <TableCell><Pill tone="green">{r.status}</Pill></TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => printStub('Film')}>Film</Button>
                      <Button size="sm" variant="outline" onClick={() => printStub('CD/DVD')}>CD</Button>
                      <Button size="sm" variant="outline" onClick={() => printStub('PDF')}>PDF</Button>
                    </div></TableCell>
                  </TableRow>
                )))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

export const LiveRadiologyAlerts = () => {
  useDbTick();
  const rad = useRadiology();
  const apiOn = isImagingApiEnabled();
  const [reports, setReports] = useState<ApiRadiologyReport[]>([]);
  const [ecgs, setEcgs] = useState<ApiEcgStudy[]>([]);
  const [consumer, setConsumer] = useState<ApiConsumerResult[]>([]);
  const [acked, setAcked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('gfa_rad_critical_ack_v1') || '{}') as Record<string, boolean>; }
    catch { return {}; }
  });

  const persistAck = (key: string) => {
    setAcked(prev => {
      const next = { ...prev, [key]: true };
      localStorage.setItem('gfa_rad_critical_ack_v1', JSON.stringify(next));
      return next;
    });
    toast.success('Acknowledged & escalated.');
  };

  useEffect(() => {
    if (!apiOn) return;
    void Promise.all([
      getCriticalFindings(),
      listConsumerImagingResults({ critical: true, limit: 50 }).catch(() => [] as ApiConsumerResult[]),
    ]).then(([crit, cons]) => {
      setReports(crit.reports);
      setEcgs(crit.ecgs);
      setConsumer(cons);
    }).catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const localCritical = rad.criticalFindings().filter(c => !acked[`local-${c.id}`]);
  const nameFor = (reportId: number) => consumer.find(c => c.reportId === reportId)?.patientName
    ?? `Report #${reportId}`;
  const apiReports = reports.filter(c => !acked[`rep-${c.reportId}`]);
  const apiEcgs = ecgs.filter(e => !acked[`ecg-${e.ecgId}`]);

  return (
    <Shell title="Critical Alerts">
      <Section icon={<Bell className="h-5 w-5" />} title="Critical Alerts" desc="Time-sensitive alerts requiring acknowledgement (persisted in-browser)." />
      <Card>
        {apiOn ? (
          apiReports.length === 0 && apiEcgs.length === 0
            ? <div className="text-sm text-muted-foreground text-center py-8">No active critical alerts.</div>
            : (
              <div className="space-y-2">
                {apiReports.map(c => (
                  <div key={c.reportId} className="flex justify-between items-center p-3 rounded-lg border border-rose-200 bg-rose-50">
                    <span className="text-sm text-rose-700"><AlertTriangle className="h-4 w-4 inline mr-1" />{nameFor(c.reportId)} · {c.impression ?? c.findings}</span>
                    <Button size="sm" onClick={() => persistAck(`rep-${c.reportId}`)}>Acknowledge</Button>
                  </div>
                ))}
                {apiEcgs.map(e => (
                  <div key={e.ecgId} className="flex justify-between items-center p-3 rounded-lg border border-rose-200 bg-rose-50">
                    <span className="text-sm text-rose-700"><HeartPulse className="h-4 w-4 inline mr-1" />ECG #{e.ecgId} · {e.interpretation ?? e.rhythm ?? 'Critical ECG'}</span>
                    <Button size="sm" onClick={() => persistAck(`ecg-${e.ecgId}`)}>Acknowledge</Button>
                  </div>
                ))}
              </div>
            )
        ) : (
          localCritical.length === 0
            ? <div className="text-sm text-muted-foreground text-center py-8">No active critical alerts.</div>
            : (
              <div className="space-y-2">{localCritical.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-lg border border-rose-200 bg-rose-50">
                  <span className="text-sm text-rose-700"><AlertTriangle className="h-4 w-4 inline mr-1" />{c.patientName} · {c.criticalFinding ?? c.impression}</span>
                  <Button size="sm" onClick={() => persistAck(`local-${c.id}`)}>Acknowledge</Button>
                </div>
              ))}</div>
            )
        )}
      </Card>
    </Shell>
  );
};

export const LivePacsViewer = () => {
  const [params] = useSearchParams();
  const studyUid = params.get('studyUid') ?? '';
  const deepLink = studyUid ? `#studyUid=${encodeURIComponent(studyUid)}` : '#studyUid=';

  return (
    <Shell title="PACS Viewer">
      <Section icon={<ImageIcon className="h-5 w-5" />} title="PACS Viewer" desc="Diagnostic viewer — zoom, pan, window level, measurements, MPR/MIP/3D, prior-study compare." />
      <Card>
        <div className="aspect-video rounded-lg bg-neutral-900 text-neutral-400 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <div>DICOM viewport · {studyUid ? `Study UID ${studyUid}` : 'select a study from the Archive'}</div>
          {studyUid && <div className="font-mono text-xs text-neutral-500 break-all">{studyUid}</div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {['Zoom', 'Pan', 'Rotate', 'Window', 'Measure', 'Compare', 'MPR', '3D', 'Export'].map(t => <Button key={t} size="sm" variant="outline" onClick={() => toast.info(`${t} (stub)`)}>{t}</Button>)}
          <Button size="sm" variant="default" onClick={() => {
            toast.info(studyUid ? `Opening external PACS ${deepLink}` : 'Select a study UID first');
            if (studyUid) window.location.hash = `studyUid=${encodeURIComponent(studyUid)}`;
          }}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />Open external PACS
          </Button>
        </div>
        {studyUid && (
          <p className="text-xs text-muted-foreground mt-3">Deep-link stub: <code className="font-mono">{deepLink}</code></p>
        )}
      </Card>
    </Shell>
  );
};

export const LiveRadiologyMobile = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiImagingRequest[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    void listImagingRequests({ workQueue: true, page: 1, limit: 40 })
      .then(p => setRows(p.items))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const local = db.imagingRequests.list().filter(r => !['RELEASED', 'REJECTED'].includes(r.status)).slice(0, 20);

  return (
    <Shell title="Mobile Mode">
      <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile Mode" desc="Tablet/phone-optimised worklist and result review for on-call radiologists." />
      <Card className="max-w-lg mx-auto">
        <div className="space-y-2">
          {apiOn
            ? (rows.length === 0
              ? <div className="text-sm text-muted-foreground text-center py-8">No active worklist items.</div>
              : rows.map(r => (
                <div key={r.imagingRequestId} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{imagingPatientName(r.person)}</div>
                  <div className="text-xs text-muted-foreground">{r.items[0]?.modality ?? '—'} · {r.items[0]?.studyName ?? r.requestNo}</div>
                  <div className="mt-1"><Pill tone={STATUS_TONE[r.status] ?? 'blue'}>{label(r.status)}</Pill></div>
                </div>
              )))
            : (local.length === 0
              ? <div className="text-sm text-muted-foreground text-center py-8">Responsive worklist available on mobile devices.</div>
              : local.map(r => (
                <div key={r.id} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{r.patientName}</div>
                  <div className="text-xs text-muted-foreground">{r.modality} · {r.region}</div>
                  <div className="mt-1"><Pill tone={STATUS_TONE[r.status] ?? 'blue'}>{label(r.status)}</Pill></div>
                </div>
              )))}
        </div>
      </Card>
    </Shell>
  );
};

export const LiveImageUploadCenter = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiImagingRequest[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    void listImagingRequests({ page: 1, limit: 200 })
      .then(p => setRows(p.items.filter(r => r.status === 'Completed' || Boolean(r.studyUid))))
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const local = db.imagingRequests.list().filter(r => r.status === 'IMAGING_DONE' || r.studyUid);

  return (
    <Shell title="Image Acquisition">
      <Section icon={<Upload className="h-5 w-5" />} title="Image Acquisition" desc="DICOM/HL7/FHIR acquisition. Study/Series/Instance UIDs generated on completion." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Modality</TableHead><TableHead>Study UID</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn
              ? (rows.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No acquired studies yet.</TableCell></TableRow>
                : rows.map(r => (
                  <TableRow key={r.imagingRequestId}>
                    <TableCell className="font-medium">{imagingPatientName(r.person)}</TableCell>
                    <TableCell>{r.items[0]?.modality ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.studyUid ?? '—'}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status] ?? 'blue'}>{r.status}</Pill></TableCell>
                  </TableRow>
                )))
              : (local.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No acquired studies yet.</TableCell></TableRow>
                : local.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.modality}</TableCell>
                    <TableCell className="font-mono text-xs">{r.studyUid ?? '—'}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status] ?? 'blue'}>{r.status}</Pill></TableCell>
                  </TableRow>
                )))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

export const LiveRadiologyComms = () => {
  useDbTick();
  const rad = useRadiology();
  const apiOn = isImagingApiEnabled();
  const [criticalReports, setCriticalReports] = useState<ApiRadiologyReport[]>([]);
  const [criticalEcgs, setCriticalEcgs] = useState<ApiEcgStudy[]>([]);
  const [unpaid, setUnpaid] = useState(0);
  const [lowStock, setLowStock] = useState(0);

  useEffect(() => {
    if (!apiOn) return;
    void Promise.all([
      getCriticalFindings(),
      listImagingRequests({ paymentStatus: 'Unpaid', page: 1, limit: 1 }),
      listRadConsumables(),
    ]).then(([crit, unpaidPage, cons]) => {
      setCriticalReports(crit.reports);
      setCriticalEcgs(crit.ecgs);
      setUnpaid(unpaidPage.meta.total);
      setLowStock(cons.filter(c => c.lowStock || c.stock <= c.reorderLevel).length);
    }).catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);

  const items: { text: string; tone: string }[] = apiOn
    ? [
        ...criticalReports.map(c => ({ text: `Critical report #${c.reportId} — ${c.impression ?? c.findings.slice(0, 80)}`, tone: 'red' })),
        ...criticalEcgs.map(e => ({ text: `Critical ECG #${e.ecgId} · HR ${e.heartRate ?? '—'} · ${e.rhythm ?? ''}`, tone: 'red' })),
        ...(unpaid > 0 ? [{ text: `${unpaid} unpaid imaging request(s) awaiting cashier`, tone: 'orange' }] : []),
        ...(lowStock > 0 ? [{ text: `${lowStock} consumable(s) at/below reorder level`, tone: 'amber' }] : []),
      ]
    : [
        ...rad.criticalFindings().map(c => ({ text: `Critical finding — ${c.patientName} (${c.modality})`, tone: 'red' })),
        ...rad.lowStockConsumables().map(l => ({ text: `Low stock — ${l.name} (${l.stock} left)`, tone: 'amber' })),
        ...db.imagingRequests.list().filter(r => r.status === 'AWAITING_PAYMENT').map(r => ({ text: `Payment pending — ${r.patientName}`, tone: 'orange' })),
      ];

  return (
    <Shell title="Notifications">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Radiology Communications" desc="In-app alerts for critical findings, payment and inventory (SMS/WhatsApp deferred)." />
      <Card>
        {items.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No notifications.</div> : (
          <div className="space-y-2">{items.map((it, i) => (
            <div key={i} className={`flex items-center gap-2 p-3 rounded-lg border ${toneCls(it.tone)}`}><AlertTriangle className="h-4 w-4" /><span className="text-sm">{it.text}</span></div>
          ))}</div>
        )}
      </Card>
    </Shell>
  );
};

/* ─── Reports / History / AI (Phase 6–8) ─────────────────────────────── */
export const LiveRadiologyReports = () => {
  useDbTick();
  const rad = useRadiology();
  const apiOn = isImagingApiEnabled();
  const [m, setM] = useState<ApiRadMetrics | null>(null);
  useEffect(() => {
    if (!apiOn) return;
    void getRadiologyMetrics().then(setM).catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);
  const local = rad.dashboardMetrics();
  const rows: [string, string][] = apiOn && m
    ? [
        ['Total requests', String(m.total)],
        ['Unpaid', String(m.unpaid ?? 0)],
        ['Scheduled', String(m.scheduled ?? 0)],
        ['In progress', String(m.inProgress ?? 0)],
        ['Completed', String(m.completed ?? 0)],
        ['Reports awaiting verify', String(m.reportsAwaiting ?? 0)],
        ['Critical reports', String(m.criticalReports ?? m.critical ?? 0)],
        ['Critical ECGs', String(m.criticalEcgs ?? 0)],
        ['Low stock items', String(m.lowStock ?? 0)],
      ]
    : [
        ['Requests today', String(local.totalToday)],
        ['Revenue today', formatCurrency(local.revenueToday)],
        ['Awaiting report', String(local.reportsAwaiting)],
        ['Critical findings', String(local.critical)],
        ['Equipment offline', String(local.equipmentOffline)],
      ];

  return (
    <Shell title="Reports">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Operational Reports" desc="Performance snapshot — export PDF/Excel/CSV stubs for Phase 8 print path."
        action={<Button variant="outline" onClick={() => { toast.success('Report exported.'); window.print(); }}><Printer className="h-4 w-4 mr-1" />Export</Button>} />
      <Card>
        <Table>
          <TableBody>
            {rows.map(([k, v]) => (
              <TableRow key={k}><TableCell>{k}</TableCell><TableCell className="text-right font-semibold">{v}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

export const LiveRadiologyHistory = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<ApiConsumerResult[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!apiOn) return;
    void listConsumerImagingResults({ limit: 100 })
      .then(setRows)
      .catch(e => toast.error(e instanceof ApiError ? e.message : 'Load failed'));
  }, [apiOn]);
  const local = db.radiologyReports.list().slice().reverse();
  const filtered = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.patientName.toLowerCase().includes(s) || r.studyName.toLowerCase().includes(s) || (r.hospitalNo ?? '').toLowerCase().includes(s);
  });

  return (
    <Shell title="Imaging History">
      <Section icon={<History className="h-5 w-5" />} title="Imaging History" desc="Historical imaging reports across all patients." />
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Status</TableHead><TableHead>Critical</TableHead></TableRow></TableHeader>
          <TableBody>
            {apiOn
              ? (filtered.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No results.</TableCell></TableRow>
                : filtered.map(r => (
                  <TableRow key={r.reportId}>
                    <TableCell className="font-medium">{r.patientName}<div className="text-xs text-muted-foreground">{r.hospitalNo}</div></TableCell>
                    <TableCell>{r.modality} · {r.studyName}</TableCell>
                    <TableCell><Pill tone="green">{r.status}</Pill></TableCell>
                    <TableCell>{r.critical ? <Pill tone="red">Yes</Pill> : '—'}</TableCell>
                  </TableRow>
                )))
              : (local.filter(r => !q || r.patientName.toLowerCase().includes(q.toLowerCase())).length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No results.</TableCell></TableRow>
                : local.filter(r => !q || r.patientName.toLowerCase().includes(q.toLowerCase())).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patientName}</TableCell>
                    <TableCell>{r.modality}</TableCell>
                    <TableCell><Pill tone="green">{r.status}</Pill></TableCell>
                    <TableCell>{r.critical ? <Pill tone="red">Yes</Pill> : '—'}</TableCell>
                  </TableRow>
                )))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

export const LiveAllImagingResults = () => <LiveRadiologyHistory />;

export const LiveAiAssistant = () => {
  const [picked, setPicked] = useState<string | null>(null);
  const tools = [
    'Fracture detection', 'Intracranial hemorrhage', 'Lung nodule detection', 'Pneumonia / TB screening',
    'Stroke detection', 'Breast lesion detection', 'Bone age assessment', 'ECG rhythm analysis',
    'Prior-study comparison', 'Image quality QA',
  ];
  return (
    <Shell title="AI Assistant">
      <Section icon={<Sparkles className="h-5 w-5" />} title="AI Diagnostic Assistant" desc="Assistive only — never auto-finalizes. Suggestions require radiologist sign-off; mark reports with aiAssisted when used." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {tools.map(c => (
          <button key={c} type="button" className={`text-left bg-card rounded-xl border shadow-sm p-4 hover:border-primary/40 ${picked === c ? 'border-primary' : ''}`} onClick={() => { setPicked(c); toast.info(`${c}: suggestion drafted — radiologist must review before submit.`); }}>
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{c}</span></div>
            <p className="text-xs text-muted-foreground mt-1">AI-assisted · no auto-release</p>
          </button>
        ))}
      </div>
      {picked && (
        <Card>
          <div className="text-sm font-medium mb-1">Active assistive tool: {picked}</div>
          <p className="text-xs text-muted-foreground">Copy findings into Reporting and tick “AI assisted” if your workflow supports it. Real ML inference is deferred (vendor/model not in scope).</p>
          <Button className="mt-3" variant="outline" asChild><Link to="/dashboard/radiology/report"><Eye className="h-4 w-4 mr-1" />Open Reporting</Link></Button>
        </Card>
      )}
    </Shell>
  );
};

/* ─── API New Request dialog helper used by Request Center ──────────── */
export function ApiNewImagingRequestDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const { run, isBusy } = useAsyncAction();
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState<number | ''>('');
  const [studies, setStudies] = useState<ApiImagingStudy[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'Emergency' | 'Stat'>('Routine');
  const [indication, setIndication] = useState('');

  useEffect(() => {
    if (!open) return;
    void listImagingStudies({ status: 'Active' }).then(setStudies).catch(() => setStudies([]));
  }, [open]);

  const search = async () => {
    if (q.trim().length < 2) return;
    try { setPeople(await searchPersons(q.trim())); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Search failed'); }
  };

  const submit = () => {
    const items = studies.filter(s => selected[s.imagingStudyId]).map(s => ({ studyId: s.imagingStudyId }));
    if (!personId || items.length === 0) { toast.error('Select patient and at least one study'); return; }
    void run('new-api-rad', 'Creating…', async () => {
      await createImagingRequest({
        personId: Number(personId),
        priority,
        clinicalIndication: indication,
        source: 'Doctor',
        items,
      });
      onOpenChange(false);
      onCreated();
      return { ok: true as const, message: 'Imaging request created' };
    }, x => x.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>New Imaging Request (API)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient…" /><Button type="button" variant="outline" onClick={() => void search()}>Search</Button></div>
          <Select value={personId === '' ? '' : String(personId)} onValueChange={v => setPersonId(Number(v))}>
            <SelectTrigger><SelectValue placeholder="Patient" /></SelectTrigger>
            <SelectContent>{people.map(p => <SelectItem key={p.personId} value={String(p.personId)}>{[p.firstName, p.lastName].filter(Boolean).join(' ')} · {p.hospitalNo}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={priority} onValueChange={v => setPriority(v as typeof priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(['Routine', 'Urgent', 'Emergency', 'Stat'] as const).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} value={indication} onChange={e => setIndication(e.target.value)} placeholder="Clinical indication" />
          <div className="border rounded-lg divide-y max-h-48 overflow-auto">
            {studies.map(s => (
              <label key={s.imagingStudyId} className="flex items-center justify-between p-2 text-sm cursor-pointer">
                <span className="flex items-center gap-2"><input type="checkbox" checked={!!selected[s.imagingStudyId]} onChange={() => setSelected(x => ({ ...x, [s.imagingStudyId]: !x[s.imagingStudyId] }))} />{s.modality} · {s.name}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(s.unitPrice)}</span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton loading={isBusy('new-api-rad')} onClick={submit}>Create</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
