import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEye } from '@/contexts/EyeStore';
import { ageFromDob, patientName } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EmptyRow, EyeShell, EyeStatus, PageIntro, selectClass } from './shared';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  sex: z.enum(['Female', 'Male']),
  dateOfBirth: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Enter a phone number'),
  email: z.string().optional(),
  hospitalId: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  drugAllergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  presentingComplaint: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EyePatients() {
  const { id } = useParams();
  return id ? <EyeProfile id={id} /> : <EyePatientList />;
}

function EyePatientList() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sex, setSex] = useState('All');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = eye.state.patients.filter((p) => {
      if (sex !== 'All' && p.sex !== sex) return false;
      const blob = `${patientName(p)} ${p.id} ${p.phone} ${p.hospitalId}`.toLowerCase();
      return !query || blob.includes(query);
    });
    filtered.sort((a, b) => sort === 'recent' ? b.createdAt.localeCompare(a.createdAt) : patientName(a).localeCompare(patientName(b)));
    return filtered;
  }, [eye.state.patients, q, sex, sort]);
  const pageSize = 8;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <EyeShell title="Patients">
      <PageIntro title="Eye Patients" description="Search the clinic list or register a patient. A hospital ID links the record without copying the whole hospital chart." actions={
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close form' : 'Register patient'}</Button>
      } />
      <DemoBanner />
      {showForm && <RegisterForm onDone={() => setShowForm(false)} />}
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, ID, or phone" className="max-w-xs" />
        <select className={selectClass() + ' max-w-[140px]'} value={sex} onChange={(e) => setSex(e.target.value)} aria-label="Sex"><option>All</option><option>Female</option><option>Male</option></select>
        <select className={selectClass() + ' max-w-[160px]'} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="name">Name</option><option value="recent">Recently added</option></select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Patient', 'Hospital ID', 'Age', 'Phone', 'Last visit', 'Next', 'Status'].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {slice.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2"><Link className="text-primary font-medium hover:underline" to={`/dashboard/eye/patients/${p.id}`}>{patientName(p)}</Link><div className="text-xs text-muted-foreground">{p.id}</div></td>
                <td className="p-2">{p.hospitalId || '—'}</td>
                <td className="p-2">{ageFromDob(p.dateOfBirth)}</td>
                <td className="p-2">{p.phone}</td>
                <td className="p-2">{p.lastVisit || '—'}</td>
                <td className="p-2">{p.nextAppointment || '—'}</td>
                <td className="p-2"><EyeStatus status={p.status} /></td>
              </tr>
            ))}
            {slice.length === 0 && <EmptyRow colSpan={7} label="No patients match this search." />}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <Button variant="outline" disabled={page * pageSize >= rows.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
        <span className="text-sm text-muted-foreground self-center">{rows.length} patients</span>
      </div>
    </EyeShell>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const eye = useEye();
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { sex: 'Female', drugAllergies: 'None' } });
  const onSubmit = form.handleSubmit((values) => {
    const result = eye.registerPatient({
      ...values,
      hospitalId: values.hospitalId ?? '',
      email: values.email ?? '',
      address: values.address ?? '',
      emergencyContact: values.emergencyContact ?? '',
      emergencyPhone: values.emergencyPhone ?? '',
      drugAllergies: values.drugAllergies || 'None',
      medicalHistory: values.medicalHistory ?? '',
      currentMedications: '',
      systemicConditions: '',
      previousEyeConditions: '',
      previousEyeSurgeries: '',
      currentCorrection: '',
      familyEyeHistory: '',
      presentingComplaint: values.presentingComplaint ?? '',
      preferredAppointmentDate: '',
    });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    eyeNotify('success', 'Patient registered in this browser.');
    onDone();
    navigate(`/dashboard/eye/patients/${result.value.id}`);
  });
  const field = (name: keyof FormValues, label: string) => (
    <div><Label htmlFor={name}>{label}</Label><Input id={name} {...form.register(name)} />{form.formState.errors[name] && <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>}</div>
  );
  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3 rounded-xl border bg-card p-4 mb-4">
      {field('firstName', 'First name')}{field('lastName', 'Last name')}
      <div><Label>Sex</Label><select className={selectClass()} {...form.register('sex')}><option>Female</option><option>Male</option></select></div>
      {field('dateOfBirth', 'Date of birth')}{field('phone', 'Phone')}{field('email', 'Email')}{field('hospitalId', 'Hospital ID (optional)')}
      {field('emergencyContact', 'Emergency contact')}{field('emergencyPhone', 'Emergency phone')}
      <div className="md:col-span-3">{field('address', 'Address')}</div>
      <div className="md:col-span-3"><Label>Drug allergies</Label><Input {...form.register('drugAllergies')} /></div>
      <div className="md:col-span-3"><Label>Medical history</Label><Textarea {...form.register('medicalHistory')} /></div>
      <div className="md:col-span-3"><Label>Presenting visual complaint</Label><Textarea {...form.register('presentingComplaint')} /></div>
      <div className="md:col-span-3"><Button type="submit">Save registration</Button></div>
    </form>
  );
}

