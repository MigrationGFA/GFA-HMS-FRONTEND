import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePaeds, followUpDisplay } from '@/contexts/PaedsStore';
import {
  INVESTIGATION_TESTS, MED_CATALOGUE, PLAN_STATUSES, REFERRAL_DESTINATIONS, STAFF, formatAge,
  type AdmissionStatus, type EmergencyDisposition, type PlanItemStatus, type Priority,
} from '@/data/paedsData';
import { AgeBadge, DemoBanner, PaedsShell, PaedsStatus, PageIntro, PatientLink, PatientPicker, paedsNotify, selectClass } from './shared';

function usePatient() {
  const [params] = useSearchParams();
  return params.get('patient') ?? '';
}

export function PaedsPrescriptions() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [name, setName] = useState(MED_CATALOGUE[0].name);
  const [weightBased, setWeightBased] = useState(false);
  const [perKg, setPerKg] = useState('');
  const [finalDose, setFinal] = useState('');
  const [frequency, setFrequency] = useState('Three times daily');
  const [reviewed, setReviewed] = useState(false);
  const [ack, setAck] = useState(false);
  const [preview, setPreview] = useState('');
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const weights = [...paeds.state.growth, ...paeds.state.vitals, ...paeds.state.observations].filter((row) => row.patientId === patientId && row.weightKg);
  const latest = weights.sort((a, b) => b.date.localeCompare(a.date))[0];
  const calc = weightBased ? paeds.previewDose(latest?.weightKg ?? '', perKg) : null;
  const warning = patientId ? paeds.warningsFor(patientId, name) : '';
  const save = (status: 'Draft' | 'Finalised') => {
    const result = paeds.savePrescription({
      patientId, encounterId: '', date: paeds.today, clinician: STAFF[0].name, status, allergyAcknowledged: ack,
      items: [{ id: 'new', name, formulation: 'As selected', strength: '', dose: finalDose, doseUnit: 'mg', route: 'Oral', frequency, duration: '3 days', quantity: '1', instructions: 'Demonstration only. Not a signed prescription.', weightBased, weightKg: latest?.weightKg ?? '', dosePerKg: perKg, dosePerKgUnit: 'mg/kg', calculated: calc && calc.ok ? calc.value : '', reviewed }],
    });
    if (!result.ok) paedsNotify('error', result.message);
    else { setPreview(result.value.id); paedsNotify('success', 'Prescription stored in this browser.'); }
  };
  const shown = paeds.state.prescriptions.find((row) => row.id === preview);
  return (
    <PaedsShell title="Prescriptions">
      <PageIntro title="Prescriptions" description="A weight-based product is arithmetic only. The final dose is what the clinician enters after review. This does not verify that the dose is safe." />
      <DemoBanner text="All medication choices require an authorised clinician. No signature is applied." />
      <div className="rounded-xl border p-3 mb-3 text-sm">
        {child ? <><AgeBadge dob={child.dateOfBirth} /> <span className="ml-2">{formatAge(child.dateOfBirth, paeds.today)}</span><p>Allergies: {child.allergies || 'Not recorded'}. Medicines: {child.currentMedications || 'None recorded'}.</p><p>Latest weight: {latest ? `${latest.weightKg} kg on ${latest.date}` : 'No weight recorded.'}</p></> : <p>Select a child to see age, allergies, and weight.</p>}
      </div>
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={(id) => { setPatientId(id); setAck(false); }} />
        <select className={selectClass()} value={name} onChange={(e) => { setName(e.target.value); setAck(false); }} aria-label="Medication">{MED_CATALOGUE.map((item) => <option key={item.name}>{item.name}</option>)}</select>
        <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} aria-label="Frequency" />
      </div>
      <label className="text-sm flex items-center gap-2 mb-2"><input type="checkbox" checked={weightBased} onChange={(e) => setWeightBased(e.target.checked)} /> Use a weight-based calculation for this item</label>
      {weightBased && (
        <div className="rounded-lg border p-3 mb-3 text-sm space-y-2">
          <Label>Dose per kg chosen by the clinician (mg/kg)</Label>
          <Input value={perKg} aria-label="Dose per kg chosen by the clinician (mg/kg)" onChange={(e) => { setPerKg(e.target.value); setReviewed(false); }} />
          <p>{calc?.ok ? `Calculation: ${latest?.weightKg ?? '—'} kg × ${perKg} mg/kg = ${calc.value} mg. This is not the prescribed dose.` : calc?.message}</p>
          <Label>Final prescribed dose</Label>
          <Input value={finalDose} onChange={(e) => setFinal(e.target.value)} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I have reviewed this calculation.</label>
        </div>
      )}
      {!weightBased && <div className="mb-3"><Label>Dose</Label><Input value={finalDose} onChange={(e) => setFinal(e.target.value)} /></div>}
      {warning && <p className="text-sm border border-amber-300 bg-amber-50 rounded-md px-3 py-2 mb-2" role="alert">{warning}</p>}
      {warning && <label className="text-sm flex gap-2 mb-2"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed the allergy warning.</label>}
      <div className="flex gap-2 mb-4"><Button variant="outline" onClick={() => save('Draft')}>Save draft</Button><Button onClick={() => save('Finalised')}>Finalise demo prescription</Button></div>
      {shown && <article className="border rounded-xl p-4 text-sm"><h3 className="font-semibold">Prescription preview</h3>{shown.items.map((item) => <p key={item.id}>{item.name} · final dose {item.dose || '—'} {item.doseUnit} · {item.frequency}{item.weightBased ? ` · calculated ${item.calculated} mg from ${item.weightKg} kg × ${item.dosePerKg}` : ''}</p>)}<p className="text-muted-foreground mt-2">No signature. Not legally authorised.</p><Button className="mt-2" variant="outline" onClick={() => window.print()}>Print preview</Button></article>}
    </PaedsShell>
  );
}

