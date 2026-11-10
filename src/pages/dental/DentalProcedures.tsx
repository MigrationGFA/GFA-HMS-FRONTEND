import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { DENTISTS, patientName, type DentalProcedure, type ProcedureStatus } from '@/data/dentalData';
import { formatCurrency } from '@/data/dummyData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

const empty = (today: string, patientId = ''): Omit<DentalProcedure, 'id'> => ({
  patientId,
  encounterId: '',
  planId: '',
  planItemId: '',
  tooth: '',
  procedure: '',
  indication: '',
  anaesthesia: '',
  date: today,
  dentist: DENTISTS[0].name,
  materials: '',
  notes: '',
  outcome: '',
  complications: '',
  postOp: '',
  followUp: '',
  status: 'Recorded',
  charge: 0,
});

export function DentalProcedures() {
  const { state, today, saveProcedure } = useDental();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState<Omit<DentalProcedure, 'id'> & { id?: string }>(empty(today, params.get('patient') ?? ''));

  const openItems = state.plans.flatMap((plan) => plan.items
    .filter((item) => item.status !== 'Completed' && item.status !== 'Cancelled')
    .map((item) => ({ plan, item })));

  const rows = useMemo(() => state.procedures.filter((p) => {
    if (status !== 'all' && p.status !== status) return false;
    const name = state.patients.find((patient) => patient.id === p.patientId);
    return `${name ? patientName(name) : ''} ${p.procedure} ${p.tooth}`.toLowerCase().includes(q.trim().toLowerCase());
  }), [state, q, status]);

  const startFromPlan = (planId: string, itemId: string) => {
    const plan = state.plans.find((p) => p.id === planId);
    const item = plan?.items.find((row) => row.id === itemId);
    if (!plan || !item) return;
    const service = state.services.find((s) => s.name.toLowerCase().includes(item.procedure.toLowerCase().split(' ')[0].toLowerCase()));
    setForm({
      ...empty(today, plan.patientId),
      planId: plan.id,
      planItemId: item.id,
      tooth: item.tooth,
      procedure: item.procedure,
      indication: item.condition,
      dentist: item.dentist,
      charge: item.estimatedCost || service?.price || 0,
      status: 'Recorded',
    });
  };

  const save = (statusValue: ProcedureStatus) => {
    const result = saveProcedure({ ...form, status: statusValue });
    if (!result.ok) {
      notify.error('procedure', result.message);
      return;
    }
    notify.success('procedure', statusValue === 'Completed'
      ? 'Procedure recorded as performed. The linked plan item is now completed.'
      : 'Procedure details saved. It is not marked as performed.');
    setForm(empty(today));
  };

  return (
    <DentalShell title="Procedures">
      <PageIntro title="Procedures" description="Record what was actually performed. Planning a treatment does not mark it as done." />
      <DemoBanner />
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        <form className="rounded-xl border bg-card p-4 space-y-2" onSubmit={(e) => { e.preventDefault(); save('Completed'); }}>
          <h3 className="font-semibold">Record procedure</h3>
          <Label>Start from an open plan item</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" defaultValue="" onChange={(e) => {
            const [planId, itemId] = e.target.value.split('|');
            if (planId && itemId) startFromPlan(planId, itemId);
          }}>
            <option value="">Select…</option>
            {openItems.map(({ plan, item }) => {
              const person = state.patients.find((p) => p.id === plan.patientId);
              return (
                <option key={item.id} value={`${plan.id}|${item.id}`}>
                  {person ? patientName(person) : plan.patientId} · {item.procedure}
                </option>
              );
            })}
          </select>
          <Label>Patient</Label>
          <PatientPicker value={form.patientId} onChange={(patientId) => setForm({ ...form, patientId })} />
          <Label>Procedure</Label>
          <Input value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} required />
          <Label>Tooth</Label>
          <Input value={form.tooth} onChange={(e) => setForm({ ...form, tooth: e.target.value })} />
          <Label>Indication</Label>
          <Input value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} />
          <Label>Anaesthesia</Label>
          <Input value={form.anaesthesia} onChange={(e) => setForm({ ...form, anaesthesia: e.target.value })} />
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Label>Dentist</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.dentist} onChange={(e) => setForm({ ...form, dentist: e.target.value })}>
            {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <Label>Materials used</Label>
          <Input value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} placeholder="Does not deduct stock" />
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Label>Outcome</Label>
          <Input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
          <Label>Complications</Label>
          <Input value={form.complications} onChange={(e) => setForm({ ...form, complications: e.target.value })} />
          <Label>Post-operative instructions</Label>
          <Textarea value={form.postOp} onChange={(e) => setForm({ ...form, postOp: e.target.value })} />
          <Label>Follow-up</Label>
          <Input value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} />
          <Label>Illustrative charge (₦)</Label>
          <Input type="number" value={form.charge} onChange={(e) => setForm({ ...form, charge: Number(e.target.value) })} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => save('Recorded')}>Save details</Button>
            <Button type="submit">Mark performed</Button>
          </div>
        </form>
        <div>
          <div className="flex gap-2 mb-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search procedure or patient" />
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option>Recorded</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Tooth</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <EmptyRow colSpan={7} label="No procedures recorded." />}
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell><PatientLink id={row.patientId} name={patientName(state.patients.find((p) => p.id === row.patientId) ?? { firstName: row.patientId, lastName: '' })} /></TableCell>
                    <TableCell>{row.procedure}</TableCell>
                    <TableCell>{row.tooth || '—'}</TableCell>
                    <TableCell>{row.dentist}</TableCell>
                    <TableCell>{formatCurrency(row.charge)}</TableCell>
                    <TableCell><DentalStatus status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DentalShell>
  );
}
