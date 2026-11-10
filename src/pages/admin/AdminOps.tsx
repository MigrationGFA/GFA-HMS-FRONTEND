import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdmin } from '@/contexts/AdminStore';
import { useDental } from '@/contexts/DentalStore';
import { useEye } from '@/contexts/EyeStore';
import { usePaeds } from '@/contexts/PaedsStore';
import { stockStatus as dentalStock } from '@/data/dentalData';
import { stockStatus as eyeStock } from '@/data/eyeData';
import { stockStatus as paedsStock } from '@/data/paedsData';
import { formatCurrency } from '@/data/dummyData';
import { adminNav } from './nav';
import { useLiveDepartments } from './figures';
import { Panel, StatCards, tableHead, tableWrap } from './ui';

export function AdminOperations() {
  const [params] = useSearchParams();
  const departments = useLiveDepartments();
  const dental = useDental();
  const eye = useEye();
  const paeds = usePaeds();
  const [department, setDepartment] = useState('All');
  const bedsOnly = params.get('view') === 'beds';
  const rows = departments.filter((dept) => department === 'All' || dept.name === department);
  const queues = useMemo(() => {
    const dentalRows = dental.state.appointments.filter((row) => row.date === dental.today && row.status !== 'Cancelled').map((row) => ({
      id: row.id, department: 'Dental', name: dental.nameOf(row.patientId), ref: row.patientId, state: row.status,
    }));
    const eyeRows = eye.state.appointments.filter((row) => row.date === eye.today && row.status !== 'Cancelled').map((row) => ({
      id: row.id, department: 'Eye Clinic', name: eye.nameOf(row.patientId), ref: row.patientId, state: row.status,
    }));
    const paedsRows = paeds.state.appointments.filter((row) => row.date === paeds.today && row.status !== 'Cancelled').map((row) => ({
      id: row.id, department: 'Paediatrics', name: paeds.nameOf(row.patientId), ref: row.patientId, state: row.status,
    }));
    return [...dentalRows, ...eyeRows, ...paedsRows].filter((row) => department === 'All' || row.department === department);
  }, [dental, eye, paeds, department]);

  const totals = rows.reduce((sum, dept) => ({
    served: sum.served + dept.patientsToday,
    waiting: sum.waiting + dept.waiting,
    completed: sum.completed + dept.completed,
    occupied: sum.occupied + dept.bedsOccupied,
    beds: sum.beds + dept.bedsTotal,
  }), { served: 0, waiting: 0, completed: 0, occupied: 0, beds: 0 });

  const bedRows = rows.filter((dept) => dept.bedsTotal > 0);

  return (
    <DashboardLayout navItems={adminNav} title={bedsOnly ? 'Admissions and beds' : 'Patient flow'}>
      <StatCards items={bedsOnly ? [
        { label: 'Occupied', value: String(totals.occupied), sub: 'Beds shown as in use' },
        { label: 'Listed beds', value: String(totals.beds), sub: 'Paediatric beds are live' },
        { label: 'Free', value: String(Math.max(0, totals.beds - totals.occupied)), sub: 'Listed minus occupied' },
        { label: 'Wards with beds', value: String(bedRows.length), sub: 'Departments in this filter' },
      ] : [
        { label: 'Served', value: String(totals.served), sub: 'Patients recorded today' },
        { label: 'Waiting', value: String(totals.waiting), sub: 'Still in the queue' },
        { label: 'Completed', value: String(totals.completed), sub: 'Visits finished' },
        { label: 'Departments', value: String(rows.length), sub: 'Included in this filter' },
      ]} />
      <Panel className="p-4 mb-4">
        <p className="text-sm text-slate-600 mb-3">{bedsOnly
          ? 'Only departments with beds are listed. Paediatric occupancy is read from the paediatric ward. Other wards are demonstration figures.'
          : 'Names are the patient label already used on the clinic list, plus the department. Clinical notes are not opened from here. Counts outside Dental, Eye, and Paediatrics are demonstration figures.'}</p>
        <select className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option>{departments.map((dept) => <option key={dept.id}>{dept.name}</option>)}</select>
      </Panel>
      <div className={`${tableWrap} mb-4`}>
        <table className="w-full text-sm">
          <thead className={tableHead}><tr>{(bedsOnly ? ['Department', 'Occupied', 'Listed', 'Free', 'Source'] : ['Department', 'Served', 'Waiting', 'Completed', 'Source']).map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
          <tbody>
            {(bedsOnly ? bedRows : rows).map((dept) => (
              <tr key={dept.id} className="border-t border-slate-100">
                <td className="p-3"><Link className="text-sky-700 font-medium" to={`/dashboard/admin/departments/${dept.id}`}>{dept.name}</Link></td>
                {bedsOnly ? (
                  <>
                    <td className="p-3">{dept.bedsOccupied}</td>
                    <td className="p-3">{dept.bedsTotal}</td>
                    <td className="p-3">{Math.max(0, dept.bedsTotal - dept.bedsOccupied)}</td>
                  </>
                ) : (
                  <>
                    <td className="p-3">{dept.patientsToday}</td>
                    <td className="p-3">{dept.waiting}</td>
                    <td className="p-3">{dept.completed}</td>
                  </>
                )}
                <td className="p-3">{dept.liveKey ? 'Clinic store' : 'Demonstration'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!bedsOnly && (
        <Panel className="p-4">
          <h3 className="font-semibold mb-3">Today’s clinic list</h3>
          <ul className="text-sm space-y-2">
            {queues.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 flex justify-between gap-3">
                <span className="font-medium">{row.name} · {row.ref}</span>
                <span className="text-slate-600">{row.department} · {row.state}</span>
              </li>
            ))}
            {queues.length === 0 && <li className="text-slate-500">No live clinic rows for this filter.</li>}
          </ul>
        </Panel>
      )}
    </DashboardLayout>
  );
}

export function AdminInventory() {
  const dental = useDental();
  const eye = useEye();
  const paeds = usePaeds();
  const admin = useAdmin();
  const rows = [
    ...dental.state.inventory.filter((item) => dentalStock(item, dental.today) !== 'In stock').map((item) => ({ id: item.id, source: 'Dental', name: item.name, detail: dentalStock(item, dental.today), href: '/dashboard/dental/inventory' })),
    ...eye.state.inventory.filter((item) => eyeStock(item, eye.today) !== 'In stock').map((item) => ({ id: item.id, source: 'Eye Clinic', name: item.name, detail: eyeStock(item, eye.today), href: '/dashboard/eye/inventory' })),
    ...eye.state.equipment.filter((item) => item.status !== 'Available').map((item) => ({ id: item.id, source: 'Eye Clinic', name: item.name, detail: item.status, href: '/dashboard/eye/equipment' })),
    ...paeds.state.equipment.filter((item) => paedsStock(item, paeds.today) !== 'In stock').map((item) => ({ id: item.id, source: 'Paediatrics', name: item.name, detail: paedsStock(item, paeds.today), href: '/dashboard/paeds/equipment' })),
  ];
  const issues = admin.state.issues.filter((row) => row.status !== 'Closed');
  return (
    <DashboardLayout navItems={adminNav} title="Inventory and service availability">
      <StatCards items={[
        { label: 'Needs attention', value: String(rows.length), sub: 'Low, expired, or unavailable' },
        { label: 'Dental', value: String(rows.filter((row) => row.source === 'Dental').length), sub: 'From the dental store' },
        { label: 'Eye Clinic', value: String(rows.filter((row) => row.source === 'Eye Clinic').length), sub: 'Stock and equipment' },
        { label: 'Open issues', value: String(issues.length), sub: 'Administrative, not clinical' },
      ]} />
      <Panel className="p-4 mb-4">
        <p className="text-sm text-slate-600 mb-3">These rows are read from Dental, Eye, and Paediatrics. Stock is changed in those departments. Pharmacy stock is not copied here.</p>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={`${row.source}-${row.id}`} className="rounded-xl border border-slate-200 bg-sky-50 p-3 flex justify-between gap-2">
              <span><span className="font-medium">{row.name}</span> · {row.source} · {row.detail}</span>
              <Link className="text-sky-700 font-medium" to={row.href}>Open</Link>
            </li>
          ))}
          {rows.length === 0 && <li className="text-slate-500">No low, expired, or unavailable rows in the three clinic stores.</li>}
        </ul>
      </Panel>
      <Panel className="p-4">
        <h3 className="font-semibold mb-3">Administrative issues</h3>
        <ul className="space-y-2 text-sm">
          {issues.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 p-3 flex justify-between gap-2 items-center">
              <span><span className="font-medium">{row.title}</span><div className="text-xs text-slate-500">{row.severity} · {row.status}</div></span>
              <Button size="sm" variant="outline" onClick={() => admin.setIssueStatus(row.id, row.status === 'Open' ? 'In progress' : 'Closed')}>{row.status === 'Closed' ? 'Closed' : row.status === 'Open' ? 'Start' : 'Close'}</Button>
            </li>
          ))}
          {issues.length === 0 && <li className="text-slate-500">No open administrative issues.</li>}
        </ul>
      </Panel>
    </DashboardLayout>
  );
}

