import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEye } from '@/contexts/EyeStore';
import {
  EDUCATION_TOPICS, INVESTIGATION_CATALOGUE, MED_CATALOGUE, PLAN_STATUSES, REFERRAL_DESTINATIONS,
  emptyContactEye, emptyRefractionEye, type EyeSide, type LensType, type PlanItemStatus, type Priority, type RefractionEye,
} from '@/data/eyeData';
import { formatCurrency } from '@/data/dummyData';
import { eyeNotify, DemoBanner, EyeBadge, EyeShell, EyeStatus, PageIntro, PatientLink, PatientPicker, selectClass } from './shared';

function usePatientParam() {
  const [params] = useSearchParams();
  return params.get('patient') ?? '';
}

export function EyePlans() {
  const eye = useEye();
  const preset = usePatientParam();
  const [patientId, setPatientId] = useState(preset);
  const [title, setTitle] = useState('Eye treatment plan');
  const [treatment, setTreatment] = useState('Spectacle dispensing review');
  const [eyeSide, setEyeSide] = useState<EyeSide>('OU');
  const create = () => {
    if (!patientId) { eyeNotify('error', 'Select a patient.'); return; }
    const plan = eye.savePlan({ patientId, title, clinician: 'Dr. Adaeze Okonkwo', status: 'Open' });
    eye.addPlanItem(plan.id, { diagnosis: '', treatment, eye: eyeSide, description: '', priority: 'Routine', plannedDate: eye.today, clinician: plan.clinician, durationMin: 20, estimatedCost: 0, status: 'Proposed', notes: 'Estimated cost is not a bill.', procedureId: '' });
    eyeNotify('success', 'Plan saved in this browser.');
  };
  return (
    <EyeShell title="Plans">
      <PageIntro title="Treatment Plans" description="Plans can hold several items. An item becomes Completed only after a procedure record is saved." />
      <DemoBanner text="Estimated amounts are demonstration figures and are not revenue or a cashier posting." />
      <div className="grid md:grid-cols-4 gap-2 mb-4">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Plan title" />
        <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} aria-label="Treatment" />
        <select className={selectClass()} value={eyeSide} onChange={(e) => setEyeSide(e.target.value as EyeSide)} aria-label="Eye"><option>OD</option><option>OS</option><option>OU</option></select>
      </div>
      <Button className="mb-4" onClick={create}>Add plan</Button>
      <div className="space-y-3">
        {eye.state.plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border p-3">
            <div className="flex justify-between"><h3 className="font-semibold">{plan.title}</h3><EyeStatus status={plan.status} /></div>
            <p className="text-sm mb-2"><PatientLink id={plan.patientId} name={eye.nameOf(plan.patientId)} /></p>
            <ul className="space-y-2 text-sm">
              {plan.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <span>{item.treatment}</span><EyeBadge side={item.eye} /><span>{formatCurrency(item.estimatedCost)} estimate</span>
                  <select className="h-8 rounded border px-1" value={item.status} aria-label={`Status ${item.treatment}`} onChange={(e) => {
                    const result = eye.updatePlanItem(plan.id, item.id, { status: e.target.value as PlanItemStatus });
                    if (!result.ok) eyeNotify('error', result.message);
                  }}>{PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  <Button size="sm" variant="ghost" onClick={() => eye.removePlanItem(plan.id, item.id)}>Remove</Button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </EyeShell>
  );
}

export function EyeProcedures() {
  const eye = useEye();
  const [params] = useSearchParams();
  const kind = params.get('kind');
  const preset = params.get('patient') ?? '';
  const [patientId, setPatientId] = useState(preset);
  const [name, setName] = useState(kind === 'theatre' ? 'Cataract extraction (recorded only)' : 'Foreign body removal');
  const [planId, setPlanId] = useState('');
  const [planItemId, setPlanItemId] = useState('');
  const [eyeSide, setEyeSide] = useState<EyeSide>('OD');
  const rows = eye.state.procedures.filter((row) => {
    if (kind === 'theatre') return /cataract|theatre|trabeculectomy/i.test(row.name);
    if (kind === 'minor') return !/cataract|theatre|trabeculectomy/i.test(row.name);
    return true;
  });
  const items = eye.state.plans.find((p) => p.id === planId)?.items ?? [];
  const save = () => {
    const result = eye.saveProcedure({
      patientId, encounterId: '', planId, planItemId, name, eye: eyeSide, indication: 'Clinician recorded indication',
      date: eye.today, clinician: 'Dr. Adaeze Okonkwo', materials: 'Recorded only. Stock is not reduced.', notes: '',
      outcome: 'Recorded in the clinic demo', complications: 'None recorded', postInstructions: 'Review as advised',
      followUpDate: '', status: 'Completed', charge: 0,
    });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    eyeNotify('success', 'Procedure recorded. Linked plan items can now be completed.');
  };
  return (
    <EyeShell title="Procedures">
      <PageIntro title={kind === 'theatre' ? 'Theatre Cases' : kind === 'minor' ? 'Minor Procedures' : 'Procedures'} description="A completed procedure is the record required before a plan item is marked Completed. Materials are noted and do not change stock." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Procedure" />
        <select className={selectClass()} value={eyeSide} onChange={(e) => setEyeSide(e.target.value as EyeSide)} aria-label="Eye"><option>OD</option><option>OS</option><option>OU</option></select>
        <select className={selectClass()} value={planId} onChange={(e) => { setPlanId(e.target.value); setPlanItemId(''); }} aria-label="Plan"><option value="">No plan link</option>{eye.state.plans.filter((p) => !patientId || p.patientId === patientId).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <select className={selectClass()} value={planItemId} onChange={(e) => setPlanItemId(e.target.value)} aria-label="Plan item"><option value="">No item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.treatment}</option>)}</select>
        <Button onClick={save}>Record procedure</Button>
      </div>
      <ul className="space-y-2 text-sm">{rows.map((row) => <li key={row.id} className="rounded-lg border p-3"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.name} · {row.date} <EyeBadge side={row.eye} /> <EyeStatus status={row.status} /></li>)}</ul>
    </EyeShell>
  );
}

