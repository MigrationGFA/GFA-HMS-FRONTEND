import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { patientRecords } from '@/data/hmsData';
import { ageFromDob, isoDate, openPlanItems, patientName, type DentalPatient, type Sex } from '@/data/dentalData';
import { useDental } from '@/contexts/DentalStore';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro } from './shared';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['Male', 'Female']),
  phone: z.string().trim().min(7, 'Phone number is required'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  address: z.string().trim().min(1, 'Address is required'),
  hospitalId: z.string(),
  emergencyContact: z.string().trim().min(1, 'Emergency contact is required'),
  emergencyPhone: z.string().trim().min(7, 'Emergency phone is required'),
  medicalHistory: z.string(),
  drugAllergies: z.string().min(1, 'Record allergies or “None”'),
  currentMedications: z.string(),
  medicalConditions: z.string(),
  previousDentalHistory: z.string(),
  preferredAppointmentDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 'Female', phone: '', email: '', address: '',
  hospitalId: '', emergencyContact: '', emergencyPhone: '', medicalHistory: '', drugAllergies: 'None',
  currentMedications: '', medicalConditions: '', previousDentalHistory: '', preferredAppointmentDate: '',
};

export function DentalPatientList() {
  const { state, today, registerPatient } = useDental();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [visit, setVisit] = useState('all');
  const [sort, setSort] = useState<'name' | 'last' | 'id'>('name');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const cutoff = isoDate(-180);
    return state.patients
      .filter((p) => status === 'all' || p.status === status)
      .filter((p) => {
        if (visit === 'never') return !p.lastVisit;
        if (visit === 'recent') return Boolean(p.lastVisit) && p.lastVisit >= cutoff;
        if (visit === 'older') return Boolean(p.lastVisit) && p.lastVisit < cutoff;
        return true;
      })
      .filter((p) => {
        if (!query) return true;
        return `${patientName(p)} ${p.id} ${p.phone} ${p.hospitalId}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sort === 'id') return a.id.localeCompare(b.id);
        if (sort === 'last') return (b.lastVisit || '').localeCompare(a.lastVisit || '');
        return patientName(a).localeCompare(patientName(b));
      });
  }, [state.patients, q, status, visit, sort]);

  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const outstanding = (id: string) => state.plans.filter((p) => p.patientId === id).reduce((sum, plan) => sum + openPlanItems(plan).length, 0);

  const linkExisting = (hospitalId: string) => {
    const found = patientRecords.find((p) => p.hospitalId === hospitalId);
    if (!found) return;
    const [firstName, ...rest] = found.name.split(' ');
    form.setValue('hospitalId', found.hospitalId);
    form.setValue('firstName', firstName);
    form.setValue('lastName', rest.join(' '));
    form.setValue('phone', found.phone);
    form.setValue('address', found.address);
    form.setValue('sex', found.gender);
    form.setValue('drugAllergies', found.allergies);
    form.setValue('dateOfBirth', isoDate(-found.age * 365));
  };

  const onSubmit = form.handleSubmit((values) => {
    const result = registerPatient({ ...values, sex: values.sex as Sex, status: 'Active' });
    if (!result.ok) {
      notify.error('dental-patient', result.message);
      return;
    }
    notify.success('dental-patient', `${patientName(result.value)} added to the dental demo register.`);
    setOpen(false);
    form.reset(emptyForm);
    navigate(`/dashboard/dental/patients/${result.value.id}`);
  });

  return (
    <DentalShell title="Patients">
      <PageIntro
        title="Dental patients"
        description="Directory of patients linked to this dental clinic. New registrations stay in the demonstration dataset."
        actions={<Button onClick={() => setOpen(true)}>Register dental patient</Button>}
      />
      <DemoBanner />
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); setParams(e.target.value ? { q: e.target.value } : {}); }} placeholder="Name, patient ID, or phone" className="max-w-xs" />
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Patient status">
          <option value="all">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={visit} onChange={(e) => { setVisit(e.target.value); setPage(1); }} aria-label="Last visit">
          <option value="all">Any last visit</option>
          <option value="recent">Visited in 6 months</option>
          <option value="older">Last visit older than 6 months</option>
          <option value="never">No visit recorded</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'last' | 'id')} aria-label="Sort">
          <option value="name">Sort by name</option>
          <option value="last">Sort by last visit</option>
          <option value="id">Sort by patient ID</option>
        </select>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age / sex</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead>Next appointment</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && <EmptyRow colSpan={9} label="No patients match this search." />}
            {visible.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell className="font-medium">{patientName(p)}</TableCell>
                <TableCell>{ageFromDob(p.dateOfBirth, today)} / {p.sex}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.lastVisit || '—'}</TableCell>
                <TableCell>{p.nextAppointment || '—'}</TableCell>
                <TableCell>{outstanding(p.id)}</TableCell>
                <TableCell><DentalStatus status={p.status} /></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/dental/patients/${p.id}`)}>Open profile</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-muted-foreground">{rows.length} patients</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
          <span className="py-1">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>Next</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register dental patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Link an existing HMS patient</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" onChange={(e) => linkExisting(e.target.value)} defaultValue="">
                <option value="">Not already registered</option>
                {patientRecords.map((p) => <option key={p.hospitalId} value={p.hospitalId}>{p.name} · {p.hospitalId}</option>)}
              </select>
            </div>
            <Field label="First name" error={form.formState.errors.firstName?.message} required><Input {...form.register('firstName')} /></Field>
            <Field label="Last name" error={form.formState.errors.lastName?.message} required><Input {...form.register('lastName')} /></Field>
            <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message} required><Input type="date" {...form.register('dateOfBirth')} /></Field>
            <Field label="Sex" error={form.formState.errors.sex?.message} required>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" {...form.register('sex')}>
                <option>Female</option>
                <option>Male</option>
              </select>
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message} required><Input {...form.register('phone')} /></Field>
            <Field label="Email" error={form.formState.errors.email?.message}><Input {...form.register('email')} /></Field>
            <Field label="Address" error={form.formState.errors.address?.message} required className="sm:col-span-2"><Input {...form.register('address')} /></Field>
            <Field label="Existing HMS identifier" error={form.formState.errors.hospitalId?.message}><Input {...form.register('hospitalId')} /></Field>
            <Field label="Preferred appointment date"><Input type="date" {...form.register('preferredAppointmentDate')} /></Field>
            <Field label="Emergency contact" error={form.formState.errors.emergencyContact?.message} required><Input {...form.register('emergencyContact')} /></Field>
            <Field label="Emergency phone" error={form.formState.errors.emergencyPhone?.message} required><Input {...form.register('emergencyPhone')} /></Field>
            <Field label="Drug allergies" error={form.formState.errors.drugAllergies?.message} required className="sm:col-span-2"><Input {...form.register('drugAllergies')} /></Field>
            <Field label="Medical history" className="sm:col-span-2"><Textarea {...form.register('medicalHistory')} /></Field>
            <Field label="Current medications" className="sm:col-span-2"><Textarea {...form.register('currentMedications')} /></Field>
            <Field label="Medical conditions" className="sm:col-span-2"><Textarea {...form.register('medicalConditions')} /></Field>
            <Field label="Previous dental history" className="sm:col-span-2"><Textarea {...form.register('previousDentalHistory')} /></Field>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save patient</Button>
            </DialogFooter>
          </form>
          <p className="text-xs text-muted-foreground">The next patient ID is generated from the demo sequence. This does not create a hospital master record.</p>
        </DialogContent>
      </Dialog>
    </DentalShell>
  );
}

function Field({ label, error, required, children, className = '' }: { label: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export type { DentalPatient };
