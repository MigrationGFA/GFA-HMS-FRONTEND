import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEye } from '@/contexts/EyeStore';
import { ANTERIOR_FIELDS, CLINICIANS, EXTERNAL_FIELDS, FUNDUS_FIELDS, SYMPTOMS, URGENT_SYMPTOMS, blankFindings, type EyeSide, type FindingChoice } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeBadge, EyeShell, PageIntro, PatientPicker, selectClass } from './shared';

const CHOICES: FindingChoice[] = ['', 'Not assessed', 'Normal', 'Abnormal'];

function Findings({ title, side, value, onChange }: { title: string; side?: 'OD' | 'OS'; value: Record<string, { choice: FindingChoice; notes: string }>; onChange: (next: Record<string, { choice: FindingChoice; notes: string }>) => void }) {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center gap-2"><h3 className="font-semibold">{title}</h3>{side && <EyeBadge side={side} />}</div>
      {Object.entries(value).map(([name, finding]) => (
        <div key={name} className="grid grid-cols-2 gap-2 items-center">
          <span className="text-sm">{name}</span>
          <select className={selectClass()} aria-label={name} value={finding.choice} onChange={(e) => onChange({ ...value, [name]: { ...finding, choice: e.target.value as FindingChoice } })}>
            {CHOICES.map((choice) => <option key={choice || 'blank'} value={choice}>{choice || 'Leave blank'}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

export default function EyeExamination() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [complaint, setComplaint] = useState('');
  const [affectedEye, setAffectedEye] = useState<EyeSide>('OU');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [urgentReview, setUrgentReview] = useState(false);
  const [external, setExternal] = useState(blankFindings(EXTERNAL_FIELDS));
  const [anteriorOd, setAnteriorOd] = useState(blankFindings(ANTERIOR_FIELDS));
  const [anteriorOs, setAnteriorOs] = useState(blankFindings(ANTERIOR_FIELDS));
  const [fundusOd, setFundusOd] = useState(blankFindings(FUNDUS_FIELDS));
  const [fundusOs, setFundusOs] = useState(blankFindings(FUNDUS_FIELDS));
  const [iopOd, setIopOd] = useState('');
  const [iopOs, setIopOs] = useState('');
  const [iopMethod, setIopMethod] = useState('Goldmann');
  const [notes, setNotes] = useState('');

  const toggle = (symptom: string) => setSymptoms((cur) => cur.includes(symptom) ? cur.filter((s) => s !== symptom) : [...cur, symptom]);

  const save = (status: 'Draft' | 'Saved') => {
    if (!patientId) { eyeNotify('error', 'Select a patient.'); return; }
    eye.saveExam({
      patientId, encounterId: '', date: eye.today, clinician: CLINICIANS[0].name, complaint, affectedEye,
      onset: '', duration: '', severity: '', symptoms, urgentReview, previousTreatment: '', historyNotes: notes,
      diabetes: false, hypertension: false, trauma: '', surgery: '', glaucomaHistory: '', cataractHistory: '',
      retinalHistory: '', medications: '', allergies: '', familyHistory: '',
      external, anteriorOd, anteriorOs, iopOd, iopOs, iopMethod, iopTime: '', iopNotes: 'A single pressure reading is not a diagnosis.',
      pupilSizeOd: '', pupilSizeOs: '', pupilReaction: '', rapd: '', pupilNotes: '',
      fundusOd, fundusOs, fundusNotPerformed: false, visualFields: '', colourVision: '', binocular: '', otherFindings: '', status,
    });
    eyeNotify('success', 'Examination stored in this browser. Unassessed fields stay blank.');
  };

  return (
    <EyeShell title="Examination">
      <PageIntro title="Eye Examination" description="Sections stay blank until a clinician chooses Not assessed, Normal, or Abnormal. Symptoms can be flagged for review. They do not assign a diagnosis." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div><Label>Patient</Label><PatientPicker value={patientId} onChange={setPatientId} /></div>
        <div><Label>Affected eye</Label><select className={selectClass()} value={affectedEye} onChange={(e) => setAffectedEye(e.target.value as EyeSide)}><option>OD</option><option>OS</option><option>OU</option><option>Unspecified</option></select></div>
      </div>
      <Label>Complaint</Label>
      <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} className="mb-3" />
      <div className="flex flex-wrap gap-2 mb-3">
        {SYMPTOMS.map((symptom) => (
          <label key={symptom} className="text-sm border rounded-full px-3 py-1">
            <input type="checkbox" className="mr-1" checked={symptoms.includes(symptom)} onChange={() => toggle(symptom)} />
            {symptom}{URGENT_SYMPTOMS.includes(symptom) ? ' · flag for review' : ''}
          </label>
        ))}
      </div>
      <label className="text-sm flex items-center gap-2 mb-4"><input type="checkbox" checked={urgentReview} onChange={(e) => setUrgentReview(e.target.checked)} /> Clinician requests urgent review. This is not an automated diagnosis.</label>
      <div className="grid lg:grid-cols-2 gap-3 mb-3">
        <Findings title="External" value={external} onChange={setExternal} />
        <Findings title="Anterior segment" side="OD" value={anteriorOd} onChange={setAnteriorOd} />
        <Findings title="Anterior segment" side="OS" value={anteriorOs} onChange={setAnteriorOs} />
        <Findings title="Fundus" side="OD" value={fundusOd} onChange={setFundusOd} />
        <Findings title="Fundus" side="OS" value={fundusOs} onChange={setFundusOs} />
      </div>
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <div><Label>IOP OD (mmHg)</Label><Input value={iopOd} onChange={(e) => setIopOd(e.target.value)} /></div>
        <div><Label>IOP OS (mmHg)</Label><Input value={iopOs} onChange={(e) => setIopOs(e.target.value)} /></div>
        <div><Label>Method</Label><select className={selectClass()} value={iopMethod} onChange={(e) => setIopMethod(e.target.value)}><option>Goldmann</option><option>Perkins</option><option>iCare</option><option>Non-contact</option></select></div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Intraocular pressure is recorded as measured. One reading does not recommend medication or a diagnosis.</p>
      <div className="flex gap-2"><Button variant="outline" onClick={() => save('Draft')}>Save draft</Button><Button onClick={() => save('Saved')}>Save examination</Button></div>
    </EyeShell>
  );
}
