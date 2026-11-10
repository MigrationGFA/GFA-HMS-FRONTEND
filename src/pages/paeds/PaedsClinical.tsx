import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePaeds } from '@/contexts/PaedsStore';
import {
  DIAGNOSIS_CATALOGUE, EXAM_SYSTEMS, MILESTONE_AREAS, NEWBORN_SECTIONS, STAFF, TRIAGE, VACCINE_NAMES,
  blankFindings, blankMarks, bmi, formatAge, type DxRank, type DxStatus, type FindingChoice, type MilestoneMark, type TriageCategory,
} from '@/data/paedsData';
import { AgeBadge, DemoBanner, PaedsShell, PaedsStatus, PageIntro, PatientLink, PatientPicker, paedsNotify, selectClass } from './shared';

function usePatient() {
  const [params] = useSearchParams();
  return params.get('patient') ?? '';
}

export function PaedsTriage() {
  const paeds = usePaeds();
  const preset = usePatient();
  const [patientId, setPatientId] = useState(preset);
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const [form, setForm] = useState({ complaint: '', temperatureC: '', heartRate: '', respiratoryRate: '', systolic: '', diastolic: '', spo2: '', weightKg: '', lengthCm: '', headCm: '', painScore: '', triage: '' as TriageCategory | '' });
  const set = (key: keyof typeof form, value: string) => setForm((cur) => ({ ...cur, [key]: value }));
  const save = (status: 'Saved' | 'Completed') => {
    const result = paeds.saveVitals({
      patientId, encounterId: '', date: paeds.today, time: '09:00', staff: STAFF[1].name, complaint: form.complaint, duration: '', history: child?.previousIllnesses ?? '',
      allergies: child?.allergies ?? '', medications: child?.currentMedications ?? '', ...form, consciousness: '', notes: 'Staff observation. Not an automated diagnosis.', status,
    });
    if (!result.ok) paedsNotify('error', result.message);
    else paedsNotify('success', status === 'Completed' ? 'Triage marked complete in this browser.' : 'Observations saved.');
  };
  return (
    <PaedsShell title="Triage">
      <PageIntro title="Triage and vital signs" description="Record paediatric observations with units. A category is chosen by staff. It does not replace assessment and does not use adult reference ranges." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <div><Label>Child</Label><PatientPicker value={patientId} onChange={setPatientId} /></div>
        <div className="text-sm self-end">{child && <><AgeBadge dob={child.dateOfBirth} /> <span className="ml-2">{formatAge(child.dateOfBirth, paeds.today)}</span><p>Allergies: {child.allergies}</p></>}</div>
        <div><Label>Triage category</Label><select className={selectClass()} value={form.triage} onChange={(e) => set('triage', e.target.value)}><option value="">Not chosen</option>{TRIAGE.map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        {([['complaint', 'Complaint'], ['temperatureC', 'Temperature °C'], ['heartRate', 'Heart rate /min'], ['respiratoryRate', 'Respiratory rate /min'], ['systolic', 'Systolic mmHg'], ['diastolic', 'Diastolic mmHg'], ['spo2', 'SpO2 %'], ['weightKg', 'Weight kg'], ['lengthCm', 'Length or height cm'], ['headCm', 'Head circumference cm'], ['painScore', 'Pain score']] as const).map(([key, label]) => (
          <div key={key}><Label>{label}</Label><Input value={form[key]} aria-label={label} onChange={(e) => set(key, e.target.value)} /></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4"><Button variant="outline" onClick={() => save('Saved')}>Save assessment</Button><Button onClick={() => save('Completed')}>Mark triage complete</Button><Link to="/dashboard/paeds/encounters"><Button variant="secondary">Send to consultation</Button></Link></div>
      <h3 className="font-semibold mb-2">Previous observations</h3>
      <ul className="text-sm space-y-1">{paeds.state.vitals.filter((v) => !patientId || v.patientId === patientId).map((v) => <li key={v.id} className="border rounded-md px-3 py-2">{v.date} · {paeds.nameOf(v.patientId)} · {v.temperatureC || '—'} °C · {v.heartRate || '—'} /min <PaedsStatus status={v.status} /></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsGrowth() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [weightKg, setWeight] = useState('');
  const [lengthCm, setLength] = useState('');
  const [heightCm, setHeight] = useState('');
  const [headCm, setHead] = useState('');
  const [muacCm, setMuac] = useState('');
  const rows = paeds.state.growth.filter((g) => !patientId || g.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date));
  const chart = rows.map((g) => ({ date: g.date, weight: Number(g.weightKg) || null }));
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const save = () => {
    const result = paeds.saveGrowth({ patientId, encounterId: '', date: paeds.today, time: '10:00', ageLabel: child ? formatAge(child.dateOfBirth, paeds.today) : '', weightKg, lengthCm, heightCm, headCm, muacCm, method: 'Clinic measurement', staff: STAFF[1].name, interpretation: '', notes: 'Measurement only. No growth diagnosis.' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Growth measurement saved.');
  };
  return (
    <PaedsShell title="Growth">
      <PageIntro title="Growth monitoring" description="The chart shows this child’s recorded weights. It is not a WHO reference curve and it does not assign a nutrition diagnosis." />
      <DemoBanner text="No validated percentile dataset is included. Empty measurements stay blank." />
      <div className="grid md:grid-cols-3 gap-2 mb-3"><PatientPicker value={patientId} onChange={setPatientId} />{child && <p className="text-sm self-center">{formatAge(child.dateOfBirth, paeds.today)}</p>}</div>
      <div className="grid md:grid-cols-5 gap-2 mb-3">
        <Input value={weightKg} onChange={(e) => setWeight(e.target.value)} placeholder="Weight kg" aria-label="Weight kg" />
        <Input value={lengthCm} onChange={(e) => setLength(e.target.value)} placeholder="Length cm" aria-label="Length cm" />
        <Input value={heightCm} onChange={(e) => setHeight(e.target.value)} placeholder="Height cm" aria-label="Height cm" />
        <Input value={headCm} onChange={(e) => setHead(e.target.value)} placeholder="Head cm" aria-label="Head cm" />
        <Input value={muacCm} onChange={(e) => setMuac(e.target.value)} placeholder="MUAC cm" aria-label="MUAC cm" />
      </div>
      <Button className="mb-4" onClick={save}>Save measurement</Button>
      <div className="h-56 rounded-xl border p-3 mb-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line dataKey="weight" stroke="#1d4ed8" connectNulls /></LineChart></ResponsiveContainer></div>
      <table className="w-full text-sm"><thead><tr>{['Date', 'Age', 'Weight', 'Length', 'Height', 'Head', 'BMI', 'Note'].map((h) => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map((g) => <tr key={g.id} className="border-t"><td className="p-2">{g.date}</td><td className="p-2">{g.ageLabel}</td><td className="p-2">{g.weightKg || '—'}</td><td className="p-2">{g.lengthCm || '—'}</td><td className="p-2">{g.heightCm || '—'}</td><td className="p-2">{g.headCm || '—'}</td><td className="p-2">{bmi(g.weightKg, g.heightCm || g.lengthCm) || '—'}</td><td className="p-2">{g.interpretation || 'No interpretation'}</td></tr>)}</tbody>
      </table>
    </PaedsShell>
  );
}

export function PaedsDevelopment() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [marks, setMarks] = useState(blankMarks());
  const [summary, setSummary] = useState('');
  const [concerns, setConcerns] = useState('');
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const save = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.saveDevelopment({ patientId, date: paeds.today, ageLabel: child ? formatAge(child.dateOfBirth, paeds.today) : '', clinician: STAFF[0].name, type: 'Clinic assessment', marks, concerns, summary, reviewDate: '', referralNote: '', status: 'Saved' });
    paedsNotify('success', 'Developmental assessment saved. No disorder was assigned.');
  };
  return (
    <PaedsShell title="Development">
      <PageIntro title="Developmental assessment" description="Mark each area only after it is reviewed. Not assessed is the starting point. Checklist answers do not diagnose a developmental disorder." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      {child && <p className="text-sm my-2">Age at assessment: {formatAge(child.dateOfBirth, paeds.today)}</p>}
      <div className="grid md:grid-cols-2 gap-2 my-3">{MILESTONE_AREAS.map((area) => (
        <label key={area} className="text-sm flex justify-between gap-2 border rounded-md px-3 py-2">{area}
          <select className="border rounded px-1" value={marks[area]} aria-label={area} onChange={(e) => setMarks({ ...marks, [area]: e.target.value as MilestoneMark })}>
            <option>Achieved</option><option>Not yet achieved</option><option>Not assessed</option><option>Concern identified</option>
          </select>
        </label>
      ))}</div>
      <Textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} placeholder="Parent or guardian concerns" className="mb-2" />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Assessment summary" className="mb-2" />
      <div className="flex gap-2 mb-4"><Button onClick={save}>Save assessment</Button><Link to={`/dashboard/paeds/referrals?patient=${patientId}`}><Button variant="outline">Create referral</Button></Link><Link to={`/dashboard/paeds/follow-ups?patient=${patientId}`}><Button variant="outline">Schedule follow-up</Button></Link></div>
      <ul className="text-sm space-y-2">{paeds.state.development.filter((d) => !patientId || d.patientId === patientId).map((d) => <li key={d.id} className="border rounded-md p-3">{d.date} · {paeds.nameOf(d.patientId)} · {d.summary || 'No summary'}</li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsNewborn() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [findings, setFindings] = useState(blankFindings(NEWBORN_SECTIONS));
  const [feedingMethod, setFeeding] = useState('');
  const save = (status: 'Draft' | 'Completed') => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    const child = paeds.state.patients.find((p) => p.id === patientId);
    paeds.saveNewborn({
      patientId, date: paeds.today, clinician: STAFF[0].name, birthDateTime: child?.birth.birthDateTime ?? '', gestationalAgeWeeks: child?.birth.gestationalAgeWeeks ?? '', birthWeightKg: child?.birth.birthWeightKg ?? '', birthLengthCm: child?.birth.birthLengthCm ?? '', headCm: '',
      deliveryMethod: '', maternalHistory: '', complications: child?.birth.complications ?? '', resuscitation: '', feedingMethod, findings, temperatureC: '', heartRate: '', respiratoryRate: '', spo2: '', weightKg: '', feedingNotes: '', problems: '', investigations: '', feedingPlan: '', monitoringPlan: '', followUp: '', escalation: '', status,
    });
    paedsNotify('success', status === 'Completed' ? 'Newborn assessment completed in this browser.' : 'Draft saved. Unexamined sections stay blank.');
  };
  return (
    <PaedsShell title="Newborn">
      <PageIntro title="Newborn and neonatal assessment" description="Separate from the general examination. Sections stay blank until a clinician chooses a finding. This screen does not determine a neonatal diagnosis." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      <div className="my-3"><Label>Feeding method</Label><Input value={feedingMethod} onChange={(e) => setFeeding(e.target.value)} /></div>
      <div className="grid md:grid-cols-2 gap-2 mb-3">{NEWBORN_SECTIONS.map((section) => (
        <div key={section} className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2">
          <span>{section}</span>
          <select className="border rounded px-1" aria-label={section} value={findings[section].choice} onChange={(e) => setFindings({ ...findings, [section]: { ...findings[section], choice: e.target.value as FindingChoice } })}>
            <option value="">Leave blank</option><option>Not assessed</option><option>Normal</option><option>Abnormal</option>
          </select>
        </div>
      ))}</div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => save('Draft')}>Save draft</Button><Button onClick={() => save('Completed')}>Complete assessment</Button></div>
    </PaedsShell>
  );
}

export function PaedsImmunisation() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [vaccine, setVaccine] = useState(VACCINE_NAMES[0]);
  const [dose, setDose] = useState('1');
  const [dateGiven, setDate] = useState('');
  const [route, setRoute] = useState('');
  const [site, setSite] = useState('');
  const [nextDue, setNext] = useState('');
  const [status, setStatus] = useState<'Scheduled' | 'Administered' | 'Deferred' | 'Missed'>('Scheduled');
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const save = () => {
    const result = paeds.saveImmunisation({ patientId, vaccine, dose, dateGiven, ageLabel: child && dateGiven ? formatAge(child.dateOfBirth, dateGiven) : '', batch: '', expiry: '', route, site, staff: status === 'Administered' ? STAFF[1].name : '', facility: 'GFA Demo Hospital', notes: 'Demonstration name only. Not an authoritative schedule.', nextDue, deferReason: status === 'Deferred' ? 'Staff recorded a deferral.' : '', status, appointmentId: '' });
    if (!result.ok) paedsNotify('error', result.message); else paedsNotify('success', 'Immunisation row saved.');
  };
  return (
    <PaedsShell title="Immunisation">
      <PageIntro title="Immunisation" description="Vaccine names are labels for demonstration. Staff enter the next due date. A visit does not mark a dose as given." />
      <DemoBanner text="This is not the Nigerian routine immunisation schedule. No dose interval or contraindication is calculated." />
      <div className="grid md:grid-cols-3 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <select className={selectClass()} value={vaccine} onChange={(e) => setVaccine(e.target.value)} aria-label="Vaccine">{VACCINE_NAMES.map((name) => <option key={name}>{name}</option>)}</select>
        <Input value={dose} onChange={(e) => setDose(e.target.value)} aria-label="Dose number" />
        <Input type="date" value={dateGiven} onChange={(e) => setDate(e.target.value)} aria-label="Date given" />
        <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Route" aria-label="Route" />
        <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Site" aria-label="Site" />
        <Input type="date" value={nextDue} onChange={(e) => setNext(e.target.value)} aria-label="Next due date" />
        <select className={selectClass()} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status"><option>Scheduled</option><option>Administered</option><option>Deferred</option><option>Missed</option></select>
        <Button onClick={save}>Save immunisation</Button>
      </div>
      <ul className="text-sm space-y-2">{paeds.state.immunisations.filter((row) => !patientId || row.patientId === patientId).map((row) => <li key={row.id} className="border rounded-md p-3 flex justify-between"><span>{row.vaccine} dose {row.dose} · {row.dateGiven || 'not given'} · next {row.nextDue || '—'}</span><PaedsStatus status={row.status} /></li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsNutrition() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [feeding, setFeeding] = useState('');
  const [notes, setNotes] = useState('');
  const save = () => {
    if (!patientId) { paedsNotify('error', 'Select a child.'); return; }
    paeds.saveNutrition({ patientId, date: paeds.today, feeding, notes, clinician: STAFF[0].name });
    paedsNotify('success', 'Nutrition note saved. No nutrition diagnosis was assigned.');
  };
  return (
    <PaedsShell title="Nutrition">
      <PageIntro title="Nutrition assessment" description="Record feeding history and a clinician note. Measurements on the growth screen are not turned into a diagnosis here." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      <Textarea className="my-2" value={feeding} onChange={(e) => setFeeding(e.target.value)} placeholder="Feeding history" />
      <Textarea className="mb-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinician note" />
      <Button className="mb-4" onClick={save}>Save note</Button>
      <ul className="text-sm space-y-2">{paeds.state.nutrition.filter((n) => !patientId || n.patientId === patientId).map((n) => <li key={n.id} className="border rounded-md p-3">{n.date} · {n.feeding}</li>)}</ul>
    </PaedsShell>
  );
}

export function PaedsChildHealth() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient() || paeds.state.patients[0]?.id || '');
  const q = `?patient=${patientId}`;
  return (
    <PaedsShell title="Child health">
      <PageIntro title="Child health record" description="Open the linked paediatric workflows for the selected child. This is a view of the same demonstration record." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4 text-sm">
        {[['Growth', 'growth'], ['Immunisation', 'immunisation'], ['Development', 'development'], ['Encounters', 'encounters'], ['Newborn', 'newborn'], ['Nutrition', 'nutrition']].map(([label, path]) => (
          <Link key={path} className="rounded-lg border p-3 hover:border-primary" to={`/dashboard/paeds/${path}${q}`}>{label}</Link>
        ))}
      </div>
    </PaedsShell>
  );
}

export function PaedsEncounters() {
  const { id } = useParams();
  return id ? <EncounterForm id={id} /> : <EncounterList />;
}

function EncounterList() {
  const paeds = usePaeds();
  const patient = usePatient();
  const rows = paeds.state.encounters.filter((e) => !patient || e.patientId === patient);
  return (
    <PaedsShell title="Encounters">
      <PageIntro title="Clinical encounters" description="Complete a visit only after a complaint and a diagnosis are written." actions={<Link to={`/dashboard/paeds/encounters/new${patient ? `?patient=${patient}` : ''}`}><Button>New encounter</Button></Link>} />
      <DemoBanner />
      <ul className="space-y-2 text-sm">{rows.map((row) => <li key={row.id} className="border rounded-lg p-3 flex justify-between"><span><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /> · {row.complaint || 'No complaint'}</span><Link to={`/dashboard/paeds/encounters/${row.id}`}><Button size="sm" variant="outline">Open</Button></Link></li>)}{rows.length === 0 && <p className="text-muted-foreground">No encounters.</p>}</ul>
    </PaedsShell>
  );
}

function EncounterForm({ id }: { id: string }) {
  const paeds = usePaeds();
  const preset = usePatient();
  const existing = paeds.state.encounters.find((e) => e.id === id);
  const [patientId, setPatientId] = useState(existing?.patientId ?? preset);
  const [complaint, setComplaint] = useState(existing?.complaint ?? '');
  const [hpc, setHpc] = useState(existing?.hpc ?? '');
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? '');
  const [plan, setPlan] = useState(existing?.plan ?? '');
  const [exam, setExam] = useState(existing?.examination ?? blankFindings(EXAM_SYSTEMS));
  const child = paeds.state.patients.find((p) => p.id === patientId);
  const save = (status: 'Draft' | 'Saved' | 'Completed') => {
    const result = paeds.saveEncounter({
      id: existing?.id, patientId, date: existing?.date ?? paeds.today, time: '10:00', clinician: STAFF[0].name, complaint, hpc,
      medicalHistory: child?.previousIllnesses ?? '', birthHistory: child?.birth.neonatalHistory ?? '', feedingHistory: child?.feedingHistory ?? '', developmentHistory: '', immunisationHistory: child?.immunisationNote ?? '',
      allergies: child?.allergies ?? '', medications: child?.currentMedications ?? '', examination: exam, assessment: '', diagnosis, differential: '', plan, notes: '', followUp: '', status,
    });
    if (!result.ok) paedsNotify('error', result.message);
    else paedsNotify('success', status === 'Completed' ? 'Consultation completed in this browser.' : 'Encounter saved.');
  };
  const links = useMemo(() => patientId ? `?patient=${patientId}` : '', [patientId]);
  return (
    <PaedsShell title="Encounter">
      <PageIntro title={existing ? existing.id : 'New encounter'} description="Systems stay blank until examined. Age, guardian, allergies, and the latest weight are shown for context." />
      <DemoBanner />
      <PatientPicker value={patientId} onChange={setPatientId} />
      {child && <p className="text-sm my-2">{formatAge(child.dateOfBirth, paeds.today)} · Guardian {child.guardian.name} {child.guardian.phone} · Allergies {child.allergies}</p>}
      <div className="flex flex-wrap gap-2 text-sm my-2">{[['Vitals', 'triage'], ['Growth', 'growth'], ['Development', 'development'], ['Immunisation', 'immunisation'], ['Diagnoses', 'diagnoses'], ['Prescribe', 'prescriptions'], ['Investigation', 'investigations'], ['Referral', 'referrals'], ['Admit', 'admissions'], ['Follow-up', 'follow-ups']].map(([label, path]) => <Link key={path} className="underline" to={`/dashboard/paeds/${path}${links}`}>{label}</Link>)}</div>
      <Textarea className="mb-2" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Presenting complaint" />
      <Textarea className="mb-2" value={hpc} onChange={(e) => setHpc(e.target.value)} placeholder="History" />
      <div className="grid md:grid-cols-2 gap-2 mb-3">{EXAM_SYSTEMS.map((system) => (
        <div key={system} className="flex justify-between gap-2 text-sm border rounded-md px-3 py-2"><span>{system}</span>
          <select aria-label={system} value={exam[system]?.choice ?? ''} onChange={(e) => setExam({ ...exam, [system]: { choice: e.target.value as FindingChoice, notes: exam[system]?.notes ?? '' } })}>
            <option value="">Leave blank</option><option>Not assessed</option><option>Normal</option><option>Abnormal</option>
          </select>
        </div>
      ))}</div>
      <Textarea className="mb-2" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis written by the clinician" />
      <Textarea className="mb-3" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Plan" />
      <div className="flex gap-2"><Button variant="outline" onClick={() => save('Saved')}>Save draft</Button><Button onClick={() => save('Completed')}>Complete consultation</Button></div>
    </PaedsShell>
  );
}

export function PaedsDiagnoses() {
  const paeds = usePaeds();
  const [patientId, setPatientId] = useState(usePatient());
  const [name, setName] = useState(DIAGNOSIS_CATALOGUE[0]);
  const [rank, setRank] = useState<DxRank>('Primary');
  const [status, setStatus] = useState<DxStatus>('Suspected');
  const add = () => {
    if (!patientId || !name.trim()) { paedsNotify('error', 'Choose a child and a diagnosis.'); return; }
    paeds.saveDiagnosis({ patientId, encounterId: '', name, description: 'Entered by the clinician.', rank, system: '', date: paeds.today, status, clinician: STAFF[0].name, notes: 'Catalogue is illustrative, not a coding system.' });
    paedsNotify('success', 'Diagnosis added.');
  };
  return (
    <PaedsShell title="Diagnoses">
      <PageIntro title="Diagnoses" description="The clinician adds each diagnosis. Symptoms, age, and measurements do not assign one. The list is not a complete coding system." />
      <DemoBanner />
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input list="dx" value={name} onChange={(e) => setName(e.target.value)} aria-label="Diagnosis" />
        <datalist id="dx">{DIAGNOSIS_CATALOGUE.map((item) => <option key={item} value={item} />)}</datalist>
        <select className={selectClass()} value={rank} onChange={(e) => setRank(e.target.value as DxRank)} aria-label="Rank"><option>Primary</option><option>Secondary</option></select>
        <select className={selectClass()} value={status} onChange={(e) => setStatus(e.target.value as DxStatus)} aria-label="Status"><option>Suspected</option><option>Confirmed</option><option>Resolved</option></select>
      </div>
      <Button className="mb-4" onClick={add}>Add diagnosis</Button>
      <ul className="text-sm space-y-2">{paeds.state.diagnoses.map((row) => <li key={row.id} className="border rounded-md p-3"><PatientLink id={row.patientId} name={paeds.nameOf(row.patientId)} /> · {row.name} <PaedsStatus status={row.rank} /> <PaedsStatus status={row.status} /></li>)}</ul>
    </PaedsShell>
  );
}
