import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/database';
import { InpatientImagingCard } from '@/components/inpatient/InpatientDemoPanels';
import { releaseImagingByNumber } from '@/lib/demo/inpatientCase';
import { formatCurrency } from '@/data/dummyData';
import { useRadiology } from '@/contexts/RadiologyStore';
import { MODALITY_PRICE, RADIOLOGY_FORMS } from '@/lib/radiology-actions';
import type { RadModality, RadPriority, RadRequestStatus, ImagingRequest, EcgType } from '@/data-access/types';
import { ApiError } from '@/lib/api/client';
import {
  imagingPatientName,
  isImagingApiEnabled,
  isImagingProcessingLocked,
  listImagingRequests,
  updateImagingRequest,
  type ApiImagingRequest,
} from '@/lib/api/imaging';
import { ApiNewImagingRequestDialog } from '@/pages/radiology/RadiologyWorkflowPages';
import {
  LayoutDashboard, FilePlus, ClipboardList, CalendarDays, Image as ImageIcon, Upload,
  FileSignature, HeartPulse, ShieldCheck, History, Eye, Printer, CreditCard, Brain,
  MessageSquare, ScrollText, BarChart3, Smartphone, Settings2, AlertTriangle, Wrench,
  Boxes, FileText, CheckCircle2, Clock, Send, Bell, Search, Plus, XCircle, Play,
  Stethoscope, Sparkles, Archive, ClipboardCheck, Radio, Activity, Loader2,
} from 'lucide-react';

const base = '/dashboard/radiology';

