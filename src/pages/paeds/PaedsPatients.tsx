import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePaeds } from '@/contexts/PaedsStore';
import { ageGroup, formatAge, patientName, type BirthHistory, type Guardian } from '@/data/paedsData';
import { AgeBadge, DemoBanner, PaedsShell, PaedsStatus, PageIntro, paedsNotify, selectClass } from './shared';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  sex: z.enum(['Female', 'Male']),
  address: z.string().optional(),
  hospitalId: z.string().optional(),
  guardianName: z.string().min(1, 'Required'),
  relationship: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Enter a phone number'),
  altPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  emergencyContact: z.string().optional(),
  allergies: z.string().optional(),
  placeOfBirth: z.string().optional(),
  gestationalAgeWeeks: z.string().optional(),
  birthWeightKg: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function PaedsPatients() {
  const { id } = useParams();
  return id ? <Profile id={id} /> : <List />;
}

function List() {
  const paeds = usePaeds();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [group, setGroup] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = paeds.state.patients.filter((p) => {
      if (status !== 'All' && p.status !== status) return false;
      if (group !== 'All' && ageGroup(p.dateOfBirth, paeds.today) !== group) return false;
      const blob = `${patientName(p)} ${p.id} ${p.guardian.name} ${p.guardian.phone}`.toLowerCase();
      return !query || blob.includes(query);
    });
    filtered.sort((a, b) => sort === 'age' ? a.dateOfBirth.localeCompare(b.dateOfBirth) : patientName(a).localeCompare(patientName(b)));
    return filtered;
  }, [paeds.state.patients, paeds.today, q, group, status, sort]);
  const slice = rows.slice((page - 1) * 8, page * 8);
  return (
    <PaedsShell title="Patients">
      <PageIntro title="Paediatric Patients" description="Search by the child’s name, ID, or guardian phone. Birth history is optional." actions={<Button onClick={() => setOpen((v) => !v)}>{open ? 'Close form' : 'Register child'}</Button>} />
      <DemoBanner />
      {open && <Register onDone={() => setOpen(false)} />}
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, ID, or guardian phone" className="max-w-xs" />
        <select className={selectClass() + ' max-w-[140px]'} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Age group"><option>All</option><option>Newborn</option><option>Infant</option><option>Child</option><option>Adolescent</option></select>
        <select className={selectClass() + ' max-w-[140px]'} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option>All</option><option>Active</option><option>Inactive</option></select>
        <select className={selectClass() + ' max-w-[140px]'} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="name">Name</option><option value="age">Youngest first</option></select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Child', 'Born', 'Age', 'Sex', 'Guardian', 'Phone', 'Last visit', 'Next', 'Status'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {slice.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2"><Link className="text-primary font-medium hover:underline" to={`/dashboard/paeds/patients/${p.id}`}>{patientName(p)}</Link><div className="text-xs text-muted-foreground">{p.id}</div></td>
                <td className="p-2">{p.dateOfBirth}</td>
                <td className="p-2"><AgeBadge dob={p.dateOfBirth} /> {formatAge(p.dateOfBirth, paeds.today)}</td>
                <td className="p-2">{p.sex}</td>
                <td className="p-2">{p.guardian.name}</td>
                <td className="p-2">{p.guardian.phone}</td>
                <td className="p-2">{p.lastVisit || '—'}</td>
                <td className="p-2">{p.nextAppointment || '—'}</td>
                <td className="p-2"><PaedsStatus status={p.status} /></td>
              </tr>
            ))}
            {slice.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No children match this search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 8 >= rows.length} onClick={() => setPage((n) => n + 1)}>Next</Button><span className="text-sm self-center text-muted-foreground">{rows.length} children</span></div>
    </PaedsShell>
  );
}

