import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useDental } from '@/contexts/DentalStore';
import { DENTISTS, patientName, type DentalEncounter, type EncounterStatus } from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

const blank = (patientId: string, dentist: string, date: string): Omit<DentalEncounter, 'id'> => ({
  patientId,
  date,
  time: new Date().toTimeString().slice(0, 5),
  dentist,
  designation: DENTISTS.find((d) => d.name === dentist)?.designation ?? 'Dental Surgeon',
  chiefComplaint: '',
  hpc: '',
  medicalHistory: '',
  dentalHistory: '',
  allergies: '',
  medications: '',
  vitals: '',
  extraoral: '',
  intraoral: '',
  periodontal: '',
  chartSummary: '',
  diagnosis: '',
  differential: '',
  treatmentPlan: '',
  proceduresPerformed: '',
  prescriptionsNote: '',
  investigationsNote: '',
  referralsNote: '',
  followUp: '',
  notes: '',
  status: 'Draft',
});

export function DentalEncounterList() {
  const { state } = useDental();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [q, setQ] = useState('');
  const patientFilter = params.get('patient') ?? '';
  const rows = state.encounters.filter((e) => {
    if (patientFilter && e.patientId !== patientFilter) return false;
    if (status !== 'all' && e.status !== status) return false;
    const name = state.patients.find((p) => p.id === e.patientId);
    const blob = `${name ? patientName(name) : ''} ${e.diagnosis} ${e.chiefComplaint}`.toLowerCase();
    return blob.includes(q.trim().toLowerCase());
  });

  return (
    <DentalShell title="Encounters">
      <PageIntro
        title="Clinical encounters"
        description="Dental consultations recorded in this browser. Completing an encounter updates the patient’s visit history in the demo."
        actions={<Button onClick={() => navigate('/dashboard/dental/encounters/new')}>New encounter</Button>}
      />
      <DemoBanner />
      <div className="flex gap-2 mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search complaint or diagnosis" className="max-w-xs" />
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option>Draft</option>
          <option>Saved</option>
          <option>Completed</option>
        </select>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Complaint</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Dentist</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={6} label="No encounters match this filter." />}
            {rows.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/dental/encounters/${e.id}`)}>
                <TableCell>{e.date} {e.time}</TableCell>
                <TableCell><PatientLink id={e.patientId} name={state.patients.find((p) => p.id === e.patientId) ? patientName(state.patients.find((p) => p.id === e.patientId)!) : e.patientId} /></TableCell>
                <TableCell>{e.chiefComplaint || '—'}</TableCell>
                <TableCell>{e.diagnosis || '—'}</TableCell>
                <TableCell>{e.dentist}</TableCell>
                <TableCell><DentalStatus status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DentalShell>
  );
}

export function DentalEncounterPage() {
  const { encounterId = 'new' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, today, saveEncounter } = useDental();
  const existing = state.encounters.find((e) => e.id === encounterId);
  const dentist = user?.name && DENTISTS.some((d) => d.name === user.name) ? user.name : DENTISTS[0].name;
  const [form, setForm] = useState<Omit<DentalEncounter, 'id'>>(() => existing ?? blank(params.get('patient') ?? '', dentist, today));
  const [savedId, setSavedId] = useState(existing?.id ?? '');

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  const patient = state.patients.find((p) => p.id === form.patientId);
  const set = (key: keyof Omit<DentalEncounter, 'id'>, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const persist = (status: EncounterStatus) => {
    if (!form.patientId) {
      notify.error('encounter', 'Select a patient.');
      return;
    }
    if (status === 'Completed') {
      if (!form.chiefComplaint.trim()) {
        notify.error('encounter', 'Chief complaint is required before completing the consultation.');
        return;
      }
      if (!form.diagnosis.trim()) {
        notify.error('encounter', 'A diagnosis is required before completing the consultation.');
        return;
      }
    }
    const next = saveEncounter({ ...form, status, id: savedId || undefined });
    setSavedId(next.id);
    if (status === 'Completed') {
      notify.success('encounter', 'Consultation marked complete in the demonstration record.');
    } else {
      notify.success('encounter', status === 'Draft' ? 'Draft kept in this browser.' : 'Encounter saved in the demonstration record.');
    }
    if (encounterId === 'new') navigate(`/dashboard/dental/encounters/${next.id}`, { replace: true });
  };

  const chartSummary = useMemo(() => {
    const chart = state.charts.find((c) => c.patientId === form.patientId);
    return chart?.findings.map((f) => `${f.tooth} ${f.finding}`).join('; ') || 'No chart findings yet.';
  }, [state.charts, form.patientId]);

  const q = `patient=${form.patientId}`;

  return (
    <DentalShell title="Consultation">
      <PageIntro title="Dental consultation" description="Document the encounter, then save a draft or complete it. Nothing is submitted to a hospital server." />
      <DemoBanner />
      {patient && patient.drugAllergies.toLowerCase() !== 'none' && (
        <p className="mb-3 text-sm border border-amber-300 bg-amber-50 text-amber-900 rounded-lg px-3 py-2">Allergy alert: {patient.drugAllergies}. {patient.medicalConditions ? `Conditions: ${patient.medicalConditions}.` : ''}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div><Label>Patient</Label><PatientPicker value={form.patientId} onChange={(id) => {
          const p = state.patients.find((row) => row.id === id);
          setForm((prev) => ({
            ...prev,
            patientId: id,
            allergies: p?.drugAllergies ?? prev.allergies,
            medications: p?.currentMedications ?? prev.medications,
            medicalHistory: p?.medicalHistory ?? prev.medicalHistory,
            dentalHistory: p?.previousDentalHistory ?? prev.dentalHistory,
          }));
        }} /></div>
        <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Area label="Chief complaint" value={form.chiefComplaint} onChange={(v) => set('chiefComplaint', v)} />
        <Area label="History of presenting complaint" value={form.hpc} onChange={(v) => set('hpc', v)} />
        <Area label="Relevant medical history" value={form.medicalHistory} onChange={(v) => set('medicalHistory', v)} />
        <Area label="Dental history" value={form.dentalHistory} onChange={(v) => set('dentalHistory', v)} />
        <Area label="Drug and material allergies" value={form.allergies} onChange={(v) => set('allergies', v)} />
        <Area label="Current medications" value={form.medications} onChange={(v) => set('medications', v)} />
        <Area label="Vital signs" value={form.vitals} onChange={(v) => set('vitals', v)} />
        <Area label="Extraoral examination" value={form.extraoral} onChange={(v) => set('extraoral', v)} />
        <Area label="Intraoral examination" value={form.intraoral} onChange={(v) => set('intraoral', v)} />
        <Area label="Periodontal assessment" value={form.periodontal} onChange={(v) => set('periodontal', v)} />
        <div className="lg:col-span-2">
          <Label>Dental chart findings</Label>
          <p className="text-sm border rounded-md p-2 bg-muted/40">{chartSummary}</p>
          <Input className="mt-2" value={form.chartSummary} placeholder="Clinician summary" onChange={(e) => set('chartSummary', e.target.value)} />
        </div>
        <Area label="Diagnosis" value={form.diagnosis} onChange={(v) => set('diagnosis', v)} />
        <Area label="Differential diagnosis" value={form.differential} onChange={(v) => set('differential', v)} />
        <Area label="Treatment plan" value={form.treatmentPlan} onChange={(v) => set('treatmentPlan', v)} />
        <Area label="Procedures performed" value={form.proceduresPerformed} onChange={(v) => set('proceduresPerformed', v)} />
        <Area label="Prescriptions" value={form.prescriptionsNote} onChange={(v) => set('prescriptionsNote', v)} />
        <Area label="Investigations" value={form.investigationsNote} onChange={(v) => set('investigationsNote', v)} />
        <Area label="Referrals" value={form.referralsNote} onChange={(v) => set('referralsNote', v)} />
        <Area label="Follow-up recommendations" value={form.followUp} onChange={(v) => set('followUp', v)} />
        <div className="lg:col-span-2"><Area label="Clinical notes" value={form.notes} onChange={(v) => set('notes', v)} /></div>
      </div>
      <p className="text-sm mt-3">{form.dentist} · {form.designation} · <DentalStatus status={form.status} /></p>
      <div className="flex flex-wrap gap-2 mt-4">
        <Button variant="outline" onClick={() => persist('Draft')}>Save draft</Button>
        <Button variant="outline" onClick={() => persist('Saved')}>Save encounter</Button>
        <Button onClick={() => persist('Completed')}>Complete consultation</Button>
        <Button variant="outline" onClick={() => set('diagnosis', form.diagnosis || 'Provisional diagnosis: ')}>Add diagnosis</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/chart/${form.patientId}?encounter=${savedId}`)}>Open odontogram</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/plans?${q}&new=1`)}>Create treatment plan</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/prescriptions?${q}&new=1`)}>Prescribe medication</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/investigations?${q}&new=1`)}>Request investigation</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/referrals?${q}&new=1`)}>Create referral</Button>
        <Button variant="outline" disabled={!form.patientId} onClick={() => navigate(`/dashboard/dental/follow-ups?${q}&new=1`)}>Schedule follow-up</Button>
      </div>
    </DentalShell>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} rows={3} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
