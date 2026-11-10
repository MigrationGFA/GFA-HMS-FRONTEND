import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  RefreshCw, AlertTriangle, ShieldCheck, History, Activity, ArrowRight,
  Boxes, Server, Workflow, ClipboardList, Search, LayoutDashboard, PlayCircle,
  PauseCircle, Cpu, Link2, FileWarning, GitBranch, Inbox, CheckCircle2,
  XCircle, Network, Zap, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  syncEvents, channelHealth, idMappings, adapterRules, syncAuditTrail,
  failureCodes, sumByStatus, sumByTarget, fmtBytes, statusBadge, samplePayload,
  type SyncEvent, type SyncStatus, type SyncTarget, type SyncTier,
} from '@/data/emrSyncData';

// ============================================================
// Sidebar: lives inside the IT / Records consoles
// ============================================================
const syncNav = [
  { label: 'Sync Overview',    path: '/sync',            icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Live Queue',       path: '/sync/queue',      icon: <Inbox className="h-4 w-4" /> },
  { label: 'Workers',          path: '/sync/workers',    icon: <Cpu className="h-4 w-4" /> },
  { label: 'EMR Adapter',      path: '/sync/adapter',    icon: <GitBranch className="h-4 w-4" /> },
  { label: 'ID Mappings',      path: '/sync/mappings',   icon: <Link2 className="h-4 w-4" /> },
  { label: 'Channel Health',   path: '/sync/channels',   icon: <Network className="h-4 w-4" /> },
  { label: 'Dead Letter',      path: '/sync/dead-letter',icon: <FileWarning className="h-4 w-4" /> },
  { label: 'Audit Trail',      path: '/sync/audit',      icon: <History className="h-4 w-4" /> },
];

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout title={title} navItems={syncNav as any}>{children}</DashboardLayout>
);

