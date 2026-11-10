import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  DENTISTS,
  isoDate,
  patientName,
  type AppointmentStatus,
  type AppointmentType,
  type DentalAppointment,
} from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

type Draft = Omit<DentalAppointment, 'id'> & { id?: string };

const empty = (today: string, patientId = ''): Draft => ({
  patientId,
  date: today,
  startTime: '09:00',
  endTime: '09:30',
  type: 'Routine check-up',
  dentist: DENTISTS[0].name,
  chairId: 'CH1',
  reason: '',
  notes: '',
  status: 'Scheduled',
});

export function DentalAppointments() {
  const { state, today, saveAppointment, setAppointmentStatus } = useDental();
  const [params] = useSearchParams();
  const [view, setView] = useState<'list' | 'day' | 'week'>('list');
  const [cursor, setCursor] = useState(today);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [type, setType] = useState('all');
  const [open, setOpen] = useState(params.get('new') === '1');
  const [draft, setDraft] = useState<Draft>(empty(today, params.get('patient') ?? ''));
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return state.appointments
      .filter((a) => status === 'all' || a.status === status)
      .filter((a) => type === 'all' || a.type === type)
      .filter((a) => view === 'list' || (view === 'day' ? a.date === cursor : a.date >= cursor && a.date <= isoDate(6, new Date(`${cursor}T12:00:00`))))
      .filter((a) => {
        const patient = state.patients.find((p) => p.id === a.patientId);
        return `${patient ? patientName(patient) : ''} ${a.reason} ${a.dentist}`.toLowerCase().includes(q.trim().toLowerCase());
      })
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [state, status, type, view, cursor, q]);

  const shift = (days: number) => setCursor(isoDate(days, new Date(`${cursor}T12:00:00`)));

  const save = () => {
    const result = saveAppointment(draft);
    if (!result.ok) {
      notify.error('appointment', result.message);
      return;
    }
    notify.success('appointment', 'Appointment stored in the demonstration schedule.');
    setOpen(false);
  };

  const edit = (a: DentalAppointment) => {
    setDraft(a);
    setOpen(true);
  };

  return (
    <DentalShell title="Appointments">
      <PageIntro
        title="Appointments"
        description="List, day, and week views share the dental schedule. Overlapping dentist or chair bookings are blocked."
        actions={<Button onClick={() => { setDraft(empty(cursor, params.get('patient') ?? '')); setOpen(true); }}>New appointment</Button>}
      />
      <DemoBanner />
      <div className="flex flex-wrap gap-2 mb-3">
        {(['list', 'day', 'week'] as const).map((item) => (
          <Button key={item} size="sm" variant={view === item ? 'default' : 'outline'} onClick={() => setView(item)} className="capitalize">{item}</Button>
        ))}
        {view !== 'list' && (
          <>
            <Button size="sm" variant="outline" onClick={() => shift(view === 'day' ? -1 : -7)}>Previous</Button>
            <Input type="date" value={cursor} onChange={(e) => setCursor(e.target.value)} className="w-40" />
            <Button size="sm" variant="outline" onClick={() => shift(view === 'day' ? 1 : 7)}>Next</Button>
          </>
        )}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="max-w-[180px]" />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">All types</option>
          {APPOINTMENT_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dentist</TableHead>
              <TableHead>Chair</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <EmptyRow colSpan={8} label="No appointments in this view." />}
            {filtered.map((a) => {
              const patient = state.patients.find((p) => p.id === a.patientId);
              return (
                <TableRow key={a.id}>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.startTime}–{a.endTime}</TableCell>
                  <TableCell>{patient ? <PatientLink id={patient.id} name={patientName(patient)} /> : a.patientId}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.dentist}</TableCell>
                  <TableCell>{a.chairId}</TableCell>
                  <TableCell><DentalStatus status={a.status} /></TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => edit(a)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAppointmentStatus(a.id, 'Checked In')}>Check in</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAppointmentStatus(a.id, 'Completed')}>Complete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAppointmentStatus(a.id, 'No Show')}>No-show</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(a.id)}>Cancel</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft.id ? 'Edit appointment' : 'New appointment'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Patient</Label>
            <PatientPicker value={draft.patientId} onChange={(patientId) => setDraft({ ...draft, patientId })} />
            <Label>Date</Label>
            <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start</Label><Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></div>
            </div>
            <Label>Type</Label>
            <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as AppointmentType })}>
              {APPOINTMENT_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Label>Dentist</Label>
            <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.dentist} onChange={(e) => setDraft({ ...draft, dentist: e.target.value })}>
              {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
            </select>
            <Label>Chair</Label>
            <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.chairId} onChange={(e) => setDraft({ ...draft, chairId: e.target.value })}>
              {state.chairs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Label>Reason</Label>
            <Input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
            <Label>Notes</Label>
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            <Label>Status</Label>
            <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AppointmentStatus })}>
              {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{draft.id ? 'Save changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmCancel)} onOpenChange={() => setConfirmCancel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel this appointment?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The slot will be released in the demonstration schedule.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>Keep</Button>
            <Button variant="destructive" onClick={() => { if (confirmCancel) setAppointmentStatus(confirmCancel, 'Cancelled'); setConfirmCancel(null); }}>Cancel appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DentalShell>
  );
}

export function DentalSchedule() {
  const { state, today } = useDental();
  const [date, setDate] = useState(today);
  const rows = state.appointments.filter((a) => a.date === date && a.status !== 'Cancelled').sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <DentalShell title="Schedule">
      <PageIntro title="Dental schedule" description="Chair and dentist board for the selected day. Status changes are made from Appointments." />
      <DemoBanner />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {state.chairs.map((chair) => (
          <section key={chair.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{chair.name}</h3>
              <DentalStatus status={chair.status} />
            </div>
            <ul className="space-y-2">
              {rows.filter((a) => a.chairId === chair.id).length === 0 && <li className="text-xs text-muted-foreground">No bookings.</li>}
              {rows.filter((a) => a.chairId === chair.id).map((a) => {
                const patient = state.patients.find((p) => p.id === a.patientId);
                return (
                  <li key={a.id} className="border rounded-lg p-2 text-xs">
                    <div className="font-medium">{a.startTime}–{a.endTime}</div>
                    <div>{patient ? patientName(patient) : a.patientId}</div>
                    <div className="text-muted-foreground">{a.type}</div>
                    <div>{a.dentist}</div>
                    <DentalStatus status={a.status} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DentalShell>
  );
}
