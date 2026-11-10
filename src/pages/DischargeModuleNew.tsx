import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  dischargeCases, dischargeStats, getDischargeById, formatNGN,
  type DischargeCase, type DischargeStage, type PaymentChannel,
} from '@/data/dischargeData';
import {
  FileCheck, Wallet, ShieldCheck, AlertTriangle, RefreshCw, BedDouble,
  Receipt, Stethoscope, Building2, ClipboardList, ClipboardCheck, ArrowLeft,
  CreditCard, Smartphone, Banknote, Send, FileText, History, Activity,
  LayoutDashboard, Search, Siren, BadgeAlert, Printer, CheckCircle2,
  XCircle, FilePlus2, Scale,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Sidebar — discharge & final billing focused
// ─────────────────────────────────────────────────────────────
const dischargeSidebar = [
  { label: 'Discharge Dashboard',  path: '/discharge',            icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Discharge Queue',      path: '/discharge/queue',      icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Bill Aggregation',     path: '/discharge/aggregate',  icon: <Receipt className="h-4 w-4" /> },
  { label: 'Validation Flags',     path: '/discharge/validation', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Payment Collection',   path: '/discharge/payments',   icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Finance Clearance',    path: '/discharge/finance',    icon: <Scale className="h-4 w-4" /> },
  { label: 'Bed Release',          path: '/discharge/beds',       icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Discharge Summaries',  path: '/discharge/summaries',  icon: <FileText className="h-4 w-4" /> },
  { label: 'EMR Sync',             path: '/discharge/sync',       icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Disputes',             path: '/discharge/disputes',   icon: <BadgeAlert className="h-4 w-4" /> },
  { label: 'Audit Trail',          path: '/discharge/audit',      icon: <History className="h-4 w-4" /> },
];

const Layout = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout title={title} navItems={dischargeSidebar}>{children}</DashboardLayout>
);

// ─────────────────────────────────────────────────────────────
// Helpers — shared visuals
// ─────────────────────────────────────────────────────────────
const stageTone: Record<DischargeStage, string> = {
  PENDING_BILLING:     'bg-slate-100 text-slate-700 ring-slate-200',
  BILL_AGGREGATED:     'bg-blue-50 text-blue-700 ring-blue-200',
  BILL_VALIDATED:      'bg-teal-50 text-teal-700 ring-teal-200',
  AWAITING_PAYMENT:    'bg-amber-50 text-amber-800 ring-amber-200',
  PARTIAL_PAYMENT:     'bg-orange-50 text-orange-800 ring-orange-200',
  PAID:                'bg-emerald-50 text-emerald-700 ring-emerald-200',
  AWAITING_FINANCE:    'bg-purple-50 text-purple-800 ring-purple-200',
  FINANCE_APPROVED:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
  BED_RELEASED:        'bg-sky-50 text-sky-800 ring-sky-200',
  SUMMARY_GENERATED:   'bg-indigo-50 text-indigo-800 ring-indigo-200',
  SYNCED_EMR:          'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETED:           'bg-emerald-100 text-emerald-800 ring-emerald-300',
  DISPUTE:             'bg-red-50 text-red-700 ring-red-200',
  EMERGENCY_OVERRIDE:  'bg-rose-50 text-rose-700 ring-rose-200',
};

const StagePill = ({ stage }: { stage: DischargeStage }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${stageTone[stage]}`}>
    {stage.replace(/_/g, ' ')}
  </span>
);

// 8-step ribbon
const dischargeFlow: DischargeStage[] = [
  'PENDING_BILLING', 'BILL_AGGREGATED', 'AWAITING_PAYMENT', 'PAID',
  'AWAITING_FINANCE', 'BED_RELEASED', 'SUMMARY_GENERATED', 'COMPLETED',
];

const DischargeRibbon = ({ stage }: { stage: DischargeStage }) => {
  // map exotic stages to nearest canonical step for ribbon position
  const map: Partial<Record<DischargeStage, DischargeStage>> = {
    BILL_VALIDATED: 'BILL_AGGREGATED',
    PARTIAL_PAYMENT: 'AWAITING_PAYMENT',
    FINANCE_APPROVED: 'AWAITING_FINANCE',
    SYNCED_EMR: 'COMPLETED',
    DISPUTE: 'AWAITING_FINANCE',
    EMERGENCY_OVERRIDE: 'BED_RELEASED',
  };
  const norm = map[stage] ?? stage;
  const idx = dischargeFlow.indexOf(norm);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {dischargeFlow.map((s, i) => {
        const done = i < idx, current = i === idx;
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`px-2 py-1 rounded-md text-[10px] font-semibold ring-1 ${
              current ? 'bg-primary text-primary-foreground ring-primary' :
              done    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' :
                        'bg-muted/40 text-muted-foreground ring-border'
            }`}>{s.replace(/_/g, ' ')}</div>
            {i < dischargeFlow.length - 1 && <div className={`h-0.5 w-3 ${done ? 'bg-emerald-300' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
};

const channelIcon: Record<PaymentChannel, React.ReactNode> = {
  POS: <CreditCard className="h-3 w-3" />,
  'SMS Link': <Smartphone className="h-3 w-3" />,
  'Bank Transfer': <Banknote className="h-3 w-3" />,
  'Patient Dashboard': <Activity className="h-3 w-3" />,
  NHIS: <ShieldCheck className="h-3 w-3" />,
  HMO: <ShieldCheck className="h-3 w-3" />,
  Cash: <Banknote className="h-3 w-3" />,
  USSD: <Smartphone className="h-3 w-3" />,
};

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────────────────────
export const DischargeDashboard = () => {
  const s = dischargeStats();
  return (
    <Layout title="Final Billing & Discharge Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="teal"   icon={FileCheck}     title="Active Discharges" value={String(s.todayCount + s.awaitingPayment)} subtitle={`${s.todayCount} today`} />
        <SummaryCard tone="amber"  icon={Wallet}        title="Awaiting Payment"  value={String(s.awaitingPayment)} />
        <SummaryCard tone="purple" icon={Scale}         title="Finance Clearance" value={String(s.awaitingFinance)} />
        <SummaryCard tone="rose"   icon={BadgeAlert}    title="In Dispute"        value={String(s.inDispute)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="hms-section p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/> Discharge Pipeline</h3>
            <Link to="/discharge/queue"><Button size="sm" variant="outline">View queue</Button></Link>
          </div>
          <div className="space-y-2">
            {dischargeCases.filter(d => d.stage !== 'COMPLETED').slice(0, 6).map(d => (
              <Link key={d.id} to={`/discharge/case/${d.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary text-xs font-bold">{d.bedNumber}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.patientName} <span className="text-xs text-muted-foreground">{d.id}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{d.ward} • {d.diagnosis}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold ${d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {d.balance > 0 ? `${formatNGN(d.balance)} due` : 'Settled'}
                  </span>
                  <StagePill stage={d.stage} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="hms-section p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Wallet className="h-4 w-4 text-emerald-600"/> Cash Position</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200">
              <div className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Total Billed</div>
              <div className="text-2xl font-bold font-display">{formatNGN(s.totalBilled)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-sky-50 ring-1 ring-blue-200">
              <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">Collected</div>
              <div className="text-2xl font-bold font-display text-blue-700">{formatNGN(s.totalCollected)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200">
              <div className="text-xs text-amber-700 font-medium uppercase tracking-wide">Outstanding</div>
              <div className="text-2xl font-bold font-display text-amber-700">{formatNGN(s.totalOutstanding)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="hms-section p-5">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><BedDouble className="h-4 w-4 text-sky-600"/> Beds Released Today</h4>
          <div className="text-3xl font-bold font-display">{s.bedsReleasedToday}</div>
          <p className="text-xs text-muted-foreground mt-1">Bed status auto-updated post-settlement.</p>
        </div>
        <div className="hms-section p-5">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> Completed Discharges</h4>
          <div className="text-3xl font-bold font-display">{s.completed}</div>
          <p className="text-xs text-muted-foreground mt-1">Fully closed and EMR-synced.</p>
        </div>
        <div className="hms-section p-5">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><RefreshCw className="h-4 w-4 text-purple-600"/> EMR Sync Health</h4>
          <div className="flex items-baseline gap-3">
            <div><div className="text-2xl font-bold font-display text-amber-700">{s.emrSyncPending}</div><div className="text-[10px] uppercase text-muted-foreground">Pending</div></div>
            <div><div className="text-2xl font-bold font-display text-red-700">{s.emrSyncFailed}</div><div className="text-[10px] uppercase text-muted-foreground">Failed</div></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. QUEUE
// ─────────────────────────────────────────────────────────────
export const DischargeQueuePage = () => {
  const [search, setSearch] = useState('');
  const list = dischargeCases.filter(d => d.stage !== 'COMPLETED' && (
    !search || d.patientName.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
  ));
  return (
    <Layout title="Discharge Queue">
      <div className="hms-section p-3 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient or discharge ID" className="pl-9"/>
        </div>
        <span className="text-xs text-muted-foreground">{list.length} cases</span>
      </div>
      <div className="space-y-3">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold">{d.patientName}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{d.id}</span>
                  <StagePill stage={d.stage} />
                  {d.isEmergency && <span className="badge-danger">Emergency</span>}
                  {d.flags.length > 0 && <span className="badge-warning">{d.flags.length} flag(s)</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{d.ward} • Bed {d.bedNumber} • {d.daysAdmitted} day(s) • {d.diagnosis}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div><div className="text-xs text-muted-foreground">Bill</div><div className="font-bold">{formatNGN(d.totalBill)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-emerald-700">{formatNGN(d.paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Balance</div><div className={`font-bold ${d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(d.balance)}</div></div>
              </div>
            </div>
            <div className="mt-3"><DischargeRibbon stage={d.stage} /></div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link to={`/discharge/case/${d.id}`}><Button size="sm">Open Case</Button></Link>
              {d.balance > 0 && <Button size="sm" variant="outline" onClick={() => toast.success('SMS pay link sent to patient')}><Send className="h-3 w-3 mr-1"/> Send Pay Link</Button>}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. BILL AGGREGATION
// ─────────────────────────────────────────────────────────────
export const BillAggregation = () => {
  const list = dischargeCases.filter(d => ['BILL_AGGREGATED','BILL_VALIDATED','PENDING_BILLING'].includes(d.stage));
  return (
    <Layout title="Final Bill Aggregation Engine">
      <div className="hms-section p-4 mb-4 flex items-start gap-3 bg-gradient-to-r from-teal-50 to-blue-50 ring-1 ring-teal-200">
        <Receipt className="h-5 w-5 text-teal-700 shrink-0 mt-0.5"/>
        <div className="text-sm">
          <p className="font-semibold text-teal-900">System-generated final bill</p>
          <p className="text-xs text-teal-800/80">All charges are auto-pulled from IPD ledger, pharmacy, lab, and procedures. Manual final-bill creation is disabled.</p>
        </div>
      </div>

      <div className="space-y-4">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold">{d.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{d.id}</span></h3>
                <p className="text-xs text-muted-foreground">{d.ward} / {d.bedNumber} • {d.daysAdmitted} day(s)</p>
              </div>
              <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="outline">View Case</Button></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(d.breakdown).map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-card border">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{k}</div>
                  <div className="font-bold">{formatNGN(v as number)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <div className="text-sm text-muted-foreground">{d.flags.length === 0 ? '✅ No anomalies detected' : `⚠️ ${d.flags.length} flag(s) raised`}</div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Final Bill</div>
                <div className="text-xl font-bold font-display">{formatNGN(d.totalBill)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 4. VALIDATION FLAGS (Anti-Manipulation Layer)
// ─────────────────────────────────────────────────────────────
export const ValidationFlags = () => {
  const flagged = dischargeCases.filter(d => d.flags.length > 0);
  return (
    <Layout title="Bill Validation — Anti-Manipulation Layer">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="rose"  icon={AlertTriangle} title="Critical Flags" value={String(flagged.flatMap(d => d.flags).filter(f => f.severity === 'CRITICAL').length)} />
        <SummaryCard tone="amber" icon={ShieldCheck}   title="Warnings"       value={String(flagged.flatMap(d => d.flags).filter(f => f.severity === 'WARNING').length)} />
        <SummaryCard tone="blue"  icon={Activity}      title="Info"           value={String(flagged.flatMap(d => d.flags).filter(f => f.severity === 'INFO').length)} />
        <SummaryCard tone="green" icon={CheckCircle2}  title="Cases Validated" value={String(dischargeCases.filter(d => d.validatedBy).length)} />
      </div>

      <div className="space-y-3">
        {flagged.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold">{d.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{d.id}</span></h3>
                <p className="text-xs text-muted-foreground">{d.diagnosis}</p>
              </div>
              <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="outline">Open Case</Button></Link>
            </div>
            <div className="space-y-2">
              {d.flags.map((f, i) => (
                <div key={i} className={`p-3 rounded-lg ring-1 flex items-start gap-3 ${
                  f.severity === 'CRITICAL' ? 'bg-red-50 ring-red-200' :
                  f.severity === 'WARNING'  ? 'bg-amber-50 ring-amber-200' :
                                              'bg-sky-50 ring-sky-200'
                }`}>
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                    f.severity === 'CRITICAL' ? 'text-red-600' :
                    f.severity === 'WARNING'  ? 'text-amber-600' : 'text-sky-600'
                  }`}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide">{f.type.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ring-1 font-semibold ${
                        f.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 ring-red-200' :
                        f.severity === 'WARNING'  ? 'bg-amber-100 text-amber-700 ring-amber-200' :
                                                    'bg-sky-100 text-sky-700 ring-sky-200'
                      }`}>{f.severity}</span>
                    </div>
                    <p className="text-sm mt-0.5">{f.description}</p>
                    {f.itemRef && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Item: {f.itemRef}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => toast.success('Flag acknowledged & logged')}>Acknowledge</Button>
                    <Button size="sm" onClick={() => toast.success('Adjustment logged (audit-trail preserved)')}>Adjust</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 5. PAYMENT COLLECTION
// ─────────────────────────────────────────────────────────────
export const PaymentCollection = () => {
  const list = dischargeCases.filter(d => d.balance > 0 && d.stage !== 'COMPLETED');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pay, setPay] = useState({ amount: 0, channel: 'POS' as PaymentChannel, ref: '' });
  const target = openId ? getDischargeById(openId) : null;
  return (
    <Layout title="Payment Collection — Multi-Channel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="amber" icon={Wallet}     title="Outstanding Cases" value={String(list.length)} />
        <SummaryCard tone="rose"  icon={Banknote}   title="Total Outstanding" value={formatNGN(list.reduce((s,d)=>s+d.balance,0))} />
        <SummaryCard tone="green" icon={CreditCard} title="Collected Today"   value={formatNGN(dischargeCases.flatMap(d=>d.payments).filter(p=>p.receivedAt.startsWith('2026-04-28')).reduce((s,p)=>s+p.amount,0))} />
        <SummaryCard tone="blue"  icon={Smartphone} title="SMS Links Sent"    value="14" subtitle="Today" />
      </div>

      <div className="space-y-3">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold">{d.patientName}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{d.id}</span>
                  <StagePill stage={d.stage}/>
                </div>
                <p className="text-xs text-muted-foreground">{d.ward} / {d.bedNumber} • Insurance: {d.insurance}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div><div className="text-xs text-muted-foreground">Bill</div><div className="font-bold">{formatNGN(d.totalBill)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-emerald-700">{formatNGN(d.paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Balance</div><div className="font-bold text-amber-700">{formatNGN(d.balance)}</div></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={() => { setOpenId(d.id); setPay({ amount: d.balance, channel: 'POS', ref: '' }); }}>
                <CreditCard className="h-3 w-3 mr-1"/> Record Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.success('SMS pay link sent')}><Smartphone className="h-3 w-3 mr-1"/> Send SMS Link</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success('Bank transfer instructions sent')}><Banknote className="h-3 w-3 mr-1"/> Transfer Details</Button>
              <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="ghost">View Case</Button></Link>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {target?.patientName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (₦)</Label><Input type="number" value={pay.amount} onChange={e => setPay({...pay, amount: +e.target.value})}/></div>
              <div><Label>Channel</Label>
                <Select value={pay.channel} onValueChange={v => setPay({...pay, channel: v as PaymentChannel})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {(['POS','SMS Link','Bank Transfer','Patient Dashboard','NHIS','HMO','Cash','USSD'] as PaymentChannel[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reference / Receipt #</Label><Input value={pay.ref} onChange={e => setPay({...pay, ref: e.target.value})} placeholder="POS-RCP-… or TRX-…"/></div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">All payments are auto-recorded against {target?.id} with reconciliation reference.</div>
          </div>
          <DialogFooter>
            <Button onClick={() => { toast.success(`Payment ${formatNGN(pay.amount)} recorded via ${pay.channel}`); setOpenId(null); }}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 6. FINANCE CLEARANCE
// ─────────────────────────────────────────────────────────────
export const FinanceClearance = () => {
  const list = dischargeCases.filter(d => d.stage === 'AWAITING_FINANCE' || (d.balance <= 0 && !d.financeApprovedBy && d.stage !== 'COMPLETED'));
  return (
    <Layout title="Finance Clearance — Government Control Layer">
      <div className="hms-section p-4 mb-4 flex items-start gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 ring-1 ring-purple-200">
        <Scale className="h-5 w-5 text-purple-700 shrink-0 mt-0.5"/>
        <div className="text-sm">
          <p className="font-semibold text-purple-900">Government oversight</p>
          <p className="text-xs text-purple-800/80">Finance officer must approve insurance verification, override justifications, and any waivers before discharge can complete.</p>
        </div>
      </div>

      <div className="space-y-3">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold">{d.patientName}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{d.id}</span>
                  <StagePill stage={d.stage}/>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ring-1 ring-purple-200 font-semibold">{d.insurance}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Bill {formatNGN(d.totalBill)} • Paid {formatNGN(d.paid)} • Balance <b className={d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}>{formatNGN(d.balance)}</b></p>
                {d.flags.length > 0 && <p className="text-xs text-amber-700 mt-1">⚠ {d.flags.length} validation flag(s) require finance review</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.error('Discharge blocked. Patient routed to billing desk.')}><XCircle className="h-3 w-3 mr-1"/> Block</Button>
                <Button size="sm" onClick={() => toast.success(`Finance approval granted for ${d.patientName}`)}><CheckCircle2 className="h-3 w-3 mr-1"/> Approve Discharge</Button>
                <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="ghost">Open Case</Button></Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 7. BED RELEASE
// ─────────────────────────────────────────────────────────────
export const BedReleasePage = () => {
  const ready = dischargeCases.filter(d => d.balance <= 0 && !d.bedReleased && d.stage !== 'COMPLETED');
  const blocked = dischargeCases.filter(d => d.balance > 0 && !d.bedReleased && d.stage !== 'COMPLETED');
  return (
    <Layout title="Bed Release — Anti-Ghost Occupancy">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  icon={CheckCircle2}  title="Ready to Release" value={String(ready.length)} />
        <SummaryCard tone="rose"   icon={XCircle}       title="Blocked (Unpaid)" value={String(blocked.length)} />
        <SummaryCard tone="blue"   icon={BedDouble}     title="Released Today"   value={String(dischargeStats().bedsReleasedToday)} />
        <SummaryCard tone="amber"  icon={AlertTriangle} title="Long-Stay Watch"  value="3" />
      </div>

      <div className="hms-section p-5 mb-4">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> Ready for Release</h3>
        {ready.length === 0 && <p className="text-sm text-muted-foreground">No beds ready for release.</p>}
        <div className="space-y-2">
          {ready.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
              <div>
                <div className="font-medium">{d.patientName} <span className="text-xs text-muted-foreground ml-1">({d.bedNumber} — {d.ward})</span></div>
                <div className="text-xs text-muted-foreground">Bill cleared • {d.daysAdmitted} day(s)</div>
              </div>
              <Button size="sm" onClick={() => toast.success(`Bed ${d.bedNumber} released. Ward occupancy updated.`)}><BedDouble className="h-3 w-3 mr-1"/> Release Bed</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="hms-section p-5">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600"/> Blocked — Outstanding Balance</h3>
        {blocked.length === 0 && <p className="text-sm text-muted-foreground">No blocked beds.</p>}
        <div className="space-y-2">
          {blocked.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50/40">
              <div>
                <div className="font-medium">{d.patientName} <span className="text-xs text-muted-foreground ml-1">({d.bedNumber})</span></div>
                <div className="text-xs text-amber-700">Outstanding {formatNGN(d.balance)}</div>
              </div>
              <div className="flex gap-2">
                <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="outline">Settle Balance</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => toast.warning('Emergency override logged for audit')}><Siren className="h-3 w-3 mr-1"/> Override</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 8. DISCHARGE SUMMARIES
// ─────────────────────────────────────────────────────────────
export const DischargeSummaries = () => {
  const list = dischargeCases.filter(d => d.summary);
  return (
    <Layout title="Discharge Summaries">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="indigo" icon={FileText}     title="Generated Summaries" value={String(list.length)} />
        <SummaryCard tone="green"  icon={CheckCircle2} title="EMR-Synced"          value={String(list.filter(d => d.emrSync === 'SYNCED').length)} />
        <SummaryCard tone="amber"  icon={RefreshCw}    title="Pending EMR"         value={String(list.filter(d => d.emrSync === 'PENDING').length)} />
        <SummaryCard tone="blue"   icon={Printer}      title="Printed Today"       value="6" />
      </div>

      <div className="space-y-4">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
              <div>
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600"/> {d.patientName}
                  <span className="text-xs font-mono text-muted-foreground ml-1">{d.id}</span>
                </h3>
                <p className="text-xs text-muted-foreground">{d.ward} • Discharged {d.summary?.generatedAt} • By {d.summary?.dischargedBy}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={d.emrSync === 'SYNCED' ? 'Synced' : d.emrSync === 'PENDING' ? 'Pending' : 'Failed'}/>
                <Button size="sm" variant="outline" onClick={() => toast.success('Summary printed')}><Printer className="h-3 w-3 mr-1"/> Print</Button>
              </div>
            </div>
            {d.summary && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30"><b>Diagnosis:</b> {d.summary.diagnosis}</div>
                <div className="p-3 rounded-lg bg-muted/30"><b>Reason for admission:</b> {d.summary.admissionReason}</div>
                <div className="p-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
                  <b className="text-emerald-900">Treatment given:</b>
                  <ul className="list-disc list-inside text-xs mt-1">{d.summary.treatmentGiven.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
                <div className="p-3 rounded-lg bg-sky-50 ring-1 ring-sky-200">
                  <b className="text-sky-900">Lab findings:</b>
                  <ul className="list-disc list-inside text-xs mt-1">{d.summary.labFindings.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 ring-1 ring-amber-200">
                  <b className="text-amber-900">Medications at discharge:</b>
                  <ul className="list-disc list-inside text-xs mt-1">{d.summary.medicationsAtDischarge.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 ring-1 ring-purple-200">
                  <b className="text-purple-900">Follow-up:</b> <span className="text-xs">{d.summary.followUp}</span>
                  <p className="text-xs mt-1">{d.summary.doctorNotes}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 9. EMR SYNC
// ─────────────────────────────────────────────────────────────
export const DischargeEmrSync = () => {
  const [online, setOnline] = useState(true);
  return (
    <Layout title="Discharge → EMR Sync">
      <div className="hms-section p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}/>
          <div>
            <div className="font-medium text-sm">EMR Endpoint: {online ? 'Online' : 'Offline (queueing locally)'}</div>
            <div className="text-xs text-muted-foreground">EMR is the legal medical archive for completed discharges.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><Switch checked={online} onCheckedChange={setOnline}/><Label className="!mb-0 text-xs">EMR Online</Label></div>
          <Button size="sm" variant="outline" onClick={() => toast.success('Retrying all failed discharge syncs')}><RefreshCw className="h-3 w-3 mr-1"/> Retry All Failed</Button>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Discharge</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Synced At</th><th className="text-left p-3">Status</th><th className="text-left p-3"></th></tr>
            </thead>
            <tbody>
              {dischargeCases.map(d => (
                <tr key={d.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{d.id}</td>
                  <td className="p-3"><div className="font-medium">{d.patientName}</div><div className="text-xs text-muted-foreground">{d.hospitalId}</div></td>
                  <td className="p-3 text-xs">{d.emrSyncedAt ?? '—'}</td>
                  <td className="p-3"><StatusBadge status={d.emrSync === 'SYNCED' ? 'Synced' : d.emrSync === 'PENDING' ? 'Pending' : 'Failed'}/></td>
                  <td className="p-3">{d.emrSync !== 'SYNCED' && <Button size="sm" variant="outline" onClick={() => toast.success(`Retrying sync for ${d.id}`)}>Retry</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 10. DISPUTES
// ─────────────────────────────────────────────────────────────
export const DischargeDisputes = () => {
  const list = dischargeCases.filter(d => d.stage === 'DISPUTE' || d.flags.some(f => f.severity === 'CRITICAL'));
  return (
    <Layout title="Billing Disputes">
      <div className="hms-section p-4 mb-4 flex items-start gap-3 bg-gradient-to-r from-rose-50 to-red-50 ring-1 ring-rose-200">
        <BadgeAlert className="h-5 w-5 text-rose-700 shrink-0 mt-0.5"/>
        <div className="text-sm">
          <p className="font-semibold text-rose-900">Audit-trail preserved</p>
          <p className="text-xs text-rose-800/80">Adjustments are logged, never deleted. Every change is attributable to an officer and timestamp.</p>
        </div>
      </div>
      <div className="space-y-3">
        {list.map(d => (
          <div key={d.id} className="hms-section p-5 border-l-4 border-l-red-500">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="font-display font-semibold">{d.patientName} <span className="text-xs font-mono text-muted-foreground ml-1">{d.id}</span></h3>
                <p className="text-xs text-muted-foreground">{d.ward} • Bill {formatNGN(d.totalBill)} • Disputed by patient/NOK</p>
                <ul className="text-xs mt-2 space-y-1">
                  {d.flags.map((f, i) => <li key={i}>• <b>{f.type.replace(/_/g, ' ')}:</b> {f.description}</li>)}
                </ul>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button size="sm" onClick={() => toast.success('Adjustment posted with full audit log')}>Post Adjustment</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Escalated to CMD office')}>Escalate</Button>
                <Link to={`/discharge/case/${d.id}`}><Button size="sm" variant="ghost">Open Case</Button></Link>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="hms-section p-10 text-center text-muted-foreground">No active disputes.</div>}
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 11. AUDIT TRAIL
// ─────────────────────────────────────────────────────────────
export const DischargeAuditTrail = () => {
  const all = useMemo(() =>
    dischargeCases.flatMap(d => d.audit.map(a => ({ ...a, caseId: d.id, patient: d.patientName })))
      .sort((a,b) => b.timestamp.localeCompare(a.timestamp))
  , []);
  return (
    <Layout title="Discharge Audit Trail">
      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Timestamp</th><th className="text-left p-3">Case</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {all.map((a, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 text-xs whitespace-nowrap">{a.timestamp}</td>
                  <td className="p-3 font-mono text-xs"><Link to={`/discharge/case/${a.caseId}`} className="hover:underline">{a.caseId}</Link></td>
                  <td className="p-3 text-xs">{a.patient}</td>
                  <td className="p-3 text-xs">{a.actor}</td>
                  <td className="p-3 text-xs">{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────────────────────────
// 12. CASE DETAIL — full discharge workspace
// ─────────────────────────────────────────────────────────────
export const DischargeCaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const d = id ? getDischargeById(id) : undefined;

  if (!d) return (
    <Layout title="Discharge case not found">
      <div className="hms-section p-10 text-center">
        <p className="text-muted-foreground mb-4">No discharge case for {id}.</p>
        <Button onClick={() => navigate('/discharge/queue')}><ArrowLeft className="h-4 w-4 mr-1"/> Back</Button>
      </div>
    </Layout>
  );

  return (
    <Layout title={`Discharge — ${d.patientName}`}>
      <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"><ArrowLeft className="h-3 w-3"/> Back</button>

      {/* Header */}
      <div className="hms-section p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(180_100%_38%)] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">
              <FileCheck className="h-6 w-6"/>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-xl">{d.patientName}</h2>
                <StagePill stage={d.stage}/>
                {d.isEmergency && <span className="badge-danger">Emergency</span>}
                <span className="badge-info">{d.outcome}</span>
              </div>
              <p className="text-sm text-muted-foreground">{d.hospitalId} • {d.age}/{d.gender} • {d.insurance}</p>
              <p className="text-sm mt-1"><b>Diagnosis:</b> {d.diagnosis}</p>
              <p className="text-xs text-muted-foreground">Doctor: {d.admittingDoctor} • {d.ward} / Bed {d.bedNumber} • {d.daysAdmitted} day(s)</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <div><div className="text-xs text-muted-foreground">Final Bill</div><div className="text-xl font-bold font-display">{formatNGN(d.totalBill)}</div></div>
            <div><div className="text-xs text-muted-foreground">Paid</div><div className="text-xl font-bold font-display text-emerald-700">{formatNGN(d.paid)}</div></div>
            <div><div className="text-xs text-muted-foreground">Balance</div><div className={`text-xl font-bold font-display ${d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(d.balance)}</div></div>
          </div>
        </div>
        <div className="mt-4"><DischargeRibbon stage={d.stage}/></div>
      </div>

      <Tabs defaultValue="bill">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="bill">Final Bill</TabsTrigger>
          <TabsTrigger value="flags">Validation</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Final Bill */}
        <TabsContent value="bill" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Receipt className="h-4 w-4 text-primary"/> Aggregated Final Bill</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(d.breakdown).map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg bg-card border">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{k}</div>
                <div className="font-bold">{formatNGN(v as number)}</div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-3 text-right">
            <div className="text-xs text-muted-foreground">Total (system-generated)</div>
            <div className="text-2xl font-bold font-display">{formatNGN(d.totalBill)}</div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button size="sm" variant="outline" onClick={() => toast.success('Final bill printed')}><Printer className="h-3 w-3 mr-1"/> Print Bill</Button>
            <Link to={`/ipd/admission/${d.admissionId}`}><Button size="sm" variant="ghost">View IPD Ledger</Button></Link>
          </div>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="flags" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-primary"/> Validation Flags</h3>
          {d.validatedBy && <p className="text-xs text-muted-foreground mb-3">Validated by <b>{d.validatedBy}</b> at {d.validatedAt}</p>}
          {d.flags.length === 0 ? <p className="text-sm text-emerald-700">✅ No anomalies detected. Bill is clean.</p> : (
            <div className="space-y-2">
              {d.flags.map((f, i) => (
                <div key={i} className={`p-3 rounded-lg ring-1 ${
                  f.severity === 'CRITICAL' ? 'bg-red-50 ring-red-200' :
                  f.severity === 'WARNING'  ? 'bg-amber-50 ring-amber-200' : 'bg-sky-50 ring-sky-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{f.type.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-semibold">{f.severity}</span>
                  </div>
                  <p className="text-sm">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><CreditCard className="h-4 w-4 text-primary"/> Payments</h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">When</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Reference</th><th className="text-left p-2">Received By</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Status</th></tr>
            </thead>
            <tbody>
              {d.payments.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 text-xs whitespace-nowrap">{p.receivedAt}</td>
                  <td className="p-2 text-xs"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{channelIcon[p.channel]} {p.channel}</span></td>
                  <td className="p-2 font-mono text-xs">{p.reference}</td>
                  <td className="p-2 text-xs">{p.receivedBy}</td>
                  <td className="p-2 text-right font-semibold">{formatNGN(p.amount)}</td>
                  <td className="p-2"><StatusBadge status={p.status === 'PAID' ? 'Paid' : p.status === 'PARTIAL' ? 'Partial' : p.status === 'FAILED' ? 'Failed' : 'Pending'}/></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 font-semibold">
              <tr><td colSpan={4} className="p-2 text-right">Paid</td><td className="p-2 text-right text-emerald-700">{formatNGN(d.paid)}</td><td/></tr>
              <tr><td colSpan={4} className="p-2 text-right">Balance</td><td className={`p-2 text-right ${d.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(d.balance)}</td><td/></tr>
            </tfoot>
          </table>
          {d.balance > 0 && (
            <div className="flex gap-2 justify-end mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success('SMS pay link sent')}><Smartphone className="h-3 w-3 mr-1"/> SMS Link</Button>
              <Button size="sm" onClick={() => toast.success(`Payment ${formatNGN(d.balance)} recorded`)}><CreditCard className="h-3 w-3 mr-1"/> Settle Balance</Button>
            </div>
          )}
        </TabsContent>

        {/* Finance */}
        <TabsContent value="finance" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Scale className="h-4 w-4 text-primary"/> Finance Clearance</h3>
          {d.financeApprovedBy ? (
            <div className="p-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 text-sm">
              ✅ Approved by <b>{d.financeApprovedBy}</b> at {d.financeApprovedAt}
              {d.financeNotes && <p className="text-xs mt-1">{d.financeNotes}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Finance officer must verify payment, insurance, and any overrides before discharge can proceed.</p>
              <Textarea placeholder="Officer notes (audit-logged)…"/>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => toast.error('Discharge blocked. Patient routed to billing desk.')}><XCircle className="h-3 w-3 mr-1"/> Block</Button>
                <Button onClick={() => toast.success('Finance approval granted')}><CheckCircle2 className="h-3 w-3 mr-1"/> Approve</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="hms-section p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/> Discharge Summary</h3>
            <div className="flex gap-2">
              {!d.summary && <Button size="sm" onClick={() => toast.success('Summary generated and ready for doctor signature')}><FilePlus2 className="h-3 w-3 mr-1"/> Generate Summary</Button>}
              {d.summary && <Button size="sm" variant="outline" onClick={() => toast.success('Summary printed')}><Printer className="h-3 w-3 mr-1"/> Print</Button>}
              {d.summary && d.emrSync !== 'SYNCED' && <Button size="sm" onClick={() => toast.success('Pushed to EMR')}><Send className="h-3 w-3 mr-1"/> Sync to EMR</Button>}
            </div>
          </div>
          {d.summary ? (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30"><b>Diagnosis:</b> {d.summary.diagnosis}</div>
                <div className="p-3 rounded-lg bg-muted/30"><b>Reason for admission:</b> {d.summary.admissionReason}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
                <b className="text-emerald-900">Treatment given</b>
                <ul className="list-disc list-inside text-sm mt-1">{d.summary.treatmentGiven.map(t => <li key={t}>{t}</li>)}</ul>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-sky-50 ring-1 ring-sky-200">
                  <b className="text-sky-900">Lab findings</b>
                  <ul className="list-disc list-inside text-sm mt-1">{d.summary.labFindings.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 ring-1 ring-amber-200">
                  <b className="text-amber-900">Medications at discharge</b>
                  <ul className="list-disc list-inside text-sm mt-1">{d.summary.medicationsAtDischarge.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 ring-1 ring-purple-200">
                <b className="text-purple-900">Follow-up:</b> {d.summary.followUp}
                <p className="text-sm mt-1">{d.summary.doctorNotes}</p>
              </div>
              <p className="text-xs text-muted-foreground">Signed by {d.summary.dischargedBy} at {d.summary.generatedAt}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No summary generated yet. Click <b>Generate Summary</b> to assemble one from the clinical chart.</p>
          )}
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><History className="h-4 w-4 text-primary"/> Audit Trail</h3>
          <div className="space-y-2">
            {d.audit.map((a, i) => (
              <div key={i} className="flex gap-3 text-sm border-l-2 border-primary/40 pl-3 py-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.timestamp}</span>
                <span className="text-xs font-medium">{a.actor}:</span>
                <span className="text-xs">{a.action}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer actions */}
      <div className="hms-section p-4 mt-4 flex flex-wrap gap-2 justify-end">
        {d.balance <= 0 && !d.bedReleased && d.financeApprovedBy && <Button onClick={() => toast.success(`Bed ${d.bedNumber} released`)}><BedDouble className="h-4 w-4 mr-1"/> Release Bed</Button>}
        {d.summary && d.emrSync !== 'SYNCED' && <Button variant="outline" onClick={() => toast.success('EMR sync queued')}><Send className="h-4 w-4 mr-1"/> Sync to EMR</Button>}
      </div>
    </Layout>
  );
};
