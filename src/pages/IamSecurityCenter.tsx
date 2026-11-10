import { useMemo, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Fingerprint, Smartphone, Mail, MessageSquare,
  QrCode, Users, UserCheck, IdCard, Building2, Lock, Unlock, Globe2, MapPin, Wifi, WifiOff,
  Eye, EyeOff, AlertTriangle, Siren, Activity, ScrollText, Server, HardDrive, Cloud,
  Brain, Bell, MonitorSmartphone, Network, FileCheck2, Stethoscope, Power, RefreshCw,
  Download, Plus, Search, CheckCircle2, XCircle, Clock, Database,
} from 'lucide-react';

const navItems = [
  { label: 'IAM Overview', path: '/dashboard/superadmin/iam', icon: <Shield className="h-4 w-4" /> },
  { label: 'Authentication', path: '/dashboard/superadmin/iam/auth', icon: <KeyRound className="h-4 w-4" /> },
  { label: 'Identity (Staff/Patient)', path: '/dashboard/superadmin/iam/identity', icon: <IdCard className="h-4 w-4" /> },
  { label: 'NIN Integration', path: '/dashboard/superadmin/iam/nin', icon: <Fingerprint className="h-4 w-4" /> },
  { label: 'RBAC++', path: '/dashboard/superadmin/iam/rbac', icon: <Users className="h-4 w-4" /> },
  { label: 'Emergency Override', path: '/dashboard/superadmin/iam/emergency', icon: <Siren className="h-4 w-4" /> },
  { label: 'Audit Trails', path: '/dashboard/superadmin/iam/audit', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Geo / Device', path: '/dashboard/superadmin/iam/geo', icon: <Globe2 className="h-4 w-4" /> },
  { label: 'IP Restrictions', path: '/dashboard/superadmin/iam/ip', icon: <Network className="h-4 w-4" /> },
  { label: 'Sessions', path: '/dashboard/superadmin/iam/sessions', icon: <MonitorSmartphone className="h-4 w-4" /> },
  { label: 'Threat Detection', path: '/dashboard/superadmin/iam/threats', icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Encryption', path: '/dashboard/superadmin/iam/encryption', icon: <Lock className="h-4 w-4" /> },
  { label: 'Cloud / Offline', path: '/dashboard/superadmin/iam/hybrid', icon: <Cloud className="h-4 w-4" /> },
  { label: 'AI Security', path: '/dashboard/superadmin/iam/ai', icon: <Brain className="h-4 w-4" /> },
  { label: 'Alert Engine', path: '/dashboard/superadmin/iam/alerts', icon: <Bell className="h-4 w-4" /> },
  { label: 'Mobile / PWA', path: '/dashboard/superadmin/iam/mobile', icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Compliance (NDPR)', path: '/dashboard/superadmin/iam/compliance', icon: <FileCheck2 className="h-4 w-4" /> },
  { label: 'Psychiatric Confidentiality', path: '/dashboard/superadmin/iam/confidentiality', icon: <EyeOff className="h-4 w-4" /> },
  { label: 'API Security', path: '/dashboard/superadmin/iam/api', icon: <Server className="h-4 w-4" /> },
  { label: 'SOC Dashboard', path: '/dashboard/superadmin/iam/soc', icon: <Activity className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={navItems} title={`IAM & Security · ${title}`}>{children}</DashboardLayout>
);

const SectionHeader = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

// ============ 1. OVERVIEW ============
export const IamOverview = () => {
  const layers = [
    { name: 'Identity Layer', status: 'Healthy', icon: <IdCard className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Access Control', status: 'Healthy', icon: <KeyRound className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Authentication', status: 'Healthy', icon: <Lock className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Authorization', status: 'Healthy', icon: <ShieldCheck className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Monitoring & Audit', status: 'Warning', icon: <ScrollText className="h-4 w-4" />, color: 'warning' },
    { name: 'Encryption', status: 'Healthy', icon: <Lock className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Compliance', status: 'Healthy', icon: <FileCheck2 className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Interoperability', status: 'Healthy', icon: <Network className="h-4 w-4" />, color: 'tertiary' },
    { name: 'Emergency Access', status: 'Standby', icon: <Siren className="h-4 w-4" />, color: 'sky' },
  ];
  return (
    <Shell title="Overview">
      <SectionHeader icon={<Shield className="h-5 w-5" />} title="Authentication, Security & Identity Core"
        desc="Centralized IAM powering every HMS + EMR module of GFA Demo Hospital." />
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Active Sessions" value="248" icon={MonitorSmartphone} subtitle={'+12 vs 1h ago'} trend="up" />
        <SummaryCard title="Failed Logins (24h)" value="37" icon={AlertTriangle} subtitle={'-8%'} trend="up" />
        <SummaryCard title="Threat Score" value="Low" icon={ShieldCheck} subtitle={'Stable'} trend="up" />
        <SummaryCard title="Emergency Overrides (7d)" value="2" icon={Siren} subtitle={'Auto-audited'} trend="up" />
      </div>
      <Card>
        <h3 className="font-display font-semibold mb-4">Security Layer Health</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {layers.map(l => (
            <div key={l.name} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{l.icon}</div>
                <div className="text-sm font-medium">{l.name}</div>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============ 2. AUTHENTICATION ============
export const IamAuthentication = () => {
  const [methods, setMethods] = useState({
    password: true, otpEmail: true, otpSms: true, otpWhatsapp: true, totp: true,
    push: false, magicLink: true, qr: true, biometricFingerprint: true, biometricFace: true,
  });
  const [otpTtl, setOtpTtl] = useState(5);
  const [otpResendCool, setOtpResendCool] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const toggle = (k: keyof typeof methods) => {
    setMethods(m => ({ ...m, [k]: !m[k] }));
    toast.success(`${k} ${!methods[k] ? 'enabled' : 'disabled'}`);
  };

  return (
    <Shell title="Authentication">
      <SectionHeader icon={<KeyRound className="h-5 w-5" />} title="Multi-Layer Authentication Engine"
        desc="OTP, 2FA, passwordless and biometric login flows with brute-force protection." />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Authentication Methods</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              ['password', 'Password Login', <Lock className="h-4 w-4" />],
              ['otpEmail', 'Email OTP', <Mail className="h-4 w-4" />],
              ['otpSms', 'SMS OTP', <Smartphone className="h-4 w-4" />],
              ['otpWhatsapp', 'WhatsApp OTP', <MessageSquare className="h-4 w-4" />],
              ['totp', 'Authenticator App (TOTP)', <ShieldCheck className="h-4 w-4" />],
              ['push', 'Push Notification 2FA', <Bell className="h-4 w-4" />],
              ['magicLink', 'Magic Link', <Mail className="h-4 w-4" />],
              ['qr', 'QR Kiosk Login', <QrCode className="h-4 w-4" />],
              ['biometricFingerprint', 'Fingerprint', <Fingerprint className="h-4 w-4" />],
              ['biometricFace', 'Facial Recognition', <UserCheck className="h-4 w-4" />],
            ] as const).map(([k, label, icon]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
                  <div className="text-sm font-medium">{label}</div>
                </div>
                <Switch checked={methods[k as keyof typeof methods]} onCheckedChange={() => toggle(k as any)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display font-semibold mb-4">OTP & Brute-force Policy</h3>
          <div className="space-y-3">
            <div>
              <Label>OTP expiration (minutes)</Label>
              <Input type="number" value={otpTtl} onChange={e => setOtpTtl(+e.target.value)} />
            </div>
            <div>
              <Label>OTP resend cooldown (seconds)</Label>
              <Input type="number" value={otpResendCool} onChange={e => setOtpResendCool(+e.target.value)} />
            </div>
            <div>
              <Label>Max failed attempts → lock</Label>
              <Input type="number" value={maxAttempts} onChange={e => setMaxAttempts(+e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => toast.success('Authentication policy saved')}>Save Policy</Button>
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <h3 className="font-display font-semibold mb-3">Recovery & Backup Codes</h3>
        <div className="flex flex-wrap gap-2">
          {['9F2A-8C71', '4B6D-1E09', 'AA73-5F22', '0D81-92CB', '77F0-3A4E', 'C129-BB07'].map(c => (
            <code key={c} className="px-3 py-1.5 rounded-md bg-muted text-sm font-mono">{c}</code>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success('New backup codes generated')}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
        </Button>
      </Card>
    </Shell>
  );
};

// ============ 3. IDENTITY MGMT ============
export const IamIdentity = () => {
  const staff = [
    { id: 'STF-1042', name: 'Dr. Adebola Lawal', dept: 'Psychiatry', type: 'Direct', license: 'MDCN-78421', status: 'Active' },
    { id: 'STF-1078', name: 'Nurse Chioma Eze', dept: 'IPD Ward B', type: 'Direct', license: 'NMCN-22013', status: 'Active' },
    { id: 'STF-2210', name: 'Dr. Olu Ibrahim', dept: 'Residency', type: 'Residency', license: 'MDCN-91220', status: 'Active' },
    { id: 'STF-3001', name: 'NYSC – Tolu Bello', dept: 'Records', type: 'NYSC', license: 'N/A', status: 'Active' },
    { id: 'STF-4112', name: 'Affiliate – Dr. Okafor', dept: 'Lab', type: 'Affiliate', license: 'MLSCN-44210', status: 'Suspended' },
  ];
  const patients = [
    { mpi: 'MPI-00012', name: 'Adaeze Nwosu', nin: '12345678901', conf: 'Standard', cg: 'Mother', dup: 0 },
    { mpi: 'MPI-00097', name: 'Bola Adeyemi', nin: 'Pending', conf: 'Psychiatric-Restricted', cg: 'Sister', dup: 1 },
    { mpi: 'MPI-00145', name: 'Ifeanyi Okeke', nin: '98765432109', conf: 'Suicide-Risk Restricted', cg: 'Brother', dup: 0 },
  ];
  return (
    <Shell title="Identity Management">
      <SectionHeader icon={<IdCard className="h-5 w-5" />} title="Enterprise Identity Management"
        desc="Master Patient Identity (MPI), staff onboarding, licensure tracking, biometric linkage and caregiver maps." />
      <Tabs defaultValue="staff">
        <TabsList><TabsTrigger value="staff">Staff Identity</TabsTrigger><TabsTrigger value="patient">Patient Identity (MPI)</TabsTrigger></TabsList>
        <TabsContent value="staff" className="mt-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Staff Directory</h3>
              <Button size="sm" onClick={() => toast.success('Staff onboarding wizard opened')}><Plus className="h-3.5 w-3.5 mr-1" /> Onboard Staff</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Type</TableHead><TableHead>License</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {staff.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.dept}</TableCell>
                    <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{s.license}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => toast.success(`Audit log opened for ${s.id}`)}>Audit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="patient" className="mt-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Master Patient Index</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.success('Duplicate detection sweep started')}>Detect Duplicates</Button>
                <Button size="sm" onClick={() => toast.success('e-Card generation queued')}><QrCode className="h-3.5 w-3.5 mr-1" /> Generate e-Cards</Button>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>MPI</TableHead><TableHead>Patient</TableHead><TableHead>NIN</TableHead><TableHead>Confidentiality</TableHead><TableHead>Caregiver</TableHead><TableHead>Duplicates</TableHead></TableRow></TableHeader>
              <TableBody>
                {patients.map(p => (
                  <TableRow key={p.mpi}>
                    <TableCell className="font-mono text-xs">{p.mpi}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.nin}</TableCell>
                    <TableCell><StatusBadge status={p.conf} /></TableCell>
                    <TableCell>{p.cg}</TableCell>
                    <TableCell>{p.dup > 0 ? <Badge variant="destructive">{p.dup}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </Shell>
  );
};

// ============ 4. NIN INTEGRATION ============
export const IamNin = () => {
  const [nin, setNin] = useState('');
  const [result, setResult] = useState<any>(null);
  const verify = () => {
    if (nin.length !== 11) { toast.error('NIN must be 11 digits'); return; }
    setResult({ name: 'ADEYEMI, BOLA SAMUEL', dob: '1989-04-12', gender: 'Male', phone: '+234 803••• ••12', status: 'Verified', match: 96 });
    toast.success('NIN verified via federal directory (simulated)');
  };
  return (
    <Shell title="NIN Integration">
      <SectionHeader icon={<Fingerprint className="h-5 w-5" />} title="Nigerian Federal Identity Integration"
        desc="NIN-based identity verification, multi-hospital matching and consent-based tokenization (NIMC-ready architecture)." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-semibold mb-3">NIN Verification Console</h3>
          <Label>National Identification Number</Label>
          <div className="flex gap-2 mt-1">
            <Input value={nin} maxLength={11} onChange={e => setNin(e.target.value.replace(/\D/g, ''))} placeholder="11-digit NIN" />
            <Button onClick={verify}><Search className="h-4 w-4 mr-1" /> Verify</Button>
          </div>
          {result && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span className="font-medium">{result.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">DOB</span><span>{result.dob}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span>{result.gender}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{result.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Confidence</span><span className="font-semibold text-tertiary">{result.match}%</span></div>
              <Button size="sm" className="w-full mt-2" onClick={() => toast.success('Linked to MPI with consent token')}>Link to Patient MPI</Button>
            </div>
          )}
        </Card>
        <Card>
          <h3 className="font-display font-semibold mb-3">Federal Interoperability Status</h3>
          <div className="space-y-3">
            {[
              ['NIMC Endpoint', 'Architecture-ready (placeholder)', 'sky'],
              ['Consent Vault', 'Operational', 'tertiary'],
              ['Multi-Hospital Match', '3 partner hospitals', 'tertiary'],
              ['Identity Tokenization', 'AES-256 + JWT', 'tertiary'],
              ['FHIR Patient Resource', 'Mapped', 'tertiary'],
            ].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center justify-between border-b last:border-0 py-2">
                <span className="text-sm">{k}</span>
                <StatusBadge status={v as string} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 5. RBAC++ ============
export const IamRbac = () => {
  const matrix = [
    { perm: 'View Clinical Notes', psy: true, doc: true, nur: true, pha: false, fin: false, adm: true },
    { perm: 'Edit Prescriptions', psy: true, doc: true, nur: false, pha: false, fin: false, adm: false },
    { perm: 'Dispense Medication', psy: false, doc: false, nur: true, pha: true, fin: false, adm: false },
    { perm: 'View Billing', psy: false, doc: false, nur: false, pha: false, fin: true, adm: true },
    { perm: 'Export Patient Data', psy: false, doc: false, nur: false, pha: false, fin: false, adm: true },
    { perm: 'Emergency Override', psy: true, doc: true, nur: false, pha: false, fin: false, adm: true },
    { perm: 'View Psych Therapy Notes', psy: true, doc: false, nur: false, pha: false, fin: false, adm: false },
  ];
  return (
    <Shell title="RBAC++">
      <SectionHeader icon={<Users className="h-5 w-5" />} title="Role-Based Access Control (RBAC++)"
        desc="Dynamic roles, multi-role assignment, time-limited & department-scoped access for clinical and non-clinical staff." />
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Permission</TableHead>
            <TableHead className="text-center">Psychiatrist</TableHead>
            <TableHead className="text-center">Doctor</TableHead>
            <TableHead className="text-center">Nurse</TableHead>
            <TableHead className="text-center">Pharmacist</TableHead>
            <TableHead className="text-center">Finance</TableHead>
            <TableHead className="text-center">Admin</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {matrix.map(row => (
              <TableRow key={row.perm}>
                <TableCell className="font-medium">{row.perm}</TableCell>
                {['psy', 'doc', 'nur', 'pha', 'fin', 'adm'].map(k => (
                  <TableCell key={k} className="text-center">
                    {(row as any)[k] ? <CheckCircle2 className="h-4 w-4 text-tertiary inline" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => toast.success('Matrix exported')}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => toast.success('Permission matrix saved')}>Save Changes</Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        {[
          { t: 'Location-based', d: 'Restrict access to GFA HMS LAN ranges', i: <MapPin className="h-4 w-4" /> },
          { t: 'Shift-based', d: 'Auto-grant during assigned roster shifts', i: <Clock className="h-4 w-4" /> },
          { t: 'Device-based', d: 'Allow only registered hospital devices', i: <MonitorSmartphone className="h-4 w-4" /> },
        ].map(c => (
          <Card key={c.t}>
            <div className="flex items-center gap-2 mb-2"><div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">{c.i}</div><div className="font-semibold">{c.t}</div></div>
            <p className="text-xs text-muted-foreground mb-3">{c.d}</p>
            <Switch defaultChecked />
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 6. EMERGENCY OVERRIDE ============
export const IamEmergency = () => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState('Suicide/Crisis');
  const [events, setEvents] = useState([
    { t: '2026-05-27 22:14', who: 'Dr. Lawal', mode: 'ICU Override', dur: 60, reason: 'Cardiac arrest – ward 4B', status: 'Closed' },
    { t: '2026-05-25 11:02', who: 'Dr. Ibrahim', mode: 'Suicide/Crisis', dur: 30, reason: 'Patient self-harm risk', status: 'Closed' },
  ]);
  const fire = () => {
    if (!reason) { toast.error('Reason is required'); return; }
    setEvents([{ t: new Date().toLocaleString(), who: 'You', mode, dur: duration, reason, status: 'Active' }, ...events]);
    setOpen(false); setReason('');
    toast.success('Emergency access granted – admins alerted, full audit logged');
  };
  return (
    <Shell title="Emergency Access">
      <SectionHeader icon={<Siren className="h-5 w-5" />} title="Break-Glass Emergency Override"
        desc="Psychiatric and ICU emergency override with mandatory reason capture, auto-expiry and real-time admin alerts."
        action={<Button variant="destructive" onClick={() => setOpen(true)}><Siren className="h-4 w-4 mr-1" /> Activate Break-Glass</Button>} />
      <Card>
        <h3 className="font-display font-semibold mb-3">Override Audit Log</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Initiator</TableHead><TableHead>Mode</TableHead><TableHead>Duration</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {events.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{e.t}</TableCell>
                <TableCell>{e.who}</TableCell>
                <TableCell><Badge variant="outline">{e.mode}</Badge></TableCell>
                <TableCell>{e.dur} min</TableCell>
                <TableCell className="max-w-sm truncate">{e.reason}</TableCell>
                <TableCell><StatusBadge status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-destructive" /> Break-Glass Emergency Access</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Suicide/Crisis">Suicide / Crisis</SelectItem>
                  <SelectItem value="ICU Override">ICU Override</SelectItem>
                  <SelectItem value="Mass Casualty">Mass Casualty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duration (minutes)</Label><Input type="number" value={duration} onChange={e => setDuration(+e.target.value)} /></div>
            <div><Label>Justification (mandatory)</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" onClick={fire}>Grant Emergency Access</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 7. AUDIT ============
export const IamAudit = () => {
  const rows = [
    { t: '11:42:08', u: 'doctor@gfa-health.demo', a: 'Viewed clinical note', tgt: 'MPI-00012', ip: '10.20.4.18', ok: true },
    { t: '11:41:55', u: 'finance@gfa-health.demo', a: 'Edited invoice', tgt: 'INV-3014', ip: '10.20.5.4', ok: true },
    { t: '11:39:12', u: 'unknown', a: 'Failed login (×4)', tgt: 'records@gfa-health.demo', ip: '102.89.33.10', ok: false },
    { t: '11:30:01', u: 'nurse@gfa-health.demo', a: 'Exported MAR PDF', tgt: 'Ward 4B', ip: '10.20.4.55', ok: true },
    { t: '11:21:44', u: 'admin@gfa-health.demo', a: 'Role change', tgt: 'STF-2210 → +emergency_override', ip: '10.20.1.2', ok: true },
  ];
  return (
    <Shell title="Audit Trails">
      <SectionHeader icon={<ScrollText className="h-5 w-5" />} title="Access Logs & Audit Trails"
        desc="Tamper-evident logs across logins, EMR views, prescription edits, exports and role changes."
        action={<Button variant="outline" size="sm" onClick={() => toast.success('Audit export queued (CSV)')}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>} />
      <Card>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by user, action, IP, target..." className="pl-9" />
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>IP</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{r.t}</TableCell>
                <TableCell>{r.u}</TableCell>
                <TableCell>{r.a}</TableCell>
                <TableCell className="font-mono text-xs">{r.tgt}</TableCell>
                <TableCell className="font-mono text-xs">{r.ip}</TableCell>
                <TableCell>{r.ok ? <StatusBadge status="OK" /> : <StatusBadge status="Denied" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 8. GEO / DEVICE ============
export const IamGeo = () => {
  const devices = [
    { dev: 'MacBook Pro · Chrome', user: 'cmd@gfa-health.demo', loc: 'Abeokuta, NG', trust: 98, status: 'Trusted' },
    { dev: 'iPhone 14 · Safari', user: 'doctor@gfa-health.demo', loc: 'Abeokuta, NG', trust: 92, status: 'Trusted' },
    { dev: 'Windows · Edge', user: 'unknown@…', loc: 'Lagos, NG', trust: 41, status: 'Unverified' },
    { dev: 'Android · Chrome', user: 'finance@gfa-health.demo', loc: 'Accra, GH', trust: 12, status: 'Suspicious' },
  ];
  return (
    <Shell title="Geo / Device Monitoring">
      <SectionHeader icon={<Globe2 className="h-5 w-5" />} title="Geo-Location & Device Monitoring"
        desc="Device trust scoring, fingerprinting, impossible-travel detection and geo restriction rules." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>User</TableHead><TableHead>Location</TableHead><TableHead>Trust Score</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {devices.map((d, i) => (
              <TableRow key={i}>
                <TableCell>{d.dev}</TableCell>
                <TableCell className="text-xs">{d.user}</TableCell>
                <TableCell className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />{d.loc}</TableCell>
                <TableCell className="w-40"><Progress value={d.trust} /><span className="text-[10px] text-muted-foreground">{d.trust}%</span></TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => toast.success(`${d.dev} revoked`)}>Revoke</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 9. IP RESTRICTIONS ============
export const IamIp = () => {
  const [whitelist, setWhitelist] = useState(['10.20.0.0/16', '102.89.10.0/24']);
  const [blacklist, setBlacklist] = useState(['185.220.101.0/24 (TOR exit)']);
  const [val, setVal] = useState('');
  return (
    <Shell title="IP Restrictions">
      <SectionHeader icon={<Network className="h-5 w-5" />} title="IP Restriction Engine"
        desc="LAN-only access, VPN/TOR detection, lockdown mode and geo-IP fencing." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-semibold mb-3 text-tertiary">Whitelist</h3>
          <div className="space-y-2 mb-3">
            {whitelist.map(ip => <div key={ip} className="flex justify-between items-center rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono">{ip}<Button size="sm" variant="ghost" onClick={() => setWhitelist(w => w.filter(x => x !== ip))}>Remove</Button></div>)}
          </div>
          <div className="flex gap-2"><Input placeholder="10.0.0.0/24" value={val} onChange={e => setVal(e.target.value)} /><Button onClick={() => { if (val) { setWhitelist([...whitelist, val]); setVal(''); toast.success('IP whitelisted'); } }}>Add</Button></div>
        </Card>
        <Card>
          <h3 className="font-display font-semibold mb-3 text-destructive">Blacklist</h3>
          <div className="space-y-2 mb-3">{blacklist.map(ip => <div key={ip} className="rounded-md border bg-destructive/5 px-3 py-2 text-sm font-mono">{ip}</div>)}</div>
          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30"><div><div className="font-medium text-sm">Block VPN / TOR</div><div className="text-xs text-muted-foreground">Auto-deny anonymizers</div></div><Switch defaultChecked /></div>
          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30 mt-2"><div><div className="font-medium text-sm">Lockdown Mode</div><div className="text-xs text-muted-foreground">Only whitelisted IPs allowed</div></div><Switch onCheckedChange={v => toast.warning(v ? 'Lockdown ENGAGED' : 'Lockdown disabled')} /></div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 10. SESSIONS ============
export const IamSessions = () => {
  const [sessions, setSessions] = useState([
    { id: 'S-9013', u: 'cmd@gfa-health.demo', dev: 'MacBook · Chrome', ip: '10.20.1.4', start: '08:12', idle: '2m' },
    { id: 'S-9014', u: 'doctor@gfa-health.demo', dev: 'iPhone · Safari', ip: '10.20.4.18', start: '09:01', idle: '15s' },
    { id: 'S-9020', u: 'finance@gfa-health.demo', dev: 'Windows · Edge', ip: '102.89.33.10', start: '10:44', idle: '42m' },
  ]);
  const kill = (id: string) => { setSessions(s => s.filter(x => x.id !== id)); toast.success(`Session ${id} terminated`); };
  return (
    <Shell title="Sessions">
      <SectionHeader icon={<MonitorSmartphone className="h-5 w-5" />} title="Session Management"
        desc="Active sessions, idle timeouts, concurrent-login policy and emergency termination."
        action={<Button variant="destructive" size="sm" onClick={() => { setSessions([]); toast.success('All sessions terminated'); }}><Power className="h-3.5 w-3.5 mr-1" /> Kill All</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Session</TableHead><TableHead>User</TableHead><TableHead>Device</TableHead><TableHead>IP</TableHead><TableHead>Started</TableHead><TableHead>Idle</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {sessions.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No active sessions</TableCell></TableRow> :
              sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell>{s.u}</TableCell>
                  <TableCell className="text-xs">{s.dev}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                  <TableCell>{s.start}</TableCell>
                  <TableCell>{s.idle}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => kill(s.id)}>End</Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 11. THREAT DETECTION ============
export const IamThreats = () => {
  const threats = [
    { sev: 'high', t: 'Brute-force attempt – records@', d: '7 failed logins in 90s from 102.89.33.10', age: '4 min ago' },
    { sev: 'medium', t: 'Impossible travel – finance@', d: 'Login from Lagos then Accra within 18m', age: '22 min ago' },
    { sev: 'low', t: 'Unusual export volume – nurse@', d: '14 MAR sheets exported (avg 3/day)', age: '1 hr ago' },
  ];
  return (
    <Shell title="Threat Detection">
      <SectionHeader icon={<ShieldAlert className="h-5 w-5" />} title="Suspicious Activity Detection"
        desc="ML-assisted detection of brute-force, anomalous access, account switching and hijacking attempts." />
      <div className="space-y-3">
        {threats.map((t, i) => (
          <Card key={i} className={t.sev === 'high' ? 'border-destructive/40 bg-destructive/5' : t.sev === 'medium' ? 'border-warning/40 bg-warning/5' : ''}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 ${t.sev === 'high' ? 'text-destructive' : t.sev === 'medium' ? 'text-warning' : 'text-sky'}`} />
                <div>
                  <div className="font-semibold">{t.t}</div>
                  <div className="text-sm text-muted-foreground">{t.d}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.age}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.success('Account auto-locked')}>Lock</Button>
                <Button size="sm" onClick={() => toast.success('Incident escalated to SOC')}>Escalate</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 12. ENCRYPTION ============
export const IamEncryption = () => {
  const items = [
    ['Database at rest', 'AES-256', true],
    ['Patient records (field-level)', 'AES-256-GCM', true],
    ['Psychiatric notes', 'AES-256-GCM + envelope', true],
    ['Lab results', 'AES-256', true],
    ['Backups', 'AES-256 + KMS', true],
    ['API in-transit', 'TLS 1.3', true],
    ['End-to-end messaging', 'Signal Protocol', false],
  ];
  return (
    <Shell title="Encryption">
      <SectionHeader icon={<Lock className="h-5 w-5" />} title="Data Encryption Engine"
        desc="AES-256 at rest, TLS 1.3 in transit, field-level encryption for psychiatric & identity data." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Algorithm</TableHead><TableHead>Enabled</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(([k, alg, on], i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{k as string}</TableCell>
                <TableCell className="font-mono text-xs">{alg as string}</TableCell>
                <TableCell><Switch defaultChecked={on as boolean} onCheckedChange={v => toast.success(`${k} encryption ${v ? 'enabled' : 'disabled'}`)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success('Master KMS key rotation scheduled')}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Rotate Master Key</Button>
      </Card>
    </Shell>
  );
};

// ============ 13. CLOUD/OFFLINE ============
export const IamHybrid = () => (
  <Shell title="Cloud / Offline">
    <SectionHeader icon={<Cloud className="h-5 w-5" />} title="Cloud + Offline Security Architecture"
      desc="Hybrid hospital infrastructure with offline auth cache and federated multi-site sync." />
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <div className="flex items-center gap-2 mb-3"><Cloud className="h-5 w-5 text-primary" /><h3 className="font-display font-semibold">Cloud Sync</h3></div>
        <div className="text-sm text-muted-foreground mb-3">Primary identity store synchronized across 3 sites.</div>
        <Progress value={97} /><div className="text-xs mt-1">97% sync health</div>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-3"><WifiOff className="h-5 w-5 text-warning" /><h3 className="font-display font-semibold">Offline Auth Cache</h3></div>
        <div className="text-sm text-muted-foreground mb-3">Encrypted local cache for clinical continuity during outages.</div>
        <div className="flex items-center justify-between"><span className="text-sm">Cache enabled</span><Switch defaultChecked /></div>
        <div className="flex items-center justify-between mt-2"><span className="text-sm">Disaster Recovery Auth</span><Switch defaultChecked /></div>
      </Card>
    </div>
  </Shell>
);

// ============ 14. AI SECURITY ============
export const IamAi = () => (
  <Shell title="AI Security">
    <SectionHeader icon={<Brain className="h-5 w-5" />} title="AI-Powered Security Intelligence"
      desc="Behavioral login analysis, anomaly detection and risk scoring." />
    <div className="grid md:grid-cols-3 gap-4">
      <Card><div className="text-xs text-muted-foreground">Population Risk</div><div className="text-3xl font-bold text-tertiary mt-1">Low</div><Progress value={22} className="mt-3" /></Card>
      <Card><div className="text-xs text-muted-foreground">High-Risk Users</div><div className="text-3xl font-bold mt-1">4</div><div className="text-xs text-muted-foreground mt-3">Flagged for forced re-auth</div></Card>
      <Card><div className="text-xs text-muted-foreground">Anomalies (24h)</div><div className="text-3xl font-bold text-warning mt-1">11</div><div className="text-xs text-muted-foreground mt-3">3 require analyst review</div></Card>
    </div>
    <Card className="mt-5">
      <h3 className="font-display font-semibold mb-3">User Risk Scores</h3>
      {[['finance@gfa-health.demo', 78, 'High'], ['records@gfa-health.demo', 54, 'Medium'], ['doctor@gfa-health.demo', 18, 'Low']].map(([u, s, lvl]) => (
        <div key={u as string} className="flex items-center gap-3 py-2 border-b last:border-0">
          <div className="text-sm flex-1">{u}</div>
          <Progress value={s as number} className="w-48" />
          <Badge variant={lvl === 'High' ? 'destructive' : lvl === 'Medium' ? 'secondary' : 'outline'}>{lvl}</Badge>
        </div>
      ))}
    </Card>
  </Shell>
);

// ============ 15. ALERTS ============
export const IamAlerts = () => {
  const [channels, setChannels] = useState({ sms: true, email: true, whatsapp: true, push: true });
  return (
    <Shell title="Alert Engine">
      <SectionHeader icon={<Bell className="h-5 w-5" />} title="Security Alert & Notification Engine"
        desc="Multi-channel alerts for critical security events." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-semibold mb-3">Channels</h3>
          {Object.entries(channels).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="capitalize">{k}</div>
              <Switch checked={v} onCheckedChange={() => setChannels(c => ({ ...c, [k]: !v }))} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="font-display font-semibold mb-3">Triggers</h3>
          {['Failed login burst', 'New device sign-in', 'Geo-anomaly', 'Emergency override fired', 'NHIA claim tampering'].map(t => (
            <div key={t} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>{t}</div><Switch defaultChecked />
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
};

// ============ 16. MOBILE / PWA ============
export const IamMobile = () => (
  <Shell title="Mobile / PWA">
    <SectionHeader icon={<Smartphone className="h-5 w-5" />} title="Mobile & PWA Security"
      desc="Biometric, OTP and device-trust for the mobile and progressive web app surface." />
    <div className="grid md:grid-cols-2 gap-4">
      {[
        ['Biometric mobile auth', true],
        ['Mobile OTP fallback', true],
        ['Device trust verification', true],
        ['PWA offline auth', true],
        ['Auto-logout on background', true],
        ['Jailbreak / root detection', false],
      ].map(([k, v]) => (
        <Card key={k as string}><div className="flex items-center justify-between"><div className="font-medium">{k}</div><Switch defaultChecked={v as boolean} /></div></Card>
      ))}
    </div>
  </Shell>
);

// ============ 17. COMPLIANCE ============
export const IamCompliance = () => {
  const items = [
    ['NDPR (Nigeria Data Protection Regulation)', 100],
    ['Medical Confidentiality Policy', 96],
    ['Psychiatric Confidentiality Governance', 98],
    ['Audit Readiness', 92],
    ['Consent Tracking', 89],
    ['Data Retention (7y clinical, 2y access logs)', 100],
  ];
  return (
    <Shell title="Compliance">
      <SectionHeader icon={<FileCheck2 className="h-5 w-5" />} title="Compliance & Governance"
        desc="Nigerian healthcare compliance, NDPR posture, consent tracking and retention rules." />
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(([k, v]) => (
          <Card key={k as string}>
            <div className="flex justify-between mb-2"><div className="font-medium text-sm">{k}</div><div className="text-sm font-bold text-tertiary">{v}%</div></div>
            <Progress value={v as number} />
          </Card>
        ))}
      </div>
      <Button className="mt-4" variant="outline" onClick={() => toast.success('Compliance report exported')}><Download className="h-4 w-4 mr-1" /> Download Compliance Report</Button>
    </Shell>
  );
};

// ============ 18. PSYCH CONFIDENTIALITY ============
export const IamConfidentiality = () => (
  <Shell title="Psychiatric Confidentiality">
    <SectionHeader icon={<EyeOff className="h-5 w-5" />} title="Psychiatric Data Confidentiality Layer"
      desc="Specialized protection for psychotherapy notes, suicide-risk records and sensitive diagnoses." />
    <div className="grid md:grid-cols-2 gap-4">
      {[
        'Hide psychiatric notes from non-clinical roles',
        'Restrict therapy notes to assigned therapist',
        'Mask sensitive diagnoses (ICD-11 F-codes) in billing views',
        'Department-based psychiatric visibility',
        'Patient portal: hide suicide-risk indicators',
        'Confidential session protection (2-key access)',
      ].map(rule => (
        <Card key={rule}>
          <div className="flex items-center justify-between"><div className="font-medium text-sm">{rule}</div><Switch defaultChecked /></div>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 19. API SECURITY ============
export const IamApi = () => (
  <Shell title="API Security">
    <SectionHeader icon={<Server className="h-5 w-5" />} title="API & Interoperability Security"
      desc="OAuth2 / OpenID, FHIR security, API tokens, webhook signing and rate limiting." />
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Token</TableHead><TableHead>Scope</TableHead><TableHead>Issued</TableHead><TableHead>Expires</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            ['fhir_partner_lagosuth', 'fhir:patient.read', '2026-04-01', '2026-10-01'],
            ['nhia_claims_bot', 'claims:write', '2026-05-10', '2026-08-10'],
            ['mobile_app_prod', 'patient:self', '2026-05-25', '2027-05-25'],
          ].map(([n, s, i, e]) => (
            <TableRow key={n}>
              <TableCell className="font-mono text-xs">{n}</TableCell>
              <TableCell><Badge variant="outline">{s}</Badge></TableCell>
              <TableCell className="text-xs">{i}</TableCell>
              <TableCell className="text-xs">{e}</TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => toast.success(`${n} revoked`)}>Revoke</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 20. SOC DASHBOARD ============
export const IamSoc = () => {
  const heat = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ h, v: Math.floor(Math.random() * 100) })), []);
  return (
    <Shell title="SOC Dashboard">
      <SectionHeader icon={<Activity className="h-5 w-5" />} title="Real-Time Security Operations Center"
        desc="Live cybersecurity view across the hospital network." />
      <div className="grid md:grid-cols-4 gap-4 mb-5">
        <SummaryCard title="Active Users" value="248" icon={Users} />
        <SummaryCard title="Threats Open" value="3" icon={ShieldAlert} />
        <SummaryCard title="Logins (1h)" value="412" icon={KeyRound} />
        <SummaryCard title="Overrides Today" value="1" icon={Siren} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-semibold mb-3">24h Login Activity Heatmap</h3>
          <div className="flex items-end gap-1 h-40">
            {heat.map(h => (
              <div key={h.h} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/70" style={{ height: `${h.v}%`, minHeight: 4 }} />
                <div className="text-[9px] text-muted-foreground">{h.h}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display font-semibold mb-3">Department Access Trends</h3>
          {[['Psychiatry', 78], ['Pharmacy', 54], ['Lab', 41], ['Records', 33], ['Finance', 22]].map(([d, v]) => (
            <div key={d as string} className="mb-2">
              <div className="flex justify-between text-xs mb-1"><span>{d}</span><span className="text-muted-foreground">{v}</span></div>
              <Progress value={v as number} />
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
};