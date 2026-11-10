import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { db } from '@/db/database';
import { ApiError } from '@/lib/api/client';
import {
  isImagingApiEnabled,
  listConsumerImagingResults,
  type ApiConsumerResult,
} from '@/lib/api/imaging';
import {
  LayoutDashboard, UserSquare2, Activity, Stethoscope, HeartPulse, Brain, Pill, FlaskConical,
  ScanLine, ShieldAlert, BellRing, Sparkles, ScrollText, RefreshCw, Database, FileText,
  ClipboardList, FileSignature, Filter, Tag, BookOpen, Smartphone, Wifi, Plug, Save, Plus,
  CheckCircle2, AlertTriangle, Clock, Eye, EyeOff, ChevronRight, Lock,
} from 'lucide-react';

const base = '/dashboard/doctor/emr';

export const emrNavItems = [
  { label: 'Clinical Control Center', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Master Record', path: `${base}/master`, icon: <UserSquare2 className="h-4 w-4" /> },
  { label: 'Clinical Timeline', path: `${base}/timeline`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Doctor Documentation', path: `${base}/doctor`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Nursing Documentation', path: `${base}/nursing`, icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'Psychology & Psychiatry', path: `${base}/psychology`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Pharmacy Integration', path: `${base}/pharmacy`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Laboratory Integration', path: `${base}/lab`, icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Radiology Integration', path: `${base}/radiology`, icon: <ScanLine className="h-4 w-4" /> },
  { label: 'SOAP Notes', path: `${base}/soap`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Care Plans', path: `${base}/care-plans`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Consent Forms', path: `${base}/consent`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Clinical Alerts', path: `${base}/alerts`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Smart Filtering', path: `${base}/filters`, icon: <Filter className="h-4 w-4" /> },
  { label: 'Clinical Tagging', path: `${base}/tags`, icon: <Tag className="h-4 w-4" /> },
  { label: 'ICD-11 / DSM Coding', path: `${base}/coding`, icon: <BookOpen className="h-4 w-4" /> },
  { label: 'AI Clinical Summary', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Cross-Department Sync', path: `${base}/sync`, icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Legacy EMR Bridge', path: `${base}/legacy`, icon: <Database className="h-4 w-4" /> },
  { label: 'Notifications', path: `${base}/notifications`, icon: <BellRing className="h-4 w-4" /> },
  { label: 'Audit & Compliance', path: `${base}/audit`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Mobile & Ward Rounds', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Offline / Cloud Sync', path: `${base}/offline`, icon: <Wifi className="h-4 w-4" /> },
  { label: 'HMS Integration', path: `${base}/integration`, icon: <Plug className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={emrNavItems} title={`Unified EMR Core · ${title}`}>{children}</DashboardLayout>
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

const toneClass = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-muted text-foreground border-border';
  }
};
const TonePill = ({ tone, label }: { tone: string; label: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${toneClass(tone)}`}>{label}</span>
);


// ===== sample patients (psychiatric-leaning) =====
const patients = [
  { id: 'GFA HMS/2026/00145', name: 'John Doe', age: 42, sex: 'M', dx: 'Recurrent Depression (F33.1)', ward: 'Male Acute Ward', risk: 'Moderate' },
  { id: 'GFA HMS/2026/00146', name: 'Amina Yusuf', age: 28, sex: 'F', dx: 'Bipolar I (F31.1)', ward: 'Female Acute Ward', risk: 'High' },
  { id: 'GFA HMS/2026/00150', name: 'Ngozi Okoro', age: 47, sex: 'F', dx: 'Schizophrenia (F20.0)', ward: 'Female Acute Ward', risk: 'High' },
  { id: 'GFA HMS/2026/00153', name: 'Tope Adesanya', age: 19, sex: 'M', dx: 'Substance Use (F19.2)', ward: 'Addiction Recovery', risk: 'Moderate' },
  { id: 'GFA HMS/2026/00161', name: 'Bisi Olarewaju', age: 64, sex: 'F', dx: 'Major Depression w/ Psychosis', ward: 'Psychogeriatric', risk: 'Critical' },
];

const riskTone = (r: string) =>
  r === 'Critical' ? 'rose' : r === 'High' ? 'amber' : r === 'Moderate' ? 'sky' : 'green';

// ============ 1. CLINICAL CONTROL CENTER ============
export const EmrOverview = () => (
  <Shell title="Control Center">
    <div className="space-y-6">
      <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Unified EMR Clinical Command Center"
        desc="One patient. One record. One timeline. Real-time clinical operations across GFA HMS, Abeokuta." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard tone="teal" title="Active Patients" value="1,248" subtitle="OPD + IPD" icon={UserSquare2} />
        <SummaryCard tone="rose" title="Critical Alerts" value="14" subtitle="needs attention" icon={ShieldAlert} />
        <SummaryCard tone="amber" title="Pending Notes" value="63" subtitle="across 6 wards" icon={FileText} />
        <SummaryCard tone="indigo" title="Ward Census" value="216 / 280" subtitle="77% occupancy" icon={HeartPulse} />
        <SummaryCard tone="purple" title="High-Risk Psych" value="38" subtitle="restricted view" icon={Brain} />
        <SummaryCard tone="green" title="Sync Health" value="99.4%" subtitle="cross-dept live" icon={RefreshCw} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-3">Today's Active Patient Board</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital No.</TableHead><TableHead>Patient</TableHead>
                <TableHead>Primary Dx</TableHead><TableHead>Ward</TableHead><TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name} <span className="text-xs text-muted-foreground">· {p.age}{p.sex}</span></TableCell>
                  <TableCell className="text-sm">{p.dx}</TableCell>
                  <TableCell className="text-sm">{p.ward}</TableCell>
                  <TableCell><TonePill tone={riskTone(p.risk) as any} label={p.risk} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <h3 className="font-display font-semibold text-foreground mb-3">Live Clinical Activity</h3>
          <div className="space-y-3 text-sm">
            {[
              { t: 'Dr. Lawal added consultation note', who: 'A. Yusuf', when: '2m ago', icon: Stethoscope, tone: 'text-primary' },
              { t: 'Nurse Blessing recorded vitals', who: 'J. Doe — BP 142/96', when: '5m ago', icon: HeartPulse, tone: 'text-rose-500' },
              { t: 'Lab result ready: FBC', who: 'N. Okoro', when: '8m ago', icon: FlaskConical, tone: 'text-sky-500' },
              { t: 'Pharmacy dispensed Sertraline 50mg', who: 'T. Adesanya', when: '12m ago', icon: Pill, tone: 'text-emerald-500' },
              { t: 'MSE completed', who: 'B. Olarewaju', when: '18m ago', icon: Brain, tone: 'text-purple-500' },
              { t: 'Discharge summary drafted', who: 'F. Adeyemi', when: '24m ago', icon: FileText, tone: 'text-amber-500' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <a.icon className={`h-4 w-4 mt-0.5 ${a.tone}`} />
                <div className="flex-1">
                  <p className="font-medium leading-tight">{a.t}</p>
                  <p className="text-xs text-muted-foreground">{a.who} · {a.when}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'Doctor Notes', count: 412, unsigned: 18, icon: Stethoscope, tone: 'bg-blue-500/10 text-blue-600' },
          { title: 'Nursing Notes', count: 1284, unsigned: 24, icon: HeartPulse, tone: 'bg-rose-500/10 text-rose-600' },
          { title: 'Psych Notes', count: 198, unsigned: 7, icon: Brain, tone: 'bg-purple-500/10 text-purple-600', restricted: true },
        ].map((d, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${d.tone}`}><d.icon className="h-5 w-5" /></div>
              {d.restricted && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Restricted</Badge>}
            </div>
            <p className="text-3xl font-display font-bold">{d.count}</p>
            <p className="text-sm text-muted-foreground">{d.title} · {d.unsigned} unsigned today</p>
          </Card>
        ))}
      </div>
    </div>
  </Shell>
);

