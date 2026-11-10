import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEye } from '@/contexts/EyeStore';
import { DIAGNOSIS_CATALOGUE, type DiagnosisRank, type DiagnosisStatus, type EyeSide } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeBadge, EyeShell, EyeStatus, PageIntro, PatientLink, PatientPicker, selectClass } from './shared';

export function EyeHistory() {
  const eye = useEye();
  return (
    <EyeShell title="History">
      <PageIntro title="Ophthalmic History" description="Past eye conditions, surgery, and examination notes recorded by a clinician." />
      <DemoBanner />
      <ul className="space-y-2 text-sm">
        {eye.state.patients.filter((p) => p.previousEyeConditions || p.previousEyeSurgeries || p.familyEyeHistory).map((p) => (
          <li key={p.id} className="rounded-lg border p-3">
            <PatientLink id={p.id} name={eye.nameOf(p.id)} />
            <p>Conditions: {p.previousEyeConditions || '—'}</p>
            <p>Surgery: {p.previousEyeSurgeries || '—'}</p>
            <p>Family history: {p.familyEyeHistory || '—'}</p>
          </li>
        ))}
        {eye.state.exams.map((exam) => (
          <li key={exam.id} className="rounded-lg border p-3">
            <PatientLink id={exam.patientId} name={eye.nameOf(exam.patientId)} /> · {exam.date}
            <p>Complaint: {exam.complaint || '—'}</p>
            <p>History notes: {exam.historyNotes || '—'}</p>
          </li>
        ))}
      </ul>
    </EyeShell>
  );
}

export function EyeDiagnoses() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [name, setName] = useState(DIAGNOSIS_CATALOGUE[0]);
  const [eyeSide, setEyeSide] = useState<EyeSide>('OD');
  const [rank, setRank] = useState<DiagnosisRank>('Primary');
  const [status, setStatus] = useState<DiagnosisStatus>('Suspected');
  const add = () => {
    if (!patientId || !name.trim()) { eyeNotify('error', 'Choose a patient and a diagnosis.'); return; }
    eye.saveDiagnosis({ patientId, encounterId: '', name, eye: eyeSide, rank, status, date: eye.today, notes: '' });
    eyeNotify('success', 'Diagnosis added by the clinician.');
  };
  return (
    <EyeShell title="Diagnoses">
      <PageIntro title="Diagnoses" description="Each diagnosis is chosen by the clinician, with the eye, rank, and whether it is suspected or confirmed. Symptoms do not assign a diagnosis." />
      <DemoBanner />
      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <Input list="dx" value={name} onChange={(e) => setName(e.target.value)} aria-label="Diagnosis" />
        <datalist id="dx">{DIAGNOSIS_CATALOGUE.map((item) => <option key={item} value={item} />)}</datalist>
        <select className={selectClass()} value={eyeSide} onChange={(e) => setEyeSide(e.target.value as EyeSide)} aria-label="Eye"><option>OD</option><option>OS</option><option>OU</option><option>Unspecified</option></select>
        <select className={selectClass()} value={rank} onChange={(e) => setRank(e.target.value as DiagnosisRank)} aria-label="Rank"><option>Primary</option><option>Secondary</option></select>
        <select className={selectClass()} value={status} onChange={(e) => setStatus(e.target.value as DiagnosisStatus)} aria-label="Certainty"><option>Suspected</option><option>Confirmed</option><option>Resolved</option></select>
      </div>
      <Button className="mb-4" onClick={add}>Add diagnosis</Button>
      <ul className="space-y-2 text-sm">
        {eye.state.diagnoses.map((row) => (
          <li key={row.id} className="rounded-lg border p-3 flex justify-between gap-2">
            <div><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /><p>{row.name}</p><div className="flex gap-2 mt-1"><EyeBadge side={row.eye} /><EyeStatus status={row.rank} /><EyeStatus status={row.status} /></div></div>
            <Button size="sm" variant="outline" onClick={() => eye.removeDiagnosis(row.id)}>Remove</Button>
          </li>
        ))}
      </ul>
      <Label className="sr-only">Diagnosis catalogue</Label>
    </EyeShell>
  );
}
