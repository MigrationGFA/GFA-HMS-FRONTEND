import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Brain, ClipboardList, FilePlus, CalendarDays, Users, HeartHandshake,
  Activity, BookOpen, FileSignature, ScrollText, BarChart3, CreditCard, ShieldCheck,
  MessageSquare, Smartphone, Settings2, AlertTriangle, FileText, CheckCircle2, Clock,
  Sparkles, Save, Copy, ListChecks, Target, TrendingUp, GraduationCap, Send, Repeat,
  BookMarked, Lightbulb, Search, Printer, Download, Eye, Edit, X, Check, Paperclip,
  Bell, Plus, ArrowRight, Filter, FileDown, Calendar, User, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/psychology';

export const psychologyNav = [
  { label: 'Psychology Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Assessment Center', path: `${base}/assessments`, icon: <Brain className="h-4 w-4" /> },
  { label: 'IQ Assessment', path: `${base}/iq`, icon: <Lightbulb className="h-4 w-4" /> },
  { label: 'Personality Assessment', path: `${base}/personality`, icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Therapy Management', path: `${base}/therapy`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'SATSAT Program', path: `${base}/satsat`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Documentation Center', path: `${base}/documentation`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Treatment Plans', path: `${base}/treatment-plans`, icon: <Target className="h-4 w-4" /> },
  { label: 'Referral Management', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Session Scheduling', path: `${base}/scheduling`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Outcome Monitoring', path: `${base}/outcomes`, icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Psychology Billing', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'NHIA Mapping', path: `${base}/nhia`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Staff Onboarding', path: `${base}/onboarding`, icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Psychology Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={psychologyNav} title={`Psychology · ${title}`}>{children}</DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action && <div className="flex flex-wrap gap-2">{action}</div>}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const Pill = ({ label, t = 'blue' }: { label: string; t?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone(t)}`}>{label}</span>
);

// ============================================================
// Success Popup hook
// ============================================================
type SuccessPayload = { title: string; message: string; nextStep?: string; actions?: { label: string; onClick: () => void }[] };

const useSuccess = () => {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<SuccessPayload | null>(null);
  const notify = (payload: SuccessPayload) => {
    setP(payload);
    setOpen(true);
    toast.success(payload.title, { description: payload.message });
  };
  const node = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl">{p?.title}</DialogTitle>
            <DialogDescription>{p?.message}</DialogDescription>
          </DialogHeader>
          {p?.nextStep && (
            <div className="mt-3 text-xs bg-muted/50 rounded-lg p-3 w-full">
              <span className="font-semibold">Next: </span>{p.nextStep}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4 w-full justify-center">
            {p?.actions?.map((a, i) => (
              <Button key={i} variant={i === 0 ? 'default' : 'outline'} size="sm" onClick={() => { a.onClick(); setOpen(false); }}>{a.label}</Button>
            ))}
            {!p?.actions?.length && <Button size="sm" onClick={() => setOpen(false)}>Close</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  return { notify, node };
};

// ============================================================
// Dummy data
// ============================================================
const PATIENTS = [
  { hn: 'GFA/2025/0012', name: 'Adebayo Tunde', age: 34, sex: 'M', diag: 'Major Depressive Disorder' },
  { hn: 'GFA/2024/8821', name: 'Fatimah Bello', age: 28, sex: 'F', diag: 'Substance Use Disorder' },
  { hn: 'GFA/2025/0144', name: 'Chinedu Eze', age: 42, sex: 'M', diag: 'Anxiety Disorder' },
  { hn: 'GFA/2025/0205', name: 'Aisha Mohammed', age: 19, sex: 'F', diag: 'Conduct Disorder' },
  { hn: 'GFA/2025/0301', name: 'Joy Nwosu', age: 31, sex: 'F', diag: 'Depression with suicidality' },
  { hn: 'GFA/2025/0420', name: 'Samuel Okafor', age: 25, sex: 'M', diag: 'Cannabis Use Disorder' },
  { hn: 'GFA/2025/0511', name: 'Halima Abdullahi', age: 36, sex: 'F', diag: 'Bipolar II' },
  { hn: 'GFA/2024/7702', name: 'Tunde Bakare', age: 40, sex: 'M', diag: 'Alcohol Use Disorder' },
];

const PROGRAMS = [
  { id: 'PSY-PR-01', name: 'SATSAT (Substance Abuse Treatment)', sessions: 16, price: 180000, nhia: 'NHIA-PSY-014', tone: 'purple' },
  { id: 'PSY-PR-02', name: 'Drug Abuse Therapy Program', sessions: 12, price: 145000, nhia: 'NHIA-PSY-015', tone: 'red' },
  { id: 'PSY-PR-03', name: 'Anger Management Program', sessions: 8, price: 80000, nhia: 'NHIA-PSY-021', tone: 'amber' },
  { id: 'PSY-PR-04', name: 'Behaviour Modification Program', sessions: 10, price: 95000, nhia: 'NHIA-PSY-022', tone: 'sky' },
  { id: 'PSY-PR-05', name: 'CBT Course (Cognitive Behavioural)', sessions: 12, price: 110000, nhia: 'NHIA-PSY-031', tone: 'blue' },
];

const SERVICES = [
  { code: 'PSY-A-001', name: 'IQ Assessment (WAIS-IV)', price: 25000, sessions: 1, nhia: 'NHIA-PSY-A01', status: 'Approved' },
  { code: 'PSY-A-002', name: 'Personality Assessment (MMPI-2)', price: 22000, sessions: 1, nhia: 'NHIA-PSY-A02', status: 'Approved' },
  { code: 'PSY-A-003', name: 'Mental Status Assessment', price: 12000, sessions: 1, nhia: 'NHIA-PSY-A03', status: 'Approved' },
  { code: 'PSY-A-004', name: 'Child Development Assessment', price: 18000, sessions: 1, nhia: 'NHIA-PSY-A04', status: 'Pending' },
  { code: 'PSY-A-005', name: 'Behaviour Assessment', price: 14000, sessions: 1, nhia: '—', status: 'Unmapped' },
  { code: 'PSY-A-006', name: 'Addiction Assessment (ASI)', price: 16000, sessions: 1, nhia: 'NHIA-PSY-A05', status: 'Rejected' },
  { code: 'PSY-T-001', name: 'Individual Psychotherapy / CBT', price: 15000, sessions: 1, nhia: 'NHIA-PSY-T01', status: 'Approved' },
  { code: 'PSY-T-002', name: 'Couple Therapy', price: 25000, sessions: 1, nhia: 'NHIA-PSY-T02', status: 'Approved' },
  { code: 'PSY-T-003', name: 'Family Therapy', price: 30000, sessions: 1, nhia: 'NHIA-PSY-T03', status: 'Pending' },
  { code: 'PSY-T-004', name: 'Anger Management', price: 12000, sessions: 1, nhia: 'NHIA-PSY-T04', status: 'Approved' },
  { code: 'PSY-T-005', name: 'Behaviour Modification', price: 13000, sessions: 1, nhia: '—', status: 'Unmapped' },
  { code: 'PSY-T-006', name: 'SATSAT Program (16 sessions)', price: 180000, sessions: 16, nhia: 'NHIA-PSY-014', status: 'Approved' },
];

const ASSESSMENT_TYPES = ['IQ Assessment', 'Personality Assessment', 'Mental Status Assessment', 'Behaviour Assessment', 'Addiction Assessment', 'Child Development Assessment'];

const ASSESSMENTS = [
  { id: 'PSY-AS-901', patient: 'Adebayo Tunde', hn: 'GFA/2025/0012', type: 'IQ Assessment', psy: 'Dr. Olufemi', status: 'Completed', date: '2026-05-28', score: 'FSIQ 94 (Average)' },
  { id: 'PSY-AS-902', patient: 'Fatimah Bello', hn: 'GFA/2024/8821', type: 'Personality Assessment', psy: 'Dr. Hassan', status: 'In Progress', date: '2026-06-02', score: '—' },
  { id: 'PSY-AS-903', patient: 'Samuel Okafor', hn: 'GFA/2025/0420', type: 'Addiction Assessment', psy: 'Dr. Bola', status: 'Pending', date: '2026-06-02', score: '—' },
  { id: 'PSY-AS-904', patient: 'Ngozi Eze', hn: 'GFA/2025/0144', type: 'Child Development Assessment', psy: 'Dr. Aisha', status: 'Completed', date: '2026-05-30', score: 'DQ 88' },
  { id: 'PSY-AS-905', patient: 'Aisha Mohammed', hn: 'GFA/2025/0205', type: 'Behaviour Assessment', psy: 'Dr. Olufemi', status: 'Awaiting Review', date: '2026-06-01', score: 'Submitted' },
  { id: 'PSY-AS-906', patient: 'Joy Nwosu', hn: 'GFA/2025/0301', type: 'Mental Status Assessment', psy: 'Dr. Hassan', status: 'In Progress', date: '2026-06-02', score: '—' },
];

const THERAPISTS = ['Dr. Olufemi', 'Dr. Hassan', 'Dr. Aisha', 'Dr. Bola', 'Dr. Adekoya'];

const SESSIONS = [
  { id: 'PSY-S-0411', patient: 'Adebayo Tunde', hn: 'GFA/2025/0012', type: 'CBT', sessionNo: '4/12', therapist: 'Dr. Olufemi', date: '2026-06-02', time: '09:30', status: 'In Progress' },
  { id: 'PSY-S-0412', patient: 'Fatimah Bello', hn: 'GFA/2024/8821', type: 'SATSAT', sessionNo: '5/16', therapist: 'Dr. Aisha', date: '2026-06-02', time: '10:30', status: 'Completed' },
  { id: 'PSY-S-0413', patient: 'Chinedu Eze', hn: 'GFA/2025/0144', type: 'Family Therapy', sessionNo: '2/8', therapist: 'Dr. Olufemi', date: '2026-06-02', time: '11:30', status: 'Pending' },
  { id: 'PSY-S-0414', patient: 'Aisha Mohammed', hn: 'GFA/2025/0205', type: 'Anger Management', sessionNo: '3/8', therapist: 'Dr. Hassan', date: '2026-06-02', time: '13:00', status: 'Pending' },
  { id: 'PSY-S-0415', patient: 'Joy Nwosu', hn: 'GFA/2025/0301', type: 'Individual Psychotherapy', sessionNo: '6/12', therapist: 'Dr. Bola', date: '2026-06-02', time: '14:30', status: 'Missed' },
  { id: 'PSY-S-0416', patient: 'Tunde Bakare', hn: 'GFA/2024/7702', type: 'Behaviour Modification', sessionNo: '7/10', therapist: 'Dr. Adekoya', date: '2026-06-02', time: '15:30', status: 'Follow-Up' },
];

const SATSAT = [
  { id: 'SAT-001', patient: 'Fatimah Bello', hn: 'GFA/2024/8821', registered: '2026-04-10', current: 5, paid: 'Paid', therapist: 'Dr. Aisha', status: 'Active', tone: 'green' },
  { id: 'SAT-002', patient: 'Tunde Bakare', hn: 'GFA/2024/7702', registered: '2026-03-22', current: 9, paid: 'Paid', therapist: 'Dr. Olufemi', status: 'Active', tone: 'green' },
  { id: 'SAT-003', patient: 'Ibrahim Musa', hn: 'GFA/2025/0610', registered: '2026-02-14', current: 16, paid: 'Paid', therapist: 'Dr. Hassan', status: 'Completed', tone: 'blue' },
  { id: 'SAT-004', patient: 'Halima Abdullahi', hn: 'GFA/2025/0511', registered: '2026-04-28', current: 2, paid: 'Pending', therapist: 'Dr. Bola', status: 'Pending Payment', tone: 'amber' },
  { id: 'SAT-005', patient: 'Samuel Okafor', hn: 'GFA/2025/0420', registered: '2026-05-12', current: 3, paid: 'Paid', therapist: 'Dr. Aisha', status: 'Sessions Due', tone: 'sky' },
  { id: 'SAT-006', patient: 'Kemi Lawal', hn: 'GFA/2025/0719', registered: '2026-03-10', current: 6, paid: 'Paid', therapist: 'Dr. Adekoya', status: 'Missed', tone: 'red' },
];

const REFERRALS = [
  { id: 'REF-PSY-201', from: 'Dr. Okonkwo (Psychiatry)', to: 'Clinical Psychology', patient: 'Adebayo Tunde', reason: 'IQ + Personality for diagnostic clarification', priority: 'Routine', date: '2026-05-28', status: 'Accepted' },
  { id: 'REF-PSY-202', from: 'Clinical Psychology', to: 'Social Work', patient: 'Halima Abdullahi', reason: 'Family support assessment', priority: 'Routine', date: '2026-05-30', status: 'Pending' },
  { id: 'REF-PSY-203', from: 'Clinical Psychology', to: 'Dr. Hassan (Psychiatry)', patient: 'Joy Nwosu', reason: 'Suicidality flagged during session', priority: 'Urgent', date: '2026-06-01', status: 'Pending' },
  { id: 'REF-PSY-204', from: 'Dr. Bola', to: 'Clinical Psychology', patient: 'Samuel Okafor', reason: 'Addiction screening', priority: 'Routine', date: '2026-05-25', status: 'Completed' },
  { id: 'REF-PSY-205', from: 'Pediatrics', to: 'Clinical Psychology', patient: 'Ngozi Eze', reason: 'Developmental assessment', priority: 'Routine', date: '2026-05-22', status: 'Rejected' },
];

const BILLS = [
  { inv: 'INV-PSY-7701', patient: 'Adebayo Tunde', service: 'IQ Assessment', amount: 25000, channel: 'NHIA', status: 'Paid', date: '2026-05-28' },
  { inv: 'INV-PSY-7702', patient: 'Fatimah Bello', service: 'SATSAT Program', amount: 180000, channel: 'SATSAT', status: 'Paid', date: '2026-04-10' },
  { inv: 'INV-PSY-7703', patient: 'Joy Nwosu', service: 'Individual Psychotherapy', amount: 15000, channel: 'Paid', status: 'Pending', date: '2026-06-01' },
  { inv: 'INV-PSY-7704', patient: 'Aisha Mohammed', service: 'Anger Management', amount: 12000, channel: 'NHIA', status: 'Outstanding', date: '2026-05-30' },
  { inv: 'INV-PSY-7705', patient: 'Halima Abdullahi', service: 'SATSAT Program', amount: 180000, channel: 'SATSAT', status: 'Pending', date: '2026-05-12' },
  { inv: 'INV-PSY-7706', patient: 'Chinedu Eze', service: 'Family Therapy', amount: 30000, channel: 'Paid', status: 'Paid', date: '2026-05-27' },
];

const PAST_REPORTS = [
  { name: 'June 1 Psychology Daily Summary', type: 'Daily', by: 'Dr. Olufemi', date: '2026-06-01', status: 'Generated' },
  { name: 'May SATSAT Outcome Report', type: 'SATSAT', by: 'Dr. Aisha', date: '2026-05-31', status: 'Generated' },
  { name: 'Q2 Assessment Volume Report', type: 'Assessment', by: 'Dr. Hassan', date: '2026-05-30', status: 'Generated' },
  { name: 'Therapy Adherence (Week 22)', type: 'Therapy', by: 'Dr. Bola', date: '2026-05-29', status: 'Pending' },
  { name: 'NHIA Revenue Statement', type: 'Billing', by: 'Finance', date: '2026-05-28', status: 'Generated' },
];

// ============================================================
// Reusable: Patient picker
// ============================================================
const PatientPicker = ({ value, onChange }: { value?: typeof PATIENTS[0]; onChange: (p: typeof PATIENTS[0]) => void }) => {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PATIENTS.slice(0, 5);
    return PATIENTS.filter(p => p.name.toLowerCase().includes(s) || p.hn.toLowerCase().includes(s));
  }, [q]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search patient by name or hospital number" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="max-h-44 overflow-auto border rounded-lg divide-y">
        {results.map(p => (
          <button key={p.hn} type="button" onClick={() => onChange(p)} className={`w-full text-left p-2.5 hover:bg-muted/50 transition ${value?.hn === p.hn ? 'bg-primary/5' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.hn} · {p.age}y {p.sex}</div>
              </div>
              <div className="text-xs text-muted-foreground hidden md:block">{p.diag}</div>
            </div>
          </button>
        ))}
        {!results.length && <div className="p-3 text-xs text-muted-foreground">No patients found.</div>}
      </div>
      {value && (
        <div className="p-3 rounded-lg border bg-primary/5">
          <div className="text-xs text-muted-foreground">Selected patient</div>
          <div className="text-sm font-semibold">{value.name}</div>
          <div className="text-xs font-mono text-muted-foreground">{value.hn} · {value.diag}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 1. DASHBOARD
// ============================================================
export const PsychologyDashboard = () => {
  const nav = useNavigate();
  const { notify, node } = useSuccess();
  return (
    <Shell title="Department Dashboard">
      {node}
      <Section icon={<Brain className="h-5 w-5" />} title="Clinical Psychology Workspace" desc="Assessments, therapy, SATSAT and outcomes — integrated with EMR, Billing, NHIA and Psychiatry."
        action={<>
          <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
          <Button variant="outline" onClick={() => nav(`${base}/therapy?start=1`)}><HeartHandshake className="h-4 w-4 mr-1" /> Start Therapy</Button>
        </>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Assessments Pending" value="9" icon={ClipboardList} tone="amber" />
        <SummaryCard title="In Progress" value="6" icon={Clock} tone="blue" />
        <SummaryCard title="Completed (MTD)" value="48" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Therapy Sessions Today" value="14" icon={CalendarDays} tone="teal" />
        <SummaryCard title="Active Therapy Cases" value="62" icon={HeartHandshake} tone="purple" />
        <SummaryCard title="SATSAT Patients" value="38" icon={Repeat} tone="purple" />
        <SummaryCard title="Referrals Pending" value="7" icon={Send} tone="amber" />
        <SummaryCard title="Reports Due" value="4" icon={FileText} tone="amber" />
        <SummaryCard title="Psychology Revenue (MTD)" value={formatCurrency(4250000)} icon={CreditCard} tone="green" />
        <SummaryCard title="Outcome Score" value="4.3/5" icon={TrendingUp} tone="blue" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">Active Therapy Programs</div>
          <div className="space-y-2">{PROGRAMS.slice(0, 4).map(p => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.sessions} sessions · {formatCurrency(p.price)}</div></div>
              <Pill label={p.nhia} t={p.tone} />
            </div>))}</div></Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Sessions</div>
          <div className="space-y-2">{SESSIONS.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{s.patient}</div><div className="text-xs text-muted-foreground">{s.time} · {s.type}</div></div>
              <Pill label={s.status} t={s.status === 'Completed' ? 'green' : s.status === 'Missed' ? 'red' : 'amber'} />
            </div>))}</div></Card>
        <Card><div className="text-sm font-semibold mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-3.5 w-3.5 mr-1" />New Assessment</Button>
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/therapy?start=1`)}><HeartHandshake className="h-3.5 w-3.5 mr-1" />Therapy Session</Button>
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/reports`)}><FileText className="h-3.5 w-3.5 mr-1" />Generate Report</Button>
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/scheduling`)}><CalendarDays className="h-3.5 w-3.5 mr-1" />Schedule</Button>
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/outcomes`)}><TrendingUp className="h-3.5 w-3.5 mr-1" />View Progress</Button>
            <Button variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/referrals`)}><Send className="h-3.5 w-3.5 mr-1" />Refer Patient</Button>
          </div></Card>
      </div>
      <Card><div className="text-sm font-semibold mb-3">Department KPIs</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { l: 'Attendance Rate', v: '88%' },
            { l: 'Program Completion', v: '72%' },
            { l: 'NHIA Cases', v: '214' },
            { l: 'Active Patients', v: '187' },
            { l: 'Research Cases', v: '46' },
          ].map(k => (<div key={k.l} className="p-3 rounded-lg bg-muted/30"><div className="text-xs text-muted-foreground">{k.l}</div><div className="text-2xl font-display font-bold text-primary">{k.v}</div></div>))}
        </div></Card>
    </Shell>
  );
};

// ============================================================
// 2. ASSESSMENT CENTER
// ============================================================
export const AssessmentCenter = () => {
  const nav = useNavigate();
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get('new') === '1');
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [type, setType] = useState('');
  const [src, setSrc] = useState('');
  const [psy, setPsy] = useState('');
  const [prio, setPrio] = useState('Routine');

  const filtered = ASSESSMENTS.filter(a => tab === 'all' || a.status.toLowerCase().replace(' ', '-') === tab);

  const submit = () => {
    if (!patient || !type) { toast.error('Select patient and assessment type'); return; }
    setOpen(false);
    notify({
      title: 'Assessment created successfully',
      message: `${type} for ${patient.name} · queued to ${psy || 'next psychologist'}`,
      nextStep: 'Open the assessment workspace to begin scoring.',
      actions: [
        { label: 'Open Assessment', onClick: () => nav(type.includes('IQ') ? `${base}/iq` : `${base}/personality`) },
        { label: 'Back to Center', onClick: () => {} },
      ],
    });
  };

  return (
    <Shell title="Assessment Center">
      {node}
      <Section icon={<Brain className="h-5 w-5" />} title="Psychological Assessment Center" desc="IQ, personality, mental status, addiction, behaviour and child development assessments."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard title="Total" value={String(ASSESSMENTS.length)} icon={ClipboardList} tone="blue" />
        <SummaryCard title="Pending" value="1" icon={Clock} tone="amber" />
        <SummaryCard title="In Progress" value="2" icon={Activity} tone="teal" />
        <SummaryCard title="Completed" value="2" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Awaiting Review" value="1" icon={Eye} tone="purple" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="awaiting-review">Awaiting Review</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Patient</TableHead><TableHead>Hosp #</TableHead><TableHead>Type</TableHead><TableHead>Psychologist</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>{filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.patient}</TableCell>
                    <TableCell className="font-mono text-xs">{a.hn}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>{a.psy}</TableCell>
                    <TableCell><Pill label={a.status} t={a.status === 'Completed' ? 'green' : a.status === 'In Progress' ? 'sky' : a.status === 'Awaiting Review' ? 'purple' : 'amber'} /></TableCell>
                    <TableCell>{a.date}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {a.status === 'Pending' && <Button size="sm" variant="outline" onClick={() => nav(a.type.includes('IQ') ? `${base}/iq` : `${base}/personality`)}>Open</Button>}
                        {a.status === 'In Progress' && <Button size="sm" variant="outline" onClick={() => nav(a.type.includes('IQ') ? `${base}/iq` : `${base}/personality`)}>Continue</Button>}
                        {(a.status === 'Completed' || a.status === 'Awaiting Review') && <Button size="sm" variant="outline" onClick={() => notify({ title: 'Assessment result', message: `${a.patient} · ${a.score}`, nextStep: 'Result available in EMR.' })}>View Result</Button>}
                        <Button size="sm" variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>))}
                  {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No assessments in this tab.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>New Assessment</DialogTitle><DialogDescription>Create a new psychology assessment request.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Assessment Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Referral Source</Label>
                <Select value={src} onValueChange={setSrc}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>{['Psychiatry', 'Internal Medicine', 'Pediatrics', 'Self-referral', 'Court', 'School'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Psychologist</Label>
                <Select value={psy} onValueChange={setPsy}>
                  <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                  <SelectContent>{THERAPISTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={prio} onValueChange={setPrio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Routine', 'Urgent', 'Stat'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} placeholder="Clinical context, prior history…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create Assessment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 3 & 4. Reusable Assessment Form (IQ + Personality)
// ============================================================
const AssessmentForm = ({ name, fields, route }: { name: string; fields: string[]; route: string }) => {
  const nav = useNavigate();
  const { notify, node } = useSuccess();
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [tplOpen, setTplOpen] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});

  const insertTemplate = () => {
    const tpl: Record<string, string> = {};
    fields.forEach(f => { tpl[f] = `Standard ${f} — within average range. See attached profile.`; });
    setData(tpl);
    setTplOpen(false);
    toast.success(`${name.includes('IQ') ? 'IQ' : 'Personality'} assessment template inserted successfully.`);
  };

  return (
    <>
      {node}
      <Section icon={<Sparkles className="h-5 w-5" />} title={name} desc="Standardised assessment form with template insertion, auto-save and submission."
        action={<>
          <Button variant="outline" onClick={() => setTplOpen(true)}><Copy className="h-4 w-4 mr-1" /> Insert Template</Button>
          <Button variant="outline" onClick={() => { toast.success(`${name} saved as draft.`); }}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
          <Button variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-4 w-4 mr-1" /> Print Draft</Button>
          <Button onClick={() => {
            if (!patient) { toast.error('Select a patient first.'); return; }
            notify({
              title: `${name.includes('IQ') ? 'IQ' : 'Personality'} assessment submitted successfully.`,
              message: `${patient.name} · scored and routed for review.`,
              nextStep: 'Result available in EMR and Assessment Center.',
              actions: [
                { label: 'View Assessment Summary', onClick: () => {} },
                { label: 'Start Another Assessment', onClick: () => nav(`${base}/assessments?new=1`) },
                { label: 'Return to Assessment Center', onClick: () => nav(`${base}/assessments`) },
              ],
            });
          }}>Submit Assessment</Button>
        </>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm font-semibold mb-3">Patient Selection</div>
          <PatientPicker value={patient} onChange={setPatient} />
          {patient && (
            <div className="mt-3 space-y-1 text-xs">
              <div><span className="text-muted-foreground">Status: </span><Pill label="In Progress" t="sky" /></div>
              <div><span className="text-muted-foreground">Psychologist: </span>Dr. Olufemi</div>
              <div><span className="text-muted-foreground">Date: </span>{new Date().toISOString().slice(0, 10)}</div>
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f}>
                <Label>{f}</Label>
                <Input value={data[f] || ''} onChange={e => setData({ ...data, [f]: e.target.value })} placeholder={`Enter ${f.toLowerCase()}`} />
              </div>
            ))}
            <div><Label>Clinical Observations</Label><Textarea rows={5} value={data.obs || ''} onChange={e => setData({ ...data, obs: e.target.value })} placeholder="Behavioural observations, rapport, validity…" /></div>
          </div>
        </Card>
      </div>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assessment Templates</DialogTitle><DialogDescription>Select a starter template to insert into the form.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {['Standard Adult', 'Standard Child', 'Brief Clinical', 'Court / Forensic'].map(t => (
              <button key={t} onClick={insertTemplate} className="w-full text-left p-3 rounded-lg border hover:bg-muted/50">
                <div className="font-semibold text-sm">{t} Template</div>
                <div className="text-xs text-muted-foreground">Prefilled scoring guides and validity notes.</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const IqAssessment = () => (<Shell title="IQ Assessment"><AssessmentForm name="IQ Assessment (WAIS-IV)" fields={['Verbal Comprehension Index', 'Perceptual Reasoning Index', 'Working Memory Index', 'Processing Speed Index']} route={`${base}/iq`} /></Shell>);
export const PersonalityAssessment = () => (<Shell title="Personality Assessment"><AssessmentForm name="Personality Assessment (MMPI-2)" fields={['Validity Scales (L, F, K)', 'Clinical Scales Summary', 'Content Scales Summary', 'Supplementary Scales']} route={`${base}/personality`} /></Shell>);

// ============================================================
// 5. THERAPY MANAGEMENT
// ============================================================
export const TherapyManagement = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [start, setStart] = useState(() => new URLSearchParams(window.location.search).get('start') === '1');
  const [selected, setSelected] = useState<typeof SESSIONS[0] | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteRow, setNoteRow] = useState<typeof SESSIONS[0] | null>(null);
  const [noteText, setNoteText] = useState('');

  const filtered = SESSIONS.filter(s => {
    const k = s.status.toLowerCase().replace(' ', '-');
    return tab === 'all' || k === tab;
  });

  return (
    <Shell title="Therapy Management">
      {node}
      <Section icon={<HeartHandshake className="h-5 w-5" />} title="Therapy Management Center" desc="CBT, Individual, Family, Couple, Behaviour Modification, Anger Management and Drug Therapy sessions."
        action={<Button onClick={() => setStart(true)}><FilePlus className="h-4 w-4 mr-1" /> Start Session</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryCard title="Sessions Today" value="14" icon={CalendarDays} tone="blue" />
        <SummaryCard title="Pending" value="2" icon={Clock} tone="amber" />
        <SummaryCard title="In Progress" value="1" icon={Activity} tone="teal" />
        <SummaryCard title="Completed" value="1" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Missed" value="1" icon={X} tone="rose" />
        <SummaryCard title="Follow-Up" value="1" icon={ArrowRight} tone="purple" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            {['all', 'pending', 'in-progress', 'completed', 'missed', 'follow-up'].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t.replace('-', ' ')}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Patient</TableHead><TableHead>Therapy Type</TableHead><TableHead>Session #</TableHead><TableHead>Therapist</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>{filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell><div>{s.patient}</div><div className="text-xs font-mono text-muted-foreground">{s.hn}</div></TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell>{s.sessionNo}</TableCell>
                    <TableCell>{s.therapist}</TableCell>
                    <TableCell>{s.time}</TableCell>
                    <TableCell><Pill label={s.status} t={s.status === 'Completed' ? 'green' : s.status === 'Missed' ? 'red' : s.status === 'In Progress' ? 'sky' : s.status === 'Follow-Up' ? 'purple' : 'amber'} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setSelected(s)}>Start</Button>
                        <Button size="sm" variant="outline" onClick={() => { setNoteRow(s); setNoteOpen(true); }}>Note</Button>
                        <Button size="sm" variant="outline" onClick={() => notify({ title: 'Session details', message: `${s.patient} · ${s.type} · ${s.sessionNo}` })}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => notify({ title: 'Session marked completed', message: `${s.patient} · ${s.type}` })}><Check className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>))}
                  {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No sessions in this tab.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Start Session workspace */}
      <Dialog open={start || !!selected} onOpenChange={o => { if (!o) { setStart(false); setSelected(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Start Therapy Session</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="text-xs text-muted-foreground">Patient</div>
              <div className="text-sm font-semibold">{selected?.patient || 'Select from queue'}</div>
              <div className="text-xs text-muted-foreground font-mono">{selected?.hn}</div>
            </div>
            <div><Label>Therapy Type</Label>
              <Select defaultValue={selected?.type}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{['CBT', 'Individual Psychotherapy', 'Family Therapy', 'Couple Therapy', 'Behaviour Modification', 'Anger Management', 'SATSAT', 'Drug Therapy'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Session Goals</Label><Textarea rows={2} placeholder="Targeted goals for today's session" /></div>
            <div className="md:col-span-2"><Label>Session Notes</Label><Textarea rows={4} placeholder="Therapy process, client engagement…" /></div>
            <div><Label>Intervention Used</Label><Input placeholder="e.g. Cognitive restructuring" /></div>
            <div><Label>Outcome</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger>
                <SelectContent>{['Improving', 'Stable', 'No change', 'Worsening'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Next Appointment</Label><Input type="datetime-local" /></div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { toast.success('Session draft saved.'); }}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
            <Button variant="outline" onClick={() => { setStart(false); setSelected(null); notify({ title: 'Follow-up scheduled', message: 'Next session added to therapist calendar.' }); }}>Schedule Follow-Up</Button>
            <Button onClick={() => { setStart(false); setSelected(null); notify({ title: 'Session completed successfully', message: `${selected?.patient || 'Patient'} · therapy outcome recorded.`, nextStep: 'Notes synced to EMR and Outcome Monitoring.' }); }}>Complete Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Session Note</DialogTitle><DialogDescription>{noteRow?.patient} · {noteRow?.type}</DialogDescription></DialogHeader>
          <Textarea rows={5} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Quick note…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setNoteOpen(false); setNoteText(''); notify({ title: 'Note saved successfully', message: `${noteRow?.patient} · note appended to session log.` }); }}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 6. SATSAT
// ============================================================
export const SatsatProgram = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [tracker, setTracker] = useState<typeof SATSAT[0] | null>(null);
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [payStatus, setPayStatus] = useState('Paid');
  const [therapist, setTherapist] = useState('');

  const filtered = SATSAT.filter(s => {
    const k = s.status.toLowerCase();
    if (tab === 'all') return true;
    if (tab === 'pending-payment') return k === 'pending payment';
    if (tab === 'sessions-due') return k === 'sessions due';
    return k === tab;
  });

  return (
    <Shell title="SATSAT Program">
      {node}
      <Section icon={<Repeat className="h-5 w-5" />} title="SATSAT Program Management" desc="Substance Abuse Treatment — 16-session package, attendance, payment and completion tracking."
        action={<Button onClick={() => setEnrolOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Enrol Patient</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryCard title="Enrolled Patients" value="38" icon={Users} tone="blue" />
        <SummaryCard title="Active Cases" value="22" icon={Activity} tone="green" />
        <SummaryCard title="Completed" value="62" icon={CheckCircle2} tone="purple" />
        <SummaryCard title="Pending Payment" value="4" icon={CreditCard} tone="amber" />
        <SummaryCard title="Sessions Due" value="7" icon={Clock} tone="teal" />
        <SummaryCard title="Missed Sessions" value="3" icon={X} tone="rose" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            {[['all', 'All'], ['active', 'Active'], ['completed', 'Completed'], ['pending-payment', 'Pending Payment'], ['sessions-due', 'Sessions Due'], ['missed', 'Missed']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Registered</TableHead><TableHead>Progress</TableHead><TableHead>Payment</TableHead><TableHead>Therapist</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell>{s.patient}<div className="text-xs font-mono text-muted-foreground">{s.hn}</div></TableCell>
                    <TableCell>{s.registered}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="w-28 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(s.current / 16) * 100}%` }} /></div><span className="text-xs font-semibold">{s.current}/16</span></div></TableCell>
                    <TableCell><Pill label={s.paid} t={s.paid === 'Paid' ? 'green' : 'amber'} /></TableCell>
                    <TableCell>{s.therapist}</TableCell>
                    <TableCell><Pill label={s.status} t={s.tone} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setTracker(s)}>View Session</Button></TableCell>
                  </TableRow>))}
                  {!filtered.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No records.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Enrol wizard */}
      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>SATSAT Enrolment</DialogTitle><DialogDescription>Enrol a patient into the 16-session SATSAT program.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div className="p-3 rounded-lg border bg-primary/5">
              <div className="text-xs text-muted-foreground">SATSAT Package</div>
              <div className="text-sm font-semibold">16 Sessions · {formatCurrency(180000)}</div>
              <div className="text-xs">NHIA-PSY-014 · Substance Abuse Treatment</div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Payment Status</Label>
                <Select value={payStatus} onValueChange={setPayStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Paid', 'Manual Purchase', 'Pending Payment', 'NHIA Cover'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assign Therapist</Label>
                <Select value={therapist} onValueChange={setTherapist}><SelectTrigger><SelectValue placeholder="Pick therapist" /></SelectTrigger>
                  <SelectContent>{THERAPISTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-xs">
              <div className="font-semibold mb-1">16-Session Schedule (auto-generated, weekly)</div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">{Array.from({ length: 16 }, (_, i) => (<div key={i} className="p-1.5 text-center rounded bg-card border">S{i + 1}</div>))}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrolOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!patient) { toast.error('Select a patient.'); return; }
              setEnrolOpen(false);
              notify({ title: 'Patient enrolled into SATSAT program successfully.', message: `${patient.name} · ${therapist || 'therapist'} · 16 sessions scheduled.`, nextStep: 'Sessions are now visible in the SATSAT tracker.' });
            }}>Enrol Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session tracker */}
      <Dialog open={!!tracker} onOpenChange={o => !o && setTracker(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>SATSAT Session Tracker</DialogTitle><DialogDescription>{tracker?.patient} · {tracker?.id}</DialogDescription></DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Attendance</TableHead><TableHead>Notes</TableHead><TableHead>Payment</TableHead><TableHead>Completion</TableHead></TableRow></TableHeader>
              <TableBody>{Array.from({ length: 16 }, (_, i) => {
                const done = i < (tracker?.current || 0);
                return (
                  <TableRow key={i}>
                    <TableCell>Session {i + 1}</TableCell>
                    <TableCell><Pill label={done ? 'Present' : 'Pending'} t={done ? 'green' : 'amber'} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{done ? 'Session notes filed' : '—'}</TableCell>
                    <TableCell><Pill label={tracker?.paid || 'Paid'} t={tracker?.paid === 'Paid' ? 'green' : 'amber'} /></TableCell>
                    <TableCell><Pill label={done ? 'Done' : '—'} t={done ? 'green' : 'amber'} /></TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 7. DOCUMENTATION CENTER
// ============================================================
export const DocumentationCenter = () => {
  const { notify, node } = useSuccess();
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [noteType, setNoteType] = useState('Therapy Note');
  const [body, setBody] = useState('');

  return (
    <Shell title="Documentation Center">
      {node}
      <Section icon={<FileSignature className="h-5 w-5" />} title="Psychology Documentation Center" desc="Write and manage assessment, therapy, progress and report notes for a selected patient." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard title="Draft Notes" value="8" icon={Save} tone="amber" />
        <SummaryCard title="Submitted Notes" value="46" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Assessment Notes" value="22" icon={Brain} tone="blue" />
        <SummaryCard title="Therapy Notes" value="64" icon={HeartHandshake} tone="purple" />
        <SummaryCard title="Reports Due" value="4" icon={FileText} tone="rose" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm font-semibold mb-3">Patient Search</div>
          <PatientPicker value={patient} onChange={setPatient} />
          <div className="text-sm font-semibold mt-4 mb-2">Recent Patients</div>
          <div className="space-y-1">{PATIENTS.slice(0, 4).map(p => (
            <button key={p.hn} onClick={() => setPatient(p)} className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 text-xs">
              <div className="font-semibold">{p.name}</div><div className="text-muted-foreground font-mono">{p.hn}</div>
            </button>))}</div>
        </Card>
        <Card className="lg:col-span-2">
          {!patient ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a patient to start documentation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border bg-primary/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{patient.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{patient.hn} · {patient.diag}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPatient(undefined)}>Change</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Note Type</Label>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Assessment Note', 'Therapy Note', 'Progress Note', 'Recommendations', 'Psychological Report'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Template</Label>
                  <Select onValueChange={v => setBody(`[${v} TEMPLATE]\n\nPresenting concerns:\n\nClinical observations:\n\nIntervention:\n\nPlan:`)}>
                    <SelectTrigger><SelectValue placeholder="Insert template" /></SelectTrigger>
                    <SelectContent>{['Standard', 'SOAP', 'Progress', 'Discharge'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{noteType}</Label><Textarea rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Type or paste note content…" /></div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => toast.success('Note saved as draft.')}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
                <Button variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-4 w-4 mr-1" />Print Note</Button>
                <Button onClick={() => notify({ title: 'Note submitted successfully', message: `${noteType} · ${patient.name}`, nextStep: 'Note is locked and pushed to EMR.' })}>Submit Note</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

// ============================================================
// 8. TREATMENT PLANS
// ============================================================
const PLAN_ROWS = [
  { id: 'TP-001', patient: 'Adebayo Tunde', dx: 'MDD', start: '2026-03-15', review: '2026-06-15', status: 'Active', tone: 'green' },
  { id: 'TP-002', patient: 'Fatimah Bello', dx: 'SUD', start: '2026-04-10', review: '2026-07-10', status: 'Active', tone: 'green' },
  { id: 'TP-003', patient: 'Aisha Mohammed', dx: 'Conduct', start: '2026-02-20', review: '2026-05-20', status: 'Due for Review', tone: 'amber' },
  { id: 'TP-004', patient: 'Tunde Bakare', dx: 'AUD', start: '2026-01-05', review: '2026-04-05', status: 'Suspended', tone: 'red' },
  { id: 'TP-005', patient: 'Joy Nwosu', dx: 'MDD+SI', start: '2025-11-12', review: '2026-02-12', status: 'Completed', tone: 'blue' },
];

export const TreatmentPlans = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<typeof PLAN_ROWS[0] | null>(null);
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();

  const filtered = PLAN_ROWS.filter(p => tab === 'all' || p.status.toLowerCase().replace(/ /g, '-') === tab);

  return (
    <Shell title="Treatment Plans">
      {node}
      <Section icon={<Target className="h-5 w-5" />} title="Treatment Plan Management" desc="Goals, objectives, interventions and outcome evaluation per patient."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> New Plan</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Active Plans" value="2" icon={Activity} tone="green" />
        <SummaryCard title="Suspended" value="1" icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Completed" value="1" icon={CheckCircle2} tone="blue" />
        <SummaryCard title="Due for Review" value="1" icon={Clock} tone="amber" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            {[['all', 'All'], ['active', 'Active'], ['suspended', 'Suspended'], ['completed', 'Completed'], ['due-for-review', 'Due for Review']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Diagnosis</TableHead><TableHead>Start</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>{p.patient}</TableCell>
                    <TableCell>{p.dx}</TableCell>
                    <TableCell>{p.start}</TableCell>
                    <TableCell>{p.review}</TableCell>
                    <TableCell><Pill label={p.status} t={p.tone} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setView(p)}>Open Plan</Button></TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>New Treatment Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div><Label>Presenting Problem</Label><Textarea rows={2} /></div>
            <div><Label>Goals</Label><Textarea rows={2} placeholder="SMART goals" /></div>
            <div><Label>Interventions</Label><Textarea rows={2} /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Session Plan</Label><Input placeholder="e.g. 12 weekly CBT sessions" /></div>
              <div><Label>Review Date</Label><Input type="date" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!patient) { toast.error('Select patient'); return; } setOpen(false); notify({ title: 'Treatment plan created', message: `${patient.name} · plan filed and active.` }); }}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={o => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.patient} — Treatment Plan</DialogTitle><DialogDescription>{view?.id} · {view?.dx}</DialogDescription></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Goal: </span>Reduce symptom severity by 50% in 12 weeks.</div>
            <div><span className="text-muted-foreground">Interventions: </span>Weekly CBT · Homework · Family review.</div>
            <div><span className="text-muted-foreground">Review: </span>{view?.review}</div>
            <div><span className="text-muted-foreground">Progress: </span>62%</div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setView(null); notify({ title: 'Plan edited', message: `${view?.patient} · plan updated.` }); }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
            <Button variant="outline" onClick={() => { setView(null); notify({ title: 'Plan suspended', message: `${view?.patient} · plan suspended.` }); }}>Suspend</Button>
            <Button variant="outline" onClick={() => { setView(null); notify({ title: 'Plan completed', message: `${view?.patient} · outcome recorded.` }); }}>Complete</Button>
            <Button variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 9. REFERRAL MANAGEMENT
// ============================================================
export const ReferralManagement = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<typeof REFERRALS[0] | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();

  const filtered = REFERRALS.filter(r => tab === 'all' || r.status.toLowerCase() === tab);

  return (
    <Shell title="Referrals">
      {node}
      <Section icon={<Send className="h-5 w-5" />} title="Referral Management" desc="Doctor ↔ Psychology, Psychiatry, Social Work and inter-departmental referrals."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> New Referral</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard title="Received" value={String(REFERRALS.length)} icon={Send} tone="blue" />
        <SummaryCard title="Pending" value="2" icon={Clock} tone="amber" />
        <SummaryCard title="Accepted" value="1" icon={Check} tone="green" />
        <SummaryCard title="Completed" value="1" icon={CheckCircle2} tone="purple" />
        <SummaryCard title="Rejected" value="1" icon={X} tone="rose" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">{['all', 'pending', 'accepted', 'completed', 'rejected'].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Patient</TableHead><TableHead>Reason</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">{r.from}</TableCell>
                    <TableCell className="text-xs">{r.to}</TableCell>
                    <TableCell>{r.patient}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{r.reason}</TableCell>
                    <TableCell><Pill label={r.priority} t={r.priority === 'Urgent' ? 'red' : 'blue'} /></TableCell>
                    <TableCell><Pill label={r.status} t={r.status === 'Accepted' ? 'green' : r.status === 'Completed' ? 'blue' : r.status === 'Rejected' ? 'red' : 'amber'} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setView(r)}>Open</Button></TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Referral</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Referred To</Label>
                <Select><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>{['Psychiatry', 'Social Work', 'Occupational Therapy', 'Pediatrics', 'Internal Medicine'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select defaultValue="Routine"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Routine', 'Urgent', 'Stat'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reason</Label><Textarea rows={3} /></div>
            <div><Label>Notes</Label><Textarea rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!patient) { toast.error('Select patient'); return; } setOpen(false); notify({ title: 'Referral submitted', message: `${patient.name} · referral routed.` }); }}>Send Referral</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={o => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Referral {view?.id}</DialogTitle><DialogDescription>{view?.patient}</DialogDescription></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">From: </span>{view?.from}</div>
            <div><span className="text-muted-foreground">To: </span>{view?.to}</div>
            <div><span className="text-muted-foreground">Reason: </span>{view?.reason}</div>
            <div><span className="text-muted-foreground">Priority: </span><Pill label={view?.priority || 'Routine'} t={view?.priority === 'Urgent' ? 'red' : 'blue'} /></div>
            <div><span className="text-muted-foreground">Status: </span>{view?.status}</div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setView(null); notify({ title: 'Referral accepted', message: `${view?.patient} · acceptance acknowledged.` }); }}>Accept</Button>
            <Button variant="outline" onClick={() => { setRejectOpen(true); }}>Reject</Button>
            <Button onClick={() => { setView(null); notify({ title: 'Referral completed', message: `${view?.patient} · closed.` }); }}>Complete Referral</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Referral</DialogTitle></DialogHeader>
          <Label>Reason for rejection</Label>
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!reason.trim()) { toast.error('Reason required'); return; } setRejectOpen(false); setView(null); setReason(''); notify({ title: 'Referral rejected', message: `Reason logged · requester notified.` }); }}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 10. SCHEDULING
// ============================================================
export const SessionScheduling = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [mode, setMode] = useState('Physical');

  return (
    <Shell title="Session Scheduling">
      {node}
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Session Scheduling" desc="Calendar, therapist roster, recurring sessions and follow-up engine."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Book Session</Button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-x-auto">
          <div className="text-sm font-semibold mb-3">Therapist Calendar · Week of June 1, 2026</div>
          <div className="grid grid-cols-6 gap-1 text-xs min-w-[500px]">
            {['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(h => <div key={h} className="font-semibold p-2 text-center bg-muted/40 rounded">{h}</div>)}
            {['09:00', '10:30', '12:00', '13:30', '15:00'].map((t, ti) => (
              <>
                <div key={`t-${t}`} className="p-2 font-semibold text-center">{t}</div>
                {[0, 1, 2, 3, 4].map(d => {
                  const booked = (ti + d) % 2 === 0;
                  return <div key={`${t}-${d}`} className={`p-2 rounded text-center border ${booked ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : 'bg-muted/20'}`}>{booked ? 'Booked' : '—'}</div>;
                })}
              </>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold mb-3">Upcoming Sessions</div>
          <div className="space-y-2">{SESSIONS.map(s => (
            <div key={s.id} className="p-2.5 rounded-lg border bg-muted/30">
              <div className="text-sm font-semibold">{s.patient}</div>
              <div className="text-xs text-muted-foreground">{s.date} · {s.time} · {s.type}</div>
            </div>))}</div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Book Session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Therapy Type</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['CBT', 'Individual Psychotherapy', 'Family', 'Couple', 'Anger Management', 'SATSAT'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Therapist</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{THERAPISTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" /></div>
              <div><Label>Time</Label><Input type="time" /></div>
              <div><Label>Duration</Label>
                <Select defaultValue="50"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['30', '45', '50', '60', '90'].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Session Mode</Label>
                <Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Physical', 'Online', 'Group', 'Family'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!patient) { toast.error('Select patient'); return; } setOpen(false); notify({ title: 'Session booked successfully.', message: `${patient.name} · ${mode} session scheduled.`, nextStep: 'Therapist roster updated.' }); }}>Book Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 11. OUTCOMES
// ============================================================
export const OutcomeMonitoring = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Outcomes">
      {node}
      <Section icon={<TrendingUp className="h-5 w-5" />} title="Outcome Monitoring" desc="Therapy progress, clinical improvement, attendance and program completion."
        action={<Button variant="outline" onClick={() => notify({ title: 'Outcomes exported', message: 'CSV download started.' })}><FileDown className="h-4 w-4 mr-1" />Export</Button>} />
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Attendance Rate" value="88%" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Clinical Improvement" value="74%" icon={TrendingUp} tone="blue" />
        <SummaryCard title="Program Completion" value="72%" icon={Repeat} tone="purple" />
        <SummaryCard title="Outcome Score" value="4.3/5" icon={BarChart3} tone="amber" />
      </div>
      <Card><div className="text-sm font-semibold mb-3">Outcomes by Modality</div>
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Modality</TableHead><TableHead>Cases</TableHead><TableHead>Improved</TableHead><TableHead>Stable</TableHead><TableHead>No Change</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
            <TableBody>{[['CBT', 84, '62%', '24%', '14%', '4.5'], ['Individual Psychotherapy', 121, '58%', '28%', '14%', '4.2'], ['Family Therapy', 36, '67%', '22%', '11%', '4.4'], ['SATSAT', 38, '71%', '18%', '11%', '4.6'], ['Anger Management', 28, '64%', '25%', '11%', '4.3']].map((r, i) => (<TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>))}</TableBody>
          </Table>
        </div>
      </Card>
    </Shell>
  );
};

// ============================================================
// 12. BILLING
// ============================================================
const BILLING_SERVICES = ['SATSAT Program', 'IQ Assessment', 'Personality Assessment', 'Anger Management', 'Couple Therapy', 'Family Therapy', 'Behaviour Modification', 'Individual Psychotherapy / CBT'];

export const PsychologyBilling = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [invOpen, setInvOpen] = useState<typeof BILLS[0] | null>(null);
  const [patient, setPatient] = useState<typeof PATIENTS[0] | undefined>();
  const [service, setService] = useState('');
  const [nhia, setNhia] = useState('Self-Pay');

  const filtered = BILLS.filter(b => {
    if (tab === 'all') return true;
    if (tab === 'nhia') return b.channel === 'NHIA';
    if (tab === 'satsat') return b.channel === 'SATSAT';
    return b.status.toLowerCase() === tab;
  });

  const price = SERVICES.find(s => s.name.includes(service.split(' ')[0]))?.price || 15000;

  return (
    <Shell title="Billing">
      {node}
      <Section icon={<CreditCard className="h-5 w-5" />} title="Psychology Billing Engine" desc="Dedicated billing for SATSAT, programs, assessments and therapy sessions — integrated with Wallet & NHIA."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> New Psychology Billing</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryCard title="Total Bills" value={String(BILLS.length)} icon={FileText} tone="blue" />
        <SummaryCard title="Paid" value="3" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Pending" value="2" icon={Clock} tone="amber" />
        <SummaryCard title="NHIA Bills" value="2" icon={ShieldCheck} tone="purple" />
        <SummaryCard title="Outstanding" value="1" icon={AlertCircle} tone="rose" />
        <SummaryCard title="SATSAT Bills" value="2" icon={Repeat} tone="teal" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">{['all', 'paid', 'pending', 'nhia', 'outstanding', 'satsat'].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead>Service</TableHead><TableHead>Amount</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(b => (
                  <TableRow key={b.inv}>
                    <TableCell className="font-mono text-xs">{b.inv}</TableCell>
                    <TableCell>{b.patient}</TableCell>
                    <TableCell>{b.service}</TableCell>
                    <TableCell>{formatCurrency(b.amount)}</TableCell>
                    <TableCell>{b.channel}</TableCell>
                    <TableCell><Pill label={b.status} t={b.status === 'Paid' ? 'green' : b.status === 'Outstanding' ? 'red' : 'amber'} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setInvOpen(b)}>Raise Invoice</Button></TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* New billing */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Psychology Billing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <PatientPicker value={patient} onChange={setPatient} />
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Service</Label>
                <Select value={service} onValueChange={setService}><SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>{BILLING_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price</Label><Input value={service ? formatCurrency(price) : ''} readOnly placeholder="Auto" /></div>
              <div><Label>NHIA Status</Label>
                <Select value={nhia} onValueChange={setNhia}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Self-Pay', 'NHIA Covered', 'Partial NHIA', 'SATSAT Package'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!patient || !service) { toast.error('Patient and service required'); return; } setOpen(false); notify({ title: 'Invoice generated', message: `${patient.name} · ${service} · ${formatCurrency(price)}`, nextStep: 'Invoice queued in cashier workspace.' }); }}>Generate Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice preview */}
      <Dialog open={!!invOpen} onOpenChange={o => !o && setInvOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invoice Preview</DialogTitle><DialogDescription>{invOpen?.inv}</DialogDescription></DialogHeader>
          <div className="border rounded-lg p-4 space-y-2 text-sm bg-muted/20">
            <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-semibold">{invOpen?.patient}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{invOpen?.service}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{invOpen && formatCurrency(invOpen.amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Pill label={invOpen?.status || ''} t={invOpen?.status === 'Paid' ? 'green' : 'amber'} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-mono">{invOpen?.inv}</span></div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { toast.success('PDF download started'); }}><Download className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button onClick={() => { setInvOpen(null); notify({ title: 'Invoice generated', message: `${invOpen?.inv} · ${invOpen?.patient}` }); }}>Generate Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 13. NHIA MAPPING
// ============================================================
export const NhiaMapping = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const [edit, setEdit] = useState<typeof SERVICES[0] | null>(null);

  const filtered = SERVICES.filter(s => {
    if (tab === 'all') return true;
    if (tab === 'unmapped') return s.status === 'Unmapped';
    return s.status.toLowerCase() === tab;
  });

  return (
    <Shell title="NHIA Mapping">
      {node}
      <Section icon={<ShieldCheck className="h-5 w-5" />} title="Psychology NHIA Mapping Center" desc="Map internal psychology services to NHIA codes with approval workflow." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard title="Total Mappings" value={String(SERVICES.length)} icon={FileText} tone="blue" />
        <SummaryCard title="Approved" value="7" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Pending" value="2" icon={Clock} tone="amber" />
        <SummaryCard title="Unmapped" value="2" icon={AlertCircle} tone="amber" />
        <SummaryCard title="Rejected" value="1" icon={X} tone="rose" />
      </div>
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">{['all', 'approved', 'pending', 'unmapped', 'rejected'].map(t => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab} className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Internal Code</TableHead><TableHead>Service</TableHead><TableHead>NHIA Code</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map(s => (
                  <TableRow key={s.code}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.nhia}</TableCell>
                    <TableCell><Pill label={s.status} t={s.status === 'Approved' ? 'green' : s.status === 'Rejected' ? 'red' : s.status === 'Unmapped' ? 'orange' : 'amber'} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setEdit(s)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button></TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit NHIA Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Psychology Service</Label><Input defaultValue={edit?.name} /></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Internal Code</Label><Input defaultValue={edit?.code} /></div>
              <div><Label>NHIA Code</Label><Input defaultValue={edit?.nhia} placeholder="NHIA-PSY-…" /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} defaultValue="NHIA-mapped psychology service" /></div>
            <div><Label>Status</Label>
              <Select defaultValue={edit?.status}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Approved', 'Pending', 'Unmapped', 'Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={() => { setEdit(null); notify({ title: 'NHIA mapping saved', message: `${edit?.name} updated.` }); }}>Save Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 14. REPORTS
// ============================================================
export const PsychologyReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [fmt, setFmt] = useState('PDF');
  const [preview, setPreview] = useState<string | null>(null);

  const generate = () => {
    if (!type) { toast.error('Select report type'); return; }
    setOpen(false);
    setPreview(type);
    notify({ title: 'Report generated successfully', message: `${type} · ${fmt}`, nextStep: 'Preview opened below.' });
  };

  return (
    <Shell title="Reporting">
      {node}
      <Section icon={<ScrollText className="h-5 w-5" />} title="Psychology Reporting Center" desc="Assessment, therapy, SATSAT, billing and operational reports."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> New Report</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryCard title="Reports Generated" value="124" icon={FileText} tone="blue" />
        <SummaryCard title="Pending" value="3" icon={Clock} tone="amber" />
        <SummaryCard title="Assessment" value="42" icon={Brain} tone="purple" />
        <SummaryCard title="Therapy" value="48" icon={HeartHandshake} tone="green" />
        <SummaryCard title="SATSAT" value="22" icon={Repeat} tone="teal" />
        <SummaryCard title="Billing" value="12" icon={CreditCard} tone="amber" />
      </div>
      <Card className="mb-4">
        <div className="text-sm font-semibold mb-3">Previous Reports</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Report Name</TableHead><TableHead>Type</TableHead><TableHead>Generated By</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>{PAST_REPORTS.map(r => (
              <TableRow key={r.name}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.by}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell><Pill label={r.status} t={r.status === 'Generated' ? 'green' : 'amber'} /></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setPreview(r.name)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('PDF downloading')}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('CSV exported')}><FileDown className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <div className="grid md:grid-cols-3 gap-3">
        {['Assessment Report', 'Therapy Report', 'SATSAT Report', 'Billing Report', 'Progress Report', 'Court Report', 'School Report', 'Rehabilitation Report'].map(r => (
          <Card key={r}><div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-primary" /><div className="font-semibold text-sm">{r}</div></div><div className="text-xs text-muted-foreground mb-3">Template-driven · Auto-save · e-Sign</div><Button size="sm" variant="outline" onClick={() => { setType(r); setOpen(true); }}>Generate</Button></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate New Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Report Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Assessment Report', 'Therapy Report', 'SATSAT Report', 'Billing Report', 'Daily Summary', 'Court Report'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>From</Label><Input type="date" /></div>
              <div><Label>To</Label><Input type="date" /></div>
            </div>
            <div><Label>Department / Service</Label><Input placeholder="All Psychology" defaultValue="All Psychology" /></div>
            <div><Label>Format</Label>
              <Select value={fmt} onValueChange={setFmt}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['PDF', 'CSV', 'Excel'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{preview}</DialogTitle><DialogDescription>Preview of generated report</DialogDescription></DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/20 text-sm space-y-2 max-h-96 overflow-auto">
            <div className="font-semibold">GFA HMS · Clinical Psychology Department</div>
            <div className="text-xs text-muted-foreground">Generated {new Date().toLocaleString()}</div>
            <hr />
            <p>Summary: 48 sessions, 9 new assessments, 6 SATSAT enrolments this period.</p>
            <p>Attendance rate: 88% · Outcome score: 4.3/5.</p>
            <p>Revenue: {formatCurrency(4250000)} (MTD).</p>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success('PDF downloading')}><Download className="h-4 w-4 mr-1" />PDF</Button>
            <Button variant="outline" onClick={() => toast.success('CSV exported')}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" onClick={() => { toast.success('Print queued'); window.print?.(); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 15. RESEARCH (unchanged)
// ============================================================
export const ResearchStatistics = () => (
  <Shell title="Research">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Research & Statistics" desc="Diagnoses, outcomes, attendance, completion, demographic and revenue analytics — exportable." action={<Button variant="outline" onClick={() => toast.success('Export queued')}>Export Data</Button>} />
    <div className="grid md:grid-cols-4 gap-3 mb-4">
      <SummaryCard title="Active Studies" value="14" icon={BookMarked} tone="purple" />
      <SummaryCard title="Research Cases" value="246" icon={Users} tone="blue" />
      <SummaryCard title="Publications (YTD)" value="9" icon={BookOpen} tone="amber" />
      <SummaryCard title="Outcome Score" value="4.3/5" icon={TrendingUp} tone="green" />
    </div>
    <Card><div className="text-sm font-semibold mb-3">Top Diagnoses</div>
      <div className="overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>ICD-11 / DSM-5</TableHead><TableHead>Cases</TableHead><TableHead>Avg Sessions</TableHead><TableHead>Improvement %</TableHead></TableRow></TableHeader>
          <TableBody>{[['Substance Use Disorder', 124, 14, '68%'], ['Major Depressive Disorder', 98, 10, '72%'], ['Generalised Anxiety', 76, 8, '74%'], ['Schizophrenia (adjunctive)', 54, 16, '52%'], ['Conduct Disorder (Child)', 32, 12, '64%']].map((r, i) => (<TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>))}</TableBody>
        </Table>
      </div>
    </Card>
  </Shell>
);

// ============================================================
// 16. COMMS CENTER (chat)
// ============================================================
type ChatMsg = { id: string; from: string; me?: boolean; text: string; time: string; attach?: string; urgent?: boolean };
type Thread = { id: string; with: string; role: string; patient?: string; lastMsg: string; time: string; unread: number; urgent?: boolean; messages: ChatMsg[] };

const INIT_THREADS: Thread[] = [
  { id: 'T1', with: 'Dr. Hassan', role: 'Psychiatry', patient: 'Joy Nwosu', lastMsg: 'Suicidality flagged — urgent review.', time: '09:42', unread: 2, urgent: true,
    messages: [
      { id: 'm1', from: 'Dr. Hassan', text: 'Patient Joy Nwosu showing acute risk signs. Can you assess today?', time: '09:30' },
      { id: 'm2', from: 'Me', me: true, text: 'On my way to the ward.', time: '09:35' },
      { id: 'm3', from: 'Dr. Hassan', text: 'Suicidality flagged — urgent review.', time: '09:42', urgent: true },
    ] },
  { id: 'T2', with: 'Sr. Modupe', role: 'Nurse', patient: 'Aisha Mohammed', lastMsg: 'Behaviour modification chart attached.', time: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', from: 'Me', me: true, text: 'Please attach today\'s behaviour log.', time: '14:10' },
      { id: 'm2', from: 'Sr. Modupe', text: 'Behaviour modification chart attached.', time: '14:55', attach: 'behaviour-log.pdf' },
    ] },
  { id: 'T3', with: 'Mr. Salami', role: 'Social Work', patient: 'Halima Abdullahi', lastMsg: 'Family assessment scheduled for Friday.', time: 'Mon', unread: 1,
    messages: [{ id: 'm1', from: 'Mr. Salami', text: 'Family assessment scheduled for Friday.', time: '11:20' }] },
  { id: 'T4', with: 'Dr. Okonkwo', role: 'Psychiatry', patient: 'Adebayo Tunde', lastMsg: 'IQ + Personality report uploaded to EMR.', time: 'Mon', unread: 0,
    messages: [{ id: 'm1', from: 'Me', me: true, text: 'IQ + Personality report uploaded to EMR.', time: '16:00' }] },
  { id: 'T5', with: 'OT Team', role: 'Occupational Therapy', lastMsg: 'Joint care plan draft ready.', time: 'Sun', unread: 0,
    messages: [{ id: 'm1', from: 'OT Team', text: 'Joint care plan draft ready.', time: '10:05' }] },
];

export const CommsCenter = () => {
  const { notify, node } = useSuccess();
  const [threads, setThreads] = useState(INIT_THREADS);
  const [active, setActive] = useState<string>('T1');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const visible = threads.filter(t => !search || t.with.toLowerCase().includes(search.toLowerCase()) || t.role.toLowerCase().includes(search.toLowerCase()) || (t.patient || '').toLowerCase().includes(search.toLowerCase()));
  const current = threads.find(t => t.id === active);

  const send = () => {
    if (!draft.trim() || !current) return;
    const msg: ChatMsg = { id: String(Date.now()), from: 'Me', me: true, text: draft, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setThreads(threads.map(t => t.id === active ? { ...t, messages: [...t.messages, msg], lastMsg: draft, time: 'Now' } : t));
    setDraft('');
    toast.success('Message sent');
  };

  return (
    <Shell title="Communication">
      {node}
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Psychology Communication Center" desc="Secure messaging between Psychology, Doctors, Nursing, Social Work, Psychiatry and Occupational Therapy."
        action={<Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New Conversation</Button>} />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[500px]">
        {/* Inbox */}
        <Card className="!p-0 flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search staff or patient" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y">
            {visible.map(t => (
              <button key={t.id} onClick={() => { setActive(t.id); setThreads(threads.map(x => x.id === t.id ? { ...x, unread: 0 } : x)); }} className={`w-full text-left p-3 hover:bg-muted/50 ${active === t.id ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">{t.with.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1">{t.with}{t.urgent && <Bell className="h-3 w-3 text-red-500" />}</div>
                      <div className="text-[11px] text-muted-foreground">{t.role}{t.patient ? ` · ${t.patient}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-muted-foreground">{t.time}</div>
                    {t.unread > 0 && <Badge className="mt-1 h-4 px-1.5 text-[10px]">{t.unread}</Badge>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{t.lastMsg}</div>
              </button>
            ))}
            {!visible.length && <div className="p-4 text-xs text-muted-foreground text-center">No conversations.</div>}
          </div>
        </Card>

        {/* Thread */}
        <Card className="!p-0 flex flex-col overflow-hidden">
          {current ? (
            <>
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">{current.with}{current.urgent && <Pill label="Urgent" t="red" />}</div>
                  <div className="text-xs text-muted-foreground">{current.role}{current.patient ? ` · linked to ${current.patient}` : ''}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => notify({ title: 'Urgent alert raised', message: `${current.with} notified.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" />Urgent</Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-2 bg-muted/20">
                {current.messages.map(m => (
                  <div key={m.id} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.me ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                      {!m.me && <div className="text-[11px] font-semibold opacity-70 mb-0.5">{m.from}</div>}
                      <div>{m.text}</div>
                      {m.attach && <div className="mt-1 inline-flex items-center gap-1 text-xs underline"><Paperclip className="h-3 w-3" />{m.attach}</div>}
                      <div className={`text-[10px] mt-1 ${m.me ? 'opacity-70' : 'text-muted-foreground'}`}>{m.time}{m.urgent && ' · URGENT'}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => toast.success('Attachment added')}><Paperclip className="h-4 w-4" /></Button>
                <Input placeholder="Type a message…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
                <Button onClick={send}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Select a conversation</div>}
        </Card>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Recipient</Label>
              <Select><SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
                <SelectContent>{['Dr. Okonkwo (Psychiatry)', 'Dr. Hassan (Psychiatry)', 'Sr. Modupe (Nurse)', 'Mr. Salami (Social Work)', 'OT Team', 'Pharmacy', 'Lab'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Link Patient (optional)</Label>
              <Select><SelectTrigger><SelectValue placeholder="Patient" /></SelectTrigger>
                <SelectContent>{PATIENTS.map(p => <SelectItem key={p.hn} value={p.hn}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => { setNewOpen(false); notify({ title: 'Conversation started', message: 'Recipient notified.' }); }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// Remaining: Onboarding, Alerts, Mobile, Config
// ============================================================
export const StaffOnboarding = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Staff Onboarding">
      {node}
      <Section icon={<GraduationCap className="h-5 w-5" />} title="Psychology Staff Onboarding" desc="New user assignment, department & role assignment, access approval and supervisor sign-off." action={<Button onClick={() => notify({ title: 'Onboarding started', message: 'New psychology staff onboarding initiated.' })}><FilePlus className="h-4 w-4 mr-1" /> New Onboarding</Button>} />
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Access</TableHead><TableHead>Supervisor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {[['Dr. Bola Adekoya', 'Clinical Psychologist', 'Psychology', 'Assessments, Therapy, Reports', 'Dr. Olufemi', 'Approved'], ['Mrs. Tope Aluko', 'Assistant Psychologist', 'Psychology', 'Therapy Notes, Scheduling', 'Dr. Aisha', 'Pending Supervisor'], ['Mr. Kola Bello', 'Intern', 'Psychology', 'Read-only', 'Dr. Olufemi', 'Awaiting Access']].map((r, i) => (
                <TableRow key={i}>{r.slice(0, 5).map((c, j) => <TableCell key={j}>{c}</TableCell>)}<TableCell><Pill label={r[5] as string} t={r[5] === 'Approved' ? 'green' : 'amber'} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Shell>
  );
};

export const PsychologyAlerts = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Alerts">
      {node}
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Psychology Alerts" desc="Suicidality, self-harm, missed sessions and assessment flags." />
      <div className="space-y-2">
        {[{ t: 'red', l: 'Joy Nwosu — suicidality reported during session', a: 'Notify on-call psychiatrist' }, { t: 'amber', l: 'Aisha Mohammed — 2 sessions missed', a: 'Send reminder + reschedule' }, { t: 'red', l: 'Tunde Bakare — relapse indicators on ASI', a: 'Escalate to addiction team' }, { t: 'blue', l: 'Adebayo Tunde — IQ score updated in EMR', a: 'Notify referring doctor' }].map((a, i) => (
          <Card key={i}><div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-3"><Pill label={a.t === 'red' ? 'CRITICAL' : a.t === 'amber' ? 'WARNING' : 'INFO'} t={a.t} /><div className="font-semibold text-sm">{a.l}</div></div><Button size="sm" variant="outline" onClick={() => notify({ title: 'Action taken', message: a.a })}>{a.a}</Button></div></Card>
        ))}
      </div>
    </Shell>
  );
};

export const PsychologyMobile = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Mobile">
      {node}
      <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Mode" desc="Optimised psychology workspace for ward rounds, tablet assessments and PWA." />
      <div className="grid md:grid-cols-3 gap-3">
        {['Tablet Assessment Mode', 'Mobile Therapy Notes', 'PWA Offline Mode', 'Session Check-in', 'Patient Quick Lookup', 'Voice Dictation'].map(m => (
          <Card key={m}><div className="flex items-center gap-2 mb-2"><Smartphone className="h-4 w-4 text-primary" /><div className="font-semibold text-sm">{m}</div></div><div className="text-xs text-muted-foreground">Responsive · Touch-optimised · Auto-sync</div><Button size="sm" variant="outline" className="mt-3" onClick={() => notify({ title: `${m} launched`, message: 'Mobile workspace opened.' })}>Launch</Button></Card>
        ))}
      </div>
    </Shell>
  );
};

// ============================================================
// 17. CONFIG
// ============================================================
type CfgKey = 'Psychology Services' | 'Therapy Types' | 'Assessment Templates' | 'SATSAT Settings' | 'Billing Prices' | 'NHIA Mapping Rules' | 'Report Templates' | 'Outcome Indicators';

export const PsychologyConfig = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState<CfgKey | null>(null);
  const cfg: { key: CfgKey; desc: string; rows: [string, string][] }[] = [
    { key: 'Psychology Services', desc: 'Manage list of psychology services and codes.', rows: SERVICES.slice(0, 4).map(s => [s.code, s.name]) },
    { key: 'Therapy Types', desc: 'CBT, Family, Couple, Anger Management, Behaviour Modification, SATSAT.', rows: [['T01', 'CBT'], ['T02', 'Family'], ['T03', 'Couple'], ['T04', 'Anger Management']] },
    { key: 'Assessment Templates', desc: 'Standardised templates for IQ, Personality, etc.', rows: [['WAIS-IV', 'IQ Adult'], ['WPPSI', 'IQ Child'], ['MMPI-2', 'Personality'], ['ASI', 'Addiction']] },
    { key: 'SATSAT Settings', desc: 'Configure 16-session package, weekly schedule and pricing.', rows: [['Sessions', '16'], ['Price', formatCurrency(180000)], ['Cycle', 'Weekly'], ['NHIA', 'NHIA-PSY-014']] },
    { key: 'Billing Prices', desc: 'Set service prices for psychology billing.', rows: SERVICES.slice(0, 4).map(s => [s.name, formatCurrency(s.price)]) },
    { key: 'NHIA Mapping Rules', desc: 'Define auto-mapping rules for NHIA submission.', rows: [['Rule 1', 'Map *Assessment* → NHIA-PSY-A*'], ['Rule 2', 'Map Therapy → NHIA-PSY-T*']] },
    { key: 'Report Templates', desc: 'Report formats for Assessment, Therapy, SATSAT and Billing.', rows: [['RT-01', 'Assessment'], ['RT-02', 'Therapy'], ['RT-03', 'SATSAT'], ['RT-04', 'Billing']] },
    { key: 'Outcome Indicators', desc: 'Track KPIs across modalities.', rows: [['KPI-01', 'Attendance %'], ['KPI-02', 'Improvement %'], ['KPI-03', 'Completion %'], ['KPI-04', 'Outcome Score']] },
  ];
  return (
    <Shell title="Configuration">
      {node}
      <Section icon={<Settings2 className="h-5 w-5" />} title="Psychology Configuration" desc="Services, therapy types, assessment templates, SATSAT, billing, NHIA, reports and outcome indicators." />
      <div className="grid md:grid-cols-3 gap-3">
        {cfg.map(c => (
          <Card key={c.key}>
            <div className="flex items-center gap-2 mb-2"><Settings2 className="h-4 w-4 text-primary" /><div className="font-semibold text-sm">{c.key}</div></div>
            <div className="text-xs text-muted-foreground mb-3">{c.desc}</div>
            <Button size="sm" variant="outline" onClick={() => setOpen(c.key)}>Configure</Button>
          </Card>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{open}</DialogTitle><DialogDescription>{cfg.find(c => c.key === open)?.desc}</DialogDescription></DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Code / Key</TableHead><TableHead>Value</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{cfg.find(c => c.key === open)?.rows.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell><Input defaultValue={k} /></TableCell>
                  <TableCell><Input defaultValue={v} /></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => toast.success('Row removed')}><X className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
          <div className="flex justify-between mt-2">
            <Button size="sm" variant="outline" onClick={() => toast.success('Row added')}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
              <Button onClick={() => { setOpen(null); notify({ title: 'Configuration saved', message: `${open} updated successfully.` }); }}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