export function EyePrescriptions() {
  const eye = useEye();
  const preset = usePatientParam();
  const [patientId, setPatientId] = useState(preset);
  const [med, setMed] = useState(MED_CATALOGUE[0].name);
  const [eyeSide, setEyeSide] = useState<EyeSide>('OU');
  const [ack, setAck] = useState(false);
  const [preview, setPreview] = useState('');
  const warning = patientId && med ? eye.warningsFor(patientId, med) : '';
  const catalogue = MED_CATALOGUE.find((item) => item.name === med);
  const save = () => {
    const result = eye.savePrescription({
      patientId, encounterId: '', date: eye.today, clinician: 'Dr. Adaeze Okonkwo', status: 'Issued', allergyAcknowledged: ack,
      items: [{ id: 'new', name: med, strength: catalogue?.strength ?? '', dosage: '1 drop', route: catalogue?.route ?? 'Topical ocular', frequency: 'Four times daily', duration: '5 days', quantity: '1 bottle', eye: eyeSide, instructions: 'Demonstration only. Not a signed prescription.' }],
    });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    setPreview(result.value.id);
    eyeNotify('success', 'Prescription stored in this browser.');
  };
  const shown = eye.state.prescriptions.find((row) => row.id === preview);
  return (
    <EyeShell title="Prescriptions">
      <PageIntro title="Ophthalmic Prescriptions" description="Choose a preparation, the eye, and review any allergy warning. The print view has no signature and is not legally authorised." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={(id) => { setPatientId(id); setAck(false); }} />
        <select className={selectClass()} value={med} onChange={(e) => { setMed(e.target.value); setAck(false); }} aria-label="Medication">{MED_CATALOGUE.map((item) => <option key={item.name}>{item.name}</option>)}</select>
        <select className={selectClass()} value={eyeSide} onChange={(e) => setEyeSide(e.target.value as EyeSide)} aria-label="Eye"><option>OD</option><option>OS</option><option>OU</option></select>
      </div>
      {warning && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 px-3 py-2 mb-3" role="alert">{warning}</p>}
      {warning && <label className="text-sm flex items-center gap-2 mb-3"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed the allergy warning.</label>}
      <Button className="mb-4" onClick={save}>Save and preview</Button>
      {shown && (
        <article className="rounded-xl border p-4 text-sm print:border-0">
          <h3 className="font-semibold">Eye clinic prescription preview</h3>
          <p>{eye.nameOf(shown.patientId)} · {shown.date}</p>
          {shown.items.map((item) => <p key={item.id}>{item.name} {item.strength} · {item.eye} · {item.dosage} {item.frequency} for {item.duration}</p>)}
          <p className="mt-2 text-muted-foreground">No signature. This preview is not a legal prescription.</p>
          <Button className="mt-2 print:hidden" variant="outline" onClick={() => window.print()}>Print preview</Button>
        </article>
      )}
      <ul className="mt-4 space-y-2 text-sm">{eye.state.prescriptions.map((row) => <li key={row.id}><button className="underline" onClick={() => setPreview(row.id)}>{row.date} · {eye.nameOf(row.patientId)} · {row.items.map((i) => i.name).join(', ')}</button></li>)}</ul>
    </EyeShell>
  );
}

export function EyeInvestigations() {
  const eye = useEye();
  const [params] = useSearchParams();
  const status = params.get('status');
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [test, setTest] = useState(INVESTIGATION_CATALOGUE[0]);
  const [eyeSide, setEyeSide] = useState<EyeSide>('OU');
  const [result, setResult] = useState('Mock report text only. No image was interpreted.');
  const rows = eye.state.investigations.filter((row) => !status || row.status === status);
  const request = () => {
    if (!patientId) { eyeNotify('error', 'Select a patient.'); return; }
    eye.saveInvestigation({ patientId, encounterId: '', test, indication: 'Clinician request', eye: eyeSide, requestedDate: eye.today, clinician: 'Dr. Adaeze Okonkwo', priority: 'Routine', status: 'Requested', result: '', reportDate: '', reviewer: '' });
    eyeNotify('success', 'Investigation requested in this browser.');
  };
  return (
    <EyeShell title="Investigations">
      <PageIntro title="Investigations" description="OCT, fundus photography, fields, topography, and the rest of the catalogue. Reports are typed text. Images are not interpreted." />
      <DemoBanner />
      <div className="grid md:grid-cols-4 gap-2 mb-4">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <select className={selectClass()} value={test} onChange={(e) => setTest(e.target.value)} aria-label="Test">{INVESTIGATION_CATALOGUE.map((item) => <option key={item}>{item}</option>)}</select>
        <select className={selectClass()} value={eyeSide} onChange={(e) => setEyeSide(e.target.value as EyeSide)} aria-label="Eye"><option>OD</option><option>OS</option><option>OU</option></select>
        <Button onClick={request}>Request</Button>
      </div>
      <ul className="space-y-3 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border p-3">
            <div className="flex justify-between gap-2"><span><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.test}</span><EyeStatus status={row.status} /></div>
            <EyeBadge side={row.eye} />
            <Textarea className="mt-2" defaultValue={row.result} onBlur={(e) => eye.saveInvestigation({ ...row, result: e.target.value, status: e.target.value.trim() ? 'Completed' : row.status, reportDate: e.target.value.trim() ? eye.today : row.reportDate })} placeholder={result} />
          </li>
        ))}
      </ul>
    </EyeShell>
  );
}

