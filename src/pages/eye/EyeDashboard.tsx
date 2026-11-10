import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Eye, FlaskConical, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEye } from '@/contexts/EyeStore';
import { stockStatus, type AppointmentStatus } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeShell, EyeStatus, PageIntro, PatientLink } from './shared';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';

const STATUSES: AppointmentStatus[] = ['Scheduled', 'Checked In', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];

export default function EyeDashboard() {
  const eye = useEye();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const todayRows = useMemo(() => eye.state.appointments.filter((a) => {
    if (a.date !== eye.today) return false;
    if (status !== 'All' && a.status !== status) return false;
    const name = eye.nameOf(a.patientId).toLowerCase();
    return !q.trim() || name.includes(q.toLowerCase()) || a.type.toLowerCase().includes(q.toLowerCase());
  }), [eye, q, status]);

  const stage = (label: string, count: number, path: string) => ({ label, count, path });
  const acuityIds = new Set(eye.state.acuity.filter((a) => a.date === eye.today && a.status === 'Saved').map((a) => a.patientId));
  const refractionIds = new Set(eye.state.refractions.filter((r) => r.date === eye.today && r.status === 'Saved').map((r) => r.patientId));
  const stages = [
    stage('Registered', eye.state.appointments.filter((a) => a.date === eye.today && a.status === 'Scheduled').length, '/dashboard/eye/appointments?status=Scheduled'),
    stage('Waiting for visual acuity', eye.state.appointments.filter((a) => a.date === eye.today && a.status === 'Checked In' && !acuityIds.has(a.patientId)).length, '/dashboard/eye/acuity'),
    stage('Awaiting examination', eye.state.appointments.filter((a) => a.date === eye.today && a.status === 'Waiting' && acuityIds.has(a.patientId)).length, '/dashboard/eye/examination'),
    stage('Investigation pending', eye.stats.pendingInvestigations, '/dashboard/eye/investigations?status=Requested'),
    stage('Awaiting refraction', eye.state.appointments.filter((a) => a.date === eye.today && a.status === 'In Consultation' && !refractionIds.has(a.patientId)).length, '/dashboard/eye/refraction'),
    stage('Completed', eye.state.appointments.filter((a) => a.date === eye.today && a.status === 'Completed').length, '/dashboard/eye/appointments?status=Completed'),
  ];
  const chart = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => ({ day, visits: 8 + ((i * 3) % 7) }));
  const low = eye.state.inventory.filter((item) => ['Low stock', 'Out of stock', 'Expiring soon'].includes(stockStatus(item, eye.today)));

  return (
    <EyeShell title="Dashboard">
      <PageIntro title="Eye Clinic Dashboard" description="Today’s ophthalmic workflow, rooms, and demonstration alerts." actions={
        <Button variant="outline" onClick={() => { eye.resetDemoData(); eyeNotify('success', 'Eye clinic demo data restored.'); }}><RotateCcw className="h-4 w-4 mr-1" /> Reset demo data</Button>
      } />
      <DemoBanner />
      <DepartmentReportBox department="Eye Clinic" officer="Dr. Adaeze Okonkwo" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {[
          ['Appointments today', eye.stats.todayAppointments],
          ['Waiting', eye.stats.waiting],
          ['In consultation', eye.stats.inConsultation],
          ['Seen today', eye.stats.seenToday],
          ['Investigations', eye.stats.pendingInvestigations],
          ['Follow-ups due', eye.stats.followUpsDue],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
        ))}
      </div>
      <div className="grid lg:grid-cols-4 gap-2 mb-4">
        {stages.map((item) => (
          <button key={item.label} className="text-left rounded-lg border bg-card p-3 hover:border-primary" onClick={() => navigate(item.path)}>
            <p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.count}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search today’s list" className="max-w-xs" />
        <select className="h-10 rounded-md border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Time', 'Patient', 'Visit', 'Clinician', 'Room', 'Status'].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {todayRows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{row.startTime}</td>
                <td className="p-2"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /></td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.clinician}</td>
                <td className="p-2">{eye.state.rooms.find((r) => r.id === row.roomId)?.name}</td>
                <td className="p-2">
                  <select className="h-8 rounded border px-1 text-xs" value={row.status} onChange={(e) => eye.setAppointmentStatus(row.id, e.target.value as AppointmentStatus)} aria-label={`Status for ${eye.nameOf(row.patientId)}`}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {todayRows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No appointments match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-3">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><DoorOpenIcon /> Rooms</h3>
          <ul className="space-y-2 text-sm">{eye.state.rooms.map((room) => <li key={room.id} className="flex justify-between gap-2"><span>{room.name}</span><EyeStatus status={room.status} /></li>)}</ul>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <h3 className="font-semibold mb-2">Alerts</h3>
          <ul className="space-y-2 text-sm">
            {low.map((item) => <li key={item.id}><Link className="text-primary hover:underline" to="/dashboard/eye/inventory">{item.name} · {stockStatus(item, eye.today)}</Link></li>)}
            {eye.state.followUps.filter((f) => f.dueDate < eye.today && f.status !== 'Completed' && f.status !== 'Cancelled').map((f) => (
              <li key={f.id}><Link className="text-primary hover:underline" to="/dashboard/eye/follow-ups">Overdue follow-up · {eye.nameOf(f.patientId)}</Link></li>
            ))}
            {eye.state.equipment.filter((e) => e.status === 'Maintenance due').map((e) => <li key={e.id}>{e.name} needs maintenance</li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-3 h-56">
          <h3 className="font-semibold mb-2">Visits this week (demo)</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="visits" fill="#1d4ed8" /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
        <Link className="rounded-lg border p-3 hover:border-primary" to="/dashboard/eye/patients"><Users className="h-4 w-4 mb-1" /> Patients</Link>
        <Link className="rounded-lg border p-3 hover:border-primary" to="/dashboard/eye/appointments"><CalendarDays className="h-4 w-4 mb-1" /> Appointments</Link>
        <Link className="rounded-lg border p-3 hover:border-primary" to="/dashboard/eye/acuity"><Eye className="h-4 w-4 mb-1" /> Visual acuity</Link>
        <Link className="rounded-lg border p-3 hover:border-primary" to="/dashboard/eye/investigations"><FlaskConical className="h-4 w-4 mb-1" /> Investigations</Link>
      </div>
    </EyeShell>
  );
}

function DoorOpenIcon() {
  return <span className="inline-block h-4 w-4 rounded-sm bg-primary/15" />;
}
