import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/data/dummyData';
import { useAdmin } from '@/contexts/AdminStore';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/lib/notify';
import { adminNav } from './nav';
import { Panel, StatCards, tableHead, tableWrap } from './ui';

export function AdminServices() {
  const admin = useAdmin();
  const { user } = useAuth();
  const actor = user?.name ?? 'Admin Officer';
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [pricing, setPricing] = useState<string | null>(null);
  const departments = useMemo(() => ['All', ...new Set(admin.state.services.map((row) => row.department))], [admin.state.services]);
  const categories = useMemo(() => ['All', ...new Set(admin.state.services.map((row) => row.category))], [admin.state.services]);
  const rows = admin.state.services.filter((row) => {
    const hay = `${row.name} ${row.code}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase())
      && (department === 'All' || row.department === department)
      && (category === 'All' || row.category === category)
      && (status === 'All' || row.status === status);
  }).sort((a, b) => a.name.localeCompare(b.name));
  const slice = rows.slice((page - 1) * 8, page * 8);
  const current = admin.state.services.find((row) => row.id === editing);
  const priced = admin.state.services.find((row) => row.id === pricing);

  const exportCsv = () => {
    const header = ['Code', 'Name', 'Department', 'Category', 'Price', 'Status', 'Updated'];
    const body = rows.map((row) => [row.code, row.name, row.department, row.category, String(row.price), row.status, row.updatedAt]);
    const csv = [header, ...body].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gfa-service-catalogue.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = admin.state.services.filter((row) => row.status === 'Active').length;

  return (
    <DashboardLayout navItems={adminNav} title="Services and pricing">
      <StatCards items={[
        { label: 'Services', value: String(admin.state.services.length), sub: 'Hospital catalogue' },
        { label: 'Active', value: String(activeCount), sub: 'Can be billed' },
        { label: 'Inactive', value: String(admin.state.services.length - activeCount), sub: 'Hidden from new bills' },
        { label: 'Price changes', value: String(admin.state.priceHistory.length), sub: 'Past invoices keep their amount' },
      ]} />
      <Panel className="p-4 mb-4">
        <p className="text-sm text-slate-600 mb-3">A price change applies to the next bill. Invoices already stored keep the amount they were given.</p>
        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Name or code" className="max-w-xs bg-white" aria-label="Search services" />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button onClick={() => setEditing('new')}>Add service</Button>
        </div>
      </Panel>
      <div className={tableWrap}>
        <table className="w-full text-sm">
          <thead className={tableHead}><tr>{['Code', 'Service', 'Department', 'Category', 'Price', 'Status', 'Updated', ''].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.code}</td>
                <td className="p-2 font-medium">{row.name}</td>
                <td className="p-2">{row.department}</td>
                <td className="p-2">{row.category}</td>
                <td className="p-2">{formatCurrency(row.price)}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.updatedAt}<div className="text-xs text-muted-foreground">{row.updatedBy}</div></td>
                <td className="p-2 space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEditing(row.id)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setPricing(row.id)}>Price</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!window.confirm(`${row.status === 'Active' ? 'Deactivate' : 'Activate'} ${row.name}?`)) return;
                    const result = admin.setServiceStatus(row.id, row.status === 'Active' ? 'Inactive' : 'Active', actor);
                    if (!result.ok) notify.error('admin', result.message);
                    else notify.success('admin', `${row.name} is now ${result.value.status}.`);
                  }}>{row.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                </td>
              </tr>
            ))}
            {slice.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No services match.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 8 >= rows.length} onClick={() => setPage((n) => n + 1)}>Next</Button><span className="text-sm self-center text-muted-foreground">{rows.length} services</span></div>
      {current && <ServiceForm service={current} actor={actor} onClose={() => setEditing(null)} />}
      {editing === 'new' && <ServiceForm actor={actor} onClose={() => setEditing(null)} />}
      {priced && <PriceForm service={priced} actor={actor} onClose={() => setPricing(null)} />}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Price history</h3>
        <Panel className="p-4">
          <ul className="text-sm space-y-2">{admin.state.priceHistory.length === 0 && <li className="text-slate-500">No price has been changed in this browser yet.</li>}{admin.state.priceHistory.map((row) => <li key={row.id} className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">{row.at} · {row.serviceCode} · {formatCurrency(row.previous)} → {formatCurrency(row.next)} · effective {row.effectiveDate} · {row.reason}</li>)}</ul>
        </Panel>
      </div>
    </DashboardLayout>
  );
}

function ServiceForm({ service, actor, onClose }: { service?: { id: string; code: string; name: string; department: string; category: string; description: string; price: number; status: 'Active' | 'Inactive' }; actor: string; onClose: () => void }) {
  const admin = useAdmin();
  const [code, setCode] = useState(service?.code ?? '');
  const [name, setName] = useState(service?.name ?? '');
  const [department, setDepartment] = useState(service?.department ?? admin.state.departments[0]?.name ?? '');
  const [category, setCategory] = useState(service?.category ?? 'Consultation');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(String(service?.price ?? ''));
  const save = () => {
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount < 0) { notify.error('admin', 'Enter a valid price.'); return; }
    const result = admin.saveService({
      id: service?.id ?? `SVC-${Date.now()}`,
      code, name, department, category, description, price: amount,
      status: service?.status ?? 'Active',
      updatedBy: actor,
    });
    if (!result.ok) notify.error('admin', result.message);
    else { notify.success('admin', 'Service saved. Existing invoices were not rewritten.'); onClose(); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-4 w-full max-w-lg space-y-2">
        <h3 className="font-semibold">{service ? 'Edit service' : 'Add service'}</h3>
        <Input value={code} onChange={(event) => setCode(event.target.value)} aria-label="Service code" placeholder="Code" />
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Service name" placeholder="Name" />
        <select className="h-10 w-full rounded-md border px-2 text-sm" aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}>{admin.state.departments.map((row) => <option key={row.id}>{row.name}</option>)}</select>
        <Input value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category" placeholder="Category" />
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Description" />
        <Input value={price} onChange={(event) => setPrice(event.target.value)} aria-label="Standard price" placeholder="Standard price" />
        <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}

function PriceForm({ service, actor, onClose }: { service: { id: string; name: string; price: number }; actor: string; onClose: () => void }) {
  const admin = useAdmin();
  const [price, setPrice] = useState(String(service.price));
  const [reason, setReason] = useState('');
  const [effective, setEffective] = useState(admin.today);
  const save = () => {
    const amount = Number(price);
    if (!window.confirm(`Change ${service.name} from ${formatCurrency(service.price)} to ${formatCurrency(amount)} from ${effective}? Past invoices keep ${formatCurrency(service.price)} if that was their billed amount.`)) return;
    const result = admin.changePrice(service.id, amount, reason, effective, actor);
    if (!result.ok) notify.error('admin', result.message);
    else { notify.success('admin', 'Price updated for future bills only.'); onClose(); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-4 w-full max-w-md space-y-2">
        <h3 className="font-semibold">Update price · {service.name}</h3>
        <p className="text-sm">Previous price {formatCurrency(service.price)}</p>
        <Input value={price} onChange={(event) => setPrice(event.target.value)} aria-label="New price" />
        <Input type="date" value={effective} onChange={(event) => setEffective(event.target.value)} aria-label="Effective date" />
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} aria-label="Reason" placeholder="Reason for the change" />
        <div className="flex gap-2"><Button onClick={save}>Confirm price change</Button><Button variant="outline" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}
