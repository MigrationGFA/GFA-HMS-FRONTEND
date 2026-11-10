import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/dummyData';
import { patientRecords, labRequests, drugStock, prescriptions, beds, admissions, syncLogs, auditTrail, discharges } from '@/data/hmsData';
import { invoices } from '@/data/invoiceData';
import {
  Users, UserPlus, Search, Receipt, CreditCard, FlaskConical, Pill,
  BedDouble, FileCheck, RefreshCw, Activity, AlertTriangle, ShieldCheck,
  Stethoscope, ClipboardList, Building2, TrendingUp, Banknote, Smartphone,
  Boxes, ClipboardCheck, History, Home, LayoutDashboard, LogIn, Send,
  QrCode, Camera, Printer, Save, Phone, MapPin, Heart, Brain, FileText,
  ChevronLeft, ChevronRight, Check, Wifi, ScanLine, ArrowRight, Fingerprint,
  Upload, Calendar, Briefcase, GraduationCap, Pause, Play, Eye, Clock, Trash2, Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { recordsNav } from '@/pages/recordsNav';
import { cashierNav } from '@/pages/CashierCenter';
import { db } from '@/db/database';
import {
  deleteRegistrationDraft,
  listRegistrationDrafts,
  markDraftSubmitted,
  upsertRegistrationDraft,
  type PatientRegistrationDraft,
} from '@/lib/patientRegistrationDrafts';
import {
  getCardForPerson,
  isPatientsApiEnabled,
  mapPersonToWizardForm,
  mapWizardFormToPersonPayload,
  searchPersons,
  type CardRecord,
  type PersonRecord,
} from '@/lib/api/patients';
import {
  completeRegistration as completeRegistrationApi,
  createRegistration,
  fetchRegistrationCharges,
  getDashboardStats,
  getRegistration,
  getRegistrationPaymentStatusByPerson,
  isRecordsApiEnabled,
  listRegistrations,
  resumeRegistration,
  type RecordsDashboardStats,
} from '@/lib/api/records';
import {
  checkInOnlineBooking,
  completeOnlineBooking,
  convertOnlineBooking,
  isRecordsBookingsApiEnabled,
  listRecordsBookings,
  type StaffBooking,
} from '@/lib/api/records-bookings';
import { ApiError } from '@/lib/api/client';
import { createTriage, isTriageApiEnabled } from '@/lib/api/triage';
import RecordsHmoEligibilityPanel from '@/components/records/RecordsHmoEligibilityPanel';


// ============================================================
// SIDEBAR DEFINITIONS — per role
// ============================================================
const sidebars = {
  nurse: [
    { label: 'Overview', path: '/dashboard/nurse', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Patient Entry', path: '/hms/identity', icon: <UserPlus className="h-4 w-4" /> },
    { label: 'IPD Dashboard', path: '/ipd', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Bed Board', path: '/ipd/beds', icon: <BedDouble className="h-4 w-4" /> },
    { label: 'Active Admissions', path: '/ipd/active', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Daily Care', path: '/ipd/care', icon: <Activity className="h-4 w-4" /> },
    { label: 'Continuous Billing', path: '/ipd/billing', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Discharge Queue', path: '/ipd/discharge', icon: <FileCheck className="h-4 w-4" /> },
    { label: 'Final Billing & Discharge', path: '/discharge', icon: <FileCheck className="h-4 w-4" /> },
    { label: 'Lab Results', path: '/hms/lab', icon: <FlaskConical className="h-4 w-4" /> },
    { label: 'Patient Records', path: '/hms/patients', icon: <Users className="h-4 w-4" /> },
  ],
  pharmacist: [
    { label: 'Dashboard',          path: '/pharmacy',                       icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Prescriptions',      path: '/pharmacy/queue',                 icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Inventory',          path: '/pharmacy/inventory',             icon: <Boxes className="h-4 w-4" /> },
    { label: 'Procurement',        path: '/pharmacy/procurement',           icon: <Send className="h-4 w-4" /> },
    { label: 'Inpatient Pharmacy', path: '/pharmacy/inpatient',   icon: <BedDouble className="h-4 w-4" /> },
    { label: 'Revenue / Billing',  path: '/pharmacy/billing',     icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Returns',            path: '/pharmacy/returns',     icon: <RefreshCw className="h-4 w-4" /> },
    { label: 'Clinical Pharmacy',  path: '/pharmacy/interactions',icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Reports',            path: '/pharmacy/reports',     icon: <FileText className="h-4 w-4" /> },
    { label: 'ADR Reporting',      path: '/dashboard/pharmacy/comms',       icon: <AlertTriangle className="h-4 w-4" /> },
    { label: 'Alerts',             path: '/pharmacy/audit',                 icon: <Activity className="h-4 w-4" /> },
    { label: 'Analytics',          path: '/pharmacy/analytics',   icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'AI Features',        path: '/pharmacy/forecast',    icon: <Activity className="h-4 w-4" /> },
    { label: 'Settings',           path: '/pharmacy/config',      icon: <Edit className="h-4 w-4" /> },
  ],
  lab: [
    { label: 'Lab Overview', path: '/lab', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Incoming Requests', path: '/lab/requests', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Sample Collection', path: '/lab/samples', icon: <ClipboardCheck className="h-4 w-4" /> },
    { label: 'Processing', path: '/lab/processing', icon: <FlaskConical className="h-4 w-4" /> },
    { label: 'Result Entry', path: '/lab/results', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Verification', path: '/lab/verification', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Released Results', path: '/lab/released', icon: <ClipboardCheck className="h-4 w-4" /> },
    { label: 'EMR Sync', path: '/lab/sync', icon: <RefreshCw className="h-4 w-4" /> },
    { label: 'Test Catalog', path: '/lab/catalog', icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Audit Trail', path: '/hms/audit', icon: <History className="h-4 w-4" /> },
  ],
  cashier: cashierNav,
  records: recordsNav,

} as const;

const roleTitles: Record<string, string> = {
  nurse: 'Nursing Console',
  pharmacist: 'Pharmacy Console',
  lab: 'Laboratory Console',
  cashier: 'Cashier / POS Console',
  records: 'Records Officer Console',
};

const useRoleNav = (role: keyof typeof sidebars) => sidebars[role] as any;

// Wrap any HMS module page with sidebar of the current logged-in role
const ModulePage = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const { user } = useAuth();
  const role = (user?.role ?? 'records') as keyof typeof sidebars;
  const nav = sidebars[role] ?? sidebars.records;
  return (
    <DashboardLayout title={title} navItems={nav as any}>{children}</DashboardLayout>
  );
};

// ============================================================
// 1. PATIENT MANAGEMENT
// ============================================================
export const PatientManagement = () => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', nin: '', age: '', gender: 'Male', address: '', insurance: 'NHIS' });

  const filtered = patientRecords.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) || p.nin.includes(search) || p.hospitalId.toLowerCase().includes(search.toLowerCase())
  );

  const duplicate = patientRecords.find(p => p.phone === form.phone || p.nin === form.nin);

  return (
    <ModulePage title="Patient Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Registered Patients" value={patientRecords.length.toLocaleString()} icon={Users} subtitle="Total in system" />
        <SummaryCard title="New Today" value="14" icon={UserPlus} subtitle="Walk-in + Online" />
        <SummaryCard title="NHIS Patients" value={String(patientRecords.filter(p => p.insurance === 'NHIS').length)} icon={ShieldCheck} />
        <SummaryCard title="Online Bookings" value={String(patientRecords.filter(p => p.source === 'Online').length)} icon={Smartphone} />
      </div>

      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, NIN, or hospital ID" className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-1" /> Register Patient</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Patient Registration</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Adebayo Ogundimu" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" /></div>
              <div><Label>NIN</Label><Input value={form.nin} onChange={e => setForm({ ...form, nin: e.target.value })} placeholder="11 digits" /></div>
              <div><Label>Age</Label><Input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} type="number" /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="col-span-2"><Label>Insurance</Label>
                <Select value={form.insurance} onValueChange={v => setForm({ ...form, insurance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NHIS">NHIS</SelectItem><SelectItem value="HMO">HMO</SelectItem>
                    <SelectItem value="Private">Private (Self-pay)</SelectItem><SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {duplicate && (form.phone || form.nin) && (
                <div className="col-span-2 p-3 rounded-lg bg-amber-50 ring-1 ring-amber-200 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div><b>Possible duplicate:</b> {duplicate.name} ({duplicate.hospitalId})</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => { toast.success('Patient registered. Hospital ID: GFA HMS/2026/00' + (145 + patientRecords.length)); setOpen(false); }}>Register</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Hospital ID</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Phone / NIN</th><th className="text-left p-3">Age/Sex</th><th className="text-left p-3">Insurance</th><th className="text-left p-3">Source</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{p.hospitalId}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-xs">{p.phone}<br /><span className="text-muted-foreground">{p.nin}</span></td>
                  <td className="p-3">{p.age} / {p.gender[0]}</td>
                  <td className="p-3"><StatusBadge status={p.insurance === 'None' ? 'Pending' : 'Active'} /> <span className="ml-1 text-xs">{p.insurance}</span></td>
                  <td className="p-3 text-xs">{p.source}</td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => toast.info(`Opening profile for ${p.name}`)}>Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// 3. LABORATORY MODULE
// ============================================================
export const LaboratoryModule = () => {
  const [filter, setFilter] = useState('all');
  const [resultOpen, setResultOpen] = useState<string | null>(null);
  const [result, setResult] = useState('');

  const filtered = filter === 'all' ? labRequests : labRequests.filter(r => r.status.toLowerCase().includes(filter));

  return (
    <ModulePage title="Laboratory Module">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Pending Requests" value={String(labRequests.filter(r => r.status === 'Pending').length)} icon={ClipboardList} />
        <SummaryCard title="In Progress" value={String(labRequests.filter(r => r.status === 'In Progress').length)} icon={FlaskConical} />
        <SummaryCard title="Result Ready" value={String(labRequests.filter(r => r.status === 'Result Ready').length)} icon={ClipboardCheck} />
        <SummaryCard title="Avg TAT" value="3.2 hrs" icon={TrendingUp} subtitle="Today" />
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="progress">In Progress</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="released">Released</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="hms-section overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Sample ID</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Test</th><th className="text-left p-3">Priority</th><th className="text-left p-3">Status</th><th className="text-left p-3">Result</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.sampleId ?? '—'}</td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.hospitalId}</div></td>
                  <td className="p-3">{r.test}<div className="text-xs text-muted-foreground">{r.category}</div></td>
                  <td className="p-3"><StatusBadge status={r.priority === 'Stat' ? 'Critical' : r.priority === 'Urgent' ? 'Warning' : 'Info'} /></td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 text-xs">{r.result ?? '—'}</td>
                  <td className="p-3 space-x-1">
                    <Dialog open={resultOpen === r.id} onOpenChange={(o) => setResultOpen(o ? r.id : null)}>
                      <DialogTrigger asChild><Button size="sm" variant="outline">Enter Result</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Enter Result — {r.test}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Patient</Label><Input value={r.patientName} disabled /></div>
                          <div><Label>Result / Findings</Label><Textarea value={result} onChange={e => setResult(e.target.value)} placeholder="e.g. Hb 10.2 g/dL (Low)" /></div>
                          <div className="text-xs text-muted-foreground">Result will require verification by the lab supervisor before release.</div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => { toast.success('Result submitted for verification'); setResultOpen(null); setResult(''); }}>Submit</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {r.status === 'Result Ready' && <Button size="sm" onClick={() => toast.success('Result verified & released to EMR')}>Verify & Release</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// 4. PHARMACY MODULE
// ============================================================
export const PharmacyModule = () => {
  return (
    <ModulePage title="Pharmacy — Prescription Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Pending Rx" value={String(prescriptions.filter(p => p.status === 'Pending').length)} icon={Pill} />
        <SummaryCard title="Dispensed Today" value={String(prescriptions.filter(p => p.status === 'Dispensed').length)} icon={ClipboardCheck} />
        <SummaryCard title="Low Stock Items" value={String(drugStock.filter(d => d.status === 'Low').length)} icon={AlertTriangle} />
        <SummaryCard title="Out of Stock" value={String(drugStock.filter(d => d.status === 'Out of Stock').length)} icon={Boxes} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Rx</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Prescribed By</th><th className="text-left p-3">Items</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {prescriptions.map(p => (
                <tr key={p.id} className="border-t hover:bg-muted/30 align-top">
                  <td className="p-3 font-mono text-xs">{p.id}</td>
                  <td className="p-3"><div className="font-medium">{p.patientName}</div><div className="text-xs text-muted-foreground">{p.hospitalId}</div></td>
                  <td className="p-3 text-xs">{p.prescribedBy}</td>
                  <td className="p-3 text-xs">
                    {p.items.map((it, i) => <div key={i}>• {it.drug} — <span className="text-muted-foreground">{it.dose} (×{it.qty})</span></div>)}
                  </td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">
                    {p.status !== 'Dispensed' && p.status !== 'Cancelled' && (
                      <Button size="sm" onClick={() => toast.success(`Dispensed Rx ${p.id} — stock auto-deducted`)}>Dispense</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

export const PharmacyStock = () => {
  return (
    <ModulePage title="Drug Stock & Inventory">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total SKUs" value={String(drugStock.length)} icon={Boxes} />
        <SummaryCard title="Active" value={String(drugStock.filter(d => d.status === 'Active').length)} icon={ShieldCheck} />
        <SummaryCard title="Low Stock" value={String(drugStock.filter(d => d.status === 'Low').length)} icon={AlertTriangle} />
        <SummaryCard title="Stock Value" value={formatCurrency(drugStock.reduce((s, d) => s + d.quantity * d.unitPrice, 0))} icon={TrendingUp} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Drug</th><th className="text-left p-3">Category</th><th className="text-left p-3">Qty</th><th className="text-left p-3">Reorder</th><th className="text-left p-3">Unit Price</th><th className="text-left p-3">Expiry</th><th className="text-left p-3">Status</th></tr>
            </thead>
            <tbody>
              {drugStock.map(d => (
                <tr key={d.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-xs">{d.category}</td>
                  <td className="p-3">{d.quantity} {d.unit}s</td>
                  <td className="p-3 text-xs">{d.reorderLevel}</td>
                  <td className="p-3">{formatCurrency(d.unitPrice)}</td>
                  <td className="p-3 text-xs">{d.expiry}</td>
                  <td className="p-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// 5. IPD / BED MANAGEMENT
// ============================================================
export const IpdModule = () => {
  const occupied = beds.filter(b => b.status === 'Occupied').length;
  const occupancy = Math.round((occupied / beds.length) * 100);

  const grouped = useMemo(() => {
    const g: Record<string, typeof beds> = {};
    beds.forEach(b => { (g[b.ward] ||= []).push(b); });
    return g;
  }, []);

  return (
    <ModulePage title="IPD — Wards & Bed Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Beds" value={String(beds.length)} icon={BedDouble} />
        <SummaryCard title="Occupied" value={String(occupied)} icon={Users} subtitle={`${occupancy}% occupancy`} />
        <SummaryCard title="Available" value={String(beds.filter(b => b.status === 'Available').length)} icon={ShieldCheck} />
        <SummaryCard title="ICU Free" value={String(beds.filter(b => b.type === 'ICU' && b.status === 'Available').length)} icon={Activity} />
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([ward, bedsInWard]) => (
          <div key={ward} className="hms-section p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {ward}</h3>
              <span className="text-xs text-muted-foreground">{bedsInWard.filter(b => b.status === 'Occupied').length}/{bedsInWard.length} occupied</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bedsInWard.map(b => (
                <div key={b.id} className={`p-3 rounded-lg border text-sm ${
                  b.status === 'Occupied' ? 'bg-sky-50 border-sky-200' :
                  b.status === 'Available' ? 'bg-emerald-50 border-emerald-200' :
                  b.status === 'Reserved' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="font-bold font-mono">{b.bedNumber}</div>
                  <div className="text-xs"><StatusBadge status={b.status} /></div>
                  {b.patient && <div className="text-xs mt-1 truncate">{b.patient}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{formatCurrency(b.rate)}/day</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModulePage>
  );
};

export const AdmissionsModule = () => {
  return (
    <ModulePage title="Admissions">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Active Admissions" value={String(admissions.filter(a => a.status === 'Active').length)} icon={ClipboardList} />
        <SummaryCard title="Pending Approval" value={String(admissions.filter(a => a.status === 'Pending Approval').length)} icon={ClipboardCheck} />
        <SummaryCard title="Avg Length of Stay" value="2.4 days" icon={TrendingUp} />
        <SummaryCard title="ICU Active" value={String(admissions.filter(a => a.ward === 'ICU' && a.status === 'Active').length)} icon={Activity} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Patient</th><th className="text-left p-3">Ward / Bed</th><th className="text-left p-3">Doctor</th><th className="text-left p-3">Diagnosis</th><th className="text-left p-3">Days</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {admissions.map(a => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><div className="font-medium">{a.patientName}</div><div className="text-xs text-muted-foreground">{a.hospitalId}</div></td>
                  <td className="p-3 text-xs">{a.ward} / <b>{a.bedNumber}</b></td>
                  <td className="p-3 text-xs">{a.admittingDoctor}</td>
                  <td className="p-3 text-xs">{a.diagnosis}</td>
                  <td className="p-3">{a.daysAdmitted}</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3 space-x-1">
                    {a.status === 'Pending Approval' && <Button size="sm" onClick={() => toast.success(`${a.patientName} admission approved`)}>Approve</Button>}
                    {a.status === 'Active' && <Button size="sm" variant="outline" onClick={() => toast.info('Daily ward round logged')}>Round</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// 6. DISCHARGE
// ============================================================
export const DischargeModule = () => {
  return (
    <ModulePage title="Discharge & Final Billing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Discharged Today" value={String(discharges.length)} icon={FileCheck} />
        <SummaryCard title="Awaiting Payment" value={String(discharges.filter(d => !d.paymentVerified).length)} icon={AlertTriangle} />
        <SummaryCard title="Awaiting Finance" value={String(discharges.filter(d => !d.financeApproved).length)} icon={Receipt} />
        <SummaryCard title="Beds Released" value={String(discharges.filter(d => d.bedReleased).length)} icon={BedDouble} />
      </div>

      <div className="space-y-3">
        {discharges.map(d => (
          <div key={d.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <h3 className="font-display font-semibold">{d.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{d.hospitalId}</span></h3>
                <p className="text-xs text-muted-foreground">{d.ward} • Admitted {d.admittedOn} → Discharged {d.dischargedOn}</p>
                <p className="text-sm mt-1">{d.diagnosis}</p>
              </div>
              <StatusBadge status={d.outcome} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
              <div><div className="text-xs text-muted-foreground">Total Bill</div><div className="font-semibold">{formatCurrency(d.totalBill)}</div></div>
              <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold text-emerald-600">{formatCurrency(d.paid)}</div></div>
              <div><div className="text-xs text-muted-foreground">Balance</div><div className="font-semibold text-amber-600">{formatCurrency(d.balance)}</div></div>
              <div className="flex flex-wrap gap-1 items-center">
                <StatusBadge status={d.paymentVerified ? 'Verified' : 'Pending'} />
                <StatusBadge status={d.financeApproved ? 'Approved' : 'Pending'} />
                <StatusBadge status={d.bedReleased ? 'Released' : 'Pending'} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success('Discharge summary printed')}><FileCheck className="h-3 w-3 mr-1" /> Print Summary</Button>
              {!d.paymentVerified && <Button size="sm" onClick={() => toast.success('Payment verified')}>Verify Payment</Button>}
              {d.paymentVerified && !d.financeApproved && <Button size="sm" onClick={() => toast.success('Finance approved')}>Finance Approve</Button>}
              {d.financeApproved && !d.bedReleased && <Button size="sm" onClick={() => toast.success('Bed released and ready for next admission')}>Release Bed</Button>}
            </div>
          </div>
        ))}
      </div>
    </ModulePage>
  );
};

// ============================================================
// 7. EMR SYNC
// ============================================================
export const SyncModule = () => {
  const failed = syncLogs.filter(s => s.status === 'Failed').length;
  return (
    <ModulePage title="EMR Background Sync">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Synced Today" value={String(syncLogs.filter(s => s.status === 'Synced').length)} icon={ShieldCheck} />
        <SummaryCard title="Pending" value={String(syncLogs.filter(s => s.status === 'Pending').length)} icon={RefreshCw} />
        <SummaryCard title="Retrying" value={String(syncLogs.filter(s => s.status === 'Retrying').length)} icon={Activity} />
        <SummaryCard title="Failed" value={String(failed)} icon={AlertTriangle} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-display font-semibold">Sync Logs</h3>
          <Button size="sm" variant="outline" onClick={() => toast.success('Retrying all failed jobs')}><RefreshCw className="h-3 w-3 mr-1" /> Retry All Failed</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Module</th><th className="text-left p-3">Record</th><th className="text-left p-3">Attempt</th><th className="text-left p-3">Status</th><th className="text-left p-3">Message</th><th className="text-left p-3">Time</th><th className="text-left p-3">Action</th></tr>
            </thead>
            <tbody>
              {syncLogs.map(l => (
                <tr key={l.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs">{l.module}</td>
                  <td className="p-3 font-mono text-xs">{l.recordRef}</td>
                  <td className="p-3 text-xs">{l.attempt}</td>
                  <td className="p-3"><StatusBadge status={l.status} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{l.message}</td>
                  <td className="p-3 text-xs">{l.timestamp}</td>
                  <td className="p-3">{l.status === 'Failed' && <Button size="sm" variant="outline" onClick={() => toast.success('Retry queued')}>Retry</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// 8. AUDIT TRAIL
// ============================================================
export const AuditModule = () => {
  return (
    <ModulePage title="Audit Trail">
      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Time</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Role</th><th className="text-left p-3">Action</th><th className="text-left p-3">Module</th></tr>
            </thead>
            <tbody>
              {auditTrail.map(a => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs">{a.timestamp}</td>
                  <td className="p-3 font-medium">{a.actor}</td>
                  <td className="p-3 text-xs">{a.role}</td>
                  <td className="p-3 text-xs">{a.action}</td>
                  <td className="p-3"><StatusBadge status="Info" /> <span className="text-xs ml-1">{a.module}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModulePage>
  );
};

// ============================================================
// ROLE OVERVIEW DASHBOARDS
// ============================================================
const RoleOverview = ({
  roleKey,
  title,
  cards,
  alerts,
  recentActivity,
}: {
  roleKey: keyof typeof sidebars;
  title: string;
  cards: { title: string; value: string; icon: any; subtitle?: string }[];
  alerts: { type: 'success'|'warning'|'danger'|'info'; message: string }[];
  recentActivity?: { id: string; actor: string; action: string; timestamp: string }[];
}) => {
  const activity = recentActivity != null
    ? recentActivity
    : auditTrail.slice(0, 5).map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        timestamp: a.timestamp,
      }));

  return (
    <DashboardLayout title={title} navItems={sidebars[roleKey] as any}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</h3>
          <div className="space-y-2 text-sm">
            {activity.length === 0 ? (
              <div className="text-xs text-muted-foreground">No recent activity yet.</div>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-2 pb-2 border-b last:border-0">
                <div><div className="font-medium text-xs">{a.actor}</div><div className="text-xs text-muted-foreground">{a.action}</div></div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{a.timestamp.includes(' ') ? a.timestamp.split(' ')[1] : a.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Alerts & Insights</h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${
                a.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                a.type === 'warning' ? 'bg-amber-50 text-amber-800' :
                a.type === 'danger' ? 'bg-red-50 text-red-800' : 'bg-sky-50 text-sky-800'
              }`}>{a.message}</div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const NurseOverview = () => (
  <RoleOverview roleKey="nurse" title="Nursing Overview"
    cards={[
      { title: 'Active Patients', value: String(admissions.filter(a => a.status === 'Active').length), icon: Users },
      { title: 'Beds Occupied', value: String(beds.filter(b => b.status === 'Occupied').length) + '/' + beds.length, icon: BedDouble },
      { title: 'Pending Vitals', value: '7', icon: Stethoscope, subtitle: 'Due this shift' },
      { title: 'Lab Results to Note', value: String(labRequests.filter(r => r.status === 'Result Ready').length), icon: FlaskConical },
    ]}
    alerts={[
      { type: 'warning', message: 'ICU-01: vitals due in 15 minutes (Adebayo Ogundimu)' },
      { type: 'info', message: 'Ward C: Ngozi Okoro scheduled C-section at 11:00' },
      { type: 'success', message: 'All morning medications administered on time' },
    ]} />
);

export const PharmacistOverview = () => (
  <RoleOverview roleKey="pharmacist" title="Pharmacy Overview"
    cards={[
      { title: 'Pending Rx', value: String(prescriptions.filter(p => p.status === 'Pending').length), icon: Pill },
      { title: 'Dispensed Today', value: String(prescriptions.filter(p => p.status === 'Dispensed').length), icon: ClipboardCheck },
      { title: 'Low Stock', value: String(drugStock.filter(d => d.status === 'Low').length), icon: AlertTriangle },
      { title: 'Stock Value', value: formatCurrency(drugStock.reduce((s, d) => s + d.quantity * d.unitPrice, 0)), icon: TrendingUp },
    ]}
    alerts={[
      { type: 'danger', message: 'Metformin 500mg is OUT OF STOCK — reorder placed' },
      { type: 'warning', message: 'Amoxicillin 500mg below reorder level (320 < 400)' },
      { type: 'info', message: 'Diclofenac expires in 5 months — prioritize dispensing' },
    ]} />
);

export const LabOverview = () => (
  <RoleOverview roleKey="lab" title="Laboratory Overview"
    cards={[
      { title: 'Pending', value: String(labRequests.filter(r => r.status === 'Pending').length), icon: ClipboardList },
      { title: 'In Progress', value: String(labRequests.filter(r => r.status === 'In Progress').length), icon: FlaskConical },
      { title: 'Awaiting Verify', value: String(labRequests.filter(r => r.status === 'Result Ready').length), icon: ClipboardCheck },
      { title: 'Avg TAT', value: '3.2 hrs', icon: TrendingUp },
    ]}
    alerts={[
      { type: 'warning', message: '1 STAT request pending sample collection (Ibrahim Musa — Urine Culture)' },
      { type: 'success', message: 'All pregnancy tests verified within 30 min today' },
      { type: 'info', message: 'Reagent stock check: Malaria RDT kits running low' },
    ]} />
);

// ============================================================
// PATIENT IDENTITY & ENTRY ENGINE (Unified intake + identity resolution)
// Scenarios 1–6 + 8 covered here. Scenario 7 (duplicate review) below.
// ============================================================

type EntryChannel = 'walkin' | 'online' | 'referral';
type ResolutionStage = 'search' | 'matches' | 'create' | 'visit' | 'billing' | 'doctor';

// Module-level drafts store (dummy seed; mutated by Save Draft action)
export type PatientDraft = {
  draftId: string;
  surname: string; firstName: string; middleName?: string;
  mobile: string;
  patientType: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Resumed' | 'Abandoned';
  payload: Partial<Record<string, any>>;
};
export const PATIENT_DRAFTS: PatientDraft[] = [
  { draftId: 'DRF-9011', surname: 'Adebayo', firstName: 'Tunde', mobile: '08012345678', patientType: 'Walk-In Patient', createdBy: 'Aisha · Records', createdAt: '2026-04-28 08:42', updatedAt: '2026-04-28 09:12', status: 'Draft', payload: { surname: 'Adebayo', firstName: 'Tunde', mobile: '08012345678', gender: 'Male', dob: '1992-06-15', payCategory: 'Cash' } },
  { draftId: 'DRF-9012', surname: 'Okonkwo', firstName: 'Ngozi', middleName: 'A.', mobile: '08023456712', patientType: 'Walk-In Patient', createdBy: 'Tunde · Records', createdAt: '2026-04-28 09:05', updatedAt: '2026-04-28 09:18', status: 'Draft', payload: { surname: 'Okonkwo', firstName: 'Ngozi', middleName: 'A.', mobile: '08023456712', gender: 'Female', payCategory: 'NHIS', hmoName: 'NHIA' } },
  { draftId: 'DRF-9013', surname: 'Yakubu', firstName: 'Sani', mobile: '08107654300', patientType: 'Emergency Walk-In', createdBy: 'Aisha · Records', createdAt: '2026-04-28 09:31', updatedAt: '2026-04-28 09:32', status: 'Draft', payload: { surname: 'Yakubu', firstName: 'Sani', mobile: '08107654300', gender: 'Male' } },
  { draftId: 'DRF-9014', surname: 'Bello', firstName: 'Fatimah', mobile: '08033221199', patientType: 'Walk-In Patient', createdBy: 'Hafsat · Records', createdAt: '2026-04-27 16:11', updatedAt: '2026-04-27 16:42', status: 'Draft', payload: { surname: 'Bello', firstName: 'Fatimah', mobile: '08033221199', gender: 'Female', payCategory: 'HMO', hmoName: 'Hygeia' } },
  { draftId: 'DRF-9015', surname: 'Olamide', firstName: 'Bisi', mobile: '08056677889', patientType: 'Walk-In Patient', createdBy: 'Hafsat · Records', createdAt: '2026-04-27 14:22', updatedAt: '2026-04-27 14:55', status: 'Draft', payload: { surname: 'Olamide', firstName: 'Bisi', mobile: '08056677889', gender: 'Female' } },
];


const DUPLICATE_QUEUE = [
  {
    id: 'DUP-001',
    reason: 'Same phone number, similar name (created during EMR downtime)',
    a: { hospitalId: 'GFA HMS/2026/00145', name: 'John Doe', phone: '08012345678', dob: '1984-05-12', registered: '2026-03-25' },
    b: { hospitalId: 'GFA HMS/2026/00211', name: 'John A. Doe', phone: '08012345678', dob: '1984-05-12', registered: '2026-04-26' },
  },
  {
    id: 'DUP-002',
    reason: 'Phonetic match on name + matching DOB',
    a: { hospitalId: 'GFA HMS/2026/00146', name: 'Amina Yusuf', phone: '08023456789', dob: '1998-02-09', registered: '2026-03-25' },
    b: { hospitalId: 'GFA HMS/2026/00219', name: 'Aminah Yussuf', phone: '08023456790', dob: '1998-02-09', registered: '2026-04-27' },
  },
];

function fuzzyMatch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return patientRecords
    .map(p => {
      let score = 0;
      if (p.phone.includes(q)) score += 60;
      if (p.nin.includes(q)) score += 70;
      if (p.hospitalId.toLowerCase().includes(q)) score += 80;
      const name = p.name.toLowerCase();
      if (name.includes(q)) score += 40;
      else {
        const tokens = q.split(/\s+/);
        tokens.forEach(t => { if (t.length > 2 && name.includes(t.slice(0, 3))) score += 12; });
      }
      return { p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ------------- Walk-in Registration Wizard Types -------------
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { n: WizardStep; label: string; icon: any }[] = [
  { n: 1, label: 'Patient Info', icon: UserPlus },
  { n: 2, label: 'Contact & Address', icon: MapPin },
  { n: 3, label: 'Next of Kin', icon: Users },
  { n: 4, label: 'Payment', icon: CreditCard },
  { n: 5, label: 'Medical & Social', icon: Heart },
  { n: 6, label: 'Review & Complete', icon: ClipboardCheck },
];

const NIGERIAN_STATES = ['Lagos','Ogun','Oyo','Osun','Ondo','Ekiti','Edo','Delta','Anambra','Enugu','Imo','Abia','Rivers','Cross River','Akwa Ibom','Kano','Kaduna','Sokoto','Kebbi','Niger','Plateau','Benue','Bauchi','Borno','FCT'];

const NOK_RELATIONSHIPS = [
  'Spouse', 'Husband', 'Wife', 'Partner', 'Domestic Partner',
  'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Stepfather', 'Stepmother', 'Stepson', 'Stepdaughter', 'Half-brother', 'Half-sister',
  'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
  'Father-in-law', 'Mother-in-law', 'Son-in-law', 'Daughter-in-law', 'Brother-in-law', 'Sister-in-law',
  'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin',
  'Guardian', 'Legal Guardian', 'Foster Parent', 'Foster Child', 'Adoptive Parent', 'Adopted Child', 'Ward',
  'Caregiver', 'Hired Carer',
  'Friend', 'Neighbour', 'Colleague', 'Employer', 'Employee',
  'Religious Leader', 'Social Worker', 'Community Leader',
  'Relative (Other)', 'Other',
];

function nokRelationshipOptions(current: string) {
  if (current && !NOK_RELATIONSHIPS.includes(current)) return [current, ...NOK_RELATIONSHIPS];
  return NOK_RELATIONSHIPS;
}

const blankForm = {
  // Step 1
  patientType: 'Walk-In Patient', patientCategory: 'Outpatient',
  surname: '', firstName: '', middleName: '', gender: 'Male',
  dob: '', age: '', maritalStatus: 'Single', nationality: 'Nigerian',
  stateOfOrigin: 'Ogun', lga: '', religion: 'Christianity', ethnicity: 'Yoruba',
  nin: '', ninPhoto: false, passportPhoto: false, signature: false,
  // Step 2
  mobile: '', altPhone: '', email: '',
  houseNo: '', street: '', area: '', city: '', state: 'Ogun', country: 'Nigeria',
  commSms: true, commWhatsApp: true, commEmail: false,
  // Step 3
  nokName: '', nokRelationship: 'Spouse', nokPhone: '', nokAltPhone: '', nokOccupation: '', nokAddress: '',
  ecName: '', ecRelationship: 'Sibling', ecPhone: '', ecAddress: '',
  rrName: '', rrRelationship: 'Parent', rrPhone: '', rrAddress: '', rrOccupation: '',
  // Step 4
  payCategory: 'Cash', hmoName: '', hmoPlan: '', hmoNumber: '', authNumber: '', enrolleeNumber: '',
  occupation: '', employerName: '', employerAddress: '', employerPhone: '',
  regFee: '500', consultFee: '0', cardFee: '0',
  // Step 5
  bloodGroup: '', genotype: '', allergies: '', conditions: '', currentMeds: '',
  disability: '', specifyDisability: '', specialNeeds: '',
  educationLevel: '', employmentStatus: '', livingArrangement: '',
  mentalHealthHistory: '', prevPsychAdmission: '', prevPsychDiagnosis: '',
  alcoholUse: '', tobaccoUse: '', drugUse: '', familyMHHistory: '',
  referredBy: '', refHospital: '', refDoctor: '', refReason: '', refLetter: false,
};

type WalkInForm = typeof blankForm;

const parseFeeField = (v: string | number | undefined): number => {
  if (v === '' || v == null) return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const feeFieldDisplay = (v: string | number | undefined) => (v === '' || v == null ? '' : String(v));

const registrationChargeTotal = (form: Pick<WalkInForm, 'regFee' | 'consultFee' | 'cardFee'>) =>
  parseFeeField(form.regFee) + parseFeeField(form.consultFee) + parseFeeField(form.cardFee);

const NOT_AVAILABLE_LABEL = 'Not available';

function fieldOrNotAvailable(value: string): string {
  const t = value?.trim() ?? '';
  return t || NOT_AVAILABLE_LABEL;
}

function selectOptionsWithNotAvailable(options: string[], current: string): string[] {
  const base = [NOT_AVAILABLE_LABEL, ...options.filter((o) => o !== NOT_AVAILABLE_LABEL)];
  if (current && !base.includes(current)) return [current, ...base];
  return base;
}

function calcAge(dob: string): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  return String(Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))));
}

type WalkInDraft = PatientRegistrationDraft & {
  form: WalkInForm;
  step: WizardStep;
};

const logAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch {}
};

export const PatientIdentityEngine = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<EntryChannel>('walkin');
  const [emrOnline, setEmrOnline] = useState(true);
  const [query, setQuery] = useState('');

  // Online bookings (live ServiceBookings)
  const [onlineBookings, setOnlineBookings] = useState<StaffBooking[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'NEW' | 'RETURNING' | 'Pending'>('all');
  const [onlineDate, setOnlineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [onlineActionId, setOnlineActionId] = useState<number | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);

  // Walk-in wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<WalkInForm>(blankForm);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [registeredPersonId, setRegisteredPersonId] = useState<number | null>(null);
  const [registeredCard, setRegisteredCard] = useState<CardRecord | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [apiResults, setApiResults] = useState<PersonRecord[]>([]);
  const [apiSearching, setApiSearching] = useState(false);
  const [registrationQueue, setRegistrationQueue] = useState<CardRecord[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'Pending' | 'Paid'>('all');
  const [creatingEarly, setCreatingEarly] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<RecordsDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageSaving, setTriageSaving] = useState(false);
  const [triageForm, setTriageForm] = useState({
    weightKg: '',
    heightCm: '',
    bloodPressure: '',
    temperatureC: '',
    pulseBpm: '',
    respiratoryRate: '',
    spo2Pct: '',
    clinic: 'General OPD',
    priority: 'Routine',
    notes: '',
  });
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<WalkInDraft[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [queuingConsult, setQueuingConsult] = useState(false);
  const [queuingPersonId, setQueuingPersonId] = useState<number | null>(null);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [chargesError, setChargesError] = useState<string | null>(null);
  const [resumingDraft, setResumingDraft] = useState(false);

  const loadRegistrationCharges = useCallback(async () => {
    if (!isRecordsApiEnabled()) {
      setChargesLoading(false);
      setChargesError('Registration fees require an online connection to the hospital schedule.');
      return;
    }
    setChargesLoading(true);
    setChargesError(null);
    try {
      const charges = await fetchRegistrationCharges();
      setForm((f) => ({
        ...f,
        regFee: String(charges.regFee),
        consultFee: String(charges.consultFee),
        cardFee: String(charges.cardFee),
      }));
    } catch (err) {
      setChargesError(
        err instanceof ApiError ? err.message : 'Could not load registration fees',
      );
    } finally {
      setChargesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!wizardOpen || completed || step !== 4) return;
    void loadRegistrationCharges();
  }, [wizardOpen, completed, step, loadRegistrationCharges]);

  useEffect(() => {
    if (!wizardOpen || completed || step !== 4 || registeredPersonId == null) return;
    if (!isRecordsApiEnabled()) return;
    let cancelled = false;
    void getRegistrationPaymentStatusByPerson(registeredPersonId)
      .then(({ card }) => {
        if (cancelled) return;
        setRegisteredCard(card);
      })
      .catch(() => {
        /* keep existing card state */
      });
    return () => {
      cancelled = true;
    };
  }, [wizardOpen, completed, step, registeredPersonId]);

  useEffect(() => {
    void listRegistrationDrafts().then((rows) => {
      setDrafts(
        rows
          .filter((d) => d.status !== 'Submitted')
          .map((d) => ({
            ...d,
            form: { ...blankForm, ...(d.form as Partial<WalkInForm>) },
            step: Math.min(6, Math.max(1, d.step)) as WizardStep,
          })),
      );
    });
  }, []);

  const loadDashboardStats = async () => {
    if (!isRecordsApiEnabled()) {
      setDashboardStats(null);
      return;
    }
    setStatsLoading(true);
    try {
      setDashboardStats(await getDashboardStats());
    } catch {
      setDashboardStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRegistrationQueue = async (status?: 'Pending' | 'Paid') => {
    if (!isRecordsApiEnabled()) {
      setRegistrationQueue([]);
      return;
    }
    setQueueLoading(true);
    try {
      if (!status || status === 'Pending') {
        const pending = await listRegistrations({ paymentStatus: 'Pending', limit: 50 });
        if (status === 'Pending') {
          setRegistrationQueue(pending);
          return;
        }
        const paid = await listRegistrations({ paymentStatus: 'Paid', limit: 50 });
        setRegistrationQueue([...pending, ...paid]);
      } else {
        setRegistrationQueue(await listRegistrations({ paymentStatus: 'Paid', limit: 50 }));
      }
    } catch {
      setRegistrationQueue([]);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueFilter]);

  // Seed fuzzyMatch removed — identity search uses live PERSONS API only.
  const results = useMemo(() => [] as ReturnType<typeof fuzzyMatch>, []);
  const exact = undefined as undefined;
  const fuzzy = [] as Array<{ id: string; name: string; hospitalId: string; phone: string }>;

  // Live PERSONS search against the backend (debounced) when the API is on.
  useEffect(() => {
    if (!isPatientsApiEnabled() || query.trim().length < 2) {
      setApiResults([]);
      setApiSearching(false);
      return;
    }
    setApiSearching(true);
    const t = window.setTimeout(() => {
      searchPersons(query.trim())
        .then((rows) => setApiResults(Array.isArray(rows) ? rows : []))
        .catch(() => setApiResults([]))
        .finally(() => setApiSearching(false));
    }, 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const paymentCleared =
    registeredPersonId != null &&
    registeredCard != null &&
    registeredCard.paymentStatus !== 'Pending';

  const refreshPaymentStatus = async () => {
    if (registeredPersonId == null) return;
    setCheckingPayment(true);
    try {
      const { card, paymentCleared: cleared } =
        await getRegistrationPaymentStatusByPerson(registeredPersonId);
      setRegisteredCard(card);
      void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter);
      if (cleared) {
        toast.success('Payment confirmed by Accounts — continue to Medical & Complete');
      } else {
        toast.info('Payment still pending at Accounts / Cashier');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not check payment status');
    } finally {
      setCheckingPayment(false);
    }
  };

  const update = <K extends keyof WalkInForm>(k: K, v: WalkInForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const openWizard = (prefill?: Partial<WalkInForm>) => {
    setForm({ ...blankForm, ...(prefill || {}) });
    setStep(1); setGeneratedId(null); setRegisteredPersonId(null); setRegisteredCard(null);
    setCompleted(false); setActiveDraftId(null); setActiveBookingId(null);
    setSaveStatus('idle'); setLastSavedAt(null); setWizardOpen(true);
  };

  const loadOnlineBookings = useCallback(async () => {
    if (!isRecordsBookingsApiEnabled()) {
      setOnlineBookings([]);
      setOnlineError('Connect to the API to load online bookings.');
      setOnlineLoading(false);
      return;
    }
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const res = await listRecordsBookings({
        date: onlineDate,
        status: 'Booked',
        patientType: onlineFilter === 'NEW' || onlineFilter === 'RETURNING' ? onlineFilter : undefined,
        paymentStatus: onlineFilter === 'Pending' ? 'Pending' : undefined,
        limit: 100,
      });
      setOnlineBookings(res.items);
    } catch (err) {
      setOnlineError(err instanceof ApiError ? err.message : 'Could not load online bookings');
      setOnlineBookings([]);
    } finally {
      setOnlineLoading(false);
    }
  }, [onlineDate, onlineFilter]);

  useEffect(() => {
    if (channel !== 'online') return;
    void loadOnlineBookings();
  }, [channel, loadOnlineBookings]);

  const handleConvertBooking = async (booking: StaffBooking) => {
    setOnlineActionId(booking.bookingId);
    try {
      const { booking: b, resume } = await convertOnlineBooking(booking.bookingId);
      setActiveBookingId(b.bookingId);
      const mapped = resume.person ? mapPersonToWizardForm(resume.person) : {
        surname: b.patientName.split(' ').slice(1).join(' ') || b.patientName,
        firstName: b.patientName.split(' ')[0] || '',
        mobile: b.phone,
        email: b.email || '',
        patientType: 'Online Booking',
      };
      setForm({ ...blankForm, ...mapped, patientType: 'Online Booking' });
      setRegisteredPersonId(resume.person?.personId ?? b.personId);
      setGeneratedId(resume.person?.hospitalNo ?? b.hospitalNo);
      setRegisteredCard(resume.card ?? null);
      const nextStep = (resume.suggestedStep ?? 2) as WizardStep;
      setStep(nextStep);
      setCompleted(false);
      setActiveDraftId(null);
      setWizardOpen(true);
      toast.success(
        resume.paymentCleared
          ? `Converted ${b.bookingNo} — complete remaining registration details`
          : `Converted ${b.bookingNo} — registration card payment still pending at Cashier`,
      );
      void loadOnlineBookings();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not convert booking');
    } finally {
      setOnlineActionId(null);
    }
  };

  const handleCheckInBooking = async (booking: StaffBooking) => {
    setOnlineActionId(booking.bookingId);
    try {
      const { booking: b } = await checkInOnlineBooking(booking.bookingId);
      toast.success(`${b.bookingNo} checked in — patient queued for triage`);
      void loadOnlineBookings();
      navigate('/records/arrivals');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const raw = err.body as { message?: unknown } | undefined;
        const detail =
          raw?.message && typeof raw.message === 'object'
            ? (raw.message as {
                message?: string;
                bookingId?: number;
                amountDue?: number;
              })
            : (raw as { message?: string; bookingId?: number } | undefined);
        toast.error(
          (typeof detail?.message === 'string' ? detail.message : null) ||
            err.message ||
            'Payment required before check-in',
        );
        const id = detail?.bookingId ?? booking.bookingId;
        navigate(`/dashboard/cashier/bookings?bookingId=${id}`);
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not check in booking');
    } finally {
      setOnlineActionId(null);
    }
  };

  const next = () => setStep(s => (Math.min(6, s + 1) as WizardStep));
  const back = () => setStep(s => (Math.max(1, s - 1) as WizardStep));

  const validateStep1 = () => {
    if (!form.surname || !form.firstName || !form.dob) {
      toast.error('Surname (Last Name), First Name and Date of Birth are required');
      return false;
    }
    return true;
  };
  const validateStep2 = () => {
    if (!form.mobile || form.mobile.length < 10) {
      toast.error('Valid mobile number is required');
      return false;
    }
    return true;
  };

  const savedByName = (user as { name?: string; email?: string } | null)?.name
    || (user as { email?: string } | null)?.email
    || 'Records Officer';

  const persistDraft = async (opts?: {
    silent?: boolean;
    nextStep?: WizardStep;
    registeredPersonId?: number | null;
    generatedId?: string | null;
    registeredCardId?: number | null;
  }) => {
    const stepToSave = opts?.nextStep ?? step;
    setSaveStatus('saving');
    try {
      const draft = await upsertRegistrationDraft({
        id: activeDraftId,
        form,
        step: stepToSave,
        savedBy: savedByName,
        status: 'In Progress',
        registeredPersonId:
          opts?.registeredPersonId !== undefined ? opts.registeredPersonId : registeredPersonId,
        generatedId: opts?.generatedId !== undefined ? opts.generatedId : generatedId,
        registeredCardId:
          opts?.registeredCardId !== undefined
            ? opts.registeredCardId
            : registeredCard?.cardId ?? null,
      });
      setActiveDraftId(draft.id);
      setLastSavedAt(draft.updatedAt);
      setSaveStatus('saved');
      setDrafts((prev) => {
        const mapped: WalkInDraft = {
          ...draft,
          form: { ...blankForm, ...(draft.form as Partial<WalkInForm>) },
          step: Math.min(6, Math.max(1, draft.step)) as WizardStep,
        };
        return [mapped, ...prev.filter((d) => d.id !== draft.id)];
      });
      logAudit(`Draft autosaved (${draft.id}) — step ${stepToSave} by ${savedByName}`);
      if (!opts?.silent) toast.success(`Draft saved (${draft.id})`);
      return draft;
    } catch {
      setSaveStatus('error');
      if (!opts?.silent) toast.error('Could not save draft to IndexedDB');
      return null;
    }
  };

  const handleNext = async () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    // Step 3 — Next of Kin only; advance to Payment
    if (step === 3) {
      if (!form.nokName?.trim()) {
        toast.error('Next of Kin name is required before continuing');
        return;
      }
      await persistDraft({ silent: true, nextStep: 4 });
      setStep(4);
      return;
    }

    // Step 4 — create record + card, or continue after cashier payment
    if (step === 4) {
      if (registeredPersonId != null) {
        if (!paymentCleared) {
          toast.error('Card payment is still pending — patient must pay at Accounts / Cashier first');
          return;
        }
        await persistDraft({ silent: true, nextStep: 5 });
        setStep(5);
        return;
      }
      if (!isRecordsApiEnabled()) {
        toast.error('Registration requires an online connection to load fees from the hospital schedule');
        return;
      }
      if (chargesLoading) {
        toast.error('Loading registration fees from hospital schedule…');
        return;
      }
      if (chargesError) {
        toast.error(chargesError);
        return;
      }
      if (!form.regFee || !form.consultFee || !form.cardFee) {
        toast.error('Registration fees must be loaded from the hospital schedule before continuing');
        return;
      }
      setCreatingEarly(true);
      try {
        if (isRecordsApiEnabled()) {
          const payload = mapWizardFormToPersonPayload(
            form,
            activeDraftId || `reg-early-${Date.now()}`,
          );
          const person = await createRegistration(payload);
          const hospitalNo = person.hospitalNo || `GFA/HMS/${new Date().getFullYear()}/000000`;
          setGeneratedId(hospitalNo);
          setRegisteredPersonId(person.personId);
          setRegisteredCard(person.card ?? null);
          await persistDraft({
            silent: true,
            nextStep: 4,
            registeredPersonId: person.personId,
            generatedId: hospitalNo,
            registeredCardId: person.card?.cardId ?? null,
          });
          void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter);
          void loadDashboardStats();
          logAudit(
            `Person early-registered ${hospitalNo} (PERSON_ID ${person.personId}) — card payment pending — by ${savedByName}`,
          );
          toast.success(`Hospital No ${hospitalNo} created — send patient to Accounts for card payment`);
        } else {
          // Offline fallback: local patient row
          const address = [form.houseNo, form.street, form.area, form.city, form.state, form.country]
            .filter(Boolean)
            .join(', ');
          const created = db.patients.create({
            name: [form.firstName, form.middleName, form.surname].filter(Boolean).join(' '),
            firstName: form.firstName,
            lastName: form.surname,
            middleName: form.middleName || undefined,
            phone: form.mobile,
            nin: form.nin || undefined,
            sex: form.gender === 'Female' ? 'Female' : 'Male',
            dob: form.dob || undefined,
            age: form.age ? Number(form.age) : undefined,
            address: address || undefined,
            nextOfKin: form.nokName
              ? { name: form.nokName, phone: form.nokPhone || form.mobile, relationship: form.nokRelationship || 'Next of Kin' }
              : undefined,
            source: 'Walk-in',
            maritalStatus: form.maritalStatus,
            religion: form.religion,
            stateOfOrigin: form.stateOfOrigin,
            nationality: form.nationality,
            occupation: form.occupation,
            email: form.email || undefined,
          });
          setGeneratedId(created.hospitalId);
          setRegisteredPersonId(created.personId);
          setRegisteredCard({
            cardId: 0,
            personId: created.personId ?? 0,
            cardNo: created.hospitalId,
            cardType: 'Standard',
            paymentStatus: 'Pending',
            cardFee: parseFeeField(form.cardFee),
            regFee: parseFeeField(form.regFee),
            consultFee: parseFeeField(form.consultFee),
            totalAmount: registrationChargeTotal(form),
            paymentChannel: null,
            paymentRef: null,
            paidAt: null,
            confirmedBy: null,
            status: 'Pending Payment',
            createdBy: savedByName,
            createdAt: new Date().toISOString(),
          });
          await persistDraft({
            silent: true,
            nextStep: 4,
            registeredPersonId: created.personId ?? null,
            generatedId: created.hospitalId,
            registeredCardId: null,
          });
          toast.success(`Hospital No ${created.hospitalId} created offline — payment pending`);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const body = err.body as { existingPersonId?: number } | undefined;
          const existingId = body?.existingPersonId;
          if (existingId != null && Number.isFinite(existingId)) {
            try {
              const resume = await resumeRegistration({ personId: existingId });
              if (resume.person) {
                setForm((f) => ({
                  ...blankForm,
                  ...f,
                  ...mapPersonToWizardForm(resume.person!),
                }));
                setRegisteredPersonId(resume.person.personId);
                setGeneratedId(resume.person.hospitalNo ?? null);
              } else {
                setRegisteredPersonId(existingId);
              }
              setRegisteredCard(resume.card ?? null);
              const nextStep = (resume.suggestedStep ?? 4) as WizardStep;
              setStep(nextStep);
              await persistDraft({
                silent: true,
                nextStep,
                registeredPersonId: resume.person?.personId ?? existingId,
                generatedId: resume.person?.hospitalNo ?? null,
                registeredCardId: resume.card?.cardId ?? null,
              });
              toast.info(
                resume.paymentCleared
                  ? 'Patient record already exists — payment confirmed, continue registration'
                  : 'Patient record already exists — awaiting payment at Cashier',
              );
              return;
            } catch {
              /* fall through to generic error */
            }
          }
        }
        toast.error(err instanceof ApiError ? err.message : 'Could not create patient record');
      } finally {
        setCreatingEarly(false);
      }
      return;
    }

    const nextStep = Math.min(6, step + 1) as WizardStep;
    await persistDraft({ silent: true, nextStep });
    setStep(nextStep);
  };

  const handleBack = async () => {
    const prevStep = Math.max(1, step - 1) as WizardStep;
    await persistDraft({ silent: true, nextStep: prevStep });
    setStep(prevStep);
  };

  // Debounced autosave while typing (3s after last change) — IndexedDB recovery.
  useEffect(() => {
    if (!wizardOpen || completed) return;
    const hasContent = Boolean(form.surname || form.firstName || form.mobile);
    if (!hasContent) return;
    setSaveStatus('saving');
    const t = window.setTimeout(() => {
      void persistDraft({ silent: true });
    }, 3000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, wizardOpen, completed]);

  const saveDraft = () => {
    void persistDraft({ silent: false });
  };

  const continueDraft = async (d: WalkInDraft) => {
    setDraftsOpen(false);
    setWizardOpen(true);
    setActiveDraftId(d.id);
    setCompleted(false);
    setSaveStatus('saved');
    setLastSavedAt(d.updatedAt);
    setForm({ ...blankForm, ...d.form });
    setStep(d.step);
    setRegisteredPersonId(d.registeredPersonId ?? null);
    setGeneratedId(d.generatedId ?? null);
    setRegisteredCard(null);

    if (!isRecordsApiEnabled()) {
      toast.success('Draft loaded from IndexedDB');
      return;
    }

    setResumingDraft(true);
    try {
      const lookupQ =
        d.registeredPersonId == null
          ? [d.form.mobile, d.form.nin, d.generatedId].find((v) => String(v ?? '').trim())?.toString().trim()
          : undefined;
      const resume = await resumeRegistration({
        personId: d.registeredPersonId ?? undefined,
        q: lookupQ,
      });
      if (resume.person) {
        setForm({ ...blankForm, ...d.form, ...mapPersonToWizardForm(resume.person) });
        setRegisteredPersonId(resume.person.personId);
        setGeneratedId(resume.person.hospitalNo ?? d.generatedId ?? null);
      }
      setRegisteredCard(resume.card ?? null);
      if (resume.suggestedStep != null) {
        setStep(Math.max(d.step, resume.suggestedStep) as WizardStep);
      }
      if (resume.person) {
        toast.success(
          resume.paymentCleared
            ? 'Payment confirmed — continue medical information and complete registration'
            : 'Record found — awaiting Accounts payment confirmation',
        );
      } else {
        toast.success('Draft loaded from IndexedDB');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not sync registration status');
      toast.info('Draft loaded — use Check if paid or Registration Queue if payment was collected');
    } finally {
      setResumingDraft(false);
    }
  };

  const deleteDraft = async (id: string) => {
    await deleteRegistrationDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    logAudit(`Draft deleted (${id})`);
    setConfirmDeleteId(null);
    toast.success('Draft deleted successfully');
  };

  const continueFromCard = async (card: CardRecord) => {
    try {
      if (isRecordsApiEnabled()) {
        const { person, card: latestCard, paymentCleared: cleared } =
          await getRegistration(card.personId);
        setRegisteredCard(latestCard ?? card);
        const prefill = mapPersonToWizardForm(person);
        setForm({ ...blankForm, ...prefill });
        setGeneratedId(person.hospitalNo);
        setRegisteredPersonId(person.personId);
        setStep(cleared ? 5 : 4);
        toast.success(
          cleared
            ? 'Payment confirmed — continue medical information and complete registration'
            : 'Loaded record — awaiting Accounts payment confirmation',
        );
      } else {
        setRegisteredCard(card);
        setGeneratedId(card.person?.hospitalNo || card.cardNo);
        setRegisteredPersonId(card.personId);
        setForm({
          ...blankForm,
          surname: card.person?.lastName || '',
          firstName: card.person?.firstName || '',
          mobile: card.person?.patientPhoneNo || '',
        });
        const paid = card.paymentStatus !== 'Pending';
        setStep(paid ? 5 : 4);
        toast.success(
          paid
            ? 'Payment confirmed — continue medical information and complete registration'
            : 'Loaded record — awaiting Accounts payment confirmation',
        );
      }
      setCompleted(false);
      setActiveDraftId(null);
      setWizardOpen(true);
      setSaveStatus('idle');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load registration record');
    }
  };

  const completeRegistration = async () => {
    if (!validateStep1() || !validateStep2()) return;

    if (registeredPersonId == null && isRecordsApiEnabled()) {
      toast.error('Patient record was not created yet — go to Payment and create the record');
      setStep(4);
      return;
    }
    if (!paymentCleared) {
      toast.error('Card payment is still pending — patient must pay at Accounts first');
      setStep(4);
      return;
    }

    setSubmitting(true);
    try {
      let hospitalNo = generatedId || '';
      let personId = registeredPersonId ?? undefined;

      if (isRecordsApiEnabled() && registeredPersonId != null) {
        const address = [form.houseNo, form.street, form.area, form.city, form.state, form.country]
          .filter(Boolean)
          .join(', ');
        const updated = await completeRegistrationApi(registeredPersonId, {
          bloodGroup: fieldOrNotAvailable(form.bloodGroup),
          occupation: fieldOrNotAvailable(form.occupation),
          nameOfEmployer: fieldOrNotAvailable(form.employerName),
          nhisNo: form.hmoNumber || form.enrolleeNumber || undefined,
          residentialAddress: address || undefined,
          patientType: form.patientCategory || undefined,
          regType: form.patientType || undefined,
          email: form.email.trim() || undefined,
          status: 'Active',
        });
        hospitalNo = updated.hospitalNo || hospitalNo;
        personId = updated.personId;
      }

      setGeneratedId(hospitalNo);
      setRegisteredPersonId(personId ?? null);
      setCompleted(true);
      if (activeDraftId) {
        await markDraftSubmitted(activeDraftId);
        setDrafts((prev) => prev.filter((d) => d.id !== activeDraftId));
        setActiveDraftId(null);
      }
      void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter);
      void loadDashboardStats();
      logAudit(
        `Registration completed ${hospitalNo}${personId != null ? ` (PERSON_ID ${personId})` : ''} by ${savedByName}`,
      );
      toast.success(`Registration completed — ${hospitalNo}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not complete registration';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const triageBmi = useMemo(() => {
    const w = Number(triageForm.weightKg);
    const h = Number(triageForm.heightCm);
    if (!w || !h) return '';
    const m = h / 100;
    return (Math.round((w / (m * m)) * 100) / 100).toString();
  }, [triageForm.weightKg, triageForm.heightCm]);

  const saveTriageAndQueue = async () => {
    if (!paymentCleared) {
      toast.error('Card payment is pending — cashier must confirm payment first');
      return;
    }
    if (registeredPersonId == null && isTriageApiEnabled()) {
      toast.error('Missing person id — re-register the patient');
      return;
    }
    setTriageSaving(true);
    try {
      const num = (v: string) => (v.trim() ? Number(v) : undefined);
      if (isTriageApiEnabled() && registeredPersonId != null) {
        const row = await createTriage({
          personId: registeredPersonId,
          clinic: triageForm.clinic,
          status: 'Sent to Consultation',
          priority: triageForm.priority as 'Routine' | 'Urgent' | 'Emergency' | 'VIP' | 'Elderly / Special Needs',
          patientType: form.patientType.toLowerCase().includes('emergency')
            ? 'Emergency'
            : form.patientType.toLowerCase().includes('returning')
              ? 'Returning'
              : 'New',
          weightKg: num(triageForm.weightKg),
          heightCm: num(triageForm.heightCm),
          bloodPressure: triageForm.bloodPressure || undefined,
          temperatureC: num(triageForm.temperatureC),
          pulseBpm: num(triageForm.pulseBpm),
          respiratoryRate: num(triageForm.respiratoryRate),
          spo2Pct: num(triageForm.spo2Pct),
          notes: triageForm.notes || undefined,
        });
        logAudit(`Triage created ${row.queueNo} for PERSON_ID ${registeredPersonId}`);
        if (activeBookingId != null) {
          try {
            await completeOnlineBooking(activeBookingId);
            logAudit(`Online booking ${activeBookingId} marked completed after triage`);
          } catch {
            /* non-blocking */
          }
          setActiveBookingId(null);
        }
        toast.success(`Triage saved · ${row.queueNo} queued for consultation`);
      } else {
        // Offline: store PERSON_ID / hospital no reference only (no duplicated demographics)
        const key = 'gfa_triage_local_v1';
        const existing = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
        existing.unshift({
          personId: registeredPersonId,
          hospitalNo: generatedId,
          clinic: triageForm.clinic,
          priority: triageForm.priority,
          status: 'Sent to Consultation',
          weightKg: num(triageForm.weightKg) ?? null,
          heightCm: num(triageForm.heightCm) ?? null,
          bmi: triageBmi ? Number(triageBmi) : null,
          bloodPressure: triageForm.bloodPressure || null,
          temperatureC: num(triageForm.temperatureC) ?? null,
          pulseBpm: num(triageForm.pulseBpm) ?? null,
          respiratoryRate: num(triageForm.respiratoryRate) ?? null,
          spo2Pct: num(triageForm.spo2Pct) ?? null,
          notes: triageForm.notes || null,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 200)));
        logAudit(`Triage saved offline for ${generatedId}`);
        toast.success('Triage saved locally · queued for consultation');
      }
      setTriageOpen(false);
      setWizardOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save triage');
    } finally {
      setTriageSaving(false);
    }
  };

  // Directly queue the just-registered patient for the doctor's consultation queue.
  const queueRegisteredForConsult = async () => {
    if (!paymentCleared) {
      toast.error('Card payment is pending — cashier must confirm payment first');
      return;
    }
    if (!isTriageApiEnabled()) {
      toast.error('Triage API is not configured');
      return;
    }
    if (registeredPersonId == null) {
      toast.error('Missing person id — re-register the patient');
      return;
    }
    setQueuingConsult(true);
    try {
      const row = await createTriage({
        personId: registeredPersonId,
        clinic: triageForm.clinic,
        status: 'Sent to Consultation',
        priority: 'Routine',
        patientType: form.patientType.toLowerCase().includes('emergency')
          ? 'Emergency'
          : form.patientType.toLowerCase().includes('returning')
            ? 'Returning'
            : 'New',
      });
      logAudit(`Consultation queue ${row.queueNo} for PERSON_ID ${registeredPersonId}`);
      toast.success(`Added to Consultation Queue · ${row.queueNo}`);
      setWizardOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add to consultation queue');
    } finally {
      setQueuingConsult(false);
    }
  };

  // Queue an existing patient (from live PERSONS search) for the doctor's consultation queue.
  const queueExistingForConsult = async (person: PersonRecord) => {
    if (!isTriageApiEnabled()) {
      toast.error('Triage API is not configured');
      return;
    }
    setQueuingPersonId(person.personId);
    try {
      const row = await createTriage({
        personId: person.personId,
        clinic: 'General OPD',
        status: 'Sent to Consultation',
        priority: 'Routine',
        patientType: 'Returning',
      });
      logAudit(`Consultation queue ${row.queueNo} for PERSON_ID ${person.personId}`);
      const name = [person.firstName, person.lastName].filter(Boolean).join(' ') || `PERSON_ID ${person.personId}`;
      toast.success(`${name} added to Consultation Queue · ${row.queueNo}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add to consultation queue');
    } finally {
      setQueuingPersonId(null);
    }
  };

  const copyNokTo = (target: 'ec' | 'rr') => {
    if (!form.nokName && !form.nokPhone) {
      toast.error('Fill Next of Kin details first');
      return;
    }
    if (target === 'ec') {
      setForm(f => ({
        ...f,
        ecName: f.nokName,
        ecRelationship: f.nokRelationship,
        ecPhone: f.nokPhone,
        ecAddress: f.nokAddress,
      }));
      toast.success('Next of kin copied to emergency contact');
    } else {
      setForm(f => ({
        ...f,
        rrName: f.nokName,
        rrRelationship: f.nokRelationship,
        rrPhone: f.nokPhone,
        rrAddress: f.nokAddress,
        rrOccupation: f.nokOccupation,
      }));
      toast.success('Next of kin copied to responsible relative');
    }
  };


  const fullName = [form.surname, form.firstName, form.middleName].filter(Boolean).join(' ');

  const goToPatientDirectory = (opts?: { personId?: number; q?: string }) => {
    if (opts?.personId != null) {
      navigate(`/records/patient-directory/${opts.personId}/profile`);
      return;
    }
    if (opts?.q?.trim()) {
      navigate(`/records/directory?q=${encodeURIComponent(opts.q.trim())}`);
      return;
    }
    navigate('/records/directory');
  };

  // ------------ Render ------------
  return (
    <ModulePage title="Patient Entry Engine">
      {/* Records Dashboard Statistics — live from GET /api/records/dashboard-stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { t: 'Total Today', v: dashboardStats?.totalToday, i: Users, c: 'text-primary' },
          { t: 'New Today', v: dashboardStats?.newToday, i: UserPlus, c: 'text-emerald-600' },
          { t: 'Returning', v: dashboardStats?.returningToday, i: RefreshCw, c: 'text-sky-600' },
          { t: 'Walk-In', v: dashboardStats?.walkInToday, i: LogIn, c: 'text-amber-600' },
          { t: 'Emergency', v: dashboardStats?.emergencyToday, i: AlertTriangle, c: 'text-red-600' },
          { t: 'Pending Reg.', v: dashboardStats?.pendingRegistration, i: Pause, c: 'text-orange-600' },
          { t: 'Awaiting Triage', v: dashboardStats?.awaitingTriage, i: Activity, c: 'text-fuchsia-600' },
          { t: 'Awaiting Consult', v: dashboardStats?.awaitingConsultation, i: Stethoscope, c: 'text-teal-600' },
        ].map(s => (
          <div key={s.t} className="hms-section p-3">
            <div className="flex items-center justify-between mb-1">
              <s.i className={`h-4 w-4 ${s.c}`} />
              <button
                type="button"
                className="text-[10px] text-muted-foreground uppercase tracking-wider hover:text-foreground"
                onClick={() => void loadDashboardStats()}
                title="Refresh stats"
              >
                {statsLoading ? '…' : 'Live'}
              </button>
            </div>
            <div className="text-lg sm:text-xl font-bold tabular-nums break-words leading-tight">
              {s.v == null ? (isRecordsApiEnabled() ? (statsLoading ? '—' : '0') : '—') : s.v.toLocaleString('en-US')}
            </div>
            <div className="text-[11px] text-muted-foreground">{s.t}</div>
          </div>
        ))}
      </div>

      {/* Channel + EMR status bar */}
      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            { k: 'walkin', label: 'Walk-In', icon: LogIn, desc: 'Register patient at front desk' },
            { k: 'online', label: 'Online Booking', icon: Smartphone, desc: 'Convert pre-arrival booking' },
            { k: 'referral', label: 'Internal Referral', icon: Send, desc: 'Continue referred patient' },
          ] as { k: EntryChannel; label: string; icon: any; desc: string }[]).map(c => (
            <button key={c.k} onClick={() => { setChannel(c.k); setQuery(''); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ring-1 transition ${
                channel === c.k ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-border hover:bg-muted'
              }`} title={c.desc}>
              <c.icon className="h-4 w-4" /> {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">EMR Status:</span>
          <button onClick={() => setEmrOnline(v => !v)} className="flex items-center gap-2">
            <StatusBadge status={emrOnline ? 'Synced' : 'Down'} />
            <span className="text-xs text-muted-foreground underline">toggle</span>
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* WALK-IN CHANNEL */}
          {channel === 'walkin' && (
            <div className="hms-section p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" /> Search Existing Patient
                </h3>
                <span className="text-xs text-muted-foreground">Always search before registering</span>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Hospital Number / Phone / NIN / Patient Name" className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button size="sm" variant="outline" onClick={() => toast.info('QR scanner activated — point camera at patient card')}>
                  <QrCode className="h-4 w-4 mr-1" /> Scan QR Code
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info('Barcode scanner ready')}>
                  <ScanLine className="h-4 w-4 mr-1" /> Scan Barcode
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info('NIN verification queued')}>
                  <Fingerprint className="h-4 w-4 mr-1" /> Verify NIN
                </Button>
              </div>

              {/* Duplicate warning + matches */}
              {query && (
                <div className="space-y-2">
                  {isPatientsApiEnabled() && (
                    <div className="p-3 rounded-lg bg-sky-50 ring-1 ring-sky-200">
                      <div className="text-xs font-semibold text-sky-800 mb-2 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        {apiSearching
                          ? 'Searching PERSONS database…'
                          : `${(apiResults ?? []).length} match${(apiResults ?? []).length === 1 ? '' : 'es'} in PERSONS database`}
                      </div>
                      {!apiSearching && (apiResults ?? []).length === 0 && (
                        <div className="text-xs text-muted-foreground">No existing patient found — safe to register new.</div>
                      )}
                      <div className="space-y-1.5">
                        {(apiResults ?? []).map(p => (
                          <div key={p.personId} className="flex items-center justify-between bg-white rounded p-2 ring-1 ring-sky-200 text-xs">
                            <div>
                              <div className="font-medium">{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</div>
                              <div className="text-muted-foreground">{p.hospitalNo || '—'} • {p.patientPhoneNo || '—'}{p.email ? ` • ${p.email}` : ''}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => goToPatientDirectory({ personId: p.personId })}>
                                Use This
                              </Button>
                              <Button
                                size="sm"
                                disabled={queuingPersonId === p.personId}
                                onClick={() => void queueExistingForConsult(p)}
                                title="Add this patient to the doctor's consultation queue"
                              >
                                {queuingPersonId === p.personId ? (
                                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <Stethoscope className="h-3.5 w-3.5 mr-1" />
                                )}
                                {queuingPersonId === p.personId ? 'Adding…' : 'Add to Consultation'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!emrOnline && (
                    <div className="p-3 rounded-lg bg-amber-50 ring-1 ring-amber-200 text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div><b>EMR offline.</b> Local HMS lookup only. New records will be tagged <i>PENDING EMR SYNC</i>.</div>
                    </div>
                  )}
                  {exact && (
                    <div className="p-3 rounded-lg bg-red-50 ring-1 ring-red-200 text-xs text-red-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div><b>Duplicate detected.</b> Patient already exists — use existing record instead of registering again.</div>
                    </div>
                  )}
                  {exact && (
                    <div className="p-4 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-semibold">{exact.name}</div>
                        <div className="text-xs text-muted-foreground">{exact.hospitalId} • {exact.phone} • {exact.age}{exact.gender[0]} • {exact.insurance}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toast.info('Patient card sent to printer')}>
                          <Printer className="h-4 w-4 mr-1" /> Print Card
                        </Button>
                        <Button size="sm" onClick={() => goToPatientDirectory({ personId: Number(exact.id) || undefined, q: exact.hospitalId })}>
                          <Eye className="h-4 w-4 mr-1" /> View Patient
                        </Button>
                      </div>
                    </div>
                  )}
                  {!exact && fuzzy.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 ring-1 ring-amber-200">
                      <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> {fuzzy.length} possible match{fuzzy.length > 1 ? 'es' : ''} — confirm before registering
                      </div>
                      <div className="space-y-1.5">
                        {fuzzy.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-white rounded p-2 ring-1 ring-amber-200 text-xs">
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-muted-foreground">{p.hospitalId} • {p.phone}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => goToPatientDirectory({ personId: Number(p.id) || undefined, q: p.hospitalId })}>Use This</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Primary actions */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button onClick={() => openWizard()} className="h-12">
                  <UserPlus className="h-4 w-4 mr-1" /> Register New
                </Button>
                <Button variant="outline" onClick={() => setDraftsOpen(true)} className="h-12 relative">
                  <Play className="h-4 w-4 mr-1" /> Continue Draft
                  {drafts.length > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1">{drafts.length}</span>}
                </Button>
                <Button variant="outline" onClick={() => goToPatientDirectory({ q: query })} className="h-12">
                  <Eye className="h-4 w-4 mr-1" /> View Patient
                </Button>
                <Button variant="outline" onClick={() => toast.success('Patient card sent to printer')} className="h-12">
                  <Printer className="h-4 w-4 mr-1" /> Print Card
                </Button>
              </div>
            </div>
          )}

          {/* ONLINE CHANNEL */}
          {channel === 'online' && (
            <div className="hms-section p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-semibold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" /> Pre-Arrival Online Bookings
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    NEW patients: Convert to add remaining registration details. RETURNING: Check in (pay service fee at Cashier if unpaid). A clinician will be assigned.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadOnlineBookings()} disabled={onlineLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${onlineLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Input
                  type="date"
                  value={onlineDate}
                  onChange={(e) => setOnlineDate(e.target.value)}
                  className="w-auto"
                />
                {(['all', 'NEW', 'RETURNING', 'Pending'] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={onlineFilter === f ? 'default' : 'outline'}
                    onClick={() => setOnlineFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'Pending' ? 'Unpaid' : f}
                  </Button>
                ))}
              </div>
              {onlineLoading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading online bookings…</div>
              ) : onlineError ? (
                <div className="text-sm text-destructive py-6 text-center">{onlineError}</div>
              ) : onlineBookings.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No online bookings for {onlineDate}.
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineBookings.map((b) => (
                    <div key={b.bookingId} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted">
                      <div className="text-sm min-w-0">
                        <div className="font-medium flex flex-wrap items-center gap-2">
                          {b.patientName}
                          <span className="font-mono text-xs text-muted-foreground">{b.bookingNo}</span>
                          <StatusBadge status={b.patientType === 'NEW' ? 'New' : 'Returning'} />
                          <StatusBadge status={b.paymentStatus === 'Pending' ? 'Pending' : 'Paid'} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.phone}
                          {b.hospitalNo ? ` · ${b.hospitalNo}` : ''}
                          {' · '}{b.serviceName}
                          {b.department ? ` · ${b.department}` : ''}
                          {' · '}{b.startTime}–{b.endTime}
                          {' · '}{b.deliveryMode}
                          {b.amountDue > 0 && b.paymentStatus === 'Pending'
                            ? ` · Due ${formatCurrency(b.amountDue)}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {b.patientType === 'NEW' ? (
                          <Button
                            size="sm"
                            disabled={onlineActionId === b.bookingId}
                            onClick={() => void handleConvertBooking(b)}
                          >
                            {onlineActionId === b.bookingId ? 'Converting…' : 'Convert on Arrival'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={onlineActionId === b.bookingId}
                            onClick={() => void handleCheckInBooking(b)}
                          >
                            {onlineActionId === b.bookingId ? 'Checking in…' : 'Check in'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REFERRAL CHANNEL */}
          {channel === 'referral' && (
            <div className="hms-section p-5">
              <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Internal Referral
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Search Hospital ID of the referring department to continue the patient journey.</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="GFA HMS/2026/00145" className="pl-9" />
              </div>
              {exact && (
                <div className="p-4 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold">{exact.name}</div>
                    <div className="text-xs text-muted-foreground">{exact.hospitalId} • {exact.phone} • {exact.age}{exact.gender[0]}</div>
                  </div>
                  <Button size="sm" onClick={() => toast.success(`Referral accepted for ${exact.name}`)}>
                    <ArrowRight className="h-4 w-4 mr-1" /> Accept Referral
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDE PANEL — Rules + Audit */}
        <div className="space-y-4">
          <div className="hms-section p-4">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> System Rules</h3>
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li>• Always search before creating a person (PERSONS).</li>
              <li>• After Next of Kin, Hospital No + card are created (payment Pending).</li>
              <li>• Patient pays at Accounts / Cashier before Medical & Complete.</li>
              <li>• Use Registration Queue to continue after payment.</li>
              <li>• Auto-save to IndexedDB 3s after typing and on each step.</li>
              <li>• Full audit trail logged for every entry.</li>
            </ul>
          </div>
          <div className="hms-section p-4">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Smart Features</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { i: Fingerprint, t: 'NIN Verify' },
                { i: Camera, t: 'Facial Capture' },
                { i: QrCode, t: 'QR Scan' },
                { i: ScanLine, t: 'Barcode' },
                { i: Save, t: 'IndexedDB Autosave' },
                { i: Wifi, t: 'Offline Mode' },
              ].map(f => (
                <div key={f.t} className="flex items-center gap-2 p-2 rounded bg-muted/40">
                  <f.i className="h-3.5 w-3.5 text-primary" />
                  <span>{f.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hms-section p-4">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Recent Activity</h3>
            <div className="text-xs space-y-2">
              <div className="flex justify-between"><span>Registered GFA HMS/2026/00211</span><StatusBadge status="Active" /></div>
              <div className="flex justify-between"><span>Draft saved · Adebayo T.</span><StatusBadge status="Pending" /></div>
              <div className="flex justify-between"><span>Merged DUP-001 → 00145</span><StatusBadge status="Synced" /></div>
              <div className="flex justify-between"><span>NIN verified 12345678901</span><StatusBadge status="Active" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration queue — continue after Accounts payment */}
      <div className="hms-section p-5 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Registration Queue
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'Pending', 'Paid'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={queueFilter === f ? 'default' : 'outline'}
                onClick={() => setQueueFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'Pending' ? 'Awaiting Payment' : 'Paid — Continue'}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={queueLoading} onClick={() => void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter)}>
              <RefreshCw className={`h-4 w-4 mr-1 ${queueLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Patients created after Next of Kin appear here. Accounts/Cashier confirms card payment; then Records continues Medical &amp; Complete.
        </p>
        {!isPatientsApiEnabled() ? (
          <div className="text-sm text-muted-foreground p-4 text-center">Connect to the API (VITE_USE_API) to load the live registration queue.</div>
        ) : queueLoading ? (
          <div className="text-sm text-muted-foreground p-6 text-center">Loading registration queue…</div>
        ) : registrationQueue.length === 0 ? (
          <div className="text-sm text-muted-foreground p-6 text-center">No records in this filter. Register a patient through Next of Kin to open a card.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-left">
                <tr>
                  {['Hospital / Card', 'Patient', 'Phone', 'Amount', 'Payment', 'Opened By', 'Created', 'Action'].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrationQueue.map((c) => {
                  const name = [c.person?.firstName, c.person?.lastName].filter(Boolean).join(' ') || '—';
                  const pending = c.paymentStatus === 'Pending';
                  return (
                    <tr key={c.cardId} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono">
                        <div>{c.person?.hospitalNo || c.cardNo}</div>
                        <div className="text-muted-foreground">{c.cardNo}</div>
                      </td>
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2">{c.person?.patientPhoneNo || '—'}</td>
                      <td className="px-3 py-2 font-semibold">{formatCurrency(c.totalAmount)}</td>
                      <td className="px-3 py-2"><StatusBadge status={pending ? 'Pending' : 'Active'} /></td>
                      <td className="px-3 py-2">{c.createdBy || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {pending ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => void continueFromCard(c)}>View</Button>
                              <Button size="sm" variant="outline" onClick={async () => {
                                try {
                                  const gate = await getCardForPerson(c.personId);
                                  setRegistrationQueue((prev) => prev.map((row) => row.cardId === c.cardId ? (gate.card ?? row) : row));
                                  toast.info(gate.paymentCleared ? 'Payment confirmed — you can Continue' : 'Still awaiting payment');
                                  if (gate.paymentCleared) void loadRegistrationQueue(queueFilter === 'all' ? undefined : queueFilter);
                                } catch (err) {
                                  toast.error(err instanceof ApiError ? err.message : 'Check failed');
                                }
                              }}>Check Payment</Button>
                            </>
                          ) : (
                            <Button size="sm" onClick={() => void continueFromCard(c)}>
                              <Play className="h-3.5 w-3.5 mr-1" /> Continue
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================ WIZARD MODAL ================ */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> New Person Registration
              {generatedId && <span className="ml-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded ring-1 ring-emerald-200">{generatedId}</span>}
            </DialogTitle>
            <DialogDescription>Walk-in registration. The ₦500 fee is collected at Cashier before triage.</DialogDescription>
          </DialogHeader>

          {resumingDraft && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground ring-1 ring-border mb-2">
              <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
              Syncing registration and payment status from hospital records…
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-2 text-xs">
            <span className="text-muted-foreground">
              Maps to PERSONS · Last Name / First Name / Middle Name
            </span>
            <span className={
              saveStatus === 'saving' ? 'text-amber-700' :
              saveStatus === 'saved' ? 'text-emerald-700' :
              saveStatus === 'error' ? 'text-red-700' : 'text-muted-foreground'
            }>
              {saveStatus === 'saving' && 'Saving draft…'}
              {saveStatus === 'saved' && `Draft saved${lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}`}
              {saveStatus === 'error' && 'Draft save failed'}
              {saveStatus === 'idle' && 'Autosave ready'}
            </span>
          </div>

          {/* Stepper */}
          <div className="overflow-x-auto -mx-2 px-2 mb-3">
            <div className="flex gap-2 min-w-max">
              {STEPS.map(s => {
                const active = step === s.n;
                const done = step > s.n || completed;
                return (
                  <div key={s.n} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                    done ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                    active ? 'bg-primary/10 text-primary ring-1 ring-primary/30' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <span className={`h-5 w-5 rounded-full grid place-items-center text-[10px] ${done ? 'bg-emerald-600 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                      {done ? <Check className="h-3 w-3" /> : s.n}
                    </span>
                    {s.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary transition-all" style={{ width: `${(completed ? 6 : step) / 6 * 100}%` }} />
          </div>

          {/* Step bodies */}
          {!completed && step === 1 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Patient Type *</Label>
                  <Select value={form.patientType} onValueChange={v => update('patientType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Walk-In Patient','Referral Patient','Emergency Patient','Returning Patient'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Patient Category *</Label>
                  <Select value={form.patientCategory} onValueChange={v => update('patientCategory', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Outpatient','Inpatient','Emergency'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Surname / Last Name *</Label><Input value={form.surname} onChange={e => update('surname', e.target.value)} placeholder="PERSONS.LAST_NAME" /></div>
                <div><Label>First Name *</Label><Input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="PERSONS.FIRST_NAME" /></div>
                <div><Label>Middle Name</Label><Input value={form.middleName} onChange={e => update('middleName', e.target.value)} placeholder="PERSONS.MIDDLE_NAME" /></div>
                <div><Label>Gender *</Label>
                  <Select value={form.gender} onValueChange={v => update('gender', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Male','Female'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => { update('dob', e.target.value); update('age', calcAge(e.target.value)); }} /></div>
                <div><Label>Age (auto)</Label><Input value={form.age} disabled placeholder="—" /></div>
                <div><Label>Marital Status</Label>
                  <Select value={form.maritalStatus} onValueChange={v => update('maritalStatus', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Single','Married','Divorced','Widowed','Separated'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => update('nationality', e.target.value)} /></div>
                <div><Label>Religion</Label>
                  <Select value={form.religion} onValueChange={v => update('religion', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Christianity','Islam','Traditional','Other'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>State of Origin</Label>
                  <Select value={form.stateOfOrigin} onValueChange={v => update('stateOfOrigin', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{NIGERIAN_STATES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>LGA</Label><Input value={form.lga} onChange={e => update('lga', e.target.value)} /></div>
                <div><Label>Ethnicity / Tribe</Label><Input value={form.ethnicity} onChange={e => update('ethnicity', e.target.value)} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>NIN</Label>
                  <div className="flex gap-2">
                    <Input value={form.nin} onChange={e => update('nin', e.target.value)} placeholder="11-digit NIN" />
                    <Button type="button" variant="outline" onClick={() => toast.success('NIN verified ✓')}><Fingerprint className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <Button type="button" variant="outline" onClick={() => { update('ninPhoto', true); toast.success('National ID uploaded'); }}>
                    <Upload className="h-4 w-4 mr-1" /> {form.ninPhoto ? 'ID ✓' : 'Upload ID'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { update('passportPhoto', true); toast.success('Passport photo captured'); }}>
                    <Camera className="h-4 w-4 mr-1" /> {form.passportPhoto ? 'Photo ✓' : 'Capture Photo'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { update('signature', true); toast.success('Signature captured'); }}>
                    <FileText className="h-4 w-4 mr-1" /> {form.signature ? 'Signature ✓' : 'Signature'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!completed && step === 2 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Mobile Number *</Label><Input value={form.mobile} onChange={e => update('mobile', e.target.value)} placeholder="0801..." /></div>
                <div><Label>Alternate Phone</Label><Input value={form.altPhone} onChange={e => update('altPhone', e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} /></div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>House Number</Label><Input value={form.houseNo} onChange={e => update('houseNo', e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Street Address</Label><Input value={form.street} onChange={e => update('street', e.target.value)} /></div>
                <div><Label>Area</Label><Input value={form.area} onChange={e => update('area', e.target.value)} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => update('city', e.target.value)} /></div>
                <div><Label>State</Label>
                  <Select value={form.state} onValueChange={v => update('state', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{NIGERIAN_STATES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => update('country', e.target.value)} /></div>
              </div>
              <div>
                <Label className="mb-2 block">Communication Preference</Label>
                <div className="flex gap-2 flex-wrap">
                  {([['commSms','SMS',Smartphone],['commWhatsApp','WhatsApp',Phone],['commEmail','Email',Send]] as const).map(([k,l,Icon]) => (
                    <button key={k} type="button" onClick={() => update(k as any, !form[k as keyof WalkInForm] as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ring-1 ${form[k as keyof WalkInForm] ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-border'}`}>
                      <Icon className="h-3.5 w-3.5" /> {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!completed && step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Next of Kin</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Full Name</Label><Input value={form.nokName} onChange={e => update('nokName', e.target.value)} /></div>
                  <div><Label>Relationship</Label>
                    <Select value={form.nokRelationship} onValueChange={v => update('nokRelationship', v)}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>{nokRelationshipOptions(form.nokRelationship).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Phone</Label><Input value={form.nokPhone} onChange={e => update('nokPhone', e.target.value)} /></div>
                  <div><Label>Alternate Phone</Label><Input value={form.nokAltPhone} onChange={e => update('nokAltPhone', e.target.value)} /></div>
                  <div><Label>Occupation</Label><Input value={form.nokOccupation} onChange={e => update('nokOccupation', e.target.value)} /></div>
                  <div><Label>Address</Label><Input value={form.nokAddress} onChange={e => update('nokAddress', e.target.value)} /></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 ring-1 ring-primary/20">
                <Button type="button" size="sm" variant="outline" onClick={() => copyNokTo('ec')}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Use Next of Kin as Emergency Contact
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => copyNokTo('rr')}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Use Next of Kin as Responsible Relative
                </Button>
                <span className="text-xs text-muted-foreground self-center">Copied values remain editable.</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Emergency Contact</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Full Name</Label><Input value={form.ecName} onChange={e => update('ecName', e.target.value)} /></div>
                  <div><Label>Relationship</Label>
                    <Select value={form.ecRelationship} onValueChange={v => update('ecRelationship', v)}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>{nokRelationshipOptions(form.ecRelationship).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Phone</Label><Input value={form.ecPhone} onChange={e => update('ecPhone', e.target.value)} /></div>
                  <div><Label>Address</Label><Input value={form.ecAddress} onChange={e => update('ecAddress', e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Heart className="h-4 w-4 text-rose-600" /> Responsible Relative (Psychiatric / Elderly)</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Full Name</Label><Input value={form.rrName} onChange={e => update('rrName', e.target.value)} /></div>
                  <div><Label>Relationship</Label>
                    <Select value={form.rrRelationship} onValueChange={v => update('rrRelationship', v)}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>{nokRelationshipOptions(form.rrRelationship).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Phone</Label><Input value={form.rrPhone} onChange={e => update('rrPhone', e.target.value)} /></div>
                  <div><Label>Occupation</Label><Input value={form.rrOccupation} onChange={e => update('rrOccupation', e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>Address</Label><Input value={form.rrAddress} onChange={e => update('rrAddress', e.target.value)} /></div>
                </div>
              </div>
            </div>
          )}

          {!completed && step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Registration Charges</h4>
                <p className="text-xs text-muted-foreground mb-2">Fees from hospital schedule — not editable by front desk.</p>
                {!isRecordsApiEnabled() && (
                  <div className="mb-3 p-2 rounded bg-amber-50 text-amber-900 text-xs ring-1 ring-amber-200">
                    Online connection required to load registration fees. Connect to the hospital API before continuing.
                  </div>
                )}
                {isRecordsApiEnabled() && chargesLoading && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Loading fees from hospital schedule…
                  </div>
                )}
                {isRecordsApiEnabled() && chargesError && !chargesLoading && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs ring-1 ring-destructive/20">
                    <span>{chargesError}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => void loadRegistrationCharges()}>
                      Retry
                    </Button>
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>Registration Fee (₦)</Label><Input type="text" readOnly tabIndex={-1} className="bg-muted" value={feeFieldDisplay(form.regFee)} disabled /></div>
                  <div><Label>Consultation Fee (₦)</Label><Input type="text" readOnly tabIndex={-1} className="bg-muted" value={feeFieldDisplay(form.consultFee)} disabled /></div>
                  <div><Label>Card Fee (₦)</Label><Input type="text" readOnly tabIndex={-1} className="bg-muted" value={feeFieldDisplay(form.cardFee)} disabled /></div>
                </div>
                <div className="mt-2 text-sm flex justify-between p-2 rounded bg-primary/5 ring-1 ring-primary/20">
                  <span className="font-medium">Total due at Accounts</span>
                  <span className="font-bold">{formatCurrency(registrationChargeTotal(form))}</span>
                </div>
              </div>

              {(generatedId || registeredCard) ? (
                <div className={`p-4 rounded-lg ring-1 ${paymentCleared ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`font-semibold flex items-center gap-2 ${paymentCleared ? 'text-emerald-800' : 'text-amber-900'}`}>
                        <CreditCard className="h-5 w-5" />
                        {paymentCleared ? 'Card payment confirmed' : 'Card payment pending'}
                      </div>
                      <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Hospital No: </span><b className="font-mono">{generatedId || '—'}</b></div>
                        <div><span className="text-muted-foreground">Card No: </span><b className="font-mono">{registeredCard?.cardNo || generatedId || '—'}</b></div>
                        <div><span className="text-muted-foreground">Total due: </span><b>{formatCurrency(registeredCard?.totalAmount ?? registrationChargeTotal(form))}</b></div>
                        <div><span className="text-muted-foreground">Status: </span>
                          <StatusBadge status={paymentCleared ? 'Active' : 'Pending'} />
                        </div>
                      </div>
                      {!paymentCleared && (
                        <p className="text-xs text-amber-800 mt-3">
                          Patient record and card are already created. Direct the patient to <b>Accounts / Cashier</b> to pay.
                          You can close this wizard and continue later from the <b>Registration Queue</b> table below.
                        </p>
                      )}
                      {paymentCleared && (
                        <p className="text-xs text-emerald-800 mt-3">
                          Payment received{registeredCard?.confirmedBy ? ` by ${registeredCard.confirmedBy}` : ''}. Continue to Medical & Social, then Complete Registration.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!paymentCleared && (
                        <Button size="sm" variant="outline" disabled={checkingPayment} onClick={() => void refreshPaymentStatus()}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${checkingPayment ? 'animate-spin' : ''}`} />
                          {checkingPayment ? 'Checking…' : 'Check if paid'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs border-t pt-3">
                    <div>Reg fee: {formatCurrency(registeredCard?.regFee ?? parseFeeField(form.regFee))}</div>
                    <div>Consult fee: {formatCurrency(registeredCard?.consultFee ?? parseFeeField(form.consultFee))}</div>
                    <div>Card fee: {formatCurrency(registeredCard?.cardFee ?? parseFeeField(form.cardFee))}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                  Review registration charges above, then click <b>Create Record &amp; Card</b> to issue Hospital No and patient card. Payment is collected at Cashier.
                </div>
              )}

              <RecordsHmoEligibilityPanel
                personId={registeredPersonId}
                memberNo={form.hmoNumber || form.enrolleeNumber}
                onMemberNoChange={(v) => {
                  update('hmoNumber', v);
                  update('enrolleeNumber', v);
                }}
              />

              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Employment</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Occupation</Label><Input value={form.occupation} onChange={e => update('occupation', e.target.value)} /></div>
                  <div><Label>Employer Name</Label><Input value={form.employerName} onChange={e => update('employerName', e.target.value)} /></div>
                  <div><Label>Employer Address</Label><Input value={form.employerAddress} onChange={e => update('employerAddress', e.target.value)} /></div>
                  <div><Label>Employer Phone</Label><Input value={form.employerPhone} onChange={e => update('employerPhone', e.target.value)} /></div>
                </div>
              </div>
            </div>
          )}

          {!completed && step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Heart className="h-4 w-4 text-rose-600" /> Basic Medical Information</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>Blood Group</Label>
                    <Select value={form.bloodGroup || NOT_AVAILABLE_LABEL} onValueChange={v => update('bloodGroup', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['O+','O-','A+','A-','B+','B-','AB+','AB-'], form.bloodGroup).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Genotype</Label>
                    <Select value={form.genotype || NOT_AVAILABLE_LABEL} onValueChange={v => update('genotype', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['AA','AS','SS','AC','SC'], form.genotype).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Disability Status</Label>
                    <Select value={form.disability || NOT_AVAILABLE_LABEL} onValueChange={v => { const val = v === NOT_AVAILABLE_LABEL ? '' : v; update('disability', val); if (val !== 'Other') update('specifyDisability', ''); }}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['None','Physical Disability','Visual Impairment','Hearing Impairment','Speech Impairment','Intellectual Disability','Mental Health Condition','Other'], form.disability).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.disability === 'Other' && (
                    <div className="md:col-span-3">
                      <Label>Specify Disability</Label>
                      <Input value={form.specifyDisability} onChange={e => update('specifyDisability', e.target.value)} placeholder="Enter disability details (optional)" />
                    </div>
                  )}
                  <div className="md:col-span-3"><Label>Allergies</Label><Input value={form.allergies} onChange={e => update('allergies', e.target.value)} placeholder="e.g. Penicillin, peanuts" /></div>
                  <div className="md:col-span-3"><Label>Existing Medical Conditions</Label><Input value={form.conditions} onChange={e => update('conditions', e.target.value)} /></div>
                  <div className="md:col-span-3"><Label>Current Medications</Label><Input value={form.currentMeds} onChange={e => update('currentMeds', e.target.value)} /></div>
                  <div className="md:col-span-3"><Label>Special Needs</Label><Input value={form.specialNeeds} onChange={e => update('specialNeeds', e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Brain className="h-4 w-4 text-purple-600" /> Psychiatric / Specialist Hospital Information</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>Educational Level</Label>
                    <Select value={form.educationLevel || NOT_AVAILABLE_LABEL} onValueChange={v => update('educationLevel', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['None','Primary','Secondary','Tertiary','Postgraduate'], form.educationLevel).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Employment Status</Label>
                    <Select value={form.employmentStatus || NOT_AVAILABLE_LABEL} onValueChange={v => update('employmentStatus', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['Employed','Self-Employed','Unemployed','Student','Retired'], form.employmentStatus).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Living Arrangement</Label>
                    <Select value={form.livingArrangement || NOT_AVAILABLE_LABEL} onValueChange={v => update('livingArrangement', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['With Family','Alone','Hostel','Institution','Homeless'], form.livingArrangement).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3"><Label>Mental Health History</Label><Input value={form.mentalHealthHistory} onChange={e => update('mentalHealthHistory', e.target.value)} /></div>
                  <div><Label>Previous Psych. Admission</Label>
                    <Select value={form.prevPsychAdmission || NOT_AVAILABLE_LABEL} onValueChange={v => update('prevPsychAdmission', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['No','Yes'], form.prevPsychAdmission).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Previous Psych. Diagnosis</Label><Input value={form.prevPsychDiagnosis} onChange={e => update('prevPsychDiagnosis', e.target.value)} /></div>
                  <div><Label>Alcohol Use</Label>
                    <Select value={form.alcoholUse || NOT_AVAILABLE_LABEL} onValueChange={v => update('alcoholUse', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['Never','Occasional','Regular','Heavy'], form.alcoholUse).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Tobacco Use</Label>
                    <Select value={form.tobaccoUse || NOT_AVAILABLE_LABEL} onValueChange={v => update('tobaccoUse', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['Never','Former','Current'], form.tobaccoUse).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Drug Use</Label>
                    <Select value={form.drugUse || NOT_AVAILABLE_LABEL} onValueChange={v => update('drugUse', v === NOT_AVAILABLE_LABEL ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Not available" /></SelectTrigger>
                      <SelectContent>{selectOptionsWithNotAvailable(['Never','Former','Current'], form.drugUse).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3"><Label>Family History of Mental Illness</Label><Input value={form.familyMHHistory} onChange={e => update('familyMHHistory', e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Referral Information</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Referred By</Label><Input value={form.referredBy} onChange={e => update('referredBy', e.target.value)} /></div>
                  <div><Label>Referring Hospital</Label><Input value={form.refHospital} onChange={e => update('refHospital', e.target.value)} /></div>
                  <div><Label>Referring Doctor</Label><Input value={form.refDoctor} onChange={e => update('refDoctor', e.target.value)} /></div>
                  <div><Label>Reason for Referral</Label><Input value={form.refReason} onChange={e => update('refReason', e.target.value)} /></div>
                  <div>
                    <Button type="button" variant="outline" onClick={() => { update('refLetter', true); toast.success('Referral letter uploaded'); }}>
                      <Upload className="h-4 w-4 mr-1" /> {form.refLetter ? 'Letter ✓' : 'Upload Letter'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!completed && step === 6 && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg ring-1 ring-border bg-muted/30 grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name: </span><b>{fullName || '—'}</b></div>
                <div><span className="text-muted-foreground">Gender / DOB: </span>{form.gender} • {form.dob || '—'} ({form.age || '—'}y)</div>
                <div><span className="text-muted-foreground">Patient Type: </span>{form.patientType}</div>
                <div><span className="text-muted-foreground">Category: </span>{form.patientCategory}</div>
                <div><span className="text-muted-foreground">Mobile: </span>{form.mobile || '—'}</div>
                <div><span className="text-muted-foreground">NIN: </span>{form.nin || '—'}</div>
                <div className="md:col-span-2"><span className="text-muted-foreground">Address: </span>{[form.houseNo, form.street, form.area, form.city, form.state].filter(Boolean).join(', ') || '—'}</div>
                <div><span className="text-muted-foreground">Next of Kin: </span>{form.nokName || '—'} ({form.nokPhone || '—'})</div>
                <div><span className="text-muted-foreground">Emergency: </span>{form.ecName || '—'} ({form.ecPhone || '—'})</div>
                <div><span className="text-muted-foreground">Payment: </span>{paymentCleared ? 'Collected at Cashier' : 'Pending at Cashier'}</div>
                <div><span className="text-muted-foreground">Total Charges: </span><b>{formatCurrency(registeredCard?.totalAmount ?? registrationChargeTotal(form))}</b></div>
                <div><span className="text-muted-foreground">Blood / Genotype: </span>{fieldOrNotAvailable(form.bloodGroup)} • {fieldOrNotAvailable(form.genotype)}</div>
                <div><span className="text-muted-foreground">Allergies: </span>{fieldOrNotAvailable(form.allergies)}</div>
              </div>
              <p className="text-xs text-muted-foreground">Review carefully. Click <b>Complete Registration</b> only after Accounts has confirmed card payment.</p>
            </div>
          )}

          {completed && generatedId && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2"><Check className="h-5 w-5" /> Registration Successful</div>
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Hospital Number</div><div className="font-mono font-bold">{generatedId}</div></div>
                  <div><div className="text-xs text-muted-foreground">Patient ID</div><div className="font-mono font-bold">PID-{Date.now().toString().slice(-6)}</div></div>
                  <div className="flex items-center gap-2"><QrCode className="h-10 w-10 text-primary" /><span className="text-xs text-muted-foreground">QR & Barcode generated</span></div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Patient Wallet • Account • Medical Record File created automatically.
                  {!emrOnline && <span className="text-amber-700"> · Tagged PENDING EMR SYNC.</span>}
                </div>
              </div>

              {/* Card payment gate — cashier must confirm before the patient proceeds */}
              {registeredCard && (
                <div className={`p-4 rounded-lg ring-1 ${paymentCleared ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <div className={`font-semibold flex items-center gap-2 ${paymentCleared ? 'text-emerald-700' : 'text-amber-800'}`}>
                        <CreditCard className="h-4 w-4" />
                        Card {registeredCard.cardNo} — {formatCurrency(registeredCard.totalAmount)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {paymentCleared
                          ? `Payment ${registeredCard.paymentStatus}${registeredCard.confirmedBy ? ` · confirmed by ${registeredCard.confirmedBy}` : ''} — patient can proceed.`
                          : 'Payment PENDING — send the patient to the cashier desk. Registration cannot continue until the cashier confirms payment.'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={paymentCleared ? 'Active' : 'Pending'} />
                      {!paymentCleared && (
                        <Button size="sm" variant="outline" disabled={checkingPayment} onClick={() => void refreshPaymentStatus()}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${checkingPayment ? 'animate-spin' : ''}`} />
                          {checkingPayment ? 'Checking…' : 'Check Payment'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => toast.success('Registration slip printed')}><Printer className="h-4 w-4 mr-1" /> Print Slip</Button>
                <Button variant="outline" disabled={!paymentCleared} onClick={() => toast.success('Patient card printed')}><Printer className="h-4 w-4 mr-1" /> Print Card</Button>
                <Button variant="outline" onClick={() => toast.success(`SMS sent to ${form.mobile}`)}><Smartphone className="h-4 w-4 mr-1" /> Send SMS</Button>
                <Button variant="outline" onClick={() => toast.success(`WhatsApp sent to ${form.mobile}`)}><Phone className="h-4 w-4 mr-1" /> WhatsApp</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-2 pt-2">
                <Button disabled={!paymentCleared} title={paymentCleared ? undefined : 'Blocked until cashier confirms card payment'} onClick={() => { setTriageOpen(true); }}>
                  <Activity className="h-4 w-4 mr-1" /> Proceed to Triage
                </Button>
                <Button variant="outline" disabled={!paymentCleared} onClick={() => toast.success('Routed to Nursing Station')}>
                  <Heart className="h-4 w-4 mr-1" /> Nursing Station
                </Button>
                <Button variant="outline" disabled={!paymentCleared || queuingConsult} onClick={() => void queueRegisteredForConsult()}>
                  {queuingConsult ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Stethoscope className="h-4 w-4 mr-1" />}
                  {queuingConsult ? 'Adding…' : 'Consultation Queue'}
                </Button>
              </div>
              {!paymentCleared && (
                <p className="text-xs text-amber-700">
                  Triage, nursing and consultation stay locked until the cashier marks the card payment as Paid.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t mt-3">
            {!completed ? (
              <>
                <div className="flex gap-2 mr-auto">
                  <Button variant="outline" onClick={saveDraft}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
                  {step > 1 && <Button variant="outline" onClick={() => void handleBack()}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>}
                </div>
                {step < 6 ? (
                  <Button
                    disabled={
                      resumingDraft ||
                      creatingEarly ||
                      (step === 4 && registeredPersonId != null && !paymentCleared)
                    }
                    onClick={() => void handleNext()}
                    title={step === 4 && registeredPersonId != null && !paymentCleared ? 'Waiting for Accounts payment' : undefined}
                  >
                    {creatingEarly
                      ? 'Creating record…'
                      : step === 4 && registeredPersonId == null
                        ? <>Create Record & Card <ChevronRight className="h-4 w-4 ml-1" /></>
                        : step === 4
                          ? <>Continue after payment <ChevronRight className="h-4 w-4 ml-1" /></>
                          : <>Next <ChevronRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                ) : (
                  <Button disabled={submitting || !paymentCleared} onClick={() => void completeRegistration()}>
                    <Check className="h-4 w-4 mr-1" /> {submitting ? 'Completing…' : 'Complete Registration'}
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" onClick={() => setWizardOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== TRIAGE MODAL ============== */}
      <Dialog open={triageOpen} onOpenChange={setTriageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Triage Vitals — {fullName || 'Patient'}
            </DialogTitle>
            <DialogDescription>Record vitals and send the patient to the consultation queue.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Saves to TRIAGE with PERSON_ID only
            {registeredPersonId != null ? ` · PERSON_ID ${registeredPersonId}` : ''}
            {generatedId ? ` · ${generatedId}` : ''}. Demographics stay on PERSONS.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Clinic</Label>
              <Select value={triageForm.clinic} onValueChange={v => setTriageForm(f => ({ ...f, clinic: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General OPD', 'O&G', 'A&E', 'Cardiology', 'Psychiatry'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={triageForm.priority} onValueChange={v => setTriageForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Routine', 'Urgent', 'Emergency', 'VIP', 'Elderly / Special Needs'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={triageForm.weightKg} onChange={e => setTriageForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="70" />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" value={triageForm.heightCm} onChange={e => setTriageForm(f => ({ ...f, heightCm: e.target.value }))} placeholder="170" />
            </div>
            <div>
              <Label>BMI</Label>
              <Input disabled value={triageBmi} placeholder="auto" />
            </div>
            <div>
              <Label>Blood Pressure</Label>
              <Input value={triageForm.bloodPressure} onChange={e => setTriageForm(f => ({ ...f, bloodPressure: e.target.value }))} placeholder="120/80" />
            </div>
            <div>
              <Label>Temperature (°C)</Label>
              <Input type="number" value={triageForm.temperatureC} onChange={e => setTriageForm(f => ({ ...f, temperatureC: e.target.value }))} placeholder="36.8" />
            </div>
            <div>
              <Label>Pulse (bpm)</Label>
              <Input type="number" value={triageForm.pulseBpm} onChange={e => setTriageForm(f => ({ ...f, pulseBpm: e.target.value }))} placeholder="78" />
            </div>
            <div>
              <Label>Respiratory Rate</Label>
              <Input type="number" value={triageForm.respiratoryRate} onChange={e => setTriageForm(f => ({ ...f, respiratoryRate: e.target.value }))} placeholder="16" />
            </div>
            <div>
              <Label>SpO₂ (%)</Label>
              <Input type="number" value={triageForm.spo2Pct} onChange={e => setTriageForm(f => ({ ...f, spo2Pct: e.target.value }))} placeholder="98" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={triageForm.notes} onChange={e => setTriageForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional triage notes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriageOpen(false)}>Cancel</Button>
            <Button disabled={triageSaving} onClick={() => void saveTriageAndQueue()}>
              <Check className="h-4 w-4 mr-1" /> {triageSaving ? 'Saving…' : 'Save & Send to Consultation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== DRAFT RECORDS MODAL ============== */}
      <Dialog open={draftsOpen} onOpenChange={setDraftsOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" /> Patient Registration Drafts
              <span className="text-xs font-normal text-muted-foreground">({drafts.length} saved)</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            If the patient already paid at Cashier, reopen the draft or use Registration Queue Continue — payment status syncs automatically.
          </p>
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No saved drafts yet. Click <b>Save Draft</b> while registering a patient to resume later.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    {['Draft ID','Patient Name','Phone','Patient Type','Step','Created','Updated','Saved By','Status','Action'].map(h => (
                      <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drafts.map(d => {
                    const name = [d.form.surname, d.form.firstName, d.form.middleName].filter(Boolean).join(' ') || '—';
                    const stepLabel = STEPS.find(s => s.n === d.step)?.label || `Step ${d.step}`;
                    return (
                      <tr key={d.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono">{d.id}</td>
                        <td className="px-3 py-2 font-medium">{name}</td>
                        <td className="px-3 py-2">{d.form.mobile || '—'}</td>
                        <td className="px-3 py-2">{d.form.patientType}</td>
                        <td className="px-3 py-2">Step {d.step} · {stepLabel}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(d.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(d.updatedAt).toLocaleString()}</td>
                        <td className="px-3 py-2">{d.savedBy}</td>
                        <td className="px-3 py-2"><StatusBadge status="Pending" /></td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => continueDraft(d)} title="Continue Draft">
                              <Play className="h-3.5 w-3.5 mr-1" /> Continue
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDeleteId(d.id)} title="Delete Draft">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== DELETE CONFIRM ============== */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Draft?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete draft <b className="font-mono">{confirmDeleteId}</b>. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmDeleteId && void deleteDraft(confirmDeleteId)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
};

// ============================================================
// SCENARIO 7 — DUPLICATE REVIEW & MERGE QUEUE
// ============================================================
export const DuplicateReviewQueue = () => {
  const [picked, setPicked] = useState<typeof DUPLICATE_QUEUE[number] | null>(null);
  const [keepSide, setKeepSide] = useState<'a' | 'b'>('a');

  return (
    <ModulePage title="Duplicate Review & Merge">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Pending Review" value={String(DUPLICATE_QUEUE.length)} icon={AlertTriangle} subtitle="Awaiting admin merge" />
        <SummaryCard title="Merged Today" value="3" icon={ShieldCheck} />
        <SummaryCard title="False Positives" value="1" icon={ClipboardCheck} />
        <SummaryCard title="Auto-detected (24h)" value="6" icon={Activity} />
      </div>

      <div className="hms-section p-4">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="merged">Merged</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <div className="space-y-3 mt-3">
              {DUPLICATE_QUEUE.map(d => (
                <div key={d.id} className="rounded-lg ring-1 ring-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> {d.id}</div>
                      <div className="text-xs text-muted-foreground">{d.reason}</div>
                    </div>
                    <Button size="sm" onClick={() => { setPicked(d); setKeepSide('a'); }}>Review & Merge</Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    {(['a', 'b'] as const).map(k => {
                      const r = d[k];
                      return (
                        <div key={k} className="rounded-md bg-muted/40 p-3">
                          <div className="font-mono text-[10px] text-muted-foreground">{r.hospitalId}</div>
                          <div className="font-semibold">{r.name}</div>
                          <div className="text-muted-foreground">{r.phone} • DOB {r.dob}</div>
                          <div className="text-muted-foreground">Registered {r.registered}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="merged"><div className="text-sm text-muted-foreground p-4">3 merges completed today. Audit log updated.</div></TabsContent>
          <TabsContent value="dismissed"><div className="text-sm text-muted-foreground p-4">1 case dismissed — different patients with same phone.</div></TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!picked} onOpenChange={() => setPicked(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Merge Duplicate Records</DialogTitle></DialogHeader>
          {picked && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select the record to keep as primary. The other will be merged into it; visits, invoices and lab results will be re-linked. Audit log will be updated.</p>
              <div className="grid grid-cols-2 gap-3">
                {(['a', 'b'] as const).map(k => {
                  const r = picked[k];
                  const active = keepSide === k;
                  return (
                    <button key={k} onClick={() => setKeepSide(k)}
                      className={`text-left rounded-lg p-3 ring-1 transition ${active ? 'ring-primary bg-primary/5' : 'ring-border bg-card hover:bg-muted/40'}`}>
                      <div className="text-xs font-mono text-muted-foreground">{r.hospitalId}</div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                      <div className="text-xs text-muted-foreground">DOB {r.dob} • Registered {r.registered}</div>
                      <div className="mt-2"><StatusBadge status={active ? 'Active' : 'Pending'} /></div>
                    </button>
                  );
                })}
              </div>
              <Textarea placeholder="Merge note for audit log (e.g. 'Same patient, EMR downtime created duplicate')" rows={2} />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { toast.info('Marked as not duplicate'); setPicked(null); }}>Dismiss</Button>
                <Button onClick={() => {
                  const keep = picked[keepSide];
                  toast.success(`Merged into ${keep.hospitalId}. EMR sync queued.`);
                  setPicked(null);
                }}>Confirm Merge</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
};
