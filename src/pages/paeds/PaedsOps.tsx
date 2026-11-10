import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePaeds } from '@/contexts/PaedsStore';
import { APPOINTMENT_STATUSES, STAFF, VISIT_TYPES, ageGroup, stockStatus, type AppointmentStatus, type EquipmentStatus, type VisitType } from '@/data/paedsData';
import { formatCurrency } from '@/data/dummyData';
import { DemoBanner, PaedsShell, PaedsStatus, PageIntro, PatientLink, PatientPicker, paedsNotify, selectClass } from './shared';

export function PaedsAppointments() {
  const paeds = usePaeds();
  const [params] = useSearchParams();
  const preset = params.get('patient');
  const [patientId, setPatientId] = useState(preset ?? '');
  const [statusFilter, setStatus] = useState(params.get('status') ?? 'All');
  const [date, setDate] = useState(paeds.today);
  const [startTime, setStart] = useState('12:00');
  const [endTime, setEnd] = useState('12:30');
  const [type, setType] = useState<VisitType>('New consultation');
  const [clinician, setClinician] = useState(STAFF[0].name);
  const rows = paeds.state.appointments.filter((row) => (!preset || row.patientId === preset) && (statusFilter === 'All' || row.status === statusFilter));
  const save = () => {
    const result = paeds.saveAppointment({ patientId, date, startTime, endTime, type, clinician, reason: 'Booked in the paediatric demo', status: 'Scheduled' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Appointment saved.');
  };
  return (
    <PaedsShell title="Appointments">
      <PageIntro title="Appointments" description="Book a visit. Overlapping times for the same clinician are rejected." />
      <DemoBanner />
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <Input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} aria-label="Start" />
        <Input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} aria-label="End" />
        <select className={selectClass()} value={type} onChange={(e) => setType(e.target.value as VisitType)} aria-label="Visit">{VISIT_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
        <select className={selectClass()} value={clinician} onChange={(e) => setClinician(e.target.value)} aria-label="Clinician">{STAFF.map((s) => <option key={s.name}>{s.name}</option>)}</select>
        <Button onClick={save}>Book</Button>
      </div>
      <select className={selectClass() + ' max-w-xs mb-3'} value={statusFilter} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option>All</option>{APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr>{['When', 'Child', 'Visit', 'Clinician', 'Status'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.date} {row.startTime}</td><td className="p-2"><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /></td><td className="p-2">{row.type}</td><td className="p-2">{row.clinician}</td><td className="p-2"><select className="h-8 rounded border px-1" value={row.status} aria-label={`Status ${row.id}`} onChange={(e) => { paeds.setAppointmentStatus(row.id, e.target.value as AppointmentStatus); paedsNotify('success', 'Appointment status updated.'); }}>{APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody>
      </table>
    </PaedsShell>
  );
}

export function PaedsServices() {
  const paeds = usePaeds();
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const rows = paeds.state.services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const add = () => {
    if (!name.trim()) { paedsNotify('error', 'Enter a service name.'); return; }
    paeds.saveService({ name, category: 'Clinic', description: '', durationMin: 20, price: 0, active: true });
    setName('');
    paedsNotify('success', 'Service added. The price is illustrative and is not revenue.');
  };
  return (
    <PaedsShell title="Services">
      <PageIntro title="Paediatric services" description="Enable or disable demonstration services. Prices are not posted to the cashier." />
      <DemoBanner />
      <div className="flex gap-2 mb-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New service" aria-label="New service" /><Button onClick={add}>Add</Button></div>
      <ul className="space-y-2 text-sm">{rows.map((service) => <li key={service.id} className="border rounded-md p-3 flex justify-between gap-2"><span>{service.name} · {service.durationMin} min · {formatCurrency(service.price)}</span><Button size="sm" variant="outline" onClick={() => paeds.saveService({ ...service, active: !service.active })}>{service.active ? 'Disable' : 'Enable'}</Button></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsEquipment() {
  const paeds = usePaeds();
  const [qty, setQty] = useState<Record<string, string>>({});
  return (
    <PaedsShell title="Equipment">
      <PageIntro title="Equipment and supplies" description="Low stock, expiry, and maintenance are highlighted. This is not a stock ledger." />
      <DemoBanner />
      <table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr>{['Item', 'Qty', 'Status', 'Adjust'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{paeds.state.equipment.map((item) => {
          const label = stockStatus(item, paeds.today);
          return <tr key={item.id} className="border-t"><td className="p-2">{item.name}<div className="text-xs text-muted-foreground">{item.location}</div></td><td className="p-2">{item.quantity} {item.unit}</td><td className="p-2"><PaedsStatus status={label} /></td><td className="p-2 flex gap-2"><Input className="w-20" value={qty[item.id] ?? String(item.quantity)} onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })} aria-label={`${item.name} quantity`} /><Button size="sm" variant="outline" onClick={() => { const result = paeds.setEquipment(item.id, { quantity: Number(qty[item.id] ?? item.quantity) }); if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Quantity updated.'); }}>Save</Button><select className="h-9 rounded border px-1" value={item.status} aria-label={`${item.name} status`} onChange={(e) => paeds.setEquipment(item.id, { status: e.target.value as EquipmentStatus })}><option>Available</option><option>In use</option><option>Maintenance due</option><option>Unavailable</option></select></td></tr>;
        })}</tbody>
      </table>
    </PaedsShell>
  );
}

function download(name: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Range({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return <div className="flex gap-2 mb-4"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /><Button variant="outline" onClick={() => window.print()}>Print</Button></div>;
}

export function PaedsClinicalReports() {
  const paeds = usePaeds();
  const [from, setFrom] = useState(paeds.today);
  const [to, setTo] = useState(paeds.today);
  const inRange = (date: string) => date >= from && date <= to;
  const visits = paeds.state.encounters.filter((row) => inRange(row.date));
  const byAge = useMemo(() => ['Newborn', 'Infant', 'Child', 'Adolescent'].map((name) => ({ name, count: paeds.state.patients.filter((p) => ageGroup(p.dateOfBirth, paeds.today) === name).length })), [paeds.state.patients, paeds.today]);
  const exportCsv = () => download('paeds-clinical.csv', [['Date', 'Child', 'Complaint'], ...visits.map((row) => [row.date, paeds.nameOf(row.patientId), row.complaint])]);
  return (
    <PaedsShell title="Clinical reports">
      <PageIntro title="Clinical reports" description="Counts from the paediatric demonstration records in this browser." />
      <DemoBanner text="These figures are not hospital statistics." />
      <Range from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <p className="text-sm mb-3">Consultations in range: {visits.length}. Open investigations: {paeds.state.investigations.filter((i) => i.status !== 'Completed' && i.status !== 'Cancelled').length}.</p>
      <div className="h-56 border rounded-xl p-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={byAge}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1d4ed8" /></BarChart></ResponsiveContainer></div>
      <Button className="mt-3" variant="outline" onClick={exportCsv}>Download CSV</Button>
    </PaedsShell>
  );
}

export function PaedsGrowthReports() {
  const paeds = usePaeds();
  const [from, setFrom] = useState(paeds.today);
  const [to, setTo] = useState(paeds.today);
  const rows = paeds.state.growth.filter((g) => g.date >= from && g.date <= to);
  const review = paeds.state.growth.filter((g) => !g.interpretation.trim()).length;
  return (
    <PaedsShell title="Growth reports">
      <PageIntro title="Growth and nutrition reports" description="Measurement counts only. Missing interpretations are listed for clinician review, not as diagnoses." />
      <DemoBanner />
      <Range from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <p className="text-sm mb-3">Measurements in range: {rows.length}. Without a clinician note: {review}. Nutrition notes: {paeds.state.nutrition.length}.</p>
      <Button variant="outline" onClick={() => download('paeds-growth.csv', [['Date', 'Child', 'Weight'], ...rows.map((row) => [row.date, paeds.nameOf(row.patientId), row.weightKg])])}>Download CSV</Button>
    </PaedsShell>
  );
}

export function PaedsImmunisationReports() {
  const paeds = usePaeds();
  const given = paeds.state.immunisations.filter((row) => row.status === 'Administered');
  const outstanding = paeds.state.immunisations.filter((row) => row.status !== 'Administered');
  const chart = [{ name: 'Given', count: given.length }, { name: 'Outstanding', count: outstanding.length }];
  return (
    <PaedsShell title="Immunisation reports">
      <PageIntro title="Immunisation reports" description="Counts of recorded rows. Outstanding means not marked administered. It is not a schedule recommendation." />
      <DemoBanner />
      <div className="h-56 border rounded-xl p-2 mb-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#b45309" /></BarChart></ResponsiveContainer></div>
      <Button variant="outline" onClick={() => download('paeds-immunisation.csv', [['Vaccine', 'Child', 'Status'], ...paeds.state.immunisations.map((row) => [row.vaccine, paeds.nameOf(row.patientId), row.status])])}>Download CSV</Button>
    </PaedsShell>
  );
}

export function PaedsOperationalReports() {
  const paeds = usePaeds();
  const occupied = paeds.state.beds.filter((bed) => bed.status === 'Occupied').length;
  const byClinician = useMemo(() => {
    const map = new Map<string, number>();
    paeds.state.appointments.forEach((row) => map.set(row.clinician, (map.get(row.clinician) ?? 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [paeds.state.appointments]);
  return (
    <PaedsShell title="Operational reports">
      <PageIntro title="Operational reports" description="Ward occupancy and appointment counts from this browser. Service prices are not revenue." />
      <DemoBanner />
      <p className="text-sm mb-3">Occupied beds {occupied} of {paeds.state.beds.length}. Admissions {paeds.state.admissions.length}. Discharged {paeds.state.admissions.filter((a) => a.status === 'Discharged').length}.</p>
      <div className="h-56 border rounded-xl p-2 mb-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={byClinician}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart></ResponsiveContainer></div>
      <Button variant="outline" onClick={() => download('paeds-operations.csv', [['Clinician', 'Appointments'], ...byClinician.map((row) => [row.name, String(row.count)])])}>Download CSV</Button>
    </PaedsShell>
  );
}
