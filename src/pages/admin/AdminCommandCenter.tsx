import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BedDouble, Bell, Building2, CheckCircle2, DollarSign, Timer, Users } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/data/dummyData';
import { useAdmin } from '@/contexts/AdminStore';
import { sameDepartment } from '@/data/adminData';
import { adminNav } from './nav';
import { useBillingRange, useLiveDepartments, useMoney } from './figures';
import { Panel } from './ui';

const COLORS = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b', '#e11d48'];

function short(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return formatCurrency(n);
}

export function AdminOverview() {
  const admin = useAdmin();
  const span = useBillingRange();
  const [from, setFrom] = useState(span.from);
  const [to, setTo] = useState(span.to);
  const { invoices, summary } = useMoney(from, to);
  const departments = useLiveDepartments();
  const active = departments.filter((dept) => dept.status === 'Active');
  const pendingReports = admin.state.reports.filter((row) => row.status === 'Submitted' || row.status === 'Under Review' || row.status === 'Needs Clarification').length;
  const openIssues = admin.state.issues.filter((row) => row.status !== 'Closed');
  const onDuty = admin.state.staff.filter((row) => row.status === 'Active' && row.shift !== 'Not assigned').length;
  const waiting = active.reduce((sum, dept) => sum + dept.waiting, 0);
  const seen = active.reduce((sum, dept) => sum + dept.completed, 0);
  const registered = active.reduce((sum, dept) => sum + dept.patientsToday, 0);
  const occupied = active.reduce((sum, dept) => sum + dept.bedsOccupied, 0);
  const beds = active.reduce((sum, dept) => sum + dept.bedsTotal, 0);
  const discharged = departments.find((dept) => dept.id === 'DEP-NUR')?.completed ?? 0;

  const trend = useMemo(() => {
    const map = new Map<string, { day: string; revenue: number; pending: number }>();
    invoices.forEach((row) => {
      const day = row.createdAt.slice(0, 10);
      const current = map.get(day) ?? { day, revenue: 0, pending: 0 };
      current.revenue += row.amountPaid;
      current.pending += row.balance;
      map.set(day, current);
    });
    return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [invoices]);

  const mix = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((row) => {
      if (!row.amountPaid) return;
      const name = row.channelUsed || 'Unspecified';
      map.set(name, (map.get(name) ?? 0) + row.amountPaid);
    });
    const rows = [...map.entries()].map(([name, value]) => ({ name, value }));
    const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
    return rows.map((row) => ({ ...row, pct: Math.round((row.value / total) * 100) }));
  }, [invoices]);

  const cards = [
    { label: 'Registered today', value: String(registered), sub: 'Includes demonstration counts', to: '/dashboard/admin/operations', tone: 'from-sky-500 to-blue-600' },
    { label: 'Seen today', value: String(seen), sub: 'Completed visits in the period view below are separate', to: '/dashboard/admin/operations', tone: 'from-emerald-500 to-green-600' },
    { label: 'Waiting', value: String(waiting), sub: 'Queues across departments', to: '/dashboard/admin/operations', tone: 'from-amber-400 to-orange-500' },
    { label: 'Beds occupied', value: beds ? `${occupied}/${beds}` : '—', sub: 'Paediatric beds are live. Other wards are demonstration figures.', to: '/dashboard/admin/operations?view=beds', tone: 'from-violet-500 to-purple-600' },
    { label: 'Discharges', value: String(discharged), sub: 'Nursing demonstration count', to: '/dashboard/admin/operations', tone: 'from-teal-500 to-cyan-600' },
    { label: 'Staff on duty', value: `${onDuty}/${admin.state.staff.length}`, sub: 'Demonstration roster, not a clock-in', to: '/dashboard/admin/staff', tone: 'from-sky-500 to-blue-600' },
    { label: 'Billed', value: short(summary.billed), sub: 'Gross amount on invoices', to: '/dashboard/admin/finance', tone: 'from-teal-500 to-cyan-600' },
    { label: 'Net collections', value: short(summary.net), sub: `Gross ${short(summary.gross)} · refunds ${short(summary.refunds)}`, to: '/dashboard/admin/finance', tone: 'from-emerald-500 to-green-600' },
    { label: 'Outstanding', value: short(summary.outstanding), sub: 'Unpaid balance, not revenue', to: '/dashboard/admin/finance?status=outstanding', tone: 'from-rose-500 to-red-600' },
    { label: 'Reports to review', value: String(pendingReports), sub: 'Submitted, in review, or sent back', to: '/dashboard/admin/reports', tone: 'from-amber-400 to-orange-500' },
  ];

  return (
    <DashboardLayout navItems={adminNav} title="Admin Executive Overview">
      <div className="mb-6 rounded-2xl p-5 bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70">GFA HMS · Admin Officer</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mt-1">Welcome back, Administrator</h2>
            <p className="text-sm opacity-80 mt-1">
              {occupied} beds shown as occupied. {openIssues.length} open administrative items. Money figures come from the billing records, not from a separate estimate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs">From<input type="date" className="block mt-1 h-9 rounded-md px-2 text-slate-900" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="text-xs">To<input type="date" className="block mt-1 h-9 rounded-md px-2 text-slate-900" value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <Button size="sm" variant="secondary" onClick={() => { setFrom(span.from); setTo(span.to); }}>Billing period</Button>
            <Button size="sm" variant="secondary" onClick={() => { setFrom(admin.today); setTo(admin.today); }}>Today</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={`rounded-2xl p-4 bg-gradient-to-br ${card.tone} text-white shadow-md`}>
            <div className="text-xs uppercase tracking-wider opacity-90">{card.label}</div>
            <div className="mt-2 text-2xl font-bold font-display">{card.value}</div>
            <div className="text-[11px] opacity-80 mt-1">{card.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Panel className="lg:col-span-2 p-5">
          <h3 className="font-display font-semibold">Collections and outstanding balances</h3>
          <p className="text-xs text-muted-foreground mb-3">Each point is a day in the selected billing range. An empty chart means no invoices fall in those dates.</p>
          {trend.length === 0 ? <p className="text-sm text-muted-foreground py-16 text-center">No invoices in this period.</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="revenue" name="Net collected" stroke="#14b8a6" fill="#14b8a633" />
                  <Area type="monotone" dataKey="pending" name="Outstanding" stroke="#f59e0b" fill="#f59e0b33" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel className="p-5">
          <h3 className="font-display font-semibold mb-3">Payment channel mix</h3>
          {mix.length === 0 ? <p className="text-sm text-muted-foreground">No collections in this period.</p> : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                      {mix.map((row, index) => <Cell key={row.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-xs space-y-1">{mix.map((row, index) => <li key={row.name} className="flex justify-between"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{row.name}</span><span>{row.pct}%</span></li>)}</ul>
            </>
          )}
          <p className="text-[11px] text-slate-500 mt-3">Discounts are ₦0 because the billing record has no discount field. Refunds {formatCurrency(summary.refunds)} are already removed from net collections.</p>
        </Panel>
      </div>

      <Panel className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Department performance</h3>
          <Link to="/dashboard/admin/departments" className="text-sm text-primary">All departments</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {active.map((dept) => {
            const moneyRows = invoices.filter((row) => sameDepartment(row.department, dept.name));
            const collected = moneyRows.reduce((sum, row) => sum + row.amountPaid, 0);
            return (
              <Link key={dept.id} to={`/dashboard/admin/departments/${dept.id}`} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-sky-400">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{dept.name}</div>
                  {dept.liveKey && <span className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-1.5">Live</span>}
                </div>
                <div className="mt-1 text-lg font-bold">{collected ? short(collected) : '₦0'} collected</div>
                <div className="text-[11px] text-muted-foreground">{dept.patientsToday} served · {dept.waiting} waiting · {dept.staffOnDuty} on the roster</div>
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Dental, Eye, and Paediatrics patient counts come from those departments. Other counts are labelled demonstration activity and do not change when a clinic list changes.</p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2 p-5">
          <h3 className="font-display font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> What the money labels mean</h3>
          <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-3"><div className="text-xs uppercase text-sky-800">Billed</div><div className="text-lg font-bold">{formatCurrency(summary.billed)}</div></div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><div className="text-xs uppercase text-emerald-800">Gross collected</div><div className="text-lg font-bold">{formatCurrency(summary.gross)}</div></div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3"><div className="text-xs uppercase text-amber-800">Refunds</div><div className="text-lg font-bold">{formatCurrency(summary.refunds)}</div></div>
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-3"><div className="text-xs uppercase text-teal-800">Net collections</div><div className="text-lg font-bold">{formatCurrency(summary.net)}</div></div>
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3"><div className="text-xs uppercase text-rose-800">Outstanding</div><div className="text-lg font-bold">{formatCurrency(summary.outstanding)}</div></div>
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3"><div className="text-xs uppercase text-violet-800">Discounts</div><div className="text-lg font-bold">{formatCurrency(summary.discounts)}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/billing"><Button size="sm" variant="outline">Open paypoint</Button></Link>
            <Link to="/dashboard/admin/finance"><Button size="sm" variant="outline">Invoice list</Button></Link>
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Bell className="h-4 w-4" /> Administrative items</h3>
          <ul className="space-y-2">
            {openIssues.length === 0 && <li className="text-sm text-muted-foreground">No open items.</li>}
            {openIssues.map((issue) => (
              <li key={issue.id}>
                <Link to={issue.href} className="block p-3 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-300">
                  <div className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" /> {issue.title}</div>
                  <div className="text-xs text-muted-foreground">{issue.severity} · {issue.detail}</div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1"><Timer className="h-3 w-3 mt-0.5" /> These are administrative follow-ups. They are not clinical emergencies.</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><Users className="h-3 w-3" /> Staff {admin.state.staff.length} · <BedDouble className="h-3 w-3" /> see beds · <CheckCircle2 className="h-3 w-3" /> {invoices.length} invoices in range</p>
        </Panel>
      </div>
      <div className="mt-4">
        <Button variant="outline" onClick={() => { admin.resetDemoData(); }}>Reset admin demo data</Button>
      </div>
    </DashboardLayout>
  );
}
