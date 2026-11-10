import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, Eye, Glasses, ClipboardList,
  ScanEye, History, Activity, Pill, Microscope, Send, Repeat, BookOpen, Contact,
  Clock, DoorOpen, Wrench, Package, BarChart3, FileText, Search, Syringe,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useEye } from '@/contexts/EyeStore';
import { notify } from '@/lib/notify';
import { patientName, type EyePatient } from '@/data/eyeData';

export function eyeNotify(kind: 'success' | 'error', message: string) {
  notify[kind]('eye-clinic', message);
}

const base = '/dashboard/eye';

export const eyeNav = [
  { label: 'Eye Clinic Dashboard', path: base, icon: <LayoutDashboard className="h-4 w-4" />, group: 'Overview' },
  { label: 'Eye Patients', path: `${base}/patients`, icon: <Users className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Appointments', path: `${base}/appointments`, icon: <CalendarDays className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Eye Consultations', path: `${base}/consultations`, icon: <Stethoscope className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Visual Acuity', path: `${base}/acuity`, icon: <Eye className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Refraction', path: `${base}/refraction`, icon: <Glasses className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Eye Examination', path: `${base}/examination`, icon: <ScanEye className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Ophthalmic History', path: `${base}/history`, icon: <History className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Diagnoses', path: `${base}/diagnoses`, icon: <Activity className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Treatment Plans', path: `${base}/plans`, icon: <ClipboardList className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Procedures', path: `${base}/procedures`, icon: <Syringe className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Prescriptions', path: `${base}/prescriptions`, icon: <Pill className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Investigations', path: `${base}/investigations`, icon: <Microscope className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Referrals', path: `${base}/referrals`, icon: <Send className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Follow-ups', path: `${base}/follow-ups`, icon: <Repeat className="h-4 w-4" />, group: 'Patient care' },
  { label: 'Spectacle Prescription', path: `${base}/spectacles`, icon: <Glasses className="h-4 w-4" />, group: 'Clinical services' },
  { label: 'Contact Lenses', path: `${base}/contact-lenses`, icon: <Contact className="h-4 w-4" />, group: 'Clinical services' },
  { label: 'Minor Procedures', path: `${base}/procedures?kind=minor`, icon: <Syringe className="h-4 w-4" />, group: 'Clinical services' },
  { label: 'Theatre Cases', path: `${base}/procedures?kind=theatre`, icon: <Activity className="h-4 w-4" />, group: 'Clinical services' },
  { label: 'Patient Education', path: `${base}/education`, icon: <BookOpen className="h-4 w-4" />, group: 'Clinical services' },
  { label: 'Eye Clinic Schedule', path: `${base}/schedule`, icon: <Clock className="h-4 w-4" />, group: 'Operations' },
  { label: 'Examination Rooms', path: `${base}/rooms`, icon: <DoorOpen className="h-4 w-4" />, group: 'Operations' },
  { label: 'Equipment Register', path: `${base}/equipment`, icon: <Wrench className="h-4 w-4" />, group: 'Operations' },
  { label: 'Ophthalmic Inventory', path: `${base}/inventory`, icon: <Package className="h-4 w-4" />, group: 'Operations' },
  { label: 'Clinical Reports', path: `${base}/reports/clinical`, icon: <BarChart3 className="h-4 w-4" />, group: 'Reports' },
  { label: 'Operational Reports', path: `${base}/reports/operational`, icon: <FileText className="h-4 w-4" />, group: 'Reports' },
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
  Scheduled: 'blue', 'Checked In': 'purple', Waiting: 'amber', 'In Consultation': 'purple', Completed: 'green',
  Cancelled: 'red', 'No Show': 'red', Available: 'green', 'In Use': 'purple', Cleaning: 'amber', Closed: 'slate',
  Draft: 'slate', Saved: 'blue', Final: 'green', Issued: 'green', Proposed: 'slate', 'Awaiting Consent': 'amber',
  Approved: 'blue', 'In Progress': 'purple', Deferred: 'amber', Requested: 'amber', Sent: 'blue', Accepted: 'green',
  'Appointment Scheduled': 'blue', Upcoming: 'blue', Overdue: 'red', Active: 'green', Inactive: 'slate',
  Confirmed: 'green', Suspected: 'amber', Resolved: 'slate', 'In stock': 'green', 'Low stock': 'amber',
  'Out of stock': 'red', 'Expiring soon': 'amber', Expired: 'red', 'Maintenance due': 'amber', Unavailable: 'red',
  'In use': 'purple', Recorded: 'blue', Open: 'blue',
};

export function EyeStatus({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${tone[STATUS_TONE[status] ?? 'slate']}`}>{status}</span>;
}

export function EyeBadge({ side }: { side: string }) {
  const cls = side === 'OD' ? 'bg-sky-100 text-sky-900 border-sky-200' : side === 'OS' ? 'bg-teal-100 text-teal-900 border-teal-200' : 'bg-slate-100 text-slate-700 border-slate-200';
  const label = side === 'OD' ? 'OD · Right' : side === 'OS' ? 'OS · Left' : side === 'OU' ? 'OU · Both' : side;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{label}</span>;
}

export function DemoBanner({ text = 'Demonstration data only. Records stay in this browser and are not saved to a hospital server or a diagnostic device.' }: { text?: string }) {
  return <p className="text-xs text-muted-foreground bg-muted/60 border rounded-lg px-3 py-2 mb-4">{text}</p>;
}

export function PageIntro({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Eye Clinic / {title}</p>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">{label}</td></tr>;
}

function PatientSearchSlot() {
  const { state } = useEye();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return state.patients.filter((p) => `${patientName(p)} ${p.id} ${p.phone} ${p.hospitalId}`.toLowerCase().includes(query)).slice(0, 6);
  }, [q, state.patients]);
  const go = (p: EyePatient) => { setOpen(false); setQ(''); navigate(`/dashboard/eye/patients/${p.id}`); };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (matches[0]) go(matches[0]);
    else navigate(`/dashboard/eye/patients?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search eye patient, ID, or phone…" className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-card" aria-label="Search eye clinic patients" />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-lg border bg-card shadow-md overflow-hidden">
          {matches.map((p) => (
            <li key={p.id}><button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => go(p)}><span className="font-medium">{patientName(p)}</span><span className="text-muted-foreground"> · {p.id}</span></button></li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function EyeShell({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const { today, stats } = useEye();
  return (
    <DashboardLayout navItems={eyeNav} title={`Eye Clinic · ${title}`} searchSlot={<PatientSearchSlot />}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-muted-foreground">
        <div><span className="font-semibold text-foreground">Eye Clinic</span><span> · {user?.name ?? 'Clinician'}</span><span> · {user?.department ?? 'Ophthalmology'}</span></div>
        <div>{today} · {stats.todayAppointments} appointments today</div>
      </div>
      {children}
    </DashboardLayout>
  );
}

export function PatientPicker({ value, onChange, id = 'patient' }: { value: string; onChange: (id: string) => void; id?: string }) {
  const { state } = useEye();
  return (
    <select id={id} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select patient</option>
      {state.patients.map((p) => <option key={p.id} value={p.id}>{patientName(p)} ({p.id})</option>)}
    </select>
  );
}

export function PatientLink({ id, name }: { id: string; name: string }) {
  return <Link className="text-primary font-medium hover:underline" to={`/dashboard/eye/patients/${id}`}>{name}</Link>;
}

export function selectClass() {
  return 'h-10 w-full rounded-md border bg-background px-2 text-sm';
}
