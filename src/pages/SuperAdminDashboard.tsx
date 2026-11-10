import { useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Activity, Server, Database, Building2, Users, KeyRound, FormInput, Workflow,
  CheckCircle2, FileText, AlertTriangle, Siren, UserCog, BellRing, Settings, RefreshCw,
  HardDrive, Lock, Plug, Brain, BarChart3, Stethoscope, CreditCard, MonitorSmartphone,
  ShieldAlert, Activity as Pulse, Globe2, Eye, Plus, Pencil, Trash2, LogIn, Power,
  Network, ScrollText, FlaskConical, Pill, BedDouble, MoreHorizontal, Download, Save, XCircle,
  Calendar,
} from 'lucide-react';

const navItems = [
  { label: 'Control Center', path: '/dashboard/superadmin', icon: <Shield className="h-4 w-4" /> },
  { label: 'Hospitals', path: '/dashboard/superadmin/hospitals', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Roles & RBAC', path: '/dashboard/superadmin/roles', icon: <KeyRound className="h-4 w-4" /> },
  { label: 'Staff Mgmt', path: '/dashboard/superadmin/staff', icon: <UserCog className="h-4 w-4" /> },
  { label: 'Form Builder', path: '/dashboard/superadmin/forms', icon: <FormInput className="h-4 w-4" /> },
  { label: 'Workflows', path: '/dashboard/superadmin/workflows', icon: <Workflow className="h-4 w-4" /> },
  { label: 'Approvals', path: '/dashboard/superadmin/approvals', icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'Audit Logs', path: '/dashboard/superadmin/audit', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Emergency Access', path: '/dashboard/superadmin/emergency', icon: <Siren className="h-4 w-4" /> },
  { label: 'Impersonation', path: '/dashboard/superadmin/impersonate', icon: <LogIn className="h-4 w-4" /> },
  { label: 'Notifications', path: '/dashboard/superadmin/notifications', icon: <BellRing className="h-4 w-4" /> },
  { label: 'System Config', path: '/dashboard/superadmin/config', icon: <Settings className="h-4 w-4" /> },
  { label: 'Legacy EMR', path: '/dashboard/superadmin/emr', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Backup & DR', path: '/dashboard/superadmin/backup', icon: <HardDrive className="h-4 w-4" /> },
  { label: 'IAM & Security Core', path: '/dashboard/superadmin/iam', icon: <Lock className="h-4 w-4" /> },
  { label: 'Patient Registration & MPI', path: '/dashboard/superadmin/mpi', icon: <UserCog className="h-4 w-4" /> },
  { label: 'Patient Portal & PWA', path: '/dashboard/superadmin/portal', icon: <MonitorSmartphone className="h-4 w-4" /> },
  { label: 'Appointment & Scheduling', path: '/dashboard/superadmin/scheduling', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Billing & Revenue', path: '/dashboard/superadmin/billing', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Unified EMR Core', path: '/dashboard/doctor/emr', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Doctor Clinical Module', path: '/dashboard/doctor/clinical', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Admission & Ward Mgmt', path: '/dashboard/admission', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Laboratory Center', path: '/dashboard/laboratory', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Lab Configuration', path: '/dashboard/laboratory/config', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Lab Analytics', path: '/dashboard/laboratory/analytics', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Security', path: '/dashboard/superadmin/security', icon: <Lock className="h-4 w-4" /> },
  { label: 'API Integrations', path: '/dashboard/superadmin/integrations', icon: <Plug className="h-4 w-4" /> },
  { label: 'AI Modules', path: '/dashboard/superadmin/ai', icon: <Brain className="h-4 w-4" /> },
  { label: 'ICD-11 / DSM', path: '/dashboard/superadmin/coding', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'NHIA / NHIS', path: '/dashboard/superadmin/nhis', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Sessions', path: '/dashboard/superadmin/sessions', icon: <MonitorSmartphone className="h-4 w-4" /> },
];

// ---- shared dummy data ----
type Hospital = { id: string; name: string; city: string; admin: string; beds: number; status: string };
const initialHospitals: Hospital[] = [
  { id: 'H001', name: 'GFA HMS – Main Campus', city: 'Lagos', admin: 'Dr. Adebola Lawal', beds: 420, status: 'Active' },
  { id: 'H002', name: 'GFA HMS – Lantoro Annex', city: 'Lantoro, Abeokuta', admin: 'Dr. Ifeoma Eze', beds: 120, status: 'Active' },
  { id: 'H003', name: 'GFA Community Clinic', city: 'Itoku, Abeokuta', admin: 'Dr. Tunde Bakare', beds: 40, status: 'Active' },
  { id: 'H004', name: 'GFA Outreach – Ilaro', city: 'Ilaro, Ogun', admin: 'Dr. Aisha Bello', beds: 18, status: 'Pending' },
];

const services = [
  { name: 'Auth Service', uptime: 99.99, status: 'Synced' },
  { name: 'EMR Core API', uptime: 99.92, status: 'Synced' },
  { name: 'Billing & POS', uptime: 99.81, status: 'Synced' },
  { name: 'Lab Engine', uptime: 99.74, status: 'Warning' },
  { name: 'Pharmacy Module', uptime: 99.95, status: 'Synced' },
  { name: 'Legacy EMR Bridge', uptime: 98.10, status: 'Warning' },
  { name: 'Notification Gateway', uptime: 99.88, status: 'Synced' },
  { name: 'AI Assistant', uptime: 97.55, status: 'Warning' },
];

type Role = { name: string; users: number; perms: string };
const initialRoles: Role[] = [
  { name: 'Super Admin', users: 2, perms: 'All system + impersonation' },
  { name: 'Hospital Admin', users: 4, perms: 'Facility-scoped admin' },
  { name: 'CMD', users: 1, perms: 'Executive read + clinical override' },
  { name: 'Consultant Psychiatrist', users: 18, perms: 'EMR write, prescribe, discharge' },
  { name: 'Psychologist', users: 12, perms: 'Therapy notes, assessments' },
  { name: 'Nurse (Psychiatric)', users: 64, perms: 'Care plans, MAR, observations' },
  { name: 'Pharmacist', users: 9, perms: 'Dispense, controlled drug log' },
  { name: 'Lab Scientist', users: 11, perms: 'Sample, result entry, verify' },
  { name: 'Finance Officer', users: 14, perms: 'Billing, NHIA, refunds' },
  { name: 'HR Officer', users: 6, perms: 'Staff records, leave, payroll' },
  { name: 'ICT Admin', users: 5, perms: 'Infra, sessions, integrations' },
  { name: 'Records Officer', users: 8, perms: 'Patient identity, archives' },
  { name: 'Emergency Override', users: 0, perms: 'Time-bound break-glass' },
];

type Staff = { id: string; name: string; dept: string; role: string; type: string; status: string };
const initialStaff: Staff[] = [
  { id: 'GFA-2014', name: 'Dr. Adebola Lawal', dept: 'Psychiatry (OPC)', role: 'Consultant Psychiatrist', type: 'Direct', status: 'Active' },
  { id: 'GFA-2188', name: 'Mrs. Chinwe Okafor', dept: 'Psychology', role: 'Senior Psychologist', type: 'Direct', status: 'Active' },
  { id: 'GFA-2305', name: 'Mr. Sodiq Yusuf', dept: 'Pharmacy', role: 'Pharmacist', type: 'Direct', status: 'Active' },
  { id: 'GFA-2412', name: 'Nurse Halimat Bello', dept: 'Acute Ward (Male)', role: 'Psychiatric Nurse', type: 'Direct', status: 'On Leave' },
  { id: 'GFA-2517', name: 'Dr. Ifeoma Eze', dept: 'GMPC', role: 'Medical Officer', type: 'Affiliate', status: 'Active' },
  { id: 'GFA-2620', name: 'Mr. Olumide Adekunle', dept: 'Laboratory', role: 'Lab Scientist', type: 'Contract', status: 'Active' },
  { id: 'GFA-2741', name: 'Mrs. Fatima Mohammed', dept: 'Finance', role: 'NHIA Officer', type: 'Direct', status: 'Active' },
  { id: 'GFA-2890', name: 'Mr. Kelechi Nwosu', dept: 'ICT', role: 'Systems Engineer', type: 'Direct', status: 'Active' },
];

type WF = { name: string; stages: number; sla: string; active: number; status: string };
const initialWorkflows: WF[] = [
  { name: 'Psychiatric Admission', stages: 6, sla: '45 min', active: 12, status: 'Active' },
  { name: 'OPC → GMPC Transfer', stages: 4, sla: '20 min', active: 3, status: 'Active' },
  { name: 'Discharge with NHIA Settlement', stages: 7, sla: '2 hrs', active: 8, status: 'Active' },
  { name: 'Lab Request → Result', stages: 5, sla: '4 hrs', active: 22, status: 'Active' },
  { name: 'Controlled Drug Dispensing', stages: 4, sla: '15 min', active: 5, status: 'Active' },
  { name: 'Crisis / Suicidality Protocol', stages: 5, sla: '5 min', active: 1, status: 'Critical' },
  { name: 'Billing Approval (>₦250k)', stages: 3, sla: '60 min', active: 4, status: 'Active' },
];

type Approval = { ref: string; type: string; requester: string; amount: string; stage: string; status: string };
const initialApprovals: Approval[] = [
  { ref: 'APR-7821', type: 'NHIA Claim', requester: 'Mrs. F. Mohammed', amount: '₦184,500', stage: 'Finance Head', status: 'Pending' },
  { ref: 'APR-7822', type: 'Controlled Drug Order', requester: 'Mr. S. Yusuf', amount: '—', stage: 'CMD', status: 'Pending' },
  { ref: 'APR-7823', type: 'Emergency Admission', requester: 'Dr. I. Eze', amount: '—', stage: 'Ward Manager', status: 'Approved' },
  { ref: 'APR-7824', type: 'Refund Request', requester: 'Cashier Desk 2', amount: '₦42,000', stage: 'Finance Head', status: 'Pending' },
  { ref: 'APR-7825', type: 'Override – After-hours Access', requester: 'Nurse H. Bello', amount: '—', stage: 'Super Admin', status: 'Approved' },
];

const auditEvents = [
  { time: '14:38:21', user: 'admin@gfa-health.demo', action: 'Updated NHIA rate table', target: 'Config / Billing', ip: '10.0.4.21', severity: 'Info' },
  { time: '14:32:09', user: 'cmd@gfa-health.demo', action: 'Viewed patient GFA-P-09812', target: 'EMR / Patient', ip: '10.0.4.7', severity: 'Info' },
  { time: '14:24:55', user: 'records@gfa-health.demo', action: 'Merged duplicate records', target: 'Identity Engine', ip: '10.0.4.55', severity: 'Warning' },
  { time: '14:11:02', user: 'pharmacist@gfa-health.demo', action: 'Dispensed Diazepam 10mg ×30', target: 'Controlled Drug Log', ip: '10.0.4.31', severity: 'Critical' },
  { time: '13:58:41', user: 'unknown', action: 'Failed login (5 attempts)', target: 'Auth', ip: '102.89.12.44', severity: 'Critical' },
  { time: '13:40:12', user: 'finance@gfa-health.demo', action: 'Exported revenue report', target: 'Finance / Reports', ip: '10.0.4.18', severity: 'Info' },
];

type Session = { user: string; device: string; ip: string; loc: string; started: string; status: string };
const initialSessions: Session[] = [
  { user: 'cmd@gfa-health.demo', device: 'MacBook Pro · Safari', ip: '10.0.4.7', loc: 'Aro Campus', started: '08:12', status: 'Active' },
  { user: 'admin@gfa-health.demo', device: 'Windows · Edge', ip: '10.0.4.21', loc: 'Admin Block', started: '07:55', status: 'Active' },
  { user: 'doctor@gfa-health.demo', device: 'iPad · Safari', ip: '10.0.5.12', loc: 'OPC Ward', started: '09:01', status: 'Active' },
  { user: 'finance@gfa-health.demo', device: 'Windows · Chrome', ip: '10.0.4.18', loc: 'Finance', started: '08:30', status: 'Active' },
  { user: 'lab@gfa-health.demo', device: 'Android · Chrome', ip: '102.89.6.4', loc: 'Off-site', started: '08:45', status: 'Suspicious' },
];

type Integration = { name: string; type: string; endpoint: string; last: string; status: string };
const initialIntegrations: Integration[] = [
  { name: 'NHIA Claims API', type: 'FHIR / REST', endpoint: 'https://api.nhia.gov.ng/v2', last: '2 min ago', status: 'Synced' },
  { name: 'Federal FHIR Bridge', type: 'FHIR R5', endpoint: 'https://fhir.health.gov.ng', last: '6 min ago', status: 'Synced' },
  { name: 'Paystack', type: 'Payments', endpoint: 'https://api.paystack.co', last: '1 min ago', status: 'Synced' },
  { name: 'Termii SMS', type: 'Messaging', endpoint: 'https://api.ng.termii.com', last: '4 min ago', status: 'Synced' },
  { name: 'WhatsApp Cloud API', type: 'Messaging', endpoint: 'graph.facebook.com/v18', last: '38 min ago', status: 'Warning' },
  { name: 'Cobas c311 (Lab)', type: 'HL7 v2', endpoint: 'lab-bridge://cobas-c311', last: '12 min ago', status: 'Synced' },
  { name: 'Daily.co Telepsych', type: 'Video', endpoint: 'https://api.daily.co/v1', last: '2 min ago', status: 'Synced' },
];

const sectionCard = 'hms-section p-5';

// helper: csv download
const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============================================================
// MAIN: Super Admin Control Center
// ============================================================
export const SuperAdminOverview = () => {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState('15');
  const [reason, setReason] = useState('');
  const [systemLive, setSystemLive] = useState(true);

  const grantOverride = () => {
    if (!target || !reason) { toast.error('Target and reason are required'); return; }
    toast.success(`Override granted for ${duration} min`, { description: `${target} · ${reason}` });
    setEmergencyOpen(false);
    setTarget(''); setReason('');
  };

  return (
    <DashboardLayout navItems={navItems} title="Super Admin · Enterprise Control Center">
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient text-white p-6 mb-6 shadow-card-hover">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
              <Shield className="h-3.5 w-3.5" /> GFA Demo Hospital · Demo Campus
            </div>
            <h2 className="font-display font-bold text-2xl md:text-3xl mt-1">Hospital Enterprise Control Center</h2>
            <p className="text-white/85 text-sm mt-1 max-w-2xl">
              Real-time governance across {initialHospitals.length} facilities · multi-layer RBAC, audit & workflow engine.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEmergencyOpen(true)} className="bg-white text-destructive hover:bg-white/90 font-semibold">
              <Siren className="h-4 w-4" /> Break-Glass Access
            </Button>
            <Button
              variant="outline"
              onClick={() => { setSystemLive(v => !v); toast.success(`System mode set to ${!systemLive ? 'Live' : 'Maintenance'}`); }}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20">
              <Power className="h-4 w-4" /> System Mode: {systemLive ? 'Live' : 'Maintenance'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  title="System Uptime" value="99.94%" subtitle="all services last 24h" trend="up" icon={Pulse} />
        <SummaryCard tone="blue"   title="Active Users" value="287" subtitle="across 4 facilities" trend="up" icon={Users} />
        <SummaryCard tone="amber"  title="Pending Approvals" value="14" subtitle="3 critical" icon={CheckCircle2} />
        <SummaryCard tone="rose"   title="Security Alerts" value="3" subtitle="1 anomaly detected" trend="down" icon={ShieldAlert} />
        <SummaryCard tone="indigo" title="Admissions Today" value="42" subtitle="OPC 28 · GMPC 14" trend="up" icon={BedDouble} />
        <SummaryCard tone="teal"   title="Revenue Today" value="₦18.4M" subtitle="NHIA 41% · Cash 33%" trend="up" icon={CreditCard} />
        <SummaryCard tone="purple" title="Legacy EMR Sync" value="98.1%" subtitle="612 records queued" icon={RefreshCw} />
        <SummaryCard tone="green"  title="Failed Txns" value="6" subtitle="auto-retry succeeded" trend="down" icon={AlertTriangle} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Server className="h-4 w-4 text-primary" /> Service Health Matrix</h3>
            <span className="text-xs text-muted-foreground">Live · refreshed every 15s</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map(s => (
              <div key={s.name} className="border rounded-xl p-3 flex items-center justify-between gap-3 hover:shadow-card transition">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.uptime}% uptime</div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>

        <div className={sectionCard}>
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Activity className="h-4 w-4 text-accent" /> Live Patient Flow</h3>
          <div className="space-y-3">
            {[
              { lbl: 'OPC Triage Queue', val: 14, max: 30, tone: 'bg-primary' },
              { lbl: 'GMPC Consult Queue', val: 9, max: 25, tone: 'bg-secondary' },
              { lbl: 'Lab Pending', val: 22, max: 40, tone: 'bg-accent' },
              { lbl: 'Pharmacy Dispense', val: 11, max: 30, tone: 'bg-tertiary' },
              { lbl: 'Discharge Pending', val: 6, max: 20, tone: 'bg-warning' },
              { lbl: 'Bed Occupancy', val: 314, max: 420, tone: 'bg-primary' },
            ].map(r => (
              <div key={r.lbl}>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{r.lbl}</span><span className="font-semibold">{r.val}/{r.max}</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${r.tone}`} style={{ width: `${(r.val / r.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className={sectionCard}>
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><ScrollText className="h-4 w-4 text-primary" /> Real-time Activity Stream</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {auditEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-l-2 pl-3 py-1.5"
                style={{ borderColor: e.severity === 'Critical' ? 'hsl(var(--destructive))' : e.severity === 'Warning' ? 'hsl(var(--warning))' : 'hsl(var(--primary))' }}>
                <div className="text-xs font-mono text-muted-foreground w-16 shrink-0">{e.time}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{e.action}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.user} · {e.target} · {e.ip}</div>
                </div>
                <StatusBadge status={e.severity === 'Critical' ? 'Critical' : e.severity === 'Warning' ? 'Warning' : 'Info'} />
              </div>
            ))}
          </div>
        </div>

        <div className={sectionCard}>
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="h-4 w-4 text-warning" /> System & Security Alerts</h3>
          <div className="space-y-3">
            {[
              { t: 'critical', icon: ShieldAlert, title: 'Brute-force on /auth from 102.89.12.44', desc: 'IP auto-blocked · 5 failed attempts in 60s' },
              { t: 'warning', icon: RefreshCw, title: 'Legacy EMR drift detected', desc: '612 records queued · last full sync 2h ago' },
              { t: 'warning', icon: Brain, title: 'AI Assistant latency above SLA', desc: 'P95 4.2s · investigate model endpoint' },
              { t: 'info', icon: HardDrive, title: 'Weekly backup completed', desc: 'Encrypted upload to AWS S3 · 412 GB' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${a.t === 'critical' ? 'bg-destructive/10 text-destructive' : a.t === 'warning' ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toast.success('Alert acknowledged')}>Acknowledge</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className={sectionCard}>
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4 text-primary" /> Module Usage (24h)</h3>
          <div className="space-y-3">
            {[
              { m: 'EMR / Clinical Notes', v: 1842, max: 2500, icon: Stethoscope },
              { m: 'Billing & POS', v: 1106, max: 2500, icon: CreditCard },
              { m: 'Pharmacy', v: 894, max: 2500, icon: Pill },
              { m: 'Laboratory', v: 712, max: 2500, icon: FlaskConical },
              { m: 'Wards / IPD', v: 528, max: 2500, icon: BedDouble },
              { m: 'Telepsychiatry', v: 124, max: 2500, icon: Globe2 },
            ].map(r => (
              <div key={r.m} className="flex items-center gap-3">
                <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs"><span>{r.m}</span><span className="font-semibold">{r.v.toLocaleString()}</span></div>
                  <Progress value={(r.v / r.max) * 100} className="h-1.5 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={sectionCard}>
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4"><Plug className="h-4 w-4 text-primary" /> Integrations Status</h3>
          <div className="space-y-2">
            {initialIntegrations.map(i => (
              <div key={i.name} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">last sync · {i.last}</div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Siren className="h-5 w-5" /> Break-Glass Emergency Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
              This action is fully audited. A real-time notification will be sent to the CMD and the Board.
            </div>
            <div>
              <Label>Target user / module</Label>
              <Input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. patient GFA-P-09812 or pharmacy/controlled-drugs" />
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="15">15 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem><SelectItem value="240">4 hours</SelectItem>
              </SelectContent></Select>
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Clinical justification..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmergencyOpen(false)}>Cancel</Button>
              <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={grantOverride}>Grant Override</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// HOSPITALS
// ============================================================
export const SuperAdminHospitals = () => {
  const [items, setItems] = useState<Hospital[]>(initialHospitals);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [confirmDel, setConfirmDel] = useState<Hospital | null>(null);
  const [form, setForm] = useState<Hospital>({ id: '', name: '', city: '', admin: '', beds: 0, status: 'Pending' });

  const openNew = () => { setEditing(null); setForm({ id: `H${String(items.length + 1).padStart(3, '0')}`, name: '', city: '', admin: '', beds: 0, status: 'Pending' }); setOpen(true); };
  const openEdit = (h: Hospital) => { setEditing(h); setForm(h); setOpen(true); };
  const save = () => {
    if (!form.name) { toast.error('Facility name is required'); return; }
    if (editing) {
      setItems(items.map(i => i.id === editing.id ? form : i));
      toast.success('Hospital updated');
    } else {
      setItems([...items, form]);
      toast.success('Hospital added');
    }
    setOpen(false);
  };
  const del = () => {
    if (!confirmDel) return;
    setItems(items.filter(i => i.id !== confirmDel.id));
    toast.success(`Removed ${confirmDel.name}`);
    setConfirmDel(null);
  };

  return (
    <DashboardLayout navItems={navItems} title="Multi-Hospital Configuration">
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <SummaryCard tone="green" title="Facilities" value={String(items.length)} icon={Building2} />
        <SummaryCard tone="blue" title="Total Beds" value={String(items.reduce((s, h) => s + Number(h.beds), 0))} icon={BedDouble} />
        <SummaryCard tone="amber" title="Pending Onboarding" value={String(items.filter(h => h.status === 'Pending').length)} icon={AlertTriangle} />
        <SummaryCard tone="indigo" title="Cross-Hospital Lookup" value="Enabled" icon={Network} />
      </div>
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Hospital Network</h3>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Add Hospital</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Facility</TableHead><TableHead>Location</TableHead><TableHead>Administrator</TableHead><TableHead>Beds</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(h => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs">{h.id}</TableCell>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell>{h.city}</TableCell>
                <TableCell>{h.admin}</TableCell>
                <TableCell>{h.beds}</TableCell>
                <TableCell><StatusBadge status={h.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Manage</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEdit(h)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success(`Viewing ${h.name}`)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setItems(items.map(i => i.id === h.id ? { ...i, status: i.status === 'Active' ? 'Suspended' : 'Active' } : i)); toast.success('Status toggled'); }}>
                        <Power className="h-4 w-4 mr-2" /> {h.status === 'Active' ? 'Suspend' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDel(h)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Facility name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="GFA HMS – ..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Administrator</Label><Input value={form.admin} onChange={e => setForm({ ...form, admin: e.target.value })} /></div>
              <div><Label>Beds</Label><Input type="number" value={form.beds} onChange={e => setForm({ ...form, beds: Number(e.target.value) })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}><Save className="h-4 w-4" /> Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={o => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove hospital?</AlertDialogTitle><AlertDialogDescription>This will detach {confirmDel?.name} from the network.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

// ============================================================
// ROLES
// ============================================================
export const SuperAdminRoles = () => {
  const [items, setItems] = useState<Role[]>(initialRoles);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<Role>({ name: '', users: 0, perms: '' });

  const openNew = () => { setEditing(null); setForm({ name: '', users: 0, perms: '' }); setOpen(true); };
  const openEdit = (r: Role) => { setEditing(r); setForm(r); setOpen(true); };
  const save = () => {
    if (!form.name) { toast.error('Role name required'); return; }
    if (editing) setItems(items.map(i => i.name === editing.name ? form : i));
    else setItems([...items, form]);
    toast.success(editing ? 'Role updated' : 'Role created');
    setOpen(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="Roles & Permissions (RBAC++)">
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <SummaryCard tone="green" title="Roles" value={String(items.length)} icon={KeyRound} />
        <SummaryCard tone="blue" title="Assigned Users" value={String(items.reduce((s, r) => s + r.users, 0))} icon={Users} />
        <SummaryCard tone="amber" title="Temporary Roles Active" value="2" icon={AlertTriangle} />
      </div>
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Role Matrix</h3>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Role</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Users</TableHead><TableHead>Permission Summary</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.users}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.perms}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(r)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setItems(items.filter(i => i.name !== r.name)); toast.success('Role removed'); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Role' : 'New Role'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Users</Label><Input type="number" value={form.users} onChange={e => setForm({ ...form, users: Number(e.target.value) })} /></div>
            <div><Label>Permission summary</Label><Textarea value={form.perms} onChange={e => setForm({ ...form, perms: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle></DialogHeader>
          <p className="text-sm"><b>Users:</b> {viewing?.users}</p>
          <p className="text-sm"><b>Permissions:</b> {viewing?.perms}</p>
          <DialogFooter><Button onClick={() => setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// STAFF
// ============================================================
export const SuperAdminStaff = () => {
  const [items, setItems] = useState<Staff[]>(initialStaff);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<Staff>({ id: '', name: '', dept: '', role: '', type: 'Direct', status: 'Active' });

  const openNew = () => { setEditing(null); setForm({ id: `GFA-${2900 + items.length}`, name: '', dept: '', role: '', type: 'Direct', status: 'Active' }); setOpen(true); };
  const openEdit = (s: Staff) => { setEditing(s); setForm(s); setOpen(true); };
  const save = () => {
    if (!form.name) { toast.error('Name required'); return; }
    if (editing) setItems(items.map(i => i.id === editing.id ? form : i));
    else setItems([...items, form]);
    toast.success(editing ? 'Staff updated' : 'Staff onboarded');
    setOpen(false);
  };

  return (
    <DashboardLayout navItems={navItems} title="Staff Management">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">All Staff ({items.length})</h3>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Onboard Staff</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.dept}</TableCell>
                <TableCell>{s.role}</TableCell>
                <TableCell>{s.type}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setItems(items.map(i => i.id === s.id ? { ...i, status: i.status === 'Active' ? 'Suspended' : 'Active' } : i)); toast.success('Status changed'); }}><Power className="h-4 w-4 mr-2" /> Toggle Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Password reset email sent')}><KeyRound className="h-4 w-4 mr-2" /> Reset Password</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { setItems(items.filter(i => i.id !== s.id)); toast.success('Staff removed'); }}><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Staff' : 'Onboard Staff'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Staff ID</Label><Input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Direct">Direct</SelectItem><SelectItem value="Affiliate">Affiliate</SelectItem><SelectItem value="Contract">Contract</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// FORMS
// ============================================================
type FormField = { l: string; t: string };
export const SuperAdminForms = () => {
  const palette = ['Text', 'Number', 'Select', 'Multi-select', 'Sub-select', 'Sub-sub-select', 'Date / Time', 'File upload', 'Clinical Checkbox Group', 'Conditional Logic Field', 'Auto-calculated Field'];
  const [fields, setFields] = useState<FormField[]>([
    { l: 'Patient (linked)', t: 'Sub-sub-select · Hospital → Ward → Bed' },
    { l: 'Presenting Complaint', t: 'Long Text · required' },
    { l: 'Risk of Self-Harm', t: 'Select · None / Low / Moderate / High / Imminent' },
    { l: 'DSM-5 Provisional Dx', t: 'Multi-select (linked to ICD-11 mapping)' },
    { l: 'MSE Score', t: 'Auto-calculated from sub-fields' },
    { l: 'Consent to Treatment', t: 'File upload + signature' },
  ]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<FormField>({ l: '', t: '' });
  const [open, setOpen] = useState(false);

  const addFromPalette = (p: string) => { setFields([...fields, { l: `New ${p} field`, t: p }]); toast.success(`${p} field added`); };
  const startEdit = (i: number) => { setEditing(i); setForm(fields[i]); setOpen(true); };
  const save = () => { if (editing == null) return; setFields(fields.map((f, i) => i === editing ? form : f)); setOpen(false); toast.success('Field updated'); };

  return (
    <DashboardLayout navItems={navItems} title="Dynamic Form & Field Builder">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`${sectionCard} lg:col-span-1`}>
          <h3 className="font-display font-semibold mb-3">Field Palette</h3>
          <div className="space-y-2">
            {palette.map(f => (
              <button key={f} onClick={() => addFromPalette(f)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-muted/40">
                <span className="text-sm">{f}</span><Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Form: Psychiatric Admission Intake · v3.2</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.success('Rolled back to v3.1')}>Rollback</Button>
              <Button size="sm" onClick={() => toast.success('Form published')}>Publish</Button>
            </div>
          </div>
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{f.l}</div>
                    <div className="text-xs text-muted-foreground">{f.t}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setFields(fields.filter((_, j) => j !== i)); toast.success('Field removed'); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Field</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label</Label><Input value={form.l} onChange={e => setForm({ ...form, l: e.target.value })} /></div>
            <div><Label>Type / Description</Label><Input value={form.t} onChange={e => setForm({ ...form, t: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// WORKFLOWS
// ============================================================
export const SuperAdminWorkflows = () => {
  const [items, setItems] = useState<WF[]>(initialWorkflows);
  const [editing, setEditing] = useState<WF | null>(null);
  const [form, setForm] = useState<WF | null>(null);

  const openCfg = (w: WF) => { setEditing(w); setForm({ ...w }); };
  const save = () => {
    if (!editing || !form) return;
    setItems(items.map(i => i.name === editing.name ? form : i));
    toast.success(`${form.name} workflow updated`);
    setEditing(null);
  };

  return (
    <DashboardLayout navItems={navItems} title="Workflow Engine">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">All Workflows ({items.length})</h3>
          <Button size="sm" onClick={() => toast.success('Workflow designer opened')}><Plus className="h-4 w-4" /> New Workflow</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Workflow</TableHead><TableHead>Stages</TableHead><TableHead>SLA</TableHead><TableHead>Active</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(w => (
              <TableRow key={w.name}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell>{w.stages}</TableCell>
                <TableCell>{w.sla}</TableCell>
                <TableCell>{w.active}</TableCell>
                <TableCell><StatusBadge status={w.status} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openCfg(w)}><Settings className="h-4 w-4" /> Configure</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure: {editing?.name}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Stages</Label><Input type="number" value={form.stages} onChange={e => setForm({ ...form, stages: Number(e.target.value) })} /></div>
              <div><Label>SLA</Label><Input value={form.sla} onChange={e => setForm({ ...form, sla: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Paused">Paused</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}><Save className="h-4 w-4" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// APPROVALS
// ============================================================
export const SuperAdminApprovals = () => {
  const [items, setItems] = useState<Approval[]>(initialApprovals);
  const [viewing, setViewing] = useState<Approval | null>(null);

  const setStatus = (ref: string, status: string) => {
    setItems(items.map(i => i.ref === ref ? { ...i, status } : i));
    toast.success(`${ref} ${status.toLowerCase()}`);
  };

  return (
    <DashboardLayout navItems={navItems} title="Approval Engine">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Approval Queue</h3>
          <Button size="sm" variant="outline" onClick={() => downloadCsv('approvals.csv', items)}><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Type</TableHead><TableHead>Requester</TableHead><TableHead>Amount</TableHead><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.ref}>
                <TableCell className="font-mono text-xs">{a.ref}</TableCell>
                <TableCell className="font-medium">{a.type}</TableCell>
                <TableCell>{a.requester}</TableCell>
                <TableCell>{a.amount}</TableCell>
                <TableCell>{a.stage}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(a)}><Eye className="h-4 w-4" /></Button>
                  {a.status === 'Pending' && (
                    <>
                      <Button size="sm" className="ml-2" onClick={() => setStatus(a.ref, 'Approved')}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => setStatus(a.ref, 'Rejected')}><XCircle className="h-4 w-4" /> Reject</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.ref} · {viewing?.type}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p><b>Requester:</b> {viewing.requester}</p>
              <p><b>Amount:</b> {viewing.amount}</p>
              <p><b>Current stage:</b> {viewing.stage}</p>
              <p><b>Status:</b> <StatusBadge status={viewing.status} /></p>
            </div>
          )}
          <DialogFooter>
            {viewing?.status === 'Pending' && (
              <>
                <Button variant="outline" onClick={() => { setStatus(viewing!.ref, 'Rejected'); setViewing(null); }}>Reject</Button>
                <Button onClick={() => { setStatus(viewing!.ref, 'Approved'); setViewing(null); }}>Approve</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// AUDIT
// ============================================================
export const SuperAdminAudit = () => (
  <DashboardLayout navItems={navItems} title="Audit Logs & Activity Monitoring">
    <div className={sectionCard}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Full System Audit Trail</h3>
        <Button size="sm" variant="outline" onClick={() => { downloadCsv('audit-log.csv', auditEvents); toast.success('Audit log exported'); }}><FileText className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>IP</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
        <TableBody>
          {auditEvents.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{e.time}</TableCell>
              <TableCell>{e.user}</TableCell>
              <TableCell>{e.action}</TableCell>
              <TableCell>{e.target}</TableCell>
              <TableCell className="font-mono text-xs">{e.ip}</TableCell>
              <TableCell><StatusBadge status={e.severity === 'Critical' ? 'Critical' : e.severity === 'Warning' ? 'Warning' : 'Info'} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

// ============================================================
// EMERGENCY
// ============================================================
export const SuperAdminEmergency = () => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(''); const [reason, setReason] = useState(''); const [dur, setDur] = useState('15');
  type Row = { w: string; u: string; t: string; r: string; d: string; s: string };
  const [rows, setRows] = useState<Row[]>([
    { w: 'Today 10:42', u: 'cmd@gfa-health.demo', t: 'Patient GFA-P-09812 (sealed record)', r: 'Crisis intervention - acute psychosis', d: '1 hour', s: 'Active' },
    { w: 'Today 08:14', u: 'admin@gfa-health.demo', t: 'Pharmacy / Controlled Drugs', r: 'Audit reconciliation', d: '15 min', s: 'Completed' },
    { w: 'Yesterday', u: 'doctor@gfa-health.demo', t: 'After-hours OPC EMR', r: 'On-call review', d: '2 hours', s: 'Completed' },
  ]);
  const grant = () => {
    if (!target || !reason) { toast.error('All fields required'); return; }
    setRows([{ w: 'Just now', u: 'superadmin@gfa-health.demo', t: target, r: reason, d: `${dur} min`, s: 'Active' }, ...rows]);
    toast.success('Override granted'); setOpen(false); setTarget(''); setReason('');
  };
  const revoke = (i: number) => { setRows(rows.map((r, j) => j === i ? { ...r, s: 'Revoked' } : r)); toast.success('Override revoked'); };

  return (
    <DashboardLayout navItems={navItems} title="Emergency Access Override">
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <SummaryCard tone="rose" title="Active Overrides" value={String(rows.filter(r => r.s === 'Active').length)} icon={Siren} />
        <SummaryCard tone="amber" title="Today (so far)" value="4" icon={AlertTriangle} />
        <SummaryCard tone="green" title="All Audited" value="100%" icon={CheckCircle2} />
      </div>
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Override History</h3>
          <Button size="sm" onClick={() => setOpen(true)}><Siren className="h-4 w-4" /> Grant New Override</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Target</TableHead><TableHead>Reason</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.w}</TableCell><TableCell>{r.u}</TableCell><TableCell>{r.t}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.r}</TableCell><TableCell>{r.d}</TableCell>
                <TableCell><StatusBadge status={r.s} /></TableCell>
                <TableCell>{r.s === 'Active' && <Button size="sm" variant="outline" onClick={() => revoke(i)}>Revoke</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Siren className="h-5 w-5" /> Grant Override</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Target user / module</Label><Input value={target} onChange={e => setTarget(e.target.value)} /></div>
            <div><Label>Duration (minutes)</Label>
              <Select value={dur} onValueChange={setDur}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="15">15</SelectItem><SelectItem value="60">60</SelectItem><SelectItem value="240">240</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="bg-destructive text-white hover:bg-destructive/90" onClick={grant}>Grant</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// IMPERSONATE
// ============================================================
export const SuperAdminImpersonate = () => {
  const [search, setSearch] = useState(''); const [dur, setDur] = useState('30');
  const [rows, setRows] = useState([
    { w: '11:02 today', i: 'finance@gfa-health.demo', b: 'superadmin', d: '14 min', a: 'Viewed 6 invoices · 0 edits' },
    { w: 'Yesterday', i: 'nurse@gfa-health.demo', b: 'superadmin', d: '8 min', a: 'Verified MAR template issue' },
  ]);
  const start = () => {
    if (!search) { toast.error('Enter a user'); return; }
    setRows([{ w: 'Just now', i: search, b: 'superadmin', d: `${dur} min`, a: 'Session started' }, ...rows]);
    toast.success(`Now impersonating ${search}`); setSearch('');
  };
  const end = (i: number) => { setRows(rows.filter((_, j) => j !== i)); toast.success('Session ended'); };

  return (
    <DashboardLayout navItems={navItems} title="User Impersonation (Login-As)">
      <div className={sectionCard}>
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning mb-4">
          Every impersonation session is time-bound, banner-flagged, and fully audited.
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2"><Label>Search user</Label><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="email, staff ID or name" /></div>
          <div><Label>Session duration</Label>
            <Select value={dur} onValueChange={setDur}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="15">15 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="60">1 hour</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4"><Button onClick={start}><LogIn className="h-4 w-4" /> Start Impersonation</Button></div>
        <h4 className="font-display font-semibold mt-6 mb-2">Recent sessions</h4>
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Impersonated</TableHead><TableHead>By</TableHead><TableHead>Duration</TableHead><TableHead>Actions taken</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}><TableCell>{r.w}</TableCell><TableCell>{r.i}</TableCell><TableCell>{r.b}</TableCell><TableCell>{r.d}</TableCell><TableCell className="text-sm text-muted-foreground">{r.a}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => end(i)}>End</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const SuperAdminNotifications = () => {
  const [aud, setAud] = useState('all'); const [sev, setSev] = useState('info'); const [msg, setMsg] = useState('');
  const send = () => {
    if (!msg) { toast.error('Message required'); return; }
    toast.success(`Broadcast sent to ${aud}`, { description: msg });
    setMsg('');
  };
  return (
    <DashboardLayout navItems={navItems} title="Notification Engine">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={sectionCard}>
          <h3 className="font-display font-semibold mb-3">Channels</h3>
          {[
            { l: 'SMS (Termii)', d: 'Critical alerts + appointment reminders' },
            { l: 'Email (Postmark)', d: 'Reports, statements, onboarding' },
            { l: 'WhatsApp Cloud API', d: 'Patient comms · opt-in only' },
            { l: 'In-app push', d: 'Staff alerts & approvals' },
            { l: 'Red Alert siren', d: 'Code Blue / Crisis Protocols' },
          ].map(c => (
            <div key={c.l} className="flex items-center justify-between py-2 border-b last:border-0">
              <div><div className="font-medium text-sm">{c.l}</div><div className="text-xs text-muted-foreground">{c.d}</div></div>
              <Switch defaultChecked onCheckedChange={v => toast.success(`${c.l} ${v ? 'enabled' : 'disabled'}`)} />
            </div>
          ))}
        </div>
        <div className={sectionCard}>
          <h3 className="font-display font-semibold mb-3">Compose Broadcast</h3>
          <div className="space-y-3">
            <div><Label>Audience</Label>
              <Select value={aud} onValueChange={setAud}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All staff</SelectItem><SelectItem value="clinical">Clinical staff</SelectItem><SelectItem value="finance">Finance dept</SelectItem><SelectItem value="patients">Patients (opt-in)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Severity</Label>
              <Select value={sev} onValueChange={setSev}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical (red alert)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type your message…" /></div>
            <Button onClick={send}><BellRing className="h-4 w-4" /> Send Broadcast</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ============================================================
// CONFIG
// ============================================================
export const SuperAdminConfig = () => {
  const [hospital, setHospital] = useState('GFA Demo Hospital');
  const [region, setRegion] = useState('Ogun State · South-West Nigeria');
  return (
    <DashboardLayout navItems={navItems} title="System Configuration">
      <Tabs defaultValue="global">
        <TabsList className="mb-4"><TabsTrigger value="global">Global</TabsTrigger><TabsTrigger value="clinical">Clinical Rules</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger><TabsTrigger value="features">Feature Flags</TabsTrigger></TabsList>
        <TabsContent value="global">
          <div className={sectionCard}>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Hospital Name</Label><Input value={hospital} onChange={e => setHospital(e.target.value)} /></div>
              <div><Label>Timezone</Label><Select defaultValue="WAT"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WAT">Africa/Lagos (WAT)</SelectItem></SelectContent></Select></div>
              <div><Label>Currency</Label><Select defaultValue="NGN"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NGN">Naira (₦)</SelectItem></SelectContent></Select></div>
              <div><Label>Region</Label><Input value={region} onChange={e => setRegion(e.target.value)} /></div>
            </div>
            <div className="mt-4"><Button onClick={() => toast.success('Global settings saved')}><Save className="h-4 w-4" /> Save Changes</Button></div>
          </div>
        </TabsContent>
        {['clinical', 'billing', 'features'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className={sectionCard}>
              {(tab === 'clinical'
                ? ['Enable ICD-11', 'Enable DSM-5-TR mapping', 'Mandatory MSE on admission', 'Auto-flag suicidality keywords', 'Require dual-sign for restraint orders']
                : tab === 'billing'
                ? ['NHIA primary payer auto-select', 'Allow partial payments', 'Block discharge if balance > ₦5,000', 'POS auto-reconcile end of day']
                : ['Telepsychiatry', 'AI Clinical Assistant', 'Patient WhatsApp comms', 'Cross-hospital lookup', 'Offline mode (clinics)', 'Federal FHIR bridge']
              ).map(o => (
                <div key={o} className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="text-sm">{o}</span>
                  <Switch defaultChecked onCheckedChange={v => toast.success(`${o} ${v ? 'enabled' : 'disabled'}`)} />
                </div>
              ))}
              <div className="mt-4"><Button onClick={() => toast.success('Settings saved')}><Save className="h-4 w-4" /> Save</Button></div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
};

// ============================================================
// EMR
// ============================================================
export const SuperAdminEmr = () => {
  const [interval, setIntervalV] = useState('15'); const [policy, setPolicy] = useState('manual');
  return (
    <DashboardLayout navItems={navItems} title="Legacy EMR Sync Control">
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <SummaryCard tone="green" title="Synced Records" value="184,221" trend="up" icon={Database} />
        <SummaryCard tone="amber" title="Queued" value="612" icon={RefreshCw} />
        <SummaryCard tone="rose" title="Conflicts" value="9" subtitle="awaiting resolution" icon={AlertTriangle} />
        <SummaryCard tone="blue" title="Last Full Sync" value="2h 14m ago" icon={Activity} />
      </div>
      <div className={sectionCard}>
        <h3 className="font-display font-semibold mb-3">Sync Schedule & Mapping</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Sync interval</Label>
            <Select value={interval} onValueChange={setIntervalV}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="5">Every 5 min</SelectItem><SelectItem value="15">Every 15 min</SelectItem><SelectItem value="60">Hourly</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Conflict policy</Label>
            <Select value={policy} onValueChange={setPolicy}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="manual">Manual review</SelectItem><SelectItem value="newest">Newest wins</SelectItem><SelectItem value="legacy">Legacy wins</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => toast.success('Sync initiated', { description: 'Streaming records to legacy EMR…' })}><RefreshCw className="h-4 w-4" /> Sync Now</Button>
          <Button variant="outline" onClick={() => toast.success('Conflict queue opened (9 items)')}>Open Conflict Queue</Button>
          <Button variant="outline" onClick={() => toast.success('Settings saved')}>Save Settings</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ============================================================
// BACKUP
// ============================================================
export const SuperAdminBackup = () => (
  <DashboardLayout navItems={navItems} title="Backup & Disaster Recovery">
    <div className="grid sm:grid-cols-3 gap-4 mb-5">
      <SummaryCard tone="green" title="Last Backup" value="6h ago" subtitle="412 GB · AWS S3 (eu-west-1)" icon={HardDrive} />
      <SummaryCard tone="blue" title="Retention" value="90 days" icon={Database} />
      <SummaryCard tone="amber" title="DR Drill (last)" value="11 days ago" icon={CheckCircle2} />
    </div>
    <div className={sectionCard}>
      <h3 className="font-display font-semibold mb-3">Backup Policies</h3>
      {[
        { l: 'Daily incremental', t: '02:00 WAT · encrypted (AES-256)' },
        { l: 'Weekly full', t: 'Sundays 01:00 · S3 + local NAS' },
        { l: 'Monthly archive', t: '1st of month · Glacier Deep' },
      ].map(p => (
        <div key={p.l} className="flex items-center justify-between py-3 border-b last:border-0">
          <div><div className="font-medium text-sm">{p.l}</div><div className="text-xs text-muted-foreground">{p.t}</div></div>
          <Switch defaultChecked onCheckedChange={v => toast.success(`${p.l} ${v ? 'enabled' : 'disabled'}`)} />
        </div>
      ))}
      <div className="mt-4 flex gap-2">
        <Button onClick={() => toast.success('Backup started · upload to S3 in progress')}>Run Backup Now</Button>
        <Button variant="outline" onClick={() => toast.success('Restore wizard launched')}>Restore Wizard</Button>
        <Button variant="outline" onClick={() => toast.success('DR drill scheduled for Sunday 02:00')}>Schedule DR Drill</Button>
      </div>
    </div>
  </DashboardLayout>
);

// ============================================================
// SECURITY
// ============================================================
export const SuperAdminSecurity = () => {
  const [minLen, setMinLen] = useState('12'); const [timeout, setTimeoutV] = useState('20'); const [lockout, setLockout] = useState('5'); const [sens, setSens] = useState('high');
  return (
    <DashboardLayout navItems={navItems} title="Security & Encryption Control Center">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={sectionCard}>
          <h3 className="font-display font-semibold mb-3">Policies</h3>
          {['End-to-end encryption at rest (AES-256)', 'TLS 1.3 required on all endpoints', 'MFA for clinical & admin roles', 'Mandatory OTP for controlled-drug dispense', 'IP allow-list for finance module', 'Geo-block: outside Nigeria except whitelisted'].map(o => (
            <div key={o} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <span className="text-sm">{o}</span>
              <Switch defaultChecked onCheckedChange={v => toast.success(`${o} ${v ? 'enabled' : 'disabled'}`)} />
            </div>
          ))}
        </div>
        <div className={sectionCard}>
          <h3 className="font-display font-semibold mb-3">Password & Session</h3>
          <div className="space-y-3">
            <div><Label>Min length</Label><Input value={minLen} onChange={e => setMinLen(e.target.value)} /></div>
            <div><Label>Session timeout (minutes)</Label><Input value={timeout} onChange={e => setTimeoutV(e.target.value)} /></div>
            <div><Label>Failed-login lockout threshold</Label><Input value={lockout} onChange={e => setLockout(e.target.value)} /></div>
            <div><Label>Anomaly detection sensitivity</Label>
              <Select value={sens} onValueChange={setSens}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="med">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={() => toast.success('Security policy saved')}><Save className="h-4 w-4" /> Save</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ============================================================
// INTEGRATIONS
// ============================================================
export const SuperAdminIntegrations = () => {
  const [items, setItems] = useState<Integration[]>(initialIntegrations);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Integration>({ name: '', type: '', endpoint: '', last: 'never', status: 'Pending' });
  const save = () => {
    if (!form.name || !form.endpoint) { toast.error('Name and endpoint required'); return; }
    setItems([...items, form]); toast.success('API registered'); setOpen(false);
    setForm({ name: '', type: '', endpoint: '', last: 'never', status: 'Pending' });
  };
  const testConn = (n: string) => toast.success(`Test ping to ${n} succeeded`);

  return (
    <DashboardLayout navItems={navItems} title="API & Integration Management">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">External APIs</h3>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Register API</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Endpoint</TableHead><TableHead>Last Sync</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.type}</TableCell>
                <TableCell className="font-mono text-xs">{r.endpoint}</TableCell><TableCell>{r.last}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => testConn(r.name)}><Pulse className="h-4 w-4 mr-2" /> Test Connection</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success(`${r.name} resynced`)}><RefreshCw className="h-4 w-4 mr-2" /> Resync</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success(`${r.name} configuration opened`)}><Settings className="h-4 w-4 mr-2" /> Configure</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { setItems(items.filter(i => i.name !== r.name)); toast.success('Integration removed'); }}><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register API</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Type</Label><Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="REST / HL7 / FHIR …" /></div>
            <div><Label>Endpoint URL</Label><Input value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ============================================================
// AI / CODING / NHIS
// ============================================================
export const SuperAdminAi = () => (
  <DashboardLayout navItems={navItems} title="AI Module Management">
    <div className={sectionCard}>
      <h3 className="font-display font-semibold mb-3">Capabilities</h3>
      {[
        { l: 'AI Clinical Assistant (suggest diagnoses)', d: 'Read-only suggestions · audit-logged' },
        { l: 'Discharge summary auto-draft', d: 'Editable by clinician before sign-off' },
        { l: 'Risk scoring (relapse / readmission)', d: 'Updated nightly' },
        { l: 'Voice → SOAP note dictation', d: 'On-device · no audio leaves hospital' },
        { l: 'NHIA fraud signal detection', d: 'Flags unusual claim patterns' },
      ].map(o => (
        <div key={o.l} className="flex items-center justify-between py-3 border-b last:border-0">
          <div><div className="font-medium text-sm">{o.l}</div><div className="text-xs text-muted-foreground">{o.d}</div></div>
          <Switch defaultChecked onCheckedChange={v => toast.success(`${o.l} ${v ? 'enabled' : 'disabled'}`)} />
        </div>
      ))}
      <div className="mt-4 flex gap-2">
        <Button onClick={() => toast.success('AI configuration saved')}><Save className="h-4 w-4" /> Save</Button>
        <Button variant="outline" onClick={() => toast.success('AI models retraining started')}><Brain className="h-4 w-4" /> Retrain Models</Button>
      </div>
    </div>
  </DashboardLayout>
);

export const SuperAdminCoding = () => {
  type Code = { c: string; i: string; d: string; dep: string };
  const [items, setItems] = useState<Code[]>([
    { c: 'Acute Psychosis', i: '6A20', d: '295.40', dep: 'OPC / Psychiatry' },
    { c: 'Major Depressive Episode', i: '6A70', d: '296.20', dep: 'OPC / Psychiatry' },
    { c: 'Generalized Anxiety', i: '6B00', d: '300.02', dep: 'Psychology' },
    { c: 'Substance Use (Cannabis)', i: '6C41', d: '305.20', dep: 'Addiction Unit' },
    { c: 'PTSD', i: '6B40', d: '309.81', dep: 'Trauma Therapy' },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Code>({ c: '', i: '', d: '', dep: '' });
  const save = () => { if (!form.c) { toast.error('Tag required'); return; } setItems([...items, form]); toast.success('Code added'); setOpen(false); setForm({ c: '', i: '', d: '', dep: '' }); };

  return (
    <DashboardLayout navItems={navItems} title="ICD-11 & DSM Clinical Coding">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Coding Map</h3>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Code</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Custom Tag</TableHead><TableHead>ICD-11</TableHead><TableHead>DSM-5-TR</TableHead><TableHead>Department</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.c}>
                <TableCell className="font-medium">{r.c}</TableCell><TableCell className="font-mono">{r.i}</TableCell><TableCell className="font-mono">{r.d}</TableCell><TableCell>{r.dep}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => { setItems(items.filter(i => i.c !== r.c)); toast.success('Removed'); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Coding Map</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Custom Tag</Label><Input value={form.c} onChange={e => setForm({ ...form, c: e.target.value })} /></div>
            <div><Label>ICD-11</Label><Input value={form.i} onChange={e => setForm({ ...form, i: e.target.value })} /></div>
            <div><Label>DSM-5-TR</Label><Input value={form.d} onChange={e => setForm({ ...form, d: e.target.value })} /></div>
            <div className="col-span-2"><Label>Department</Label><Input value={form.dep} onChange={e => setForm({ ...form, dep: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const SuperAdminNhis = () => {
  type Row = { s: string; c: string; cov: string; st: string };
  const [items, setItems] = useState<Row[]>([
    { s: 'OPC Consultation', c: 'PSY-001', cov: '100%', st: 'Synced' },
    { s: 'Psychotherapy Session', c: 'PSY-018', cov: '80%', st: 'Synced' },
    { s: 'Inpatient Bed/Day (Acute)', c: 'IPD-204', cov: '70%', st: 'Synced' },
    { s: 'ECT (per session)', c: 'PRC-091', cov: '50%', st: 'Pending Approval' },
    { s: 'Olanzapine 10mg', c: 'PHM-441', cov: '100%', st: 'Synced' },
  ]);
  const approve = (s: string) => { setItems(items.map(i => i.s === s ? { ...i, st: 'Synced' } : i)); toast.success('Code approved & synced'); };

  return (
    <DashboardLayout navItems={navItems} title="NHIA / NHIS Mapping Engine">
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <SummaryCard tone="green" title="Claims This Month" value="1,284" subtitle="₦41.2M" trend="up" icon={CreditCard} />
        <SummaryCard tone="amber" title="Pending Approval" value={String(items.filter(i => i.st !== 'Synced').length)} icon={AlertTriangle} />
        <SummaryCard tone="rose" title="Rejected" value="11" subtitle="dispute open" icon={ShieldAlert} />
      </div>
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Service-to-NHIA Code Map</h3>
          <Button size="sm" variant="outline" onClick={() => downloadCsv('nhia-map.csv', items)}><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>NHIA Code</TableHead><TableHead>Coverage</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.s}>
                <TableCell className="font-medium">{r.s}</TableCell>
                <TableCell className="font-mono">{r.c}</TableCell>
                <TableCell>{r.cov}</TableCell>
                <TableCell><StatusBadge status={r.st} /></TableCell>
                <TableCell className="text-right">
                  {r.st !== 'Synced' && <Button size="sm" onClick={() => approve(r.s)}><CheckCircle2 className="h-4 w-4" /> Approve</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

// ============================================================
// SESSIONS
// ============================================================
export const SuperAdminSessions = () => {
  const [items, setItems] = useState<Session[]>(initialSessions);
  const [confirm, setConfirm] = useState<Session | null>(null);
  const forceOut = () => { if (!confirm) return; setItems(items.filter(i => i.ip !== confirm.ip)); toast.success(`${confirm.user} signed out`); setConfirm(null); };

  return (
    <DashboardLayout navItems={navItems} title="Sessions & Device Management">
      <div className={sectionCard}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Active Sessions ({items.length})</h3>
          <Button size="sm" variant="outline" onClick={() => { setItems([]); toast.success('All sessions terminated'); }}><Power className="h-4 w-4" /> Force Logout All</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Device</TableHead><TableHead>IP</TableHead><TableHead>Location</TableHead><TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.user}</TableCell>
                <TableCell>{s.device}</TableCell>
                <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                <TableCell>{s.loc}</TableCell>
                <TableCell>{s.started}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setConfirm(s)}><Power className="h-4 w-4" /> Force Logout</Button></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No active sessions</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Force logout {confirm?.user}?</AlertDialogTitle><AlertDialogDescription>The user will be signed out immediately and asked to re-authenticate.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={forceOut}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};
