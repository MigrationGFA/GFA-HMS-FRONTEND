import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEye } from '@/contexts/EyeStore';
import { APPOINTMENT_STATUSES, CLINICIANS, VISIT_TYPES, isoDate, stockStatus, type AppointmentStatus, type EquipmentStatus, type RoomStatus, type VisitType } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeShell, EyeStatus, PageIntro, PatientLink, PatientPicker, selectClass } from './shared';

export function EyeAppointments() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [statusFilter, setStatusFilter] = useState(params.get('status') ?? 'All');
  const [date, setDate] = useState(eye.today);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('11:30');
  const [type, setType] = useState<VisitType>(VISIT_TYPES[0]);
  const [clinician, setClinician] = useState(CLINICIANS[0].name);
  const [roomId, setRoomId] = useState(eye.state.rooms[0]?.id ?? '');
  const preset = params.get('patient');
  const rows = eye.state.appointments.filter((row) => {
    if (preset && row.patientId !== preset) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    return true;
  });
  const save = () => {
    const result = eye.saveAppointment({ patientId, date, startTime, endTime, type, clinician, roomId, reason: 'Booked in the eye clinic demo', notes: '', status: 'Scheduled' });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    eyeNotify('success', 'Appointment saved in this browser.');
  };
  return (
    <EyeShell title="Appointments">
      <PageIntro title="Appointments" description="Book a visit and update status. Overlapping clinician or room times are rejected." />
      <DemoBanner />
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start" />
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End" />
        <select className={selectClass()} value={type} onChange={(e) => setType(e.target.value as VisitType)} aria-label="Visit type">{VISIT_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
        <select className={selectClass()} value={clinician} onChange={(e) => setClinician(e.target.value)} aria-label="Clinician">{CLINICIANS.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <select className={selectClass()} value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Room">{eye.state.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select>
        <Button onClick={save}>Book</Button>
      </div>
      <select className={selectClass() + ' max-w-xs mb-3'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status filter"><option>All</option>{APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['When', 'Patient', 'Type', 'Clinician', 'Status'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{row.date} {row.startTime}</td>
                <td className="p-2"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /></td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.clinician}</td>
                <td className="p-2">
                  <select className="h-8 rounded border px-1" value={row.status} aria-label={`Status ${row.id}`} onChange={(e) => { eye.setAppointmentStatus(row.id, e.target.value as AppointmentStatus); eyeNotify('success', 'Appointment status updated.'); }}>
                    {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EyeShell>
  );
}

export function EyeSchedule() {
  const eye = useEye();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [clinician, setClinician] = useState('All');
  const end = isoDate(6);
  const rows = eye.state.appointments.filter((row) => {
    if (clinician !== 'All' && row.clinician !== clinician) return false;
    if (mode === 'day') return row.date === eye.today;
    return row.date >= eye.today && row.date <= end;
  }).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  return (
    <EyeShell title="Schedule">
      <PageIntro title="Eye Clinic Schedule" description="Day and week lists for the clinic. Times that overlap a clinician or room are blocked when booking." />
      <DemoBanner />
      <div className="flex gap-2 mb-3">
        <Button variant={mode === 'day' ? 'default' : 'outline'} onClick={() => setMode('day')}>Today</Button>
        <Button variant={mode === 'week' ? 'default' : 'outline'} onClick={() => setMode('week')}>Next 7 days</Button>
        <select className={selectClass() + ' max-w-xs'} value={clinician} onChange={(e) => setClinician(e.target.value)} aria-label="Clinician"><option>All</option>{CLINICIANS.map((c) => <option key={c.name}>{c.name}</option>)}</select>
      </div>
      <ul className="space-y-2 text-sm">{rows.map((row) => <li key={row.id} className="rounded-lg border p-3 flex justify-between"><span>{row.date} {row.startTime}–{row.endTime} · <PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.type}</span><EyeStatus status={row.status} /></li>)}{rows.length === 0 && <p className="text-muted-foreground">No visits in this range.</p>}</ul>
    </EyeShell>
  );
}

export function EyeRooms() {
  const eye = useEye();
  return (
    <EyeShell title="Rooms">
      <PageIntro title="Examination Rooms" description="Update whether a room is available, in use, being cleaned, or closed." />
      <DemoBanner />
      <ul className="space-y-2">{eye.state.rooms.map((room) => (
        <li key={room.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span><span className="font-medium">{room.name}</span> · {room.type}</span>
          <select className="h-9 rounded border px-2" value={room.status} aria-label={`${room.name} status`} onChange={(e) => eye.setRoomStatus(room.id, e.target.value as RoomStatus)}>
            {(['Available', 'In Use', 'Cleaning', 'Closed'] as RoomStatus[]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </li>
      ))}</ul>
    </EyeShell>
  );
}

export function EyeEquipment() {
  const eye = useEye();
  return (
    <EyeShell title="Equipment">
      <PageIntro title="Equipment Register" description="Items due for maintenance are highlighted. Status changes stay in this browser." />
      <DemoBanner />
      <ul className="space-y-2 text-sm">{eye.state.equipment.map((item) => (
        <li key={item.id} className={`rounded-lg border p-3 flex flex-wrap justify-between gap-2 ${item.status === 'Maintenance due' || item.nextMaintenance <= eye.today ? 'border-amber-400 bg-amber-50' : ''}`}>
          <div><p className="font-medium">{item.name}</p><p className="text-muted-foreground">{item.location} · next maintenance {item.nextMaintenance || '—'}</p></div>
          <select className="h-9 rounded border px-2" value={item.status} aria-label={`${item.name} status`} onChange={(e) => eye.setEquipmentStatus(item.id, e.target.value as EquipmentStatus)}>
            {(['Available', 'In use', 'Maintenance due', 'Unavailable'] as EquipmentStatus[]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </li>
      ))}</ul>
    </EyeShell>
  );
}

export function EyeInventory() {
  const eye = useEye();
  const [qty, setQty] = useState<Record<string, string>>({});
  return (
    <EyeShell title="Inventory">
      <PageIntro title="Ophthalmic Inventory" description="Adjust on-hand quantities. Low stock, expiry, and zero balances are labelled. Recording a procedure does not post stock." />
      <DemoBanner />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Item', 'Qty', 'Status', 'Adjust'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {eye.state.inventory.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.name}<div className="text-xs text-muted-foreground">{item.location}</div></td>
                <td className="p-2">{item.quantity} {item.unit}</td>
                <td className="p-2"><EyeStatus status={stockStatus(item, eye.today)} /></td>
                <td className="p-2 flex gap-2">
                  <Label className="sr-only" htmlFor={`qty-${item.id}`}>Quantity</Label>
                  <Input id={`qty-${item.id}`} className="w-24" value={qty[item.id] ?? String(item.quantity)} onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })} />
                  <Button size="sm" variant="outline" onClick={() => {
                    const result = eye.adjustStock(item.id, Number(qty[item.id] ?? item.quantity));
                    if (!result.ok) eyeNotify('error', result.message); else eyeNotify('success', 'Stock updated in this browser.');
                  }}>Save</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EyeShell>
  );
}
