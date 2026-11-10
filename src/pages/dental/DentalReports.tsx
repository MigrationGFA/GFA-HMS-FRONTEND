import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { isoDate, patientName } from '@/data/dentalData';
import { formatCurrency } from '@/data/dummyData';
import { DentalShell, DemoBanner, PageIntro } from './shared';

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DentalClinicalReports() {
  const { state, today } = useDental();
  const [from, setFrom] = useState(isoDate(-30));
  const [to, setTo] = useState(today);

  const encounters = state.encounters.filter((e) => inRange(e.date, from, to));
  const completed = encounters.filter((e) => e.status === 'Completed');
  const procedures = state.procedures.filter((p) => inRange(p.date, from, to) && p.status === 'Completed');
  const mix = useMemo(() => {
    const map = new Map<string, number>();
    procedures.forEach((p) => map.set(p.procedure, (map.get(p.procedure) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [procedures]);
  const planItems = state.plans.flatMap((p) => p.items).filter((item) => !item.plannedDate || inRange(item.plannedDate, from, to));
  const planDone = planItems.filter((item) => item.status === 'Completed').length;
  const followUps = state.followUps.filter((f) => inRange(f.dueDate, from, to));
  const attended = followUps.filter((f) => f.status === 'Completed' || f.appointmentId).length;
  const estimated = planItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const charges = procedures.reduce((sum, p) => sum + p.charge, 0);

  return (
    <DentalShell title="Clinical reports">
      <div className="dental-report-print">
        <PageIntro
          title="Clinical reports"
          description="Counts from the dental demonstration dataset for the selected dates."
          actions={<Button variant="outline" onClick={() => window.print()}>Print</Button>}
        />
        <DemoBanner text="Estimated treatment value is not collected revenue." />
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => downloadCsv('dental-clinical.csv', [
            ['Metric', 'Value'],
            ['Completed consultations', String(completed.length)],
            ['Procedures performed', String(procedures.length)],
            ['Plan items completed', `${planDone}/${planItems.length}`],
            ['Estimated plan value', String(estimated)],
            ['Illustrative procedure charges', String(charges)],
          ])}>Export CSV</Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
          <Stat label="Completed consultations" value={String(completed.length)} />
          <Stat label="Procedures performed" value={String(procedures.length)} />
          <Stat label="Plan completion" value={planItems.length ? `${Math.round((planDone / planItems.length) * 100)}%` : '—'} />
          <Stat label="Follow-up attendance" value={followUps.length ? `${attended}/${followUps.length}` : '—'} />
        </div>
        <div className="rounded-xl border bg-card p-4 mb-4">
          <h3 className="font-semibold mb-2">Procedure distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mix.length ? mix : [{ name: 'None', count: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} height={70} textAnchor="end" />
              <YAxis allowDecimals={false} fontSize={11} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border bg-card p-4">
            <p>Estimated treatment-plan value in range: <strong>{formatCurrency(estimated)}</strong></p>
            <p className="text-muted-foreground mt-1">Not collected revenue.</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p>Illustrative charges on performed procedures: <strong>{formatCurrency(charges)}</strong></p>
            <p className="text-muted-foreground mt-1">Not posted to the cashier.</p>
          </div>
        </div>
      </div>
    </DentalShell>
  );
}

export function DentalOperationalReports() {
  const { state, today } = useDental();
  const [from, setFrom] = useState(isoDate(-30));
  const [to, setTo] = useState(today);
  const appointments = state.appointments.filter((a) => inRange(a.date, from, to));
  const cancelled = appointments.filter((a) => a.status === 'Cancelled').length;
  const noShow = appointments.filter((a) => a.status === 'No Show').length;
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    appointments.filter((a) => a.status !== 'Cancelled').forEach((a) => map.set(a.date, (map.get(a.date) ?? 0) + 1));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [appointments]);
  const workload = useMemo(() => {
    const map = new Map<string, number>();
    appointments.filter((a) => a.status !== 'Cancelled').forEach((a) => map.set(a.dentist, (map.get(a.dentist) ?? 0) + 1));
    return Array.from(map.entries()).map(([dentist, count]) => ({ dentist, count }));
  }, [appointments]);
  const serviceUse = useMemo(() => {
    const map = new Map<string, number>();
    state.procedures.filter((p) => inRange(p.date, from, to)).forEach((p) => map.set(p.procedure, (map.get(p.procedure) ?? 0) + 1));
    appointments.forEach((a) => map.set(a.type, (map.get(a.type) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [state.procedures, appointments, from, to]);
  const rateBase = appointments.length || 1;

  return (
    <DentalShell title="Operational reports">
      <div className="dental-report-print">
        <PageIntro
          title="Operational reports"
          description="Appointment flow, workload, and service use from the dental demonstration data."
          actions={<Button variant="outline" onClick={() => window.print()}>Print</Button>}
        />
        <DemoBanner />
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => downloadCsv('dental-operations.csv', [
            ['Date', 'Appointments'],
            ...byDay.map((row) => [row.date, String(row.count)]),
          ])}>Export CSV</Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Appointments" value={String(appointments.length)} />
          <Stat label="Cancellation rate" value={`${Math.round((cancelled / rateBase) * 100)}%`} />
          <Stat label="No-show rate" value={`${Math.round((noShow / rateBase) * 100)}%`} />
          <Stat label="Patients in register" value={String(state.patients.length)} />
        </div>
        <div className="rounded-xl border bg-card p-4 mb-4">
          <h3 className="font-semibold mb-2">Appointments by day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay.length ? byDay : [{ date: '—', count: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Dentist</TableHead><TableHead>Appointments</TableHead></TableRow></TableHeader>
              <TableBody>
                {workload.map((row) => (
                  <TableRow key={row.dentist}><TableCell>{row.dentist}</TableCell><TableCell>{row.count}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Service or visit type</TableHead><TableHead>Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {serviceUse.map((row) => (
                  <TableRow key={row.name}><TableCell>{row.name}</TableCell><TableCell>{row.count}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Sample patient {patientName(state.patients[0] ?? { firstName: '—', lastName: '' })} is included only as a register count, not as a billing export.</p>
      </div>
    </DentalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
