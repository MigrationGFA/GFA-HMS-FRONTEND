import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Bed, Briefcase,
  CheckCircle2, Crown, FileWarning, Gauge, HeartPulse, LineChart as LineIcon, Lock,
  Scale, ShieldAlert, ShieldCheck, Sparkles, Stethoscope, Target, TrendingDown,
  TrendingUp, Users, Wallet, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar, RadialBarChart,
} from 'recharts';
import { formatCurrency } from '@/data/dummyData';

// ============================================================
// BOARD-LEVEL EXECUTIVE DASHBOARD — GFA HMS Board of Governors
// Strategic, summarized, decision-grade insights only
// ============================================================
const boardNav = [
  { label: 'Board Overview', path: '/dashboard/board', icon: <Crown className="h-4 w-4" /> },
];

// ----- Strategic, deterministic data (12-month horizon) -----
const monthLabels = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
const revenueByMonth = monthLabels.map((m, i) => {
  const base = 320_000_000 + i * 14_500_000 + Math.sin(i / 2.2) * 22_000_000;
  return {
    month: m,
    revenue: Math.round(base),
    cost:    Math.round(base * (0.78 - i * 0.004)),
    target:  Math.round(380_000_000 + i * 12_000_000),
  };
});

const quarterly = [
  { q: 'Q1 25/26', revenue: 1_080_000_000, target: 1_140_000_000 },
  { q: 'Q2 25/26', revenue: 1_240_000_000, target: 1_260_000_000 },
  { q: 'Q3 25/26', revenue: 1_410_000_000, target: 1_350_000_000 },
  { q: 'Q4 25/26', revenue: 1_565_000_000, target: 1_450_000_000 },
];

const departmentMix = [
  { dept: 'Surgery',           value: 1_840_000_000, share: 31, trend: +12, color: '#10b981', risk: 'overdep' },
  { dept: 'Maternity',         value:   920_000_000, share: 16, trend: +8,  color: '#06b6d4' },
  { dept: 'Internal Medicine', value:   780_000_000, share: 13, trend: +3,  color: '#3b82f6' },
  { dept: 'Radiology',         value:   620_000_000, share: 11, trend: -6,  color: '#f59e0b' },
  { dept: 'Laboratory',        value:   540_000_000, share: 9,  trend: +18, color: '#8b5cf6' },
  { dept: 'Pharmacy',          value:   460_000_000, share: 8,  trend: +5,  color: '#ec4899' },
  { dept: 'Pediatrics',        value:   380_000_000, share: 6,  trend: +2,  color: '#14b8a6' },
  { dept: 'Other',             value:   360_000_000, share: 6,  trend: +1,  color: '#94a3b8' },
];

const collectionMix = [
  { name: 'POS / Card', value: 38, color: '#0ea5e9' },
  { name: 'Bank Transfer', value: 27, color: '#10b981' },
  { name: 'NHIS / HMO', value: 19, color: '#8b5cf6' },
  { name: 'Cash', value: 11, color: '#f59e0b' },
  { name: 'USSD / SMS', value: 5,  color: '#ec4899' },
];

const leakage = {
  unpaidTotal: 184_500_000,
  buckets: [
    { age: '0-7 d',  amount: 42_000_000, count: 184, color: 'bg-emerald-500' },
    { age: '8-14 d', amount: 38_500_000, count: 132, color: 'bg-amber-500' },
    { age: '15-30 d',amount: 51_000_000, count:  96, color: 'bg-orange-500' },
    { age: '> 30 d', amount: 53_000_000, count:  64, color: 'bg-rose-600' },
  ],
  emergencyUnpaid: 18_400_000,
  posMismatch:      6_200_000,
  unbilledServices: 9_800_000,
};

