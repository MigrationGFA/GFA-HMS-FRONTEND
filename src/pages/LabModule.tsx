import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/dummyData';
import {
  labRequestsFull, labCatalog, labDevices, labStaff,
  type LabRequestFull, type LabStatus, type LabResultLine,
} from '@/data/labData';
import {
  FlaskConical, ClipboardList, ClipboardCheck, ShieldCheck, AlertTriangle,
  Search, LayoutDashboard, History, CreditCard, Microscope, FileSignature,
  Send, RefreshCw, QrCode, Activity, FilePlus, CheckCircle2, XCircle, Clock,
  TrendingUp, Beaker, Stethoscope, ArrowRight, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// SIDEBAR — Lab role
// ============================================================
const labNav = [
  { label: 'Lab Overview',      path: '/lab',                icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Incoming Requests', path: '/lab/requests',       icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Sample Collection', path: '/lab/samples',        icon: <QrCode className="h-4 w-4" /> },
  { label: 'Processing',        path: '/lab/processing',     icon: <Microscope className="h-4 w-4" /> },
  { label: 'Result Entry',      path: '/lab/results',        icon: <FilePlus className="h-4 w-4" /> },
  { label: 'Verification',      path: '/lab/verification',   icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Released Results',  path: '/lab/released',       icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'EMR Sync Queue',    path: '/lab/sync',           icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Test Catalog',      path: '/lab/catalog',        icon: <Beaker className="h-4 w-4" /> },
  { label: 'Audit Trail',       path: '/lab/audit',          icon: <History className="h-4 w-4" /> },
];

// Doctor mini-nav for ordering (re-uses lab nav for lab role; doctor uses their own)
const LabPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout title={title} navItems={labNav as any}>{children}</DashboardLayout>
);

// ============================================================
// Helpers
// ============================================================
const statusTone = (s: LabStatus): string => {
  switch (s) {
    case 'AWAITING PAYMENT': return 'Unpaid';
    case 'PAID':             return 'Paid';
    case 'EMERGENCY':        return 'Critical';
    case 'SAMPLE COLLECTED': return 'Sample Collected';
    case 'PROCESSING':       return 'In Progress';
    case 'COMPLETED':        return 'Result Ready';
    case 'VERIFIED':         return 'Verified';
    case 'RELEASED':         return 'Released';
    case 'PENDING SYNC':     return 'Retrying';
    case 'SYNCED':           return 'Synced';
    case 'CANCELLED':        return 'Cancelled';
    default:                 return 'Pending';
  }
};

const priorityTone = (p: string) => p === 'Stat' ? 'Critical' : p === 'Urgent' ? 'Warning' : 'Info';

const stageOrder: LabStatus[] = [
  'REQUESTED','AWAITING PAYMENT','PAID','SAMPLE COLLECTED','PROCESSING','COMPLETED','VERIFIED','RELEASED','SYNCED'
];

const stagePosition = (s: LabStatus) => {
  if (s === 'EMERGENCY') return 2;
  if (s === 'PENDING SYNC') return 8;
  return Math.max(0, stageOrder.indexOf(s));
};

