import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BedDouble, Bell,
  Brain, Building2, CheckCircle2, ClipboardList, CreditCard, DollarSign,
  Droplet, FileWarning, FlaskConical, Gauge, HeartPulse, LineChart as LineIcon,
  Pill, RefreshCw, ShieldAlert, ShieldCheck, Siren, Sparkles, Stethoscope,
  Timer, TrendingDown, TrendingUp, Users, Workflow, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { invoices, updatedAiInsights } from '@/data/invoiceData';
import { formatCurrency } from '@/data/dummyData';
import { syncEvents, channelHealth } from '@/data/emrSyncData';

// ============================================================
// CMD Executive Command Center
// ============================================================
const cmdNav = [
  { label: 'Executive Overview', path: '/dashboard/cmd', icon: <Gauge className="h-4 w-4" /> },
];

// ----- Synthetic, deterministic operational data -----
const revenueTrend30 = Array.from({ length: 30 }, (_, i) => {
  const base = 1_650_000 + Math.sin(i / 3) * 280_000 + (i * 22_000);
  const pending = base * (0.18 + Math.cos(i / 5) * 0.05);
  return {
    day: `${i + 1}`,
    revenue: Math.round(base),
    pending: Math.round(pending),
    target: 2_000_000,
  };
});

const todayHourly = [
  { h: '6a', patients: 4,  revenue: 65_000  },
  { h: '7a', patients: 12, revenue: 180_000 },
  { h: '8a', patients: 28, revenue: 420_000 },
  { h: '9a', patients: 41, revenue: 615_000 },
  { h: '10a', patients: 53, revenue: 740_000 },
  { h: '11a', patients: 47, revenue: 690_000 },
  { h: '12p', patients: 38, revenue: 540_000 },
  { h: '1p', patients: 30, revenue: 410_000 },
  { h: '2p', patients: 35, revenue: 470_000 },
  { h: '3p', patients: 22, revenue: 320_000 },
];

const departmentMetrics = [
  { dept: 'Surgery',           revenue: 14_820_000, patients: 38,  trend: +12, color: 'emerald' },
  { dept: 'Maternity',         revenue: 9_640_000,  patients: 64,  trend: +8,  color: 'emerald' },
  { dept: 'Radiology',         revenue: 7_380_000,  patients: 96,  trend: -6,  color: 'rose' },
  { dept: 'Internal Medicine', revenue: 6_120_000,  patients: 184, trend: +3,  color: 'sky' },
  { dept: 'Laboratory',        revenue: 4_980_000,  patients: 312, trend: +5,  color: 'sky' },
  { dept: 'Pharmacy',          revenue: 4_410_000,  patients: 268, trend: +2,  color: 'sky' },
  { dept: 'Pediatrics',        revenue: 2_680_000,  patients: 142, trend: -11, color: 'rose' },
];

const flowFunnel = [
  { stage: 'Registered',       count: 412, color: '#0ea5e9' },
  { stage: 'Awaiting Payment', count: 268, color: '#f59e0b' },
  { stage: 'In Consultation',  count: 184, color: '#14b8a6' },
  { stage: 'Lab / Pharmacy',   count: 121, color: '#8b5cf6' },
  { stage: 'Discharged',       count: 96,  color: '#10b981' },
];

const doctorPerf = [
  { name: 'Dr. Adebayo O.',     dept: 'Surgery',         seen: 18, revenue: 2_450_000, avg: 32, trend: +14 },
  { name: 'Dr. Bisi Akinwale',  dept: 'Internal Med.',   seen: 24, revenue: 1_180_000, avg: 18, trend: +6 },
  { name: 'Dr. Fatimah Ibrahim',dept: 'Laboratory',      seen: 41, revenue: 980_000,   avg: 9,  trend: +9 },
  { name: 'Dr. Aisha Bello',    dept: 'Radiology',       seen: 11, revenue: 1_640_000, avg: 28, trend: -8 },
  { name: 'Dr. Balogun K.',     dept: 'Maternity',       seen: 16, revenue: 2_120_000, avg: 36, trend: +11 },
  { name: 'Dr. Emeka Okafor',   dept: 'Internal Med.',   seen: 9,  revenue: 540_000,   avg: 41, trend: -15 },
];