const qualityKpis = [
  { label: 'Avg Wait Time',        value: '34 min', target: '< 30 min', status: 'amber',   icon: HeartPulse, delta: '-4 min' },
  { label: 'Readmission Rate',     value: '6.2%',   target: '< 7%',     status: 'green',   icon: Activity,   delta: '-0.4 pp' },
  { label: 'Mortality Rate',       value: '1.8%',   target: '< 2%',     status: 'green',   icon: ShieldCheck,delta: '-0.1 pp' },
  { label: 'Lab Turnaround',       value: '2h 12m', target: '< 2h',     status: 'amber',   icon: Zap,        delta: '+12 min' },
  { label: 'Patient Satisfaction', value: '4.3 / 5',target: '> 4.0',    status: 'green',   icon: Sparkles,   delta: '+0.2' },
  { label: 'Complaints (mo)',      value: '38',     target: '< 50',     status: 'green',   icon: FileWarning,delta: '-9' },
];

const patientVolumeTrend = monthLabels.map((m, i) => ({
  month: m,
  outpatient: 6_400 + i * 240 + Math.round(Math.sin(i / 2) * 350),
  inpatient:  820  + i * 24  + Math.round(Math.cos(i / 2) * 60),
  emergency:  410  + i * 18,
}));

const opEfficiency = [
  { metric: 'Patient Flow Time',  current: 142, target: 120, unit: 'min' },
  { metric: 'Appointment Util.',  current: 78,  target: 85,  unit: '%' },
  { metric: 'Bed Turnover',       current: 4.2, target: 5.0, unit: 'days' },
  { metric: 'Billing Cycle',      current: 38,  target: 24,  unit: 'min' },
];

const bottlenecks = [
  { area: 'Lab — Microbiology',    delay: '+48 min', severity: 'high'   },
  { area: 'Billing — Cashier #3',  delay: '+22 min', severity: 'medium' },
  { area: 'Pharmacy — Out-Pt',     delay: '+18 min', severity: 'medium' },
  { area: 'Radiology MRI',         delay: '+9 min',  severity: 'low'    },
];

const workforce = [
  { dept: 'Surgery',           attendance: 94, gap: 0,  performance: 'top'   },
  { dept: 'Maternity',         attendance: 91, gap: 2,  performance: 'top'   },
  { dept: 'Internal Medicine', attendance: 88, gap: 1,  performance: 'good'  },
  { dept: 'Pediatrics',        attendance: 85, gap: 3,  performance: 'good'  },
  { dept: 'Pharmacy',          attendance: 82, gap: 2,  performance: 'good'  },
  { dept: 'Laboratory',        attendance: 79, gap: 4,  performance: 'watch' },
  { dept: 'Radiology',         attendance: 68, gap: 5,  performance: 'low'   },
  { dept: 'Records',           attendance: 64, gap: 3,  performance: 'low'   },
];

const forecast = monthLabels.slice(6).concat(['May','Jun','Jul']).map((m, i) => {
  const actual = i < 6 ? revenueByMonth[i + 6].revenue : null;
  const forecasted = Math.round(450_000_000 + i * 22_000_000 + Math.sin(i / 2) * 18_000_000);
  return { month: m, actual, forecast: forecasted, optimistic: Math.round(forecasted * 1.12), conservative: Math.round(forecasted * 0.88) };
});

const serviceDemandTrends = [
  { svc: 'Malaria Tests',         change: +25, label: 'Lab demand', color: 'emerald' },
  { svc: 'Antenatal Care',        change: +14, label: 'Maternity',  color: 'emerald' },
  { svc: 'MRI Scans',             change: +9,  label: 'Radiology',  color: 'sky' },
  { svc: 'Cardiology Consults',   change: +6,  label: 'Cardiology', color: 'sky' },
  { svc: 'Routine Surgery',       change: -4,  label: 'Surgery',    color: 'amber' },
  { svc: 'Pediatric Immunization',change: -8,  label: 'Pediatrics', color: 'rose' },
];

const compliance = {
  emrSyncFailures: 14,
  unauthorizedAttempts: 7,
  accessLogsToday: 4_182,
  billingIrregularities: 3,
  paymentsNotRecorded: 2,
  consultsWithoutBilling: 5,
  lastAudit: '2026-03-12',
  rating: 'A-',
};