const tierPill = (t: SyncTier) => {
  const map: Record<SyncTier, string> = {
    REALTIME:        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    NEAR_REALTIME:   'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    BATCH:           'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  };
  return <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${map[t]}`}>{t.replace('_',' ')}</span>;
};

const targetPill = (t: SyncTarget) => (
  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-foreground/70 ring-1 ring-border">{t}</span>
);

// ============================================================
// 1. SYNC OVERVIEW (Dashboard)
// ============================================================
export const SyncOverview = () => {
  const counts = sumByStatus();
  const total = syncEvents.length;
  const synced = counts.SYNCED ?? 0;
  const pending = (counts.PENDING ?? 0) + (counts.IN_FLIGHT ?? 0);
  const retry = counts.RETRY ?? 0;
  const dead = (counts.DEAD_LETTER ?? 0) + (counts.FAILED ?? 0);
  const successRate = total ? Math.round((synced / total) * 100) : 0;

  return (
    <Page title="EMR Background Sync · Overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Sync Success Rate" value={`${successRate}%`} icon={ShieldCheck} subtitle={`${synced}/${total} events`} />
        <SummaryCard title="In Queue" value={String(pending)} icon={Inbox} subtitle="Pending + In-flight" />
        <SummaryCard title="Retrying" value={String(retry)} icon={RefreshCw} subtitle="Auto-backoff active" />
        <SummaryCard title="Dead Letter" value={String(dead)} icon={FileWarning} subtitle="Needs admin attention" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="hms-section p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Event flow</h3>
              <p className="text-xs text-muted-foreground">HMS captures everything locally · workers push to EMR asynchronously</p>
            </div>
            <Link to="/sync/queue"><Button variant="outline" size="sm">Open live queue <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
            {[
              { label: 'HMS Action', icon: Zap, count: total, tone: 'bg-teal-50 text-teal-700 ring-teal-200' },
              { label: 'Queued', icon: Inbox, count: pending, tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
              { label: 'Worker picks', icon: Cpu, count: counts.IN_FLIGHT ?? 0, tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
              { label: 'EMR Sent', icon: Server, count: synced, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
              { label: 'Failed / DLQ', icon: XCircle, count: dead, tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
            ].map((s, i) => (
              <div key={i} className={`p-3 rounded-xl ring-1 ${s.tone}`}>
                <s.icon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-2xl font-semibold">{s.count}</div>
                <div className="uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hms-section p-5">
          <h3 className="font-semibold mb-3">Sync tiers</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              {tierPill('REALTIME')}
              <div><b>Real-time</b> — patient registration, visit creation</div>
            </li>
            <li className="flex items-start gap-2">
              {tierPill('NEAR_REALTIME')}
              <div><b>Near real-time</b> — consultations, lab, pharmacy</div>
            </li>
            <li className="flex items-start gap-2">
              {tierPill('BATCH')}
              <div><b>Batch</b> — financial reconciliation, NPHCDA reports (end-of-day)</div>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hms-section p-5">
          <h3 className="font-semibold mb-3">Channel health</h3>
          <div className="space-y-2">
            {channelHealth.map(c => (
              <div key={c.target} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div>
                  <div className="font-medium">{c.target}</div>
                  <div className="text-xs text-muted-foreground">{c.endpoint}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={c.status === 'UP' ? 'Active' : c.status === 'DEGRADED' ? 'Warning' : 'Down'} />
                  <div className="text-xs text-muted-foreground mt-1">{c.uptimePct}% · {c.avgLatencyMs}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hms-section p-5">
          <h3 className="font-semibold mb-3">Recent activity</h3>
          <ul className="space-y-2 text-sm">
            {syncAuditTrail.slice(0, 6).map(a => (
              <li key={a.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/40">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs"><b>{a.eventId}</b> · <span className="text-muted-foreground">{a.action}</span></div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(a.at).toLocaleTimeString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Page>
  );
};

// ============================================================
// 2. LIVE QUEUE — searchable, filterable
// ============================================================
export const SyncQueue = () => {
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [selected, setSelected] = useState<SyncEvent | null>(null);

  const filtered = syncEvents.filter(e =>
    (target === 'all' || e.target === target) &&
    (status === 'all' || e.status === status) &&
    (tier === 'all' || e.tier === tier) &&
    (!q || e.id.toLowerCase().includes(q.toLowerCase()) ||
      e.hmsRef.toLowerCase().includes(q.toLowerCase()) ||
      (e.patientName ?? '').toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Page title="Live Sync Queue">
      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search event ID, HMS ref, patient" className="pl-9" />
        </div>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Target" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All targets</SelectItem>
            <SelectItem value="EMR">EMR</SelectItem>
            <SelectItem value="NHIS">NHIS</SelectItem>
            <SelectItem value="NIBSS">NIBSS</SelectItem>
            <SelectItem value="NPHCDA">NPHCDA</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_FLIGHT">In-flight</SelectItem>
            <SelectItem value="RETRY">Retry</SelectItem>
            <SelectItem value="SYNCED">Synced</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="DEAD_LETTER">Dead letter</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="REALTIME">Real-time</SelectItem>
            <SelectItem value="NEAR_REALTIME">Near real-time</SelectItem>
            <SelectItem value="BATCH">Batch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Event</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Patient / Ref</th>
                <th className="text-left p-3">Target</th>
                <th className="text-left p-3">Tier</th>
                <th className="text-left p-3">Retry</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-muted/40">
                  <td className="p-3 font-medium">{e.id}<div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</div></td>
                  <td className="p-3 text-xs">{e.type}<div className="text-[10px] text-muted-foreground">{e.module}</div></td>
                  <td className="p-3 text-xs">{e.patientName ?? '—'}<div className="text-[10px] text-muted-foreground">{e.hmsRef}</div></td>
                  <td className="p-3">{targetPill(e.target)}</td>
                  <td className="p-3">{tierPill(e.tier)}</td>
                  <td className="p-3 text-xs">{e.retryCount}/{e.maxRetries}</td>
                  <td className="p-3"><StatusBadge status={e.status === 'SYNCED' ? 'Synced' : e.status === 'IN_FLIGHT' ? 'In Progress' : e.status === 'PENDING' ? 'Pending' : e.status === 'RETRY' ? 'Retrying' : 'Failed'} /></td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => setSelected(e)}>Inspect</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No events match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Event {selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Type</div><div className="font-medium">{selected.type}</div></div>
                <div><div className="text-xs text-muted-foreground">Module → Target</div><div className="font-medium">{selected.module} → {selected.target}</div></div>
                <div><div className="text-xs text-muted-foreground">Patient</div><div>{selected.patientName ?? '—'} ({selected.hmsId ?? '—'})</div></div>
                <div><div className="text-xs text-muted-foreground">HMS Ref</div><div>{selected.hmsRef}</div></div>
                <div><div className="text-xs text-muted-foreground">EMR Ref</div><div>{selected.emrRef ?? '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Payload</div><div>{fmtBytes(selected.payloadSize)}</div></div>
              </div>
              {selected.errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 ring-1 ring-rose-200 text-rose-800 text-xs">
                  <b>{selected.errorCode}:</b> {selected.errorMessage}
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Outgoing payload preview</div>
                <pre className="text-xs p-3 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto">
{JSON.stringify(samplePayload(selected), null, 2)}
                </pre>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {selected.status !== 'SYNCED' && (
                  <Button onClick={() => { toast.success(`Manual retry queued for ${selected.id}`); setSelected(null); }}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Retry now
                  </Button>
                )}
                {(selected.status === 'FAILED' || selected.status === 'DEAD_LETTER') && (
                  <Button variant="outline" onClick={() => { toast.success(`${selected.id} marked resolved (manual)`); setSelected(null); }}>
                    Mark resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
};

// ============================================================
// 3. WORKERS — simulated background processors
// ============================================================
export const SyncWorkers = () => {
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, [running]);

  const workers = [
    { id: 'W-1', name: 'Worker #1', target: 'EMR' as SyncTarget, processed: 1842 + tick * 2, failed: 12, lease: '60s', status: 'idle' },
    { id: 'W-2', name: 'Worker #2', target: 'EMR' as SyncTarget, processed: 1798 + tick * 2, failed: 8,  lease: '60s', status: 'busy' },
    { id: 'W-3', name: 'Worker #3', target: 'NHIS' as SyncTarget, processed: 412 + tick,    failed: 21, lease: '120s', status: 'busy' },
    { id: 'W-4', name: 'Worker #4', target: 'NIBSS' as SyncTarget, processed: 980,           failed: 3, lease: '30s', status: 'idle' },
    { id: 'W-5', name: 'Worker #5', target: 'NPHCDA' as SyncTarget, processed: 64,           failed: 11, lease: '300s', status: 'paused' },
  ];

  return (
    <Page title="Background Workers">
      <div className="hms-section p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <div>
            <div className="font-semibold">Worker pool</div>
            <div className="text-xs text-muted-foreground">Async processors picking events from queue · backoff + lease enforced</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{running ? 'Live' : 'Paused'}</span>
          <Button variant="outline" size="sm" onClick={() => setRunning(r => !r)}>
            {running ? <><PauseCircle className="h-4 w-4 mr-1" /> Pause</> : <><PlayCircle className="h-4 w-4 mr-1" /> Resume</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(w => (
          <div key={w.id} className="hms-section p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> {w.name}</div>
              <StatusBadge status={w.status === 'busy' ? 'Active' : w.status === 'paused' ? 'On Leave' : 'Available'} />
            </div>
            <div className="text-xs text-muted-foreground mb-3">Target: <b>{w.target}</b> · Lease {w.lease}</div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
                <div className="text-xs text-emerald-700">Processed</div>
                <div className="text-lg font-semibold text-emerald-800">{w.processed.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 ring-1 ring-rose-200">
                <div className="text-xs text-rose-700">Failed</div>
                <div className="text-lg font-semibold text-rose-800">{w.failed}</div>
              </div>
            </div>
            {w.status === 'busy' && (
              <div className="mt-3 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 inline mr-1 animate-pulse text-teal-600" />
                Processing event…
              </div>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
};

// ============================================================
// 4. EMR ADAPTER — mapping rules
// ============================================================
export const SyncAdapter = () => {
  return (
    <Page title="EMR Adapter Layer">
      <div className="hms-section p-5 mb-4">
        <div className="flex items-start gap-3">
          <GitBranch className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">Adapter v2.1 · normalises HMS payloads to EMR / NHIS schemas</div>
            <p className="text-xs text-muted-foreground mt-1">
              ICD-10 diagnoses, LOINC labs, ATC drugs, currency &amp; timezone normalisation, ID mapping (HMS ↔ EMR).
              No raw HMS data is ever sent — every field is transformed and validated.
            </p>
          </div>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Rule</th>
              <th className="text-left p-3">HMS field</th>
              <th className="text-left p-3">EMR field</th>
              <th className="text-left p-3">Transform</th>
              <th className="text-left p-3">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {adapterRules.map(r => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3 font-medium">{r.name}<div className="text-[10px] text-muted-foreground">{r.id}</div></td>
                <td className="p-3 text-xs"><code className="px-1 py-0.5 bg-muted rounded">{r.hmsField}</code></td>
                <td className="p-3 text-xs"><code className="px-1 py-0.5 bg-muted rounded">{r.emrField}</code></td>
                <td className="p-3 text-xs">{r.transform}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

// ============================================================
// 5. ID MAPPINGS (HMS ↔ EMR)
// ============================================================
export const SyncMappings = () => {
  const [q, setQ] = useState('');
  const filtered = idMappings.filter(m =>
    !q || m.hmsId.toLowerCase().includes(q.toLowerCase()) || m.emrId.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Page title="ID Mappings · HMS ↔ EMR">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <SummaryCard title="Total mappings" value={String(idMappings.length)} icon={Link2} />
        <SummaryCard title="Synced" value={String(idMappings.filter(m => m.status === 'SYNCED').length)} icon={CheckCircle2} />
        <SummaryCard title="Pending mapping" value={String(idMappings.filter(m => m.status === 'PENDING').length)} icon={Inbox} />
        <SummaryCard title="Entity types" value="5" icon={Layers} subtitle="Patient · Visit · Adm · Lab · Rx" />
      </div>

      <div className="hms-section p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by HMS ID or EMR ID" className="pl-9" />
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">HMS ID</th>
              <th className="text-left p-3"></th>
              <th className="text-left p-3">EMR ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Mapped at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(m => (
              <tr key={m.hmsId} className="hover:bg-muted/40">
                <td className="p-3"><span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted ring-1 ring-border">{m.type}</span></td>
                <td className="p-3 font-mono text-xs">{m.hmsId}</td>
                <td className="p-3"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                <td className="p-3 font-mono text-xs">{m.emrId}</td>
                <td className="p-3"><StatusBadge status={m.status === 'SYNCED' ? 'Synced' : 'Pending'} /></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(m.mappedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

// ============================================================
// 6. CHANNEL HEALTH — EMR / NHIS / NIBSS / NPHCDA
// ============================================================
export const SyncChannels = () => {
  return (
    <Page title="Downstream Channel Health">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channelHealth.map(c => (
          <div key={c.target} className="hms-section p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold flex items-center gap-2"><Network className="h-4 w-4 text-primary" /> {c.target}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.endpoint}</div>
              </div>
              <StatusBadge status={c.status === 'UP' ? 'Active' : c.status === 'DEGRADED' ? 'Warning' : 'Down'} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Uptime</div>
                <div className="font-semibold">{c.uptimePct}%</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Latency</div>
                <div className="font-semibold">{c.avgLatencyMs}ms</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">Last OK</div>
                <div className="font-semibold text-xs">{new Date(c.lastSuccess).toLocaleTimeString()}</div>
              </div>
            </div>
            {c.lastFailure && (
              <div className="mt-3 text-xs p-2 rounded bg-amber-50 ring-1 ring-amber-200 text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 mt-0.5" /> Last failure {new Date(c.lastFailure).toLocaleString()}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.success(`Health probe sent to ${c.target}`)}>Probe</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success(`Replay queued for ${c.target}`)}>Replay queue</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hms-section p-5 mt-6">
        <h3 className="font-semibold mb-3">Failure code reference</h3>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-2">Code</th><th className="text-left p-2">Meaning</th><th className="text-left p-2">Recommended action</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {failureCodes.map(f => (
              <tr key={f.code}><td className="p-2 font-mono text-xs">{f.code}</td><td className="p-2 text-xs">{f.meaning}</td><td className="p-2 text-xs text-muted-foreground">{f.recommended}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

// ============================================================
// 7. DEAD LETTER QUEUE — needs manual attention
// ============================================================
export const SyncDeadLetter = () => {
  const dead = syncEvents.filter(e => e.status === 'DEAD_LETTER' || e.status === 'FAILED');
  return (
    <Page title="Dead Letter Queue">
      <div className="hms-section p-4 mb-4 flex items-start gap-3 bg-rose-50/40">
        <FileWarning className="h-5 w-5 text-rose-600 mt-0.5" />
        <div>
          <div className="font-semibold text-rose-800">Events that exceeded retry budget</div>
          <p className="text-xs text-muted-foreground mt-1">
            HMS keeps operating normally. These events stay in the buffer until an admin investigates,
            corrects the adapter mapping, or marks them resolved. Nothing is ever silently dropped.
          </p>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Patient</th>
              <th className="text-left p-3">Target</th>
              <th className="text-left p-3">Last error</th>
              <th className="text-left p-3">Retries</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dead.map(e => (
              <tr key={e.id} className="hover:bg-muted/40">
                <td className="p-3 font-medium">{e.id}<div className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div></td>
                <td className="p-3 text-xs">{e.type}</td>
                <td className="p-3 text-xs">{e.patientName ?? '—'}</td>
                <td className="p-3">{targetPill(e.target)}</td>
                <td className="p-3 text-xs"><span className="font-mono text-rose-700">{e.errorCode}</span><div className="text-[10px] text-muted-foreground">{e.errorMessage}</div></td>
                <td className="p-3 text-xs">{e.retryCount}/{e.maxRetries}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`Retry queued for ${e.id}`)}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success(`${e.id} marked resolved`)}>Resolve</Button>
                </td>
              </tr>
            ))}
            {dead.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Dead letter queue is clear. ✨</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

// ============================================================
// 8. AUDIT TRAIL — full timeline
// ============================================================
export const SyncAudit = () => {
  const [emrEnabled, setEmrEnabled] = useState(true);
  return (
    <Page title="Sync Audit Trail">
      <div className="hms-section p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">EMR sync engine</div>
          <div className="text-xs text-muted-foreground">Toggle suspends new outbound sync — events still capture locally and queue for later replay.</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs">{emrEnabled ? 'Engine ON' : 'Engine PAUSED'}</span>
          <Switch checked={emrEnabled} onCheckedChange={v => { setEmrEnabled(v); toast.success(`Sync engine ${v ? 'resumed' : 'paused'}`); }} />
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {syncAuditTrail.map(a => (
              <tr key={a.id} className="hover:bg-muted/40">
                <td className="p-3 text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{a.eventId}</td>
                <td className="p-3 text-xs"><span className="px-2 py-0.5 rounded-full bg-muted ring-1 ring-border text-[10px] uppercase">{a.action}</span></td>
                <td className="p-3 text-xs">{a.actor}</td>
                <td className="p-3 text-xs text-muted-foreground">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};