function Register({ onDone }: { onDone: () => void }) {
  const paeds = usePaeds();
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { sex: 'Female', allergies: 'None' } });
  const onSubmit = form.handleSubmit((values) => {
    const guardian: Guardian = { name: values.guardianName, relationship: values.relationship, phone: values.phone, altPhone: values.altPhone ?? '', address: values.guardianAddress ?? '', emergencyContact: values.emergencyContact ?? '' };
    const birth: BirthHistory = { placeOfBirth: values.placeOfBirth ?? '', birthDateTime: '', gestationalAgeWeeks: values.gestationalAgeWeeks ?? '', birthWeightKg: values.birthWeightKg ?? '', birthLengthCm: '', complications: '', neonatalHistory: '' };
    const result = paeds.registerPatient({
      firstName: values.firstName, middleName: values.middleName ?? '', lastName: values.lastName, dateOfBirth: values.dateOfBirth, sex: values.sex,
      address: values.address ?? '', hospitalId: values.hospitalId ?? '', guardian, birth, previousIllnesses: '', allergies: values.allergies || 'None',
      currentMedications: '', chronicConditions: '', hospitalisations: '', surgeries: '', familyHistory: '', feedingHistory: '', immunisationNote: '',
    });
    if (!result.ok) { paedsNotify('error', result.message); return; }
    paedsNotify('success', 'Child registered in this browser.');
    onDone();
    navigate(`/dashboard/paeds/patients/${result.value.id}`);
  });
  const field = (name: keyof FormValues, label: string) => <div><Label htmlFor={name}>{label}</Label><Input id={name} {...form.register(name)} />{form.formState.errors[name] && <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>}</div>;
  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3 rounded-xl border bg-card p-4 mb-4">
      <h3 className="md:col-span-3 font-semibold">Child</h3>
      {field('firstName', 'First name')}{field('middleName', 'Middle name')}{field('lastName', 'Last name')}
      {field('dateOfBirth', 'Date of birth')}
      <div><Label>Sex</Label><select className={selectClass()} {...form.register('sex')}><option>Female</option><option>Male</option></select></div>
      {field('hospitalId', 'Hospital ID (optional)')}{field('address', 'Address')}
      <h3 className="md:col-span-3 font-semibold">Parent or guardian</h3>
      {field('guardianName', 'Full name')}{field('relationship', 'Relationship')}{field('phone', 'Phone')}
      {field('altPhone', 'Alternative phone')}{field('guardianAddress', 'Address if different')}{field('emergencyContact', 'Emergency contact')}
      <h3 className="md:col-span-3 font-semibold">Birth history, if known</h3>
      {field('placeOfBirth', 'Place of birth')}{field('gestationalAgeWeeks', 'Gestational age (weeks)')}{field('birthWeightKg', 'Birth weight (kg)')}
      <div className="md:col-span-3"><Label>Allergies</Label><Textarea {...form.register('allergies')} /></div>
      <div className="md:col-span-3 flex gap-2"><Button type="submit">Save registration</Button><Button type="button" variant="outline" onClick={onDone}>Cancel</Button></div>
    </form>
  );
}