export function EyeReferrals() {
  const eye = useEye();
  const [patientId, setPatientId] = useState(usePatientParam());
  const [destination, setDestination] = useState(REFERRAL_DESTINATIONS[2]);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<Priority>('Routine');
  const send = () => {
    if (!patientId || !reason.trim()) { eyeNotify('error', 'Patient and reason are required.'); return; }
    eye.saveReferral({ patientId, encounterId: '', clinician: 'Dr. Adaeze Okonkwo', destination, reason, symptoms: '', findings: '', diagnosis: eye.primaryDx(patientId), priority, date: eye.today, notes: 'Status stays inside this demonstration.', status: 'Sent' });
    eyeNotify('success', 'Referral recorded in this browser.');
  };
  return (
    <EyeShell title="Referrals">
      <PageIntro title="Referrals" description="Send a note to a subspecialty destination. The status does not leave this browser." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <select className={selectClass()} value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destination">{REFERRAL_DESTINATIONS.map((item) => <option key={item}>{item}</option>)}</select>
        <select className={selectClass()} value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Priority"><option>Routine</option><option>Soon</option><option>Urgent</option></select>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
      </div>
      <Button className="mb-4" onClick={send}>Record referral</Button>
      <ul className="space-y-2 text-sm">{eye.state.referrals.map((row) => <li key={row.id} className="rounded-lg border p-3 flex justify-between"><span><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.destination}<br />{row.reason}</span><EyeStatus status={row.status} /></li>)}</ul>
    </EyeShell>
  );
}