export function PaedsInvestigations() {
  const paeds = usePaeds();
  const [params] = useSearchParams();
  const status = params.get('status');
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [test, setTest] = useState(INVESTIGATION_TESTS[0].name);
  const chosen = INVESTIGATION_TESTS.find((item) => item.name === test) ?? INVESTIGATION_TESTS[0];
  const request = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.saveInvestigation({ patientId, encounterId: '', category: chosen.category, test, indication: 'Clinician request', requestedDate: paeds.today, clinician: STAFF[0].name, priority: 'Routine', status: 'Requested', result: '', resultDate: '', reviewer: '', reviewed: false });
    paedsNotify('success', 'Investigation requested.');
  };
  const rows = paeds.state.investigations.filter((row) => !status || row.status === status);
  return (
    <PaedsShell title="Investigations">
      <PageIntro title="Investigations" description="Request a test and type a mock result. No laboratory reference range is invented." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-2 mb-4"><PatientPicker value={patientId} onChange={setPatientId} /><select className={selectClass()} value={test} onChange={(e) => setTest(e.target.value)} aria-label="Test">{INVESTIGATION_TESTS.map((item) => <option key={item.name}>{item.name}</option>)}</select><Button onClick={request}>Request</Button></div>
      <ul className="space-y-3 text-sm">{rows.map((row) => <li key={row.id} className="border rounded-lg p-3"><div className="flex justify-between"><span><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /> · {row.category} · {row.test}</span><PaedsStatus status={row.status} /></div><Textarea className="mt-2" defaultValue={row.result} placeholder="Mock result text" onBlur={(e) => paeds.saveInvestigation({ ...row, result: e.target.value, status: e.target.value.trim() ? 'Completed' : row.status, resultDate: e.target.value.trim() ? paeds.today : row.resultDate, reviewed: Boolean(e.target.value.trim()) })} /></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsAdmissions() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [reason, setReason] = useState('');
  const [bedId, setBed] = useState('');
  const [status, setStatus] = useState<AdmissionStatus>('Admitted');
  const save = () => {
    const result = paeds.saveAdmission({ patientId, date: paeds.today, time: '12:00', reason, referring: '', admitting: STAFF[0].name, ward: paeds.state.beds.find((b) => b.id === bedId)?.ward ?? 'Paediatric ward', bedId, diagnosis: '', status, dischargeDate: '', dischargeDiagnosis: '', summary: '', medicationPlan: '', guardianInstructions: '', followUpPlan: '', dischargingClinician: '' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Admission saved in the paediatric demonstration ward.');
  };
  return (
    <PaedsShell title="Admissions">
      <PageIntro title="Admission" description="Beds belong to this paediatric demonstration. They are not written to the hospital-wide admission module." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Reason" />
        <select className={selectClass()} value={bedId} onChange={(e) => setBed(e.target.value)} aria-label="Bed"><option value="">No bed</option>{paeds.state.beds.map((bed) => <option key={bed.id} value={bed.id} disabled={bed.status === 'Occupied' && bed.patientId !== patientId}>{bed.ward} {bed.number} · {bed.status}</option>)}</select>
        <select className={selectClass()} value={status} onChange={(e) => setStatus(e.target.value as AdmissionStatus)} aria-label="Admission status"><option>Planned</option><option>Admitted</option><option>Under Care</option><option>Ready for Discharge</option></select>
      </div>
      <Button className="mb-4" onClick={save}>Save admission</Button>
      <ul className="text-sm space-y-2">{paeds.state.admissions.map((row) => <li key={row.id} className="border rounded-md p-3"><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /> · {row.number} · {row.ward} <PaedsStatus status={row.status} /><p>Guardian: {paeds.state.patients.find((p) => p.id === row.patientId)?.guardian.phone}</p></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsWards() {
  const paeds = usePaeds();
  return (
    <PaedsShell title="Wards">
      <PageIntro title="Ward and beds" description="An occupied bed cannot be given to a second child. Change the assignment from the admission screen." />
      <DemoBanner />
      <ul className="space-y-2 text-sm">{paeds.state.beds.map((bed) => <li key={bed.id} className="border rounded-lg p-3 flex justify-between"><span>{bed.ward} · {bed.number}{bed.patientId ? ` · ${paeds.nameOf(bed.patientId)}` : ''}</span><PaedsStatus status={bed.status} /></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsObservations() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [temperatureC, setTemp] = useState('');
  const [heartRate, setHr] = useState('');
  const rows = paeds.state.observations.filter((row) => !patientId || row.patientId === patientId).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const save = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    const admission = paeds.state.admissions.find((a) => a.patientId === patientId);
    paeds.saveObservation({ patientId, admissionId: admission?.id ?? '', date: paeds.today, time: '14:00', temperatureC, heartRate, respiratoryRate: '', systolic: '', diastolic: '', spo2: '', weightKg: '', pain: '', feeding: '', notes: '', staff: STAFF[1].name });
    paedsNotify('success', 'Observation recorded.');
  };
  return (
    <PaedsShell title="Observations">
      <PageIntro title="Nursing observations" description="Only entered observations are shown. The trend does not fill missing times." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-2 mb-3"><PatientPicker value={patientId} onChange={setPatientId} /><Input value={temperatureC} onChange={(e) => setTemp(e.target.value)} placeholder="Temperature °C" aria-label="Temperature" /><Input value={heartRate} onChange={(e) => setHr(e.target.value)} placeholder="Heart rate" aria-label="Heart rate" /></div>
      <Button className="mb-4" onClick={save}>Record observation</Button>
      <div className="h-48 border rounded-xl p-2 mb-3"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows.map((row) => ({ time: `${row.date} ${row.time}`, temperature: Number(row.temperatureC) || null }))}><XAxis dataKey="time" hide /><YAxis /><Tooltip /><Line dataKey="temperature" stroke="#b45309" connectNulls /></LineChart></ResponsiveContainer></div>
      <ul className="text-sm space-y-1">{rows.map((row) => <li key={row.id}>{row.date} {row.time} · {row.temperatureC || '—'} °C · HR {row.heartRate || '—'} · {row.staff}</li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsDischarge() {
  const paeds = usePaeds();
  const [id, setId] = useState(paeds.state.admissions[0]?.id ?? '');
  const admission = paeds.state.admissions.find((row) => row.id === id);
  const [summary, setSummary] = useState(admission?.summary ?? '');
  const [clinician, setClinician] = useState(STAFF[0].name);
  const complete = () => {
    if (!admission) return;
    const result = paeds.saveAdmission({ ...admission, status: 'Discharged', dischargeDate: paeds.today, summary, dischargingClinician: clinician, dischargeDiagnosis: admission.diagnosis || 'Recorded by clinician' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Discharge recorded. This does not declare the child clinically fit.');
  };
  return (
    <PaedsShell title="Discharge">
      <PageIntro title="Discharge" description="A date, summary, and clinician are required. Completing this form does not mean the child is fit to leave." />
      <DemoBanner />
      <select className={selectClass() + ' mb-3'} value={id} onChange={(e) => setId(e.target.value)} aria-label="Admission">{paeds.state.admissions.map((row) => <option key={row.id} value={row.id}>{row.number} · {paeds.nameOf(row.patientId)}</option>)}</select>
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Clinical summary and guardian instructions" className="mb-2" />
      <Input value={clinician} onChange={(e) => setClinician(e.target.value)} aria-label="Discharging clinician" className="mb-3" />
      <Button onClick={complete}>Record discharge</Button>
    </PaedsShell>
  );
}

export function PaedsEmergency() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [complaint, setComplaint] = useState('');
  const [disposition, setDisposition] = useState<EmergencyDisposition>('Awaiting Assessment');
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const save = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.saveEmergency({ patientId, date: paeds.today, time: '15:00', complaint, onset: '', history: '', allergies: child?.allergies ?? '', observations: '', triage: '', assessment: '', actions: '', investigations: '', escalation: '', disposition });
    paedsNotify('success', 'Emergency note saved. Disposition was chosen by the clinician.');
  };
  return (
    <PaedsShell title="Emergency">
      <PageIntro title="Emergency assessment" description="Document the initial review. There is no automated triage score. Disposition is selected by the clinician." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      {child && <p className="text-sm my-2"><AgeBadge dob={child.dateOfBirth} /> {formatAge(child.dateOfBirth, paeds.today)} · {child.guardian.name} {child.guardian.phone}</p>}
      <Textarea className="my-2" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Presenting complaint" />
      <select className={selectClass() + ' mb-3'} value={disposition} onChange={(e) => setDisposition(e.target.value as EmergencyDisposition)} aria-label="Disposition">{(['Awaiting Assessment', 'Under Assessment', 'Observation', 'Admission Recommended', 'Referred', 'Discharged', 'Transferred'] as EmergencyDisposition[]).map((item) => <option key={item}>{item}</option>)}</select>
      <Button className="mb-4" onClick={save}>Save assessment</Button>
      <ul className="text-sm space-y-2">{paeds.state.emergencies.map((row) => <li key={row.id} className="border rounded-md p-3 flex justify-between"><span><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /> · {paeds.ageOf(row.patientId)} · {row.complaint}</span><PaedsStatus status={row.disposition} /></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsPlans() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [treatment, setTreatment] = useState('Observation');
  const create = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.savePlan({
      patientId, encounterId: '', title: 'Paediatric plan', clinician: STAFF[0].name, status: 'Open',
      items: [{ id: `PTI-${Date.now()}`, diagnosis: '', treatment, description: '', priority: 'Routine', plannedDate: paeds.today, clinician: STAFF[0].name, status: 'Proposed', notes: '', procedureId: '' }],
    });
    paedsNotify('success', 'Plan created. Add a procedure before an item can be completed.');
  };
  return (
    <PaedsShell title="Plans">
      <PageIntro title="Treatment plans" description="An item becomes completed only after a procedure is recorded." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-2 mb-3"><PatientPicker value={patientId} onChange={setPatientId} /><Input value={treatment} onChange={(e) => setTreatment(e.target.value)} aria-label="Treatment" /><Button onClick={create}>Add plan</Button></div>
      {paeds.state.plans.map((plan) => (
        <article key={plan.id} className="border rounded-lg p-3 mb-2 text-sm">
          <PatientLink id={plan.patientId} name={paeds.nameOf(plan.patientId)} /> · {plan.title}
          {plan.items.map((item) => (
            <div key={item.id} className="flex gap-2 items-center mt-2">{item.treatment}
              <select value={item.status} aria-label={item.treatment} onChange={(e) => { const result = paeds.updatePlanItem(plan.id, item.id, { status: e.target.value as PlanItemStatus }); if (!result.ok) paedsNotify('error', result.message); }}>{PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          ))}
        </article>
      ))}
    </PaedsShell>
  );
}

export function PaedsProcedures() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [name, setName] = useState('Wound dressing');
  const [planId, setPlan] = useState('');
  const [itemId, setItem] = useState('');
  const items = paeds.state.plans.find((p) => p.id === planId)?.items ?? [];
  const save = () => {
    const result = paeds.saveProcedure({ patientId, encounterId: '', planId, planItemId: itemId, name, indication: 'Clinician recorded', date: paeds.today, clinician: STAFF[0].name, notes: '', outcome: 'Recorded', complications: '', instructions: '', followUp: '', status: 'Completed' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Procedure recorded.');
  };
  return (
    <PaedsShell title="Procedures">
      <PageIntro title="Procedures" description="Scheduling a treatment does not mean it was performed. Record the procedure here." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Procedure" />
        <select className={selectClass()} value={planId} onChange={(e) => setPlan(e.target.value)} aria-label="Plan"><option value="">No plan</option>{paeds.state.plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <select className={selectClass()} value={itemId} onChange={(e) => setItem(e.target.value)} aria-label="Plan item"><option value="">No item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.treatment}</option>)}</select>
      </div>
      <Button className="mb-4" onClick={save}>Record procedure</Button>
      <ul className="text-sm">{paeds.state.procedures.map((row) => <li key={row.id}>{paeds.nameOf(row.patientId)} · {row.name} · {row.date}</li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsReferrals() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [destination, setDestination] = useState(REFERRAL_DESTINATIONS[0]);
  const [reason, setReason] = useState('');
  const send = () => {
    if (!patientId || !reason.trim()) { paedsNotify('error', 'Child and reason are required.'); return; }
    paeds.saveReferral({ patientId, encounterId: '', clinician: STAFF[0].name, destination, reason, findings: '', priority: 'Routine', date: paeds.today, notes: '', status: 'Sent' });
    paedsNotify('success', 'Referral recorded.');
  };
  return (
    <PaedsShell title="Referrals">
      <PageIntro title="Referrals" description="Send a note to another department inside this demonstration." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-2 mb-3"><PatientPicker value={patientId} onChange={setPatientId} /><select className={selectClass()} value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destination">{REFERRAL_DESTINATIONS.map((item) => <option key={item}>{item}</option>)}</select><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" /></div>
      <Button className="mb-4" onClick={send}>Record referral</Button>
      <ul className="text-sm space-y-2">{paeds.state.referrals.map((row) => <li key={row.id} className="border rounded-md p-3">{paeds.nameOf(row.patientId)} · {row.destination} · {row.reason}</li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsFollowUps() {
  const paeds = usePaeds();
  const [filter, setFilter] = useState('All');
  const [patientId, setPatientId] = useState(usePatient());
  const [reason, setReason] = useState('Review');
  const [dueDate, setDue] = useState(paeds.today);
  const [appointmentId, setAppt] = useState('');
  const rows = paeds.state.followUps.filter((row) => filter === 'All' || followUpDisplay(row, paeds.today) === filter);
  const save = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.saveFollowUp({ patientId, encounterId: '', reason, dueDate, clinician: STAFF[0].name, status: 'Upcoming', notes: '', appointmentId });
    paedsNotify('success', 'Follow-up saved.');
  };
  return (
    <PaedsShell title="Follow-ups">
      <PageIntro title="Follow-ups" description="The clinician enters the reason and date. Overdue is based on that date." />
      <DemoBanner />
      <div className="flex gap-2 mb-3"><Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All</Button><Button variant={filter === 'Overdue' ? 'default' : 'outline'} onClick={() => setFilter('Overdue')}>Overdue</Button><Button variant={filter === 'Upcoming' ? 'default' : 'outline'} onClick={() => setFilter('Upcoming')}>Upcoming</Button></div>
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
        <Input type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} aria-label="Date" />
        <select className={selectClass()} value={appointmentId} onChange={(e) => setAppt(e.target.value)} aria-label="Appointment"><option value="">No appointment</option>{paeds.state.appointments.filter((a) => !patientId || a.patientId === patientId).map((a) => <option key={a.id} value={a.id}>{a.date} {a.startTime}</option>)}</select>
      </div>
      <Button className="mb-4" onClick={save}>Save follow-up</Button>
      <ul className="text-sm space-y-2">{rows.map((row) => <li key={row.id} className="border rounded-md p-3">{paeds.nameOf(row.patientId)} · {row.reason} · {row.dueDate} <PaedsStatus status={followUpDisplay(row, paeds.today)} /></li>)}</ul>
    </PaedsShell>
  );
}
