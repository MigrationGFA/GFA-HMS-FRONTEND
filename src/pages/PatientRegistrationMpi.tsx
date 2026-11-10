import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  IdCard, UserPlus, Search, Fingerprint, Camera, QrCode, CreditCard, Users, ShieldAlert,
  Network, Database, GitMerge, Footprints, Siren, BarChart3, ScrollText, Lock, Wifi,
  Smartphone, Brain, Workflow, CheckCircle2, AlertTriangle, Phone, MapPin, Heart,
  UserCheck, FileText, Activity, Download, Plus, RefreshCw, Eye, Baby, User as UserIcon,
} from 'lucide-react';

export const mpiNavItems = [
  { label: 'Registration Dashboard', path: '/dashboard/superadmin/mpi', icon: <IdCard className="h-4 w-4" /> },
  { label: 'New Patient', path: '/dashboard/superadmin/mpi/new', icon: <UserPlus className="h-4 w-4" /> },
  { label: 'Patient Lookup', path: '/dashboard/superadmin/mpi/lookup', icon: <Search className="h-4 w-4" /> },
  { label: 'NIN Integration', path: '/dashboard/superadmin/mpi/nin', icon: <Fingerprint className="h-4 w-4" /> },
  { label: 'NHIA / NHIS', path: '/dashboard/superadmin/mpi/nhia', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Photo Capture', path: '/dashboard/superadmin/mpi/photo', icon: <Camera className="h-4 w-4" /> },
  { label: 'Biometrics', path: '/dashboard/superadmin/mpi/biometrics', icon: <Fingerprint className="h-4 w-4" /> },
  { label: 'E-Card & QR', path: '/dashboard/superadmin/mpi/ecard', icon: <QrCode className="h-4 w-4" /> },
  { label: 'Family & Caregivers', path: '/dashboard/superadmin/mpi/family', icon: <Users className="h-4 w-4" /> },
  { label: 'Next of Kin', path: '/dashboard/superadmin/mpi/nok', icon: <Phone className="h-4 w-4" /> },
  { label: 'Psychiatric Risk Tags', path: '/dashboard/superadmin/mpi/risk', icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Cross-Facility Lookup', path: '/dashboard/superadmin/mpi/cross', icon: <Network className="h-4 w-4" /> },
  { label: 'Legacy EMR Sync', path: '/dashboard/superadmin/mpi/legacy', icon: <Database className="h-4 w-4" /> },
  { label: 'Duplicate Detection', path: '/dashboard/superadmin/mpi/duplicates', icon: <GitMerge className="h-4 w-4" /> },
  { label: 'Walk-in Registration', path: '/dashboard/superadmin/mpi/walkin', icon: <Footprints className="h-4 w-4" /> },
  { label: 'Emergency Registration', path: '/dashboard/superadmin/mpi/emergency', icon: <Siren className="h-4 w-4" /> },
  { label: 'Demographic Analytics', path: '/dashboard/superadmin/mpi/analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Registration Audit', path: '/dashboard/superadmin/mpi/audit', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Confidentiality', path: '/dashboard/superadmin/mpi/confidentiality', icon: <Lock className="h-4 w-4" /> },
  { label: 'Offline Capability', path: '/dashboard/superadmin/mpi/offline', icon: <Wifi className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: '/dashboard/superadmin/mpi/mobile', icon: <Smartphone className="h-4 w-4" /> },
  { label: 'AI Smart Matching', path: '/dashboard/superadmin/mpi/ai', icon: <Brain className="h-4 w-4" /> },
  { label: 'Workflow Integration', path: '/dashboard/superadmin/mpi/workflow', icon: <Workflow className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={mpiNavItems} title={`Patient Registration & MPI · ${title}`}>{children}</DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
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

// ============ 1. REGISTRATION DASHBOARD ============
export const MpiOverview = () => {
  const widgets = [
    { title: 'New Registrations Today', value: '47', subtitle: '↑ 12% vs yesterday', icon: UserPlus, tone: 'teal' as const },
    { title: 'Returning Patients', value: '128', subtitle: 'OPC + GMPC', icon: UserCheck, tone: 'blue' as const },
    { title: 'Walk-in Patients', value: '23', subtitle: 'Quick-reg mode', icon: Footprints, tone: 'amber' as const },
    { title: 'Emergency Registrations', value: '4', subtitle: 'Trauma + acute', icon: Siren, tone: 'rose' as const },
    { title: 'Pending Verification', value: '11', subtitle: 'NIN + NHIA queue', icon: AlertTriangle, tone: 'amber' as const },
    { title: 'Duplicate Alerts', value: '6', subtitle: 'Awaiting merge review', icon: GitMerge, tone: 'purple' as const },
    { title: 'NHIA Verifications', value: '34', subtitle: '92% success rate', icon: CreditCard, tone: 'green' as const },
    { title: 'Legacy EMR Sync', value: '98.4%', subtitle: 'Last sync 4 min ago', icon: Database, tone: 'indigo' as const },
    { title: 'Active Admissions', value: '186', subtitle: 'IPD + Ward-linked', icon: Heart, tone: 'rose' as const },
    { title: 'Cross-facility Lookups', value: '52', subtitle: 'Today', icon: Network, tone: 'teal' as const },
  ];
  const recent = [
    { id: 'GFA/HMS/2026/00451', name: 'Adebayo Okonkwo', type: 'OPC', tags: ['New', 'NIN ✓'], status: 'Active' },
    { id: 'GFA/HMS/2026/00450', name: 'Kemi Adeyemi', type: 'GMPC', tags: ['Returning'], status: 'Active' },
    { id: 'GFA/HMS/2026/00449', name: 'Unknown Male (Trauma)', type: 'Emergency', tags: ['Anonymous', 'Suicide Risk'], status: 'Pending' },
    { id: 'GFA/HMS/2026/00448', name: 'Ibrahim Lawal', type: 'Walk-in', tags: ['NHIA ✓'], status: 'Active' },
    { id: 'GFA/HMS/2026/00447', name: 'Funmi Bakare', type: 'OPC', tags: ['Returning', 'Caregiver-assisted'], status: 'Active' },
  ];
  return (
    <Shell title="Registration Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {widgets.map(w => <SummaryCard key={w.title} {...w} />)}
      </div>
      <Card>
        <Section icon={<Activity className="h-5 w-5" />} title="Recent Registrations" desc="Live feed of patient identity events across GFA HMS" />
        <Table>
          <TableHeader><TableRow>
            <TableHead>Hospital No.</TableHead><TableHead>Patient</TableHead><TableHead>Channel</TableHead>
            <TableHead>Tags</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>{recent.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell className="space-x-1">{r.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 2. NEW PATIENT REGISTRATION ============
export const MpiNewPatient = () => {
  const [dup, setDup] = useState<string[]>([]);
  const [photo, setPhoto] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Patient registered', { description: 'Hospital No. GFA/HMS/2026/00452 assigned. NIN queued for verification.' });
  };
  const checkDup = () => { setDup(['Adebayo Okonkwo · GFA/HMS/2023/00198 (90% match)']); toast.warning('Possible duplicate detected'); };
  return (
    <Shell title="New Patient Registration">
      <form onSubmit={handleSubmit}>
        <Card className="mb-5">
          <Section icon={<UserPlus className="h-5 w-5" />} title="Basic Information" desc="Core identity & contact details" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>First Name</Label><Input required /></div>
            <div><Label>Middle Name</Label><Input /></div>
            <div><Label>Last Name</Label><Input required onBlur={checkDup} /></div>
            <div><Label>Gender</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="m">Male</SelectItem><SelectItem value="f">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" /></div>
            <div><Label>Age (auto)</Label><Input value="—" disabled /></div>
            <div><Label>Phone</Label><Input type="tel" placeholder="0803..." /></div>
            <div><Label>Email</Label><Input type="email" /></div>
            <div><Label>Nationality</Label><Input defaultValue="Nigerian" /></div>
            <div className="sm:col-span-2"><Label>Residential Address</Label><Input /></div>
            <div><Label>State of Origin</Label><Input defaultValue="Ogun" /></div>
            <div><Label>LGA</Label><Input defaultValue="Abeokuta South" /></div>
            <div><Label>Town / City</Label><Input defaultValue="Abeokuta" /></div>
          </div>
          {dup.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
              <strong>Possible duplicates:</strong>
              <ul className="mt-1 list-disc pl-5">{dup.map(d => <li key={d}>{d}</li>)}</ul>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => toast.success('Merged into existing record')}>Merge</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setDup([])}>Continue as new</Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="mb-5">
          <Section icon={<UserIcon className="h-5 w-5" />} title="Nigerian Demographics" desc="Tribe, religion, education & social context" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Tribe / Ethnicity</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Yoruba', 'Igbo', 'Hausa', 'Fulani', 'Ijaw', 'Tiv', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Religion</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Christianity', 'Islam', 'Traditional', 'None', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Marital Status</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Single', 'Married', 'Divorced', 'Widowed', 'Separated'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Education</Label><Input placeholder="e.g. Tertiary" /></div>
            <div><Label>Occupation</Label><Input /></div>
            <div><Label>Employment Status</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Employed', 'Self-employed', 'Unemployed', 'Student', 'Retired'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Spoken Language</Label><Input placeholder="English, Yoruba" /></div>
            <div><Label>Disability Status</Label><Input placeholder="None / specify" /></div>
          </div>
        </Card>

        <Card className="mb-5">
          <Section icon={<ShieldAlert className="h-5 w-5" />} title="Psychiatric-Specific Demographics" desc="Sensitive — visible only to clinical roles" />
          <div className="grid sm:grid-cols-2 gap-3">
            {['Addiction history', 'Substance abuse history', 'Suicide risk history', 'Psychiatric history', 'Violence / aggression history', 'Behavioral risk indicators'].map(f => (
              <div key={f} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                <Label className="cursor-pointer">{f}</Label>
                <Switch />
              </div>
            ))}
            <div><Label>Vulnerability Class</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Standard', 'Child', 'Adolescent', 'Elderly / Psychogeriatric', 'Vulnerable adult'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} /></div>
          </div>
        </Card>

        <Card className="mb-5">
          <Section icon={<Camera className="h-5 w-5" />} title="Identity Capture" desc="Photo, NIN, NHIA & biometrics" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button type="button" variant="outline" onClick={() => { setPhoto(true); toast.success('Photo captured'); }}>
              <Camera className="h-4 w-4 mr-2" /> {photo ? 'Photo ✓' : 'Capture Photo'}
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.success('Fingerprint enrolled')}>
              <Fingerprint className="h-4 w-4 mr-2" /> Enroll Fingerprint
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.info('NIN verification queued')}>
              <IdCard className="h-4 w-4 mr-2" /> Verify NIN
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.info('NHIA check queued')}>
              <CreditCard className="h-4 w-4 mr-2" /> Check NHIA
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">Save Draft</Button>
          <Button type="submit"><CheckCircle2 className="h-4 w-4 mr-2" />Register Patient</Button>
        </div>
      </form>
    </Shell>
  );
};

// ============ 3. PATIENT LOOKUP ============
export const MpiLookup = () => {
  const [q, setQ] = useState('');
  const all = [
    { id: 'GFA/HMS/2025/01122', name: 'Adebayo Okonkwo', phone: '08031234567', nin: '12345678901', nhia: 'NHIA-AB-991', last: '2 days ago' },
    { id: 'GFA/HMS/2024/00845', name: 'Kemi Adeyemi', phone: '08056677889', nin: '23456789012', nhia: '—', last: '1 week ago' },
    { id: 'GFA/HMS/2023/00198', name: 'Adebayo Okonkwoh', phone: '08031234560', nin: '12345678999', nhia: 'NHIA-AB-990', last: '3 months ago' },
    { id: 'GFA/HMS/2026/00322', name: 'Ibrahim Lawal', phone: '08144556677', nin: '34567890123', nhia: 'NHIA-AB-781', last: 'today' },
  ];
  const results = useMemo(() => {
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter(p => Object.values(p).some(v => String(v).toLowerCase().includes(s)));
  }, [q]);
  return (
    <Shell title="Existing Patient Lookup">
      <Card className="mb-5">
        <Section icon={<Search className="h-5 w-5" />} title="Smart Patient Search" desc="Fuzzy, Soundex & cross-facility identifiers" />
        <div className="flex gap-2 mb-4">
          <Input placeholder="Hospital No., Name, Phone, NIN, NHIA, QR, Legacy ID, caregiver..." value={q} onChange={e => setQ(e.target.value)} className="flex-1" />
          <Button onClick={() => toast.info('Scanning QR / barcode...')}><QrCode className="h-4 w-4 mr-2" />Scan</Button>
          <Button variant="outline" onClick={() => toast.info('Biometric lookup ready')}><Fingerprint className="h-4 w-4 mr-2" />Biometric</Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {['Fuzzy match', 'Similar-name detection', 'Soundex', 'Cross-facility', 'Recently accessed'].map(t => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Hospital No.</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
            <TableHead>NIN</TableHead><TableHead>NHIA</TableHead><TableHead>Last Visit</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>{results.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.id}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.phone}</TableCell>
              <TableCell className="font-mono text-xs">{p.nin}</TableCell>
              <TableCell>{p.nhia}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{p.last}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`Opening ${p.name}`)}>Open</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 4. NIN INTEGRATION ============
export const MpiNin = () => {
  const [nin, setNin] = useState('');
  const [result, setResult] = useState<any>(null);
  const verify = () => {
    if (nin.length < 11) return toast.error('NIN must be 11 digits');
    setResult({ name: 'OKONKWO, ADEBAYO TUNDE', dob: '1987-04-12', gender: 'Male', confidence: 96 });
    toast.success('NIN verified · identity confidence 96%');
  };
  return (
    <Shell title="NIN Integration">
      <Card className="mb-5">
        <Section icon={<Fingerprint className="h-5 w-5" />} title="National ID Verification" desc="Consent-based federal identity lookup with tokenized storage" />
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div><Label>Patient NIN</Label><Input maxLength={11} value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, ''))} placeholder="11-digit NIN" /></div>
            <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Patient consent obtained</Label></div>
            <Button onClick={verify}><CheckCircle2 className="h-4 w-4 mr-2" />Verify & Auto-fill</Button>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="font-semibold mb-2">Verification Result</div>
            {result ? (
              <div className="space-y-1">
                <div><span className="text-muted-foreground">Name:</span> {result.name}</div>
                <div><span className="text-muted-foreground">DOB:</span> {result.dob}</div>
                <div><span className="text-muted-foreground">Gender:</span> {result.gender}</div>
                <div className="mt-2"><span className="text-muted-foreground">Identity Confidence:</span> <strong>{result.confidence}%</strong></div>
                <Progress value={result.confidence} className="mt-1" />
              </div>
            ) : <div className="text-muted-foreground">Enter NIN and verify to populate.</div>}
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-4 gap-3">
          {[
            ['Tokenized storage', 'Active'],
            ['Duplicate prevention', 'Active'],
            ['Federal readiness', 'Synced'],
            ['Consent log', 'Active'],
          ].map(([k, s]) => (
            <div key={k} className="p-3 rounded-lg border bg-card text-sm flex items-center justify-between">
              <span>{k}</span><StatusBadge status={s} />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============ 5. NHIA / NHIS ============
export const MpiNhia = () => {
  const queue = [
    { id: 'NH-2261', patient: 'Ibrahim Lawal', nhia: 'NHIA-AB-781', hmo: 'Hygeia', coverage: 'Active', status: 'Verified' },
    { id: 'NH-2262', patient: 'Funmi Bakare', nhia: 'NHIA-AB-820', hmo: 'AXA Mansard', coverage: 'Active', status: 'Pending' },
    { id: 'NH-2263', patient: 'Yusuf Adamu', nhia: 'NHIA-KN-118', hmo: 'AIICO', coverage: 'Expired', status: 'Failed' },
  ];
  return (
    <Shell title="NHIA / NHIS Integration">
      <Card>
        <Section icon={<CreditCard className="h-5 w-5" />} title="Insurance Eligibility" desc="Auto-link verified patients to the billing engine" />
        <Table>
          <TableHeader><TableRow>
            <TableHead>Ref</TableHead><TableHead>Patient</TableHead><TableHead>NHIA No.</TableHead>
            <TableHead>HMO</TableHead><TableHead>Coverage</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>{queue.map(q => (
            <TableRow key={q.id}>
              <TableCell className="font-mono text-xs">{q.id}</TableCell>
              <TableCell>{q.patient}</TableCell>
              <TableCell className="font-mono text-xs">{q.nhia}</TableCell>
              <TableCell>{q.hmo}</TableCell>
              <TableCell>{q.coverage}</TableCell>
              <TableCell><StatusBadge status={q.status} /></TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success('Re-checked NHIA eligibility')}>Re-verify</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 6. PHOTO CAPTURE ============
export const MpiPhoto = () => {
  const [captured, setCaptured] = useState(false);
  return (
    <Shell title="Photo Capture System">
      <Card>
        <Section icon={<Camera className="h-5 w-5" />} title="Patient Identity Photo" desc="Webcam / mobile capture · passport crop · quality detection" />
        <div className="grid md:grid-cols-2 gap-5">
          <div className="aspect-square rounded-xl bg-muted border-2 border-dashed flex items-center justify-center">
            {captured
              ? <div className="text-center"><CheckCircle2 className="h-16 w-16 text-tertiary mx-auto" /><div className="mt-2 font-medium">Photo captured</div><div className="text-xs text-muted-foreground">Quality: 94% · Face detected</div></div>
              : <div className="text-center text-muted-foreground"><Camera className="h-16 w-16 mx-auto mb-2" /><div>Webcam preview</div></div>}
          </div>
          <div className="space-y-3">
            <Button onClick={() => setCaptured(true)}><Camera className="h-4 w-4 mr-2" />Capture from Webcam</Button>
            <Button variant="outline" onClick={() => { setCaptured(true); toast.success('Mobile upload received'); }}><Smartphone className="h-4 w-4 mr-2" />Upload from Mobile</Button>
            <Button variant="outline" onClick={() => toast.info('Passport crop applied')}>Apply Passport Crop</Button>
            <div className="text-sm text-muted-foreground pt-3 border-t">
              <strong className="text-foreground">Photo update history:</strong>
              <ul className="mt-2 space-y-1">
                <li>• 2026-02-14 · captured by Records Officer</li>
                <li>• 2024-08-03 · captured by Records Officer</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 7. BIOMETRICS ============
export const MpiBiometrics = () => (
  <Shell title="Biometric Capture">
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <Section icon={<Fingerprint className="h-5 w-5" />} title="Fingerprint Enrollment" desc="10-print or 2-print mode · duplicate detection" />
        <div className="grid grid-cols-5 gap-2 mb-4">
          {['L1', 'L2', 'L3', 'L4', 'L5', 'R1', 'R2', 'R3', 'R4', 'R5'].map((f, i) => (
            <div key={f} className={`aspect-square rounded-lg border flex items-center justify-center text-xs ${i < 4 ? 'bg-tertiary/15 border-tertiary text-tertiary' : 'bg-muted/40'}`}>{f}</div>
          ))}
        </div>
        <Button onClick={() => toast.success('Fingerprint captured · no duplicate match')}>Capture Next Print</Button>
      </Card>
      <Card>
        <Section icon={<Eye className="h-5 w-5" />} title="Facial Recognition" desc="Enroll face template · offline-capable" />
        <div className="aspect-video rounded-lg border-2 border-dashed bg-muted flex items-center justify-center mb-3">
          <Camera className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => toast.success('Facial template enrolled')}>Enroll Face</Button>
          <Button variant="outline" onClick={() => toast.info('Verifying...')}>Verify</Button>
        </div>
      </Card>
    </div>
  </Shell>
);

// ============ 8. E-CARD & QR ============
export const MpiECard = () => {
  const [type, setType] = useState('Standard');
  return (
    <Shell title="E-Card & QR Generation">
      <Card>
        <Section icon={<QrCode className="h-5 w-5" />} title="Digital Hospital Identity Card" desc="Photo · QR · NHIA · blood group · emergency contact" />
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label>Card Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
              <SelectContent>{['Standard', 'Psychiatric', 'Child', 'Emergency', 'NHIA'].map(t => <SelectItem key={t} value={t}>{t} Patient Card</SelectItem>)}</SelectContent>
            </Select>
            <div className="space-y-2">
              <Button onClick={() => toast.success('E-Card generated · sent to patient SMS/email')}><Download className="h-4 w-4 mr-2" />Generate & Send</Button>
              <Button variant="outline" onClick={() => toast.info('QR re-issued')}>Re-issue QR</Button>
            </div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs opacity-80">GFA HMS Abeokuta</div>
                <div className="font-display font-bold text-lg">{type} Patient Card</div>
              </div>
              <QrCode className="h-12 w-12 bg-white text-primary p-1 rounded" />
            </div>
            <div className="text-sm space-y-1">
              <div><span className="opacity-70">Name:</span> Adebayo Okonkwo</div>
              <div><span className="opacity-70">Hospital No.:</span> GFA/HMS/2025/01122</div>
              <div><span className="opacity-70">Blood:</span> O+ · <span className="opacity-70">NHIA:</span> AB-991</div>
              <div><span className="opacity-70">Emergency:</span> 0803-456-7890</div>
            </div>
          </div>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 9. FAMILY & CAREGIVERS ============
export const MpiFamily = () => {
  const family = [
    { name: 'Funmi Okonkwo', relation: 'Spouse', phone: '08023456789', access: 'Full' },
    { name: 'Tunde Okonkwo Jr.', relation: 'Child', phone: '—', access: 'Limited' },
    { name: 'Mrs. Grace Okonkwo', relation: 'Mother (Guardian)', phone: '08134455667', access: 'Psychiatric authorized' },
  ];
  return (
    <Shell title="Family & Caregiver Linkage">
      <Card>
        <Section icon={<Users className="h-5 w-5" />} title="Family Folder" desc="Parent-child, spouse, sibling & caregiver linkage with access control"
          action={<Button size="sm" onClick={() => toast.success('Linked new family member')}><Plus className="h-4 w-4 mr-2" />Link Member</Button>} />
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Relationship</TableHead><TableHead>Phone</TableHead><TableHead>Access</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{family.map(f => (
            <TableRow key={f.name}>
              <TableCell className="font-medium">{f.name}</TableCell>
              <TableCell>{f.relation}</TableCell><TableCell>{f.phone}</TableCell>
              <TableCell><Badge variant="outline">{f.access}</Badge></TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={() => toast.success('Permissions updated')}>Configure</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 10. NEXT OF KIN ============
export const MpiNok = () => {
  const [list, setList] = useState([
    { id: 1, name: 'Funmi Okonkwo', relation: 'Spouse', phone: '08023456789', priority: 1, verified: true },
    { id: 2, name: 'Mrs. Grace Okonkwo', relation: 'Mother', phone: '08134455667', priority: 2, verified: true },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', relation: '', phone: '', address: '', occupation: '' });
  const add = () => {
    if (!form.name || !form.phone) return toast.error('Name and phone required');
    setList([...list, { id: Date.now(), name: form.name, relation: form.relation, phone: form.phone, priority: list.length + 1, verified: false }]);
    setForm({ name: '', relation: '', phone: '', address: '', occupation: '' });
    setOpen(false);
    toast.success('Next of kin added');
  };
  return (
    <Shell title="Next of Kin Management">
      <Card>
        <Section icon={<Phone className="h-5 w-5" />} title="Emergency Contacts" desc="Critical for psychiatric workflows · priority-ranked & verified"
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add NOK</Button>} />
        <Table>
          <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Name</TableHead><TableHead>Relation</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{list.map(n => (
            <TableRow key={n.id}>
              <TableCell><Badge>{n.priority}</Badge></TableCell>
              <TableCell className="font-medium">{n.name}</TableCell>
              <TableCell>{n.relation}</TableCell><TableCell>{n.phone}</TableCell>
              <TableCell><StatusBadge status={n.verified ? 'Verified' : 'Pending'} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Next of Kin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Relationship</Label><Input value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Occupation</Label><Input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 11. RISK TAGS ============
export const MpiRisk = () => {
  const [tags, setTags] = useState<Record<string, boolean>>({ 'Suicide risk': true, 'Wandering risk': true });
  const all = ['Suicide risk', 'Violence risk', 'Self-harm risk', 'Substance abuse risk', 'Wandering risk', 'Aggression risk', 'Cognitive impairment', 'Child protection risk'];
  return (
    <Shell title="Psychiatric Risk Tagging">
      <Card>
        <Section icon={<ShieldAlert className="h-5 w-5" />} title="Risk Classification" desc="Color-coded · restricted visibility · auto-escalation" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {all.map(t => {
            const active = tags[t];
            return (
              <div key={t} className={`p-4 rounded-xl border-2 transition cursor-pointer ${active ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}
                onClick={() => { setTags({ ...tags, [t]: !active }); toast.success(`${t} ${!active ? 'enabled' : 'cleared'}`); }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t}</span>
                  <Switch checked={!!active} />
                </div>
                {active && <div className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Crisis alerts active</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </Shell>
  );
};

// ============ 12. CROSS-FACILITY ============
export const MpiCross = () => {
  const transfers = [
    { from: 'GFA HMS Main', to: 'Lantoro Annex', patient: 'Adebayo Okonkwo', date: '2026-03-12', reason: 'Long-stay rehab' },
    { from: 'FMC Abeokuta', to: 'GFA HMS Main', patient: 'Yetunde Bello', date: '2026-03-18', reason: 'Psychiatric referral' },
  ];
  return (
    <Shell title="Cross-Facility Patient Lookup">
      <Card>
        <Section icon={<Network className="h-5 w-5" />} title="Federal Interoperability" desc="Shared patient identity across hospitals (preview)" />
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
          <TableBody>{transfers.map(t => (
            <TableRow key={t.patient + t.date}>
              <TableCell className="font-medium">{t.patient}</TableCell>
              <TableCell>{t.from}</TableCell><TableCell>{t.to}</TableCell>
              <TableCell>{t.date}</TableCell><TableCell className="text-sm text-muted-foreground">{t.reason}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 13. LEGACY EMR SYNC ============
export const MpiLegacy = () => {
  const records = [
    { legacy: 'LEG-OOUTH-44521', current: 'GFA/HMS/2025/01122', patient: 'Adebayo Okonkwo', status: 'Synced' },
    { legacy: 'LEG-OOUTH-44600', current: 'GFA/HMS/2024/00845', patient: 'Kemi Adeyemi', status: 'Synced' },
    { legacy: 'LEG-OOUTH-44712', current: '—', patient: 'Unmapped record', status: 'Pending' },
  ];
  return (
    <Shell title="Legacy EMR Synchronization">
      <Card>
        <Section icon={<Database className="h-5 w-5" />} title="Historical Patient Access" desc="Read-only retrieval · duplicate reconciliation"
          action={<Button size="sm" onClick={() => toast.success('Legacy sync triggered')}><RefreshCw className="h-4 w-4 mr-2" />Trigger Sync</Button>} />
        <Table>
          <TableHeader><TableRow><TableHead>Legacy ID</TableHead><TableHead>Current ID</TableHead><TableHead>Patient</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{records.map(r => (
            <TableRow key={r.legacy}>
              <TableCell className="font-mono text-xs">{r.legacy}</TableCell>
              <TableCell className="font-mono text-xs">{r.current}</TableCell>
              <TableCell>{r.patient}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success('Mapping updated')}>Map</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 14. DUPLICATE DETECTION ============
export const MpiDuplicates = () => {
  const [items, setItems] = useState([
    { id: 1, a: 'Adebayo Okonkwo · GFA/HMS/2025/01122', b: 'Adebayo Okonkwoh · GFA/HMS/2023/00198', score: 92, by: 'Name + Phone + DOB' },
    { id: 2, a: 'Funmi Bakare · GFA/HMS/2024/00712', b: 'Funmilayo Bakare · GFA/HMS/2022/00088', score: 87, by: 'Soundex + NIN partial' },
    { id: 3, a: 'Ibrahim Lawal · GFA/HMS/2026/00322', b: 'I. Lawal · LEG-OOUTH-44109', score: 78, by: 'Biometric match' },
  ]);
  const resolve = (id: number, action: string) => { setItems(items.filter(i => i.id !== id)); toast.success(`Duplicate ${action}`); };
  return (
    <Shell title="Duplicate Detection Engine">
      <Card>
        <Section icon={<GitMerge className="h-5 w-5" />} title="Admin Review Queue" desc="Name · phone · NIN · biometrics · DOB · family linkage scoring" />
        <div className="space-y-3">{items.map(i => (
          <div key={i.id} className="p-4 rounded-lg border bg-card flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm"><strong>A:</strong> {i.a}</div>
              <div className="text-sm"><strong>B:</strong> {i.b}</div>
              <div className="text-xs text-muted-foreground mt-1">Matched on: {i.by}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{i.score}%</div>
              <div className="text-xs text-muted-foreground">match</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => resolve(i.id, 'merged')}>Merge</Button>
              <Button size="sm" variant="outline" onClick={() => resolve(i.id, 'kept separate')}>Keep Separate</Button>
            </div>
          </div>
        ))}{items.length === 0 && <div className="text-center text-muted-foreground py-8">No pending duplicates</div>}</div>
      </Card>
    </Shell>
  );
};

// ============ 15. WALK-IN ============
export const MpiWalkin = () => (
  <Shell title="Walk-in Registration">
    <Card>
      <Section icon={<Footprints className="h-5 w-5" />} title="Quick Registration" desc="Minimal fields · temporary ID · upgrade later" />
      <form className="grid sm:grid-cols-2 gap-3" onSubmit={e => { e.preventDefault(); toast.success('Walk-in registered · TEMP-' + Date.now().toString().slice(-6)); }}>
        <div><Label>Full Name</Label><Input required /></div>
        <div><Label>Phone</Label><Input type="tel" /></div>
        <div><Label>Gender</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="m">Male</SelectItem><SelectItem value="f">Female</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Estimated Age</Label><Input type="number" /></div>
        <div><Label>Triage Priority</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Routine', 'Urgent', 'Emergency'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Route to</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['GMPC', 'OPC', 'Emergency Doctor'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="submit"><UserPlus className="h-4 w-4 mr-2" />Quick Register & Bill</Button>
        </div>
      </form>
    </Card>
  </Shell>
);

// ============ 16. EMERGENCY ============
export const MpiEmergency = () => (
  <Shell title="Emergency Registration">
    <Card>
      <Section icon={<Siren className="h-5 w-5" />} title="Rapid / Anonymous Registration" desc="Trauma · unknown patient · auto-generated emergency IDs" />
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <Button onClick={() => toast.success('Emergency ID EMG-' + Date.now().toString().slice(-6) + ' assigned')}>
          <UserPlus className="h-4 w-4 mr-2" />Known Patient (Rapid)
        </Button>
        <Button variant="outline" onClick={() => toast.success('Anonymous patient created · EMG-ANON-' + Date.now().toString().slice(-6))}>
          <Eye className="h-4 w-4 mr-2" />Anonymous Patient
        </Button>
        <Button variant="outline" onClick={() => toast.success('Trauma case opened · auto-QR generated')}>
          <Heart className="h-4 w-4 mr-2" />Trauma / Unknown
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Emergency ID</TableHead><TableHead>Status</TableHead><TableHead>Tag</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { id: 'EMG-882103', s: 'Active', tag: 'Trauma · Unknown male', t: '12 min ago' },
            { id: 'EMG-ANON-882088', s: 'Active', tag: 'Anonymous · psychiatric crisis', t: '37 min ago' },
            { id: 'EMG-881942', s: 'Upgraded', tag: 'Linked to GFA/HMS/2026/00322', t: '2 hrs ago' },
          ].map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell><StatusBadge status={r.s} /></TableCell>
              <TableCell>{r.tag}</TableCell><TableCell className="text-muted-foreground text-sm">{r.t}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 17. ANALYTICS ============
export const MpiAnalytics = () => {
  const bars = (data: { label: string; v: number }[]) => (
    <div className="space-y-2">{data.map(d => (
      <div key={d.label}>
        <div className="flex justify-between text-xs mb-1"><span>{d.label}</span><span className="font-medium">{d.v}%</span></div>
        <Progress value={d.v} />
      </div>
    ))}</div>
  );
  return (
    <Shell title="Demographic Analytics">
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <Section icon={<BarChart3 className="h-5 w-5" />} title="Age Distribution" desc="Active MPI cohort" />
          {bars([{ label: 'Child (0-12)', v: 8 }, { label: 'Adolescent (13-17)', v: 14 }, { label: 'Adult (18-59)', v: 62 }, { label: 'Psychogeriatric (60+)', v: 16 }])}
        </Card>
        <Card>
          <Section icon={<UserIcon className="h-5 w-5" />} title="Gender Split" desc="Across all facilities" />
          {bars([{ label: 'Male', v: 54 }, { label: 'Female', v: 46 }])}
        </Card>
        <Card>
          <Section icon={<Users className="h-5 w-5" />} title="Tribe / Ethnicity" desc="Self-reported" />
          {bars([{ label: 'Yoruba', v: 71 }, { label: 'Igbo', v: 11 }, { label: 'Hausa', v: 8 }, { label: 'Other', v: 10 }])}
        </Card>
        <Card>
          <Section icon={<Brain className="h-5 w-5" />} title="Psychiatric Conditions" desc="Top presentations" />
          {bars([{ label: 'Schizophrenia spectrum', v: 28 }, { label: 'Mood disorders', v: 24 }, { label: 'Substance use', v: 19 }, { label: 'Anxiety / PTSD', v: 14 }, { label: 'Other', v: 15 }])}
        </Card>
      </div>
    </Shell>
  );
};

// ============ 18. AUDIT ============
export const MpiAudit = () => {
  const logs = [
    { t: '14:22', who: 'Records · Mrs. F. Mohammed', action: 'Registered new patient GFA/HMS/2026/00451' },
    { t: '14:08', who: 'Records · Mr. K. Nwosu', action: 'Merged duplicate · kept GFA/HMS/2025/01122' },
    { t: '13:55', who: 'Dr. Lawal', action: 'Edited psychiatric risk tags (added Wandering)' },
    { t: '13:30', who: 'Nurse H. Bello', action: 'Verified NIN for GFA/HMS/2026/00447' },
    { t: '12:48', who: 'System', action: 'Auto-flagged 3 possible duplicates' },
    { t: '12:10', who: 'Records · Mrs. F. Mohammed', action: 'Updated photo for GFA/HMS/2024/00845' },
  ];
  return (
    <Shell title="Registration Audit & Access Logs">
      <Card>
        <Section icon={<ScrollText className="h-5 w-5" />} title="Activity Log" desc="Every identity & demographic change is tracked"
          action={<Button size="sm" variant="outline" onClick={() => toast.success('Audit log exported')}><Download className="h-4 w-4 mr-2" />Export CSV</Button>} />
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{logs.map((l, i) => (
            <TableRow key={i}><TableCell className="font-mono text-xs">{l.t}</TableCell><TableCell>{l.who}</TableCell><TableCell>{l.action}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 19. CONFIDENTIALITY ============
export const MpiConfidentiality = () => {
  const [settings, setSettings] = useState({
    masking: true, otp: true, restrict: true, encrypt: true, auditLookups: true,
  });
  return (
    <Shell title="Security & Confidentiality">
      <Card>
        <Section icon={<Lock className="h-5 w-5" />} title="Psychiatric Identity Protection" desc="Role-based visibility, masking & encrypted demographic storage" />
        <div className="space-y-3">
          {[
            ['masking', 'Mask sensitive psychiatric demographics from non-clinical staff'],
            ['otp', 'Require OTP for patient identity verification'],
            ['restrict', 'Restrict cross-facility lookup to authorized roles'],
            ['encrypt', 'Encrypt demographic fields at rest (AES-256)'],
            ['auditLookups', 'Audit every patient lookup with reason capture'],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <Label className="cursor-pointer">{label}</Label>
              <Switch checked={(settings as any)[k]} onCheckedChange={v => { setSettings({ ...settings, [k]: v }); toast.success('Policy updated'); }} />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============ 20. OFFLINE ============
export const MpiOffline = () => (
  <Shell title="Offline-First Registration">
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <Section icon={<Wifi className="h-5 w-5" />} title="Sync Status" desc="Local encrypted queue · auto-sync when online" />
        <div className="space-y-3">
          {[
            ['Cached registrations', '24'],
            ['Cached biometrics', '7'],
            ['Pending photo uploads', '11'],
            ['Last successful sync', '4 min ago'],
            ['Conflict resolution queue', '0'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between p-2.5 rounded-lg bg-muted/30 text-sm"><span>{k}</span><strong>{v}</strong></div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={() => toast.success('Manual sync triggered')}><RefreshCw className="h-4 w-4 mr-2" />Force Sync Now</Button>
      </Card>
      <Card>
        <Section icon={<Database className="h-5 w-5" />} title="Offline Capabilities" desc="Hospital realities — Nigeria-ready" />
        <ul className="space-y-2 text-sm">
          {['Offline patient registration', 'Local encrypted storage (IndexedDB + crypto)', 'Auto-sync on reconnect', 'Conflict resolution engine', 'Offline biometric capture', 'Offline QR validation'].map(t => (
            <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{t}</li>
          ))}
        </ul>
      </Card>
    </div>
  </Shell>
);

// ============ 21. MOBILE / TABLET ============
export const MpiMobile = () => (
  <Shell title="Mobile & Tablet Registration">
    <Card>
      <Section icon={<Smartphone className="h-5 w-5" />} title="Field Registration Modes" desc="Ward-side · outreach · community psychiatry" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: 'Tablet Registration', d: 'Records desk · full-featured' },
          { t: 'Mobile Field Reg', d: 'Outreach officers' },
          { t: 'Ward-side Reg', d: 'Nurses · bedside admission' },
          { t: 'Community Psychiatry', d: 'LGA outreach mode' },
        ].map(x => (
          <div key={x.t} className="p-4 rounded-xl border bg-card text-center">
            <Smartphone className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="font-semibold text-sm">{x.t}</div>
            <div className="text-xs text-muted-foreground mt-1">{x.d}</div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => toast.success(`${x.t} link sent`)}>Send Link</Button>
          </div>
        ))}
      </div>
    </Card>
  </Shell>
);

// ============ 22. AI SMART ============
export const MpiAi = () => (
  <Shell title="AI-Powered Smart Registration">
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <Section icon={<Brain className="h-5 w-5" />} title="AI Capabilities" desc="Smart matching · predictive demographics" />
        <ul className="space-y-2 text-sm">
          {[
            'Duplicate prediction (88% precision)',
            'Auto-demographic suggestions (Yoruba names → LGA hint)',
            'Intelligent patient matching across legacy IDs',
            'Predictive identity validation',
            'AI-assisted vulnerability categorization',
          ].map(t => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{t}</li>)}
        </ul>
      </Card>
      <Card>
        <Section icon={<Activity className="h-5 w-5" />} title="Model Confidence" desc="Last 24 hours" />
        <div className="space-y-3">
          {[['Duplicate detection', 88], ['Name normalization', 94], ['LGA inference', 76], ['Vulnerability tagging', 81]].map(([k, v]) => (
            <div key={k as string}>
              <div className="flex justify-between text-xs mb-1"><span>{k}</span><span className="font-medium">{v}%</span></div>
              <Progress value={v as number} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  </Shell>
);

// ============ 23. WORKFLOW ============
export const MpiWorkflow = () => {
  const integrations = [
    ['EMR', 'Synced'], ['Billing', 'Synced'], ['NHIA', 'Synced'], ['Laboratory', 'Synced'],
    ['Pharmacy', 'Synced'], ['Radiology', 'Pending'], ['Admission', 'Synced'],
    ['Telemedicine', 'Synced'], ['Legacy EMR', 'Synced'], ['Patient Portal', 'Synced'],
  ];
  return (
    <Shell title="Workflow Integration">
      <Card>
        <Section icon={<Workflow className="h-5 w-5" />} title="Downstream Modules" desc="Every new registration cascades into these systems" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map(([name, status]) => (
            <div key={name} className="p-4 rounded-xl border bg-card flex items-center justify-between">
              <div className="font-medium">{name}</div>
              <StatusBadge status={status} />
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};