const attendanceByDept = [
  { dept: 'Surgery',           rate: 94 },
  { dept: 'Maternity',         rate: 91 },
  { dept: 'Internal Medicine', rate: 88 },
  { dept: 'Laboratory',        rate: 86 },
  { dept: 'Pharmacy',          rate: 89 },
  { dept: 'Radiology',         rate: 68 },
  { dept: 'Pediatrics',        rate: 74 },
];

const paymentMix = [
  { name: 'POS',           value: 38, color: '#14b8a6' },
  { name: 'Bank Transfer', value: 24, color: '#0ea5e9' },
  { name: 'NHIS / HMO',    value: 18, color: '#8b5cf6' },
  { name: 'USSD / SMS',    value: 12, color: '#f59e0b' },
  { name: 'Cash',          value: 8,  color: '#64748b' },
];

const liveAlerts = [
  { id: 1, severity: 'critical', icon: Siren,        title: 'POS vs HMS mismatch', detail: '₦142,500 unreconciled on TERM-04 (last 2h)', when: '2 min ago' },
  { id: 2, severity: 'critical', icon: ShieldAlert,  title: 'Emergency unpaid consultations', detail: '6 consults bypassed billing gate today', when: '11 min ago' },
  { id: 3, severity: 'warning',  icon: AlertTriangle,title: 'Radiology attendance below 70%', detail: 'Only 8/12 staff clocked in', when: '34 min ago' },
  { id: 4, severity: 'warning',  icon: RefreshCw,    title: 'NHIS sync degraded', detail: '3 claim events retrying · last success 28 min ago', when: '38 min ago' },
  { id: 5, severity: 'info',     icon: TrendingUp,   title: 'Malaria test demand spike', detail: '+42% vs 7-day average', when: '1h ago' },
];

const recommendedActions = [
  { tone: 'rose',    title: 'Recover ₦8.4M from invoices >14 days', detail: '23 overdue invoices ready for SMS reminder + collections call.', cta: 'Open Finance Queue', to: '/dashboard/finance/invoices' },
  { tone: 'amber',   title: 'Investigate Radiology attendance', detail: '4 staff absent without leave. Trigger HR review.', cta: 'HR Attendance', to: '/dashboard/hr/attendance' },
  { tone: 'sky',     title: 'Increase lab capacity for Malaria', detail: 'Demand +42% — consider 2 extra technicians on PM shift.', cta: 'Lab Overview', to: '/lab' },
  { tone: 'teal',    title: 'Reconcile POS terminals', detail: 'TERM-04 mismatch ₦142,500 — run reconciliation engine.', cta: 'Reconciliation', to: '/billing/reconciliation' },
];

// ----- Helpers -----
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `₦${(n / 1_000).toFixed(0)}K`     : `₦${n}`;

const Trend = ({ value }: { value: number }) => {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon className="h-3 w-3" /> {up ? '+' : ''}{value}%
    </span>
  );
};