// ============ 2. PATIENT MASTER RECORD ============
export const PatientMasterRecord = () => {
  const p = patients[0];
  return (
    <Shell title="Patient Master Record">
      <Section icon={<UserSquare2 className="h-5 w-5" />} title="Single Patient Master Record (SPMR)"
        desc="Unified demographic, clinical, social, and administrative identity. Powers every EMR module."
        action={<Button><Eye className="h-4 w-4" /> Open Full Chart</Button>} />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-display font-bold">JD</div>
            <div>
              <h3 className="font-display font-bold text-lg">{p.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
              <TonePill tone="amber" label={`Risk: ${p.risk}`} />
            </div>
          </div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">Age / Sex</dt><dd>{p.age} / {p.sex}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Ward</dt><dd>{p.ward}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Blood Group</dt><dd>O+</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Allergies</dt><dd className="text-rose-600">Penicillin</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">NHIA</dt><dd>NHIA/OG/01938</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Next of Kin</dt><dd>Mrs. M. Doe</dd></div>
          </dl>
        </Card>

        <Card className="md:col-span-2">
          <h4 className="font-display font-semibold mb-3">Active Clinical Snapshot</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { l: 'BP', v: '142/96', tone: 'amber' },
              { l: 'Pulse', v: '88', tone: 'green' },
              { l: 'Temp', v: '37.2°C', tone: 'green' },
              { l: 'SpO₂', v: '97%', tone: 'green' },
            ].map(v => (
              <div key={v.l} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{v.l}</p>
                <p className="text-xl font-display font-bold">{v.v}</p>
              </div>
            ))}
          </div>
          <h5 className="font-medium mb-2 text-sm">Active Diagnoses</h5>
          <div className="flex flex-wrap gap-2 mb-3">
            {['F33.1 Recurrent Depression', 'I10 Hypertension', 'E11 Type 2 DM'].map(d =>
              <Badge key={d} variant="secondary">{d}</Badge>)}
          </div>
          <h5 className="font-medium mb-2 text-sm">Active Medications</h5>
          <div className="flex flex-wrap gap-2">
            {['Sertraline 50mg OD', 'Lisinopril 10mg OD', 'Metformin 500mg BD'].map(d =>
              <Badge key={d} variant="outline">{d}</Badge>)}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h4 className="font-display font-semibold mb-3">All Registered Master Records</h4>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Hospital No.</TableHead><TableHead>Patient</TableHead>
            <TableHead>Primary Dx</TableHead><TableHead>Ward</TableHead><TableHead>Risk</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {patients.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.dx}</TableCell>
                <TableCell>{p.ward}</TableCell>
                <TableCell><TonePill tone={riskTone(p.risk) as any} label={p.risk} /></TableCell>
                <TableCell><Button size="sm" variant="ghost">Open <ChevronRight className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 3. CLINICAL TIMELINE ============
export const ClinicalTimeline = () => {
  const [filter, setFilter] = useState('all');
  const events = [
    { t: '11:42', dept: 'Doctor', icon: Stethoscope, tone: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20', title: 'Progress Note — Dr. Lawal', body: 'Patient reports improved mood. Continue Sertraline. Review in 1 week.' },
    { t: '10:15', dept: 'Nursing', icon: HeartPulse, tone: 'border-rose-500 bg-rose-50 dark:bg-rose-950/20', title: 'Vitals — Nurse Blessing', body: 'BP 142/96 · HR 88 · Temp 37.2 · SpO₂ 97%. Notified on-call doctor.' },
    { t: '09:48', dept: 'Lab', icon: FlaskConical, tone: 'border-sky-500 bg-sky-50 dark:bg-sky-950/20', title: 'FBC Result Verified', body: 'Hb 12.4 · WBC 7.8 · Plt 240 — within normal limits.' },
    { t: '09:10', dept: 'Pharmacy', icon: Pill, tone: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20', title: 'Medication Administered', body: 'Sertraline 50mg PO — given by Pharm. Salami.' },
    { t: '08:30', dept: 'Psychiatry', icon: Brain, tone: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20', title: 'MSE — Dr. Eze', body: 'Mood reactive, no SI/HI. Insight preserved. Risk: moderate.', locked: true },
    { t: '07:55', dept: 'Admission', icon: ClipboardList, tone: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20', title: 'Ward Round', body: 'Stable overnight. Continue care plan. Family review tomorrow.' },
  ];
  const filtered = filter === 'all' ? events : events.filter(e => e.dept.toLowerCase() === filter);

  return (
    <Shell title="Clinical Timeline">
      <Section icon={<Activity className="h-5 w-5" />} title="Chronological Patient Journey"
        desc="Every clinical event for John Doe (GFA HMS/2026/00145) — 25 Mar 2026."
        action={
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="lab">Laboratory</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="psychiatry">Psychiatry</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><Filter className="h-4 w-4" /> Date Range</Button>
          </div>
        } />

      <div className="relative pl-8 border-l-2 border-border space-y-4">
        {filtered.map((e, i) => (
          <div key={i} className="relative">
            <div className={`absolute -left-[42px] h-8 w-8 rounded-full border-2 ${e.tone} flex items-center justify-center`}>
              <e.icon className="h-4 w-4" />
            </div>
            <Card className={`border-l-4 ${e.tone}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{e.t}</span>
                    <Badge variant="secondary">{e.dept}</Badge>
                    {e.locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Restricted</Badge>}
                  </div>
                  <h4 className="font-display font-semibold">{e.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{e.body}</p>
                </div>
                <Button size="sm" variant="ghost">View</Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </Shell>
  );
};

// ============ helper: note entry panel ============
const NoteEntry = ({ kind, color }: { kind: string; color: string }) => {
  const [draft, setDraft] = useState('');
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-semibold flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${color}`} /> Quick {kind} Note Entry
        </h4>
        <Badge variant="outline" className="gap-1"><Save className="h-3 w-3" /> Auto-save 3s</Badge>
      </div>
      <Textarea rows={5} placeholder={`Start typing ${kind.toLowerCase()} note... auto-saves as draft.`}
        value={draft} onChange={e => setDraft(e.target.value)} />
      <div className="flex justify-between items-center mt-3">
        <p className="text-xs text-muted-foreground">Version 1 · Draft · {draft.length} chars</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Save Draft</Button>
          <Button size="sm" onClick={() => { toast.success(`${kind} note signed & posted to timeline`); setDraft(''); }}>
            Sign & Post
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ============ 4. DOCTOR DOCUMENTATION ============
export const DoctorDocs = () => (
  <Shell title="Doctor Documentation">
    <Section icon={<Stethoscope className="h-5 w-5" />} title="Doctor Notes Panel"
      desc="Consultation · Progress · Admission · Ward round · Discharge · Emergency notes." />
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2"><NoteEntry kind="Doctor" color="bg-blue-500" /></div>
      <Card>
        <h4 className="font-display font-semibold mb-3">Recent Doctor Notes</h4>
        {[
          { t: 'Progress', d: 'Dr. Lawal · 11:42', s: 'Signed' },
          { t: 'Ward Round', d: 'Dr. Eze · 07:55', s: 'Signed' },
          { t: 'Consultation', d: 'Dr. Bakare · Yesterday', s: 'Signed' },
          { t: 'Admission', d: 'Dr. Okafor · 23 Mar', s: 'Signed' },
        ].map((n, i) => (
          <div key={i} className="flex justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium">{n.t}</p>
              <p className="text-xs text-muted-foreground">{n.d}</p>
            </div>
            <TonePill tone="green" label={n.s} />
          </div>
        ))}
      </Card>
    </div>
  </Shell>
);

// ============ 5. NURSING DOCUMENTATION ============
export const NursingDocs = () => (
  <Shell title="Nursing Documentation">
    <Section icon={<HeartPulse className="h-5 w-5" />} title="Nursing Observation & MAR"
      desc="Shift-grouped notes, MAR, vitals, care logs — real-time to doctor view." />
    <div className="grid lg:grid-cols-3 gap-4">
      <Card>
        <h4 className="font-display font-semibold mb-3">Quick Vitals Entry</h4>
        <div className="grid grid-cols-2 gap-3">
          {['BP', 'Pulse', 'Temp', 'SpO₂', 'RR', 'Pain (0-10)'].map(v => (
            <div key={v}>
              <Label className="text-xs">{v}</Label>
              <Input placeholder="—" />
            </div>
          ))}
        </div>
        <Button className="w-full mt-3" onClick={() => toast.success('Vitals recorded & pushed to timeline')}>
          <Plus className="h-4 w-4" /> Save Vitals
        </Button>
      </Card>
      <div className="lg:col-span-2"><NoteEntry kind="Nursing" color="bg-rose-500" /></div>
    </div>

    <Card className="mt-4">
      <h4 className="font-display font-semibold mb-3">Medication Administration Record (MAR) — Today</h4>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Time</TableHead><TableHead>Drug</TableHead><TableHead>Dose</TableHead>
          <TableHead>Route</TableHead><TableHead>Nurse</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            { t: '08:00', d: 'Sertraline', dose: '50mg', r: 'PO', n: 'B. Okonkwo', s: 'Given', tone: 'green' },
            { t: '08:00', d: 'Lisinopril', dose: '10mg', r: 'PO', n: 'B. Okonkwo', s: 'Given', tone: 'green' },
            { t: '14:00', d: 'Metformin', dose: '500mg', r: 'PO', n: '—', s: 'Due', tone: 'amber' },
            { t: '20:00', d: 'Diazepam', dose: '5mg PRN', r: 'PO', n: '—', s: 'PRN', tone: 'sky' },
          ].map((m, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{m.t}</TableCell>
              <TableCell className="font-medium">{m.d}</TableCell>
              <TableCell>{m.dose}</TableCell><TableCell>{m.r}</TableCell><TableCell>{m.n}</TableCell>
              <TableCell><TonePill tone={m.tone as any} label={m.s} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 6. PSYCHOLOGY / PSYCHIATRY ============
export const PsychologyDocs = () => {
  const [show, setShow] = useState(false);
  return (
    <Shell title="Psychology & Psychiatry">
      <Section icon={<Brain className="h-5 w-5" />} title="Psychiatric Documentation (Restricted)"
        desc="MSE · Therapy · CBT · Addiction · Psychometric · Risk assessments — therapist visibility only."
        action={
          <Button variant="outline" onClick={() => setShow(s => !s)}>
            {show ? <><EyeOff className="h-4 w-4" /> Hide Sensitive</> : <><Eye className="h-4 w-4" /> Reveal Sensitive</>}
          </Button>
        } />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <h4 className="font-display font-semibold mb-3">Mental State Exam (MSE)</h4>
          <dl className="text-sm space-y-2">
            {[
              ['Appearance', 'Well-kempt, cooperative'],
              ['Mood / Affect', 'Reactive · congruent'],
              ['Thought', 'Linear, goal-directed'],
              ['Perception', show ? 'No hallucinations' : '••••••'],
              ['Cognition', 'Oriented x3'],
              ['Insight / Judgment', show ? 'Preserved' : '••••••'],
              ['Risk (SI/HI)', show ? 'Moderate — passive ideation' : '••••••'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="lg:col-span-2"><NoteEntry kind="Psychiatric" color="bg-purple-500" /></div>
      </div>

      <Card className="mt-4">
        <h4 className="font-display font-semibold mb-3">Therapy & Assessment Sessions</h4>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Therapist</TableHead>
            <TableHead>Patient</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {[
              { d: '25 Mar', t: 'CBT — Session 4/12', who: 'Dr. Bakare', p: 'A. Yusuf', s: 'Completed', tone: 'green' },
              { d: '25 Mar', t: 'Addiction Counselling', who: 'Mr. Oduwole', p: 'T. Adesanya', s: 'In Session', tone: 'sky' },
              { d: '24 Mar', t: 'ASI Assessment', who: 'Dr. Mohammed', p: 'T. Adesanya', s: 'Completed', tone: 'green' },
              { d: '24 Mar', t: 'Family Therapy', who: 'Dr. Adeyemi', p: 'N. Okoro', s: 'Scheduled', tone: 'amber' },
            ].map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.d}</TableCell><TableCell className="font-medium">{r.t}</TableCell>
                <TableCell>{r.who}</TableCell><TableCell>{r.p}</TableCell>
                <TableCell><TonePill tone={r.tone as any} label={r.s} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ generic integration page ============
const Integration = ({ icon, title, desc, rows, headers }: any) => (
  <Shell title={title}>
    <Section icon={icon} title={title} desc={desc} />
    <Card>
      <Table>
        <TableHeader><TableRow>{headers.map((h: string) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((r: any[], i: number) => (
            <TableRow key={i}>{r.map((c, j) => (
              <TableCell key={j}>{typeof c === 'object' ? c : <span className={j === 0 ? 'font-medium' : ''}>{c}</span>}</TableCell>
            ))}</TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 7. PHARMACY INTEGRATION ============
export const PharmacyIntegration = () => (
  <Integration icon={<Pill className="h-5 w-5" />} title="Pharmacy Integration"
    desc="Live link to pharmacy module — prescriptions, dispensation, allergy & interaction checks pulled into the chart."
    headers={['Patient', 'Drug', 'Dose', 'Prescribed By', 'Status']}
    rows={[
      ['John Doe', 'Sertraline 50mg', 'OD x 30/7', 'Dr. Lawal', <TonePill tone="green" label="Dispensed" />],
      ['Amina Yusuf', 'Lithium 400mg', 'BD x 30/7', 'Dr. Eze', <TonePill tone="amber" label="Pending Review" />],
      ['Ngozi Okoro', 'Olanzapine 10mg', 'Nocte', 'Dr. Bakare', <TonePill tone="green" label="Dispensed" />],
      ['Tope Adesanya', 'Naltrexone 50mg', 'OD', 'Dr. Mohammed', <TonePill tone="sky" label="Awaiting Stock" />],
    ]} />
);

// ============ 8. LAB INTEGRATION ============
export const LabIntegration = () => (
  <Integration icon={<FlaskConical className="h-5 w-5" />} title="Laboratory Integration"
    desc="All lab requests, results, and verifications flow directly into the chart timeline."
    headers={['Patient', 'Investigation', 'Sample', 'Status', 'Result']}
    rows={[
      ['John Doe', 'Full Blood Count', 'SMP-2402', <TonePill tone="green" label="Verified" />, 'WNL'],
      ['Amina Yusuf', 'Lithium Level', 'SMP-2411', <TonePill tone="amber" label="In Progress" />, '—'],
      ['Ngozi Okoro', 'TSH / T4', 'SMP-2410', <TonePill tone="green" label="Released" />, '2.1 / 14.2'],
      ['Bisi Olarewaju', 'LFT', 'SMP-2415', <TonePill tone="rose" label="Critical" />, 'ALT 320 ↑'],
    ]} />
);

// ============ 9. RADIOLOGY ============
export const RadiologyIntegration = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [released, setReleased] = useState<ApiConsumerResult[]>([]);
  const [critical, setCritical] = useState<ApiConsumerResult[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    void Promise.all([
      listConsumerImagingResults({ status: 'RELEASED', limit: 50 }),
      listConsumerImagingResults({ critical: true, limit: 20 }).catch(() => [] as ApiConsumerResult[]),
    ]).then(([rel, crit]) => {
      setReleased(rel);
      setCritical(crit);
    }).catch(e => toast.error(e instanceof ApiError ? e.message : 'Failed to load imaging results'));
  }, [apiOn]);

  const statusTone = (status: string, isCritical?: boolean) => {
    if (isCritical) return 'rose' as const;
    const s = status.toUpperCase();
    if (s === 'RELEASED' || s === 'VERIFIED') return 'green' as const;
    if (s === 'REPORTED' || s === 'COMPLETED') return 'sky' as const;
    return 'amber' as const;
  };

  const localRows = db.radiologyReports.list()
    .filter(r => r.status === 'RELEASED')
    .map(r => [
      r.patientName,
      r.technique ?? r.modality,
      r.modality,
      <TonePill key={`st-${r.id}`} tone={r.critical ? 'rose' : 'green'} label={r.critical ? 'Critical' : r.status} />,
      r.reportedBy,
    ]);

  const apiRows = [
    ...released.map(r => [
      r.patientName,
      r.studyName,
      r.modality,
      <TonePill key={`st-${r.reportId}`} tone={statusTone(r.status, r.critical)} label={r.critical ? 'Critical' : r.status} />,
      r.author,
    ]),
    ...critical
      .filter(c => !released.some(r => r.reportId === c.reportId))
      .map(r => [
        r.patientName,
        r.studyName,
        r.modality,
        <TonePill key={`cr-${r.reportId}`} tone="rose" label="Critical" />,
        r.author,
      ]),
  ];

  const rows = apiOn ? apiRows : localRows;

  return (
    <Integration
      icon={<ScanLine className="h-5 w-5" />}
      title="Radiology Integration"
      desc="Imaging orders & reports — CT, MRI, EEG, X-ray — directly attached to patient timeline."
      headers={['Patient', 'Study', 'Modality', 'Status', 'Reported By']}
      rows={rows.length > 0 ? rows : [['—', 'No released imaging results', '—', <TonePill tone="amber" label="Empty" />, '—']]}
    />
  );
};

// ============ 10. SOAP NOTES ============
export const SoapNotes = () => (
  <Shell title="SOAP Notes">
    <Section icon={<FileText className="h-5 w-5" />} title="Structured SOAP Note"
      desc="Subjective · Objective · Assessment · Plan — template-based, timeline-linked, printable." />
    <Card>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { k: 'Subjective', ph: 'Patient-reported symptoms, history of presenting complaint...' },
          { k: 'Objective', ph: 'Vitals, exam findings, lab/imaging results...' },
          { k: 'Assessment', ph: 'Working diagnosis, differential, ICD-11 codes...' },
          { k: 'Plan', ph: 'Investigations, medications, referrals, follow-up...' },
        ].map(s => (
          <div key={s.k}>
            <Label className="font-display font-semibold">{s.k[0]} — {s.k}</Label>
            <Textarea rows={5} placeholder={s.ph} className="mt-1" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline">Print Preview</Button>
        <Button onClick={() => toast.success('SOAP note signed & filed to chart')}>
          <Save className="h-4 w-4" /> Save & Sign
        </Button>
      </div>
    </Card>
  </Shell>
);

// ============ 11. CARE PLANS ============
export const CarePlans = () => (
  <Shell title="Care Plans">
    <Section icon={<ClipboardList className="h-5 w-5" />} title="Multidisciplinary Care Plans"
      desc="Long-term, personalised, multi-disciplinary care plans integrated with therapy schedules." />
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { p: 'John Doe', goal: 'Achieve PHQ-9 < 5 in 8 weeks', team: 'Dr. Lawal · Mr. Oduwole · Pharm. Salami', progress: 45 },
        { p: 'Amina Yusuf', goal: 'Mood stabilisation · prevent relapse', team: 'Dr. Eze · CBT team', progress: 70 },
        { p: 'Tope Adesanya', goal: '90-day abstinence + family reintegration', team: 'Addiction unit · Social work', progress: 32 },
        { p: 'Bisi Olarewaju', goal: 'Stabilise psychosis + safe discharge', team: 'Psychogeriatric MDT', progress: 18 },
      ].map((c, i) => (
        <Card key={i}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-display font-semibold">{c.p}</h4>
              <p className="text-sm text-muted-foreground">{c.goal}</p>
            </div>
            <Badge variant="secondary">{c.progress}%</Badge>
          </div>
          <Progress value={c.progress} className="mb-2" />
          <p className="text-xs text-muted-foreground">Team: {c.team}</p>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 12. CONSENT FORMS ============
export const ConsentForms = () => (
  <Shell title="Consent Forms">
    <Section icon={<FileSignature className="h-5 w-5" />} title="Digital Consent & E-Signature"
      desc="Procedure · Therapy · Discharge · Emergency · ECT consent with audit logging."
      action={<Button><Plus className="h-4 w-4" /> New Consent</Button>} />
    <Card>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Type</TableHead><TableHead>Patient</TableHead><TableHead>Witness</TableHead>
          <TableHead>Signed</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            { t: 'ECT Consent', p: 'Bisi Olarewaju', w: 'Dr. Adeyemi', d: '25 Mar 09:10', s: 'Signed', tone: 'green' },
            { t: 'Therapy Consent (CBT)', p: 'Amina Yusuf', w: 'Dr. Bakare', d: '24 Mar', s: 'Signed', tone: 'green' },
            { t: 'Procedure (Lumbar Puncture)', p: 'John Doe', w: 'Dr. Lawal', d: '—', s: 'Pending', tone: 'amber' },
            { t: 'Discharge Consent', p: 'Funke Adeyemi', w: 'Dr. Okafor', d: '—', s: 'Awaiting NoK', tone: 'sky' },
            { t: 'Emergency Override', p: 'Ngozi Okoro', w: 'Dr. Eze', d: '23 Mar 02:14', s: 'Signed', tone: 'green' },
          ].map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.t}</TableCell><TableCell>{r.p}</TableCell>
              <TableCell>{r.w}</TableCell><TableCell className="text-xs">{r.d}</TableCell>
              <TableCell><TonePill tone={r.tone as any} label={r.s} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 13. CLINICAL ALERTS ============
export const ClinicalAlerts = () => (
  <Shell title="Clinical Alerts">
    <Section icon={<ShieldAlert className="h-5 w-5" />} title="Real-Time Clinical Alert Engine"
      desc="Abnormal vitals · critical labs · drug interactions · psychiatric risk · missed meds." />
    <div className="space-y-2">
      {[
        { sev: 'Critical', tone: 'rose', p: 'Bisi Olarewaju', t: 'ALT 320 — possible hepatotoxicity', a: 'Hold Olanzapine · review' },
        { sev: 'High', tone: 'amber', p: 'John Doe', t: 'BP 142/96 — sustained ≥ 2 readings', a: 'Notify on-call' },
        { sev: 'High', tone: 'amber', p: 'Amina Yusuf', t: 'Lithium level pending — last dose 48h ago', a: 'Order STAT level' },
        { sev: 'Moderate', tone: 'sky', p: 'Tope Adesanya', t: 'Missed 14:00 Naltrexone dose', a: 'Reschedule + counsel' },
        { sev: 'Moderate', tone: 'purple', p: 'Ngozi Okoro', t: 'Psych risk score increased to 7/10', a: '1:1 observation' },
      ].map((a, i) => (
        <Card key={i} className={`border-l-4 ${a.tone === 'rose' ? 'border-l-rose-500' : a.tone === 'amber' ? 'border-l-amber-500' : a.tone === 'purple' ? 'border-l-purple-500' : 'border-l-sky-500'}`}>
          <div className="flex items-center gap-4">
            <AlertTriangle className={`h-5 w-5 ${a.tone === 'rose' ? 'text-rose-500' : a.tone === 'amber' ? 'text-amber-500' : a.tone === 'purple' ? 'text-purple-500' : 'text-sky-500'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TonePill tone={a.tone as any} label={a.sev} />
                <span className="font-medium">{a.p}</span>
              </div>
              <p className="text-sm mt-1">{a.t}</p>
              <p className="text-xs text-muted-foreground">Recommended: {a.a}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success('Alert acknowledged')}>Acknowledge</Button>
          </div>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 14. SMART FILTERING ============
export const SmartFilters = () => (
  <Shell title="Smart Filtering">
    <Section icon={<Filter className="h-5 w-5" />} title="Smart Clinical Filtering Engine"
      desc="Filter the entire EMR by patient · department · clinician · diagnosis · severity · date · admission status." />
    <Card>
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {['Department', 'Clinician', 'Diagnosis (ICD-11)', 'Severity', 'Date Range', 'Admission Status'].map(f => (
          <div key={f}>
            <Label className="text-xs">{f}</Label>
            <Select><SelectTrigger><SelectValue placeholder={`Any ${f}`} /></SelectTrigger><SelectContent>
              <SelectItem value="any">Any</SelectItem><SelectItem value="x">Sample</SelectItem>
            </SelectContent></Select>
          </div>
        ))}
      </div>
      <Button onClick={() => toast.success('Filter applied — 47 records matched')}>
        <Filter className="h-4 w-4" /> Apply Filter
      </Button>
    </Card>
    <Card className="mt-4">
      <h4 className="font-display font-semibold mb-3">Saved Smart Views</h4>
      {['High-risk psychiatric · last 24h', 'Pending doctor notes · Female Acute Ward', 'Critical labs · all wards', 'Discharge-pending · awaiting payment'].map(v => (
        <div key={v} className="flex justify-between py-2 border-b last:border-0">
          <span className="text-sm">{v}</span>
          <Button size="sm" variant="ghost">Open <ChevronRight className="h-4 w-4" /></Button>
        </div>
      ))}
    </Card>
  </Shell>
);

// ============ 15. CLINICAL TAGS ============
export const ClinicalTags = () => (
  <Shell title="Clinical Tagging">
    <Section icon={<Tag className="h-5 w-5" />} title="Clinical Tagging System"
      desc="Quick semantic tags that classify and surface patients across the EMR." />
    <Card>
      <div className="flex flex-wrap gap-2">
        {[
          { t: 'Schizophrenia', n: 42, tone: 'bg-purple-500/10 text-purple-700' },
          { t: 'Depression', n: 128, tone: 'bg-blue-500/10 text-blue-700' },
          { t: 'Bipolar Disorder', n: 54, tone: 'bg-indigo-500/10 text-indigo-700' },
          { t: 'ADHD', n: 31, tone: 'bg-sky-500/10 text-sky-700' },
          { t: 'Substance Abuse', n: 67, tone: 'bg-amber-500/10 text-amber-700' },
          { t: 'ICU Patient', n: 8, tone: 'bg-rose-500/10 text-rose-700' },
          { t: 'High Risk', n: 38, tone: 'bg-rose-500/10 text-rose-700' },
          { t: 'Follow-up Required', n: 92, tone: 'bg-emerald-500/10 text-emerald-700' },
          { t: 'Discharge Pending', n: 21, tone: 'bg-orange-500/10 text-orange-700' },
        ].map(tg => (
          <button key={tg.t} className={`px-3 py-2 rounded-lg text-sm font-medium ${tg.tone} hover:opacity-80 transition`}>
            {tg.t} · {tg.n}
          </button>
        ))}
      </div>
    </Card>
  </Shell>
);

// ============ 16. ICD-11 / DSM ============
export const IcdDsm = () => (
  <Shell title="ICD-11 / DSM Coding">
    <Section icon={<BookOpen className="h-5 w-5" />} title="Dual ICD-11 + DSM-5 Diagnosis Coding"
      desc="Auto-suggest diagnosis codes with dual classification — searchable database." />
    <Card>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Search diagnosis (e.g. depression, bipolar, schizophrenia)..." className="flex-1" />
        <Button><Sparkles className="h-4 w-4" /> AI Suggest</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>ICD-11</TableHead><TableHead>DSM-5</TableHead>
          <TableHead>Diagnosis</TableHead><TableHead>Used</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            ['6A70.1', '296.32', 'Recurrent depressive disorder, moderate', 412],
            ['6A60.1', '296.40', 'Bipolar I disorder, current episode manic', 198],
            ['6A20.0', '295.90', 'Schizophrenia, continuous', 156],
            ['6C40.2', '303.90', 'Alcohol dependence', 134],
            ['6A05.0', '314.01', 'ADHD, predominantly hyperactive', 89],
            ['6B40', '300.02', 'Generalised anxiety disorder', 76],
          ].map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono">{r[0]}</TableCell><TableCell className="font-mono">{r[1]}</TableCell>
              <TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 17. AI CLINICAL SUMMARY ============
export const AiSummary = () => (
  <Shell title="AI Clinical Summary">
    <Section icon={<Sparkles className="h-5 w-5" />} title="AI Clinical Summary Engine"
      desc="Auto patient summary · case history · risk detection · discharge assistance. No autonomous diagnosis." />
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <h4 className="font-display font-semibold mb-2">Patient Summary — John Doe</h4>
        <Badge variant="outline" className="mb-3 gap-1"><Sparkles className="h-3 w-3" /> AI-Generated · clinician must verify</Badge>
        <p className="text-sm leading-relaxed text-muted-foreground">
          42-year-old male admitted 23 Mar 2026 with recurrent depressive episode (moderate severity, F33.1). Past medical
          history: Hypertension (I10), Type 2 Diabetes (E11). On Sertraline 50mg OD, Lisinopril 10mg OD, Metformin 500mg BD.
          Vitals over 48h show persistent mild hypertension (avg 138/92). PHQ-9 score reduced from 18 → 11. No SI/HI.
          Lab work within normal limits except elevated fasting glucose (8.2 mmol/L). Plan: continue current regimen,
          dietetic referral, family review tomorrow, target discharge 30 Mar.
        </p>
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => toast.success('Summary copied to discharge draft')}>Use for Discharge</Button>
          <Button size="sm" variant="outline">Regenerate</Button>
        </div>
      </Card>
      <Card>
        <h4 className="font-display font-semibold mb-3">AI Insights</h4>
        {[
          { i: TrendingUpIcon('green'), t: 'Mood trajectory improving — PHQ-9 ↓ 7 points in 7 days' },
          { i: <AlertTriangle className="h-4 w-4 text-amber-500" />, t: 'BP trend warrants review — sustained Stage 1 HTN' },
          { i: <AlertTriangle className="h-4 w-4 text-amber-500" />, t: 'Glycaemic control suboptimal — consider HbA1c' },
          { i: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, t: 'No drug interactions detected in active regimen' },
          { i: <Brain className="h-4 w-4 text-purple-500" />, t: 'Low relapse risk if therapy adherence maintained' },
        ].map((x, i) => (
          <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0">
            {x.i}<p className="text-sm">{x.t}</p>
          </div>
        ))}
      </Card>
    </div>
  </Shell>
);
function TrendingUpIcon(_c: string) { return <CheckCircle2 className="h-4 w-4 text-emerald-500" />; }

// ============ 18. CROSS-DEPT SYNC ============
export const CrossDeptSync = () => (
  <Shell title="Cross-Department Sync">
    <Section icon={<RefreshCw className="h-5 w-5" />} title="Real-Time Cross-Department Synchronization"
      desc="Conflict-resolved, real-time data consistency across every department." />
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { d: 'Doctor ↔ Nursing', s: 'Live', tone: 'green', l: '12ms avg' },
        { d: 'Lab ↔ Doctor', s: 'Live', tone: 'green', l: '18ms avg' },
        { d: 'Pharmacy ↔ Doctor', s: 'Live', tone: 'green', l: '14ms avg' },
        { d: 'Radiology ↔ Doctor', s: 'Live', tone: 'green', l: '22ms avg' },
        { d: 'Psychiatry ↔ MDT', s: 'Live (restricted)', tone: 'sky', l: '16ms avg' },
        { d: 'Billing ↔ Discharge', s: 'Queued', tone: 'amber', l: '3 pending' },
      ].map((c, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{c.d}</span>
            <TonePill tone={c.tone as any} label={c.s} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{c.l}</p>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 19. LEGACY EMR ============
export const LegacyBridge = () => (
  <Shell title="Legacy EMR Bridge">
    <Section icon={<Database className="h-5 w-5" />} title="Legacy EMR Migration & Read-Only Bridge"
      desc="Historical record retrieval and cross-reference matching with the legacy hospital system."
      action={<Button variant="outline"><RefreshCw className="h-4 w-4" /> Run Cross-Reference</Button>} />
    <div className="grid md:grid-cols-4 gap-3 mb-4">
      <SummaryCard tone="indigo" title="Legacy Records" value="184,210" subtitle="indexed" icon={Database} />
      <SummaryCard tone="green" title="Matched to MPI" value="172,408" subtitle="93.6%" icon={CheckCircle2} />
      <SummaryCard tone="amber" title="Needs Review" value="9,124" subtitle="duplicate / fuzzy" icon={AlertTriangle} />
      <SummaryCard tone="rose" title="Unmatched" value="2,678" subtitle="1.5%" icon={ShieldAlert} />
    </div>
    <Card>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Legacy ID</TableHead><TableHead>Patient</TableHead>
          <TableHead>Match Score</TableHead><TableHead>Action</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            ['LEG-87124', 'John Doe', '98%'], ['LEG-91842', 'Amina Yusuf', '94%'],
            ['LEG-65420', 'Ngozi Okoro', '88% — review'], ['LEG-74510', 'Tope Adesanya', '99%'],
          ].map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{r[0]}</TableCell><TableCell>{r[1]}</TableCell>
              <TableCell>{r[2]}</TableCell>
              <TableCell><Button size="sm" variant="outline">View Legacy</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 20. NOTIFICATIONS ============
export const EmrNotifications = () => (
  <Shell title="Notifications">
    <Section icon={<BellRing className="h-5 w-5" />} title="Clinical Notification Center"
      desc="Routed to doctor, nurse, pharmacist, therapist & on-call teams." />
    <Card>
      {[
        { who: 'Dr. Lawal', t: 'Critical lab result for B. Olarewaju', when: '3m ago', tone: 'rose' },
        { who: 'Nurse Blessing', t: 'Vital signs entry due — Bed A-01', when: '15m ago', tone: 'amber' },
        { who: 'Pharm. Salami', t: 'Prescription pending review — A. Yusuf', when: '22m ago', tone: 'sky' },
        { who: 'Dr. Eze', t: 'Psych MDT meeting scheduled 14:00', when: '1h ago', tone: 'purple' },
      ].map((n, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0">
          <TonePill tone={n.tone as any} label={n.who} />
          <p className="flex-1 text-sm">{n.t}</p>
          <span className="text-xs text-muted-foreground">{n.when}</span>
        </div>
      ))}
    </Card>
  </Shell>
);

// ============ 21. AUDIT & COMPLIANCE ============
export const EmrAudit = () => (
  <Shell title="Audit & Compliance">
    <Section icon={<ScrollText className="h-5 w-5" />} title="Full Clinical Audit Trail"
      desc="Every note · edit · access · emergency override — immutable & timestamped." />
    <Card>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Timestamp</TableHead><TableHead>Actor</TableHead>
          <TableHead>Action</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {[
            ['25/03 11:42', 'Dr. Lawal', 'Signed progress note', 'John Doe', 'Note'],
            ['25/03 11:30', 'Dr. Bakare', 'Viewed psychiatric notes', 'Amina Yusuf', 'Access'],
            ['25/03 11:18', 'Dr. Eze', 'Edited MSE entry (v2)', 'Bisi Olarewaju', 'Edit'],
            ['25/03 09:14', 'Admin', 'Emergency override — break-glass', 'Ngozi Okoro', 'Override'],
            ['25/03 08:00', 'Nurse Okonkwo', 'Recorded MAR', 'John Doe', 'MAR'],
          ].map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{r[0]}</TableCell><TableCell>{r[1]}</TableCell>
              <TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell>
              <TableCell><Badge variant="secondary">{r[4]}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 22. MOBILE & WARD ROUNDS ============
export const MobileWard = () => (
  <Shell title="Mobile & Ward Rounds">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Bedside EMR & Tablet Ward Rounds"
      desc="Mobile note entry · voice-to-text · quick vitals · barcode-scan patient open." />
    <div className="grid md:grid-cols-3 gap-4">
      <SummaryCard tone="teal" title="Active Tablets" value="38" subtitle="across 8 wards" icon={Smartphone} />
      <SummaryCard tone="green" title="Voice Notes Today" value="142" subtitle="93% accuracy" icon={CheckCircle2} />
      <SummaryCard tone="indigo" title="Ward Rounds Logged" value="12" subtitle="today" icon={ClipboardList} />
    </div>
    <Card className="mt-4">
      <h4 className="font-display font-semibold mb-3">Today's Ward Rounds</h4>
      {[
        { w: 'Male Acute Ward', dr: 'Dr. Lawal', at: '07:30', done: 14, total: 16 },
        { w: 'Female Acute Ward', dr: 'Dr. Eze', at: '08:00', done: 12, total: 14 },
        { w: 'Psychogeriatric', dr: 'Dr. Adeyemi', at: '08:30', done: 8, total: 10 },
        { w: 'Addiction Recovery', dr: 'Dr. Mohammed', at: '09:00', done: 11, total: 12 },
      ].map((r, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{r.w} · {r.dr}</p>
            <p className="text-xs text-muted-foreground">Started {r.at}</p>
          </div>
          <div className="flex items-center gap-3 w-1/3">
            <Progress value={(r.done / r.total) * 100} className="flex-1" />
            <span className="text-xs font-mono">{r.done}/{r.total}</span>
          </div>
        </div>
      ))}
    </Card>
  </Shell>
);

// ============ 23. OFFLINE / CLOUD ============
export const OfflineCloud = () => {
  const [offline, setOffline] = useState(false);
  return (
    <Shell title="Offline / Cloud Sync">
      <Section icon={<Wifi className="h-5 w-5" />} title="Cloud + Offline Hybrid EMR"
        desc="Continue documenting during network drops — auto-syncs when reconnected." />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-display font-semibold">Offline Mode</h4>
            <p className="text-sm text-muted-foreground">Cache last 48h of patient charts locally for ward use.</p>
          </div>
          <Switch checked={offline} onCheckedChange={(v) => { setOffline(v); toast.success(v ? 'Offline mode enabled' : 'Cloud sync resumed'); }} />
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <SummaryCard tone="green" title="Sync Health" value="99.4%" subtitle="last 24h" icon={CheckCircle2} />
          <SummaryCard tone="amber" title="Queued" value="14" subtitle="awaiting upload" icon={Clock} />
          <SummaryCard tone="rose" title="Failed" value="0" subtitle="last hour" icon={AlertTriangle} />
          <SummaryCard tone="indigo" title="Local Cache" value="2.3 GB" subtitle="48h charts" icon={Database} />
        </div>
      </Card>
    </Shell>
  );
};

// ============ 24. HMS INTEGRATION ============
export const HmsIntegrationPanel = () => (
  <Shell title="HMS Integration">
    <Section icon={<Plug className="h-5 w-5" />} title="HMS + EMR Integration Matrix"
      desc="Live connectors to every operational system in the hospital ecosystem." />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        ['Appointment & Scheduling', 'green'], ['Billing & Revenue', 'green'],
        ['Pharmacy', 'green'], ['Laboratory', 'green'], ['Radiology', 'green'],
        ['Nursing', 'green'], ['Telemedicine', 'sky'], ['Patient Portal & PWA', 'green'],
        ['NHIA / NHIS', 'amber'], ['Legacy EMR', 'sky'],
      ].map(([n, t], i) => (
        <Card key={i}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{n}</span>
            <TonePill tone={t as any} label={t === 'green' ? 'Connected' : t === 'sky' ? 'Read-only' : 'Degraded'} />
          </div>
        </Card>
      ))}
    </div>
  </Shell>
);