const boardAlerts = [
  { level: 'critical', title: '₦53M unpaid > 30 days',          detail: 'Concentrated in NHIS claims & 3 corporate accounts. Recommend escalation to Finance Sub-Committee.', action: 'Review Leakage' },
  { level: 'critical', title: 'Radiology underperforming',       detail: 'Revenue down 6%, attendance at 68%. MRI service line at risk.', action: 'Workforce Review' },
  { level: 'high',     title: 'Surgery contributes 31% revenue', detail: 'Overdependence risk. Recommend diversification through Lab & Maternity expansion.', action: 'Strategic Review' },
  { level: 'high',     title: 'Lab demand up 25% MoM',           detail: 'Capacity at 92%. Recommend equipment upgrade in Q2 budget.', action: 'CapEx Approval' },
  { level: 'medium',   title: '14 EMR sync failures (week)',     detail: 'Mostly Records dept. Affects audit compliance.', action: 'IT Briefing' },
];

const recommendedDecisions = [
  { icon: Wallet,    title: 'Approve recovery taskforce',  detail: 'Target ₦53M overdue NHIS receivables in Q2.',                priority: 'high' },
  { icon: Users,     title: 'Increase Radiology staffing', detail: '3 radiographers needed; lift attendance to ≥ 85%.',          priority: 'high' },
  { icon: Sparkles,  title: 'Expand lab capacity',         detail: '+25% MoM demand. Approve 2 analyzers in capital plan.',      priority: 'medium' },
  { icon: Scale,     title: 'Tighten billing enforcement', detail: '5 unbilled consultations & 3 anomalies logged this month.',  priority: 'medium' },
  { icon: Briefcase, title: 'Diversify revenue mix',       detail: 'Reduce Surgery dependence from 31% → < 25% within 12 months.', priority: 'medium' },
];

// ============================================================
// UI Helpers
// ============================================================
const StatusDot = ({ status }: { status: 'green' | 'amber' | 'red' }) => (
  <span className={`inline-block h-2 w-2 rounded-full ring-2 ring-offset-1 ${
    status === 'green' ? 'bg-emerald-500 ring-emerald-200' :
    status === 'amber' ? 'bg-amber-500 ring-amber-200' :
    'bg-rose-500 ring-rose-200'
  }`} />
);

