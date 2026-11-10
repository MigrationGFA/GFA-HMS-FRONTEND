import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEye } from '@/contexts/EyeStore';
import { CLINICIANS, type EyeEncounter } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeShell, EyeStatus, PageIntro, PatientLink, PatientPicker } from './shared';

export default function EyeConsultations() {
  const { id } = useParams();
  return id ? <EncounterForm id={id} /> : <EncounterList />;
}

function EncounterList() {
  const eye = useEye();
  const [params] = useSearchParams();
  const patient = params.get('patient') ?? '';
  const rows = eye.state.encounters.filter((row) => !patient || row.patientId === patient);
  return (
    <EyeShell title="Consultations">
      <PageIntro title="Eye Consultations" description="Open a visit to record the complaint, assessment, and diagnosis. Completing a visit requires both a complaint and a diagnosis." actions={<Link to="/dashboard/eye/consultations/new"><Button>New consultation</Button></Link>} />
      <DemoBanner />
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border p-3 flex justify-between gap-3 text-sm">
            <div><PatientLink id={row.patientId} name={eye.nameOf(row.patientId)} /><p className="text-muted-foreground">{row.date} · {row.chiefComplaint || 'No complaint yet'}</p></div>
            <div className="flex items-center gap-2"><EyeStatus status={row.status} /><Link to={`/dashboard/eye/consultations/${row.id}`}><Button size="sm" variant="outline">Open</Button></Link></div>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No consultations for this filter.</p>}
      </ul>
    </EyeShell>
  );
}

function EncounterForm({ id }: { id: string }) {
  const eye = useEye();
  const [params] = useSearchParams();
  const existing = eye.state.encounters.find((row) => row.id === id);
  const [draft, setDraft] = useState<Omit<EyeEncounter, 'id'>>(() => existing ?? {
    patientId: params.get('patient') ?? '', date: eye.today, time: '09:30', clinician: CLINICIANS[0].name, designation: 'Ophthalmologist',
    chiefComplaint: '', hpc: '', medicalHistory: '', ophthalmicHistory: '', assessment: '', diagnosisSummary: '', differential: '',
    treatmentPlan: '', notes: '', followUp: '', status: 'Draft',
  });
  const acuity = useMemo(() => eye.latestAcuityFor(draft.patientId), [eye, draft.patientId]);
  const set = (patch: Partial<typeof draft>) => setDraft((cur) => ({ ...cur, ...patch }));

  const persist = (status: EyeEncounter['status']) => {
    if (status === 'Completed' && (!draft.chiefComplaint.trim() || !draft.diagnosisSummary.trim())) {
      eyeNotify('error', 'A completed consultation needs a complaint and a diagnosis.');
      return;
    }
    const saved = eye.saveEncounter({ ...draft, id: existing ? existing.id : undefined, status });
    eyeNotify('success', status === 'Completed' ? 'Consultation completed in this browser.' : 'Consultation draft saved.');
    if (!existing) window.history.replaceState(null, '', `/dashboard/eye/consultations/${saved.id}`);
  };

  return (
    <EyeShell title="Consultation">
      <PageIntro title={existing ? existing.id : 'New consultation'} description="The clinician writes the assessment. Acuity and examination values are shown for context and are not turned into a diagnosis." />
      <DemoBanner />
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div><Label>Patient</Label><PatientPicker value={draft.patientId} onChange={(patientId) => set({ patientId })} /></div>
        <div><Label>Clinician</Label><Input value={draft.clinician} onChange={(e) => set({ clinician: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Chief complaint</Label><Textarea value={draft.chiefComplaint} onChange={(e) => set({ chiefComplaint: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>History of presenting complaint</Label><Textarea value={draft.hpc} onChange={(e) => set({ hpc: e.target.value })} /></div>
        <div><Label>Assessment</Label><Textarea value={draft.assessment} onChange={(e) => set({ assessment: e.target.value })} /></div>
        <div><Label>Diagnosis</Label><Textarea value={draft.diagnosisSummary} onChange={(e) => set({ diagnosisSummary: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Plan</Label><Textarea value={draft.treatmentPlan} onChange={(e) => set({ treatmentPlan: e.target.value })} /></div>
      </div>
      {acuity && <p className="text-sm mb-3">Latest saved acuity {acuity.date}: OD {acuity.od.unaided || '—'} · OS {acuity.os.unaided || '—'}.</p>}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => persist('Saved')}>Save draft</Button>
        <Button onClick={() => persist('Completed')}>Complete consultation</Button>
      </div>
    </EyeShell>
  );
}
