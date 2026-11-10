import { useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { recordsNav } from '@/pages/recordsNav';
import RecordsStaffChat from '@/components/records/RecordsStaffChat';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  listArrivals,
  routeArrival,
  isRecordsApiEnabled,
  type ArrivalRow as ApiArrivalRow,
  type ArrivalsSummary,
} from '@/lib/api/records';
import { ApiError } from '@/lib/api/client';
import {
  isReferralsApiEnabled,
  listReferrals,
  type ApiReferral,
} from '@/lib/api/referrals';
import {
  Activity, Users, UserPlus, ClipboardList, ClipboardCheck, FileCheck, FileText,
  History, TrendingUp, RefreshCw, LayoutDashboard, AlertTriangle, Printer, Eye,
  Search, Download, Upload, Send, Calendar, Phone, Edit, CheckCircle2, XCircle,
  Flag, Building2, Stethoscope, Clock, ArrowRight, Trash2, Archive, FolderOpen,
  CalendarIcon, Siren,
} from 'lucide-react';

const ARRIVAL_BRIDGE_KEY = 'gfa_records_arrivals_bridge_v1';
const pushArrivalBridge = (row: any) => {
  try {
    const arr = JSON.parse(localStorage.getItem(ARRIVAL_BRIDGE_KEY) || '[]');
    arr.unshift(row);
    localStorage.setItem(ARRIVAL_BRIDGE_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch { /* noop */ }
};
const readArrivalBridge = () => {
  try { return JSON.parse(localStorage.getItem(ARRIVAL_BRIDGE_KEY) || '[]'); } catch { return []; }
};

// ---------- shared shell ----------
function Shell({ title, description, breadcrumb, children }: { title: string; description?: string; breadcrumb: string; children: ReactNode }) {
  return (
    <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Records Department / <span className="font-medium text-foreground">{breadcrumb}</span></p>
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {children}
      </div>
      <RecordsStaffChat />
    </DashboardLayout>
  );
}

function logAudit(scope: string, action: string) {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[${scope}] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function ConfirmModal({ open, onOpenChange, title, message, onConfirm, requireReason = false, danger = false }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; message: string;
  onConfirm: (reason?: string) => void; requireReason?: boolean; danger?: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(''); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        {requireReason && (
          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-600">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason..." />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={danger ? 'destructive' : 'default'} onClick={() => {
            if (requireReason && !reason.trim()) { toast.error('Reason is required'); return; }
            onConfirm(reason); onOpenChange(false); setReason('');
          }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportBtn({ name }: { name: string }) {
  return (
    <Select onValueChange={(v) => { toast.success(`${name} exported as ${v}`); logAudit(name, `Export as ${v}`); }}>
      <SelectTrigger className="w-[120px]"><Download className="h-4 w-4 mr-1.5" /><SelectValue placeholder="Export" /></SelectTrigger>
      <SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="Excel">Excel</SelectItem><SelectItem value="CSV">CSV</SelectItem></SelectContent>
    </Select>
  );
}

function SearchableSelect({ options, value, onChange, placeholder }: {
  options: { value: string; label: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
          {selected ? selected.label : (placeholder ?? 'Select…')}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder?.toLowerCase() ?? 'options'}…`} />
          <CommandList>
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.value} value={`${o.label} ${o.sub ?? ''}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <div>
                    <div className="text-sm">{o.label}</div>
                    {o.sub && <div className="text-xs text-muted-foreground">{o.sub}</div>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const RETRIEVAL_DEPARTMENTS = [
  'Records', 'Nursing', 'Pharmacy', 'Laboratory', 'Radiology',
  'Accounts', 'NHIA/HMO', 'Doctor/Consultation', 'Ward',
];

const RETRIEVAL_OFFICERS = [
  { value: 'Adebola Oduwole', label: 'Adebola Oduwole', sub: 'Records Officer — Records' },
  { value: 'Tunde Akinyemi', label: 'Tunde Akinyemi', sub: 'Records Supervisor — Records' },
  { value: 'Blessing Okonkwo', label: 'Blessing Okonkwo', sub: 'Staff Nurse — Nursing' },
  { value: 'Adaeze Nwankwo', label: 'Adaeze Nwankwo', sub: 'Senior Nurse — Nursing' },
  { value: 'Pharm. Tunde Ibrahim', label: 'Pharm. Tunde Ibrahim', sub: 'Chief Pharmacist — Pharmacy' },
  { value: 'Mr. Emeka Obi', label: 'Mr. Emeka Obi', sub: 'Lab Scientist — Laboratory' },
  { value: 'Mr. Segun Adeyemi', label: 'Mr. Segun Adeyemi', sub: 'Radiographer — Radiology' },
  { value: 'Mrs. Ngozi Okafor', label: 'Mrs. Ngozi Okafor', sub: 'Accounts Officer — Accounts' },
  { value: 'Mr. Ibrahim Musa', label: 'Mr. Ibrahim Musa', sub: 'HMO Desk Officer — NHIA/HMO' },
  { value: 'Dr. Okafor Bello', label: 'Dr. Okafor Bello', sub: 'Consultant Psychiatrist — Doctor/Consultation' },
  { value: 'Dr. Funmi Adewale', label: 'Dr. Funmi Adewale', sub: 'Medical Officer — Doctor/Consultation' },
  { value: 'N. Bisi Adeyemi', label: 'N. Bisi Adeyemi', sub: 'Ward Nurse — Ward' },
];

function emptyState(cols: number, label: string) {
  return <tr><td colSpan={cols} className="px-3 py-10 text-center text-muted-foreground text-sm">{label}</td></tr>;
}

// ============================================================
// 1. APPOINTMENT CHECK-IN
// ============================================================
type ArrivalStatus = 'Arrived' | 'Waiting' | 'Late' | 'No-Show' | 'Cancelled' | 'Rescheduled';
interface AppointmentRow {
  apptNo: string; hospitalId: string; name: string; phone: string; age: number; gender: 'Male' | 'Female';
  clinic: string; doctor: string; apptDate: string; apptTime: string;
  bookingType: 'Walk-In' | 'Online' | 'Phone' | 'Referral';
  status: ArrivalStatus; payment: 'Paid' | 'Pending' | 'NHIA' | 'HMO';
  reason: string; notes?: string; lastVisit?: string;
}

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

const APPT_SEED: AppointmentRow[] = [
  { apptNo: 'APT-2401', hospitalId: 'GFA HMS/2026/00132', name: 'Adaeze Nwosu', phone: '08031122334', age: 34, gender: 'Female', clinic: 'General OPD', doctor: 'Dr. Bello', apptDate: today, apptTime: '08:30', bookingType: 'Online', status: 'Arrived', payment: 'Paid', reason: 'Follow-up review', notes: 'Stable on current medication', lastVisit: '2026-03-12' },
  { apptNo: 'APT-2402', hospitalId: 'GFA HMS/2026/00133', name: 'Tunde Adebayo', phone: '08012345678', age: 41, gender: 'Male', clinic: 'Psychiatry', doctor: 'Dr. Yusuf', apptDate: today, apptTime: '09:00', bookingType: 'Phone', status: 'Waiting', payment: 'NHIA', reason: 'Anxiety management review' },
  { apptNo: 'APT-2403', hospitalId: 'GFA HMS/2026/00134', name: 'Ngozi Okonkwo', phone: '08023456712', age: 56, gender: 'Female', clinic: 'Neurology', doctor: 'Dr. Mensah', apptDate: today, apptTime: '09:30', bookingType: 'Walk-In', status: 'Late', payment: 'HMO', reason: 'Migraine evaluation' },
  { apptNo: 'APT-2404', hospitalId: 'GFA HMS/2026/00135', name: 'Sani Yakubu', phone: '08107654300', age: 62, gender: 'Male', clinic: 'General OPD', doctor: 'Dr. Bello', apptDate: today, apptTime: '10:00', bookingType: 'Online', status: 'No-Show', payment: 'Pending', reason: 'Hypertension review' },
  { apptNo: 'APT-2405', hospitalId: 'GFA HMS/2026/00136', name: 'Fatimah Bello', phone: '08033221199', age: 12, gender: 'Female', clinic: 'Child & Adolescent', doctor: 'Dr. Ojo', apptDate: today, apptTime: '10:30', bookingType: 'Referral', status: 'Cancelled', payment: 'HMO', reason: 'Behavioural assessment', notes: 'Patient cancelled via phone' },
  { apptNo: 'APT-2406', hospitalId: 'GFA HMS/2026/00137', name: 'Bisi Olamide', phone: '08056677889', age: 71, gender: 'Female', clinic: 'Geriatric', doctor: 'Dr. Adeyemi', apptDate: today, apptTime: '11:00', bookingType: 'Online', status: 'Waiting', payment: 'Paid', reason: 'Memory assessment' },
  { apptNo: 'APT-2407', hospitalId: 'GFA HMS/2026/00138', name: 'Ibrahim Musa', phone: '08099887766', age: 29, gender: 'Male', clinic: 'Addiction Clinic', doctor: 'Dr. Yusuf', apptDate: tomorrow, apptTime: '11:30', bookingType: 'Walk-In', status: 'Arrived', payment: 'NHIA', reason: 'Substance use review' },
];

const CLINIC_OPTIONS = ['General OPD', 'Psychiatry', 'Neurology', 'Geriatric', 'Child & Adolescent', 'Addiction Clinic', 'Emergency'];
const DOCTOR_OPTIONS = ['Dr. Bello', 'Dr. Yusuf', 'Dr. Mensah', 'Dr. Ojo', 'Dr. Adeyemi', 'Dr. Okafor'];

export const AppointmentCheckIn = () => {
  const [rows, setRows] = useState<AppointmentRow[]>(APPT_SEED);
  const [tab, setTab] = useState<'today' | 'upcoming' | 'arrived' | 'late' | 'noshow' | 'cancelled'>('today');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<AppointmentRow | null>(null);
  const [reschedule, setReschedule] = useState<AppointmentRow | null>(null);
  const [confirmCheckIn, setConfirmCheckIn] = useState<AppointmentRow | null>(null);
  const [emergencyRoute, setEmergencyRoute] = useState<AppointmentRow | null>(null);
  const [printSlip, setPrintSlip] = useState<AppointmentRow | null>(null);

  // reschedule form
  const [rDate, setRDate] = useState<Date | undefined>();
  const [rTime, setRTime] = useState('');
  const [rClinic, setRClinic] = useState('');
  const [rDoctor, setRDoctor] = useState('');
  const [rReason, setRReason] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');

  const openReschedule = (r: AppointmentRow) => {
    setReschedule(r);
    setRDate(new Date(r.apptDate));
    setRTime(r.apptTime);
    setRClinic(r.clinic);
    setRDoctor(r.doctor);
    setRReason('');
  };

  const cards = useMemo(() => ({
    total: rows.length,
    arrived: rows.filter(r => r.status === 'Arrived').length,
    waiting: rows.filter(r => r.status === 'Waiting').length,
    late: rows.filter(r => r.status === 'Late').length,
    noshow: rows.filter(r => r.status === 'No-Show').length,
    cancelled: rows.filter(r => r.status === 'Cancelled').length,
  }), [rows]);

  const filtered = rows.filter(r => {
    if (tab === 'today' && r.apptDate !== today) return false;
    if (tab === 'upcoming' && (r.apptDate <= today || r.status === 'Cancelled' || r.status === 'No-Show')) return false;
    if (tab === 'arrived' && r.status !== 'Arrived') return false;
    if (tab === 'late' && r.status !== 'Late') return false;
    if (tab === 'noshow' && r.status !== 'No-Show') return false;
    if (tab === 'cancelled' && r.status !== 'Cancelled') return false;
    if (search && !`${r.name} ${r.hospitalId} ${r.apptNo} ${r.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateRow = (apptNo: string, patch: Partial<AppointmentRow>) => {
    setRows(rs => rs.map(r => r.apptNo === apptNo ? { ...r, ...patch } : r));
  };

  const handleSaveReschedule = () => {
    if (!reschedule) return;
    if (!rDate) { toast.error('New appointment date is required'); return; }
    if (!rTime) { toast.error('New appointment time is required'); return; }
    if (!rReason.trim()) { toast.error('Reason for rescheduling is required'); return; }
    const newDate = format(rDate, 'yyyy-MM-dd');
    updateRow(reschedule.apptNo, {
      apptDate: newDate, apptTime: rTime, clinic: rClinic, doctor: rDoctor,
      status: newDate > today ? 'Rescheduled' : 'Waiting',
      notes: `Rescheduled: ${rReason}`,
    });
    toast.success('Appointment rescheduled successfully');
    logAudit('AppointmentCheckIn', `Rescheduled ${reschedule.apptNo} → ${newDate} ${rTime} (${rReason})`);
    setReschedule(null);
  };

  const handleCheckIn = (r: AppointmentRow) => {
    updateRow(r.apptNo, { status: 'Arrived' });
    pushArrivalBridge({
      arrivalNo: `ARR-${Date.now().toString().slice(-4)}`,
      hospitalId: r.hospitalId, name: r.name, type: 'Appointment',
      clinic: r.clinic, arrival: format(new Date(), 'HH:mm'),
      visit: 'Follow-up', routing: 'Awaiting Triage', payment: r.payment,
    });
    toast.success('Patient checked in successfully');
    logAudit('AppointmentCheckIn', `Checked in ${r.apptNo} (${r.name})`);
    setConfirmCheckIn(null);
    setDetail({ ...r, status: 'Arrived' });
  };

  const handleRouteTriage = (r: AppointmentRow) => {
    if (r.status !== 'Arrived') { toast.error('Patient must be checked-in/arrived first'); return; }
    pushArrivalBridge({
      arrivalNo: `ARR-${Date.now().toString().slice(-4)}`,
      hospitalId: r.hospitalId, name: r.name, type: 'Appointment',
      clinic: r.clinic, arrival: format(new Date(), 'HH:mm'),
      visit: 'Follow-up', routing: 'Awaiting Triage', payment: r.payment,
    });
    toast.success('Patient routed to triage');
    logAudit('AppointmentCheckIn', `Routed to Triage ${r.apptNo}`);
  };

  const handleRouteConsult = (r: AppointmentRow) => {
    if (r.status !== 'Arrived') { toast.error('Patient must be checked-in/arrived first'); return; }
    pushArrivalBridge({
      arrivalNo: `ARR-${Date.now().toString().slice(-4)}`,
      hospitalId: r.hospitalId, name: r.name, type: 'Appointment',
      clinic: r.clinic, arrival: format(new Date(), 'HH:mm'),
      visit: 'Follow-up', routing: 'Awaiting Consultation', payment: r.payment,
    });
    toast.success('Patient routed to consultation');
    logAudit('AppointmentCheckIn', `Routed to Consultation ${r.apptNo}`);
  };

  const handleRouteEmergency = () => {
    if (!emergencyRoute) return;
    if (!emergencyReason.trim()) { toast.error('Emergency reason is required'); return; }
    updateRow(emergencyRoute.apptNo, { status: 'Arrived', notes: `Emergency routed: ${emergencyReason}` });
    pushArrivalBridge({
      arrivalNo: `ARR-${Date.now().toString().slice(-4)}`,
      hospitalId: emergencyRoute.hospitalId, name: emergencyRoute.name, type: 'Emergency',
      clinic: 'Emergency', arrival: format(new Date(), 'HH:mm'),
      visit: 'Emergency', routing: 'Emergency', payment: emergencyRoute.payment,
    });
    toast.success('Patient routed to emergency');
    logAudit('AppointmentCheckIn', `Routed to Emergency ${emergencyRoute.apptNo}: ${emergencyReason}`);
    setEmergencyRoute(null);
    setEmergencyReason('');
  };

  return (
    <Shell title="Appointment Check-In" description="Confirm arrival of patients with booked appointments and route them to the next step." breadcrumb="Appointment Check-In">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Today's Appointments" value={String(cards.total)} icon={Calendar} tone="blue" />
        <SummaryCard title="Arrived" value={String(cards.arrived)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Waiting" value={String(cards.waiting)} icon={Clock} tone="indigo" />
        <SummaryCard title="Late Arrivals" value={String(cards.late)} icon={AlertTriangle} tone="amber" />
        <SummaryCard title="No-Shows" value={String(cards.noshow)} icon={XCircle} tone="rose" />
        <SummaryCard title="Cancelled" value={String(cards.cancelled)} icon={Trash2} tone="purple" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search appointment, name, hospital no, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ExportBtn name="Appointments" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="arrived">Arrived</TabsTrigger>
            <TabsTrigger value="late">Late</TabsTrigger>
            <TabsTrigger value="noshow">No-Show</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Appt No','Hospital No','Patient','Phone','Clinic','Doctor','Date','Time','Arrival','Payment','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? emptyState(11, 'No appointments found') : filtered.map(r => (
                    <tr key={r.apptNo} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.apptNo}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2">{r.phone}</td>
                      <td className="px-3 py-2">{r.clinic}</td>
                      <td className="px-3 py-2">{r.doctor}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.apptDate}</td>
                      <td className="px-3 py-2">{r.apptTime}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2"><StatusBadge status={r.payment} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View / Check-In" onClick={() => { setDetail(r); logAudit('AppointmentCheckIn', `View ${r.apptNo}`); }}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Reschedule" onClick={() => openReschedule(r)}><Calendar className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Print Slip" onClick={() => setPrintSlip(r)}><Printer className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Appointment Details — {detail?.apptNo}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Patient</div>
                  <div className="font-semibold text-base">{detail.name}</div>
                  <div className="font-mono text-xs">{detail.hospitalId}</div>
                  <div>Phone: {detail.phone}</div>
                  <div>Age: {detail.age} • Gender: {detail.gender}</div>
                </div>
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Appointment</div>
                  <div>Appointment No: <span className="font-mono">{detail.apptNo}</span></div>
                  <div>Clinic: {detail.clinic}</div>
                  <div>Doctor: {detail.doctor}</div>
                  <div>Date: {detail.apptDate} • Time: {detail.apptTime}</div>
                  <div>Booking: {detail.bookingType}</div>
                  <div className="flex gap-2 pt-1">
                    <StatusBadge status={detail.status} />
                    <StatusBadge status={detail.payment} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1.5 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Reason for Visit</div>
                  <p>{detail.reason}</p>
                </div>
                {detail.notes && (
                  <div className="md:col-span-2 space-y-1.5 p-3 bg-muted/30 rounded-lg">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Appointment Notes</div>
                    <p>{detail.notes}</p>
                  </div>
                )}
                <div className="md:col-span-2 space-y-1.5 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Last Visit Summary</div>
                  <p className="text-muted-foreground">{detail.lastVisit ? `Last seen on ${detail.lastVisit} — stable, continued treatment plan` : 'No previous visits on record'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {detail.status !== 'Arrived' && detail.status !== 'Cancelled' && (
                  <Button onClick={() => setConfirmCheckIn(detail)} className="gap-1.5"><CheckCircle2 className="h-4 w-4" />Check In Patient</Button>
                )}
                <Button variant="outline" onClick={() => handleRouteTriage(detail)} className="gap-1.5"><Activity className="h-4 w-4" />Route to Triage</Button>
                <Button variant="outline" onClick={() => handleRouteConsult(detail)} className="gap-1.5"><Stethoscope className="h-4 w-4" />Route to Consultation</Button>
                <Button variant="destructive" onClick={() => { setEmergencyRoute(detail); setDetail(null); }} className="gap-1.5"><Siren className="h-4 w-4" />Route to Emergency</Button>
                <Button variant="outline" onClick={() => setPrintSlip(detail)} className="gap-1.5"><Printer className="h-4 w-4" />Print Slip</Button>
                <Button variant="ghost" onClick={() => setDetail(null)} className="ml-auto">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check In Confirm */}
      <Dialog open={!!confirmCheckIn} onOpenChange={(v) => !v && setConfirmCheckIn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Patient Check-In</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Confirm arrival of <b>{confirmCheckIn?.name}</b>? They will be moved to the Patient Check-In / Arrival queue.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCheckIn(null)}>Cancel</Button>
            <Button onClick={() => confirmCheckIn && handleCheckIn(confirmCheckIn)}>Confirm Check-In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Route */}
      <Dialog open={!!emergencyRoute} onOpenChange={(v) => { if (!v) { setEmergencyRoute(null); setEmergencyReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Route to Emergency</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Routing <b>{emergencyRoute?.name}</b> to the Emergency unit.</p>
          <div className="space-y-1.5">
            <Label>Emergency Reason <span className="text-red-600">*</span></Label>
            <Textarea value={emergencyReason} onChange={(e) => setEmergencyReason(e.target.value)} placeholder="Describe the emergency presentation..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmergencyRoute(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRouteEmergency}>Route to Emergency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Slip Preview */}
      <Dialog open={!!printSlip} onOpenChange={(v) => !v && setPrintSlip(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Appointment Slip Preview</DialogTitle></DialogHeader>
          {printSlip && (
            <div className="border rounded-lg p-4 text-sm space-y-1.5 bg-white">
              <div className="text-center border-b pb-2 mb-2">
                <div className="font-bold">GFA HMS — GFA Demo Hospital</div>
                <div className="text-xs text-muted-foreground">Appointment Slip</div>
              </div>
              <div><b>Appointment No:</b> {printSlip.apptNo}</div>
              <div><b>Patient:</b> {printSlip.name} ({printSlip.hospitalId})</div>
              <div><b>Date / Time:</b> {printSlip.apptDate} at {printSlip.apptTime}</div>
              <div><b>Clinic:</b> {printSlip.clinic}</div>
              <div><b>Doctor:</b> {printSlip.doctor}</div>
              <div><b>Reason:</b> {printSlip.reason}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintSlip(null)}>Close</Button>
            <Button onClick={() => { if (printSlip) { window.print(); toast.success(`Slip printed for ${printSlip.apptNo}`); logAudit('AppointmentCheckIn', `Print slip ${printSlip.apptNo}`); setPrintSlip(null); } }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={!!reschedule} onOpenChange={(v) => !v && setReschedule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
          {reschedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-medium">{reschedule.name}</div></div>
                <div><div className="text-xs text-muted-foreground">Hospital No</div><div className="font-mono text-xs">{reschedule.hospitalId}</div></div>
                <div><div className="text-xs text-muted-foreground">Current Date</div><div>{reschedule.apptDate}</div></div>
                <div><div className="text-xs text-muted-foreground">Current Time</div><div>{reschedule.apptTime}</div></div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Appointment Date <span className="text-red-600">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !rDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rDate ? format(rDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={rDate} onSelect={setRDate} initialFocus captionLayout="dropdown-buttons" fromYear={2024} toYear={2030} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>New Appointment Time <span className="text-red-600">*</span></Label>
                  <Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Clinic / Department</Label>
                  <Select value={rClinic} onValueChange={setRClinic}>
                    <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
                    <SelectContent>{CLINIC_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Doctor / Consultant</Label>
                  <Select value={rDoctor} onValueChange={setRDoctor}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>{DOCTOR_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Reason for Rescheduling <span className="text-red-600">*</span></Label>
                <Textarea value={rReason} onChange={(e) => setRReason(e.target.value)} placeholder="Provide a clear reason..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedule(null)}>Cancel</Button>
            <Button onClick={handleSaveReschedule}>Save Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};


// ============================================================
// 2. PATIENT ARRIVAL / CHECK-IN
// ============================================================
type RoutingStatus = 'Awaiting Triage' | 'In Triage' | 'Awaiting Consultation' | 'In Consultation' | 'Emergency' | 'Checked Out';
interface ArrivalRow {
  arrivalNo: string; hospitalId: string; name: string; type: 'Walk-In' | 'Appointment' | 'Referral' | 'Emergency' | string;
  clinic: string; arrival: string; visit: 'New' | 'Follow-up' | 'Emergency' | string; routing: RoutingStatus | string;
  payment: 'Paid' | 'Pending' | 'NHIA' | 'HMO' | string; lastVisit?: string | null;
  personId?: number; triageId?: number | null;
}

const routingTone = (r: RoutingStatus) =>
  r === 'Checked Out' ? 'success' : r === 'Emergency' ? 'danger' : r.startsWith('In ') ? 'info' : 'warning';

function mapApiArrival(row: ApiArrivalRow): ArrivalRow {
  return {
    arrivalNo: row.arrivalNo,
    hospitalId: row.hospitalId,
    name: row.name,
    type: row.type,
    clinic: row.clinic,
    arrival: row.arrival,
    visit: row.visit,
    routing: row.routing,
    payment: row.payment,
    lastVisit: row.lastVisit,
    personId: row.personId,
    triageId: row.triageId,
  };
}

const emptyArrivalSummary = (): ArrivalsSummary => ({
  total: 0,
  walkIn: 0,
  appointment: 0,
  referral: 0,
  emergency: 0,
  awaitingTriage: 0,
  awaitingConsultation: 0,
  checkedOut: 0,
});

export const PatientArrival = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ArrivalRow[]>([]);
  const [summary, setSummary] = useState<ArrivalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'walkin' | 'appointment' | 'referral' | 'emergency' | 'checkedout'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ArrivalRow | null>(null);
  const [action, setAction] = useState<{ row: ArrivalRow; type: 'triage' | 'consult' | 'emergency' | 'checkout' } | null>(null);
  const [openClinicalReferrals, setOpenClinicalReferrals] = useState<ApiReferral[]>([]);
  const [clinicalRefLoading, setClinicalRefLoading] = useState(false);

  const tabFilters = useMemo(() => {
    if (tab === 'walkin') return { type: 'Walk-In' };
    if (tab === 'appointment') return { type: 'Appointment' };
    if (tab === 'referral') return { type: 'Referral' };
    if (tab === 'emergency') return { type: 'Emergency' };
    if (tab === 'checkedout') return { routing: 'Checked Out' };
    return {};
  }, [tab]);

  const loadArrivals = useCallback(async () => {
    if (!isRecordsApiEnabled()) {
      setRows([]);
      setSummary(emptyArrivalSummary());
      setTotal(0);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const result = await listArrivals({
        q: search.trim() || undefined,
        ...tabFilters,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setRows(result.items.map(mapApiArrival));
      setSummary(result.summary);
      setTotal(result.meta?.total ?? result.items.length);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load arrivals');
      setRows([]);
      setSummary(emptyArrivalSummary());
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, tabFilters, page]);

  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadArrivals(), 300);
    return () => window.clearTimeout(t);
  }, [loadArrivals]);

  useEffect(() => {
    if (!isReferralsApiEnabled()) {
      setOpenClinicalReferrals([]);
      return;
    }
    let cancelled = false;
    setClinicalRefLoading(true);
    listReferrals({ status: 'Submitted,UnderReview,AwaitingBed', limit: 100 })
      .then((data) => {
        if (!cancelled) setOpenClinicalReferrals(data.items);
      })
      .catch(() => {
        if (!cancelled) setOpenClinicalReferrals([]);
      })
      .finally(() => {
        if (!cancelled) setClinicalRefLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clinicalByPerson = useMemo(() => {
    const map = new Map<number, ApiReferral[]>();
    for (const r of openClinicalReferrals) {
      const list = map.get(r.personId) ?? [];
      list.push(r);
      map.set(r.personId, list);
    }
    return map;
  }, [openClinicalReferrals]);

  const cards = summary
    ? {
        total: summary.total,
        walkin: summary.walkIn,
        appt: summary.appointment,
        referral: summary.referral,
        triage: summary.awaitingTriage,
        consult: summary.awaitingConsultation,
      }
    : {
        total: rows.length,
        walkin: rows.filter((r) => r.type === 'Walk-In').length,
        appt: rows.filter((r) => r.type === 'Appointment').length,
        referral: rows.filter((r) => r.type === 'Referral').length,
        triage: rows.filter((r) => r.routing === 'Awaiting Triage').length,
        consult: rows.filter((r) => r.routing === 'Awaiting Consultation').length,
      };

  const filtered = rows;

  const applyAction = async () => {
    if (!action) return;
    const map: Record<string, RoutingStatus> = {
      triage: 'Awaiting Triage',
      consult: 'Awaiting Consultation',
      emergency: 'Emergency',
      checkout: 'Checked Out',
    };
    const newStatus = map[action.type];

    if (!isRecordsApiEnabled()) {
      toast.error('Backend API is not configured');
      return;
    }
    if (action.row.personId == null) {
      toast.error('Missing patient id for this arrival');
      return;
    }
    setRoutingBusy(true);
    try {
      await routeArrival({
        personId: action.row.personId,
        triageId: action.row.triageId,
        action: action.type,
        clinic: action.row.clinic,
      });
      toast.success(`${action.row.name} → ${newStatus}`);
      logAudit('PatientArrival', `${newStatus} ${action.row.arrivalNo}`);
      setAction(null);
      await loadArrivals();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update arrival routing');
    } finally {
      setRoutingBusy(false);
    }
  };

  return (
    <Shell title="Patient Check-In / Arrival" description="Confirm actual patient arrival and route to triage, consultation, emergency, or admission." breadcrumb="Patient Check-In / Arrival">
      {isReferralsApiEnabled() && openClinicalReferrals.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            <span className="font-medium">{openClinicalReferrals.length}</span> open clinical referral
            {openClinicalReferrals.length === 1 ? '' : 's'} awaiting Records action
            {clinicalRefLoading ? ' (refreshing…)' : ''}.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate('/records/referrals')}>
            <Send className="h-4 w-4 mr-1.5" /> Open referrals queue
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Arrivals Today" value={loading && !summary ? '…' : String(cards.total)} icon={Users} tone="blue" />
        <SummaryCard title="Walk-In" value={loading && !summary ? '…' : String(cards.walkin)} icon={UserPlus} tone="teal" />
        <SummaryCard title="Appointment" value={loading && !summary ? '…' : String(cards.appt)} icon={Calendar} tone="indigo" />
        <SummaryCard title="Referral" value={loading && !summary ? '…' : String(cards.referral)} icon={Send} tone="purple" />
        <SummaryCard title="Awaiting Triage" value={loading && !summary ? '…' : String(cards.triage)} icon={Activity} tone="amber" />
        <SummaryCard title="Awaiting Consult" value={loading && !summary ? '…' : String(cards.consult)} icon={Stethoscope} tone="green" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search arrival, patient, hospital no" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" disabled={loading || routingBusy} onClick={() => void loadArrivals()}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <ExportBtn name="Arrivals" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All Arrivals</TabsTrigger>
            <TabsTrigger value="walkin">Walk-In</TabsTrigger>
            <TabsTrigger value="appointment">Appointment</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="checkedout">Checked Out</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Arrival No','Hospital No','Patient','Type','Clinic','Time','Visit','Routing','Payment','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? emptyState(10, 'Loading arrivals…') : filtered.length === 0 ? emptyState(10, 'No arrivals') : filtered.map(r => (
                    <tr key={`${r.arrivalNo}-${r.personId ?? ''}`} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.arrivalNo}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.type} /></td>
                      <td className="px-3 py-2">{r.clinic}</td>
                      <td className="px-3 py-2">{r.arrival}</td>
                      <td className="px-3 py-2">{r.visit}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.routing} /></td>
                      <td className="px-3 py-2"><StatusBadge status={r.payment} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => { setDetail(r); logAudit('PatientArrival', `View ${r.arrivalNo}`); }}><Eye className="h-4 w-4" /></Button>
                          {r.personId != null && clinicalByPerson.has(r.personId) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Open clinical referral"
                              onClick={() => {
                                const first = clinicalByPerson.get(r.personId!)?.[0];
                                navigate(first ? `/records/referrals?id=${first.referralId}` : '/records/referrals');
                              }}
                            >
                              <Send className="h-4 w-4 text-sky-700" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Route to Triage" disabled={routingBusy || r.routing === 'Checked Out'} onClick={() => setAction({ row: r, type: 'triage' })}><Activity className="h-4 w-4 text-amber-600" /></Button>
                          <Button size="icon" variant="ghost" title="Route to Consultation" disabled={routingBusy || r.routing === 'Checked Out'} onClick={() => setAction({ row: r, type: 'consult' })}><Stethoscope className="h-4 w-4 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" title="Route to Emergency" disabled={routingBusy || r.routing === 'Checked Out'} onClick={() => setAction({ row: r, type: 'emergency' })}><AlertTriangle className="h-4 w-4 text-rose-600" /></Button>
                          <Button size="icon" variant="ghost" title="Check Out" disabled={routingBusy || r.routing === 'Checked Out'} onClick={() => setAction({ row: r, type: 'checkout' })}><CheckCircle2 className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Print Arrival Slip" onClick={() => { toast.success(`Arrival slip printed for ${r.arrivalNo}`); logAudit('PatientArrival', `Print ${r.arrivalNo}`); }}><Printer className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <RecordsListPagination
              page={page}
              pageSize={RECORDS_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              loading={loading}
              label="arrivals"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Arrival Details — {detail?.arrivalNo}</DialogTitle></DialogHeader>
          {detail && (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Patient</div><div className="font-bold">{detail.name}</div><div className="font-mono text-xs">{detail.hospitalId}</div></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Visit</div><div>Type: {detail.type}</div><div>Visit: {detail.visit}</div></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Payment</div><StatusBadge status={detail.payment} /></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Assigned Clinic</div><div>{detail.clinic}</div></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Current Queue</div><StatusBadge status={detail.routing} /></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Last Visit</div><div>{detail.lastVisit || 'First visit'}</div></div>
              <div className="md:col-span-2"><div className="text-xs font-semibold uppercase text-muted-foreground">Routing History</div>
                <ul className="text-xs space-y-0.5 mt-1"><li>{detail.arrival} — Arrived at reception</li><li>{detail.arrival} — Routed to {detail.routing}</li></ul></div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setDetail(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!action} onOpenChange={(v) => !v && !routingBusy && setAction(null)}
        title={`Confirm: ${action?.type === 'triage' ? 'Route to Triage' : action?.type === 'consult' ? 'Route to Consultation' : action?.type === 'emergency' ? 'Route to Emergency' : 'Check Out'}`}
        message={routingBusy ? `Updating ${action?.row.name}…` : `Patient ${action?.row.name} (${action?.row.arrivalNo}) will be updated.`}
        onConfirm={() => void applyAction()} danger={action?.type === 'emergency'} />
    </Shell>
  );
};

// ============================================================
// 3. DUPLICATE PATIENT MANAGEMENT
// ============================================================
interface PatientRecord {
  hospitalId: string; name: string; dob: string; phone: string; nin: string;
  gender: string; address: string; nextOfKin: string; lastVisit: string;
}
interface DuplicateMatch {
  matchId: string; primary: PatientRecord; duplicate: PatientRecord;
  phoneMatch: boolean; ninMatch: boolean; score: number;
  status: 'Possible' | 'High Confidence' | 'Medium Confidence' | 'Merged' | 'Rejected' | 'Pending Review';
}

const DUP_SEED: DuplicateMatch[] = [
  { matchId: 'MTC-001', primary: { hospitalId: 'GFA HMS/2026/00145', name: 'John Doe', dob: '1984-05-12', phone: '08012345678', nin: '12345678901', gender: 'M', address: 'Abeokuta', nextOfKin: 'Mary Doe', lastVisit: '2026-04-21' },
    duplicate: { hospitalId: 'GFA HMS/2024/00088', name: 'John D. Doe', dob: '1984-05-12', phone: '08012345678', nin: '12345678901', gender: 'M', address: 'Abeokuta South', nextOfKin: 'Mary Doe', lastVisit: '2024-09-10' },
    phoneMatch: true, ninMatch: true, score: 96, status: 'High Confidence' },
  { matchId: 'MTC-002', primary: { hospitalId: 'GFA HMS/2026/00150', name: 'Mariam Lawal', dob: '1990-02-04', phone: '08099887766', nin: '22334455667', gender: 'F', address: 'Ibadan', nextOfKin: 'Aisha Lawal', lastVisit: '2026-04-15' },
    duplicate: { hospitalId: 'GFA HMS/2023/00012', name: 'Maryam Lawal', dob: '1990-02-04', phone: '08099887766', nin: '22334455667', gender: 'F', address: 'Ibadan', nextOfKin: 'Aisha Lawal', lastVisit: '2023-11-02' },
    phoneMatch: true, ninMatch: true, score: 92, status: 'High Confidence' },
  { matchId: 'MTC-003', primary: { hospitalId: 'GFA HMS/2026/00132', name: 'Adaeze Nwosu', dob: '1995-07-21', phone: '08031122334', nin: '33445566778', gender: 'F', address: 'Lagos', nextOfKin: 'Chioma Nwosu', lastVisit: '2026-04-28' },
    duplicate: { hospitalId: 'GFA HMS/2025/00099', name: 'Adaeze N.', dob: '1995-07-21', phone: '08031122335', nin: '33445566778', gender: 'F', address: 'Lagos Mainland', nextOfKin: 'Chioma N.', lastVisit: '2025-08-14' },
    phoneMatch: false, ninMatch: true, score: 78, status: 'Medium Confidence' },
  { matchId: 'MTC-004', primary: { hospitalId: 'GFA HMS/2026/00148', name: 'Halima Sule', dob: '1988-11-30', phone: '08023456789', nin: '44556677889', gender: 'F', address: 'Kano', nextOfKin: 'Bilkisu Sule', lastVisit: '2026-04-19' },
    duplicate: { hospitalId: 'GFA HMS/2024/00066', name: 'Halima S.', dob: '1988-11-30', phone: '08023456710', nin: '44556677880', gender: 'F', address: 'Kano', nextOfKin: 'Bilkisu Sule', lastVisit: '2024-12-01' },
    phoneMatch: false, ninMatch: false, score: 65, status: 'Possible' },
  { matchId: 'MTC-005', primary: { hospitalId: 'GFA HMS/2026/00151', name: 'Emeka Obi', dob: '1980-03-15', phone: '08055667788', nin: '55667788990', gender: 'M', address: 'Enugu', nextOfKin: 'Ada Obi', lastVisit: '2026-04-29' },
    duplicate: { hospitalId: 'GFA HMS/2025/00111', name: 'Emeka Obii', dob: '1980-03-15', phone: '08055667788', nin: '55667788990', gender: 'M', address: 'Enugu', nextOfKin: 'Ada Obi', lastVisit: '2025-06-20' },
    phoneMatch: true, ninMatch: true, score: 94, status: 'Merged' },
  { matchId: 'MTC-006', primary: { hospitalId: 'GFA HMS/2026/00137', name: 'Ibrahim Musa', dob: '1975-08-08', phone: '08099887766', nin: '66778899001', gender: 'M', address: 'Kaduna', nextOfKin: 'Yusuf Musa', lastVisit: '2026-04-28' },
    duplicate: { hospitalId: 'GFA HMS/2022/00033', name: 'Ibrahim M.', dob: '1975-08-09', phone: '08077665544', nin: '66778899002', gender: 'M', address: 'Kaduna North', nextOfKin: 'Yusuf M.', lastVisit: '2022-05-10' },
    phoneMatch: false, ninMatch: false, score: 58, status: 'Rejected' },
];

export const DuplicatePatientManagement = () => {
  const [rows, setRows] = useState<DuplicateMatch[]>(DUP_SEED);
  const [tab, setTab] = useState<'possible' | 'high' | 'medium' | 'merged' | 'rejected'>('possible');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<DuplicateMatch | null>(null);
  const [merge, setMerge] = useState<DuplicateMatch | null>(null);
  const [mergeReason, setMergeReason] = useState('');
  const [supervisor, setSupervisor] = useState(false);
  const [reject, setReject] = useState<DuplicateMatch | null>(null);
  const [flag, setFlag] = useState<DuplicateMatch | null>(null);

  const cards = {
    possible: rows.filter(r => r.status === 'Possible' || r.status === 'High Confidence' || r.status === 'Medium Confidence').length,
    high: rows.filter(r => r.status === 'High Confidence').length,
    medium: rows.filter(r => r.status === 'Medium Confidence').length,
    pending: rows.filter(r => r.status === 'Pending Review').length,
    mergedToday: rows.filter(r => r.status === 'Merged').length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
  };

  const filtered = rows.filter(r => {
    if (tab === 'possible' && !['Possible', 'High Confidence', 'Medium Confidence', 'Pending Review'].includes(r.status)) return false;
    if (tab === 'high' && r.status !== 'High Confidence') return false;
    if (tab === 'medium' && r.status !== 'Medium Confidence') return false;
    if (tab === 'merged' && r.status !== 'Merged') return false;
    if (tab === 'rejected' && r.status !== 'Rejected') return false;
    if (search && !`${r.matchId} ${r.primary.name} ${r.duplicate.name} ${r.primary.hospitalId}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doMerge = () => {
    if (!merge) return;
    if (!supervisor) { toast.error('Supervisor approval required'); return; }
    if (!mergeReason.trim()) { toast.error('Merge reason required'); return; }
    setRows(rs => rs.map(r => r.matchId === merge.matchId ? { ...r, status: 'Merged' } : r));
    toast.success(`Records merged — kept ${merge.primary.hospitalId}, alias ${merge.duplicate.hospitalId}`);
    logAudit('Duplicates', `Merge ${merge.matchId} reason="${mergeReason}"`);
    setMerge(null); setMergeReason(''); setSupervisor(false);
  };

  return (
    <Shell title="Duplicate Patient Management" description="Detect and safely merge duplicate patient records." breadcrumb="Duplicate Patient Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Possible Duplicates" value={String(cards.possible)} icon={Flag} tone="amber" />
        <SummaryCard title="High Confidence" value={String(cards.high)} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Medium Confidence" value={String(cards.medium)} icon={Flag} tone="indigo" />
        <SummaryCard title="Pending Review" value={String(cards.pending)} icon={Clock} tone="blue" />
        <SummaryCard title="Merged Today" value={String(cards.mergedToday)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Rejected" value={String(cards.rejected)} icon={XCircle} tone="indigo" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search match id, name, hospital no" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ExportBtn name="Duplicates" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="possible">Possible Matches</TabsTrigger>
            <TabsTrigger value="high">High Confidence</TabsTrigger>
            <TabsTrigger value="medium">Medium Confidence</TabsTrigger>
            <TabsTrigger value="merged">Merged Records</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Match ID','Primary No','Duplicate No','Patient','DOB','Phone','NIN','Score','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? emptyState(10, 'No matches found') : filtered.map(r => (
                    <tr key={r.matchId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.matchId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.primary.hospitalId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.duplicate.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.primary.name}</td>
                      <td className="px-3 py-2">{r.primary.dob}</td>
                      <td className="px-3 py-2">{r.phoneMatch ? <span className="text-green-600">✓</span> : <span className="text-rose-600">✗</span>}</td>
                      <td className="px-3 py-2">{r.ninMatch ? <span className="text-green-600">✓</span> : <span className="text-rose-600">✗</span>}</td>
                      <td className="px-3 py-2"><span className={`font-bold ${r.score >= 90 ? 'text-rose-600' : r.score >= 75 ? 'text-amber-600' : 'text-muted-foreground'}`}>{r.score}%</span></td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View Match" onClick={() => { setView(r); logAudit('Duplicates', `View ${r.matchId}`); }}><Eye className="h-4 w-4" /></Button>
                          {r.status !== 'Merged' && r.status !== 'Rejected' && (
                            <>
                              <Button size="icon" variant="ghost" title="Merge" onClick={() => setMerge(r)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                              <Button size="icon" variant="ghost" title="Reject" onClick={() => setReject(r)}><XCircle className="h-4 w-4 text-rose-600" /></Button>
                              <Button size="icon" variant="ghost" title="Flag for Supervisor" onClick={() => setFlag(r)}><Flag className="h-4 w-4 text-amber-600" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Side-by-Side Match Comparison — {view?.matchId}</DialogTitle></DialogHeader>
          {view && (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {[['Primary Record', view.primary], ['Duplicate Record', view.duplicate]].map(([label, rec]: any) => (
                <div key={label} className="border rounded-lg p-3 space-y-1 bg-muted/30">
                  <div className="text-xs font-bold uppercase text-primary">{label}</div>
                  <div><b>Hospital No:</b> <span className="font-mono">{rec.hospitalId}</span></div>
                  <div><b>Name:</b> {rec.name}</div>
                  <div><b>DOB:</b> {rec.dob}</div>
                  <div><b>Phone:</b> {rec.phone}</div>
                  <div><b>NIN:</b> {rec.nin}</div>
                  <div><b>Gender:</b> {rec.gender}</div>
                  <div><b>Address:</b> {rec.address}</div>
                  <div><b>Next of Kin:</b> {rec.nextOfKin}</div>
                  <div><b>Last Visit:</b> {rec.lastVisit}</div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!merge} onOpenChange={(v) => !v && setMerge(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Merge — {merge?.matchId}</DialogTitle></DialogHeader>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-200">
            <b>⚠ Warning:</b> Merging records is permanent and must be approved by a supervisor. The primary hospital number will be kept; the old number is stored as an alias.
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={supervisor} onChange={(e) => setSupervisor(e.target.checked)} />
              Supervisor approval obtained
            </label>
            <Label>Merge Reason <span className="text-red-600">*</span></Label>
            <Textarea value={mergeReason} onChange={(e) => setMergeReason(e.target.value)} placeholder="Why are these records being merged?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMerge(null); setMergeReason(''); setSupervisor(false); }}>Cancel</Button>
            <Button onClick={doMerge}>Confirm Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!reject} onOpenChange={(v) => !v && setReject(null)} title="Reject Match" message={`Reject match ${reject?.matchId}?`} requireReason danger
        onConfirm={(reason) => { if (reject) { setRows(rs => rs.map(r => r.matchId === reject.matchId ? { ...r, status: 'Rejected' } : r)); toast.success('Match rejected'); logAudit('Duplicates', `Reject ${reject.matchId}: ${reason}`); } }} />

      <ConfirmModal open={!!flag} onOpenChange={(v) => !v && setFlag(null)} title="Flag for Supervisor" message={`Flag match ${flag?.matchId} for supervisor review?`} requireReason
        onConfirm={(reason) => { if (flag) { setRows(rs => rs.map(r => r.matchId === flag.matchId ? { ...r, status: 'Pending Review' } : r)); toast.success('Flagged for supervisor'); logAudit('Duplicates', `Flag ${flag.matchId}: ${reason}`); } }} />
    </Shell>
  );
};

// ============================================================
// 4. MEDICAL RECORD RETRIEVAL
// ============================================================
type FileStatus = 'Requested' | 'Released' | 'In Transit' | 'Overdue' | 'Returned' | 'Missing';
interface FileRequest {
  reqId: string; hospitalId: string; patientName: string; requestedBy: string;
  department: string; requestTime: string; location: string; dueDate: string;
  status: FileStatus; reason: string;
}

const FILE_SEED: FileRequest[] = [
  { reqId: 'REQ-7001', hospitalId: 'GFA HMS/2026/00132', patientName: 'Adaeze Nwosu', requestedBy: 'Dr. Bello', department: 'General OPD', requestTime: '2026-04-29 08:15', location: 'Shelf A-12', dueDate: '2026-04-29', status: 'Released', reason: 'Consultation visit' },
  { reqId: 'REQ-7002', hospitalId: 'GFA HMS/2026/00145', patientName: 'John Doe', requestedBy: 'Nurse Femi', department: 'Ward 3', requestTime: '2026-04-29 09:02', location: 'Ward 3 — Nursing station', dueDate: '2026-04-30', status: 'In Transit', reason: 'Inpatient round' },
  { reqId: 'REQ-7003', hospitalId: 'GFA HMS/2026/00150', patientName: 'Mariam Lawal', requestedBy: 'Dr. Yusuf', department: 'Psychiatry', requestTime: '2026-04-28 14:30', location: 'Psychiatry clinic', dueDate: '2026-04-29', status: 'Overdue', reason: 'Follow-up review' },
  { reqId: 'REQ-7004', hospitalId: 'GFA HMS/2026/00151', patientName: 'Emeka Obi', requestedBy: 'Dr. Ojo', department: 'Emergency', requestTime: '2026-04-29 09:30', location: 'Shelf C-04', dueDate: '2026-04-29', status: 'Requested', reason: 'Emergency arrival' },
  { reqId: 'REQ-7005', hospitalId: 'GFA HMS/2025/00211', patientName: 'Salihu Bako', requestedBy: 'Dr. Mensah', department: 'Neurology', requestTime: '2026-04-28 11:00', location: 'Shelf B-18', dueDate: '2026-04-29', status: 'Returned', reason: 'Old case review' },
  { reqId: 'REQ-7006', hospitalId: 'GFA HMS/2024/00099', patientName: 'Tope Adeleke', requestedBy: 'Records Audit', department: 'Records', requestTime: '2026-04-27 16:00', location: 'Archive', dueDate: '2026-04-28', status: 'Missing', reason: 'Audit verification' },
];

const fileTone = (s: FileStatus) => s === 'Released' || s === 'Returned' ? 'success' : s === 'Overdue' || s === 'Missing' ? 'danger' : s === 'In Transit' ? 'info' : 'warning';

export const MedicalRecordRetrieval_MockLegacy = () => {
  const [rows, setRows] = useState<FileRequest[]>(FILE_SEED);
  const [tab, setTab] = useState<FileStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<FileRequest | null>(null);
  const [act, setAct] = useState<{ row: FileRequest; type: 'release' | 'transit' | 'return' | 'missing' } | null>(null);
  const [newReq, setNewReq] = useState(false);
  const [form, setForm] = useState({ patient: '', dept: '', officer: '', reason: '', due: '' });

  const cards = {
    today: rows.length, released: rows.filter(r => r.status === 'Released').length,
    transit: rows.filter(r => r.status === 'In Transit').length, overdue: rows.filter(r => r.status === 'Overdue').length,
    returned: rows.filter(r => r.status === 'Returned').length, missing: rows.filter(r => r.status === 'Missing').length,
  };
  const filtered = rows.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (search && !`${r.reqId} ${r.patientName} ${r.hospitalId} ${r.requestedBy}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const applyAct = () => {
    if (!act) return;
    const map: Record<string, FileStatus> = { release: 'Released', transit: 'In Transit', return: 'Returned', missing: 'Missing' };
    const s = map[act.type];
    setRows(rs => rs.map(r => r.reqId === act.row.reqId ? { ...r, status: s } : r));
    toast.success(`${act.row.reqId} → ${s}`);
    logAudit('Retrieval', `${s} ${act.row.reqId}`);
    setAct(null);
  };

  const createRequest = () => {
    if (!form.patient || !form.dept || !form.reason) { toast.error('Patient, department and reason are required'); return; }
    const id = `REQ-${7000 + rows.length + 10}`;
    setRows(rs => [{ reqId: id, hospitalId: 'GFA HMS/2026/—', patientName: form.patient, requestedBy: form.officer || 'Records Officer', department: form.dept, requestTime: new Date().toISOString().slice(0, 16).replace('T', ' '), location: 'Records', dueDate: form.due || new Date().toISOString().slice(0, 10), status: 'Requested', reason: form.reason }, ...rs]);
    toast.success('File request submitted');
    logAudit('Retrieval', `Create ${id}`);
    setNewReq(false); setForm({ patient: '', dept: '', officer: '', reason: '', due: '' });
  };

  return (
    <Shell title="Medical Record Retrieval" description="Track request, release, movement and return of patient files." breadcrumb="Medical Record Retrieval">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Requests Today" value={String(cards.today)} icon={FolderOpen} tone="blue" />
        <SummaryCard title="Released" value={String(cards.released)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="In Transit" value={String(cards.transit)} icon={ArrowRight} tone="indigo" />
        <SummaryCard title="Overdue" value={String(cards.overdue)} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Returned" value={String(cards.returned)} icon={RefreshCw} tone="teal" />
        <SummaryCard title="Missing" value={String(cards.missing)} icon={XCircle} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search request, patient, officer" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setNewReq(true)}><UserPlus className="h-4 w-4 mr-1.5" />New Request</Button>
          <ExportBtn name="Retrieval" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Requested">Requests</TabsTrigger>
            <TabsTrigger value="Released">Released</TabsTrigger>
            <TabsTrigger value="In Transit">In Transit</TabsTrigger>
            <TabsTrigger value="Overdue">Overdue</TabsTrigger>
            <TabsTrigger value="Returned">Returned</TabsTrigger>
            <TabsTrigger value="Missing">Missing</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Request ID','Hospital No','Patient','Requested By','Department','Time','Location','Due','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? emptyState(10, 'No requests') : filtered.map(r => (
                    <tr key={r.reqId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.reqId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.patientName}</td>
                      <td className="px-3 py-2">{r.requestedBy}</td>
                      <td className="px-3 py-2">{r.department}</td>
                      <td className="px-3 py-2 text-xs">{r.requestTime}</td>
                      <td className="px-3 py-2 text-xs">{r.location}</td>
                      <td className="px-3 py-2">{r.dueDate}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => { setView(r); logAudit('Retrieval', `View ${r.reqId}`); }}><Eye className="h-4 w-4" /></Button>
                          {r.status === 'Requested' && <Button size="icon" variant="ghost" title="Release" onClick={() => setAct({ row: r, type: 'release' })}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>}
                          {(r.status === 'Released' || r.status === 'Requested') && <Button size="icon" variant="ghost" title="In Transit" onClick={() => setAct({ row: r, type: 'transit' })}><ArrowRight className="h-4 w-4 text-indigo-600" /></Button>}
                          {r.status !== 'Returned' && r.status !== 'Missing' && <Button size="icon" variant="ghost" title="Return" onClick={() => setAct({ row: r, type: 'return' })}><RefreshCw className="h-4 w-4" /></Button>}
                          {r.status !== 'Returned' && r.status !== 'Missing' && <Button size="icon" variant="ghost" title="Report Missing" onClick={() => setAct({ row: r, type: 'missing' })}><AlertTriangle className="h-4 w-4 text-rose-600" /></Button>}
                          <Button size="icon" variant="ghost" title="Print Movement Slip" onClick={() => { toast.success(`Movement slip printed for ${r.reqId}`); logAudit('Retrieval', `Print ${r.reqId}`); }}><Printer className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>File Request — {view?.reqId}</DialogTitle></DialogHeader>
          {view && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><b>Patient:</b> {view.patientName}</div>
              <div className="font-mono text-xs">{view.hospitalId}</div>
              <div><b>Requested by:</b> {view.requestedBy}</div>
              <div><b>Department:</b> {view.department}</div>
              <div><b>Reason:</b> {view.reason}</div>
              <div><b>Location:</b> {view.location}</div>
              <div><b>Due:</b> {view.dueDate}</div>
              <div><b>Status:</b> <StatusBadge status={view.status} /></div>
              <div className="md:col-span-2"><div className="text-xs font-semibold uppercase text-muted-foreground mt-2">Movement History</div>
                <ul className="text-xs space-y-0.5 mt-1"><li>{view.requestTime} — Requested by {view.requestedBy}</li><li>Status: {view.status}</li></ul></div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!act} onOpenChange={(v) => !v && setAct(null)}
        title={act?.type === 'missing' ? 'Report File Missing' : `Mark as ${act?.type === 'release' ? 'Released' : act?.type === 'transit' ? 'In Transit' : 'Returned'}`}
        message={`Update ${act?.row.reqId} for ${act?.row.patientName}?`}
        requireReason={act?.type === 'missing'} danger={act?.type === 'missing'} onConfirm={applyAct} />

      <Dialog open={newReq} onOpenChange={setNewReq}>
        <DialogContent>
          <DialogHeader><DialogTitle>New File Request</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 space-y-1"><Label>Search Patient</Label><Input value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} placeholder="Hospital No or name" /></div>
            <div className="space-y-1"><Label>Department</Label>
              <SearchableSelect
                options={RETRIEVAL_DEPARTMENTS.map(d => ({ value: d, label: d }))}
                value={form.dept}
                onChange={(v) => setForm({ ...form, dept: v })}
                placeholder="Select department"
              />
            </div>
            <div className="space-y-1"><Label>Officer</Label>
              <SearchableSelect
                options={RETRIEVAL_OFFICERS}
                value={form.officer}
                onChange={(v) => setForm({ ...form, officer: v })}
                placeholder="Select officer"
              />
            </div>
            <div className="col-span-2 space-y-1"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div className="space-y-1"><Label>Expected Return</Label><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewReq(false)}>Cancel</Button><Button onClick={createRequest}>Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 5. RECORD ARCHIVE
// ============================================================
type ArchiveCategory = 'Inactive' | 'Deceased' | 'Long-Stay' | 'Restricted' | 'Legal Hold';
interface ArchiveRow {
  archiveId: string; hospitalId: string; patientName: string; category: ArchiveCategory;
  lastVisit: string; archiveDate: string; retention: string; access: 'Standard' | 'Supervisor' | 'Legal Only';
  dueReview?: boolean;
}

const ARCHIVE_SEED: ArchiveRow[] = [
  { archiveId: 'ARC-9001', hospitalId: 'GFA HMS/2018/00021', patientName: 'Olusola Adeoye', category: 'Inactive', lastVisit: '2019-03-12', archiveDate: '2022-06-01', retention: '10 years', access: 'Standard' },
  { archiveId: 'ARC-9002', hospitalId: 'GFA HMS/2020/00088', patientName: 'Hannah Ekanem', category: 'Deceased', lastVisit: '2023-01-04', archiveDate: '2023-02-10', retention: 'Permanent', access: 'Supervisor' },
  { archiveId: 'ARC-9003', hospitalId: 'GFA HMS/2017/00009', patientName: 'Saheed Bakare', category: 'Long-Stay', lastVisit: '2026-03-30', archiveDate: '2026-04-01', retention: '15 years', access: 'Standard', dueReview: true },
  { archiveId: 'ARC-9004', hospitalId: 'GFA HMS/2019/00044', patientName: 'Christiana Eze', category: 'Restricted', lastVisit: '2021-10-15', archiveDate: '2022-01-01', retention: '20 years', access: 'Legal Only' },
  { archiveId: 'ARC-9005', hospitalId: 'GFA HMS/2016/00012', patientName: 'Musa Garba', category: 'Inactive', lastVisit: '2017-08-22', archiveDate: '2020-08-22', retention: '10 years', access: 'Standard', dueReview: true },
  { archiveId: 'ARC-9006', hospitalId: 'GFA HMS/2015/00007', patientName: 'Patricia Igwe', category: 'Legal Hold', lastVisit: '2018-04-04', archiveDate: '2019-04-04', retention: 'Indefinite (legal)', access: 'Legal Only' },
];

export const RecordArchive_MockLegacy = () => {
  const [rows, setRows] = useState<ArchiveRow[]>(ARCHIVE_SEED);
  const [tab, setTab] = useState<'all' | ArchiveCategory | 'review'>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ArchiveRow | null>(null);
  const [act, setAct] = useState<{ row: ArchiveRow; type: 'restore' | 'access' | 'extend' } | null>(null);

  const cards = {
    total: rows.length,
    inactive: rows.filter(r => r.category === 'Inactive').length,
    deceased: rows.filter(r => r.category === 'Deceased').length,
    long: rows.filter(r => r.category === 'Long-Stay').length,
    review: rows.filter(r => r.dueReview).length,
    restricted: rows.filter(r => r.category === 'Restricted' || r.category === 'Legal Hold').length,
  };
  const filtered = rows.filter(r => {
    if (tab === 'review' && !r.dueReview) return false;
    if (tab !== 'all' && tab !== 'review' && r.category !== tab) return false;
    if (search && !`${r.archiveId} ${r.patientName} ${r.hospitalId}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const applyAct = (reason?: string) => {
    if (!act) return;
    if (act.type === 'restore') {
      setRows(rs => rs.filter(r => r.archiveId !== act.row.archiveId));
      toast.success(`${act.row.patientName} restored to active records`);
      logAudit('Archive', `Restore ${act.row.archiveId}`);
    } else if (act.type === 'access') {
      toast.success('Access request submitted to supervisor');
      logAudit('Archive', `Access request ${act.row.archiveId}: ${reason}`);
    } else if (act.type === 'extend') {
      setRows(rs => rs.map(r => r.archiveId === act.row.archiveId ? { ...r, dueReview: false } : r));
      toast.success('Retention extended');
      logAudit('Archive', `Extend retention ${act.row.archiveId}`);
    }
    setAct(null);
  };

  return (
    <Shell title="Record Archive" description="Manage inactive, discharged, deceased, long-stay and legally retained records." breadcrumb="Record Archive">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Archived Records" value={String(cards.total)} icon={Archive} tone="blue" />
        <SummaryCard title="Inactive" value={String(cards.inactive)} icon={FolderOpen} tone="indigo" />
        <SummaryCard title="Deceased" value={String(cards.deceased)} icon={XCircle} tone="rose" />
        <SummaryCard title="Long-Stay" value={String(cards.long)} icon={Clock} tone="indigo" />
        <SummaryCard title="Due for Review" value={String(cards.review)} icon={AlertTriangle} tone="amber" />
        <SummaryCard title="Restricted" value={String(cards.restricted)} icon={Flag} tone="purple" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search archive id, patient, hospital no" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ExportBtn name="Archive" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All Archives</TabsTrigger>
            <TabsTrigger value="Inactive">Inactive</TabsTrigger>
            <TabsTrigger value="Deceased">Deceased</TabsTrigger>
            <TabsTrigger value="Long-Stay">Long-Stay</TabsTrigger>
            <TabsTrigger value="Restricted">Restricted</TabsTrigger>
            <TabsTrigger value="review">Due for Review</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Archive ID','Hospital No','Patient','Category','Last Visit','Archive Date','Retention','Access','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? emptyState(9, 'No archived records') : filtered.map(r => (
                    <tr key={r.archiveId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.archiveId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.patientName}{r.dueReview && <span className="ml-2 text-amber-600 text-xs">⚠ review</span>}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.category} /></td>
                      <td className="px-3 py-2">{r.lastVisit}</td>
                      <td className="px-3 py-2">{r.archiveDate}</td>
                      <td className="px-3 py-2">{r.retention}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.access} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => { setView(r); logAudit('Archive', `View ${r.archiveId}`); }}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Restore" onClick={() => setAct({ row: r, type: 'restore' })}><RefreshCw className="h-4 w-4 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" title="Request Access" onClick={() => setAct({ row: r, type: 'access' })}><FileCheck className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Extend Retention" onClick={() => setAct({ row: r, type: 'extend' })}><Clock className="h-4 w-4 text-indigo-600" /></Button>
                          <Button size="icon" variant="ghost" title="Print Summary" onClick={() => { toast.success(`Summary printed for ${r.archiveId}`); logAudit('Archive', `Print ${r.archiveId}`); }}><Printer className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Archive — {view?.archiveId}</DialogTitle></DialogHeader>
          {view && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><b>Patient:</b> {view.patientName}</div>
              <div className="font-mono text-xs">{view.hospitalId}</div>
              <div><b>Category:</b> {view.category}</div>
              <div><b>Last Visit:</b> {view.lastVisit}</div>
              <div><b>Archive Date:</b> {view.archiveDate}</div>
              <div><b>Retention:</b> {view.retention}</div>
              <div><b>Access:</b> {view.access}</div>
              <div><b>Status:</b> {view.dueReview ? 'Review due' : 'OK'}</div>
              <div className="md:col-span-2 text-muted-foreground text-xs">Linked documents and audit history are available via supervisor.</div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!act} onOpenChange={(v) => !v && setAct(null)}
        title={act?.type === 'restore' ? 'Restore Record' : act?.type === 'access' ? 'Request Access' : 'Extend Retention'}
        message={`Confirm action on ${act?.row.archiveId} — ${act?.row.patientName}.`}
        requireReason={act?.type === 'access'} onConfirm={applyAct} />
    </Shell>
  );
};

// ============================================================
// 6. INTERNAL & EXTERNAL REFERRALS
// ============================================================
type RefStatus = 'Pending' | 'Accepted' | 'Forwarded' | 'Completed' | 'Rejected';
interface ReferralRow {
  refId: string; hospitalId: string; patientName: string; type: 'Internal' | 'External';
  direction: 'Incoming' | 'Outgoing'; from: string; to: string; reason: string;
  date: string; status: RefStatus; letterUploaded?: boolean;
}

const REF_SEED: ReferralRow[] = [
  { refId: 'REF-5001', hospitalId: 'GFA HMS/2026/00132', patientName: 'Adaeze Nwosu', type: 'Internal', direction: 'Outgoing', from: 'General OPD', to: 'Neurology', reason: 'Persistent migraines', date: '2026-04-29', status: 'Accepted', letterUploaded: true },
  { refId: 'REF-5002', hospitalId: 'GFA HMS/2026/00150', patientName: 'Mariam Lawal', type: 'External', direction: 'Outgoing', from: 'Psychiatry', to: 'UCH Ibadan', reason: 'Specialised ECT', date: '2026-04-28', status: 'Pending' },
  { refId: 'REF-5003', hospitalId: 'GFA HMS/2026/00151', patientName: 'Emeka Obi', type: 'External', direction: 'Incoming', from: 'Garki Hospital', to: 'Emergency', reason: 'Acute psychosis', date: '2026-04-29', status: 'Accepted', letterUploaded: true },
  { refId: 'REF-5004', hospitalId: 'GFA HMS/2026/00145', patientName: 'John Doe', type: 'Internal', direction: 'Outgoing', from: 'General OPD', to: 'Cardiology Clinic', reason: 'HTN workup', date: '2026-04-27', status: 'Completed', letterUploaded: true },
  { refId: 'REF-5005', hospitalId: 'GFA HMS/2026/00137', patientName: 'Ibrahim Musa', type: 'Internal', direction: 'Outgoing', from: 'Addiction Clinic', to: 'Social Work', reason: 'Family counselling', date: '2026-04-26', status: 'Forwarded' },
  { refId: 'REF-5006', hospitalId: 'GFA HMS/2025/00211', patientName: 'Salihu Bako', type: 'External', direction: 'Incoming', from: 'Federal Medical Centre Abeokuta', to: 'Neurology', reason: 'Seizure evaluation', date: '2026-04-25', status: 'Rejected' },
];

const refTone = (s: RefStatus) => s === 'Accepted' || s === 'Completed' ? 'success' : s === 'Rejected' ? 'danger' : s === 'Forwarded' ? 'info' : 'warning';

export const ReferralsCenter = () => {
  const [rows, setRows] = useState<ReferralRow[]>(REF_SEED);
  const [tab, setTab] = useState<'all' | 'internal' | 'external' | 'incoming' | 'outgoing' | 'completed' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ReferralRow | null>(null);
  const [accept, setAccept] = useState<ReferralRow | null>(null);
  const [forward, setForward] = useState<ReferralRow | null>(null);
  const [forwardTo, setForwardTo] = useState('');
  const [upload, setUpload] = useState<ReferralRow | null>(null);
  const [uploadType, setUploadType] = useState('Referral Letter');
  const [uploadNotes, setUploadNotes] = useState('');
  const [reject, setReject] = useState<ReferralRow | null>(null);

  const cards = {
    today: rows.length,
    internal: rows.filter(r => r.type === 'Internal').length,
    external: rows.filter(r => r.type === 'External').length,
    incoming: rows.filter(r => r.direction === 'Incoming').length,
    outgoing: rows.filter(r => r.direction === 'Outgoing').length,
    pendingDocs: rows.filter(r => !r.letterUploaded).length,
  };

  const filtered = rows.filter(r => {
    if (tab === 'internal' && r.type !== 'Internal') return false;
    if (tab === 'external' && r.type !== 'External') return false;
    if (tab === 'incoming' && r.direction !== 'Incoming') return false;
    if (tab === 'outgoing' && r.direction !== 'Outgoing') return false;
    if (tab === 'completed' && r.status !== 'Completed') return false;
    if (tab === 'rejected' && r.status !== 'Rejected') return false;
    if (search && !`${r.refId} ${r.patientName} ${r.hospitalId} ${r.from} ${r.to}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const update = (refId: string, patch: Partial<ReferralRow>) => setRows(rs => rs.map(r => r.refId === refId ? { ...r, ...patch } : r));

  return (
    <Shell title="Internal & External Referrals" description="Manage all referral movement involving the records department." breadcrumb="Internal & External Referrals">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Today" value={String(cards.today)} icon={Send} tone="blue" />
        <SummaryCard title="Internal" value={String(cards.internal)} icon={Building2} tone="teal" />
        <SummaryCard title="External" value={String(cards.external)} icon={Send} tone="indigo" />
        <SummaryCard title="Incoming" value={String(cards.incoming)} icon={ArrowRight} tone="green" />
        <SummaryCard title="Outgoing" value={String(cards.outgoing)} icon={ArrowRight} tone="purple" />
        <SummaryCard title="Pending Docs" value={String(cards.pendingDocs)} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search referral, patient, from/to" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ExportBtn name="Referrals" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="internal">Internal</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>{['Referral ID','Hospital No','Patient','Type','From','To','Reason','Date','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? emptyState(10, 'No referrals') : filtered.map(r => (
                    <tr key={r.refId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.refId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.hospitalId}</td>
                      <td className="px-3 py-2 font-medium">{r.patientName}</td>
                      <td className="px-3 py-2"><StatusBadge status={`${r.type} · ${r.direction}`} /></td>
                      <td className="px-3 py-2">{r.from}</td>
                      <td className="px-3 py-2">{r.to}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate" title={r.reason}>{r.reason}</td>
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => { setView(r); logAudit('Referrals', `View ${r.refId}`); }}><Eye className="h-4 w-4" /></Button>
                          {r.status === 'Pending' && <Button size="icon" variant="ghost" title="Accept" onClick={() => setAccept(r)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>}
                          {r.status !== 'Completed' && r.status !== 'Rejected' && <Button size="icon" variant="ghost" title="Forward" onClick={() => { setForward(r); setForwardTo(''); }}><Send className="h-4 w-4 text-indigo-600" /></Button>}
                          <Button size="icon" variant="ghost" title="Upload Letter" onClick={() => { setUpload(r); setUploadType('Referral Letter'); setUploadNotes(''); }}><Upload className="h-4 w-4" /></Button>
                          {r.status !== 'Rejected' && <Button size="icon" variant="ghost" title="Reject" onClick={() => setReject(r)}><XCircle className="h-4 w-4 text-rose-600" /></Button>}
                          <Button size="icon" variant="ghost" title="Print Form" onClick={() => { toast.success(`Referral form printed for ${r.refId}`); logAudit('Referrals', `Print ${r.refId}`); }}><Printer className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Referral — {view?.refId}</DialogTitle></DialogHeader>
          {view && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><b>Patient:</b> {view.patientName}</div>
              <div className="font-mono text-xs">{view.hospitalId}</div>
              <div><b>Type:</b> {view.type} ({view.direction})</div>
              <div><b>Date:</b> {view.date}</div>
              <div><b>From:</b> {view.from}</div>
              <div><b>To:</b> {view.to}</div>
              <div className="md:col-span-2"><b>Reason:</b> {view.reason}</div>
              <div><b>Letter:</b> {view.letterUploaded ? 'Uploaded' : 'Not uploaded'}</div>
              <div><b>Status:</b> <StatusBadge status={view.status} /></div>
              <div className="md:col-span-2"><div className="text-xs font-semibold uppercase text-muted-foreground mt-2">Timeline</div>
                <ul className="text-xs space-y-0.5 mt-1"><li>{view.date} — Created ({view.from} → {view.to})</li><li>Current status: {view.status}</li></ul></div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!accept} onOpenChange={(v) => !v && setAccept(null)} title="Accept Referral" message={`Accept referral ${accept?.refId} for ${accept?.patientName}?`}
        onConfirm={() => { if (accept) { update(accept.refId, { status: 'Accepted' }); toast.success('Referral accepted'); logAudit('Referrals', `Accept ${accept.refId}`); } }} />

      <Dialog open={!!forward} onOpenChange={(v) => !v && setForward(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Forward Referral — {forward?.refId}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Forward To (Department / Facility)</Label>
            <Input value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="e.g. Neurology, LASUTH" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForward(null)}>Cancel</Button>
            <Button onClick={() => { if (!forwardTo.trim()) { toast.error('Destination required'); return; } if (forward) { update(forward.refId, { status: 'Forwarded', to: forwardTo }); toast.success(`Forwarded to ${forwardTo}`); logAudit('Referrals', `Forward ${forward.refId} → ${forwardTo}`); setForward(null); } }}>Forward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!upload} onOpenChange={(v) => !v && setUpload(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Referral Letter — {upload?.refId}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Referral Letter">Referral Letter</SelectItem>
                <SelectItem value="Lab Report">Lab Report</SelectItem>
                <SelectItem value="Imaging Report">Imaging Report</SelectItem>
                <SelectItem value="Clinical Summary">Clinical Summary</SelectItem>
              </SelectContent>
            </Select>
            <Label>File</Label>
            <Input type="file" />
            <Label>Notes</Label>
            <Textarea value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpload(null)}>Cancel</Button>
            <Button onClick={() => { if (upload) { update(upload.refId, { letterUploaded: true }); toast.success(`${uploadType} uploaded`); logAudit('Referrals', `Upload ${uploadType} ${upload.refId}`); setUpload(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal open={!!reject} onOpenChange={(v) => !v && setReject(null)} title="Reject Referral" message={`Reject ${reject?.refId}?`} requireReason danger
        onConfirm={(reason) => { if (reject) { update(reject.refId, { status: 'Rejected' }); toast.success('Referral rejected'); logAudit('Referrals', `Reject ${reject.refId}: ${reason}`); } }} />
    </Shell>
  );
};
