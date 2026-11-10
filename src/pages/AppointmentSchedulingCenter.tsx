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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  CalendarDays, LayoutDashboard, Stethoscope, Brain, Siren, UserCheck, CalendarRange,
  Users, Video, Bell, KeyRound, CreditCard, Repeat, ShieldCheck, Footprints, BedDouble,
  BarChart3, Wifi, Smartphone, Plug, Sparkles, ScrollText, CloudCog, Globe, Plus,
  CheckCircle2, XCircle, Clock, AlertTriangle, Phone, Mail, MessageSquare, ArrowRight,
  RefreshCw, Calendar, Activity, Eye, Send,
} from 'lucide-react';

const base = '/dashboard/superadmin/scheduling';
export const schedulingNavItems = [
  { label: 'Appointment Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'GMPC Scheduling', path: `${base}/gmpc`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'OPC / Psychiatry', path: `${base}/opc`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Emergency Scheduling', path: `${base}/emergency`, icon: <Siren className="h-4 w-4" /> },
  { label: 'Doctor Auto-Assignment', path: `${base}/assignment`, icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Calendar Management', path: `${base}/calendar`, icon: <CalendarRange className="h-4 w-4" /> },
  { label: 'Queue Management', path: `${base}/queue`, icon: <Users className="h-4 w-4" /> },
  { label: 'Telemedicine', path: `${base}/telemedicine`, icon: <Video className="h-4 w-4" /> },
  { label: 'Reminders & Notifications', path: `${base}/reminders`, icon: <Bell className="h-4 w-4" /> },
  { label: 'OTP Verification', path: `${base}/otp`, icon: <KeyRound className="h-4 w-4" /> },
  { label: 'Payment Gate', path: `${base}/payment`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Follow-Up Engine', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Confidentiality', path: `${base}/confidentiality`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Walk-In & Same-Day', path: `${base}/walkin`, icon: <Footprints className="h-4 w-4" /> },
  { label: 'Inpatient Consults', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Analytics & Reports', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Offline / Low-Bandwidth', path: `${base}/offline`, icon: <Wifi className="h-4 w-4" /> },
  { label: 'Mobile & Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'HMS + EMR Integration', path: `${base}/integration`, icon: <Plug className="h-4 w-4" /> },
  { label: 'AI Smart Scheduling', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Audit & Security', path: `${base}/audit`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Cloud Deployment', path: `${base}/cloud`, icon: <CloudCog className="h-4 w-4" /> },
  { label: 'Website Bridge', path: `${base}/web`, icon: <Globe className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={schedulingNavItems} title={`Appointment & Scheduling · ${title}`}>{children}</DashboardLayout>
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

// ============ 1. DASHBOARD ============
export const SchedulingOverview = () => {
  const widgets = [
    { title: 'Appointments Today', value: '486', subtitle: '+12% vs yesterday', icon: CalendarDays, tone: 'teal' as const },
    { title: 'GMPC Bookings', value: '184', subtitle: 'General Practice', icon: Stethoscope, tone: 'blue' as const },
    { title: 'OPC / Psychiatry', value: '212', subtitle: 'Outpatient psychiatry', icon: Brain, tone: 'purple' as const },
    { title: 'Telemedicine', value: '54', subtitle: 'Video consults today', icon: Video, tone: 'green' as const },
    { title: 'Pending Payment', value: '38', subtitle: 'Auto-cancel in 15m', icon: CreditCard, tone: 'amber' as const },
    { title: 'Confirmed', value: '402', subtitle: 'Paid & queued', icon: CheckCircle2, tone: 'green' as const },
    { title: 'Emergency Slots', value: '7', subtitle: 'Crisis psychiatry', icon: Siren, tone: 'rose' as const },
    { title: 'No-Shows', value: '14', subtitle: '2.9% rate', icon: XCircle, tone: 'rose' as const },
  ];
  const upcoming = [
    { time: '10:30', patient: 'Adebola O.', dept: 'OPC – Psychiatry', doctor: 'Dr. Lawal', mode: 'Physical', status: 'Confirmed' },
    { time: '10:45', patient: 'Chinwe E.', dept: 'GMPC', doctor: 'Dr. Eze', mode: 'Physical', status: 'Confirmed' },
    { time: '11:00', patient: 'Sodiq Y.', dept: 'Addiction Clinic', doctor: 'Dr. Bakare', mode: 'Physical', status: 'Pending' },
    { time: '11:15', patient: 'Halimat B.', dept: 'Telepsychiatry', doctor: 'Dr. Okafor', mode: 'Online', status: 'Confirmed' },
    { time: '11:30', patient: 'Kelechi N.', dept: 'Child Psychiatry', doctor: 'Dr. Mohammed', mode: 'Physical', status: 'Confirmed' },
  ];
  return (
    <Shell title="Command Center">
      <Section icon={<CalendarDays />} title="Appointment Command Center" desc="Real-time view of all hospital scheduling activity across clinics, queues and telemedicine." action={<Button onClick={() => toast.success('Refreshed')}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {widgets.map(w => <SummaryCard key={w.title} {...w} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-bold mb-3">Upcoming Appointments</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Dept</TableHead><TableHead>Doctor</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{upcoming.map(u => (
              <TableRow key={u.time}><TableCell className="font-semibold">{u.time}</TableCell><TableCell>{u.patient}</TableCell><TableCell>{u.dept}</TableCell><TableCell>{u.doctor}</TableCell><TableCell><Badge variant="outline">{u.mode}</Badge></TableCell><TableCell><StatusBadge status={u.status} /></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Department Workload</h3>
          {[{ d: 'OPC Psychiatry', v: 78 }, { d: 'GMPC', v: 62 }, { d: 'Addiction', v: 45 }, { d: 'Child Psych', v: 38 }, { d: 'Telemedicine', v: 54 }].map(x => (
            <div key={x.d} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span>{x.d}</span><span className="font-semibold">{x.v}%</span></div>
              <Progress value={x.v} />
            </div>
          ))}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <Card>
          <h3 className="font-display font-bold mb-3 flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" />Doctor Availability</h3>
          <div className="space-y-2 text-sm">
            {[
              { n: 'Dr. Lawal', s: 'OPC Psychiatry', t: 'Available', c: 'green' },
              { n: 'Dr. Eze', s: 'GMPC', t: 'In Consult', c: 'blue' },
              { n: 'Dr. Bakare', s: 'Addiction', t: 'Available', c: 'green' },
              { n: 'Dr. Okafor', s: 'Telepsych', t: 'On Call', c: 'amber' },
              { n: 'Dr. Mohammed', s: 'Child Psych', t: 'Break', c: 'gray' },
              { n: 'Dr. Adeyemi', s: 'Psychogeriatric', t: 'Available', c: 'green' },
            ].map(d => (
              <div key={d.n} className="flex items-center justify-between p-2 rounded border">
                <div><div className="font-semibold">{d.n}</div><div className="text-xs text-muted-foreground">{d.s}</div></div>
                <Badge variant={d.c === 'green' ? 'default' : d.c === 'blue' ? 'secondary' : 'outline'}>{d.t}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3 flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" />Ward Follow-Up Schedule</h3>
          <div className="space-y-2 text-sm">
            {[
              { w: 'Male Acute Ward', r: 'Dr. Lawal · 09:00', n: 12 },
              { w: 'Female Acute Ward', r: 'Dr. Adeyemi · 09:30', n: 9 },
              { w: 'Child & Adolescent', r: 'Dr. Mohammed · 10:00', n: 6 },
              { w: 'Addiction Recovery', r: 'Dr. Bakare · 10:30', n: 14 },
              { w: 'Psychogeriatric', r: 'Dr. Adeyemi · 11:00', n: 7 },
            ].map(w => (
              <div key={w.w} className="flex items-center justify-between p-2 rounded border">
                <div><div className="font-semibold">{w.w}</div><div className="text-xs text-muted-foreground">{w.r}</div></div>
                <Badge variant="outline">{w.n} pts</Badge>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => toast.success('Ward round roster published')}>Publish Roster</Button>
          </div>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3 flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Missed Appointment Recovery</h3>
          <div className="space-y-2 text-sm">
            {[
              { p: 'Tope A.', d: 'OPC Psychiatry', a: 'SMS + WhatsApp' },
              { p: 'Yusuf K.', d: 'Addiction Clinic', a: 'Call back' },
              { p: 'Ngozi I.', d: 'GMPC Follow-up', a: 'Auto-reschedule' },
              { p: 'Bisi O.', d: 'Therapy', a: 'SMS + WhatsApp' },
            ].map(m => (
              <div key={m.p} className="flex items-center justify-between p-2 rounded border">
                <div><div className="font-semibold">{m.p}</div><div className="text-xs text-muted-foreground">{m.d}</div></div>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${m.a} sent to ${m.p}`)}>{m.a.split(' ')[0]}</Button>
              </div>
            ))}
            <Button size="sm" className="w-full mt-2" onClick={() => toast.success('Bulk recovery sequence initiated')}><Send className="h-4 w-4 mr-2" />Run Bulk Recovery</Button>
          </div>
        </Card>
      </div>
    </Shell>
  );

};

// ============ 2. GMPC ============
export const GmpcScheduling = () => {
  const [open, setOpen] = useState(false);
  const steps = ['Registration / Login', 'OTP Verification', 'Select GMPC Clinic', 'Consultation Type', 'Date & Time', 'Doctor Assignment', 'Invoice', 'Payment', 'Confirmation', 'Queue Assignment'];
  return (
    <Shell title="GMPC">
      <Section icon={<Stethoscope />} title="GMPC Appointment Flow" desc="General Medical Practice Clinic scheduling — family medicine, follow-ups, walk-in conversion." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New GMPC Booking</Button>} />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-4">Standard Flow</h3>
          <ol className="space-y-2">{steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm"><span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{i + 1}</span>{s}</li>
          ))}</ol>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">GMPC Features</h3>
          <ul className="space-y-2 text-sm">
            {['General consultation', 'Family medicine', 'Follow-up appointments', 'Walk-in conversion', 'Repeat booking', 'Queue prioritization', 'Clinical routing'].map(f => (
              <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{f}</li>
            ))}
          </ul>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New GMPC Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient</Label><Input placeholder="Search MPI..." /></div>
            <div><Label>Consultation</Label><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="g">General</SelectItem><SelectItem value="f">Family Medicine</SelectItem><SelectItem value="fu">Follow-up</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Date</Label><Input type="date" /></div><div><Label>Time</Label><Input type="time" /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { toast.success('Invoice generated · awaiting payment'); setOpen(false); }}>Create & Invoice</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 3. OPC ============
export const OpcScheduling = () => {
  const services = ['Psychiatric consultation', 'Psychotherapy', 'Addiction clinic', 'Child & adolescent psychiatry', 'Psychogeriatric', 'Behavioral therapy', 'Crisis intervention'];
  return (
    <Shell title="OPC / Psychiatry">
      <Section icon={<Brain />} title="OPC Psychiatric Scheduling" desc="Psychiatric-safe workflow with risk assessment, confidentiality and continuity of care." />
      <div className="grid md:grid-cols-3 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Flow</h3>
          <ol className="space-y-2 text-sm">{['Patient Login', 'Psychiatry Dept Selection', 'Consultation Type', 'Risk Assessment Check', 'Doctor Auto-Assignment', 'Payment Processing', 'Confirmation', 'Psychiatric Queue'].map((s, i) => (
            <li key={s} className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">{i + 1}</span>{s}</li>
          ))}</ol>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Psychiatric Services</h3>
          <ul className="space-y-2 text-sm">{services.map(s => <li key={s} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{s}</li>)}</ul>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Risk Assessment</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Suicide-risk patients</span><Badge variant="destructive">4 today</Badge></div>
            <div className="flex justify-between"><span>Violence risk</span><Badge>2</Badge></div>
            <div className="flex justify-between"><span>Routine OPC</span><Badge variant="outline">206</Badge></div>
            <Button className="w-full mt-2" onClick={() => toast.success('Risk re-scored')}>Re-run Risk Engine</Button>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 4. EMERGENCY ============
export const EmergencyScheduling = () => {
  const cases = [
    { id: 'EM-2401', patient: 'Withheld', triage: 'Suicide Risk', eta: 'Now', status: 'Active' },
    { id: 'EM-2402', patient: 'Withheld', triage: 'Acute Psychosis', eta: '5m', status: 'Active' },
    { id: 'EM-2403', patient: 'Withheld', triage: 'Substance OD', eta: '10m', status: 'Pending' },
  ];
  return (
    <Shell title="Emergency">
      <Section icon={<Siren />} title="Emergency Psychiatric Scheduling" desc="Crisis triage, suicide-risk fast-track and emergency queue override." action={<Button variant="destructive" onClick={() => toast.error('Crisis protocol triggered')}><Siren className="h-4 w-4 mr-2" />Trigger Crisis Protocol</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Active Crises" value="3" icon={Siren} tone="rose" />
        <SummaryCard title="Suicide-Risk Today" value="4" icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Emergency Slots Free" value="7" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Telepsychiatry Live" value="2" icon={Video} tone="blue" />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-3">Crisis Queue (override priority)</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Patient</TableHead><TableHead>Triage</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{cases.map(c => (
            <TableRow key={c.id}><TableCell className="font-mono">{c.id}</TableCell><TableCell>{c.patient}</TableCell><TableCell><Badge variant="destructive">{c.triage}</Badge></TableCell><TableCell>{c.eta}</TableCell><TableCell><StatusBadge status={c.status} /></TableCell><TableCell><Button size="sm" onClick={() => toast.success(`${c.id} escalated`)}>Escalate</Button></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 5. DOCTOR AUTO-ASSIGNMENT ============
export const AssignmentEngine = () => (
  <Shell title="Doctor Assignment">
    <Section icon={<UserCheck />} title="Doctor Auto-Assignment Engine" desc="Intelligent routing based on availability, specialty, queue load and follow-up continuity." />
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <h3 className="font-display font-bold mb-3">Assignment Logic</h3>
        <ul className="space-y-2 text-sm">{['Department', 'Availability window', 'Specialty match', 'Queue load balance', 'Emergency level', 'Patient category (new / follow-up)', 'Follow-up continuity', 'Psychiatric risk level'].map(x => (
          <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{x}</li>
        ))}</ul>
      </Card>
      <Card>
        <h3 className="font-display font-bold mb-3">Today's Doctor Load</h3>
        {[
          { name: 'Dr. Lawal (Psych)', load: 82 }, { name: 'Dr. Eze (GMPC)', load: 64 },
          { name: 'Dr. Bakare (Addiction)', load: 71 }, { name: 'Dr. Okafor (Telepsych)', load: 48 },
          { name: 'Dr. Mohammed (Child Psych)', load: 55 },
        ].map(d => (
          <div key={d.name} className="mb-3"><div className="flex justify-between text-sm mb-1"><span>{d.name}</span><span className="font-semibold">{d.load}%</span></div><Progress value={d.load} /></div>
        ))}
        <Button className="w-full mt-2" onClick={() => toast.success('Workload rebalanced')}><RefreshCw className="h-4 w-4 mr-2" />Rebalance</Button>
      </Card>
    </div>
  </Shell>
);

// ============ 6. CALENDAR ============
export const CalendarManagement = () => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
  return (
    <Shell title="Calendar">
      <Section icon={<CalendarRange />} title="Calendar Management" desc="Daily / weekly / monthly views with drag-and-drop, holidays, shift planning and recurring slots." action={
        <div className="flex gap-2">{(['day', 'week', 'month'] as const).map(v => <Button key={v} variant={view === v ? 'default' : 'outline'} size="sm" onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</Button>)}</div>
      } />
      <Card>
        <div className="grid grid-cols-8 gap-1 text-xs">
          <div></div>
          {days.map(d => <div key={d} className="font-bold text-center p-2 bg-muted rounded">{d}</div>)}
          {slots.map(t => (
            <>
              <div key={t} className="p-2 text-muted-foreground font-semibold">{t}</div>
              {days.map(d => {
                const has = Math.random() > 0.55;
                return <div key={`${t}-${d}`} className={`p-2 rounded border text-center cursor-pointer hover:bg-primary/10 ${has ? 'bg-primary/5 border-primary/30' : ''}`}>{has ? '●' : ''}</div>;
              })}
            </>
          ))}
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => toast.success('Slot blocked')}>Block Time</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Recurring slot saved')}>Add Recurring</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Holiday added')}>Add Holiday</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Emergency reserve set')}>Reserve Emergency</Button>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 7. QUEUE ============
export const QueueManagement = () => {
  const queue = [
    { no: 'A012', patient: 'Adebola O.', dept: 'OPC', wait: '12m', status: 'In Consultation', color: 'blue' },
    { no: 'A013', patient: 'Chinwe E.', dept: 'GMPC', wait: '18m', status: 'Waiting', color: 'green' },
    { no: 'A014', patient: 'Sodiq Y.', dept: 'Addiction', wait: '24m', status: 'Delayed', color: 'orange' },
    { no: 'EM01', patient: 'Withheld', dept: 'Crisis', wait: '0m', status: 'Emergency', color: 'red' },
    { no: 'A011', patient: 'Halimat B.', dept: 'OPC', wait: '—', status: 'Completed', color: 'gray' },
  ];
  const colorMap: Record<string, string> = { green: 'bg-tertiary', blue: 'bg-accent', orange: 'bg-orange-500', red: 'bg-destructive', gray: 'bg-muted-foreground' };
  return (
    <Shell title="Queue">
      <Section icon={<Users />} title="Queue Management" desc="Live patient flow with color-coded status, wait-time estimation and emergency override." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[{ k: 'Waiting', c: 'green', n: 28 }, { k: 'In Consultation', c: 'blue', n: 14 }, { k: 'Delayed', c: 'orange', n: 4 }, { k: 'Emergency', c: 'red', n: 1 }, { k: 'Completed', c: 'gray', n: 142 }].map(s => (
          <Card key={s.k}><div className="flex items-center gap-2 mb-2"><span className={`h-3 w-3 rounded-full ${colorMap[s.c]}`}></span><span className="text-sm font-semibold">{s.k}</span></div><div className="text-2xl font-bold">{s.n}</div></Card>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Patient</TableHead><TableHead>Dept</TableHead><TableHead>Wait</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{queue.map(q => (
            <TableRow key={q.no}><TableCell className="font-mono font-bold">{q.no}</TableCell><TableCell>{q.patient}</TableCell><TableCell>{q.dept}</TableCell><TableCell>{q.wait}</TableCell><TableCell><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${colorMap[q.color]}`}></span>{q.status}</div></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`${q.no} called`)}>Call Next</Button></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 8. TELEMEDICINE ============
export const TelemedicineScheduling = () => (
  <Shell title="Telemedicine">
    <Section icon={<Video />} title="Telemedicine Scheduling" desc="Virtual consultation booking, telepsychiatry, secure meeting links and follow-up sessions." action={<Button onClick={() => toast.success('Tele-session scheduled')}><Plus className="h-4 w-4 mr-2" />Schedule Session</Button>} />
    <div className="grid md:grid-cols-3 gap-5">
      <Card>
        <h3 className="font-display font-bold mb-3">Live Waiting Room</h3>
        <div className="space-y-2 text-sm">
          {['Patient A — Dr. Okafor', 'Patient B — Dr. Lawal', 'Patient C — Dr. Mohammed'].map(x => (
            <div key={x} className="flex justify-between items-center p-2 bg-muted rounded"><span>{x}</span><Button size="sm" onClick={() => toast.success('Joining…')}>Join</Button></div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-display font-bold mb-3">Today's Sessions</h3>
        <div className="text-3xl font-bold text-primary">54</div>
        <p className="text-sm text-muted-foreground">42 completed · 12 upcoming</p>
        <div className="mt-3 space-y-1 text-sm"><div>Telepsychiatry: 38</div><div>GMPC Tele: 11</div><div>Therapy: 5</div></div>
      </Card>
      <Card>
        <h3 className="font-display font-bold mb-3">Features</h3>
        <ul className="space-y-1 text-sm">{['Secure meeting links', 'Virtual waiting room', 'Recording (consented)', 'Session reminders', 'Follow-up scheduling'].map(f => <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{f}</li>)}</ul>
      </Card>
    </div>
  </Shell>
);

// ============ 9. REMINDERS ============
export const Reminders = () => {
  const [sms, setSms] = useState(true);
  const [wa, setWa] = useState(true);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  return (
    <Shell title="Reminders">
      <Section icon={<Bell />} title="Reminder & Notification Engine" desc="Automated SMS, WhatsApp, Email and push reminders for appointments, payments and follow-ups." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Channels</h3>
          {[{ k: 'SMS', v: sms, s: setSms, i: MessageSquare }, { k: 'WhatsApp', v: wa, s: setWa, i: Phone }, { k: 'Email', v: email, s: setEmail, i: Mail }, { k: 'Push Notifications', v: push, s: setPush, i: Bell }].map(c => (
            <div key={c.k} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="flex items-center gap-2"><c.i className="h-4 w-4 text-primary" />{c.k}</span>
              <Switch checked={c.v} onCheckedChange={c.s} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Reminder Types</h3>
          <ul className="space-y-2 text-sm">{['Appointment reminders (24h, 1h)', 'Payment reminders', 'Telemedicine join reminders', 'Follow-up reminders', 'Missed appointment alerts', 'Emergency schedule notifications'].map(t => (
            <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{t}</li>
          ))}</ul>
          <Button className="w-full mt-4" onClick={() => toast.success('Reminders queued · 412 messages')}><Send className="h-4 w-4 mr-2" />Send Now</Button>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 10. OTP ============
export const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  return (
    <Shell title="OTP Verification">
      <Section icon={<KeyRound />} title="OTP Appointment Verification" desc="Secure appointment confirmation with device validation and fraud detection." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Verify Appointment</h3>
          <p className="text-sm text-muted-foreground mb-3">OTP sent to +234 803 *** 4567</p>
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
          <Button className="w-full mt-4" onClick={() => toast.success('OTP verified · proceeding to payment')}>Verify</Button>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Security Features</h3>
          <ul className="space-y-2 text-sm">{['OTP verification (SMS / WhatsApp)', 'Device fingerprint validation', 'Fraud / bot detection', 'Suspicious booking flags', 'Rate limiting per phone'].map(f => (
            <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{f}</li>
          ))}</ul>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 11. PAYMENT ============
export const PaymentGate = () => {
  const pending = [
    { ref: 'APT-9011', patient: 'Adebola O.', amt: '₦15,000', exp: '12m', status: 'Awaiting' },
    { ref: 'APT-9012', patient: 'Chinwe E.', amt: '₦8,500', exp: '8m', status: 'Awaiting' },
    { ref: 'APT-9013', patient: 'Sodiq Y.', amt: '₦12,000', exp: '2m', status: 'Expiring' },
  ];
  return (
    <Shell title="Payment Gate">
      <Section icon={<CreditCard />} title="Payment-Before-Confirmation" desc="Appointments only confirm after verified payment. Unpaid slots auto-cancel after 15 minutes." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Awaiting Payment" value="38" icon={Clock} tone="amber" />
        <SummaryCard title="Auto-Cancelled Today" value="9" icon={XCircle} tone="rose" />
        <SummaryCard title="Confirmed Today" value="402" icon={CheckCircle2} tone="green" />
        <SummaryCard title="NHIA Routed" value="74" icon={CreditCard} tone="blue" />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Patient</TableHead><TableHead>Amount</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{pending.map(p => (
            <TableRow key={p.ref}><TableCell className="font-mono">{p.ref}</TableCell><TableCell>{p.patient}</TableCell><TableCell className="font-semibold">{p.amt}</TableCell><TableCell>{p.exp}</TableCell><TableCell><StatusBadge status={p.status === 'Expiring' ? 'Warning' : 'Pending'} /></TableCell><TableCell className="flex gap-2"><Button size="sm" onClick={() => toast.success(`${p.ref} confirmed`)}>Confirm</Button><Button size="sm" variant="outline" onClick={() => toast.error(`${p.ref} cancelled`)}>Cancel</Button></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 12. FOLLOW-UP ============
export const FollowUpEngine = () => (
  <Shell title="Follow-Up">
    <Section icon={<Repeat />} title="Follow-Up Scheduling Engine" desc="Doctor-triggered follow-ups, recurring therapy and chronic care scheduling templates." />
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <h3 className="font-display font-bold mb-3">Active Follow-Up Templates</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Template</TableHead><TableHead>Frequency</TableHead><TableHead>Patients</TableHead></TableRow></TableHeader>
          <TableBody>
            {[{ n: 'Psychotherapy weekly', f: 'Weekly · 12 sessions', p: 84 }, { n: 'Schizophrenia review', f: 'Monthly', p: 142 }, { n: 'Bipolar med review', f: 'Every 2 weeks', p: 56 }, { n: 'Addiction recovery', f: 'Weekly · 24 sessions', p: 38 }].map(r => (
              <TableRow key={r.n}><TableCell>{r.n}</TableCell><TableCell>{r.f}</TableCell><TableCell><Badge>{r.p}</Badge></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <h3 className="font-display font-bold mb-3">Capabilities</h3>
        <ul className="space-y-2 text-sm">{['Doctor-triggered follow-up', 'Auto follow-up recommendations', 'Recurring therapy scheduling', 'Chronic patient scheduling', 'Medication review scheduling', 'Compliance tracking'].map(f => (
          <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{f}</li>
        ))}</ul>
      </Card>
    </div>
  </Shell>
);

// ============ Stub helper for remaining standard pages ============
const StandardPage = ({
  title, desc, icon, features, summary,
}: { title: string; desc: string; icon: React.ReactNode; features: string[]; summary?: { title: string; value: string; icon: any; tone: any }[] }) => (
  <Shell title={title}>
    <Section icon={icon} title={title} desc={desc} />
    {summary && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summary.map(s => <SummaryCard key={s.title} {...s} />)}
      </div>
    )}
    <Card>
      <h3 className="font-display font-bold mb-3">Features</h3>
      <ul className="grid md:grid-cols-2 gap-2 text-sm">{features.map(f => (
        <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{f}</li>
      ))}</ul>
      <div className="mt-4 flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => toast.success(`${title} configured`)}>Configure</Button>
        <Button size="sm" variant="outline" onClick={() => toast.success('Audit exported')}>Export</Button>
      </div>
    </Card>
  </Shell>
);

export const Confidentiality = () => <StandardPage
  title="Psychiatric Confidentiality Controls" icon={<ShieldCheck />}
  desc="Restricted visibility, masked diagnoses and limited caregiver access for psychiatric appointments."
  features={['Restricted psychiatry appointment visibility', 'Hidden diagnosis scheduling', 'Confidential therapy session labels', 'Limited caregiver access', 'Sensitive patient masking (ICD-11 F-codes)', 'Confidential audit trails']}
/>;

export const WalkIn = () => <StandardPage
  title="Walk-In & Same-Day Appointments" icon={<Footprints />}
  desc="Quick appointment creation with queue injection and temporary patient profile support."
  features={['Quick appointment creation', 'Emergency walk-in routing', 'Queue injection', 'Fast triage scheduling', 'Temporary patient profile', 'Convert to full MPI registration']}
  summary={[
    { title: 'Walk-Ins Today', value: '64', icon: Footprints, tone: 'teal' as const },
    { title: 'Converted to MPI', value: '52', icon: CheckCircle2, tone: 'green' as const },
    { title: 'Queue Injected', value: '12', icon: ArrowRight, tone: 'blue' as const },
    { title: 'Emergency Routed', value: '3', icon: Siren, tone: 'rose' as const },
  ]}
/>;

export const InpatientConsults = () => <StandardPage
  title="Inpatient Consultation Scheduling" icon={<BedDouble />}
  desc="Ward, ICU and bed-side consultation coordination across multi-specialist teams."
  features={['Ward consultation scheduling', 'ICU consultation requests', 'Multi-specialist scheduling', 'Bed-side consultation coordination', 'Nursing observation scheduling', 'Daily ward round planning']}
/>;

export const SchedulingAnalytics = () => <StandardPage
  title="Reporting & Analytics" icon={<BarChart3 />}
  desc="Daily, weekly and monthly performance — utilization, doctor workload, no-shows, telemedicine."
  features={['Daily / weekly / monthly appointments', 'Missed appointment rates', 'Department utilization', 'Doctor workload analytics', 'Telemedicine statistics', 'Queue performance metrics', 'Follow-up compliance', 'Custom report builder']}
  summary={[
    { title: 'Avg Wait Time', value: '18m', icon: Clock, tone: 'amber' as const },
    { title: 'No-Show Rate', value: '2.9%', icon: XCircle, tone: 'rose' as const },
    { title: 'Doctor Utilization', value: '74%', icon: Activity, tone: 'green' as const },
    { title: 'Tele Adoption', value: '11%', icon: Video, tone: 'blue' as const },
  ]}
/>;

export const Offline = () => <StandardPage
  title="Offline & Low-Bandwidth Support" icon={<Wifi />}
  desc="Resilient scheduling for Nigerian hospital network conditions — offline queue, sync engine and SMS fallback."
  features={['Offline scheduling queue', 'Background sync engine', 'SMS fallback notifications', 'Lite appointment mode', 'Fast-loading calendars', 'Conflict resolution on reconnect']}
/>;

export const MobileTablet = () => <StandardPage
  title="Mobile & Tablet Scheduling" icon={<Smartphone />}
  desc="Touch-friendly UI for nurse stations, ward-side bookings and mobile patient access."
  features={['Mobile patient scheduling', 'Tablet nurse station scheduling', 'Ward-side appointment booking', 'Touch-friendly UI', 'Quick queue controls', 'Barcode / QR patient lookup']}
/>;

export const HmsIntegration = () => <StandardPage
  title="HMS + EMR Integration" icon={<Plug />}
  desc="Connected to billing, EMR, telemedicine, NHIA/NHIS, notifications, legacy EMR and clinical dashboards."
  features={['Patient portal sync', 'Billing & invoicing', 'EMR record linkage', 'Telemedicine platform', 'NHIA / NHIS routing', 'Queue systems', 'Notification gateway', 'Legacy EMR bridge', 'Doctor & nursing dashboards']}
/>;

export const AiScheduling = () => <StandardPage
  title="AI-Powered Smart Scheduling" icon={<Sparkles />}
  desc="Intelligent queue prediction, workload balancing, no-show prediction and wait-time estimation."
  features={['Intelligent queue prediction', 'Doctor workload balancing', 'Appointment optimization', 'No-show prediction model', 'Smart scheduling suggestions', 'Wait-time prediction', 'Risk-aware routing']}
  summary={[
    { title: 'Prediction Accuracy', value: '92.4%', icon: Sparkles, tone: 'purple' as const },
    { title: 'Optimized Slots', value: '184', icon: CheckCircle2, tone: 'green' as const },
    { title: 'No-Shows Prevented', value: '47', icon: AlertTriangle, tone: 'amber' as const },
    { title: 'Wait Time Saved', value: '6h 22m', icon: Clock, tone: 'blue' as const },
  ]}
/>;

export const SchedulingAudit = () => <StandardPage
  title="Security & Audit Logging" icon={<ScrollText />}
  desc="Immutable audit trail of every scheduling action — creation, reschedule, cancellation, override."
  features={['Appointment creation logs', 'Reschedule logs', 'Cancellation logs', 'Queue override logs', 'Emergency scheduling logs', 'Payment confirmation logs', 'Telemedicine access logs', 'Tamper-evident hashing']}
/>;

export const CloudDeployment = () => <StandardPage
  title="Cloud & Enterprise Deployment" icon={<CloudCog />}
  desc="Multi-location scheduling with cloud sync, offline-first architecture and high availability."
  features={['Multi-location scheduling', 'Cloud synchronization', 'Offline-first architecture', 'Real-time updates', 'High availability cluster', 'Disaster recovery']}
/>;

export const WebsiteBridge = () => <StandardPage
  title="Website & Portal Integration" icon={<Globe />}
  desc="Seamlessly integrated with the public hospital website, patient portal, PWA and payment systems."
  features={['Public website embed widget', 'Patient portal sync', 'Mobile PWA integration', 'Telemedicine platform', 'Payment systems (Paystack / Flutterwave / NHIA)', 'SEO-friendly booking URLs']}
/>;
