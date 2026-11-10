import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDental } from '@/contexts/DentalStore';
import {
  DENTISTS,
  PLAN_STATUSES,
  patientName,
  type PlanItemStatus,
  type Priority,
  type TreatmentItem,
} from '@/data/dentalData';
import { formatCurrency } from '@/data/dummyData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, PageIntro, PatientPicker } from './shared';

const PROCEDURES = [
  'Oral examination', 'Dental scaling and polishing', 'Composite restoration', 'Amalgam restoration',
  'Tooth extraction', 'Root canal treatment', 'Crown placement', 'Denture fitting',
  'Periodontal treatment', 'Fluoride application', 'Dental radiography',
];

const blankItem = (dentist: string, date: string): Omit<TreatmentItem, 'id'> => ({
  tooth: '',
  condition: '',
  procedure: 'Composite restoration',
  description: '',
  priority: 'Routine',
  plannedDate: date,
  dentist,
  durationMin: 40,
  estimatedCost: 25000,
  status: 'Proposed',
  notes: '',
  consent: 'Pending',
});

export function DentalTreatmentPlans() {
  const { state, today, savePlan, addPlanItem, updatePlanItem, removePlanItem, setPlanConsent } = useDental();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [open, setOpen] = useState(params.get('new') === '1');
  const [title, setTitle] = useState('Dental treatment plan');
  const [dentist, setDentist] = useState(DENTISTS[0].name);
  const [editing, setEditing] = useState<{ planId: string; item?: TreatmentItem } | null>(null);
  const [item, setItem] = useState(blankItem(DENTISTS[0].name, today));
  const [removeTarget, setRemoveTarget] = useState<{ planId: string; itemId: string } | null>(null);

  const plans = useMemo(() => state.plans.filter((plan) => {
    if (patientId && plan.patientId !== patientId) return false;
    if (status === 'all') return true;
    return plan.items.some((row) => row.status === status) || plan.consentStatus === status;
  }), [state.plans, patientId, status]);

  const create = () => {
    if (!patientId) {
      notify.error('plan', 'Select a patient.');
      return;
    }
    savePlan({ patientId, title, dentist, status: 'Open', consentStatus: 'Pending', nextSessionDate: '' });
    notify.success('plan', 'Treatment plan created in the demonstration record.');
    setOpen(false);
  };

  const saveItem = () => {
    if (!editing) return;
    if (!item.procedure.trim() || !item.condition.trim()) {
      notify.error('plan', 'Condition and procedure are required.');
      return;
    }
    if (editing.item) updatePlanItem(editing.planId, editing.item.id, item);
    else addPlanItem(editing.planId, item);
    notify.success('plan', 'Treatment item updated. A planned item is not a completed procedure.');
    setEditing(null);
  };

  return (
    <DentalShell title="Treatment plans">
      <PageIntro
        title="Treatment plans"
        description="Proposed care stays separate from procedures that have actually been performed."
        actions={<Button onClick={() => setOpen(true)}>Create treatment plan</Button>}
      />
      <DemoBanner text="Prices are illustrative. Completing a plan item here does not record a procedure until you do that on the Procedures screen." />
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="w-64"><PatientPicker value={patientId} onChange={setPatientId} /></div>
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All item statuses</option>
          {PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-4">
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No treatment plans match this filter.</p>}
        {plans.map((plan) => {
          const total = plan.items.reduce((sum, row) => sum + row.estimatedCost, 0);
          const done = plan.items.filter((row) => row.status === 'Completed').length;
          const patient = state.patients.find((p) => p.id === plan.patientId);
          return (
            <article key={plan.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">{patient ? patientName(patient) : plan.patientId} · {plan.dentist} · {plan.createdAt}</p>
                </div>
                <div className="text-sm text-right">
                  <div>Estimated total {formatCurrency(total)}</div>
                  <div>{done}/{plan.items.length} items completed</div>
                  <DentalStatus status={plan.consentStatus} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button size="sm" variant="outline" onClick={() => { setEditing({ planId: plan.id }); setItem(blankItem(plan.dentist, today)); }}>Add procedure</Button>
                <Button size="sm" variant="outline" onClick={() => setPlanConsent(plan.id, 'Given')}>Record consent</Button>
                <Button size="sm" variant="outline" onClick={() => setPlanConsent(plan.id, 'Declined')}>Consent declined</Button>
                <label className="text-xs flex items-center gap-2">
                  Next session
                  <Input type="date" className="h-8 w-36" value={plan.nextSessionDate} onChange={(e) => savePlan({ ...plan, nextSessionDate: e.target.value })} />
                </label>
              </div>
              <ul className="space-y-2">
                {plan.items.map((row) => (
                  <li key={row.id} className="border rounded-lg p-3 text-sm grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <div>
                      <div className="font-medium">{row.procedure}{row.tooth ? ` · tooth ${row.tooth}` : ''}</div>
                      <p className="text-muted-foreground">{row.condition}. {row.description}</p>
                      <p className="text-xs mt-1">{row.priority} · {row.plannedDate} · {row.durationMin} min · {formatCurrency(row.estimatedCost)} · {row.dentist}</p>
                      {row.notes && <p className="text-xs">{row.notes}</p>}
                      <div className="flex gap-2 mt-1"><DentalStatus status={row.status} /><DentalStatus status={row.consent} /></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <select className="h-8 rounded-md border bg-background px-1 text-xs" value={row.status} onChange={(e) => updatePlanItem(plan.id, row.id, { status: e.target.value as PlanItemStatus })}>
                        {PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing({ planId: plan.id, item: row }); setItem(row); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoveTarget({ planId: plan.id, itemId: row.id })}>Remove</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New treatment plan</DialogTitle></DialogHeader>
          <Label>Patient</Label>
          <PatientPicker value={patientId} onChange={setPatientId} />
          <Label className="mt-2">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Label className="mt-2">Dentist</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={dentist} onChange={(e) => setDentist(e.target.value)}>
            {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.item ? 'Edit treatment item' : 'Add treatment item'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><Label>Tooth</Label><Input value={item.tooth} onChange={(e) => setItem({ ...item, tooth: e.target.value })} placeholder="e.g. 16" /></div>
            <div><Label>Procedure</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={item.procedure} onChange={(e) => setItem({ ...item, procedure: e.target.value })}>
                {PROCEDURES.map((name) => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Condition / diagnosis</Label><Input value={item.condition} onChange={(e) => setItem({ ...item, condition: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></div>
            <div><Label>Priority</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={item.priority} onChange={(e) => setItem({ ...item, priority: e.target.value as Priority })}>
                <option>Routine</option><option>Soon</option><option>Urgent</option>
              </select>
            </div>
            <div><Label>Planned date</Label><Input type="date" value={item.plannedDate} onChange={(e) => setItem({ ...item, plannedDate: e.target.value })} /></div>
            <div><Label>Dentist</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={item.dentist} onChange={(e) => setItem({ ...item, dentist: e.target.value })}>
                {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div><Label>Duration (min)</Label><Input type="number" value={item.durationMin} onChange={(e) => setItem({ ...item, durationMin: Number(e.target.value) })} /></div>
            <div><Label>Estimated cost (₦)</Label><Input type="number" value={item.estimatedCost} onChange={(e) => setItem({ ...item, estimatedCost: Number(e.target.value) })} /></div>
            <div><Label>Status</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={item.status} onChange={(e) => setItem({ ...item, status: e.target.value as PlanItemStatus })}>
                {PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={item.notes} onChange={(e) => setItem({ ...item, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveItem}>Save item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeTarget)} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove this treatment item?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Keep</Button>
            <Button variant="destructive" onClick={() => { if (removeTarget) removePlanItem(removeTarget.planId, removeTarget.itemId); setRemoveTarget(null); }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DentalShell>
  );
}