export function AdminSettings() {
  const admin = useAdmin();
  const [params] = useSearchParams();
  const [hospitalName, setName] = useState(admin.state.settings.hospitalName);
  const [phone, setPhone] = useState(admin.state.settings.phone);
  const [email, setEmail] = useState(admin.state.settings.email);
  const [address, setAddress] = useState(admin.state.settings.address);
  const [category, setCategory] = useState('');
  const save = () => {
    if (!window.confirm('Save hospital contact details in this browser? This does not change user permissions or clinical protocols.')) return;
    admin.saveSettings({ ...admin.state.settings, hospitalName, phone, email, address });
    notify.success('admin', 'Contact details saved in this browser.');
  };
  const addCategory = () => {
    const next = category.trim();
    if (!next) return;
    if (admin.state.settings.categories.includes(next)) { notify.error('admin', 'That category already exists.'); return; }
    admin.saveSettings({ ...admin.state.settings, categories: [...admin.state.settings.categories, next].sort() });
    setCategory('');
    notify.success('admin', 'Category added.');
  };
  const prices = params.get('view') === 'prices';
  return (
    <DashboardLayout navItems={adminNav} title={prices ? 'Price approvals' : 'Administrative settings'}>
      {prices ? (
        <>
          <StatCards items={[
            { label: 'Price changes', value: String(admin.state.priceHistory.length), sub: 'Recorded in this browser' },
            { label: 'Catalogue services', value: String(admin.state.services.length), sub: 'Current prices live on Services' },
          ]} />
          <Panel className="p-5">
            <h3 className="font-semibold mb-1">Recorded price changes</h3>
            <p className="text-sm text-slate-600 mb-4">Each change is confirmed on the services screen. Older invoices keep the amount they were given.</p>
            <ul className="space-y-2 text-sm">
              {admin.state.priceHistory.length === 0 && <li className="text-slate-500">None yet.</li>}
              {admin.state.priceHistory.map((row) => (
                <li key={row.id} className="rounded-xl border border-slate-200 bg-sky-50 p-3">
                  <div className="font-medium">{row.serviceCode} · {formatCurrency(row.previous)} → {formatCurrency(row.next)}</div>
                  <div className="text-xs text-slate-600 mt-1">{row.effectiveDate} · {row.reason} · {row.by}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : (
        <>
          <StatCards items={[
            { label: 'Categories', value: String(admin.state.settings.categories.length), sub: 'Used on the service catalogue' },
            { label: 'Price changes', value: String(admin.state.priceHistory.length), sub: 'See Approvals for the list' },
          ]} />
          <div className="grid md:grid-cols-2 gap-4">
            <Panel className="p-4 space-y-2">
              <h3 className="font-semibold">Hospital contact</h3>
              <p className="text-xs text-slate-500">This does not change user permissions or clinical protocols.</p>
              <Input value={hospitalName} onChange={(event) => setName(event.target.value)} aria-label="Hospital name" className="bg-white" />
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone" className="bg-white" />
              <Input value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" className="bg-white" />
              <Input value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Address" className="bg-white" />
              <Button onClick={save}>Save contact</Button>
            </Panel>
            <Panel className="p-4 space-y-2">
              <h3 className="font-semibold">Service categories</h3>
              <div className="flex gap-2"><Input value={category} onChange={(event) => setCategory(event.target.value)} aria-label="New category" className="bg-white" /><Button variant="outline" onClick={addCategory}>Add</Button></div>
              <ul className="text-sm flex flex-wrap gap-2">{admin.state.settings.categories.map((item) => <li key={item} className="rounded-full bg-sky-50 text-sky-900 border border-sky-100 px-3 py-1">{item}</li>)}</ul>
            </Panel>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
