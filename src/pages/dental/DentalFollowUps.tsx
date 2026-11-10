import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { DENTISTS, followUpDisplayStatus, patientName, type DentalFollowUp } from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

export function DentalFollowUps() {
  const { state, today, saveFollowUp, saveAppointment } = useDental();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState(params.get('filter') ?? 'all');
  const [form, setForm] = useState<Omit<DentalFollowUp, 'id'>>({
    patientId: params.get('patient') ?? '',
    encounterId: '',
    procedureId: '',
    dueDate: today,
    reason: '',
    dentist: DENTISTS[0].name,
    status: 'Upcoming',
    notes: '',
    appointmentId: '',
  });
  const [reschedule, setReschedule] = useState<DentalFollowUp | null>(null);
  const [newDate, setNewDate] = useState(today);

  const rows = useMemo(() => state.followUps.filter((row) => {
    const display = followUpDisplayStatus(row, today);
    if (filter === 'due') return display === 'Overdue' || row.dueDate <= today && display !== 'Completed' && display !== 'Cancelled';
    if (filter === 'overdue') return display === 'Overdue';
    if (filter === 'upcoming') return display === 'Upcoming';
    return true;
  }), [state.followUps, filter, today]);

  const create = () => {
    if (!form.patientId || !form.reason.trim() || !form.dueDate) {
      notify.error('follow-up', 'Patient, reason, and date are required.');
      return;
    }
    saveFollowUp(form);
    notify.success('follow-up', 'Follow-up added to the demonstration list.');
    setForm({ ...form, reason: '', notes: '' });
  };

  const book = (row: DentalFollowUp) => {
    const result = saveAppointment({
      patientId: row.patientId,
      date: row.dueDate < today ? today : row.dueDate,
      startTime: '16:00',
      endTime: '16:20',
      type: 'Follow-up',
      dentist: row.dentist,
      chairId: 'CH2',
      reason: row.reason,
      notes: 'Booked from follow-up list.',
      status: 'Scheduled',
    });
    if (!result.ok) {
      notify.error('follow-up', result.message);
      return;
    }
    saveFollowUp({ ...row, appointmentId: result.value.id, status: 'Upcoming' });
    notify.success('follow-up', 'Appointment linked to this follow-up.');
    navigate('/dashboard/dental/appointments');
  };

  return (
    <DentalShell title="Follow-ups">
      <PageIntro title="Follow-ups" description="Track recommended reviews and turn one into an appointment." />
      <DemoBanner />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <Label>Patient</Label>
          <PatientPicker value={form.patientId} onChange={(patientId) => setForm({ ...form, patientId })} />
          <Label>Previous procedure</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.procedureId} onChange={(e) => setForm({ ...form, procedureId: e.target.value })}>
            <option value="">None</option>
            {state.procedures.filter((p) => !form.patientId || p.patientId === form.patientId).map((p) => (
              <option key={p.id} value={p.id}>{p.date} · {p.procedure}</option>
            ))}
          </select>
          <Label>Due date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Label>Reason</Label>
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Label>Dentist</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.dentist} onChange={(e) => setForm({ ...form, dentist: e.target.value })}>
            {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={create}>Create follow-up</Button>
        </div>
        <div>
          <div className="flex gap-2 mb-3">
            {['all', 'due', 'overdue', 'upcoming'].map((key) => (
              <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)} className="capitalize">{key}</Button>
            ))}
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <EmptyRow colSpan={6} label="No follow-ups in this filter." />}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><PatientLink id={row.patientId} name={patientName(state.patients.find((p) => p.id === row.patientId) ?? { firstName: 'Patient', lastName: '' })} /></TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell>{row.dentist}</TableCell>
                    <TableCell><DentalStatus status={followUpDisplayStatus(row, today)} /></TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => { setReschedule(row); setNewDate(row.dueDate); }}>Reschedule</Button>
                      <Button size="sm" variant="ghost" onClick={() => saveFollowUp({ ...row, status: 'Completed' })}>Complete</Button>
                      <Button size="sm" variant="ghost" onClick={() => book(row)}>Book</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {reschedule && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
          <div>
            <Label>New date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <Button onClick={() => { saveFollowUp({ ...reschedule, dueDate: newDate, status: 'Upcoming' }); setReschedule(null); notify.success('follow-up', 'Follow-up rescheduled.'); }}>Save date</Button>
          <Button variant="outline" onClick={() => setReschedule(null)}>Cancel</Button>
        </div>
      )}
    </DentalShell>
  );
}