export function EyeFollowUps() {
  const eye = useEye();
  const [filter, setFilter] = useState('All');
  const [patientId, setPatientId] = useState(usePatientParam());
  const [reason, setReason] = useState('Review');
  const [dueDate, setDueDate] = useState(eye.today);
  const [appointmentId, setAppointmentId] = useState('');
  const rows = eye.state.followUps.filter((row) => filter === 'All' || row.status === filter || (filter === 'Overdue' && row.dueDate < eye.today && row.status !== 'Completed'));
  const save = () => {
    if (!patientId) { eyeNotify('error', 'Select a patient.'); return; }
    eye.saveFollowUp({ patientId, encounterId: '', reason, dueDate, clinician: 'Dr. Adaeze Okonkwo', status: dueDate < eye.today ? 'Overdue' : 'Upcoming', notes: '', appointmentId });
    eyeNotify('success', 'Follow-up saved.');
  };
  return (
    <EyeShell title="Follow-ups">
      <PageIntro title="Follow-ups" description="Filter overdue and upcoming visits. A follow-up can point at an existing appointment." />
      <DemoBanner />
      <div className="flex gap-2 mb-3"><Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All</Button><Button variant={filter === 'Overdue' ? 'default' : 'outline'} onClick={() => setFilter('Overdue')}>Overdue</Button><Button variant={filter === 'Upcoming' ? 'default' : 'outline'} onClick={() => setFilter('Upcoming')}>Upcoming</Button></div>
      <div className="grid md:grid-cols-4 gap-2 mb-4">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        <select className={selectClass()} value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} aria-label="Appointment"><option value="">No appointment</option>{eye.state.appointments.filter((a) => !patientId || a.patientId === patientId).map((a) => <option key={a.id} value={a.id}>{a.date} {a.startTime}</option>)}</select>
      </div>
      <Button className="mb-4" onClick={save}>Save follow-up</Button>
      <ul className="space-y-2 text-sm">{rows.map((row) => <li key={row.id} className="rounded-lg border p-3"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.reason} · due {row.dueDate} {row.appointmentId ? `· ${row.appointmentId}` : ''} <EyeStatus status={row.status} /></li>)}</ul>
    </EyeShell>
  );
}