// Workflow ribbon shown on each request detail
const WorkflowRibbon = ({ status }: { status: LabStatus }) => {
  const steps = ['Request', 'Billing', 'Sample', 'Processing', 'Result', 'Verify', 'Release', 'EMR Sync'];
  const pos = stagePosition(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((s, i) => {
        const done = i < pos;
        const active = i === pos;
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all
              ${done ? 'bg-[hsl(145_63%_94%)] text-[hsl(145_63%_28%)] ring-1 ring-[hsl(145_55%_70%)]/40' : ''}
              ${active ? 'bg-gradient-to-r from-primary to-[hsl(180_100%_38%)] text-primary-foreground shadow-md shadow-primary/30' : ''}
              ${!done && !active ? 'bg-muted text-muted-foreground' : ''}`}>
              {done && <CheckCircle2 className="h-3 w-3" />}
              {active && <Activity className="h-3 w-3 animate-pulse" />}
              {s}
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// 1. LAB OVERVIEW DASHBOARD
// ============================================================
export const LabDashboard = () => {
  const all = labRequestsFull;
  const today = all.length;
  const pending = all.filter(r => ['REQUESTED','AWAITING PAYMENT','PAID','EMERGENCY'].includes(r.status)).length;
  const processing = all.filter(r => ['SAMPLE COLLECTED','PROCESSING'].includes(r.status)).length;
  const awaitingVerify = all.filter(r => r.status === 'COMPLETED').length;
  const released = all.filter(r => ['RELEASED','SYNCED'].includes(r.status)).length;
  const emergency = all.filter(r => r.status === 'EMERGENCY').length;
  const pendingSync = all.filter(r => r.emrSync === 'PENDING' && r.status !== 'AWAITING PAYMENT').length;

  return (
    <LabPage title="Laboratory Operations">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"   title="Today's Requests" value={String(today)} icon={ClipboardList} subtitle="All categories" />
        <SummaryCard tone="amber"  title="Awaiting Action"  value={String(pending)} icon={Clock} subtitle="Billing / collection" />
        <SummaryCard tone="indigo" title="Processing"        value={String(processing)} icon={Microscope} subtitle="In lab" />
        <SummaryCard tone="purple" title="Awaiting Verify"   value={String(awaitingVerify)} icon={FileSignature} subtitle="Senior signoff" />
        <SummaryCard tone="green"  title="Released"          value={String(released)} icon={CheckCircle2} subtitle="To doctor" />
        <SummaryCard tone="rose"   title="Pending EMR Sync"  value={String(pendingSync)} icon={RefreshCw} subtitle="Background" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Workload by category */}
        <div className="hms-section p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Workload by Category</h3>
              <p className="text-xs text-muted-foreground">Live distribution across lab departments</p>
            </div>
            <span className="text-xs text-muted-foreground">{today} active</span>
          </div>
          <div className="space-y-3">
            {(['Haematology','Chemistry','Microbiology','Serology','Radiology','Histology'] as const).map(cat => {
              const n = all.filter(r => r.category === cat).length;
              const pct = today ? (n / today) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{cat}</span>
                    <span className="text-muted-foreground">{n} request{n!==1?'s':''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(180_100%_45%)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts panel */}
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(30_85%_42%)]" /> Live Alerts</h3>
          <div className="space-y-2 text-sm">
            {emergency > 0 && (
              <div className="rounded-lg p-3 bg-[hsl(0_84%_96%)] border border-[hsl(0_84%_85%)] text-[hsl(0_70%_38%)]">
                <div className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {emergency} Emergency override(s)</div>
                <div className="text-xs mt-0.5">Awaiting finance review post-treatment</div>
              </div>
            )}
            <div className="rounded-lg p-3 bg-[hsl(36_100%_96%)] border border-[hsl(36_100%_82%)] text-[hsl(30_85%_38%)]">
              <div className="font-semibold">1 STAT pending sample</div>
              <div className="text-xs mt-0.5">Ibrahim Musa — Urine Culture</div>
            </div>
            <div className="rounded-lg p-3 bg-[hsl(209_79%_96%)] border border-[hsl(209_79%_85%)] text-[hsl(209_79%_38%)]">
              <div className="font-semibold">BACTEC 9120 in maintenance</div>
              <div className="text-xs mt-0.5">Reroute culture tests to Microscope-3</div>
            </div>
            <div className="rounded-lg p-3 bg-[hsl(145_63%_96%)] border border-[hsl(145_55%_82%)] text-[hsl(145_63%_30%)]">
              <div className="font-semibold">Avg TAT 3.2 hrs</div>
              <div className="text-xs mt-0.5">Within SLA target (4 hrs)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Devices & staff */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3">Lab Devices</h3>
          <div className="space-y-2">
            {labDevices.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div>
                  <div className="font-medium text-sm">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.type}</div>
                </div>
                <StatusBadge status={d.status === 'Online' ? 'Active' : 'Maintenance'} />
              </div>
            ))}
          </div>
        </div>
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3">Lab Staff On Duty</h3>
          <div className="grid grid-cols-2 gap-2">
            {labStaff.map(s => (
              <div key={s.id} className="p-2.5 rounded-lg bg-muted/40">
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 2. INCOMING REQUESTS
// ============================================================
export const LabRequestsList = () => {
  const [tab, setTab] = useState<'all'|'awaiting'|'paid'|'emergency'>('all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const list = useMemo(() => labRequestsFull.filter(r => {
    if (tab === 'awaiting' && r.status !== 'AWAITING PAYMENT') return false;
    if (tab === 'paid' && r.status !== 'PAID') return false;
    if (tab === 'emergency' && r.status !== 'EMERGENCY') return false;
    if (q && !`${r.patientName} ${r.id} ${r.patientId} ${r.testName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tab, q]);

  return (
    <LabPage title="Incoming Lab Requests">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"   title="Total Requests"   value={String(labRequestsFull.length)} icon={ClipboardList} />
        <SummaryCard tone="amber"  title="Awaiting Payment" value={String(labRequestsFull.filter(r=>r.status==='AWAITING PAYMENT').length)} icon={CreditCard} />
        <SummaryCard tone="green"  title="Paid / Ready"     value={String(labRequestsFull.filter(r=>r.status==='PAID').length)} icon={ShieldCheck} />
        <SummaryCard tone="rose"   title="Emergency"        value={String(labRequestsFull.filter(r=>r.status==='EMERGENCY').length)} icon={AlertTriangle} />
      </div>

      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Payment</TabsTrigger>
            <TabsTrigger value="paid">Paid / Ready</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search request, patient or test" className="pl-9" />
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Request ID</th>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Billing</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><div className="font-mono text-xs font-semibold">{r.id}</div><div className="text-xs text-muted-foreground">{r.requestedAt}</div></td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                  <td className="p-3"><div className="font-medium">{r.testName}</div><div className="text-xs text-muted-foreground">{r.category} · {formatCurrency(r.price)}</div></td>
                  <td className="p-3"><StatusBadge status={priorityTone(r.priority)} /></td>
                  <td className="p-3">
                    <StatusBadge status={r.paymentStatus === 'PAID' ? 'Paid' : r.paymentStatus === 'EMERGENCY' ? 'Critical' : 'Unpaid'} />
                  </td>
                  <td className="p-3"><StatusBadge status={statusTone(r.status)} /></td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/lab/request/${r.id}`)}>Open</Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No requests in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 3. SAMPLE COLLECTION
// ============================================================
export const LabSampleCollection = () => {
  const [scanned, setScanned] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [tech, setTech] = useState(labStaff[0].name);

  const queue = labRequestsFull.filter(r => r.status === 'PAID' || r.status === 'EMERGENCY');
  const collected = labRequestsFull.filter(r => r.status === 'SAMPLE COLLECTED');

  return (
    <LabPage title="Sample Collection">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  title="Ready for Collection" value={String(queue.length)} icon={QrCode} />
        <SummaryCard tone="indigo" title="Collected (Today)"    value={String(collected.length)} icon={ClipboardCheck} />
        <SummaryCard tone="amber"  title="STAT in Queue"        value={String(queue.filter(r=>r.priority==='Stat').length)} icon={AlertTriangle} />
        <SummaryCard tone="blue"   title="Avg Collection Time"  value="6 min" icon={Clock} />
      </div>

      {/* Scanner */}
      <div className="hms-section p-5 mb-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Scan Lab Request ID / Patient QR</h3>
              <p className="text-xs text-muted-foreground">No sample is accepted without a valid request ID</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input value={scanned} onChange={e=>setScanned(e.target.value)} placeholder="LAB-2026-XXX or GFA HMS/2026/00000" className="md:w-72" />
            <Button onClick={() => {
              const found = labRequestsFull.find(r => r.id === scanned || r.patientId === scanned);
              if (!found) { toast.error('Invalid ID — request not found'); return; }
              if (found.status === 'AWAITING PAYMENT') { toast.error('Payment not confirmed — redirect patient to billing'); return; }
              setOpen(found.id);
            }}>Verify</Button>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="hms-section overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold">Collection Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Request</th>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Test / Specimen</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(r => {
                const cat = labCatalog.find(c => c.code === r.testCode);
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                    <td className="p-3"><div className="font-medium">{r.testName}</div><div className="text-xs text-muted-foreground">{cat?.specimen ?? '—'}</div></td>
                    <td className="p-3"><StatusBadge status={priorityTone(r.priority)} /></td>
                    <td className="p-3"><Button size="sm" onClick={() => setOpen(r.id)}>Collect Sample</Button></td>
                  </tr>
                );
              })}
              {queue.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No samples awaiting collection.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Sample Collection</DialogTitle>
            <DialogDescription>Patient identity verified — proceed to collect specimen.</DialogDescription>
          </DialogHeader>
          {(() => {
            const r = labRequestsFull.find(x => x.id === open);
            if (!r) return null;
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Patient</Label><div className="font-medium">{r.patientName}</div></div>
                  <div><Label className="text-xs">Hospital ID</Label><div className="font-mono text-xs">{r.patientId}</div></div>
                  <div><Label className="text-xs">Test</Label><div className="font-medium">{r.testName}</div></div>
                  <div><Label className="text-xs">Specimen</Label><div>{labCatalog.find(c=>c.code===r.testCode)?.specimen ?? '—'}</div></div>
                </div>
                <div>
                  <Label>Sample ID (auto-generated)</Label>
                  <Input value={`SMP-${Math.floor(2400 + Math.random()*100)}`} readOnly className="font-mono" />
                </div>
                <div>
                  <Label>Collected By</Label>
                  <Select value={tech} onValueChange={setTech}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{labStaff.filter(s=>s.role==='Lab Technician'||s.role==='Radiographer').map(s => <SelectItem key={s.id} value={s.name}>{s.name} — {s.role}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={() => { toast.success('Sample collected & logged. Status updated.'); setOpen(null); setScanned(''); }}>Confirm Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabPage>
  );
};

// ============================================================
// 4. PROCESSING
// ============================================================
export const LabProcessing = () => {
  const inProcessing = labRequestsFull.filter(r => r.status === 'SAMPLE COLLECTED' || r.status === 'PROCESSING');

  return (
    <LabPage title="Lab Processing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="indigo" title="In Processing"    value={String(inProcessing.length)} icon={Microscope} />
        <SummaryCard tone="green"  title="Devices Online"   value={String(labDevices.filter(d=>d.status==='Online').length)} icon={Activity} />
        <SummaryCard tone="amber"  title="Manual Entry"     value={String(inProcessing.filter(r=>!r.processingDevice).length)} icon={FilePlus} />
        <SummaryCard tone="rose"   title="Devices Down"     value={String(labDevices.filter(d=>d.status!=='Online').length)} icon={AlertTriangle} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Sample</th>
                <th className="text-left p-3">Patient / Test</th>
                <th className="text-left p-3">Technician</th>
                <th className="text-left p-3">Device</th>
                <th className="text-left p-3">Started</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {inProcessing.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.sampleId ?? '—'}</td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.testName}</div></td>
                  <td className="p-3">{r.processedBy ?? r.collectedBy ?? '—'}</td>
                  <td className="p-3">{r.processingDevice ?? <span className="text-xs text-muted-foreground italic">Manual</span>}</td>
                  <td className="p-3 text-xs">{r.collectedAt ?? '—'}</td>
                  <td className="p-3"><StatusBadge status={statusTone(r.status)} /></td>
                </tr>
              ))}
              {inProcessing.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nothing in processing.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 5. RESULT ENTRY (Technician)
// ============================================================
export const LabResultEntry = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [lines, setLines] = useState<LabResultLine[]>([{ parameter: '', value: '', unit: '', range: '', flag: 'Normal' }]);
  const [remarks, setRemarks] = useState('');

  const queue = labRequestsFull.filter(r => r.status === 'PROCESSING');

  return (
    <LabPage title="Result Entry">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="indigo" title="Awaiting Entry"  value={String(queue.length)} icon={FilePlus} />
        <SummaryCard tone="purple" title="Entered Today"   value={String(labRequestsFull.filter(r=>r.status==='COMPLETED').length)} icon={ClipboardCheck} />
        <SummaryCard tone="rose"   title="Critical Values" value="2" icon={AlertTriangle} subtitle="Auto-flagged" />
        <SummaryCard tone="green"  title="Avg Entry Time"  value="4 min" icon={Clock} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Sample</th><th className="text-left p-3">Patient / Test</th><th className="text-left p-3">Started</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {queue.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.sampleId}</td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.testName}</div></td>
                  <td className="p-3 text-xs">{r.collectedAt}</td>
                  <td className="p-3"><Button size="sm" onClick={() => { setOpen(r.id); setLines([{ parameter: '', value: '', unit: '', range: '', flag: 'Normal' }]); setRemarks(''); }}>Enter Result</Button></td>
                </tr>
              ))}
              {queue.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">All processed samples have results entered.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o)=>!o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Lab Result</DialogTitle>
            <DialogDescription>Result will be sent for senior verification before release to doctor.</DialogDescription>
          </DialogHeader>
          {(() => {
            const r = labRequestsFull.find(x => x.id === open);
            if (!r) return null;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm p-3 rounded-lg bg-muted/40">
                  <div><Label className="text-xs">Patient</Label><div className="font-medium">{r.patientName}</div></div>
                  <div><Label className="text-xs">Test</Label><div className="font-medium">{r.testName}</div></div>
                  <div><Label className="text-xs">Sample</Label><div className="font-mono text-xs">{r.sampleId}</div></div>
                </div>

                <div className="space-y-2">
                  <Label>Result Parameters</Label>
                  {lines.map((ln, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <Input className="col-span-3" placeholder="Parameter (e.g. Hb)" value={ln.parameter} onChange={e=>setLines(prev => prev.map((l,j)=>j===i?{...l,parameter:e.target.value}:l))} />
                      <Input className="col-span-2" placeholder="Value" value={ln.value} onChange={e=>setLines(prev => prev.map((l,j)=>j===i?{...l,value:e.target.value}:l))} />
                      <Input className="col-span-2" placeholder="Unit" value={ln.unit ?? ''} onChange={e=>setLines(prev => prev.map((l,j)=>j===i?{...l,unit:e.target.value}:l))} />
                      <Input className="col-span-3" placeholder="Reference range" value={ln.range ?? ''} onChange={e=>setLines(prev => prev.map((l,j)=>j===i?{...l,range:e.target.value}:l))} />
                      <Select value={ln.flag} onValueChange={(v)=>setLines(prev => prev.map((l,j)=>j===i?{...l,flag:v as any}:l))}>
                        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={()=>setLines(prev=>[...prev,{parameter:'',value:'',unit:'',range:'',flag:'Normal'}])}>+ Add Parameter</Button>
                </div>

                <div>
                  <Label>Clinical Remarks</Label>
                  <Textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="e.g. Result consistent with iron-deficiency anaemia." />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(null)}>Cancel</Button>
            <Button onClick={() => { toast.success('Result submitted. Awaiting senior verification.'); setOpen(null); }}>Submit for Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabPage>
  );
};

// ============================================================
// 6. VERIFICATION (Senior Scientist)
// ============================================================
export const LabVerification = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [signature, setSignature] = useState('');
  const queue = labRequestsFull.filter(r => r.status === 'COMPLETED');

  return (
    <LabPage title="Result Verification & Signoff">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="purple" title="Awaiting Verify" value={String(queue.length)} icon={FileSignature} />
        <SummaryCard tone="green"  title="Verified Today"  value={String(labRequestsFull.filter(r=>r.status==='VERIFIED'||r.status==='RELEASED'||r.status==='SYNCED').length)} icon={ShieldCheck} />
        <SummaryCard tone="rose"   title="Critical Flags"  value={String(queue.filter(r => r.results?.some(l => l.flag==='High'||l.flag==='Critical')).length)} icon={AlertTriangle} />
        <SummaryCard tone="blue"   title="Avg Sign Time"   value="2 min" icon={Clock} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Request</th>
                <th className="text-left p-3">Patient / Test</th>
                <th className="text-left p-3">Result Snapshot</th>
                <th className="text-left p-3">Entered By</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.id}</td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.testName}</div></td>
                  <td className="p-3 text-xs">
                    {r.results?.map((l, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="font-medium">{l.parameter}:</span> {l.value} {l.unit}
                        {l.flag && l.flag !== 'Normal' && <span className={`ml-1 px-1.5 rounded text-[10px] font-semibold ${l.flag==='High'?'bg-[hsl(30_85%_92%)] text-[hsl(30_85%_38%)]':l.flag==='Low'?'bg-[hsl(209_79%_92%)] text-[hsl(209_79%_38%)]':'bg-[hsl(0_84%_92%)] text-[hsl(0_70%_38%)]'}`}>{l.flag}</span>}
                      </div>
                    )) ?? '—'}
                  </td>
                  <td className="p-3 text-xs">{r.processedBy ?? '—'}</td>
                  <td className="p-3 space-x-1">
                    <Button size="sm" onClick={() => { setOpen(r.id); setSignature(''); }}>Verify & Sign</Button>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No results awaiting verification.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o)=>!o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Digital Verification</DialogTitle>
            <DialogDescription>By signing, you confirm clinical validity and accept responsibility for release.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-[hsl(36_100%_96%)] border border-[hsl(36_100%_82%)] text-[hsl(30_85%_38%)] text-xs">
              <strong>Audit notice:</strong> This signoff is logged with timestamp, user ID, and IP address. Result becomes immutable.
            </div>
            <div>
              <Label>Verifier Initials / Signature</Label>
              <Input value={signature} onChange={e=>setSignature(e.target.value)} placeholder="e.g. SA-2026" />
            </div>
            <div>
              <Label>Verification Note (optional)</Label>
              <Textarea placeholder="e.g. Reviewed delta vs prior result. Consistent." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{ toast.error('Result returned to technician for re-entry'); setOpen(null); }}>Reject</Button>
            <Button onClick={() => { if(!signature){toast.error('Signature required');return;} toast.success('Verified, signed & released to ordering doctor'); setOpen(null); }}>Verify & Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabPage>
  );
};

// ============================================================
// 7. RELEASED RESULTS
// ============================================================
export const LabReleased = () => {
  const released = labRequestsFull.filter(r => r.status === 'RELEASED' || r.status === 'VERIFIED' || r.status === 'SYNCED');

  return (
    <LabPage title="Released Results">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  title="Released Today" value={String(released.length)} icon={CheckCircle2} />
        <SummaryCard tone="indigo" title="Doctor Notified" value={String(released.length)} icon={Stethoscope} />
        <SummaryCard tone="blue"   title="EMR Synced"      value={String(released.filter(r=>r.emrSync==='SYNCED').length)} icon={Wifi} />
        <SummaryCard tone="amber"  title="Pending Sync"    value={String(released.filter(r=>r.emrSync==='PENDING').length)} icon={WifiOff} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Request</th>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Verified By</th>
                <th className="text-left p-3">Released</th>
                <th className="text-left p-3">EMR</th>
              </tr>
            </thead>
            <tbody>
              {released.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs"><Link to={`/lab/request/${r.id}`} className="text-primary hover:underline">{r.id}</Link></td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                  <td className="p-3">{r.testName}</td>
                  <td className="p-3 text-xs">{r.verifiedBy ?? '—'}</td>
                  <td className="p-3 text-xs">{r.releasedAt ?? r.verifiedAt ?? '—'}</td>
                  <td className="p-3"><StatusBadge status={r.emrSync === 'SYNCED' ? 'Synced' : 'Retrying'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 8. EMR SYNC QUEUE
// ============================================================
export const LabSyncQueue = () => {
  const [emrOnline, setEmrOnline] = useState(true);
  const pending = labRequestsFull.filter(r => r.emrSync === 'PENDING' && (r.status === 'RELEASED' || r.status === 'VERIFIED'));
  const synced = labRequestsFull.filter(r => r.emrSync === 'SYNCED');

  return (
    <LabPage title="EMR Sync Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone={emrOnline ? 'green' : 'rose'} title="EMR Status" value={emrOnline ? 'Online' : 'Offline'} icon={emrOnline ? Wifi : WifiOff} />
        <SummaryCard tone="amber"  title="Pending Sync" value={String(pending.length)} icon={RefreshCw} />
        <SummaryCard tone="green"  title="Synced Today" value={String(synced.length)} icon={CheckCircle2} />
        <SummaryCard tone="rose"   title="Failed"       value="0" icon={XCircle} />
      </div>

      <div className="hms-section p-4 mb-4 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">Background Sync Service</div>
          <div className="text-xs text-muted-foreground">Auto-pushes verified results to hospital EMR. Falls back to local HMS storage if EMR is unreachable.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEmrOnline(!emrOnline); toast.info(`EMR set to ${!emrOnline ? 'Online' : 'Offline'}`); }}>
            {emrOnline ? <WifiOff className="h-4 w-4 mr-1" /> : <Wifi className="h-4 w-4 mr-1" />} Toggle EMR
          </Button>
          <Button size="sm" onClick={() => toast.success(`${pending.length} record(s) pushed to EMR`)} disabled={!emrOnline}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry Sync Now
          </Button>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Request</th>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Test</th>
                <th className="text-left p-3">Released</th>
                <th className="text-left p-3">Sync Status</th>
              </tr>
            </thead>
            <tbody>
              {[...pending, ...synced].map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.id}</td>
                  <td className="p-3">{r.patientName}</td>
                  <td className="p-3">{r.testName}</td>
                  <td className="p-3 text-xs">{r.releasedAt ?? r.verifiedAt ?? '—'}</td>
                  <td className="p-3"><StatusBadge status={r.emrSync === 'SYNCED' ? 'Synced' : 'Retrying'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 9. TEST CATALOG
// ============================================================
export const LabCatalog = () => {
  const [q, setQ] = useState('');
  const list = labCatalog.filter(c => !q || `${c.code} ${c.name} ${c.category}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <LabPage title="Test Catalog & Pricing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"   title="Total Tests"  value={String(labCatalog.length)} icon={Beaker} />
        <SummaryCard tone="green"  title="Categories"   value="6" icon={ClipboardList} />
        <SummaryCard tone="amber"  title="Avg TAT"      value="3 hrs" icon={Clock} />
        <SummaryCard tone="purple" title="Avg Price"    value={formatCurrency(labCatalog.reduce((s,c)=>s+c.price,0)/labCatalog.length)} icon={CreditCard} />
      </div>

      <div className="hms-section p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search test by code, name or category" className="pl-9" />
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Test Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Specimen</th>
                <th className="text-left p-3">TAT</th>
                <th className="text-right p-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.code} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{c.category}</span></td>
                  <td className="p-3 text-xs">{c.specimen}</td>
                  <td className="p-3 text-xs">{c.tat}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(c.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 10. AUDIT TRAIL
// ============================================================
export const LabAudit = () => {
  const events = labRequestsFull.flatMap(r => r.audit.map(a => ({ ...a, requestId: r.id, patient: r.patientName, test: r.testName }))).reverse();
  return (
    <LabPage title="Lab Audit Trail">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"   title="Today's Events"  value={String(events.length)} icon={History} />
        <SummaryCard tone="green"  title="Verifications"   value={String(events.filter(e=>e.action.toLowerCase().includes('verified')).length)} icon={ShieldCheck} />
        <SummaryCard tone="rose"   title="Overrides"       value={String(events.filter(e=>e.action.toLowerCase().includes('override')).length)} icon={AlertTriangle} />
        <SummaryCard tone="amber"  title="Payments Logged" value={String(events.filter(e=>e.action.toLowerCase().includes('payment')).length)} icon={CreditCard} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Actor</th>
                <th className="text-left p-3">Request</th>
                <th className="text-left p-3">Patient / Test</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono">{e.at}</td>
                  <td className="p-3 text-xs">{e.actor}</td>
                  <td className="p-3 text-xs font-mono">{e.requestId}</td>
                  <td className="p-3 text-xs">{e.patient} — {e.test}</td>
                  <td className="p-3 text-sm">{e.action}</td>
                  <td className="p-3 text-xs text-muted-foreground">{e.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 11. REQUEST DETAIL — workflow ribbon + full timeline
// ============================================================
export const LabRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const r = labRequestsFull.find(x => x.id === id);

  if (!r) {
    return (
      <LabPage title="Request Not Found">
        <div className="hms-section p-10 text-center">
          <p className="text-muted-foreground mb-4">No lab request found with that ID.</p>
          <Button onClick={() => navigate('/lab/requests')}>Back to Requests</Button>
        </div>
      </LabPage>
    );
  }

  return (
    <LabPage title={`${r.id} — ${r.testName}`}>
      <div className="hms-section p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs text-muted-foreground font-mono">{r.id} · Visit {r.visitId}</div>
            <h2 className="font-display text-xl font-bold mt-1">{r.patientName} <span className="text-sm font-normal text-muted-foreground">({r.age}, {r.gender})</span></h2>
            <div className="text-xs text-muted-foreground">{r.patientId} · Requested by {r.requestedBy} · {r.requestedAt}</div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={priorityTone(r.priority)} />
            <StatusBadge status={r.paymentStatus === 'PAID' ? 'Paid' : r.paymentStatus === 'EMERGENCY' ? 'Critical' : 'Unpaid'} />
            <StatusBadge status={statusTone(r.status)} />
          </div>
        </div>
        <WorkflowRibbon status={r.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Test details */}
          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3">Test Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><Label className="text-xs">Test</Label><div className="font-medium">{r.testName}</div></div>
              <div><Label className="text-xs">Category</Label><div>{r.category}</div></div>
              <div><Label className="text-xs">Price</Label><div className="font-semibold">{formatCurrency(r.price)}</div></div>
              <div><Label className="text-xs">Sample ID</Label><div className="font-mono">{r.sampleId ?? '—'}</div></div>
              <div><Label className="text-xs">Collected By</Label><div>{r.collectedBy ?? '—'}</div></div>
              <div><Label className="text-xs">Device</Label><div>{r.processingDevice ?? '—'}</div></div>
            </div>
          </div>

          {/* Result panel */}
          <div className="hms-section p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Result</h3>
              {r.verifiedBy && <span className="text-xs text-[hsl(145_63%_30%)] flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified by {r.verifiedBy}</span>}
            </div>
            {r.results ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left p-2">Parameter</th><th className="text-left p-2">Value</th><th className="text-left p-2">Unit</th><th className="text-left p-2">Range</th><th className="text-left p-2">Flag</th></tr>
                  </thead>
                  <tbody>
                    {r.results.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-medium">{l.parameter}</td>
                        <td className="p-2 font-mono">{l.value}</td>
                        <td className="p-2 text-xs">{l.unit ?? '—'}</td>
                        <td className="p-2 text-xs">{l.range ?? '—'}</td>
                        <td className="p-2">{l.flag && <StatusBadge status={l.flag === 'High' || l.flag === 'Low' ? 'Warning' : l.flag === 'Critical' ? 'Critical' : 'Active'} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {r.remarks && <div className="mt-3 p-3 rounded-lg bg-muted/40 text-sm"><Label className="text-xs">Clinical Remarks</Label><div>{r.remarks}</div></div>}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-6 text-center bg-muted/30 rounded-lg">No result entered yet.</div>
            )}
          </div>
        </div>

        {/* Audit timeline */}
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Audit Timeline</h3>
          <div className="space-y-3">
            {r.audit.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                  {i < r.audit.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="text-xs text-muted-foreground font-mono">{a.at}</div>
                  <div className="text-sm font-medium">{a.action}</div>
                  <div className="text-xs text-muted-foreground">{a.actor}{a.note ? ` · ${a.note}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LabPage>
  );
};

// ============================================================
// 12. DOCTOR-SIDE: ORDER LAB TEST (mini component, exported for embedding)
// ============================================================
export const DoctorLabOrderPanel = ({ patientName, patientId, visitId }: { patientName: string; patientId: string; visitId: string }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<'Routine'|'Urgent'|'Stat'>('Routine');
  const [open, setOpen] = useState(false);

  const total = selected.reduce((s, code) => s + (labCatalog.find(c => c.code === code)?.price ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><FlaskConical className="h-4 w-4 mr-1" /> Order Lab Test</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Lab Investigation</DialogTitle>
          <DialogDescription>Patient must clear billing before lab proceeds (unless emergency).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm p-3 rounded-lg bg-muted/40">
            <div><Label className="text-xs">Patient</Label><div className="font-medium">{patientName}</div></div>
            <div><Label className="text-xs">Hospital ID</Label><div className="font-mono text-xs">{patientId}</div></div>
            <div><Label className="text-xs">Visit</Label><div className="font-mono text-xs">{visitId}</div></div>
          </div>

          <div>
            <Label>Tests (multi-select)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto p-1">
              {labCatalog.map(c => {
                const on = selected.includes(c.code);
                return (
                  <button key={c.code} type="button" onClick={() => setSelected(on ? selected.filter(x=>x!==c.code) : [...selected, c.code])}
                    className={`text-left p-2.5 rounded-lg border transition-all ${on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="text-xs font-semibold">{formatCurrency(c.price)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.category} · TAT {c.tat}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v)=>setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Total</Label>
              <div className="h-10 rounded-md border px-3 flex items-center font-semibold">{formatCurrency(total)}</div>
            </div>
          </div>

          {selected.some(code => labRequestsFull.some(r => r.testCode === code && r.patientId === patientId && r.requestedAt.startsWith('2026-04-28'))) && (
            <div className="p-3 rounded-lg bg-[hsl(36_100%_96%)] border border-[hsl(36_100%_82%)] text-[hsl(30_85%_38%)] text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>Duplicate warning:</strong> One or more tests were already requested for this patient today.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button disabled={selected.length===0} onClick={() => {
            toast.success(`${selected.length} lab request(s) created. Invoice generated — patient routed to billing.`);
            setOpen(false); setSelected([]);
          }}><Send className="h-4 w-4 mr-1" /> Create Request{selected.length>1?'s':''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