function Profile({ id }: { id: string }) {
  const paeds = usePaeds();
  const child = paeds.state.patients.find((p) => p.id === id);
  const [tab, setTab] = useState('Overview');
  if (!child) return <PaedsShell title="Patient"><p>Child not found.</p></PaedsShell>;
  const q = `?patient=${child.id}`;
  const tabs = ['Overview', 'Demographics', 'Guardian', 'History', 'Birth', 'Allergies', 'Vitals', 'Growth', 'Development', 'Immunisation', 'Encounters', 'Diagnoses', 'Prescriptions', 'Investigations', 'Admissions', 'Observations', 'Procedures', 'Referrals', 'Appointments', 'Follow-ups', 'Documents', 'Billing'];
  const weight = [...paeds.state.growth, ...paeds.state.vitals].filter((row) => row.patientId === id && row.weightKg).sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <PaedsShell title={patientName(child)}>
      <PageIntro title={patientName(child)} description={`${child.id} · ${formatAge(child.dateOfBirth, paeds.today)} · Guardian ${child.guardian.name} ${child.guardian.phone}`} />
      <DemoBanner text="Children’s details stay in this browser. Do not treat this profile as a shared hospital record." />
      <div className="flex flex-wrap gap-2 mb-3 text-sm">
        <AgeBadge dob={child.dateOfBirth} />
        <span>Allergies: {child.allergies || 'Not recorded'}</span>
        <span>Weight: {weight ? `${weight.weightKg} kg on ${weight.date}` : 'No weight recorded'}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[['Consultation', `/dashboard/paeds/encounters${q}`], ['Vitals', `/dashboard/paeds/triage${q}`], ['Growth', `/dashboard/paeds/growth${q}`], ['Development', `/dashboard/paeds/development${q}`], ['Immunisation', `/dashboard/paeds/immunisation${q}`], ['Prescribe', `/dashboard/paeds/prescriptions${q}`], ['Investigation', `/dashboard/paeds/investigations${q}`], ['Admit', `/dashboard/paeds/admissions${q}`], ['Follow-up', `/dashboard/paeds/follow-ups${q}`]].map(([label, to]) => <Link key={label} className="underline" to={to}>{label}</Link>)}
      </div>
      <div className="flex flex-wrap gap-1 mb-4">{tabs.map((name) => <Button key={name} size="sm" variant={tab === name ? 'default' : 'outline'} onClick={() => setTab(name)}>{name}</Button>)}</div>
      {tab === 'Overview' && <p className="text-sm">Medications: {child.currentMedications || 'None recorded'}. Latest growth {weight ? `${weight.weightKg} kg` : 'not recorded'}. Immunisation note: {child.immunisationNote || 'None'}.</p>}
      {tab === 'Demographics' && <p className="text-sm">{patientName(child)}, {child.sex}, born {child.dateOfBirth}. {child.address}. Hospital ID {child.hospitalId || 'not linked'}.</p>}
      {tab === 'Guardian' && <p className="text-sm">{child.guardian.name}, {child.guardian.relationship}. {child.guardian.phone}. Emergency: {child.guardian.emergencyContact || '—'}</p>}
      {tab === 'History' && <p className="text-sm">Illnesses: {child.previousIllnesses}. Chronic: {child.chronicConditions}. Family: {child.familyHistory}. Feeding: {child.feedingHistory}.</p>}
      {tab === 'Birth' && <p className="text-sm">{child.birth.placeOfBirth || 'Place not recorded'}. Gestation {child.birth.gestationalAgeWeeks || '—'} weeks. Birth weight {child.birth.birthWeightKg || '—'} kg. {child.birth.neonatalHistory}</p>}
      {tab === 'Allergies' && <p className="text-sm">Allergies: {child.allergies}. Current medicines: {child.currentMedications || 'None recorded'}.</p>}
      {tab === 'Vitals' && <Lines rows={paeds.state.vitals.filter((v) => v.patientId === id).map((v) => `${v.date} ${v.time} · ${v.temperatureC || '—'} °C · HR ${v.heartRate || '—'}`)} empty="No observations." />}
      {tab === 'Growth' && <Lines rows={paeds.state.growth.filter((g) => g.patientId === id).map((g) => `${g.date} · ${g.weightKg || '—'} kg · length ${g.lengthCm || '—'} cm`)} empty="No growth measurements." />}
      {tab === 'Development' && <Lines rows={paeds.state.development.filter((d) => d.patientId === id).map((d) => `${d.date} · ${d.type}`)} empty="No assessments." />}
      {tab === 'Immunisation' && <Lines rows={paeds.state.immunisations.filter((i) => i.patientId === id).map((i) => `${i.vaccine} dose ${i.dose} · ${i.status}`)} empty="No immunisation rows." />}
      {tab === 'Encounters' && <Lines rows={paeds.state.encounters.filter((e) => e.patientId === id).map((e) => `${e.date} · ${e.complaint || 'No complaint'}`)} empty="No encounters." />}
      {tab === 'Diagnoses' && <Lines rows={paeds.state.diagnoses.filter((d) => d.patientId === id).map((d) => `${d.name} · ${d.status}`)} empty="No diagnoses." />}
      {tab === 'Prescriptions' && <Lines rows={paeds.state.prescriptions.filter((p) => p.patientId === id).map((p) => `${p.date} · ${p.items.map((i) => i.name).join(', ')}`)} empty="No prescriptions." />}
      {tab === 'Investigations' && <Lines rows={paeds.state.investigations.filter((i) => i.patientId === id).map((i) => `${i.test} · ${i.status}`)} empty="No investigations." />}
      {tab === 'Admissions' && <Lines rows={paeds.state.admissions.filter((a) => a.patientId === id).map((a) => `${a.number} · ${a.status}`)} empty="No admissions." />}
      {tab === 'Observations' && <Lines rows={paeds.state.observations.filter((o) => o.patientId === id).map((o) => `${o.date} ${o.time} · ${o.temperatureC || '—'} °C`)} empty="No nursing observations." />}
      {tab === 'Procedures' && <Lines rows={paeds.state.procedures.filter((p) => p.patientId === id).map((p) => `${p.date} · ${p.name}`)} empty="No procedures." />}
      {tab === 'Referrals' && <Lines rows={paeds.state.referrals.filter((r) => r.patientId === id).map((r) => `${r.destination} · ${r.status}`)} empty="No referrals." />}
      {tab === 'Appointments' && <Lines rows={paeds.state.appointments.filter((a) => a.patientId === id).map((a) => `${a.date} ${a.startTime} · ${a.type}`)} empty="No appointments." />}
      {tab === 'Follow-ups' && <Lines rows={paeds.state.followUps.filter((f) => f.patientId === id).map((f) => `${f.dueDate} · ${f.reason}`)} empty="No follow-ups." />}
      {tab === 'Documents' && <Lines rows={paeds.state.documents.filter((d) => d.patientId === id).map((d) => `${d.date} · ${d.name}`)} empty="No documents." />}
      {tab === 'Billing' && <p className="text-sm">Illustrative service prices are not posted to the cashier and are not revenue.</p>}
    </PaedsShell>
  );
}

function Lines({ rows, empty }: { rows: string[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ul className="text-sm space-y-1">{rows.map((row) => <li key={row} className="border rounded-md px-3 py-2">{row}</li>)}</ul>;
}
