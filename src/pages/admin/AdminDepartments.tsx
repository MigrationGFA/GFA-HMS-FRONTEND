import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/data/dummyData';
import { useAdmin } from '@/contexts/AdminStore';
import { sameDepartment } from '@/data/adminData';
import { notify } from '@/lib/notify';
import { adminNav } from './nav';
import { useBillingRange, useLiveDepartments, useMoney } from './figures';
import { Panel, StatCards, tableHead, tableWrap } from './ui';

export function AdminDepartments() {
  const { id } = useParams();
  return id ? <Detail id={id} /> : <List />;
}

function List() {
  const departments = useLiveDepartments();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const rows = departments.filter((dept) => {
    const hay = `${dept.name} ${dept.head} ${dept.email}`.toLowerCase();
    return (status === 'All' || dept.status === status) && hay.includes(q.trim().toLowerCase());
  });
  const active = departments.filter((dept) => dept.status === 'Active').length;
  const waiting = departments.reduce((sum, dept) => sum + dept.waiting, 0);
  return (
    <DashboardLayout navItems={adminNav} title="Departments">
      <StatCards items={[
        { label: 'Departments', value: String(departments.length), sub: `${active} active` },
        { label: 'Live clinics', value: String(departments.filter((dept) => dept.liveKey).length), sub: 'Dental, Eye, Paediatrics' },
        { label: 'Waiting', value: String(waiting), sub: 'Across the directory' },
      ]} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search department, head, or email" className="max-w-sm bg-white" aria-label="Search departments" />
        <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" value={status} aria-label="Status" onChange={(event) => setStatus(event.target.value)}>
          <option>All</option><option>Active</option><option>Inactive</option>
        </select>
      </div>
      <div className={tableWrap}>
        <table className="w-full text-sm">
          <thead className={tableHead}><tr>{['Department', 'Head', 'Contact', 'Today', 'Waiting', 'Collected link', 'Staff on roster', 'Status'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>
            {rows.map((dept) => (
              <tr key={dept.id} className="border-t">
                <td className="p-2"><Link className="text-primary font-medium" to={`/dashboard/admin/departments/${dept.id}`}>{dept.name}</Link>{dept.liveKey && <div className="text-[10px] text-emerald-700">Live clinic counts</div>}</td>
                <td className="p-2">{dept.head}</td>
                <td className="p-2">{dept.phone}<div className="text-xs text-muted-foreground">{dept.email}</div></td>
                <td className="p-2">{dept.patientsToday}</td>
                <td className="p-2">{dept.waiting}</td>
                <td className="p-2"><Link className="text-primary" to={`/dashboard/admin/finance?department=${encodeURIComponent(dept.name)}`}>Finance</Link></td>
                <td className="p-2">{dept.staffOnDuty}</td>
                <td className="p-2">{dept.status}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No departments match.</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Detail({ id }: { id: string }) {
  const admin = useAdmin();
  const departments = useLiveDepartments();
  const dept = departments.find((row) => row.id === id);
  const span = useBillingRange();
  const { invoices, summary } = useMoney(span.from, span.to);
  const [tab, setTab] = useState('Overview');
  const [head, setHead] = useState(dept?.head ?? '');
  const [phone, setPhone] = useState(dept?.phone ?? '');
  const [email, setEmail] = useState(dept?.email ?? '');
  if (!dept) return <DashboardLayout navItems={adminNav} title="Department"><p>Department not found.</p></DashboardLayout>;
  const services = admin.state.services.filter((row) => row.department === dept.name);
  const staff = admin.state.staff.filter((row) => row.department === dept.name);
  const reports = admin.state.reports.filter((row) => row.department === dept.name);
  const issues = admin.state.issues.filter((row) => row.department === dept.name);
  const money = invoices.filter((row) => sameDepartment(row.department, dept.name));
  const billed = money.reduce((sum, row) => sum + row.amount, 0);
  const save = () => {
    const result = admin.saveDepartment(dept.id, { head, phone, email });
    if (!result.ok) notify.error('admin', result.message);
    else notify.success('admin', 'Department contact updated in this browser.');
  };
  const toggle = () => {
    const next = dept.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`${next === 'Inactive' ? 'Deactivate' : 'Enable'} ${dept.name}? Clinical screens are not switched off by this flag.`)) return;
    admin.saveDepartment(dept.id, { status: next });
    notify.success('admin', `${dept.name} is now ${next}.`);
  };
  const tabs = ['Overview', 'Services and pricing', 'Staff', 'Revenue and billing', 'Reports', 'Operational issues'];
  return (
    <DashboardLayout navItems={adminNav} title={dept.name}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{dept.name}</h2>
          <p className="text-sm text-muted-foreground">{dept.location} · {dept.status}{dept.liveKey ? ' · live clinic counts' : ' · demonstration activity'}</p>
        </div>
        <Button variant="outline" onClick={toggle}>{dept.status === 'Active' ? 'Deactivate' : 'Enable'}</Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">{tabs.map((item) => <Button key={item} size="sm" variant={tab === item ? 'default' : 'outline'} onClick={() => setTab(item)}>{item}</Button>)}</div>
      {tab === 'Overview' && (
        <div className="space-y-4">
          <StatCards items={[
            { label: 'Served today', value: String(dept.patientsToday) },
            { label: 'Waiting', value: String(dept.waiting) },
            { label: 'Completed', value: String(dept.completed) },
            { label: 'Beds', value: dept.bedsTotal ? `${dept.bedsOccupied}/${dept.bedsTotal}` : 'None', sub: `${dept.staffOnDuty} on the roster` },
          ]} />
          <Panel className="p-4 space-y-2 max-w-xl">
            <label className="text-sm block">Head<Input value={head} onChange={(event) => setHead(event.target.value)} className="bg-white" /></label>
            <label className="text-sm block">Phone<Input value={phone} onChange={(event) => setPhone(event.target.value)} className="bg-white" /></label>
            <label className="text-sm block">Email<Input value={email} onChange={(event) => setEmail(event.target.value)} className="bg-white" /></label>
            <Button onClick={save}>Save contact</Button>
          </Panel>
        </div>
      )}
      {tab === 'Services and pricing' && (
        <div className="space-y-2">{services.map((row) => <Panel key={row.id} className="p-3 text-sm flex justify-between"><span>{row.code} · {row.name}</span><span>{formatCurrency(row.price)} · {row.status}</span></Panel>)}{services.length === 0 && <Panel className="p-4 text-sm">No catalogue services for this name yet.</Panel>}</div>
      )}
      {tab === 'Staff' && (
        <div className="space-y-2">{staff.map((row) => <Panel key={row.id} className="p-3 text-sm">{row.name} · {row.role} · {row.status} · {row.shift}</Panel>)}{staff.length === 0 && <Panel className="p-4 text-sm">No staff are assigned to this department name.</Panel>}</div>
      )}
      {tab === 'Revenue and billing' && (
        <Panel className="p-4 text-sm space-y-2">
          <StatCards items={[
            { label: 'Billed', value: formatCurrency(billed), sub: 'Invoices matching this department' },
            { label: 'Hospital outstanding', value: formatCurrency(summary.outstanding), sub: 'Whole hospital in the billing period' },
          ]} />
          <p>These lines are the cashier invoices whose department name matches. They are not a second bill book.</p>
          <Link className="text-sky-700 font-medium" to={`/dashboard/admin/finance?department=${encodeURIComponent(dept.name)}`}>Open the invoice list</Link>
        </Panel>
      )}
      {tab === 'Reports' && <div className="space-y-2">{reports.map((row) => <Panel key={row.id} className="p-3 text-sm">{row.title} · {row.status}</Panel>)}{reports.length === 0 && <Panel className="p-4 text-sm">No report has been submitted.</Panel>}</div>}
      {tab === 'Operational issues' && <div className="space-y-2">{issues.map((row) => <Panel key={row.id} className="p-3 text-sm">{row.severity} · {row.title} · {row.status}</Panel>)}{issues.length === 0 && <Panel className="p-4 text-sm">No stored issue for this department.</Panel>}</div>}
    </DashboardLayout>
  );
}