const Trend = ({ value, suffix = '%' }: { value: number; suffix?: string }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
    {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {Math.abs(value)}{suffix}
  </span>
);

const KpiCard = ({ icon: Icon, label, value, sub, trend, status, gradient }: any) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
    <div className="relative">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        {status && <StatusDot status={status} />}
      </div>
      <p className="text-[11px] uppercase tracking-widest opacity-80 mt-3">{label}</p>
      <p className="font-display font-bold text-2xl mt-1">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] opacity-80">{sub}</p>
        {typeof trend === 'number' && <Trend value={trend} />}
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, badge, accent, children, action }: any) => (
  <div className="bg-card border rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent || 'bg-primary/10 text-primary'}`}>
          <Icon className="h-4 w-4" />
        </div>}
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const fmtN = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`;
const fmtNB = (n: number) => `₦${(n / 1_000_000_000).toFixed(2)}B`;

// ============================================================
// MAIN
// ============================================================
export const BoardOverview = () => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('quarter');

  const periodMultiplier = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
  const totalRevenue = 480_000_000 * periodMultiplier;
  const totalPatients = 8_900 * periodMultiplier;
  const collectionRate = 86.4;
  const occupancy = 78;
  const avgRevPerPatient = totalRevenue / totalPatients;

  return (
    <DashboardLayout navItems={boardNav} title="Board Executive Dashboard">
      {/* ===================== HEADER ===================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 mb-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute right-32 bottom-0 h-32 w-32 rounded-full bg-indigo-500/30 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <p className="text-xs uppercase tracking-widest opacity-80">Board of Governors</p>
            </div>
            <h2 className="font-display font-bold text-3xl mt-1">Strategic Hospital Intelligence</h2>
            <p className="text-sm opacity-80 mt-1">GFA HMS • Lagos, Nigeria • FY 2025–2026</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur border border-emerald-400/30">
                <ShieldCheck className="h-3 w-3" /> Audit Rating: {compliance.rating}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur">
                <Activity className="h-3 w-3" /> Last refresh: just now
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30">
                <AlertTriangle className="h-3 w-3" /> {boardAlerts.filter(a => a.level === 'critical').length} critical alerts
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-lg bg-white/10 backdrop-blur p-1 text-xs">
              {(['month','quarter','year'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${period === p ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[10px] opacity-70">Period: {period === 'month' ? 'Last 30 days' : period === 'quarter' ? 'Last 90 days' : 'Last 12 months'}</p>
          </div>
        </div>
      </div>

      {/* ===================== 1. EXECUTIVE KPI ===================== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KpiCard icon={Banknote}    label="Total Revenue"       value={fmtNB(totalRevenue)}        sub="vs last period"  trend={+12} status="green" gradient="bg-gradient-to-br from-emerald-600 to-teal-700" />
        <KpiCard icon={Target}      label="Collection Rate"     value={`${collectionRate}%`}       sub="target ≥ 90%"     trend={+2}  status="amber" gradient="bg-gradient-to-br from-sky-600 to-indigo-700" />
        <KpiCard icon={ShieldAlert} label="Revenue Leakage"     value={fmtN(leakage.unpaidTotal)}  sub="unpaid invoices"  trend={+6}  status="red"   gradient="bg-gradient-to-br from-rose-600 to-red-700" />
        <KpiCard icon={Users}       label="Patients Served"     value={totalPatients.toLocaleString()} sub="vs last period" trend={+9} status="green" gradient="bg-gradient-to-br from-violet-600 to-fuchsia-700" />
        <KpiCard icon={Bed}         label="Bed Occupancy"       value={`${occupancy}%`}            sub="optimal 75–85%"   trend={+3}  status="green" gradient="bg-gradient-to-br from-amber-600 to-orange-700" />
        <KpiCard icon={Wallet}      label="Avg Revenue / Pt."   value={formatCurrency(Math.round(avgRevPerPatient))} sub="vs last period" trend={+4} status="green" gradient="bg-gradient-to-br from-cyan-600 to-blue-700" />
      </div>

      {/* ===================== 2. FINANCIAL PERFORMANCE ===================== */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <SectionCard title="Revenue vs Cost (12 months)" icon={LineIcon} accent="bg-emerald-500/10 text-emerald-600" badge="Profitability">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtN(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#rev)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="cost"    stroke="#f43f5e" fill="url(#cst)" strokeWidth={2} name="Cost" />
              <Line type="monotone" dataKey="target"  stroke="#0ea5e9" strokeDasharray="5 5" strokeWidth={2} name="Target" dot={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
              <p className="text-muted-foreground">Margin</p><p className="font-bold text-emerald-700 dark:text-emerald-400">22.4%</p>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-2">
              <p className="text-muted-foreground">YoY Growth</p><p className="font-bold text-sky-700 dark:text-sky-400">+18%</p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
              <p className="text-muted-foreground">Target Hit</p><p className="font-bold text-amber-700 dark:text-amber-400">8 / 12 mo</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Department Revenue Mix" icon={Briefcase} accent="bg-violet-500/10 text-violet-600" badge="Concentration">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={departmentMix} dataKey="value" nameKey="dept" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {departmentMix.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtN(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {departmentMix.slice(0, 5).map(d => (
              <div key={d.dept} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 truncate">{d.dept}</span>
                <span className="font-semibold">{d.share}%</span>
                <Trend value={d.trend} />
              </div>
            ))}
          </div>
          {departmentMix[0].share > 28 && (
            <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Surgery contributes {departmentMix[0].share}% — overdependence risk.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quarterly Performance" icon={TrendingUp} accent="bg-sky-500/10 text-sky-600">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={quarterly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="q" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtNB(v)} />
              <Bar dataKey="target"  fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Target" />
              <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Actual" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-2 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Q4 exceeded target by ₦115M (+8%).
          </div>
        </SectionCard>
      </div>

      {/* ===================== 3. LEAKAGE & RISK ===================== */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50 to-orange-50 dark:from-rose-950/30 dark:via-rose-950/20 dark:to-orange-950/30 border border-rose-200 dark:border-rose-900 p-5 mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center"><ShieldAlert className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display font-bold text-foreground">Revenue Leakage & Financial Risk</h3>
              <p className="text-xs text-muted-foreground">Most critical board concern — review monthly</p>
            </div>
          </div>
          <Badge className="bg-rose-600 text-white">HIGH RISK</Badge>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl bg-white dark:bg-card border border-rose-200 dark:border-rose-900 p-4">
            <p className="text-[11px] uppercase text-muted-foreground font-semibold">Total Unpaid</p>
            <p className="font-display font-bold text-2xl text-rose-600 mt-1">{fmtN(leakage.unpaidTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">476 invoices outstanding</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-card border border-rose-200 dark:border-rose-900 p-4">
            <p className="text-[11px] uppercase text-muted-foreground font-semibold">Emergency Unpaid</p>
            <p className="font-display font-bold text-2xl text-rose-600 mt-1">{fmtN(leakage.emergencyUnpaid)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">A&E consultations</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-card border border-amber-200 dark:border-amber-900 p-4">
            <p className="text-[11px] uppercase text-muted-foreground font-semibold">POS ↔ HMS Mismatch</p>
            <p className="font-display font-bold text-2xl text-amber-600 mt-1">{fmtN(leakage.posMismatch)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Reconciliation gap</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-card border border-amber-200 dark:border-amber-900 p-4">
            <p className="text-[11px] uppercase text-muted-foreground font-semibold">Unbilled Services</p>
            <p className="font-display font-bold text-2xl text-amber-600 mt-1">{fmtN(leakage.unbilledServices)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Detected by audit engine</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Aging buckets</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {leakage.buckets.map(b => (
              <div key={b.age} className="bg-white dark:bg-card rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{b.age}</span>
                  <span className={`h-2 w-2 rounded-full ${b.color}`} />
                </div>
                <p className="font-display font-bold text-lg mt-1">{fmtN(b.amount)}</p>
                <p className="text-[10px] text-muted-foreground">{b.count} invoices</p>
                <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className={`h-full ${b.color}`} style={{ width: `${(b.amount / 60_000_000) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== 4. PATIENT & CLINICAL QUALITY ===================== */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <SectionCard title="Patient Volume Trend" icon={Users} accent="bg-fuchsia-500/10 text-fuchsia-600" badge="12 months">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={patientVolumeTrend}>
              <defs>
                <linearGradient id="op" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                <linearGradient id="ip" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
                <linearGradient id="er" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area dataKey="outpatient" stroke="#8b5cf6" fill="url(#op)" name="Outpatient" stackId="1" />
              <Area dataKey="inpatient"  stroke="#0ea5e9" fill="url(#ip)" name="Inpatient"  stackId="1" />
              <Area dataKey="emergency"  stroke="#f43f5e" fill="url(#er)" name="Emergency"  stackId="1" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Clinical Quality KPIs" icon={Stethoscope} accent="bg-emerald-500/10 text-emerald-600" badge="Care quality">
          <div className="grid grid-cols-2 gap-2">
            {qualityKpis.map(k => (
              <div key={k.label} className="rounded-xl border p-3 hover:shadow-sm transition">
                <div className="flex items-start justify-between">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <k.icon className="h-4 w-4 text-foreground/70" />
                  </div>
                  <StatusDot status={k.status as any} />
                </div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold mt-2">{k.label}</p>
                <p className="font-display font-bold text-base">{k.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">{k.target}</p>
                  <span className={`text-[10px] font-semibold ${k.status === 'green' ? 'text-emerald-600' : k.status === 'amber' ? 'text-amber-600' : 'text-rose-600'}`}>{k.delta}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Collection Channel Mix" icon={Wallet} accent="bg-cyan-500/10 text-cyan-600">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={collectionMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                {collectionMix.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {collectionMix.map(c => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="font-semibold">{c.value}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ===================== 5. OPERATIONAL EFFICIENCY (SUMMARY) ===================== */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Operational Efficiency Summary" icon={Gauge} accent="bg-indigo-500/10 text-indigo-600" badge="Summary only">
          <div className="space-y-3">
            {opEfficiency.map(m => {
              const pct = Math.min(100, (m.target / m.current) * 100);
              const ok = m.metric === 'Appointment Util.' ? m.current >= m.target : m.current <= m.target;
              return (
                <div key={m.metric}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{m.metric}</span>
                    <span className={`font-semibold ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {m.current}{m.unit} <span className="text-muted-foreground font-normal">/ target {m.target}{m.unit}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Top Bottlenecks" icon={AlertTriangle} accent="bg-amber-500/10 text-amber-600">
          <div className="space-y-2">
            {bottlenecks.map(b => (
              <div key={b.area} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    b.severity === 'high' ? 'bg-rose-500/15 text-rose-600' :
                    b.severity === 'medium' ? 'bg-amber-500/15 text-amber-600' :
                    'bg-sky-500/15 text-sky-600'
                  }`}><Zap className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-semibold">{b.area}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{b.severity} severity</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-rose-600">{b.delay}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ===================== 6. WORKFORCE INSIGHTS ===================== */}
      <SectionCard title="Workforce & Department Performance" icon={Users} accent="bg-teal-500/10 text-teal-600" badge="Board view">
        <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={workforce} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="attendance" radius={[0, 6, 6, 0]}>
                {workforce.map((w, i) => (
                  <Cell key={i} fill={w.attendance >= 85 ? '#10b981' : w.attendance >= 75 ? '#f59e0b' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs">
            <p className="text-emerald-700 dark:text-emerald-400 font-semibold">Top performers</p>
            <p className="text-foreground">Surgery, Maternity</p>
          </div>
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-3 text-xs">
            <p className="text-rose-700 dark:text-rose-400 font-semibold">High absenteeism</p>
            <p className="text-foreground">Radiology (68%), Records (64%)</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
            <p className="text-amber-700 dark:text-amber-400 font-semibold">Critical gap</p>
            <p className="text-foreground">Radiology — 5 vacancies</p>
          </div>
          <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3 text-xs">
            <p className="text-sky-700 dark:text-sky-400 font-semibold">Hospital avg.</p>
            <p className="text-foreground">81.4% attendance</p>
          </div>
        </div>
      </SectionCard>

      {/* ===================== 7. STRATEGIC TRENDS & FORECAST ===================== */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6 mb-6">
        <div className="lg:col-span-2">
          <SectionCard title="Revenue Forecast (Next Quarter)" icon={LineIcon} accent="bg-indigo-500/10 text-indigo-600" badge="Predictive">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v ? fmtN(v) : '—'} />
                <Line dataKey="actual"      stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Actual" />
                <Line dataKey="forecast"    stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Forecast" />
                <Line dataKey="optimistic"  stroke="#10b981" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Optimistic" />
                <Line dataKey="conservative" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Conservative" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-2.5">
                <p className="text-muted-foreground">Q1 Forecast</p><p className="font-bold text-violet-700 dark:text-violet-400">₦1.68B</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
                <p className="text-muted-foreground">Best case</p><p className="font-bold text-emerald-700 dark:text-emerald-400">₦1.88B</p>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5">
                <p className="text-muted-foreground">Conservative</p><p className="font-bold text-rose-700 dark:text-rose-400">₦1.48B</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Service Demand Shifts" icon={TrendingUp} accent="bg-fuchsia-500/10 text-fuchsia-600" badge="MoM">
          <div className="space-y-2">
            {serviceDemandTrends.map(s => (
              <div key={s.svc} className="flex items-center gap-3 p-2.5 rounded-lg border">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  s.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-600' :
                  s.color === 'sky' ? 'bg-sky-500/15 text-sky-600' :
                  s.color === 'amber' ? 'bg-amber-500/15 text-amber-600' :
                  'bg-rose-500/15 text-rose-600'
                }`}>
                  {s.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{s.svc}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
                <Trend value={s.change} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ===================== 8. COMPLIANCE & GOVERNANCE ===================== */}
      <SectionCard title="Compliance & Governance" icon={Lock} accent="bg-slate-500/15 text-slate-600" badge={`Audit ${compliance.rating}`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: 'EMR Sync Failures',    v: compliance.emrSyncFailures,        s: 'amber',  i: Activity,    sub: 'this week' },
            { l: 'Unauthorized Attempts', v: compliance.unauthorizedAttempts,   s: 'red',    i: ShieldAlert, sub: 'blocked by IT' },
            { l: 'Access Logs Today',     v: compliance.accessLogsToday.toLocaleString(), s: 'green', i: ShieldCheck, sub: 'all signed' },
            { l: 'Billing Irregularities',v: compliance.billingIrregularities,  s: 'amber',  i: FileWarning, sub: 'flagged for review' },
            { l: 'Payments Not Recorded', v: compliance.paymentsNotRecorded,    s: 'red',    i: Wallet,      sub: 'reconcile urgently' },
            { l: 'Consults w/o Billing',  v: compliance.consultsWithoutBilling, s: 'amber',  i: FileWarning, sub: 'this month' },
            { l: 'Last Audit',            v: compliance.lastAudit,              s: 'green',  i: CheckCircle2,sub: 'external' },
            { l: 'Audit Rating',          v: compliance.rating,                 s: 'green',  i: ShieldCheck, sub: 'A- (good)' },
          ].map(c => (
            <div key={c.l} className="rounded-xl border p-3">
              <div className="flex items-start justify-between">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  c.s === 'green' ? 'bg-emerald-500/15 text-emerald-600' :
                  c.s === 'amber' ? 'bg-amber-500/15 text-amber-600' :
                  'bg-rose-500/15 text-rose-600'
                }`}><c.i className="h-4 w-4" /></div>
                <StatusDot status={c.s as any} />
              </div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mt-2">{c.l}</p>
              <p className="font-display font-bold text-lg">{c.v}</p>
              <p className="text-[10px] text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ===================== 9. BOARD ALERTS & DECISIONS ===================== */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-orange-600 text-white p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display font-bold">Immediate Attention Required</h3>
              <p className="text-xs opacity-80">Board must act on these in next session</p>
            </div>
          </div>
          <div className="space-y-2">
            {boardAlerts.map((a, i) => (
              <div key={i} className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge className={`text-[9px] uppercase ${
                        a.level === 'critical' ? 'bg-rose-700 text-white' :
                        a.level === 'high' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'
                      }`}>{a.level}</Badge>
                    </div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-xs opacity-90 mt-0.5">{a.detail}</p>
                  </div>
                  <Button size="sm" variant="secondary" className="shrink-0 text-xs h-7">{a.action}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display font-bold">Recommended Decisions</h3>
              <p className="text-xs opacity-80">AI-curated from current metrics</p>
            </div>
          </div>
          <div className="space-y-2">
            {recommendedDecisions.map((d, i) => (
              <div key={i} className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/20 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <d.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm">{d.title}</p>
                    <Badge className={`text-[9px] uppercase ${d.priority === 'high' ? 'bg-rose-500' : 'bg-amber-500'} text-white`}>{d.priority}</Badge>
                  </div>
                  <p className="text-xs opacity-90">{d.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="w-full mt-3 text-xs">Generate Board Brief PDF</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BoardOverview;