export const radiologyNav = [
  { label: 'Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Request Center', path: `${base}/request`, icon: <FilePlus className="h-4 w-4" /> },
  { label: 'Imaging Worklist', path: `${base}/queue`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Scheduling', path: `${base}/schedule`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Patient Preparation', path: `${base}/preparation`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Examination Room', path: `${base}/exam`, icon: <Play className="h-4 w-4" /> },
  { label: 'PACS Viewer', path: `${base}/pacs`, icon: <ImageIcon className="h-4 w-4" /> },
  { label: 'Image Acquisition', path: `${base}/upload`, icon: <Upload className="h-4 w-4" /> },
  { label: 'Reporting', path: `${base}/report`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Report Verification', path: `${base}/validation`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Critical Findings', path: `${base}/critical`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Result Release', path: `${base}/release`, icon: <Send className="h-4 w-4" /> },
  { label: 'ECG Management', path: `${base}/ecg`, icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'EEG Reporting', path: `${base}/eeg`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Imaging History', path: `${base}/history`, icon: <History className="h-4 w-4" /> },
  { label: 'All Results', path: `${base}/all-results`, icon: <Eye className="h-4 w-4" /> },
  { label: 'Image Archive', path: `${base}/archive`, icon: <Archive className="h-4 w-4" /> },
  { label: 'Film / CD Printing', path: `${base}/print`, icon: <Printer className="h-4 w-4" /> },
  { label: 'Billing', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Equipment', path: `${base}/equipment`, icon: <Wrench className="h-4 w-4" /> },
  { label: 'Consumables', path: `${base}/consumables`, icon: <Boxes className="h-4 w-4" /> },
  { label: 'Forms', path: `${base}/forms`, icon: <FileText className="h-4 w-4" /> },
  { label: 'AI Assistant', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Analytics', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reports', path: `${base}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Notifications', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <Bell className="h-4 w-4" /> },
  { label: 'Mobile Mode', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Audit Trail', path: `${base}/audit`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Settings', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={radiologyNav} title={`Radiology · ${title}`}>
    <DbBootGate>{children}</DbBootGate>
  </DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
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

const toneCls = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200', red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200', orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200', sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] ?? 'bg-muted text-foreground border-border');
const Pill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${toneCls(tone)} whitespace-nowrap`}>{children}</span>
);

const STATUS_TONE: Record<RadRequestStatus, string> = {
  REQUESTED: 'amber', ACCEPTED: 'sky', REJECTED: 'red', AWAITING_PAYMENT: 'orange', PAID: 'blue',
  SCHEDULED: 'sky', IN_PROGRESS: 'purple', IMAGING_DONE: 'blue', REPORT_PENDING: 'amber',
  REPORTED: 'purple', VERIFIED: 'green', RELEASED: 'green', CANCELLED: 'red',
};
const priorityTone = (p: RadPriority) => p === 'EMERGENCY' ? 'red' : p === 'URGENT' ? 'orange' : 'sky';
const label = (s: string) => s.replace(/_/g, ' ');

const MODALITIES: RadModality[] = ['X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'ECG', 'EEG', 'Mammography', 'Fluoroscopy', 'Echocardiography', 'Portable'];
const useStaff = () => { const { user } = useAuth(); return user?.name ?? 'Radiology Staff'; };

/* ===================================================================== */
/* 1. DASHBOARD                                                          */
/* ===================================================================== */
export const RadiologyDashboard = () => {
  useDbTick();
  const rad = useRadiology();
  const navigate = useNavigate();
  const m = rad.dashboardMetrics();
  const util = rad.modalityUtilisation();
  const cards = [
    { t: 'Requests Today', v: String(m.totalToday), i: FilePlus },
    { t: 'Pending Requests', v: String(m.pending), i: Clock },
    { t: 'Scheduled', v: String(m.scheduled), i: CalendarDays },
    { t: 'Being Scanned', v: String(m.inProgress), i: Play },
    { t: 'Reports Awaiting', v: String(m.reportsAwaiting), i: FileSignature },
    { t: 'Reports Completed', v: String(m.reportsToday), i: CheckCircle2 },
    { t: 'Critical Findings', v: String(m.critical), i: AlertTriangle },
    { t: 'ECG Waiting', v: String(m.ecgWaiting), i: HeartPulse },
    { t: 'ECG Completed', v: String(m.ecgCompleted), i: Activity },
    { t: 'Ultrasound Waiting', v: String(m.ultrasoundWaiting), i: Radio },
    { t: 'X-Ray Waiting', v: String(m.xrayWaiting), i: ImageIcon },
    { t: 'CT Waiting', v: String(m.ctWaiting), i: ImageIcon },
    { t: 'MRI Waiting', v: String(m.mriWaiting), i: ImageIcon },
    { t: 'Portable Requests', v: String(m.portable), i: Smartphone },
    { t: 'Equipment Offline', v: String(m.equipmentOffline), i: Wrench },
    { t: 'Revenue Today', v: formatCurrency(m.revenueToday), i: CreditCard },
    { t: 'Emergency Cases', v: String(m.emergency), i: AlertTriangle },
    { t: 'Low Stock Items', v: String(m.lowStock), i: Boxes },
  ];
  return (
    <Shell title="Dashboard">
      <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Radiology & ECG Dashboard" desc="Real-time overview of all imaging and cardiac diagnostic activity."
        action={<Button onClick={() => navigate(`${base}/request`)}><Plus className="h-4 w-4 mr-1" />New Request</Button>} />
      <InpatientImagingCard />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={c.v} icon={c.i} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Investigation Type Distribution</div>
          {util.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No imaging requests yet.</div> : (
            <div className="space-y-2">
              {util.map(u => {
                const max = util[0].count || 1;
                return (
                  <div key={u.modality}>
                    <div className="flex justify-between text-xs mb-0.5"><span>{u.modality}</span><span className="text-muted-foreground">{u.count}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(u.count / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Machine Status</div>
          <div className="space-y-2">
            {db.radEquipment.list().map(e => (
              <div key={e.id} className="flex justify-between items-center p-2 border rounded-lg text-sm">
                <span>{e.name} <span className="text-muted-foreground text-xs">· {e.room}</span></span>
                <Pill tone={e.status === 'ONLINE' ? 'green' : e.status === 'OFFLINE' ? 'red' : 'amber'}>{e.status}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* Shared request table + new-request dialog                            */
/* ===================================================================== */
const RequestRow = ({ r, actions }: { r: ImagingRequest; actions?: React.ReactNode }) => (
  <TableRow>
    <TableCell className="font-medium">{r.patientName}<div className="text-xs text-muted-foreground font-mono">{r.hospitalId}</div></TableCell>
    <TableCell>{r.modality}<div className="text-xs text-muted-foreground">{r.region}</div></TableCell>
    <TableCell><Pill tone={priorityTone(r.priority)}>{r.priority}</Pill></TableCell>
    <TableCell><Pill tone={r.paymentStatus === 'PAID' ? 'green' : 'orange'}>{r.paymentStatus}</Pill></TableCell>
    <TableCell><Pill tone={STATUS_TONE[r.status]}>{label(r.status)}</Pill></TableCell>
    {actions && <TableCell>{actions}</TableCell>}
  </TableRow>
);

const NewRequestDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const [f, setF] = useState({ patientId: '', modality: 'X-Ray' as RadModality, region: '', indication: '', priority: 'ROUTINE' as RadPriority, source: 'Doctor' as ImagingRequest['source'], portable: false });
  const patients = db.patients.list();
  const submit = () => {
    if (!f.patientId) { notify.error('new-rad', 'Select a patient'); return; }
    if (!f.region.trim()) { notify.error('new-rad', 'Enter the body region / study'); return; }
    run('new-rad', 'Creating request…',
      () => { rad.createImagingRequest({ ...f, requestedBy: staff }); return { ok: true as const, message: `${f.modality} request created for imaging.` }; },
      r => r.message,
    ).then(r => { if (r?.ok) { onOpenChange(false); setF({ patientId: '', modality: 'X-Ray', region: '', indication: '', priority: 'ROUTINE', source: 'Doctor', portable: false }); } });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Imaging Request</DialogTitle><DialogDescription>Generates a billable request that flows to the cashier and worklist.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Patient</Label>
            <Select value={f.patientId} onValueChange={v => setF({ ...f, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>{patients.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Modality</Label>
              <Select value={f.modality} onValueChange={v => setF({ ...f, modality: v as RadModality })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODALITIES.map(m => <SelectItem key={m} value={m}>{m} · {formatCurrency(MODALITY_PRICE[m])}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Priority</Label>
              <Select value={f.priority} onValueChange={v => setF({ ...f, priority: v as RadPriority })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['ROUTINE', 'URGENT', 'EMERGENCY'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label className="text-xs">Region / Study</Label><Input value={f.region} onChange={e => setF({ ...f, region: e.target.value })} placeholder="e.g. Chest PA, Brain" /></div>
          <div><Label className="text-xs">Clinical Indication</Label><Textarea rows={2} value={f.indication} onChange={e => setF({ ...f, indication: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Source</Label>
              <Select value={f.source} onValueChange={v => setF({ ...f, source: v as ImagingRequest['source'] })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Doctor', 'Emergency', 'Ward', 'ICU', 'Theatre', 'Walk-in', 'External'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end"><Button type="button" variant={f.portable ? 'default' : 'outline'} className="w-full" onClick={() => setF({ ...f, portable: !f.portable })}>{f.portable ? 'Portable ✓' : 'Portable'}</Button></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton loading={isBusy('new-rad')} loadingText="Creating…" onClick={submit}>Create Request</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ===================================================================== */
/* 2. REQUEST CENTER                                                     */
/* ===================================================================== */
export const ImagingRequestCenter = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const apiOn = isImagingApiEnabled();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reject, setReject] = useState<string | null>(null);
  const [rejectApiId, setRejectApiId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [apiRows, setApiRows] = useState<ApiImagingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshApi = async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const data = await listImagingRequests({
        status: 'Sent,Accepted,Rejected,Cancelled,Scheduled,InProgress,Completed',
        q: search.trim() || undefined,
        page: 1,
        limit: 100,
      });
      setApiRows(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load imaging requests');
      setApiRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiOn) void refreshApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const localReqs = rad.listRequests().filter(r => !search || r.patientName.toLowerCase().includes(search.toLowerCase()) || r.hospitalId.toLowerCase().includes(search.toLowerCase()) || r.modality.toLowerCase().includes(search.toLowerCase()));
  const count = (s: RadRequestStatus) => rad.listRequests().filter(r => r.status === s).length;

  const unpaidApi = apiRows.filter((r) => r.paymentStatus === 'Unpaid').length;
  const paidApi = apiRows.filter((r) => r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived').length;
  const cards = apiOn
    ? [
        { t: 'Total', v: apiRows.length, tone: 'sky' },
        { t: 'Awaiting Payment', v: unpaidApi, tone: 'orange' },
        { t: 'Paid / Ready', v: paidApi, tone: 'blue' },
        { t: 'Accepted', v: apiRows.filter((r) => r.status === 'Accepted').length, tone: 'sky' },
        { t: 'Rejected', v: apiRows.filter((r) => r.status === 'Rejected').length, tone: 'red' },
        { t: 'Cancelled', v: apiRows.filter((r) => r.status === 'Cancelled').length, tone: 'amber' },
      ]
    : [
        { t: 'Pending', v: count('REQUESTED'), tone: 'amber' }, { t: 'Accepted', v: count('ACCEPTED'), tone: 'sky' },
        { t: 'Awaiting Payment', v: count('AWAITING_PAYMENT'), tone: 'orange' }, { t: 'Paid', v: count('PAID'), tone: 'blue' },
        { t: 'Scheduled', v: count('SCHEDULED'), tone: 'sky' }, { t: 'Released', v: count('RELEASED'), tone: 'green' },
      ];

  const doReject = () => {
    if (apiOn && rejectApiId != null) {
      void (async () => {
        try {
          await updateImagingRequest(rejectApiId, { status: 'Rejected', rejectionReason: reason });
          toast.success('Request rejected');
          setReject(null);
          setRejectApiId(null);
          setReason('');
          await refreshApi();
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : 'Reject failed');
        }
      })();
      return;
    }
    if (!reject) return;
    run('reject', 'Rejecting…', () => rad.rejectRequest(reject, reason, staff), r => r.message, r => r.message)
      .then(r => { if (r?.ok) { setReject(null); setReason(''); } });
  };

  const acceptApi = async (r: ApiImagingRequest) => {
    if (isImagingProcessingLocked(r)) {
      toast.error('Payment required before radiology can accept this request');
      return;
    }
    try {
      await updateImagingRequest(r.imagingRequestId, { status: 'Accepted' });
      toast.success(`Accepted ${r.requestNo}`);
      await refreshApi();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Accept failed');
    }
  };

  return (
    <Shell title="Request Center">
      <Section icon={<FilePlus className="h-5 w-5" />} title="Unified Radiology Request Center" desc="Doctor imaging requests — attend only after cashier marks Paid."
        action={
          <div className="flex gap-2">
            {apiOn && (
              <Button variant="outline" onClick={() => void refreshApi()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Refresh
              </Button>
            )}
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New Request</Button>
          </div>
        } />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {cards.map(c => <div key={c.t} className={`rounded-xl border p-3 ${toneCls(c.tone)}`}><div className="text-2xl font-bold">{c.v}</div><div className="text-xs">{c.t}</div></div>)}
      </div>
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && apiOn) void refreshApi(); }} placeholder="Search patient, hospital #, modality…" className="pl-9" /></div>
        {apiOn ? (
          <Table>
            <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Priority</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
              ) : apiRows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No imaging requests.</TableCell></TableRow>
              ) : apiRows.filter((r) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                const name = imagingPatientName(r.person).toLowerCase();
                const study = r.items.map((i) => i.studyName).join(' ').toLowerCase();
                return name.includes(q) || (r.person?.hospitalNo || '').toLowerCase().includes(q) || r.requestNo.toLowerCase().includes(q) || study.includes(q);
              }).map((r) => {
                const locked = isImagingProcessingLocked(r);
                const study = r.items.map((i) => `${i.modality} · ${i.studyName}`).join(', ');
                return (
                  <TableRow key={r.imagingRequestId}>
                    <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                    <TableCell className="font-medium">{imagingPatientName(r.person)}<div className="text-xs text-muted-foreground">{r.person?.hospitalNo || `PID-${r.personId}`}</div></TableCell>
                    <TableCell className="text-xs">{study || '—'}</TableCell>
                    <TableCell><Pill tone={r.priority === 'Emergency' || r.priority === 'Urgent' ? 'red' : 'blue'}>{r.priority}</Pill></TableCell>
                    <TableCell>
                      <Pill tone={r.paymentStatus === 'Paid' ? 'green' : 'orange'}>{r.paymentStatus}</Pill>
                      <div className="text-xs text-muted-foreground">₦{r.totalAmount.toLocaleString()}</div>
                    </TableCell>
                    <TableCell><Pill tone="amber">{r.status}</Pill></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.status === 'Sent' && (
                          <>
                            <Button size="sm" disabled={locked} onClick={() => void acceptApi(r)}>Accept</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRejectApiId(r.imagingRequestId); setReject(r.requestNo); }}>Reject</Button>
                          </>
                        )}
                        {r.clinicalNotes?.includes('inpatient-demo') && r.status !== 'Completed' && (
                          <Button size="sm" variant="outline" onClick={() => {
                            const result = releaseImagingByNumber(r.imagingRequestId);
                            if (!result.ok) toast.error(result.message);
                            else {
                              toast.success('Report released');
                              void refreshApi();
                            }
                          }}>Release report</Button>
                        )}
                        {locked && <Pill tone="orange">Awaiting cashier</Pill>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Investigation</TableHead><TableHead>Priority</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {localReqs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No requests.</TableCell></TableRow> : localReqs.map(r => (
                <RequestRow key={r.id} r={r} actions={
                  <div className="flex gap-1">
                    {r.status === 'REQUESTED' && <>
                      <LoadingButton size="sm" loading={isBusy(`acc-${r.id}`)} onClick={() => run(`acc-${r.id}`, 'Accepting…', () => rad.acceptRequest(r.id, staff), x => x.message)}>Accept</LoadingButton>
                      <Button size="sm" variant="ghost" onClick={() => setReject(r.id)}>Reject</Button>
                    </>}
                    {(r.status === 'ACCEPTED' || r.status === 'REQUESTED') && r.paymentStatus !== 'PAID' && <Pill tone="orange">Needs billing</Pill>}
                  </div>
                } />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {!apiOn && <NewRequestDialog open={open} onOpenChange={setOpen} />}
      {apiOn && <ApiNewImagingRequestDialog open={open} onOpenChange={setOpen} onCreated={() => void refreshApi()} />}
      <Dialog open={!!reject} onOpenChange={o => !o && (setReject(null), setRejectApiId(null))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection…" />
          <DialogFooter><Button variant="ghost" onClick={() => { setReject(null); setRejectApiId(null); }}>Cancel</Button>
            <LoadingButton loading={isBusy('reject')} loadingText="Rejecting…" onClick={doReject}>Reject</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ===================================================================== */
/* 3. WORKLIST                                                           */
/* ===================================================================== */
export const RadiologyRequestQueue = () => {
  useDbTick();
  const rad = useRadiology();
  const reqs = rad.listRequests();
  const groups: { key: string; label: string; match: (r: ImagingRequest) => boolean }[] = [
    { key: 'waiting', label: 'Waiting', match: r => ['REQUESTED', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAID'].includes(r.status) },
    { key: 'scheduled', label: 'Scheduled', match: r => r.status === 'SCHEDULED' },
    { key: 'progress', label: 'In Progress', match: r => r.status === 'IN_PROGRESS' },
    { key: 'done', label: 'Imaging Done', match: r => r.status === 'IMAGING_DONE' },
    { key: 'reported', label: 'Reported', match: r => r.status === 'REPORTED' || r.status === 'REPORT_PENDING' },
    { key: 'verified', label: 'Verified/Released', match: r => r.status === 'VERIFIED' || r.status === 'RELEASED' },
    { key: 'emergency', label: 'Emergency', match: r => r.priority === 'EMERGENCY' },
    { key: 'portable', label: 'Portable', match: r => !!r.portable },
  ];
  return (
    <Shell title="Imaging Worklist">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Imaging Worklist" desc="Dynamic work queue across every stage of the imaging pathway." />
      <Tabs defaultValue="waiting">
        <TabsList className="flex-wrap h-auto">{groups.map(g => <TabsTrigger key={g.key} value={g.key}>{g.label} ({reqs.filter(g.match).length})</TabsTrigger>)}</TabsList>
        {groups.map(g => (
          <TabsContent key={g.key} value={g.key}>
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Investigation</TableHead><TableHead>Priority</TableHead><TableHead>Machine</TableHead><TableHead>Radiographer</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reqs.filter(g.match).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nothing here.</TableCell></TableRow> : reqs.filter(g.match).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.patientName}</TableCell>
                      <TableCell>{r.modality} · {r.region}</TableCell>
                      <TableCell><Pill tone={priorityTone(r.priority)}>{r.priority}</Pill></TableCell>
                      <TableCell className="text-xs">{r.machineId ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.radiographer ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.scheduledAt ?? '—'}</TableCell>
                      <TableCell><Pill tone={STATUS_TONE[r.status]}>{label(r.status)}</Pill></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </Shell>
  );
};

/* ===================================================================== */
/* 4. SCHEDULING                                                         */
/* ===================================================================== */
export const ImagingScheduling = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const schedulable = rad.listRequests().filter(r => ['PAID', 'ACCEPTED'].includes(r.status) || (r.priority === 'EMERGENCY' && r.status !== 'RELEASED' && r.status !== 'SCHEDULED'));
  const machines = db.radEquipment.list().filter(e => e.status === 'ONLINE');
  const [form, setForm] = useState<Record<string, { machineId: string; radiographer: string; scheduledAt: string }>>({});
  const upd = (id: string, patch: Partial<{ machineId: string; radiographer: string; scheduledAt: string }>) =>
    setForm(f => ({ ...f, [id]: { machineId: '', radiographer: '', scheduledAt: '', ...f[id], ...patch } }));
  const schedule = (id: string) => {
    const v = form[id] ?? { machineId: '', radiographer: '', scheduledAt: '' };
    run(`sch-${id}`, 'Scheduling…', () => rad.scheduleRequest(id, v, staff), r => r.message, r => r.message);
  };
  return (
    <Shell title="Scheduling">
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Scheduling & Appointments" desc="Assign machine, radiographer and time. Payment is enforced before scheduling (emergencies exempt)." />
      <Card>
        {schedulable.length === 0 ? <div className="text-sm text-muted-foreground text-center py-10">No requests ready to schedule.</div> : (
          <div className="space-y-3">
            {schedulable.map(r => (
              <div key={r.id} className="p-3 border rounded-lg grid md:grid-cols-5 gap-2 items-end">
                <div><div className="font-medium text-sm">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.modality} · {r.region}</div><Pill tone={priorityTone(r.priority)}>{r.priority}</Pill></div>
                <div><Label className="text-xs">Machine</Label>
                  <Select value={form[r.id]?.machineId ?? ''} onValueChange={v => upd(r.id, { machineId: v })}><SelectTrigger><SelectValue placeholder="Machine" /></SelectTrigger>
                    <SelectContent>{machines.map(mm => <SelectItem key={mm.id} value={mm.id}>{mm.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Radiographer</Label><Input value={form[r.id]?.radiographer ?? ''} onChange={e => upd(r.id, { radiographer: e.target.value })} placeholder="Name" /></div>
                <div><Label className="text-xs">Date / Time</Label><Input value={form[r.id]?.scheduledAt ?? ''} onChange={e => upd(r.id, { scheduledAt: e.target.value })} placeholder="e.g. 28 Jun 11:00" /></div>
                <LoadingButton loading={isBusy(`sch-${r.id}`)} loadingText="Scheduling…" onClick={() => schedule(r.id)}>Schedule</LoadingButton>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* 5. PATIENT PREPARATION                                                */
/* ===================================================================== */
export const PatientPreparation = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const reqs = rad.listRequests().filter(r => ['PAID', 'SCHEDULED', 'ACCEPTED'].includes(r.status));
  const toggles: { key: keyof ImagingRequest['prep']; label: string }[] = [
    { key: 'fasting', label: 'Fasting' }, { key: 'contrastConsent', label: 'Contrast consent' },
    { key: 'metalRemoved', label: 'Metal removed' }, { key: 'pregnancyChecked', label: 'Pregnancy checked' },
    { key: 'ivAccess', label: 'IV access' }, { key: 'sedationRequired', label: 'Sedation' }, { key: 'wheelchair', label: 'Wheelchair' },
  ];
  return (
    <Shell title="Patient Preparation">
      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Patient Preparation" desc="Complete the pre-imaging checklist and mark patients ready for the examination room." />
      <div className="space-y-3">
        {reqs.length === 0 ? <Card><div className="text-sm text-muted-foreground text-center py-8">No patients awaiting preparation.</div></Card> : reqs.map(r => (
          <Card key={r.id}>
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div><span className="font-medium">{r.patientName}</span><span className="text-xs text-muted-foreground ml-2">{r.modality} · {r.region}</span></div>
              <Pill tone={r.prep.status === 'READY' ? 'green' : r.prep.status === 'PENDING' ? 'amber' : 'sky'}>{label(r.prep.status)}</Pill>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {toggles.map(t => (
                <Button key={t.key} size="sm" variant={r.prep[t.key] ? 'default' : 'outline'} onClick={() => rad.updatePrep(r.id, { [t.key]: !r.prep[t.key] }, staff)}>
                  {r.prep[t.key] ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}{t.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { rad.updatePrep(r.id, { status: 'READY' }, staff); toast.success(`${r.patientName} marked ready.`); }}>Mark Ready</Button>
              <Button size="sm" variant="outline" onClick={() => rad.updatePrep(r.id, { status: 'PENDING' }, staff)}>Pending</Button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* 6. EXAMINATION ROOM                                                   */
/* ===================================================================== */
export const ExaminationRoom = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const queue = rad.listRequests().filter(r => ['SCHEDULED', 'IN_PROGRESS'].includes(r.status));
  const [contrast, setContrast] = useState<Record<string, boolean>>({});
  const [dose, setDose] = useState<Record<string, string>>({});
  return (
    <Shell title="Examination Room">
      <Section icon={<Play className="h-5 w-5" />} title="Examination Room" desc="Start and complete examinations; capture contrast use and radiation dose. Study UID is generated on completion." />
      <div className="space-y-3">
        {queue.length === 0 ? <Card><div className="text-sm text-muted-foreground text-center py-8">No patients in the examination queue.</div></Card> : queue.map(r => (
          <Card key={r.id}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div><span className="font-medium">{r.patientName}</span><span className="text-xs text-muted-foreground ml-2">{r.modality} · {r.region} · {r.machineId ?? 'No machine'}</span></div>
              <Pill tone={STATUS_TONE[r.status]}>{label(r.status)}</Pill>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 items-end">
              {r.status === 'SCHEDULED' && <LoadingButton size="sm" loading={isBusy(`start-${r.id}`)} loadingText="Starting…" onClick={() => run(`start-${r.id}`, 'Starting…', () => rad.startExam(r.id, staff), x => x.message)}><Play className="h-3 w-3 mr-1" />Start Exam</LoadingButton>}
              {r.status === 'IN_PROGRESS' && <>
                <Button size="sm" variant={contrast[r.id] ? 'default' : 'outline'} onClick={() => setContrast(c => ({ ...c, [r.id]: !c[r.id] }))}>Contrast {contrast[r.id] ? '✓' : ''}</Button>
                <div><Label className="text-xs">Dose (mGy)</Label><Input className="w-24" value={dose[r.id] ?? ''} onChange={e => setDose(d => ({ ...d, [r.id]: e.target.value }))} /></div>
                <LoadingButton size="sm" loading={isBusy(`done-${r.id}`)} loadingText="Completing…" onClick={() => run(`done-${r.id}`, 'Completing…', () => rad.completeImaging(r.id, { radiographer: staff, contrastUsed: contrast[r.id], radiationDose: Number(dose[r.id]) || undefined, machineId: r.machineId }), x => x.message, x => x.message)}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</LoadingButton>
              </>}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* 9. REPORTING                                                          */
/* ===================================================================== */
export const RadiologyReportEntry = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const reportable = rad.listRequests().filter(r => ['IMAGING_DONE', 'REPORT_PENDING'].includes(r.status));
  const [picked, setPicked] = useState('');
  const [f, setF] = useState({ technique: '', findings: '', impression: '', recommendations: '', critical: false, criticalFinding: '', aiAssisted: false });
  const req = reportable.find(r => r.id === picked);
  const aiAssist = () => {
    setF(s => ({ ...s, aiAssisted: true, findings: s.findings || `AI-assisted findings (requires radiologist review): no acute abnormality automatically detected in ${req?.modality ?? 'study'}. Correlate clinically.` }));
    toast.info('AI-assisted draft inserted — review and sign-off required.');
  };
  const submit = () => {
    if (!picked) { notify.error('rep', 'Select a study'); return; }
    run('rep', 'Submitting report…', () => rad.submitReport({ requestId: picked, ...f, reportedBy: staff }), r => r.message, r => r.message)
      .then(r => { if (r?.ok) { setPicked(''); setF({ technique: '', findings: '', impression: '', recommendations: '', critical: false, criticalFinding: '', aiAssisted: false }); } });
  };
  return (
    <Shell title="Reporting">
      <Section icon={<FileSignature className="h-5 w-5" />} title="Radiology Reporting" desc="Structured reporting with templates and AI-assist. Submitted reports flow to verification." />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Studies Awaiting Report</div>
          <div className="space-y-2 max-h-[440px] overflow-auto">
            {reportable.length === 0 ? <div className="text-sm text-muted-foreground text-center py-6">Nothing to report.</div> : reportable.map(r => (
              <button key={r.id} onClick={() => setPicked(r.id)} className={`w-full text-left p-2 border rounded-lg hover:border-primary/50 ${picked === r.id ? 'border-primary bg-primary/5' : ''}`}>
                <div className="font-medium text-sm">{r.patientName}</div>
                <div className="text-xs text-muted-foreground">{r.modality} · {r.region}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          {!req ? <div className="text-sm text-muted-foreground text-center py-16">Select a study to report.</div> : (
            <div className="space-y-3">
              <div className="flex justify-between items-center"><div className="font-semibold">{req.patientName} · {req.modality} ({req.region})</div>
                <Button size="sm" variant="outline" onClick={aiAssist}><Sparkles className="h-3.5 w-3.5 mr-1" />AI Assist</Button></div>
              <div><Label className="text-xs">Technique</Label><Input value={f.technique} onChange={e => setF({ ...f, technique: e.target.value })} /></div>
              <div><Label className="text-xs">Findings {f.aiAssisted && <span className="text-purple-600">· AI-assisted</span>}</Label><Textarea rows={4} value={f.findings} onChange={e => setF({ ...f, findings: e.target.value })} /></div>
              <div><Label className="text-xs">Impression *</Label><Textarea rows={2} value={f.impression} onChange={e => setF({ ...f, impression: e.target.value })} /></div>
              <div><Label className="text-xs">Recommendations</Label><Input value={f.recommendations} onChange={e => setF({ ...f, recommendations: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={f.critical ? 'destructive' : 'outline'} onClick={() => setF({ ...f, critical: !f.critical })}><AlertTriangle className="h-3.5 w-3.5 mr-1" />{f.critical ? 'Critical ✓' : 'Flag Critical'}</Button>
                {f.critical && <Input value={f.criticalFinding} onChange={e => setF({ ...f, criticalFinding: e.target.value })} placeholder="Critical finding (e.g. intracranial hemorrhage)" />}
              </div>
              <div className="flex justify-end"><LoadingButton loading={isBusy('rep')} loadingText="Submitting…" onClick={submit}><Send className="h-4 w-4 mr-1" />Submit for Verification</LoadingButton></div>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* 10. REPORT VERIFICATION                                               */
/* ===================================================================== */
export const RadiologyValidation = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const pending = db.radiologyReports.list().filter(r => r.status === 'SUBMITTED');
  const [ret, setRet] = useState<string | null>(null);
  const [note, setNote] = useState('');
  return (
    <Shell title="Report Verification">
      <Section icon={<ShieldCheck className="h-5 w-5" />} title="Report Verification" desc="Consultant review: verify & sign, or return for correction. Junior → Consultant → Verified → Released." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Impression</TableHead><TableHead>Reported By</TableHead><TableHead>Flag</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {pending.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No reports awaiting verification.</TableCell></TableRow> : pending.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell>{r.modality}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate">{r.impression}</TableCell>
                <TableCell className="text-xs">{r.reportedBy}</TableCell>
                <TableCell>{r.critical ? <Pill tone="red">CRITICAL</Pill> : <Pill tone="green">Routine</Pill>}</TableCell>
                <TableCell><div className="flex gap-1">
                  <LoadingButton size="sm" loading={isBusy(`v-${r.id}`)} onClick={() => run(`v-${r.id}`, 'Verifying…', () => rad.verifyReport(r.id, staff), x => x.message, x => x.message)}>Verify</LoadingButton>
                  <Button size="sm" variant="ghost" onClick={() => setRet(r.id)}>Return</Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!ret} onOpenChange={o => !o && setRet(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return for Correction</DialogTitle></DialogHeader>
          <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What needs correcting…" />
          <DialogFooter><Button variant="ghost" onClick={() => setRet(null)}>Cancel</Button>
            <LoadingButton loading={isBusy('ret')} loadingText="Returning…" onClick={() => ret && run('ret', 'Returning…', () => rad.returnReport(ret, staff, note), x => x.message, x => x.message).then(r => { if (r?.ok) { setRet(null); setNote(''); } })}>Return</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ===================================================================== */
/* 11. CRITICAL FINDINGS                                                 */
/* ===================================================================== */
export const CriticalFindings = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const reports = rad.criticalFindings();
  const ecgs = db.ecgStudies.list().filter(e => e.critical);
  const ack = (name: string) => toast.success(`Critical finding for ${name} acknowledged — clinician, ward & emergency notified.`);
  return (
    <Shell title="Critical Findings">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Findings" desc="Dangerous findings requiring immediate clinician notification (SMS / in-app / popup)." />
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <SummaryCard title="Critical Imaging" value={String(reports.length)} icon={AlertTriangle} />
        <SummaryCard title="Critical ECG" value={String(ecgs.length)} icon={HeartPulse} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Finding</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {reports.length === 0 && ecgs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No critical findings.</TableCell></TableRow> : <>
              {reports.map(r => <TableRow key={r.id}><TableCell className="font-medium">{r.patientName}</TableCell><TableCell>{r.modality}</TableCell><TableCell className="text-sm text-rose-600">{r.criticalFinding ?? r.impression}</TableCell><TableCell><Pill tone={STATUS_TONE[(db.imagingRequests.get(r.requestId)?.status ?? 'REPORTED')]}>{label(db.imagingRequests.get(r.requestId)?.status ?? 'REPORTED')}</Pill></TableCell><TableCell><Button size="sm" onClick={() => ack(r.patientName)}><Bell className="h-3 w-3 mr-1" />Notify</Button></TableCell></TableRow>)}
              {ecgs.map(e => <TableRow key={e.id}><TableCell className="font-medium">{e.patientName}</TableCell><TableCell>ECG ({e.type})</TableCell><TableCell className="text-sm text-rose-600">{e.machineInterpretation ?? 'Critical ECG'} · QTc {e.measurements.qtc ?? '—'}</TableCell><TableCell><Pill tone={e.status === 'VERIFIED' ? 'green' : 'amber'}>{e.status}</Pill></TableCell><TableCell><Button size="sm" onClick={() => ack(e.patientName)}><Bell className="h-3 w-3 mr-1" />Notify</Button></TableCell></TableRow>)}
            </>}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* 12. RESULT RELEASE                                                    */
/* ===================================================================== */
export const ResultRelease = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const verified = db.radiologyReports.list().filter(r => r.status === 'VERIFIED');
  return (
    <Shell title="Result Release">
      <Section icon={<Send className="h-5 w-5" />} title="Result Release" desc="Release verified reports to doctor/ward/patient portal with encrypted PDF & QR verification." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Verified By</TableHead><TableHead>Impression</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {verified.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No verified reports awaiting release.</TableCell></TableRow> : verified.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell>{r.modality}</TableCell>
                <TableCell className="text-xs">{r.verifiedBy}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate">{r.impression}</TableCell>
                <TableCell><LoadingButton size="sm" loading={isBusy(`rel-${r.id}`)} loadingText="Releasing…" onClick={() => run(`rel-${r.id}`, 'Releasing…', () => rad.releaseResult(r.id, staff), x => x.message, x => x.message)}><Send className="h-3 w-3 mr-1" />Release</LoadingButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* 13. ECG MANAGEMENT                                                    */
/* ===================================================================== */
export const EcgReporting = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const ecgs = db.ecgStudies.list();
  const patients = db.patients.list();
  const [f, setF] = useState({ patientId: '', type: '12-Lead' as EcgType, heartRate: '', rhythm: '', pr: '', qrs: '', qt: '', qtc: '', axis: '', st: 'none', history: '', machine: '' });
  const [interpret, setInterpret] = useState<string | null>(null);
  const [ci, setCi] = useState({ interp: '', impression: '' });
  const cards = [
    { t: 'ECGs Today', v: ecgs.filter(e => (e.createdAt ?? '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length },
    { t: 'Pending Interpretation', v: ecgs.filter(e => e.status === 'SUBMITTED').length },
    { t: 'Completed', v: ecgs.filter(e => e.status === 'VERIFIED' || e.status === 'RELEASED').length },
    { t: 'Abnormal', v: ecgs.filter(e => e.abnormal).length },
    { t: 'Critical', v: ecgs.filter(e => e.critical).length },
  ];
  const record = () => {
    if (!f.patientId) { notify.error('ecg', 'Select a patient'); return; }
    run('ecg', 'Recording ECG…', () => {
      rad.recordEcg({
        patientId: f.patientId, type: f.type, clinicalHistory: f.history, reportedBy: staff, machineInterpretation: f.machine,
        measurements: { heartRate: Number(f.heartRate) || undefined, rhythm: f.rhythm || undefined, prInterval: Number(f.pr) || undefined, qrsDuration: Number(f.qrs) || undefined, qtInterval: Number(f.qt) || undefined, qtc: Number(f.qtc) || undefined, axis: f.axis || undefined, stElevation: f.st === 'elevation', stDepression: f.st === 'depression' },
      });
      return { ok: true as const, message: 'ECG recorded and queued for interpretation.' };
    }, r => r.message).then(r => { if (r?.ok) setF({ patientId: '', type: '12-Lead', heartRate: '', rhythm: '', pr: '', qrs: '', qt: '', qtc: '', axis: '', st: 'none', history: '', machine: '' }); });
  };
  return (
    <Shell title="ECG Management">
      <Section icon={<HeartPulse className="h-5 w-5" />} title="ECG Management" desc="Record, auto-flag and interpret ECGs. Critical rhythms (VT/VF, STEMI, long QTc) escalate immediately." />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={String(c.v)} icon={HeartPulse} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Record ECG</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label className="text-xs">Patient</Label>
              <Select value={f.patientId} onValueChange={v => setF({ ...f, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={f.type} onValueChange={v => setF({ ...f, type: v as EcgType })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Resting', 'Stress', 'Holter', 'Telemetry', '12-Lead', '15-Lead', 'Right-sided'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Heart Rate</Label><Input value={f.heartRate} onChange={e => setF({ ...f, heartRate: e.target.value })} /></div>
            <div><Label className="text-xs">Rhythm</Label><Input value={f.rhythm} onChange={e => setF({ ...f, rhythm: e.target.value })} placeholder="Sinus, AF, VT…" /></div>
            <div><Label className="text-xs">PR (ms)</Label><Input value={f.pr} onChange={e => setF({ ...f, pr: e.target.value })} /></div>
            <div><Label className="text-xs">QRS (ms)</Label><Input value={f.qrs} onChange={e => setF({ ...f, qrs: e.target.value })} /></div>
            <div><Label className="text-xs">QT (ms)</Label><Input value={f.qt} onChange={e => setF({ ...f, qt: e.target.value })} /></div>
            <div><Label className="text-xs">QTc (ms)</Label><Input value={f.qtc} onChange={e => setF({ ...f, qtc: e.target.value })} /></div>
            <div><Label className="text-xs">Axis</Label><Input value={f.axis} onChange={e => setF({ ...f, axis: e.target.value })} /></div>
            <div><Label className="text-xs">ST Segment</Label>
              <Select value={f.st} onValueChange={v => setF({ ...f, st: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Normal</SelectItem><SelectItem value="elevation">ST Elevation</SelectItem><SelectItem value="depression">ST Depression</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label className="text-xs">Machine Interpretation</Label><Input value={f.machine} onChange={e => setF({ ...f, machine: e.target.value })} /></div>
          </div>
          <LoadingButton className="w-full mt-3" loading={isBusy('ecg')} loadingText="Recording…" onClick={record}><HeartPulse className="h-4 w-4 mr-1" />Record ECG</LoadingButton>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Recent ECGs</div>
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>HR</TableHead><TableHead>Flag</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {ecgs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No ECGs.</TableCell></TableRow> : ecgs.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.patientName}</TableCell>
                  <TableCell>{e.type}</TableCell>
                  <TableCell>{e.measurements.heartRate ?? '—'}</TableCell>
                  <TableCell>{e.critical ? <Pill tone="red">CRITICAL</Pill> : e.abnormal ? <Pill tone="amber">Abnormal</Pill> : <Pill tone="green">Normal</Pill>}</TableCell>
                  <TableCell><Pill tone={e.status === 'VERIFIED' ? 'green' : 'sky'}>{e.status}</Pill></TableCell>
                  <TableCell>{e.status === 'SUBMITTED' && <Button size="sm" variant="outline" onClick={() => setInterpret(e.id)}>Interpret</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={!!interpret} onOpenChange={o => !o && setInterpret(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cardiologist Interpretation</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs">Interpretation</Label><Textarea rows={3} value={ci.interp} onChange={e => setCi({ ...ci, interp: e.target.value })} /></div>
            <div><Label className="text-xs">Impression</Label><Input value={ci.impression} onChange={e => setCi({ ...ci, impression: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setInterpret(null)}>Cancel</Button>
            <LoadingButton loading={isBusy('ci')} loadingText="Saving…" onClick={() => interpret && run('ci', 'Saving…', () => rad.interpretEcg(interpret, ci.interp, ci.impression, staff), x => x.message, x => x.message).then(r => { if (r?.ok) { setInterpret(null); setCi({ interp: '', impression: '' }); } })}>Verify & Sign</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ===================================================================== */
/* 14. BILLING                                                           */
/* ===================================================================== */
export const RadiologyBilling = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const billable = rad.listRequests().filter(r => r.paymentStatus !== 'PAID' && r.status !== 'REJECTED' && r.status !== 'CANCELLED');
  const [pay, setPay] = useState<string | null>(null);
  const [method, setMethod] = useState<'Cash' | 'POS' | 'Transfer' | 'Wallet' | 'NHIA' | 'HMO'>('Cash');
  const [ref, setRef] = useState('');
  const target = pay ? billable.find(r => r.id === pay) : null;
  return (
    <Shell title="Billing">
      <Section icon={<CreditCard className="h-5 w-5" />} title="Radiology Billing" desc="Auto-generated charges per modality/contrast. Send to cashier or capture payment; NHIA/HMO supported." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Amount</TableHead><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {billable.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No outstanding radiology charges.</TableCell></TableRow> : billable.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell>{r.modality} · {r.region}</TableCell>
                <TableCell>{formatCurrency(r.amount)}</TableCell>
                <TableCell className="font-mono text-xs">{r.invoiceId ?? '—'}</TableCell>
                <TableCell><Pill tone={r.paymentStatus === 'PAID' ? 'green' : 'orange'}>{r.paymentStatus}</Pill></TableCell>
                <TableCell><div className="flex gap-1">
                  {!r.invoiceId && <LoadingButton size="sm" variant="outline" loading={isBusy(`inv-${r.id}`)} onClick={() => run(`inv-${r.id}`, 'Generating invoice…', () => { const id = rad.generateRadInvoice(r.id, staff); return { ok: !!id, message: id ? `Invoice ${id} sent to cashier.` : 'Failed' }; }, x => x.message, x => x.message)}>Send to Cashier</LoadingButton>}
                  <Button size="sm" onClick={() => { setPay(r.id); setMethod('Cash'); }}>Take Payment</Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!pay} onOpenChange={o => !o && setPay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Capture Payment</DialogTitle><DialogDescription>{target && `${target.patientName} · ${target.modality} · ${formatCurrency(target.amount)}`}</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Cash', 'POS', 'Transfer', 'Wallet', 'NHIA', 'HMO'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            {method !== 'Cash' && <div><Label className="text-xs">Reference / Auth</Label><Input value={ref} onChange={e => setRef(e.target.value)} /></div>}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button>
            <LoadingButton loading={isBusy('pay')} loadingText="Capturing…" onClick={() => target && run('pay', 'Capturing…', () => rad.markRadPaid(target.id, { amount: target.amount, method, ref, cashier: staff }), x => x.message, x => x.message).then(r => { if (r?.ok) { setPay(null); setRef(''); } })}>Capture</LoadingButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ===================================================================== */
/* 21. EQUIPMENT                                                         */
/* ===================================================================== */
export const RadiologyEquipment = () => {
  useDbTick();
  const rad = useRadiology();
  const { run, isBusy } = useAsyncAction();
  const eq = db.radEquipment.list();
  return (
    <Shell title="Equipment">
      <Section icon={<Wrench className="h-5 w-5" />} title="Equipment Management" desc="Machine registry, status, calibration/maintenance and usage hours." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Modality</TableHead><TableHead>Room</TableHead><TableHead>Usage (h)</TableHead><TableHead>Next Service</TableHead><TableHead>Status</TableHead><TableHead>Set</TableHead></TableRow></TableHeader>
          <TableBody>
            {eq.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}{e.faultNote && <div className="text-xs text-rose-600">{e.faultNote}</div>}</TableCell>
                <TableCell>{e.modality}</TableCell>
                <TableCell>{e.room}</TableCell>
                <TableCell>{e.usageHours}</TableCell>
                <TableCell className="text-xs">{e.nextService ?? '—'}</TableCell>
                <TableCell><Pill tone={e.status === 'ONLINE' ? 'green' : e.status === 'OFFLINE' ? 'red' : 'amber'}>{e.status}</Pill></TableCell>
                <TableCell>
                  <Select value={e.status} onValueChange={v => run(`eq-${e.id}`, 'Updating…', () => rad.setEquipmentStatus(e.id, v as any), x => x.message, x => x.message)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{['ONLINE', 'OFFLINE', 'MAINTENANCE', 'CALIBRATION'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* 22. CONSUMABLES                                                       */
/* ===================================================================== */
export const RadiologyConsumables = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const items = db.radConsumables.list();
  const low = rad.lowStockConsumables();
  return (
    <Shell title="Consumables">
      <Section icon={<Boxes className="h-5 w-5" />} title="Consumables Inventory" desc="Contrast, films, ECG electrodes, gel and paper — with low-stock and expiry alerts." />
      {low.length > 0 && <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{low.length} item(s) at or below reorder level: {low.map(l => l.name).join(', ')}</div>}
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Reorder</TableHead><TableHead>Expiry</TableHead><TableHead>Adjust</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell className={c.stock <= c.reorderLevel ? 'text-rose-600 font-semibold' : ''}>{c.stock} {c.unit}</TableCell>
                <TableCell>{c.reorderLevel}</TableCell>
                <TableCell className="text-xs">{c.expiry ?? '—'}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => rad.adjustConsumable(c.id, -1, staff)}>−</Button>
                  <Button size="sm" variant="outline" onClick={() => rad.adjustConsumable(c.id, +10, staff)}>+10</Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* 28. FORMS                                                             */
/* ===================================================================== */
export const RadiologyForms = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const patients = db.patients.list();
  const saved = db.radForms.list();
  const [type, setType] = useState(RADIOLOGY_FORMS[0]);
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const save = () => {
    if (!patientId) { notify.error('form', 'Select a patient'); return; }
    run('form', 'Saving form…', () => { rad.saveRadForm({ type, patientId, values: { notes }, signedBy: staff }); return { ok: true as const, message: `${type} saved and signed.` }; }, r => r.message)
      .then(r => { if (r?.ok) setNotes(''); });
  };
  return (
    <Shell title="Forms">
      <Section icon={<FileText className="h-5 w-5" />} title="Radiology & ECG Forms" desc="Standardized electronic forms with e-signature, timestamp and audit trail." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="space-y-3">
            <div><Label className="text-xs">Form</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">{RADIOLOGY_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Details / Answers</Label><Textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <LoadingButton className="w-full" loading={isBusy('form')} loadingText="Saving…" onClick={save}><FileSignature className="h-4 w-4 mr-1" />Save & Sign ({staff})</LoadingButton>
          </div>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Completed Forms</div>
          <Table>
            <TableHeader><TableRow><TableHead>Form</TableHead><TableHead>Patient</TableHead><TableHead>Signed By</TableHead></TableRow></TableHeader>
            <TableBody>{saved.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No forms yet.</TableCell></TableRow> : saved.slice().reverse().map(s => (
              <TableRow key={s.id}><TableCell className="text-sm">{s.type}</TableCell><TableCell>{s.patientName}</TableCell><TableCell className="text-xs">{s.signedBy}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* HISTORY / RESULTS / ARCHIVE                                           */
/* ===================================================================== */
const ResultsTable = ({ title, icon, desc }: { title: string; icon: React.ReactNode; desc: string }) => {
  useDbTick();
  const [q, setQ] = useState('');
  const reports = db.radiologyReports.list().filter(r => !q || r.patientName.toLowerCase().includes(q.toLowerCase()) || r.modality.toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell title={title}>
      <Section icon={icon} title={title} desc={desc} />
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient, modality…" className="pl-9" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Impression</TableHead><TableHead>Reported By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {reports.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No reports found.</TableCell></TableRow> : reports.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell>{r.modality}</TableCell>
                <TableCell className="text-xs max-w-[260px] truncate">{r.impression}</TableCell>
                <TableCell className="text-xs">{r.reportedBy}</TableCell>
                <TableCell><Pill tone={r.status === 'RELEASED' || r.status === 'VERIFIED' ? 'green' : 'amber'}>{r.status}</Pill></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};
export const RadiologyHistory = () => <ResultsTable title="Imaging History" icon={<History className="h-5 w-5" />} desc="Historical imaging reports across all patients." />;
export const AllImagingResults = () => <ResultsTable title="All Results" icon={<Eye className="h-5 w-5" />} desc="Every radiology report in the system." />;
export const ImageArchive = () => {
  useDbTick();
  const [q, setQ] = useState('');
  const studies = db.imagingRequests.list().filter(r => r.studyUid && (!q || r.patientName.toLowerCase().includes(q.toLowerCase()) || (r.studyUid ?? '').includes(q)));
  return (
    <Shell title="Image Archive">
      <Section icon={<Archive className="h-5 w-5" />} title="Image Archive (PACS)" desc="Long-term study storage searchable by patient, study UID, modality and date." />
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient or study UID…" className="pl-9" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Modality</TableHead><TableHead>Study UID</TableHead><TableHead>Dose</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {studies.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No archived studies.</TableCell></TableRow> : studies.map(r => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.patientName}</TableCell><TableCell>{r.modality}</TableCell><TableCell className="font-mono text-xs">{r.studyUid}</TableCell><TableCell>{r.radiationDose ? `${r.radiationDose} mGy` : '—'}</TableCell><TableCell className="text-xs">{(r.updatedAt ?? '').slice(0, 10)}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* ===================================================================== */
/* ANALYTICS                                                             */
/* ===================================================================== */
export const RadiologyAnalytics = () => {
  useDbTick();
  const rad = useRadiology();
  const m = rad.dashboardMetrics();
  const util = rad.modalityUtilisation();
  const eq = db.radEquipment.list();
  return (
    <Shell title="Analytics">
      <Section icon={<BarChart3 className="h-5 w-5" />} title="Radiology Analytics" desc="Modality utilization, machine status, revenue and turnaround." />
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Requests Today" value={String(m.totalToday)} icon={FilePlus} />
        <SummaryCard title="Revenue Today" value={formatCurrency(m.revenueToday)} icon={CreditCard} />
        <SummaryCard title="Critical Findings" value={String(m.critical)} icon={AlertTriangle} />
        <SummaryCard title="Equipment Offline" value={String(m.equipmentOffline)} icon={Wrench} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-semibold text-sm mb-3">Modality Utilization</div>
          <Table><TableHeader><TableRow><TableHead>Modality</TableHead><TableHead className="text-right">Studies</TableHead></TableRow></TableHeader>
            <TableBody>{util.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow> : util.map(u => <TableRow key={u.modality}><TableCell>{u.modality}</TableCell><TableCell className="text-right">{u.count}</TableCell></TableRow>)}</TableBody></Table>
        </Card>
        <Card>
          <div className="font-semibold text-sm mb-3">Machine Utilization (usage hours)</div>
          <Table><TableHeader><TableRow><TableHead>Machine</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Hours</TableHead></TableRow></TableHeader>
            <TableBody>{eq.map(e => <TableRow key={e.id}><TableCell>{e.name}</TableCell><TableCell><Pill tone={e.status === 'ONLINE' ? 'green' : 'amber'}>{e.status}</Pill></TableCell><TableCell className="text-right">{e.usageHours}</TableCell></TableRow>)}</TableBody></Table>
        </Card>
      </div>
    </Shell>
  );
};

/* ===================================================================== */
/* LIGHTER PAGES (still db-aware where relevant)                         */
/* ===================================================================== */
const InfoShell = ({ title, icon, desc, children }: { title: string; icon: React.ReactNode; desc: string; children?: React.ReactNode }) => (
  <Shell title={title}><Section icon={icon} title={title} desc={desc} />{children}</Shell>
);

export const PacsViewer = () => (
  <InfoShell title="PACS Viewer" icon={<ImageIcon className="h-5 w-5" />} desc="Diagnostic viewer — zoom, pan, window level, measurements, MPR/MIP/3D, prior-study compare.">
    <Card><div className="aspect-video rounded-lg bg-neutral-900 text-neutral-400 flex items-center justify-center">DICOM viewport · select a study from the Archive</div>
      <div className="flex flex-wrap gap-2 mt-3">{['Zoom', 'Pan', 'Rotate', 'Window', 'Measure', 'Compare', 'MPR', '3D', 'Export'].map(t => <Button key={t} size="sm" variant="outline">{t}</Button>)}</div></Card>
  </InfoShell>
);

export const ImageUploadCenter = () => {
  useDbTick();
  const done = db.imagingRequests.list().filter(r => r.status === 'IMAGING_DONE' || r.studyUid);
  return (
    <InfoShell title="Image Acquisition" icon={<Upload className="h-5 w-5" />} desc="DICOM/HL7/FHIR acquisition. Study/Series/Instance UIDs generated on completion.">
      <Card>
        <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Modality</TableHead><TableHead>Study UID</TableHead><TableHead>Contrast</TableHead></TableRow></TableHeader>
          <TableBody>{done.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No acquired studies yet.</TableCell></TableRow> : done.map(r => <TableRow key={r.id}><TableCell className="font-medium">{r.patientName}</TableCell><TableCell>{r.modality}</TableCell><TableCell className="font-mono text-xs">{r.studyUid ?? '—'}</TableCell><TableCell>{r.contrastUsed ? 'Yes' : 'No'}</TableCell></TableRow>)}</TableBody></Table>
      </Card>
    </InfoShell>
  );
};

export const EegReporting = () => {
  useDbTick();
  const rad = useRadiology();
  const staff = useStaff();
  const { run, isBusy } = useAsyncAction();
  const eegReqs = rad.listRequests().filter(r => r.modality === 'EEG' && ['IMAGING_DONE', 'REPORT_PENDING'].includes(r.status));
  const [picked, setPicked] = useState('');
  const [f, setF] = useState({ findings: '', impression: '' });
  return (
    <InfoShell title="EEG Reporting" icon={<Brain className="h-5 w-5" />} desc="Neurophysiology reporting for EEG studies — important in a neuropsychiatric setting.">
      <div className="grid lg:grid-cols-2 gap-5">
        <Card><div className="font-semibold text-sm mb-3">EEG Studies</div>
          {eegReqs.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No EEG studies awaiting report.</div> : eegReqs.map(r => (
            <button key={r.id} onClick={() => setPicked(r.id)} className={`w-full text-left p-2 border rounded-lg mb-2 ${picked === r.id ? 'border-primary bg-primary/5' : ''}`}><div className="font-medium text-sm">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.region}</div></button>
          ))}</Card>
        <Card>{!picked ? <div className="text-sm text-muted-foreground text-center py-12">Select an EEG study.</div> : (
          <div className="space-y-2">
            <div><Label className="text-xs">Findings</Label><Textarea rows={4} value={f.findings} onChange={e => setF({ ...f, findings: e.target.value })} /></div>
            <div><Label className="text-xs">Impression</Label><Input value={f.impression} onChange={e => setF({ ...f, impression: e.target.value })} /></div>
            <LoadingButton loading={isBusy('eeg')} loadingText="Submitting…" onClick={() => run('eeg', 'Submitting…', () => rad.submitReport({ requestId: picked, findings: f.findings, impression: f.impression, reportedBy: staff }), x => x.message, x => x.message).then(r => { if (r?.ok) { setPicked(''); setF({ findings: '', impression: '' }); } })}>Submit Report</LoadingButton>
          </div>
        )}</Card>
      </div>
    </InfoShell>
  );
};

export const RadiologyPrintCenter = () => {
  useDbTick();
  const released = db.radiologyReports.list().filter(r => r.status === 'RELEASED' || r.status === 'VERIFIED');
  return (
    <InfoShell title="Film / CD Printing" icon={<Printer className="h-5 w-5" />} desc="Print film, export CD/DVD/USB with viewer, watermark, logo and QR verification.">
      <Card><Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Study</TableHead><TableHead>Status</TableHead><TableHead>Export</TableHead></TableRow></TableHeader>
        <TableBody>{released.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No studies ready to print.</TableCell></TableRow> : released.map(r => (
          <TableRow key={r.id}><TableCell className="font-medium">{r.patientName}</TableCell><TableCell>{r.modality}</TableCell><TableCell><Pill tone="green">{r.status}</Pill></TableCell>
            <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => toast.success('Film sent to printer.')}>Film</Button><Button size="sm" variant="outline" onClick={() => toast.success('CD/DVD export started.')}>CD</Button><Button size="sm" variant="outline" onClick={() => toast.success('Encrypted PDF exported.')}>PDF</Button></div></TableCell></TableRow>
        ))}</TableBody></Table></Card>
    </InfoShell>
  );
};

export const RadiologyReports = () => {
  useDbTick();
  const rad = useRadiology();
  const m = rad.dashboardMetrics();
  const reports = [
    ['Total imaging requests', String(db.imagingRequests.list().length)],
    ['Reports awaiting review', String(m.reportsAwaiting)],
    ['Critical findings (open)', String(m.critical)],
    ['Revenue today', formatCurrency(m.revenueToday)],
    ['ECGs completed', String(m.ecgCompleted)],
    ['Equipment offline', String(m.equipmentOffline)],
  ];
  return (
    <InfoShell title="Reports" icon={<ScrollText className="h-5 w-5" />} desc="Operational, financial and clinical performance reports (export to PDF/Excel/CSV).">
      <Card><div className="flex justify-end mb-3"><Button variant="outline" onClick={() => toast.success('Report exported.')}><Printer className="h-4 w-4 mr-1" />Export</Button></div>
        <Table><TableBody>{reports.map(([k, v]) => <TableRow key={k}><TableCell>{k}</TableCell><TableCell className="text-right font-semibold">{v}</TableCell></TableRow>)}</TableBody></Table></Card>
    </InfoShell>
  );
};

export const RadiologyComms = () => {
  useDbTick();
  const rad = useRadiology();
  const critical = rad.criticalFindings();
  const low = rad.lowStockConsumables();
  const items: { icon: React.ReactNode; text: string; tone: string }[] = [
    ...critical.map(c => ({ icon: <AlertTriangle className="h-4 w-4" />, text: `Critical finding — ${c.patientName} (${c.modality})`, tone: 'red' })),
    ...low.map(l => ({ icon: <Boxes className="h-4 w-4" />, text: `Low stock — ${l.name} (${l.stock} left)`, tone: 'amber' })),
    ...db.imagingRequests.list().filter(r => r.status === 'AWAITING_PAYMENT').map(r => ({ icon: <CreditCard className="h-4 w-4" />, text: `Payment pending — ${r.patientName} (${r.modality})`, tone: 'orange' })),
  ];
  return (
    <InfoShell title="Notifications" icon={<MessageSquare className="h-5 w-5" />} desc="In-app, SMS, email and push alerts for requests, results, critical findings and inventory.">
      <Card>{items.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No notifications.</div> : (
        <div className="space-y-2">{items.map((it, i) => <div key={i} className={`flex items-center gap-2 p-3 rounded-lg border ${toneCls(it.tone)}`}>{it.icon}<span className="text-sm">{it.text}</span></div>)}</div>
      )}</Card>
    </InfoShell>
  );
};

export const RadiologyAlerts = () => {
  useDbTick();
  const rad = useRadiology();
  const critical = rad.criticalFindings();
  return (
    <InfoShell title="Critical Alerts" icon={<Bell className="h-5 w-5" />} desc="Time-sensitive alerts requiring acknowledgement.">
      <Card>{critical.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No active critical alerts.</div> : (
        <div className="space-y-2">{critical.map(c => <div key={c.id} className="flex justify-between items-center p-3 rounded-lg border border-rose-200 bg-rose-50">
          <span className="text-sm text-rose-700"><AlertTriangle className="h-4 w-4 inline mr-1" />{c.patientName} · {c.criticalFinding ?? c.impression}</span>
          <Button size="sm" onClick={() => toast.success('Acknowledged & escalated.')}>Acknowledge</Button></div>)}</div>
      )}</Card>
    </InfoShell>
  );
};

export const AiAssistant = () => (
  <InfoShell title="AI Diagnostic Assistant" icon={<Sparkles className="h-5 w-5" />} desc="Assistive only (Phase 8) — never auto-finalizes reports. All suggestions require radiologist sign-off; mark submissions with aiAssisted when using local report entry.">
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {['Fracture detection', 'Intracranial hemorrhage', 'Lung nodule detection', 'Pneumonia / TB screening', 'Stroke detection', 'Breast lesion detection', 'Bone age assessment', 'ECG rhythm analysis', 'Prior-study comparison', 'Image quality QA'].map(c => (
        <Card key={c}><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{c}</span></div>
          <p className="text-xs text-muted-foreground mt-1">AI-assisted · radiologist sign-off required · no auto-release.</p></Card>
      ))}
    </div>
  </InfoShell>
);

export const RadiologyMobile = () => (
  <InfoShell title="Mobile Mode" icon={<Smartphone className="h-5 w-5" />} desc="Tablet/phone-optimised worklist and result review for on-call radiologists.">
    <Card><div className="text-sm text-muted-foreground">Responsive worklist, PACS thumbnails and verification available on mobile devices.</div></Card>
  </InfoShell>
);

export const RadiologyAuditTrail = () => {
  useDbTick();
  const [q, setQ] = useState('');
  const RAD_ENTITIES = ['imaging', 'report', 'ecg', 'equipment', 'consumable', 'radform'];
  const rows = db.audit.list().filter(a => a.role === 'Radiology' || RAD_ENTITIES.includes(a.entity ?? ''));
  const filtered = rows.filter(a => !q || a.action.toLowerCase().includes(q.toLowerCase()) || a.actor.toLowerCase().includes(q.toLowerCase()));
  return (
    <InfoShell title="Audit Trail" icon={<ScrollText className="h-5 w-5" />} desc="Every imaging, ECG, reporting, equipment and consumable action is traceable — actor, timestamp, no hard deletes.">
      <Card className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
        <div className="text-xs">Audit page is currently local-store based in this module; server-backed audit stream is planned in the next backend pass.</div>
      </Card>
      <Card>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by action or actor…" className="pl-9" /></div>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Entity</TableHead><TableHead>Action</TableHead><TableHead>Ref</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No audit entries.</TableCell></TableRow> : filtered.slice(0, 150).map(a => (
              <TableRow key={a.id}>
                <TableCell className="text-xs whitespace-nowrap">{a.at}</TableCell>
                <TableCell className="font-medium">{a.actor}</TableCell>
                <TableCell><Pill tone="sky">{a.entity ?? '—'}</Pill></TableCell>
                <TableCell className="text-sm">{a.action}</TableCell>
                <TableCell className="font-mono text-xs">{a.invoiceRef ?? a.entityId ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </InfoShell>
  );
};

export const RadiologyConfig = () => {
  const [modalities, setModalities] = useState<Record<string, boolean>>(Object.fromEntries(MODALITIES.map(m => [m, true])));
  return (
    <InfoShell title="Settings" icon={<Settings2 className="h-5 w-5" />} desc="Enable modalities and configure module preferences.">
      <Card className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
        <div className="text-xs">Configuration toggles here are local UI controls until the API-backed settings endpoint is connected.</div>
      </Card>
      <Card><div className="space-y-2 max-w-lg">{MODALITIES.map(m => (
        <div key={m} className="flex items-center justify-between p-3 border rounded-lg"><span className="text-sm font-medium">{m} <span className="text-xs text-muted-foreground">· {formatCurrency(MODALITY_PRICE[m])}</span></span>
          <Button size="sm" variant={modalities[m] ? 'default' : 'outline'} onClick={() => { setModalities(s => ({ ...s, [m]: !s[m] })); toast.success(`${m} ${modalities[m] ? 'disabled' : 'enabled'}.`); }}>{modalities[m] ? 'Enabled' : 'Disabled'}</Button></div>
      ))}</div></Card>
    </InfoShell>
  );
};