// Colorful KPI card
const KpiCard = ({
  tone, icon: Icon, label, value, subLabel, sub, trend, alert,
}: {
  tone: 'teal' | 'amber' | 'emerald' | 'rose' | 'violet' | 'sky';
  icon: any; label: string; value: string; subLabel?: string; sub?: string;
  trend?: number; alert?: boolean;
}) => {
  const tones: Record<string, string> = {
    teal:    'from-teal-500 to-cyan-600 text-white',
    amber:   'from-amber-400 to-orange-500 text-white',
    emerald: 'from-emerald-500 to-green-600 text-white',
    rose:    'from-rose-500 to-red-600 text-white',
    violet:  'from-violet-500 to-purple-600 text-white',
    sky:     'from-sky-500 to-blue-600 text-white',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${tones[tone]} shadow-md`}>
      <div className="absolute -right-4 -top-4 opacity-20">
        <Icon className="h-24 w-24" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider opacity-90 flex items-center gap-2">
            <Icon className="h-4 w-4" /> {label}
          </div>
          {alert && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 backdrop-blur uppercase font-semibold">Alert</span>}
        </div>
        <div className="mt-2 text-2xl md:text-3xl font-bold font-display">{value}</div>
        {subLabel && <div className="text-[11px] opacity-80 mt-0.5">{subLabel}</div>}
        <div className="mt-1 flex items-center gap-2 text-[11px] opacity-90">
          {sub && <span>{sub}</span>}
          {trend !== undefined && (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend >= 0 ? '+' : ''}{trend}% vs last period
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
interface ExecutiveOverviewProps {
  navItems?: { label: string; path: string; icon: React.ReactNode }[];
  title?: string;
  greeting?: string;
}

export const ExecutiveOverviewBody = ({
  navItems = cmdNav,
  title = 'CMD Executive Command Center',
  greeting = 'Good morning, Chief Medical Director',
}: ExecutiveOverviewProps) => {
  const [range, setRange] = useState<'today' | '7d' | '30d'>('30d');

  // ---- Aggregations ----
  const totals = useMemo(() => {
    const totalRevenue = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const totalPending = invoices.reduce((s, i) => s + i.balance, 0);
    const totalBilled  = totalRevenue + totalPending;
    const collRate     = totalBilled ? Math.round((totalRevenue / totalBilled) * 100) : 0;
    const paidCount    = invoices.filter(i => i.paymentStatus === 'Paid').length;
    const overdue14    = Math.round(totalPending * 0.62);
    const overdue30    = Math.round(totalPending * 0.34);
    return { totalRevenue, totalPending, totalBilled, collRate, paidCount, overdue14, overdue30 };
  }, []);

  // Period-scaled numbers for KPI cards
  const periodRevenue =
    range === 'today' ? 4_280_000 :
    range === '7d'    ? 28_640_000 :
                        128_400_000;
  const periodTrend =
    range === 'today' ? +9 : range === '7d' ? +6 : +14;

  const beds = { occupied: 132, total: 180, icuOcc: 14, icuTotal: 18 };
  const bedPct = Math.round((beds.occupied / beds.total) * 100);
  const icuPct = Math.round((beds.icuOcc / beds.icuTotal) * 100);

  // EMR sync KPIs from sync data
  const syncCounts = syncEvents.reduce((a, e) => {
    a[e.status] = (a[e.status] ?? 0) + 1;
    return a;
  }, {} as Record<string, number>);
  const syncSuccess = Math.round(((syncCounts.SYNCED ?? 0) / Math.max(syncEvents.length, 1)) * 100);

  return (
    <DashboardLayout navItems={navItems} title={title}>
      {/* ===== HEADER STRIP ===== */}
      <div className="mb-6 rounded-2xl p-5 bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70 flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Live · GFA HMS Command Center
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mt-1">{greeting}</h2>
            <p className="text-sm opacity-80 mt-1">
              Hospital is running at <b>{bedPct}% bed occupancy</b> with{' '}
              <b className="text-emerald-300">{syncSuccess}% sync health</b>. {liveAlerts.filter(a => a.severity === 'critical').length} critical alerts need attention.
            </p>
          </div>
          <Tabs value={range} onValueChange={v => setRange(v as any)}>
            <TabsList className="bg-white/10 border border-white/15">
              <TabsTrigger value="today" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Today</TabsTrigger>
              <TabsTrigger value="7d"    className="data-[state=active]:bg-white data-[state=active]:text-slate-900">7 days</TabsTrigger>
              <TabsTrigger value="30d"   className="data-[state=active]:bg-white data-[state=active]:text-slate-900">30 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ===== TOP KPIs ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard tone="teal"    icon={DollarSign}  label="Revenue"          value={fmtShort(periodRevenue)}    subLabel={`${range.toUpperCase()} collected`} trend={periodTrend} />
        <KpiCard tone="amber"   icon={Timer}       label="Pending Revenue"  value={fmtShort(totals.totalPending)} subLabel={`${Math.round((totals.totalPending / Math.max(totals.totalBilled,1))*100)}% of billed`} alert />
        <KpiCard tone="emerald" icon={CheckCircle2}label="Collection Rate"  value={`${totals.collRate}%`}      subLabel={`${totals.paidCount}/${invoices.length} invoices paid`} trend={+4} />
        <KpiCard tone="rose"    icon={Droplet}     label="Revenue Leakage"  value={fmtShort(642_500)}          subLabel="POS & emergency unpaid" trend={-2} alert />
        <KpiCard tone="violet"  icon={Users}       label="Patients"         value="1,284"                       subLabel={`${range === 'today' ? '412 today · 86 waiting' : 'Active · 86 waiting'}`} trend={+7} />
        <KpiCard tone="sky"     icon={BedDouble}   label="Bed Occupancy"    value={`${bedPct}%`}                subLabel={`${beds.occupied}/${beds.total} beds · ICU ${icuPct}%`} />
      </div>

      {/* ===== REVENUE ANALYTICS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold flex items-center gap-2"><LineIcon className="h-4 w-4 text-primary" /> Revenue trend (30 days)</h3>
              <p className="text-xs text-muted-foreground">Collected vs pending vs daily target</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{fmtShort(periodRevenue)}</div>
              <Trend value={periodTrend} />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend30} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => `${v / 1_000_000}M`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmtShort(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} fill="url(#rev)" name="Collected" />
                <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#pend)" name="Pending" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment mix + today */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment channel mix</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {paymentMix.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
            {paymentMix.map(p => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                <span className="text-foreground">{p.name}</span>
                <span className="text-muted-foreground ml-auto">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== DEPARTMENT PERFORMANCE ===== */}
      <div className="bg-card rounded-2xl border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Department performance</h3>
            <p className="text-xs text-muted-foreground">Revenue contribution and trend (last 30 days) — green=growing, red=needs review</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {departmentMetrics.map(d => {
            const totalRev = departmentMetrics.reduce((s, x) => s + x.revenue, 0);
            const pct = Math.round((d.revenue / totalRev) * 100);
            const tones: Record<string, { bar: string; ring: string; chip: string }> = {
              emerald: { bar: 'bg-emerald-500', ring: 'ring-emerald-200', chip: 'bg-emerald-50 text-emerald-700' },
              rose:    { bar: 'bg-rose-500',    ring: 'ring-rose-200',    chip: 'bg-rose-50 text-rose-700' },
              sky:     { bar: 'bg-sky-500',     ring: 'ring-sky-200',     chip: 'bg-sky-50 text-sky-700' },
            };
            const t = tones[d.color];
            return (
              <div key={d.dept} className={`p-3 rounded-xl bg-card ring-1 ${t.ring}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{d.dept}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.chip} font-medium`}>{pct}%</span>
                </div>
                <div className="mt-1 text-lg font-bold text-foreground">{fmtShort(d.revenue)}</div>
                <div className="text-[11px] text-muted-foreground">{d.patients} patients · {fmtShort(Math.round(d.revenue / d.patients))} avg</div>
                <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className={`h-full ${t.bar}`} style={{ width: `${pct * 3}%`, maxWidth: '100%' }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">vs last period</span>
                  <Trend value={d.trend} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== LEAKAGE & RISK + ALERTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl border bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2 text-rose-800">
              <ShieldAlert className="h-4 w-4" /> Revenue leakage &amp; financial risk
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200 uppercase font-semibold">Attention required</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Unpaid invoices',      value: fmtShort(totals.totalPending), sub: `${invoices.filter(i => i.paymentStatus !== 'Paid').length} invoices`, tone: 'rose' },
              { label: 'Overdue >14 days',     value: fmtShort(totals.overdue14),    sub: '23 invoices',                                                            tone: 'amber' },
              { label: 'Overdue >30 days',     value: fmtShort(totals.overdue30),    sub: '11 invoices',                                                            tone: 'rose' },
              { label: 'Emergency unpaid',     value: '6 visits',                    sub: `≈ ${fmtShort(184_000)} exposure`,                                        tone: 'amber' },
              { label: 'POS ↔ HMS mismatch',   value: fmtShort(142_500),             sub: 'TERM-04 last 2h',                                                        tone: 'rose' },
              { label: 'Unbilled services',    value: '14 detected',                 sub: 'Lab + Pharmacy auto-scan',                                               tone: 'amber' },
              { label: 'Failed POS settlements',value:'3',                            sub: 'NIBSS retrying',                                                         tone: 'amber' },
              { label: 'NHIS claim rejections',value: '2',                           sub: `≈ ${fmtShort(86_000)}`,                                                  tone: 'rose' },
            ].map((r, i) => {
              const tones: Record<string, string> = {
                rose:  'bg-rose-50 ring-rose-200 text-rose-900',
                amber: 'bg-amber-50 ring-amber-200 text-amber-900',
              };
              return (
                <div key={i} className={`p-3 rounded-xl ring-1 ${tones[r.tone]}`}>
                  <div className="text-[11px] uppercase tracking-wider opacity-80">{r.label}</div>
                  <div className="text-lg font-bold mt-1">{r.value}</div>
                  <div className="text-[11px] opacity-80">{r.sub}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/finance/invoices"><Button size="sm" variant="outline">Open overdue invoices</Button></Link>
            <Link to="/billing/reconciliation"><Button size="sm" variant="outline">Run reconciliation</Button></Link>
            <Link to="/billing/audit"><Button size="sm" variant="outline">Audit trail</Button></Link>
          </div>
        </div>

        {/* Alerts panel */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Live alerts</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200 font-semibold">{liveAlerts.filter(a => a.severity === 'critical').length} critical</span>
          </div>
          <ul className="space-y-2">
            {liveAlerts.map(a => {
              const tone =
                a.severity === 'critical' ? 'bg-rose-50 ring-rose-200 text-rose-900' :
                a.severity === 'warning'  ? 'bg-amber-50 ring-amber-200 text-amber-900' :
                                            'bg-sky-50 ring-sky-200 text-sky-900';
              return (
                <li key={a.id} className={`p-2.5 rounded-lg ring-1 ${tone} flex items-start gap-2`}>
                  <a.icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight">{a.title}</div>
                    <div className="text-xs opacity-80 truncate">{a.detail}</div>
                  </div>
                  <span className="text-[10px] opacity-70 whitespace-nowrap">{a.when}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ===== AI INSIGHTS + RECOMMENDED ACTIONS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Brain className="h-4 w-4 text-violet-600" /> AI insights</h3>
          <ul className="space-y-2">
            {[
              { icon: TrendingUp,  tone: 'emerald', title: 'Top revenue driver: Surgery',         detail: '₦14.8M (38 patients) — +12% vs last 30 days.' },
              { icon: Sparkles,    tone: 'sky',     title: 'Most demanded service: Malaria Test', detail: '312 tests this period · ₦4.98M revenue impact.' },
              { icon: TrendingDown,tone: 'rose',    title: 'Pediatrics performance dip',          detail: '−11% revenue · attendance 74% · investigate scheduling.' },
              { icon: ShieldAlert, tone: 'amber',   title: 'Possible fraud signal',               detail: '6 emergency overrides clustered on TERM-04 today.' },
              { icon: Activity,    tone: 'violet',  title: 'Operational hotspot',                 detail: 'Lab turnaround 38min (target 25min) — bottleneck on PM shift.' },
            ].map((ins, i) => {
              const tones: Record<string, string> = {
                emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-200',
                sky:     'text-sky-600 bg-sky-50 ring-sky-200',
                rose:    'text-rose-600 bg-rose-50 ring-rose-200',
                amber:   'text-amber-600 bg-amber-50 ring-amber-200',
                violet:  'text-violet-600 bg-violet-50 ring-violet-200',
              };
              return (
                <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/70 ring-1 ring-border">
                  <span className={`p-1.5 rounded-lg ring-1 ${tones[ins.tone]}`}><ins.icon className="h-3.5 w-3.5" /></span>
                  <div>
                    <div className="text-sm font-semibold">{ins.title}</div>
                    <div className="text-xs text-muted-foreground">{ins.detail}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-amber-500" /> Recommended actions</h3>
          <ul className="space-y-2.5">
            {recommendedActions.map((r, i) => {
              const tones: Record<string, string> = {
                rose:  'border-l-rose-500 bg-rose-50/40',
                amber: 'border-l-amber-500 bg-amber-50/40',
                sky:   'border-l-sky-500 bg-sky-50/40',
                teal:  'border-l-teal-500 bg-teal-50/40',
              };
              return (
                <li key={i} className={`p-3 border-l-4 rounded-r-lg ring-1 ring-border ${tones[r.tone]} flex items-start justify-between gap-3`}>
                  <div>
                    <div className="text-sm font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                  <Link to={r.to}><Button size="sm" variant="outline">{r.cta}</Button></Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ===== STAFF PERFORMANCE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Stethoscope className="h-4 w-4 text-primary" /> Doctor productivity (today)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Doctor</th>
                  <th className="text-left py-2">Dept</th>
                  <th className="text-right py-2">Seen</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Avg time</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doctorPerf.map(d => (
                  <tr key={d.name} className="hover:bg-muted/40">
                    <td className="py-2 font-medium">{d.name}</td>
                    <td className="py-2 text-xs text-muted-foreground">{d.dept}</td>
                    <td className="py-2 text-right">{d.seen}</td>
                    <td className="py-2 text-right font-semibold">{fmtShort(d.revenue)}</td>
                    <td className="py-2 text-right text-xs">{d.avg} min</td>
                    <td className="py-2 text-right"><Trend value={d.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" /> Attendance by department</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceByDept} layout="vertical" margin={{ left: 30, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 10 }} width={90} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
                  {attendanceByDept.map((d, i) => (
                    <Cell key={i} fill={d.rate < 75 ? '#f43f5e' : d.rate < 88 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs flex items-start gap-2 p-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 text-rose-800">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span><b>Radiology attendance below 70% threshold.</b> Trigger HR review.</span>
          </div>
        </div>
      </div>

      {/* ===== OPERATIONAL FLOW + SYSTEM HEALTH ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Funnel */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Workflow className="h-4 w-4 text-primary" /> Patient flow pipeline (today)</h3>
          <div className="space-y-2">
            {flowFunnel.map((f, i) => {
              const max = flowFunnel[0].count;
              const w = Math.max(15, Math.round((f.count / max) * 100));
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-muted-foreground shrink-0">{f.stage}</div>
                  <div className="flex-1 h-9 rounded-lg bg-muted/40 overflow-hidden relative">
                    <div className="h-full rounded-lg flex items-center justify-end px-3 text-white text-sm font-semibold transition-all"
                         style={{ width: `${w}%`, background: f.color }}>
                      {f.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
            {[
              { icon: Timer,        label: 'Avg wait time',      value: '24 min', tone: 'sky' },
              { icon: FlaskConical, label: 'Lab turnaround',     value: '38 min', tone: 'amber' },
              { icon: Pill,         label: 'Pharmacy delay',     value: '12 min', tone: 'emerald' },
              { icon: HeartPulse,   label: 'Avg consult time',   value: '21 min', tone: 'sky' },
            ].map((m, i) => {
              const tones: Record<string, string> = {
                sky:     'bg-sky-50 text-sky-700 ring-sky-200',
                amber:   'bg-amber-50 text-amber-700 ring-amber-200',
                emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
              };
              return (
                <div key={i} className={`p-2 rounded-lg ring-1 ${tones[m.tone]} flex items-center gap-2`}>
                  <m.icon className="h-4 w-4" />
                  <div>
                    <div className="text-[10px] uppercase opacity-80">{m.label}</div>
                    <div className="font-semibold">{m.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System health */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-primary" /> System health</h3>
          <div className="space-y-2">
            {channelHealth.map(c => (
              <div key={c.target} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div>
                  <div className="text-sm font-semibold">{c.target}</div>
                  <div className="text-[10px] text-muted-foreground">{c.uptimePct}% · {c.avgLatencyMs}ms</div>
                </div>
                <StatusBadge status={c.status === 'UP' ? 'Active' : c.status === 'DEGRADED' ? 'Warning' : 'Down'} />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
              <div className="text-[10px] text-emerald-700 uppercase">Sync OK</div>
              <div className="text-base font-bold text-emerald-800">{syncSuccess}%</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 ring-1 ring-amber-200">
              <div className="text-[10px] text-amber-700 uppercase">Retry</div>
              <div className="text-base font-bold text-amber-800">{(syncCounts.RETRY ?? 0) + (syncCounts.PENDING ?? 0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 ring-1 ring-rose-200">
              <div className="text-[10px] text-rose-700 uppercase">Failed</div>
              <div className="text-base font-bold text-rose-800">{(syncCounts.FAILED ?? 0) + (syncCounts.DEAD_LETTER ?? 0)}</div>
            </div>
          </div>
          <div className="mt-3">
            <Link to="/sync"><Button size="sm" variant="outline" className="w-full"><RefreshCw className="h-4 w-4 mr-1" /> Open Sync Console</Button></Link>
          </div>
        </div>
      </div>

      {/* ===== TODAY HOURLY SNAPSHOT ===== */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Today's hourly pulse</h3>
            <p className="text-xs text-muted-foreground">Patients seen and revenue collected per hour</p>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={todayHourly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="h" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => `${v / 1000}K`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="patients" name="Patients" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="r" dataKey="revenue"  name="Revenue (₦)" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Thin wrapper preserving original export
export const CmdOverview = () => <ExecutiveOverviewBody />;