export function EyeEducation() {
  const eye = useEye();
  const [patientId, setPatientId] = useState(usePatientParam());
  const [topics, setTopics] = useState<string[]>([]);
  const toggle = (topic: string) => setTopics((cur) => cur.includes(topic) ? cur.filter((t) => t !== topic) : [...cur, topic]);
  const save = () => {
    if (!patientId || topics.length === 0) { eyeNotify('error', 'Choose a patient and at least one leaflet.'); return; }
    eye.saveEducation({ patientId, encounterId: '', date: eye.today, topics, notes: 'Leaflets recorded as given in this demonstration.' });
    eyeNotify('success', 'Education note saved.');
    setTopics([]);
  };
  return (
    <EyeShell title="Education">
      <PageIntro title="Patient Education" description="Record which leaflets were given. Nothing is sent to the patient automatically." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      <div className="flex flex-wrap gap-2 my-3">{EDUCATION_TOPICS.map((topic) => <label key={topic} className="text-sm border rounded-full px-3 py-1"><input type="checkbox" className="mr-1" checked={topics.includes(topic)} onChange={() => toggle(topic)} />{topic}</label>)}</div>
      <Button className="mb-4" onClick={save}>Record leaflets given</Button>
      <ul className="space-y-2 text-sm">{eye.state.education.map((row) => <li key={row.id} className="rounded-lg border p-3"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.date}<p>{row.topics.join(', ')}</p></li>)}</ul>
    </EyeShell>
  );
}

function RxEye({ side, value, onChange }: { side: 'OD' | 'OS'; value: RefractionEye; onChange: (next: RefractionEye) => void }) {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <EyeBadge side={side} />
      {(['sphere', 'cylinder', 'axis', 'add'] as const).map((key) => <div key={key}><Label className="capitalize">{key}</Label><Input value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} /></div>)}
    </div>
  );
}

export function EyeSpectacles() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [refractionId, setRefractionId] = useState('');
  const [od, setOd] = useState(emptyRefractionEye());
  const [os, setOs] = useState(emptyRefractionEye());
  const [lensType, setLensType] = useState<LensType>('Single vision');
  const [previewId, setPreviewId] = useState(params.get('rx') ?? '');
  const options = eye.state.refractions.filter((row) => !patientId || row.patientId === patientId);
  const preview = eye.state.spectacles.find((row) => row.id === previewId);
  const compared = useMemo(() => eye.state.spectacles.filter((row) => row.patientId === patientId).slice(0, 2), [eye.state.spectacles, patientId]);
  const generate = () => {
    const result = eye.spectacleFromRefraction(refractionId);
    if (!result.ok) { eyeNotify('error', result.message); return; }
    setPreviewId(result.value.id);
    setOd(result.value.od);
    setOs(result.value.os);
    eyeNotify('success', 'Draft copied from the saved refraction.');
  };
  const save = () => {
    const result = eye.saveSpectacle({
      patientId, refractionId, date: eye.today, clinician: 'Optom. Tunde Bello', reviewDate: '', distanceOrNear: 'Both', pd: '',
      lensType, material: '', coating: '', notes: '', instructions: 'Demonstration only. Not legally authorised.', od, os, status: 'Final',
    });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    setPreviewId(result.value.id);
    eyeNotify('success', 'Spectacle prescription stored in this browser.');
  };
  return (
    <EyeShell title="Spectacles">
      <PageIntro title="Spectacle Prescription" description="Copy sphere values only from a saved subjective or final refraction. Empty eyes stay empty. This is not a legal prescription." />
      <DemoBanner text="Print preview has no signature and does not authorise dispensing." />
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <select className={selectClass()} value={refractionId} onChange={(e) => setRefractionId(e.target.value)} aria-label="Source refraction"><option value="">Select refraction</option>{options.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.type} · {row.status}</option>)}</select>
        <select className={selectClass()} value={lensType} onChange={(e) => setLensType(e.target.value as LensType)} aria-label="Lens type"><option>Single vision</option><option>Bifocal</option><option>Progressive</option><option>Reading</option><option>Other</option></select>
      </div>
      <div className="flex gap-2 mb-3"><Button variant="outline" onClick={generate}>Generate from refraction</Button><Button onClick={save}>Save spectacle prescription</Button></div>
      <div className="grid md:grid-cols-2 gap-3 mb-4"><RxEye side="OD" value={od} onChange={setOd} /><RxEye side="OS" value={os} onChange={setOs} /></div>
      {preview && (
        <article className="rounded-xl border p-4 text-sm mb-4">
          <h3 className="font-semibold">Spectacle preview · {preview.id}</h3>
          <p>{eye.nameOf(preview.patientId)} · {preview.lensType}</p>
          <p>OD {preview.od.sphere || '—'} / {preview.od.cylinder || '—'} × {preview.od.axis || '—'}</p>
          <p>OS {preview.os.sphere || '—'} / {preview.os.cylinder || '—'} × {preview.os.axis || '—'}</p>
          <p className="text-muted-foreground mt-2">No signature. Not legally authorised.</p>
          <Button className="mt-2" variant="outline" onClick={() => window.print()}>Print preview</Button>
        </article>
      )}
      {compared.length > 1 && <p className="text-sm">Comparison: {compared.map((row) => `${row.date} OD ${row.od.sphere || '—'}`).join(' · ')}</p>}
      <ul className="mt-3 text-sm space-y-1">{eye.state.spectacles.map((row) => <li key={row.id}><button className="underline" onClick={() => { setPreviewId(row.id); setOd(row.od); setOs(row.os); setPatientId(row.patientId); }}>{row.id} · {eye.nameOf(row.patientId)} · {row.status}</button></li>)}</ul>
    </EyeShell>
  );
}

