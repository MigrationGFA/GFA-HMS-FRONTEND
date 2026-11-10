import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import {
  DENTISTS,
  INV_TYPES,
  patientName,
  type DentalInvestigation,
  type DentalReferral,
  type InvStatus,
  type InvType,
  type Priority,
  type ReferralStatus,
} from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

export function DentalInvestigations() {
  const { state, today, saveInvestigation } = useDental();
  const [params] = useSearchParams();
  const [form, setForm] = useState<Omit<DentalInvestigation, 'id'>>({
    patientId: params.get('patient') ?? '',
    encounterId: '',
    type: 'Periapical radiograph',
    indication: '',
    requestedDate: today,
    dentist: DENTISTS[0].name,
    priority: 'Routine',
    status: params.get('new') === '1' ? 'Requested' : 'Requested',
    result: '',
  });
  const [resultFor, setResultFor] = useState<DentalInvestigation | null>(null);
  const [resultText, setResultText] = useState('');

  const save = () => {
    if (!form.patientId || !form.indication.trim()) {
      notify.error('investigation', 'Patient and clinical indication are required.');
      return;
    }
    saveInvestigation(form);
    notify.success('investigation', 'Investigation request stored in the demonstration record.');
    setForm({ ...form, indication: '', result: '' });
  };

  return (
    <DentalShell title="Investigations">
      <PageIntro title="Investigations" description="Request common dental imaging or a laboratory test. Results are typed summaries only." />
      <DemoBanner text="This screen does not acquire images, interpret radiographs, or connect to a radiology system." />
      {params.get('new') === '1' && <p className="text-sm mb-3">Opened from a consultation. Complete the request below.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <Label>Patient</Label>
          <PatientPicker value={form.patientId} onChange={(patientId) => setForm({ ...form, patientId })} />
          <Label>Type</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvType })}>
            {INV_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Label>Indication</Label>
          <Textarea value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} />
          <Label>Date</Label>
          <Input type="date" value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })} />
          <Label>Priority</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            <option>Routine</option><option>Soon</option><option>Urgent</option>
          </select>
          <Label>Status</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InvStatus })}>
            {['Requested', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button onClick={save}>Save request</Button>
        </div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Indication</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.investigations.length === 0 && <EmptyRow colSpan={6} label="No investigations." />}
              {state.investigations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.requestedDate}</TableCell>
                  <TableCell><PatientLink id={row.patientId} name={patientName(state.patients.find((p) => p.id === row.patientId) ?? { firstName: 'Patient', lastName: '' })} /></TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.indication}</TableCell>
                  <TableCell><DentalStatus status={row.status} /></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => { setResultFor(row); setResultText(row.result); }}>Result</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {resultFor && (
        <div className="mt-4 rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold">Mock report · {resultFor.type}</h3>
          <p className="text-xs text-muted-foreground">{resultFor.result || 'No report yet.'}</p>
          <Textarea value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="Type a demonstration report summary" />
          <div className="flex gap-2">
            <Button onClick={() => {
              saveInvestigation({ ...resultFor, result: resultText, status: 'Completed' });
              notify.success('investigation', 'Report summary saved in the demonstration record.');
              setResultFor(null);
            }}>Save report</Button>
            <Button variant="outline" onClick={() => setResultFor(null)}>Close</Button>
          </div>
        </div>
      )}
    </DentalShell>
  );
}

export function DentalReferrals() {
  const { state, today, saveReferral } = useDental();
  const [params] = useSearchParams();
  const [form, setForm] = useState<Omit<DentalReferral, 'id'>>({
    patientId: params.get('patient') ?? '',
    encounterId: '',
    destination: 'Oral and Maxillofacial Surgery',
    reason: '',
    findings: '',
    urgency: 'Routine',
    notes: '',
    status: 'Draft',
    date: today,
    dentist: DENTISTS[0].name,
  });

  const save = () => {
    if (!form.patientId || !form.reason.trim() || !form.destination.trim()) {
      notify.error('referral', 'Patient, destination, and reason are required.');
      return;
    }
    saveReferral(form);
    notify.success('referral', 'Referral stored in the demonstration record.');
    setForm({ ...form, reason: '', findings: '', notes: '' });
  };

  return (
    <DentalShell title="Referrals">
      <PageIntro title="Referrals" description="Refer a patient to another specialty. This does not send a message outside the demo." />
      <DemoBanner />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <Label>Patient</Label>
          <PatientPicker value={form.patientId} onChange={(patientId) => setForm({ ...form, patientId })} />
          <Label>Destination</Label>
          <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <Label>Reason</Label>
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Label>Relevant findings</Label>
          <Textarea value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
          <Label>Urgency</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Priority })}>
            <option>Routine</option><option>Soon</option><option>Urgent</option>
          </select>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Label>Status</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ReferralStatus })}>
            {['Draft', 'Sent', 'Accepted', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button onClick={save}>Save referral</Button>
        </div>
        <div className="space-y-2">
          {state.referrals.map((row) => (
            <article key={row.id} className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex justify-between gap-2">
                <PatientLink id={row.patientId} name={patientName(state.patients.find((p) => p.id === row.patientId) ?? { firstName: 'Patient', lastName: '' })} />
                <DentalStatus status={row.status} />
              </div>
              <p className="font-medium mt-1">{row.destination}</p>
              <p>{row.reason}</p>
              <p className="text-muted-foreground">{row.findings}</p>
              <p className="text-xs mt-1">{row.date} · {row.urgency} · {row.dentist}</p>
              <div className="flex gap-2 mt-2">
                {(['Sent', 'Accepted', 'Completed', 'Cancelled'] as ReferralStatus[]).map((status) => (
                  <Button key={status} size="sm" variant="outline" onClick={() => saveReferral({ ...row, status })}>{status}</Button>
                ))}
              </div>
            </article>
          ))}
          {state.referrals.length === 0 && <p className="text-sm text-muted-foreground">No referrals.</p>}
        </div>
      </div>
    </DentalShell>
  );
}