function EyeProfile({ id }: { id: string }) {
  const eye = useEye();
  const patient = eye.state.patients.find((p) => p.id === id);
  const [tab, setTab] = useState('Summary');
  if (!patient) return <EyeShell title="Patient"><p>Patient not found.</p></EyeShell>;
  const q = `?patient=${patient.id}`;
  const tabs = ['Summary', 'Acuity', 'Refraction', 'Examination', 'Diagnoses', 'Plans', 'Prescriptions', 'Investigations', 'Documents'];
  return (
    <EyeShell title={patientName(patient)}>
      <PageIntro title={patientName(patient)} description={`${patient.id}${patient.hospitalId ? ` · Hospital ${patient.hospitalId}` : ''} · ${patient.sex}, ${ageFromDob(patient.dateOfBirth)} years · ${patient.phone}`} />
      <DemoBanner />
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <Link className="underline" to={`/dashboard/eye/consultations${q}`}>Consultation</Link>
        <Link className="underline" to={`/dashboard/eye/acuity${q}`}>Acuity</Link>
        <Link className="underline" to={`/dashboard/eye/refraction${q}`}>Refraction</Link>
        <Link className="underline" to={`/dashboard/eye/examination${q}`}>Examination</Link>
        <Link className="underline" to={`/dashboard/eye/prescriptions${q}`}>Prescription</Link>
        <Link className="underline" to={`/dashboard/eye/spectacles${q}`}>Spectacles</Link>
        <Link className="underline" to={`/dashboard/eye/appointments${q}`}>Appointment</Link>
      </div>
      <div className="flex flex-wrap gap-1 mb-4">{tabs.map((name) => <Button key={name} size="sm" variant={tab === name ? 'default' : 'outline'} onClick={() => setTab(name)}>{name}</Button>)}</div>
      {tab === 'Summary' && <p className="text-sm">Allergies: {patient.drugAllergies}. Complaint: {patient.presentingComplaint || 'Not recorded'}. Primary diagnosis: {eye.primaryDx(patient.id) || 'None recorded'}.</p>}
      {tab === 'Acuity' && <SimpleList rows={eye.state.acuity.filter((a) => a.patientId === id).map((a) => `${a.date} · ${a.method} · ${a.status} · OD ${a.od.unaided || '—'}`)} empty="No acuity records." />}
      {tab === 'Refraction' && <SimpleList rows={eye.state.refractions.filter((r) => r.patientId === id).map((r) => `${r.date} · ${r.type} · ${r.status}`)} empty="No refraction records." />}
      {tab === 'Examination' && <SimpleList rows={eye.state.exams.filter((e) => e.patientId === id).map((e) => `${e.date} · ${e.status}`)} empty="No examinations." />}
      {tab === 'Diagnoses' && <SimpleList rows={eye.state.diagnoses.filter((d) => d.patientId === id).map((d) => `${d.name} · ${d.eye} · ${d.certainty}`)} empty="No diagnoses." />}
      {tab === 'Plans' && <SimpleList rows={eye.state.plans.filter((p) => p.patientId === id).map((p) => `${p.title} · ${p.items.length} items`)} empty="No plans." />}
      {tab === 'Prescriptions' && <SimpleList rows={eye.state.prescriptions.filter((p) => p.patientId === id).map((p) => `${p.date} · ${p.items.map((i) => i.name).join(', ')}`)} empty="No prescriptions." />}
      {tab === 'Investigations' && <SimpleList rows={eye.state.investigations.filter((i) => i.patientId === id).map((i) => `${i.name} · ${i.status}`)} empty="No investigations." />}
      {tab === 'Documents' && <SimpleList rows={eye.state.documents.filter((d) => d.patientId === id).map((d) => `${d.date} · ${d.name}`)} empty="No documents." />}
    </EyeShell>
  );
}

function SimpleList({ rows, empty }: { rows: string[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="text-sm space-y-1">{rows.map((row) => <li key={row} className="border rounded-md px-3 py-2">{row}</li>)}</ul>;
}