export function EyeContactLenses() {
  const eye = useEye();
  const [patientId, setPatientId] = useState(usePatientParam());
  const [od, setOd] = useState(emptyContactEye());
  const [os, setOs] = useState(emptyContactEye());
  const [lensType, setLensType] = useState('Soft monthly');
  const setEye = (side: 'od' | 'os', key: 'baseCurve' | 'diameter' | 'sphere' | 'cylinder' | 'axis', value: string) => {
    if (side === 'od') setOd({ ...od, [key]: value });
    else setOs({ ...os, [key]: value });
  };
  const save = () => {
    if (!patientId) { eyeNotify('error', 'Select a patient.'); return; }
    eye.saveContactLens({ patientId, date: eye.today, clinician: 'Optom. Tunde Bello', lensType, material: '', replacement: 'Monthly', od, os, fittingNotes: 'Entered separately from any spectacle prescription.', comfort: '', followUpDate: '', status: 'Saved' });
    eyeNotify('success', 'Contact lens record saved. Spectacle values were not copied.');
  };
  return (
    <EyeShell title="Contact lenses">
      <PageIntro title="Contact Lenses" description="Contact lens parameters are entered on their own. A spectacle prescription is never copied into this form." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-2 mb-3"><PatientPicker value={patientId} onChange={setPatientId} /><Input value={lensType} onChange={(e) => setLensType(e.target.value)} aria-label="Lens type" /></div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        {(['od', 'os'] as const).map((side) => (
          <div key={side} className="rounded-xl border p-3 space-y-2">
            <EyeBadge side={side === 'od' ? 'OD' : 'OS'} />
            {(['baseCurve', 'diameter', 'sphere', 'cylinder', 'axis'] as const).map((key) => (
              <div key={key}><Label>{key}</Label><Input value={side === 'od' ? od[key] : os[key]} onChange={(e) => setEye(side, key, e.target.value)} /></div>
            ))}
          </div>
        ))}
      </div>
      <Button className="mb-4" onClick={save}>Save contact lens record</Button>
      <ul className="text-sm space-y-2">{eye.state.contactLenses.map((row) => <li key={row.id} className="rounded-lg border p-3"><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /> · {row.lensType} · OD {row.od.sphere || '—'} · OS {row.os.sphere || '—'}</li>)}</ul>
    </EyeShell>
  );
}
