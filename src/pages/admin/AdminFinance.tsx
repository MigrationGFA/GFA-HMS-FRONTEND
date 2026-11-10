import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/data/dummyData';
import { useAdmin } from '@/contexts/AdminStore';
import { useBillingStore } from '@/contexts/BillingStore';
import { billingSpan, filterByDay, invoiceDay, refundsFromAudit, sameDepartment, summariseMoney } from '@/data/adminData';
import { adminNav } from './nav';
import { Panel, StatCards, tableHead, tableWrap } from './ui';

export function AdminFinance() {
  const admin = useAdmin();
  const billing = useBillingStore();
  const span = billingSpan(billing.invoices, admin.today);
  const [params] = useSearchParams();
  const location = useLocation();
  const statusParam = params.get('status');
  const departmentParam = params.get('department');
  const [from, setFrom] = useState(span.from);
  const [to, setTo] = useState(span.to);
  const [department, setDepartment] = useState(departmentParam ?? 'All');
  const [status, setStatus] = useState(statusParam === 'outstanding' ? 'Outstanding' : 'All');
  const [method, setMethod] = useState('All');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setStatus(statusParam === 'outstanding' ? 'Outstanding' : 'All');
    setDepartment(departmentParam ?? 'All');
    setPage(1);
  }, [statusParam, departmentParam, location.pathname]);
  const invoices = useMemo(() => filterByDay(billing.invoices, from, to).filter((row) => {
    const outstanding = status === 'Outstanding' ? row.balance > 0 : status === 'All' || row.status === status;
    return outstanding && (department === 'All' || sameDepartment(row.department, department)) && (method === 'All' || (row.channelUsed ?? 'None') === method);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [billing.invoices, from, to, department, status, method]);
  const refunds = refundsFromAudit(billing.audit.filter((row) => row.timestamp.slice(0, 10) >= from && row.timestamp.slice(0, 10) <= to).map((row) => row.action));
  const summary = summariseMoney(invoices, refunds);
  const methods = ['All', ...new Set(billing.invoices.map((row) => row.channelUsed || 'None'))];
  const slice = invoices.slice((page - 1) * 8, page * 8);
  const [patient, setPatient] = useState('');
  const [phone, setPhone] = useState('08012345678');
  const [serviceId, setServiceId] = useState(admin.state.services[0]?.id ?? '');
  const service = admin.state.services.find((row) => row.id === serviceId);

  const create = () => {
    if (!patient.trim() || !service) return;
    const created = billing.createInvoice({
      patientName: patient.trim(),
      hospitalId: 'GFA HMS/2026/00999',
      phone,
      department: service.department,
      amount: service.price,
      source: 'Admin Officer',
    });
    const day = invoiceDay(created.createdAt);
    setFrom((current) => (day < current ? day : current));
    setTo((current) => (day > current ? day : current));
    setPatient('');
    setPage(1);
  };

  const title = location.pathname.endsWith('/invoices')
    ? 'Invoices and collections'
    : statusParam === 'outstanding'
      ? 'Outstanding balances'
      : 'Revenue';

  return (
    <DashboardLayout navItems={adminNav} title={title}>
      <StatCards items={[
        { label: 'Billed', value: formatCurrency(summary.billed), sub: 'Invoice totals in this filter' },
        { label: 'Gross collected', value: formatCurrency(summary.gross), sub: 'Paid amount plus refunds' },
        { label: 'Refunds', value: formatCurrency(summary.refunds), sub: 'Shown separately' },
        { label: 'Net collections', value: formatCurrency(summary.net), sub: 'Still recorded as paid' },
        { label: 'Outstanding', value: formatCurrency(summary.outstanding), sub: 'Unpaid balance' },
        { label: 'Discounts', value: formatCurrency(summary.discounts), sub: 'No discount field on bills' },
      ]} />
      <Panel className="p-4 mb-4">
        <p className="text-sm text-slate-600 mb-3">Payment is captured at the paypoint. This screen records an unpaid invoice at the current catalogue price and does not mark it paid.</p>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From" className="bg-white" />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To" className="bg-white" />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option>{admin.state.departments.map((row) => <option key={row.id}>{row.name}</option>)}</select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Outstanding</option><option>PAID</option><option>UNPAID</option><option>PARTIAL</option><option>PENDING</option><option>FAILED</option></select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((item) => <option key={item}>{item}</option>)}</select>
          <Link to="/billing"><Button variant="outline">Open paypoint</Button></Link>
        </div>
      </Panel>
      <div className={`${tableWrap} mb-4`}>
        <table className="w-full text-sm">
          <thead className={tableHead}><tr>{['Invoice', 'Patient', 'Department', 'Billed', 'Paid', 'Outstanding', 'Status', 'Method', 'Date'].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.invoiceId} className="border-t">
                <td className="p-2">{row.invoiceId}</td>
                <td className="p-2">{row.patientName}<div className="text-xs text-muted-foreground">{row.hospitalId}</div></td>
                <td className="p-2">{row.department}</td>
                <td className="p-2">{formatCurrency(row.amount)}</td>
                <td className="p-2">{formatCurrency(row.amountPaid)}</td>
                <td className="p-2">{formatCurrency(row.balance)}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.channelUsed || '—'}</td>
                <td className="p-2">{row.createdAt}</td>
              </tr>
            ))}
            {slice.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No invoices in this filter. The seeded billing day is {span.from}.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mb-6"><Button variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 8 >= invoices.length} onClick={() => setPage((n) => n + 1)}>Next</Button></div>
      <Panel className="p-4 max-w-xl space-y-2">
        <h3 className="font-semibold">Create an unpaid invoice at the current catalogue price</h3>
        <Input value={patient} onChange={(event) => setPatient(event.target.value)} aria-label="Patient name" placeholder="Patient name" />
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone" />
        <select className="h-10 w-full rounded-md border px-2 text-sm" aria-label="Service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{admin.state.services.filter((row) => row.status === 'Active').map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name} · {formatCurrency(row.price)}</option>)}</select>
        <Button onClick={create} disabled={!patient.trim()}>Create unpaid invoice</Button>
        <p className="text-xs text-slate-500">The billed amount is copied now. A later price change does not alter this invoice. Collect the payment from the paypoint.</p>
      </Panel>
    </DashboardLayout>
  );
}
