import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEye } from '@/contexts/EyeStore';
import { formatCurrency } from '@/data/dummyData';
import { DemoBanner, EyeShell, PageIntro } from './shared';

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

export function EyeClinicalReports() {
  const eye = useEye();
  const [from, setFrom] = useState(eye.today);
  const [to, setTo] = useState(eye.today);
  const inRange = (date: string) => date >= from && date <= to;
  const visits = eye.state.encounters.filter((row) => inRange(row.date));
  const acuity = eye.state.acuity.filter((row) => inRange(row.date));
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    eye.state.appointments.filter((row) => inRange(row.date)).forEach((row) => map.set(row.type, (map.get(row.type) ?? 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [eye.state.appointments, from, to]);
  const exportCsv = () => {
    download('eye-clinical.csv', [
      ['Date', 'Patient', 'Complaint'],
      ...visits.map((row) => [row.date, eye.nameOf(row.patientId), row.chiefComplaint]),
    ]);
  };
  return (
    <EyeShell title="Clinical reports">
      <PageIntro title="Clinical Reports" description="Counts for the selected dates. Charts use the demonstration records in this browser." actions={<Button variant="outline" onClick={() => window.print()}>Print</Button>} />
      <DemoBanner />
      <div className="flex gap-2 mb-4"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /></div>
      <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
        <div className="rounded-xl border p-3">Consultations in range<p className="text-2xl font-bold">{visits.length}</p></div>
        <div className="rounded-xl border p-3">Acuity records<p className="text-2xl font-bold">{acuity.length}</p></div>
        <div className="rounded-xl border p-3">Open investigations<p className="text-2xl font-bold">{eye.state.investigations.filter((row) => row.status !== 'Completed' && row.status !== 'Cancelled').length}</p></div>
      </div>
      <div className="h-64 rounded-xl border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart>
        </ResponsiveContainer>
      </div>
      <Button className="mt-3" variant="outline" onClick={exportCsv}>Download CSV</Button>
    </EyeShell>
  );
}

export function EyeOperationalReports() {
  const eye = useEye();
  const estimate = eye.state.plans.flatMap((plan) => plan.items).reduce((sum, item) => sum + item.estimatedCost, 0);
  const byRoom = eye.state.rooms.map((room) => ({ name: room.name, count: eye.state.appointments.filter((row) => row.roomId === room.id && row.date === eye.today).length }));
  const exportCsv = () => {
    download('eye-operations.csv', [
      ['Room', 'Today'],
      ...byRoom.map((row) => [row.name, String(row.count)]),
    ]);
  };
  return (
    <EyeShell title="Operational reports">
      <PageIntro title="Operational Reports" description="Room use and stock position for the demonstration clinic. Estimated treatment cost is not revenue." actions={<Button variant="outline" onClick={() => window.print()}>Print</Button>} />
      <DemoBanner text="Estimated cost is a planning figure only. It is not posted to the cashier and it is not revenue." />
      <p className="text-sm mb-3">Planning estimate across open items: {formatCurrency(estimate)}. This is not income.</p>
      <div className="h-64 rounded-xl border p-3 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byRoom}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1d4ed8" /></BarChart>
        </ResponsiveContainer>
      </div>
      <Button variant="outline" onClick={exportCsv}>Download CSV</Button>
    </EyeShell>
  );
}
