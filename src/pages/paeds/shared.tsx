import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, Baby, BedDouble, CalendarDays, ClipboardList, FileText, HeartPulse, LayoutDashboard,
  LineChart, Milk, Package, Pill, Scan, Search, Siren, Stethoscope, Syringe, Users, Wrench,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { usePaeds } from '@/contexts/PaedsStore';
import { notify } from '@/lib/notify';
import { ageGroup, formatAge, patientName, type PaedsPatient } from '@/data/paedsData';

const base = '/dashboard/paeds';

export function paedsNotify(kind: 'success' | 'error', message: string) {
  notify[kind]('paeds', message);
}

export const paedsNav = [
  { label: 'Paediatrics Dashboard', path: base, icon: <LayoutDashboard className="h-4 w-4" />, group: 'Overview' },
  { label: 'Paediatric Patients', path: `${base}/patients`, icon: <Users className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Appointments', path: `${base}/appointments`, icon: <CalendarDays className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Clinical Encounters', path: `${base}/encounters`, icon: <Stethoscope className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Triage and Assessment', path: `${base}/triage`, icon: <HeartPulse className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Vital Signs', path: `${base}/triage?view=vitals`, icon: <Activity className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Growth Monitoring', path: `${base}/growth`, icon: <LineChart className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Developmental Assessment', path: `${base}/development`, icon: <ClipboardList className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Diagnoses', path: `${base}/diagnoses`, icon: <Activity className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Treatment Plans', path: `${base}/plans`, icon: <ClipboardList className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Procedures', path: `${base}/procedures`, icon: <Syringe className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Prescriptions', path: `${base}/prescriptions`, icon: <Pill className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Investigations', path: `${base}/investigations`, icon: <Scan className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Referrals', path: `${base}/referrals`, icon: <FileText className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Follow-ups', path: `${base}/follow-ups`, icon: <CalendarDays className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Newborn Assessment', path: `${base}/newborn`, icon: <Baby className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Immunisation', path: `${base}/immunisation`, icon: <Syringe className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Nutrition Assessment', path: `${base}/nutrition`, icon: <Milk className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Child Health Records', path: `${base}/child-health`, icon: <FileText className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Admission and Discharge', path: `${base}/admissions`, icon: <BedDouble className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Emergency Assessment', path: `${base}/emergency`, icon: <Siren className="h-4 w-4" />, group: 'Specialised care' },
  { label: 'Ward and Beds', path: `${base}/wards`, icon: <BedDouble className="h-4 w-4" />, group: 'Operations' },
  { label: 'Nursing Observations', path: `${base}/observations`, icon: <HeartPulse className="h-4 w-4" />, group: 'Operations' },
  { label: 'Medication Administration', path: `${base}/prescriptions?view=administration`, icon: <Pill className="h-4 w-4" />, group: 'Operations' },
  { label: 'Paediatric Services', path: `${base}/services`, icon: <ClipboardList className="h-4 w-4" />, group: 'Operations' },
  { label: 'Equipment and Supplies', path: `${base}/equipment`, icon: <Wrench className="h-4 w-4" />, group: 'Operations' },
  { label: 'Clinical Reports', path: `${base}/reports/clinical`, icon: <LineChart className="h-4 w-4" />, group: 'Reports' },
  { label: 'Growth and Nutrition Reports', path: `${base}/reports/growth`, icon: <LineChart className="h-4 w-4" />, group: 'Reports' },
  { label: 'Immunisation Reports', path: `${base}/reports/immunisation`, icon: <Syringe className="h-4 w-4" />, group: 'Reports' },
  { label: 'Operational Reports', path: `${base}/reports/operational`, icon: <Package className="h-4 w-4" />, group: 'Reports' },
];

const tone: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  red: 'bg-rose-100 text-rose-800 border-rose-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  purple: 'bg-violet-100 text-violet-800 border-violet-200',
};
const STATUS_TONE: Record<string, string> = {
  Scheduled: 'blue', 'Checked In': 'purple', Waiting: 'amber', 'In Consultation': 'purple', Completed: 'green', Cancelled: 'red', 'No Show': 'red',
  Active: 'green', Inactive: 'slate', Draft: 'slate', Saved: 'blue', Finalised: 'green', Administered: 'green', Deferred: 'amber', Missed: 'red',
  Admitted: 'purple', 'Under Care': 'purple', 'Ready for Discharge': 'amber', Discharged: 'green', Occupied: 'purple', Available: 'green', Cleaning: 'amber',
  Suspected: 'amber', Confirmed: 'green', Resolved: 'slate', Requested: 'amber', 'In Progress': 'purple', Overdue: 'red', Upcoming: 'blue',
  'Low stock': 'amber', 'Out of stock': 'red', 'Maintenance due': 'amber', Expired: 'red', 'In stock': 'green',
  'Awaiting Assessment': 'amber', Newborn: 'blue', Infant: 'purple', Child: 'green', Adolescent: 'slate',
};

export function PaedsStatus({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${tone[STATUS_TONE[status] ?? 'slate']}`}>{status}</span>;
}

export function DemoBanner({ text = 'Demonstration data only. Records stay in this browser and are not a live clinical monitor or a hospital server.' }: { text?: string }) {
  return <p className="text-xs text-muted-foreground bg-muted/60 border rounded-lg px-3 py-2 mb-4">{text}</p>;
}

export function PageIntro({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Paediatrics / {title}</p>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function SearchSlot() {
  const { state, today } = usePaeds();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return state.patients.filter((p) => `${patientName(p)} ${p.id} ${p.guardian.phone} ${p.guardian.name}`.toLowerCase().includes(query)).slice(0, 6);
  }, [q, state.patients]);
  const go = (p: PaedsPatient) => { setOpen(false); setQ(''); navigate(`/dashboard/paeds/patients/${p.id}`); };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (matches[0]) go(matches[0]);
    else navigate(`/dashboard/paeds/patients?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search child, ID, or guardian phone…" className="pl-9 h-9 bg-muted/50 border-transparent" aria-label="Search paediatric patients" />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-lg border bg-card shadow-md overflow-hidden">
          {matches.map((p) => <li key={p.id}><button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => go(p)}>{patientName(p)} · {formatAge(p.dateOfBirth, today)}</button></li>)}
        </ul>
      )}
    </form>
  );
}

export function PaedsShell({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const { today, state } = usePaeds();
  const todayCount = state.appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length;
  return (
    <DashboardLayout navItems={paedsNav} title={`Paediatrics · ${title}`} searchSlot={<SearchSlot />}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-muted-foreground">
        <div><span className="font-semibold text-foreground">Paediatrics</span><span> · {user?.name ?? 'Clinician'}</span><span> · {user?.department ?? 'Paediatrics'}</span></div>
        <div>{today} · {todayCount} appointments today</div>
      </div>
      {children}
    </DashboardLayout>
  );
}

export function PatientPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { state, today } = usePaeds();
  return (
    <select id="patient" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Child">
      <option value="">Select child</option>
      {state.patients.map((p) => <option key={p.id} value={p.id}>{patientName(p)} · {formatAge(p.dateOfBirth, today)} ({p.id})</option>)}
    </select>
  );
}

export function PatientLink({ id, name }: { id: string; name: string }) {
  return <Link className="text-primary font-medium hover:underline" to={`/dashboard/paeds/patients/${id}`}>{name}</Link>;
}

export function AgeBadge({ dob }: { dob: string }) {
  const { today } = usePaeds();
  return <PaedsStatus status={ageGroup(dob, today)} />;
}

export function selectClass() {
  return 'h-10 w-full rounded-md border bg-background px-2 text-sm';
}
