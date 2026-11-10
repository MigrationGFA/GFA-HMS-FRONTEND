import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePaeds, followUpDisplay } from '@/contexts/PaedsStore';
import { APPOINTMENT_STATUSES, ageGroup, stockStatus, type AppointmentStatus } from '@/data/paedsData';
import { AgeBadge, DemoBanner, PaedsShell, PaedsStatus, PageIntro, PatientLink, paedsNotify } from './shared';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';

export default function PaedsDashboard() {
  const paeds = usePaeds();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const todayRows = paeds.state.appointments.filter((a) => a.date === paeds.today && (status === 'All' || a.status === status) && (!q.trim() || paeds.nameOf(a.patientId).toLowerCase().includes(q.toLowerCase()) || a.type.toLowerCase().includes(q.toLowerCase())));
  const seen = new Set(paeds.state.appointments.filter((a) => a.date === paeds.today && a.status === 'Completed').map((a) => a.patientId));
  paeds.state.encounters.filter((e) => e.date === paeds.today && e.status === 'Completed').forEach((e) => seen.add(e.patientId));
  const admitted = paeds.state.admissions.filter((a) => a.status === 'Admitted' || a.status === 'Under Care' || a.status === 'Ready for Discharge').length;
  const dueImm = paeds.state.immunisations.filter((i) => i.status !== 'Administered' && i.nextDue && i.nextDue <= paeds.today).length;
  const dueFu = paeds.state.followUps.filter((f) => { const s = followUpDisplay(f, paeds.today); return s === 'Overdue' || (s === 'Upcoming' && f.dueDate <= paeds.today); }).length;
  const waiting = paeds.state.appointments.filter((a) => a.date === paeds.today && (a.status === 'Waiting' || a.status === 'Checked In')).length;
  const triaged = new Set(paeds.state.vitals.filter((v) => v.date === paeds.today && v.status === 'Completed').map((v) => v.patientId));
  const stages = [
    ['Registered', paeds.state.appointments.filter((a) => a.date === paeds.today && a.status === 'Scheduled').length, '/dashboard/paeds/appointments?status=Scheduled'],
    ['Awaiting triage', paeds.state.appointments.filter((a) => a.date === paeds.today && a.status === 'Checked In' && !triaged.has(a.patientId)).length, '/dashboard/paeds/triage'],
    ['Awaiting consultation', paeds.state.appointments.filter((a) => a.date === paeds.today && a.status === 'Waiting').length, '/dashboard/paeds/encounters'],
    ['Awaiting investigation', paeds.state.investigations.filter((i) => i.status === 'Requested' || i.status === 'In Progress').length, '/dashboard/paeds/investigations?status=Requested'],
    ['Awaiting review', paeds.state.growth.filter((g) => !g.interpretation.trim()).length, '/dashboard/paeds/growth'],
    ['Ready for discharge', paeds.state.admissions.filter((a) => a.status === 'Ready for Discharge').length, '/dashboard/paeds/discharge'],
    ['Follow-up required', dueFu, '/dashboard/paeds/follow-ups'],
  ] as const;
  const ageChart = ['Newborn', 'Infant', 'Child', 'Adolescent'].map((name) => ({ name, count: paeds.state.patients.filter((p) => ageGroup(p.dateOfBirth, paeds.today) === name).length }));
  const dxChart = useMemo(() => {
    const map = new Map<string, number>();
    paeds.state.diagnoses.forEach((d) => map.set(d.name, (map.get(d.name) ?? 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [paeds.state.diagnoses]);
  const imm = [
    { name: 'Given', count: paeds.state.immunisations.filter((i) => i.status === 'Administered').length },
    { name: 'Scheduled', count: paeds.state.immunisations.filter((i) => i.status === 'Scheduled').length },
    { name: 'Overdue', count: dueImm },
  ];
  const growthToday = paeds.state.growth.filter((g) => g.date === paeds.today).length;
  const alerts = [
    ...paeds.state.appointments.filter((a) => a.date === paeds.today && a.status === 'Checked In' && !triaged.has(a.patientId)).map((a) => ({ id: a.id, text: `${paeds.nameOf(a.patientId)} awaiting triage`, to: '/dashboard/paeds/triage' })),
    ...paeds.state.encounters.filter((e) => e.status === 'Draft').map((e) => ({ id: e.id, text: `Draft encounter for ${paeds.nameOf(e.patientId)}`, to: `/dashboard/paeds/encounters/${e.id}` })),
    ...paeds.state.equipment.filter((item) => ['Low stock', 'Out of stock', 'Maintenance due'].includes(stockStatus(item, paeds.today))).map((item) => ({ id: item.id, text: `${item.name} · ${stockStatus(item, paeds.today)}`, to: '/dashboard/paeds/equipment' })),
  ];

  return (
    <PaedsShell title="Dashboard">
      <PageIntro title="Paediatrics Dashboard" description="Today’s children, growth and immunisation summaries, and demonstration alerts." actions={<Button variant="outline" onClick={() => { paeds.resetDemoData(); paedsNotify('success', 'Paediatric demo data restored.'); }}><RotateCcw className="h-4 w-4 mr-1" /> Reset demo data</Button>} />
      <DemoBanner />
      <DepartmentReportBox department="Paediatrics" officer="Dr. Funmilayo Adeyemi" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {[['Appointments today', todayRows.length && status === 'All' && !q ? paeds.state.appointments.filter((a) => a.date === paeds.today && a.status !== 'Cancelled').length : paeds.state.appointments.filter((a) => a.date === paeds.today && a.status !== 'Cancelled').length], ['Waiting', waiting], ['Seen today', seen.size], ['Admitted', admitted], ['Immunisations due', dueImm], ['Follow-ups due', dueFu]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
        ))}
      </div>
      <div className="grid md:grid-cols-4 gap-2 mb-4">{stages.map(([label, count, path]) => <button key={label} className="text-left rounded-lg border bg-card p-3 hover:border-primary" onClick={() => navigate(path)}><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{count}</p></button>)}</div>
      <div className="grid md:grid-cols-2 gap-3 mb-4 text-sm">
        <div className="rounded-xl border p-3">Growth today: {growthToday}. Measurements without a clinician note: {paeds.state.growth.filter((g) => !g.interpretation.trim()).length}. Upcoming growth visits: {paeds.state.appointments.filter((a) => a.type === 'Growth monitoring' && a.date >= paeds.today).length}. Missing measurements are left blank.</div>
        <div className="rounded-xl border p-3">Immunisation sessions recorded as given: {imm[0].count}. Scheduled today: {paeds.state.immunisations.filter((i) => i.nextDue === paeds.today && i.status !== 'Administered').length}. Overdue for review: {dueImm}.</div>
      </div>
      <div className="flex gap-2 mb-3"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search today’s list" className="max-w-xs" /><select className="h-10 rounded-md border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option>All</option>{APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="overflow-x-auto rounded-xl border bg-card mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Time', 'Child', 'ID', 'Age', 'Visit', 'Clinician', 'Status'].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {todayRows.map((row) => {
              const child = paeds.state.patients.find((p) => p.id === row.patientId);
              return (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{row.startTime}</td>
                  <td className="p-2"><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /></td>
                  <td className="p-2">{row.patientId}</td>
                  <td className="p-2">{child && <AgeBadge dob={child.dateOfBirth} />} <span className="ml-1">{paeds.ageOf(row.patientId)}</span></td>
                  <td className="p-2">{row.type}</td>
                  <td className="p-2">{row.clinician}</td>
                  <td className="p-2"><select className="h-8 rounded border px-1 text-xs" value={row.status} aria-label={`Status ${row.id}`} onChange={(e) => paeds.setAppointmentStatus(row.id, e.target.value as AppointmentStatus)}>{APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                </tr>
              );
            })}
            {todayRows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No appointments match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border p-3"><h3 className="font-semibold mb-2">Alerts</h3><ul className="text-sm space-y-1">{alerts.map((a) => <li key={a.id}><Link className="text-primary hover:underline" to={a.to}>{a.text}</Link></li>)}{alerts.length === 0 && <li>No demonstration alerts.</li>}</ul></div>
        <Chart title="Age groups" data={ageChart} />
        <Chart title="Recorded diagnoses" data={dxChart.length ? dxChart : [{ name: 'None', count: 0 }]} />
      </div>
      <div className="h-56 rounded-xl border p-3 mt-4"><h3 className="font-semibold mb-2">Immunisation records</h3><ResponsiveContainer width="100%" height="80%"><BarChart data={imm}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#b45309" /></BarChart></ResponsiveContainer></div>
    </PaedsShell>
  );
}

function Chart({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  return (
    <div className="rounded-xl border p-3 h-56">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height="80%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1d4ed8" /></BarChart></ResponsiveContainer>
    </div>
  );
}
