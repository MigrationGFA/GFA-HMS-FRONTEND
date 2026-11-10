import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import {
  APPOINTMENT_STATUSES,
  CHAIR_STATUSES,
  ageFromDob,
  patientName,
  stockStatus,
  followUpDisplayStatus,
  type AppointmentStatus,
  type ChairStatus,
} from '@/data/dentalData';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro } from './shared';
import { CalendarDays, Users, UserCheck, CheckCircle2, ClipboardList, Repeat, RotateCcw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { notify } from '@/lib/notify';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';

const PIE_COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#e11d48', '#64748b', '#ca8a04'];

export function DentalDashboard() {
  const { state, today, stats, setAppointmentStatus, updateChair, resetDemoData, nameOf } = useDental();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [resetOpen, setResetOpen] = useState(false);

  const todayRows = useMemo(() => {
    return state.appointments
      .filter((a) => a.date === today)
      .filter((a) => status === 'all' || a.status === status)
      .filter((a) => {
        const patient = state.patients.find((p) => p.id === a.patientId);
        const blob = `${patient ? patientName(patient) : ''} ${a.patientId} ${a.type}`.toLowerCase();
        return blob.includes(q.trim().toLowerCase());
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.appointments, state.patients, today, q, status]);

  const volume = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const count = state.appointments.filter((a) => a.date === key && a.status !== 'Cancelled').length;
      return { day: key.slice(5), appointments: count };
    });
    return days;
  }, [state.appointments]);

  const procedureMix = useMemo(() => {
    const map = new Map<string, number>();
    state.procedures.filter((p) => p.status !== 'Cancelled').forEach((p) => {
      map.set(p.procedure, (map.get(p.procedure) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [state.procedures]);

  const statusMix = useMemo(() => {
    const map = new Map<string, number>();
    state.appointments.filter((a) => a.date === today).forEach((a) => {
      map.set(a.status, (map.get(a.status) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [state.appointments, today]);

  const alerts = useMemo(() => {
    const waiting = state.appointments.filter((a) => a.date === today && (a.status === 'Waiting' || a.status === 'Checked In')).length;
    const plans = state.plans.filter((p) => p.consentStatus === 'Pending' && p.status === 'Open').length;
    const due = state.followUps.filter((f) => followUpDisplayStatus(f, today) === 'Overdue' || (f.dueDate === today && f.status !== 'Completed' && f.status !== 'Cancelled')).length;
    const drafts = state.encounters.filter((e) => e.status === 'Draft').length;
    const low = state.inventory.filter((i) => ['Low stock', 'Out of stock', 'Expiring soon', 'Expired'].includes(stockStatus(i, today))).length;
    return [
      { label: `${waiting} patient${waiting === 1 ? '' : 's'} awaiting examination`, to: '/dashboard/dental/appointments?status=Waiting' },
      { label: `${plans} treatment plan${plans === 1 ? '' : 's'} awaiting approval or consent`, to: '/dashboard/dental/plans?status=Awaiting%20Patient%20Consent' },
      { label: `${due} follow-up${due === 1 ? '' : 's'} due`, to: '/dashboard/dental/follow-ups?filter=due' },
      { label: `${drafts} incomplete clinical note${drafts === 1 ? '' : 's'}`, to: '/dashboard/dental/encounters?status=Draft' },
      { label: `${low} dental material${low === 1 ? '' : 's'} low, expired, or out of stock`, to: '/dashboard/dental/inventory?stock=attention' },
    ];
  }, [state, today]);

  const delta = stats.todayAppointments - stats.yesterdayAppointments;

  return (
    <DentalShell title="Dashboard">
      <PageIntro
        title="Dental Dashboard"
        description="Today’s clinic at a glance. Counts come from the same demonstration records used by the schedule and patient charts."
        actions={<Button variant="outline" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4 mr-1" /> Reset demo data</Button>}
      />
      <DemoBanner />
      <DepartmentReportBox department="Dental" officer="Dr. Yetunde Akinola" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Today's appointments" value={String(stats.todayAppointments)} subtitle={delta >= 0 ? `${delta} more than yesterday` : `${Math.abs(delta)} fewer than yesterday`} icon={CalendarDays} tone="blue" trend={delta >= 0 ? 'up' : 'down'} />
        <SummaryCard title="Patients waiting" value={String(stats.waiting)} subtitle="Checked in or in the waiting area" icon={Users} tone="amber" />
        <SummaryCard title="Patients seen today" value={String(stats.seenToday)} subtitle="Completed visits or encounters" icon={UserCheck} tone="green" />
        <SummaryCard title="Completed procedures" value={String(stats.completedProcedures)} subtitle="Recorded as performed today" icon={CheckCircle2} tone="teal" />
        <SummaryCard title="Pending treatment plans" value={String(stats.pendingPlans)} subtitle="Items not completed or cancelled" icon={ClipboardList} tone="purple" />
        <SummaryCard title="Follow-ups due" value={String(stats.followUpsDue)} subtitle="Due today or overdue" icon={Repeat} tone="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <section className="xl:col-span-2 rounded-xl border bg-card p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold">Today’s appointments</h3>
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID" className="h-9 w-44" />
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="all">All statuses</option>
                {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRows.length === 0 && <EmptyRow colSpan={8} label="No appointments match this filter." />}
                {todayRows.map((a) => {
                  const patient = state.patients.find((p) => p.id === a.patientId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.startTime}</TableCell>
                      <TableCell>
                        <button className="text-primary font-medium hover:underline" onClick={() => navigate(`/dashboard/dental/patients/${a.patientId}`)}>
                          {patient ? patientName(patient) : nameOf(a.patientId)}
                        </button>
                      </TableCell>
                      <TableCell>{a.patientId}</TableCell>
                      <TableCell>{patient ? ageFromDob(patient.dateOfBirth, today) : '—'}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>{a.dentist.replace('Dr. ', '')}</TableCell>
                      <TableCell><DentalStatus status={a.status} /></TableCell>
                      <TableCell>
                        <select
                          className="h-8 rounded-md border bg-background px-1 text-xs"
                          value={a.status}
                          aria-label={`Update status for ${patient ? patientName(patient) : a.patientId}`}
                          onChange={(e) => {
                            setAppointmentStatus(a.id, e.target.value as AppointmentStatus);
                            notify.success('appointment', 'Appointment status updated in the demo.');
                          }}
                        >
                          {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-semibold">Chairs and rooms</h3>
          <ul className="space-y-2">
            {state.chairs.map((chair) => (
              <li key={chair.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{chair.name}</div>
                  <DentalStatus status={chair.status} />
                </div>
                <select
                  className="h-8 rounded-md border bg-background px-1 text-xs"
                  value={chair.status}
                  aria-label={`Status for ${chair.name}`}
                  onChange={(e) => updateChair(chair.id, e.target.value as ChairStatus)}
                >
                  {CHAIR_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <h3 className="font-semibold pt-2">Clinical alerts</h3>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.to}>
                <Link to={alert.to} className="block text-sm rounded-lg border px-3 py-2 hover:bg-muted">{alert.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Appointment volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volume}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} width={24} />
              <Tooltip />
              <Bar dataKey="appointments" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Procedures recorded</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={procedureMix} dataKey="value" nameKey="name" outerRadius={70}>
                {procedureMix.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold mb-2">Today’s status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={70}>
                {statusMix.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset dental demonstration data?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the original sample patients, charts, and appointments in this browser. It does not affect other departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetDemoData(); notify.success('dental-reset', 'Dental demo data restored.'); }}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DentalShell>
  );
}
