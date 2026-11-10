import { useState, useMemo, ReactNode } from 'react';
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
import {
  LayoutDashboard, Baby, ClipboardList, FilePlus, CalendarDays, Users, HeartHandshake,
  BookOpen, FileSignature, ScrollText, BarChart3, CreditCard,
  MessageSquare, Smartphone, Settings2, AlertTriangle, FileText, TrendingUp,
  GraduationCap, Send, Brain, Stethoscope, Puzzle, School, UsersRound, ShieldAlert,
  Network, Pill, Repeat, Sparkles, CheckCircle2, Search, Printer, Download, Eye,
  Bell, Plus, Paperclip, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/cap';

export const capNav = [
  { label: 'CAP Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Child Registration', path: `${base}/registration`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Assessment Center', path: `${base}/assessments`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Development Tracking', path: `${base}/development`, icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Autism Management', path: `${base}/autism`, icon: <Puzzle className="h-4 w-4" /> },
  { label: 'ADHD Center', path: `${base}/adhd`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Risk & Safeguarding', path: `${base}/safeguarding`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Family & Parent Counselling', path: `${base}/family`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'School Services', path: `${base}/school`, icon: <School className="h-4 w-4" /> },
  { label: 'MDT Collaboration', path: `${base}/mdt`, icon: <Network className="h-4 w-4" /> },
  { label: 'Therapy Management', path: `${base}/therapy`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Medication & Pharmacy', path: `${base}/medications`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'CAP Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={capNav} title={`Child & Adolescent Psychiatry · ${title}`}>{children}</DashboardLayout>
);

const tone = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] || 'bg-muted text-foreground border-border');

const Chip = ({ label, t = 'blue' }: { label: string; t?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone(t)}`}>{label}</span>
);

const Section = ({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) => (
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

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

// ============================================================
// Success / Error popup hook
// ============================================================
type SuccessPayload = { title: string; message: string; nextStep?: string; actions?: { label: string; onClick: () => void }[] };
const useSuccess = () => {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<SuccessPayload | null>(null);
  const notify = (payload: SuccessPayload) => {
    setP(payload); setOpen(true);
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
            <div className="mt-3 text-xs bg-muted/50 rounded-lg p-3 w-full text-left">
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
const CHILDREN = [
  { id: 'CAP-2026-001', name: 'Tobi Adebayo', age: 7, sex: 'M', guardian: 'Mrs. Adebayo', phone: '+234 803 555 0142', school: 'Aro Primary School', diagnosis: 'ADHD', risk: 'Low', last: '2026-05-28', next: '2026-06-04', status: 'Active' },
  { id: 'CAP-2026-002', name: 'Zainab Ibrahim', age: 5, sex: 'F', guardian: 'Mr. Ibrahim', phone: '+234 805 211 9912', school: 'Sunshine Special Needs', diagnosis: 'Autism Spectrum (Level 2)', risk: 'Medium', last: '2026-05-30', next: '2026-06-06', status: 'Active' },
  { id: 'CAP-2026-003', name: 'Chukwuemeka Nwosu', age: 14, sex: 'M', guardian: 'Mrs. Nwosu', phone: '+234 807 401 7723', school: 'Federal Govt. Coll.', diagnosis: 'Conduct Disorder', risk: 'High', last: '2026-06-01', next: '2026-06-03', status: 'Active' },
  { id: 'CAP-2026-004', name: 'Amaka Eze', age: 11, sex: 'F', guardian: 'Mr. Eze', phone: '+234 809 700 6611', school: "St. Anne's College", diagnosis: 'Anxiety + Learning Disorder', risk: 'Medium', last: '2026-05-25', next: '2026-06-05', status: 'Pending Review' },
  { id: 'CAP-2026-005', name: 'Yusuf Bello', age: 9, sex: 'M', guardian: 'Foster: Mrs. Aliyu', phone: '+234 802 318 4477', school: 'Aro Primary School', diagnosis: 'PTSD (post-abuse)', risk: 'High', last: '2026-05-29', next: '2026-06-02', status: 'Active' },
  { id: 'CAP-2026-006', name: 'Halima Sani', age: 6, sex: 'F', guardian: 'Mrs. Sani', phone: '+234 806 994 0021', school: 'Bright Stars Nursery', diagnosis: 'Developmental Delay', risk: 'Low', last: '2026-05-31', next: '2026-06-09', status: 'New' },
  { id: 'CAP-2026-007', name: 'Daniel Okafor', age: 4, sex: 'M', guardian: 'Mr. Okafor', phone: '+234 808 220 1175', school: '-', diagnosis: 'Autism (Level 1) screen', risk: 'Low', last: '2026-06-01', next: '2026-06-10', status: 'New' },
];

const ASSESS_TYPES = [
  'Developmental Assessment', 'Behavioural Assessment', 'Autism Assessment',
  'ADHD Assessment', 'Risk Assessment', 'Learning Disability Assessment', 'Psychiatric Assessment',
];

const ASSESSMENTS = [
  { id: 'AS-7701', child: 'Tobi Adebayo', type: 'ADHD Assessment', clinician: 'Dr. Bola', priority: 'Routine', status: 'Completed', risk: 'Low', date: '2026-05-28' },
  { id: 'AS-7702', child: 'Zainab Ibrahim', type: 'Autism Assessment', clinician: 'Dr. Aisha', priority: 'Urgent', status: 'In Progress', risk: 'Medium', date: '2026-05-30' },
  { id: 'AS-7703', child: 'Chukwuemeka Nwosu', type: 'Psychiatric Assessment', clinician: 'Dr. Hassan', priority: 'Urgent', status: 'Awaiting Review', risk: 'High', date: '2026-06-01' },
  { id: 'AS-7704', child: 'Amaka Eze', type: 'Learning Disability Assessment', clinician: 'Dr. Olufemi', priority: 'Routine', status: 'Pending', risk: 'Medium', date: '2026-06-02' },
  { id: 'AS-7705', child: 'Yusuf Bello', type: 'Risk Assessment', clinician: 'Dr. Bola', priority: 'Urgent', status: 'Completed', risk: 'High', date: '2026-05-29' },
  { id: 'AS-7706', child: 'Halima Sani', type: 'Developmental Assessment', clinician: 'Dr. Aisha', priority: 'Routine', status: 'Pending', risk: 'Low', date: '2026-06-03' },
];

const DEV_TRACKS = [
  { id: 'DT-001', child: 'Halima Sani', age: 6, domain: 'Language', milestone: 'Speaks in 4-word sentences', status: 'Delayed', tone: 'red', next: '2026-06-12' },
  { id: 'DT-002', child: 'Daniel Okafor', age: 4, domain: 'Social', milestone: 'Plays cooperatively', status: 'Follow-Up Due', tone: 'amber', next: '2026-06-08' },
  { id: 'DT-003', child: 'Tobi Adebayo', age: 7, domain: 'Cognitive', milestone: 'Reads simple sentences', status: 'Normal', tone: 'green', next: '2026-06-20' },
  { id: 'DT-004', child: 'Zainab Ibrahim', age: 5, domain: 'Motor', milestone: 'Pencil grip', status: 'Delayed', tone: 'red', next: '2026-06-09' },
  { id: 'DT-005', child: 'Amaka Eze', age: 11, domain: 'Emotional', milestone: 'Regulates frustration', status: 'Normal', tone: 'green', next: '2026-06-18' },
];

const AUTISM = [
  { id: 'ASD-001', child: 'Zainab Ibrahim', severity: 'Level 2', screen: 'M-CHAT-R 18', therapy: 'ABA + Speech', status: 'Therapy Ongoing', next: '2026-06-06', tone: 'green' },
  { id: 'ASD-002', child: 'Daniel Okafor', severity: 'Level 1', screen: 'M-CHAT-R 9', therapy: 'Social Skills', status: 'New', next: '2026-06-08', tone: 'blue' },
  { id: 'ASD-003', child: 'Habibat Sani', severity: 'Level 3', screen: 'M-CHAT-R 22', therapy: 'Intensive ABA', status: 'Active', next: '2026-06-03', tone: 'amber' },
  { id: 'ASD-004', child: 'Kemi Adetunji', severity: 'Level 1', screen: 'M-CHAT-R 7', therapy: 'Pending', status: 'Pending Assessment', next: '2026-06-11', tone: 'amber' },
  { id: 'ASD-005', child: 'Ifeanyi Eze', severity: 'Level 2', screen: 'ADOS-2 12', therapy: 'ABA Block', status: 'Completed', next: '—', tone: 'blue' },
];

const ADHD = [
  { id: 'ADHD-001', child: 'Tobi Adebayo', presentation: 'Combined', med: 'Methylphenidate 10mg', plan: 'Behaviour Plan', status: 'Active', next: '2026-06-04', tone: 'green' },
  { id: 'ADHD-002', child: 'Kenechi Obi', presentation: 'Inattentive', med: 'Atomoxetine 25mg', plan: 'Med Review', status: 'Medication Review', next: '2026-06-05', tone: 'amber' },
  { id: 'ADHD-003', child: 'Bisi Lawal', presentation: 'Hyperactive-Impulsive', med: 'Methylphenidate 18mg', plan: 'Follow-Up', status: 'Follow-Up Due', next: '2026-06-06', tone: 'red' },
  { id: 'ADHD-004', child: 'Ngozi Eze', presentation: 'Inattentive', med: '—', plan: 'Behaviour Plan', status: 'New', next: '2026-06-09', tone: 'blue' },
];

const RISK_TYPES = ['Abuse Risk', 'Neglect Risk', 'Self-Harm Risk', 'Violence Risk', 'School Risk', 'Family Risk'];
const RISKS = [
  { id: 'RA-CAP-001', child: 'Chukwuemeka Nwosu', type: 'Self-Harm Risk', level: 'High', date: '2026-06-01', action: 'Inpatient review', status: 'Escalated', tone: 'red' },
  { id: 'RA-CAP-002', child: 'Yusuf Bello', type: 'Abuse Risk', level: 'High', date: '2026-05-29', action: 'Social Work escalation', status: 'Escalated', tone: 'red' },
  { id: 'RA-CAP-003', child: 'Amaka Eze', type: 'School Risk', level: 'Medium', date: '2026-05-25', action: 'School liaison meeting', status: 'Review Due', tone: 'amber' },
  { id: 'RA-CAP-004', child: 'Tobi Adebayo', type: 'Family Risk', level: 'Low', date: '2026-05-22', action: 'Family counselling', status: 'Active', tone: 'green' },
];

const FAMILY = [
  { id: 'FAM-001', family: 'Adebayo Family', child: 'Tobi Adebayo', type: 'Parent Counselling', date: '2026-06-07', status: 'Pending', clinician: 'Dr. Bola' },
  { id: 'FAM-002', family: 'Ibrahim Family', child: 'Zainab Ibrahim', type: 'Family Therapy', date: '2026-06-09', status: 'Pending', clinician: 'Dr. Aisha' },
  { id: 'FAM-003', family: 'Nwosu Family', child: 'Chukwuemeka Nwosu', type: 'Family Therapy', date: '2026-06-04', status: 'Completed', clinician: 'Dr. Hassan' },
  { id: 'FAM-004', family: 'Eze Family', child: 'Amaka Eze', type: 'Parent Counselling', date: '2026-06-05', status: 'Completed', clinician: 'Dr. Olufemi' },
];

const SCHOOLS = [
  { id: 'SR-001', child: 'Tobi Adebayo', school: 'Aro Primary School', type: 'ADHD Support', sent: '2026-05-26', status: 'Acknowledged', tone: 'green' },
  { id: 'SR-002', child: 'Amaka Eze', school: "St. Anne's College", type: 'Learning Plan', sent: '2026-05-22', status: 'Pending', tone: 'amber' },
  { id: 'SR-003', child: 'Zainab Ibrahim', school: 'Sunshine Special Needs', type: 'Quarterly Progress', sent: '2026-05-30', status: 'Acknowledged', tone: 'green' },
  { id: 'SR-004', child: 'Chukwuemeka Nwosu', school: 'Federal Govt. Coll.', type: 'Behaviour Report', sent: '2026-05-28', status: 'Completed', tone: 'blue' },
  { id: 'SR-005', child: 'Yusuf Bello', school: 'Aro Primary School', type: 'School Referral', sent: '2026-05-29', status: 'Pending', tone: 'amber' },
];

const MDT = [
  { id: 'MDT-001', child: 'Chukwuemeka Nwosu', date: '2026-06-03', members: 'Psychiatrist · Psychologist · Social Worker · Nurse', purpose: 'High-risk case review', status: 'Upcoming', tone: 'red' },
  { id: 'MDT-002', child: 'Zainab Ibrahim', date: '2026-06-05', members: 'Psychiatrist · OT · Speech · Psychologist', purpose: 'Therapy plan review', status: 'Upcoming', tone: 'blue' },
  { id: 'MDT-003', child: 'Yusuf Bello', date: '2026-05-31', members: 'Psychiatrist · Social Worker · Psychologist', purpose: 'Child protection referral', status: 'Completed', tone: 'blue' },
  { id: 'MDT-004', child: 'Amaka Eze', date: '2026-05-28', members: 'Psychiatrist · Educational Psych · Parent', purpose: 'School plan', status: 'Pending Actions', tone: 'amber' },
];

const THERAPY = [
  { id: 'TH-001', child: 'Tobi Adebayo', mode: 'Play Therapy', therapist: 'Dr. Bola', sessions: '6/12', status: 'Active', date: '2026-06-04', tone: 'green' },
  { id: 'TH-002', child: 'Amaka Eze', mode: 'CBT (child-adapted)', therapist: 'Dr. Aisha', sessions: '4/10', status: 'Active', date: '2026-06-05', tone: 'blue' },
  { id: 'TH-003', child: 'Chukwuemeka Nwosu', mode: 'Behaviour Therapy', therapist: 'Dr. Hassan', sessions: '3/12', status: 'Pending', date: '2026-06-03', tone: 'amber' },
  { id: 'TH-004', child: 'Zainab Ibrahim', mode: 'Social Skills Group', therapist: 'Dr. Olufemi', sessions: '5/8', status: 'Completed', date: '2026-05-30', tone: 'blue' },
  { id: 'TH-005', child: 'Bisi Lawal', mode: 'Play Therapy', therapist: 'Dr. Bola', sessions: '2/10', status: 'Missed', date: '2026-05-29', tone: 'red' },
];

const MEDS = [
  { id: 'RX-CAP-401', child: 'Tobi Adebayo', drug: 'Methylphenidate', dose: '10mg', freq: 'BD', compliance: '92%', side: 'None', status: 'Active', tone: 'green' },
  { id: 'RX-CAP-402', child: 'Kenechi Obi', drug: 'Atomoxetine', dose: '25mg', freq: 'OD', compliance: '74%', side: 'Mild nausea', status: 'Review Due', tone: 'amber' },
  { id: 'RX-CAP-403', child: 'Bisi Lawal', drug: 'Methylphenidate', dose: '18mg', freq: 'BD', compliance: '60%', side: 'Insomnia', status: 'Side Effects', tone: 'red' },
  { id: 'RX-CAP-404', child: 'Chukwuemeka Nwosu', drug: 'Risperidone', dose: '0.5mg', freq: 'BD', compliance: '88%', side: 'None', status: 'Active', tone: 'green' },
  { id: 'RX-CAP-405', child: 'Zainab Ibrahim', drug: 'Melatonin', dose: '3mg', freq: 'Nocte', compliance: '95%', side: 'None', status: 'Pending Pharmacy', tone: 'blue' },
];

const FOLLOWUPS = [
  { id: 'FU-001', child: 'Tobi Adebayo', type: 'Medication review', date: '2026-06-15', status: 'Today', risk: 'Low', tone: 'green' },
  { id: 'FU-002', child: 'Kenechi Obi', type: 'ADHD follow-up', date: '2026-06-18', status: 'Upcoming', risk: 'Low', tone: 'blue' },
  { id: 'FU-003', child: 'Bisi Lawal', type: 'Missed appointment', date: '2026-05-30', status: 'Missed', risk: 'Medium', tone: 'red' },
  { id: 'FU-004', child: 'Chukwuemeka Nwosu', type: 'Risk review', date: '2026-06-15', status: 'Today', risk: 'High', tone: 'red' },
  { id: 'FU-005', child: 'Amaka Eze', type: 'Therapy review', date: '2026-05-28', status: 'Completed', risk: 'Medium', tone: 'blue' },
];

const INVOICES = [
  { id: 'INV-CAP-901', child: 'Tobi Adebayo', service: 'ADHD Assessment + Consultation', amount: 33000, nhia: 'Approved', status: 'Paid', tone: 'green' },
  { id: 'INV-CAP-902', child: 'Zainab Ibrahim', service: 'ADOS-2 + ABA Block (4)', amount: 105000, nhia: 'Pending', status: 'Pending', tone: 'amber' },
  { id: 'INV-CAP-903', child: 'Amaka Eze', service: 'WISC-V + School Report', amount: 35000, nhia: 'Approved', status: 'NHIA', tone: 'blue' },
  { id: 'INV-CAP-904', child: 'Chukwuemeka Nwosu', service: 'MDT + Inpatient Day', amount: 75000, nhia: '—', status: 'Outstanding', tone: 'red' },
  { id: 'INV-CAP-905', child: 'Tobi Adebayo', service: 'Play Therapy Session', amount: 15000, nhia: '—', status: 'Therapy', tone: 'purple' },
];

// ============================================================
// Generic helpers: TabsCards table view, NewForm dialog, Open dialog
// ============================================================
const SUMMARY_TONES = ['blue', 'teal', 'green', 'amber', 'purple', 'indigo', 'rose'] as const;
const normTone = (t: any): any => {
  const map: Record<string, string> = { sky: 'blue', orange: 'amber', red: 'rose', yellow: 'amber' };
  const v = map[t] || t;
  return (SUMMARY_TONES as readonly string[]).includes(v) ? v : 'blue';
};
const KpiGrid = ({ items }: { items: { l: string; v: string | number; i?: any; tone?: any }[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
    {items.map((s, i) => (
      <SummaryCard key={i} title={s.l} value={String(s.v)} icon={s.i || ClipboardList} tone={normTone(s.tone)} />
    ))}
  </div>
);

const FilterBar = ({ q, setQ, placeholder, right }: { q: string; setQ: (v: string) => void; placeholder: string; right?: ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
    {right}
  </div>
);

// Child search picker (reusable)
const ChildPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div>
    <Label>Search Child</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
      <SelectContent>{CHILDREN.map(c => <SelectItem key={c.id} value={c.name}>{c.name} · {c.id} · {c.age}y</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

// ============================================================
// 1. DASHBOARD
// ============================================================
export const CapDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'Register Child', i: Baby, p: 'registration' },
    { l: 'Start Assessment', i: ClipboardList, p: 'assessments' },
    { l: 'Autism Case', i: Puzzle, p: 'autism' },
    { l: 'ADHD Case', i: Sparkles, p: 'adhd' },
    { l: 'Risk Assessment', i: ShieldAlert, p: 'safeguarding' },
    { l: 'Family Session', i: UsersRound, p: 'family' },
    { l: 'School Report', i: School, p: 'school' },
    { l: 'Therapy Session', i: HeartHandshake, p: 'therapy' },
    { l: 'Medication Review', i: Pill, p: 'medications' },
    { l: 'Follow-Up', i: Repeat, p: 'followup' },
    { l: 'MDT Meeting', i: Network, p: 'mdt' },
    { l: 'New Invoice', i: CreditCard, p: 'billing' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<Baby className="h-5 w-5" />}
        title="Child & Adolescent Psychiatry Workspace"
        desc="Specialist workspace for child and adolescent psychiatric care — assessments, autism, ADHD, safeguarding, MDT, school services and family programs — integrated with EMR, Psychology, Pharmacy, Billing and NHIA."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/mdt?new=1`)}><Network className="h-4 w-4 mr-1" /> MDT Meeting</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'Registered Children', v: 187, i: Users, tone: 'blue' },
        { l: 'New Referrals', v: 14, i: Send, tone: 'purple' },
        { l: 'High-Risk Cases', v: 9, i: ShieldAlert, tone: 'red' },
        { l: 'Low-Risk Cases', v: 102, i: ShieldAlert, tone: 'green' },
        { l: 'Pending Assessments', v: 18, i: ClipboardList, tone: 'amber' },
        { l: 'Autism Cases', v: 42, i: Puzzle, tone: 'purple' },
      ]} />
      <KpiGrid items={[
        { l: 'ADHD Cases', v: 68, i: Sparkles, tone: 'amber' },
        { l: 'MDT Meetings', v: 6, i: Network, tone: 'blue' },
        { l: 'Therapy Sessions Today', v: 22, i: HeartHandshake, tone: 'green' },
        { l: 'Follow-Ups Due', v: 12, i: Repeat, tone: 'amber' },
        { l: 'Billing Pending', v: 8, i: CreditCard, tone: 'red' },
        { l: 'School Reports', v: 35, i: School, tone: 'teal' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Priority Cases</div>
          <div className="space-y-2">{RISKS.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{r.child}</div><div className="text-xs text-muted-foreground">{r.type} · {r.action}</div></div>
              <Chip label={r.level} t={r.tone} />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Sessions</div>
          <div className="space-y-2">{THERAPY.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{s.child}</div><div className="text-xs text-muted-foreground">{s.mode} · {s.therapist}</div></div>
              <Chip label={s.status} t={s.tone} />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            {quick.map(a => (
              <Button key={a.l} variant="outline" className="justify-start text-xs" onClick={() => nav(`${base}/${a.p}`)}>
                <a.i className="h-3.5 w-3.5 mr-1" /> {a.l}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============================================================
// Reusable workflow page builder
// ============================================================
type Col<T> = { key: string; header: string; render: (row: T) => ReactNode };
type WorkflowProps<T> = {
  shellTitle: string;
  icon: ReactNode;
  title: string;
  desc: string;
  ctaLabel: string;
  ctaIcon?: ReactNode;
  newDialog: (close: () => void, notify: (p: SuccessPayload) => void) => ReactNode;
  newOpenInitially?: boolean;
  kpis: { l: string; v: string | number; i?: any; tone?: any }[];
  tabs: { key: string; label: string; filter: (r: T) => boolean }[];
  rows: T[];
  columns: Col<T>[];
  rowActions: (row: T, notify: (p: SuccessPayload) => void) => ReactNode;
  searchFields: (row: T) => string;
};

function WorkflowPage<T extends { id: string }>(props: WorkflowProps<T>) {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState(props.tabs[0].key);
  const [q, setQ] = useState('');
  const [openNew, setOpenNew] = useState(!!props.newOpenInitially);

  // honour ?new=1 in URL on initial mount
  useMemo(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') setOpenNew(true);
  }, []);

  const active = props.tabs.find(t => t.key === tab)!;
  const filtered = props.rows
    .filter(active.filter)
    .filter(r => !q || props.searchFields(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell title={props.shellTitle}>
      <Section
        icon={props.icon} title={props.title} desc={props.desc}
        action={
          <>
            <Button onClick={() => setOpenNew(true)}>{props.ctaIcon || <FilePlus className="h-4 w-4 mr-1" />}{props.ctaLabel}</Button>
            <Button variant="outline" onClick={() => notify({ title: 'Export ready', message: `${props.shellTitle} list exported`, nextStep: 'Check your downloads folder for the CSV file.' })}><Download className="h-4 w-4 mr-1" /> Export</Button>
          </>
        }
      />
      <KpiGrid items={props.kpis} />
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <TabsList className="flex-wrap h-auto">
              {props.tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
            </TabsList>
          </div>
          <FilterBar q={q} setQ={setQ} placeholder={`Search ${props.shellTitle.toLowerCase()}…`} />
          <TabsContent value={tab} className="mt-0">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow>
                  {props.columns.map(c => <TableHead key={c.key}>{c.header}</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={props.columns.length + 1} className="text-center text-sm text-muted-foreground py-8">No records match this filter.</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id}>
                      {props.columns.map(c => <TableCell key={c.key}>{c.render(r)}</TableCell>)}
                      <TableCell className="text-right"><div className="flex justify-end gap-2">{props.rowActions(r, notify)}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        {props.newDialog(() => setOpenNew(false), notify)}
      </Dialog>
      {node}
    </Shell>
  );
}

// Detail "Open" dialog
const DetailDialog = ({ open, onOpenChange, title, sections, footer }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; sections: { label: string; value: ReactNode }[]; footer?: ReactNode }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {sections.map((s, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/30 border">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-sm font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      {footer && <DialogFooter className="mt-4 flex-wrap gap-2">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);

// ============================================================
// 2. CHILD REGISTRATION
// ============================================================
export const ChildRegistration = () => {
  const [selected, setSelected] = useState<typeof CHILDREN[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Child Registration"
        icon={<Baby className="h-5 w-5" />}
        title="Child & Guardian Registration"
        desc="Register children with guardian/foster/caregiver, school info and presenting complaint — MPI-integrated."
        ctaLabel="Register Child"
        kpis={[
          { l: 'Total Registered', v: 187, i: Users, tone: 'blue' },
          { l: 'New Registrations', v: 14, i: Plus, tone: 'purple' },
          { l: 'High-Risk', v: 9, i: ShieldAlert, tone: 'red' },
          { l: 'Medium-Risk', v: 76, i: ShieldAlert, tone: 'amber' },
          { l: 'Low-Risk', v: 102, i: ShieldAlert, tone: 'green' },
          { l: 'Pending Review', v: 6, i: ClipboardList, tone: 'amber' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'new', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'high', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
          { key: 'med', label: 'Medium Risk', filter: (r: any) => r.risk === 'Medium' },
          { key: 'low', label: 'Low Risk', filter: (r: any) => r.risk === 'Low' },
          { key: 'pending', label: 'Pending Review', filter: (r: any) => r.status === 'Pending Review' },
        ]}
        rows={CHILDREN}
        searchFields={(r: any) => `${r.name} ${r.id} ${r.guardian} ${r.diagnosis}`}
        columns={[
          { key: 'id', header: 'Child ID', render: r => r.id },
          { key: 'name', header: 'Name', render: r => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.age}y · {r.sex}</div></div> },
          { key: 'guardian', header: 'Guardian', render: r => <div><div>{r.guardian}</div><div className="text-xs text-muted-foreground">{r.phone}</div></div> },
          { key: 'diag', header: 'Presenting / Diagnosis', render: r => r.diagnosis },
          { key: 'risk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Medium' ? 'amber' : 'green'} /> },
          { key: 'status', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'New' ? 'purple' : r.status === 'Pending Review' ? 'amber' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <RegisterChildForm close={close} notify={notify} />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Child Profile · ${selected.name}`}
          sections={[
            { label: 'Child ID', value: selected.id },
            { label: 'Age / Sex', value: `${selected.age}y · ${selected.sex}` },
            { label: 'Guardian', value: `${selected.guardian} (${selected.phone})` },
            { label: 'School', value: selected.school },
            { label: 'Diagnosis', value: selected.diagnosis },
            { label: 'Risk Level', value: <Chip label={selected.risk} t={selected.risk === 'High' ? 'red' : selected.risk === 'Medium' ? 'amber' : 'green'} /> },
            { label: 'Last Visit', value: selected.last },
            { label: 'Next Visit', value: selected.next },
            { label: 'Appointments', value: '3 upcoming · 12 completed' },
            { label: 'Assessments', value: '2 completed · 1 pending' },
            { label: 'Therapy History', value: 'Play Therapy 6/12' },
            { label: 'Safeguarding', value: 'No active flags' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Profile printed')}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </>
          }
        />
      )}
    </>
  );
};

const RegisterChildForm = ({ close, notify }: { close: () => void; notify: (p: SuccessPayload) => void }) => {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', age: '', sex: '', guardian: '', phone: '', school: '', source: '', complaint: '', risk: '', notes: '' });
  const submit = () => {
    if (!f.name || !f.age) return toast.error('Child name and age are required');
    close();
    notify({
      title: 'Child registered successfully',
      message: `${f.name} (${f.age}y) added to the CAP register.`,
      nextStep: 'Open the child profile or start an assessment.',
      actions: [
        { label: 'Open Child Profile', onClick: () => toast.success(`Opened profile for ${f.name}`) },
        { label: 'Register Another Child', onClick: () => { /* keep modal closed; user clicks Register again */ } },
        { label: 'Return to CAP Dashboard', onClick: () => nav(base) },
      ],
    });
  };
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Register Child</DialogTitle><DialogDescription>Add a new child to the Child & Adolescent Psychiatry register.</DialogDescription></DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div><Label>Child Name</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Age</Label><Input type="number" value={f.age} onChange={e => setF({ ...f, age: e.target.value })} /></div>
        <div><Label>Gender</Label>
          <Select value={f.sex} onValueChange={v => setF({ ...f, sex: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent></Select>
        </div>
        <div><Label>Guardian Name</Label><Input value={f.guardian} onChange={e => setF({ ...f, guardian: e.target.value })} /></div>
        <div><Label>Guardian Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>School Name</Label><Input value={f.school} onChange={e => setF({ ...f, school: e.target.value })} /></div>
        <div><Label>Referral Source</Label>
          <Select value={f.source} onValueChange={v => setF({ ...f, source: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Self / Parent', 'GP', 'School', 'Social Services', 'OPD Clinic', 'Hospital Ward'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Risk Level</Label>
          <Select value={f.risk} onValueChange={v => setF({ ...f, risk: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Low', 'Medium', 'High'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="sm:col-span-2"><Label>Presenting Complaint</Label><Textarea rows={2} value={f.complaint} onChange={e => setF({ ...f, complaint: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit}>Register Child</Button></DialogFooter>
    </DialogContent>
  );
};

// ============================================================
// 3. ASSESSMENT CENTER
// ============================================================
export const AssessmentCenter = () => {
  const [selected, setSelected] = useState<typeof ASSESSMENTS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Assessment Center"
        icon={<Brain className="h-5 w-5" />}
        title="Child Psychiatric Assessment Center"
        desc="Standardised assessment templates with scoring, recommendations and clinician sign-off — covering developmental, behavioural, autism, ADHD, IQ, learning, intellectual and risk assessments."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Pending', v: 8, i: ClipboardList, tone: 'amber' },
          { l: 'In Progress', v: 5, i: ClipboardList, tone: 'blue' },
          { l: 'Completed', v: 42, i: CheckCircle2, tone: 'green' },
          { l: 'High Risk', v: 6, i: ShieldAlert, tone: 'red' },
          { l: 'Awaiting Review', v: 4, i: Eye, tone: 'amber' },
          { l: 'Today', v: 3, i: CalendarDays, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'progress', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'completed', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'high', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
          { key: 'review', label: 'Awaiting Review', filter: (r: any) => r.status === 'Awaiting Review' },
        ]}
        rows={ASSESSMENTS}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.type} ${r.clinician}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'type', header: 'Assessment', render: r => r.type },
          { key: 'clinician', header: 'Clinician', render: r => r.clinician },
          { key: 'priority', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'Urgent' ? 'red' : 'sky'} /> },
          { key: 'risk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Medium' ? 'amber' : 'green'} /> },
          { key: 'status', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'blue' : r.status === 'Awaiting Review' ? 'orange' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Begin</Button>}
        newDialog={(close, notify) => <NewAssessmentForm close={close} notify={notify} />}
      />
      {selected && <AssessmentWorkspace row={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

const NewAssessmentForm = ({ close, notify }: { close: () => void; notify: (p: SuccessPayload) => void }) => {
  const [f, setF] = useState({ child: '', type: '', complaint: '', clinician: '', priority: 'Routine', notes: '' });
  const submit = () => {
    if (!f.child || !f.type) return toast.error('Child and assessment type are required');
    close();
    notify({ title: 'Assessment started', message: `${f.type} opened for ${f.child}.`, nextStep: 'Complete the assessment template and submit for clinician review.' });
  };
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Start New Assessment</DialogTitle></DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div className="sm:col-span-2"><ChildPicker value={f.child} onChange={v => setF({ ...f, child: v })} /></div>
        <div className="sm:col-span-2"><Label>Assessment Type</Label>
          <Select value={f.type} onValueChange={v => setF({ ...f, type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{ASSESS_TYPES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="sm:col-span-2"><Label>Presenting Complaint</Label><Textarea rows={2} value={f.complaint} onChange={e => setF({ ...f, complaint: e.target.value })} /></div>
        <div><Label>Assigned Clinician</Label><Input value={f.clinician} onChange={e => setF({ ...f, clinician: e.target.value })} placeholder="Dr. …" /></div>
        <div><Label>Priority</Label>
          <Select value={f.priority} onValueChange={v => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['Routine', 'Urgent'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit}>Start Assessment</Button></DialogFooter>
    </DialogContent>
  );
};

const AssessmentWorkspace = ({ row, onClose }: { row: typeof ASSESSMENTS[0]; onClose: () => void }) => {
  const [findings, setFindings] = useState('');
  const [scores, setScores] = useState('');
  const [recs, setRecs] = useState('');
  const { notify, node } = useSuccess();
  return (
    <>
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assessment Workspace · {row.id}</DialogTitle><DialogDescription>{row.type} · {row.child} · {row.clinician}</DialogDescription></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-lg bg-muted/30 border"><div className="text-xs text-muted-foreground">Child Summary</div><div className="text-sm font-semibold mt-1">{row.child}</div></div>
            <div className="p-3 rounded-lg bg-muted/30 border"><div className="text-xs text-muted-foreground">Guardian</div><div className="text-sm font-semibold mt-1">{CHILDREN.find(c => c.name === row.child)?.guardian || '—'}</div></div>
            <div className="sm:col-span-2"><Label>Assessment Template</Label><Input value={row.type} readOnly /></div>
            <div className="sm:col-span-2"><Label>Findings</Label><Textarea rows={4} value={findings} onChange={e => setFindings(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Scores</Label><Textarea rows={2} value={scores} onChange={e => setScores(e.target.value)} placeholder="e.g. Conners-3 Inattention: 78 (clinically significant)" /></div>
            <div className="sm:col-span-2"><Label>Recommendations</Label><Textarea rows={3} value={recs} onChange={e => setRecs(e.target.value)} /></div>
          </div>
          <DialogFooter className="mt-4 flex-wrap gap-2">
            <Button variant="outline" onClick={() => { onClose(); notify({ title: 'Draft saved', message: `Draft for ${row.id} saved.`, nextStep: 'Resume from the Assessment Center later.' }); }}>Save Draft</Button>
            <Button onClick={() => { onClose(); notify({ title: 'Assessment submitted', message: `${row.type} for ${row.child} sent for review.`, nextStep: 'Awaiting clinician sign-off and feedback to the family.' }); }}>Submit Assessment</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {node}
    </>
  );
};

// ============================================================
// 4. DEVELOPMENT TRACKING
// ============================================================
export const DevelopmentTracking = () => {
  const [selected, setSelected] = useState<typeof DEV_TRACKS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Development Tracking"
        icon={<TrendingUp className="h-5 w-5" />}
        title="Growth & Development Tracking"
        desc="Track gross/fine motor, language, social, cognitive and emotional milestones against age-appropriate norms."
        ctaLabel="Add Milestone"
        kpis={[
          { l: 'Children Tracked', v: 64, i: Users, tone: 'blue' },
          { l: 'Delayed Milestones', v: 9, i: AlertCircle, tone: 'red' },
          { l: 'Normal Progress', v: 48, i: CheckCircle2, tone: 'green' },
          { l: 'Follow-Up Due', v: 7, i: Repeat, tone: 'amber' },
          { l: 'Developmental Concerns', v: 12, i: ShieldAlert, tone: 'amber' },
          { l: 'New Tracking', v: 5, i: Plus, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'delayed', label: 'Delayed', filter: (r: any) => r.status === 'Delayed' },
          { key: 'normal', label: 'Normal', filter: (r: any) => r.status === 'Normal' },
          { key: 'fu', label: 'Follow-Up Due', filter: (r: any) => r.status === 'Follow-Up Due' },
          { key: 'new', label: 'New Tracking', filter: () => false },
        ]}
        rows={DEV_TRACKS}
        searchFields={(r: any) => `${r.child} ${r.domain} ${r.milestone}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => `${r.child} (${r.age}y)` },
          { key: 'domain', header: 'Domain', render: r => r.domain },
          { key: 'ms', header: 'Milestone', render: r => r.milestone },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
          { key: 'next', header: 'Next Review', render: r => r.next },
        ]}
        rowActions={(r, notify) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Report printed', message: `Development report for ${r.child} sent to printer.` })}><Printer className="h-3.5 w-3.5" /></Button>
          </>
        )}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Add / Update Milestone"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'domain', label: 'Domain', type: 'select', options: ['Gross Motor', 'Fine Motor', 'Language', 'Social', 'Cognitive', 'Emotional'] },
            { k: 'milestone', label: 'Milestone', type: 'text' },
            { k: 'status', label: 'Status', type: 'select', options: ['Normal', 'Delayed', 'Follow-Up Due'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Milestone updated"
          nextStep="Progress saved against the child's developmental record."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Development Tracking · ${selected.child}`}
          sections={[
            { label: 'Domain', value: selected.domain },
            { label: 'Milestone', value: selected.milestone },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Next Review', value: selected.next },
            { label: 'Age', value: `${selected.age}y` },
            { label: 'Last 3 Months', value: 'Stable progression noted on language and motor scoring.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// Reusable simple form for several "new" dialogs
type Field = { k: string; label: string; type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'childPicker'; options?: string[]; placeholder?: string };
const SimpleForm = ({ close, notify, title, fields, successTitle, nextStep, submitLabel = 'Submit' }: { close: () => void; notify: (p: SuccessPayload) => void; title: string; fields: Field[]; successTitle: string; nextStep?: string; submitLabel?: string }) => {
  const [f, setF] = useState<Record<string, string>>({});
  const submit = () => {
    const first = fields[0];
    if (!f[first.k]) return toast.error(`${first.label} is required`);
    close();
    notify({ title: successTitle, message: `${first.label}: ${f[first.k]}`, nextStep });
  };
  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {fields.map(fd => {
          const wide = ['textarea', 'childPicker'].includes(fd.type) || fields.length === 1;
          return (
            <div key={fd.k} className={wide ? 'sm:col-span-2' : ''}>
              {fd.type === 'childPicker' ? (
                <ChildPicker value={f[fd.k] || ''} onChange={v => setF({ ...f, [fd.k]: v })} />
              ) : (
                <>
                  <Label>{fd.label}</Label>
                  {fd.type === 'textarea' ? (
                    <Textarea rows={3} value={f[fd.k] || ''} onChange={e => setF({ ...f, [fd.k]: e.target.value })} placeholder={fd.placeholder} />
                  ) : fd.type === 'select' ? (
                    <Select value={f[fd.k] || ''} onValueChange={v => setF({ ...f, [fd.k]: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{fd.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input type={fd.type === 'date' ? 'date' : fd.type === 'number' ? 'number' : 'text'} value={f[fd.k] || ''} onChange={e => setF({ ...f, [fd.k]: e.target.value })} placeholder={fd.placeholder} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit}>{submitLabel}</Button></DialogFooter>
    </DialogContent>
  );
};

// ============================================================
// 5. AUTISM MANAGEMENT
// ============================================================
export const AutismCenter = () => {
  const [selected, setSelected] = useState<typeof AUTISM[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Autism Management"
        icon={<Puzzle className="h-5 w-5" />}
        title="Autism Spectrum Management Center"
        desc="Autism screening, severity classification, intervention plans, parent education and therapy progress monitoring."
        ctaLabel="New Autism Case"
        kpis={[
          { l: 'Total Autism Cases', v: 42, i: Puzzle, tone: 'purple' },
          { l: 'New Cases', v: 6, i: Plus, tone: 'blue' },
          { l: 'Active Cases', v: 28, i: HeartHandshake, tone: 'green' },
          { l: 'Pending Assessment', v: 5, i: ClipboardList, tone: 'amber' },
          { l: 'Therapy Ongoing', v: 18, i: HeartHandshake, tone: 'blue' },
          { l: 'Completed Reviews', v: 11, i: CheckCircle2, tone: 'green' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'new', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'active', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'pa', label: 'Pending Assessment', filter: (r: any) => r.status === 'Pending Assessment' },
          { key: 'to', label: 'Therapy Ongoing', filter: (r: any) => r.status === 'Therapy Ongoing' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={AUTISM}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.severity}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'sev', header: 'Severity', render: r => <Chip label={r.severity} t={r.severity === 'Level 3' ? 'red' : r.severity === 'Level 2' ? 'amber' : 'sky'} /> },
          { key: 'screen', header: 'Screening', render: r => r.screen },
          { key: 'th', header: 'Therapy', render: r => r.therapy },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
          { key: 'next', header: 'Next', render: r => r.next },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Autism Case"
          submitLabel="Create Case"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'source', label: 'Referral Source', type: 'select', options: ['Self / Parent', 'GP', 'School', 'OPD'] },
            { k: 'score', label: 'Screening Score', type: 'text' },
            { k: 'severity', label: 'Severity', type: 'select', options: ['Level 1', 'Level 2', 'Level 3'] },
            { k: 'concerns', label: 'Current Concerns', type: 'textarea' },
            { k: 'clinician', label: 'Assigned Clinician', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Autism case created"
          nextStep="Schedule the therapy plan and parent education sessions."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Autism Case · ${selected.child}`}
          sections={[
            { label: 'Case ID', value: selected.id },
            { label: 'Severity', value: <Chip label={selected.severity} t={selected.severity === 'Level 3' ? 'red' : selected.severity === 'Level 2' ? 'amber' : 'sky'} /> },
            { label: 'Screening Result', value: selected.screen },
            { label: 'Therapy Plan', value: selected.therapy },
            { label: 'Parent Education', value: 'Module 2 / 4 in progress' },
            { label: 'Progress Notes', value: 'Improvement in eye contact and joint attention' },
            { label: 'Follow-Up Schedule', value: selected.next },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 6. ADHD CENTER
// ============================================================
export const AdhdCenter = () => {
  const [selected, setSelected] = useState<typeof ADHD[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="ADHD Center"
        icon={<Sparkles className="h-5 w-5" />}
        title="ADHD Management Workspace"
        desc="Screening, medication tracking, behaviour plans, school monitoring and follow-ups."
        ctaLabel="New ADHD Case"
        kpis={[
          { l: 'Total ADHD Cases', v: 68, i: Sparkles, tone: 'amber' },
          { l: 'New Cases', v: 7, i: Plus, tone: 'blue' },
          { l: 'Active Cases', v: 45, i: HeartHandshake, tone: 'green' },
          { l: 'Medication Review Due', v: 6, i: Pill, tone: 'amber' },
          { l: 'Behaviour Plan Active', v: 22, i: ClipboardList, tone: 'blue' },
          { l: 'Follow-Up Due', v: 9, i: Repeat, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'new', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'active', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'med', label: 'Medication Review', filter: (r: any) => r.status === 'Medication Review' },
          { key: 'beh', label: 'Behaviour Plan', filter: (r: any) => r.plan === 'Behaviour Plan' },
          { key: 'fu', label: 'Follow-Up Due', filter: (r: any) => r.status === 'Follow-Up Due' },
        ]}
        rows={ADHD}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.presentation}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'pres', header: 'Presentation', render: r => r.presentation },
          { key: 'med', header: 'Medication', render: r => r.med },
          { key: 'plan', header: 'Plan', render: r => r.plan },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
          { key: 'next', header: 'Next', render: r => r.next },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New ADHD Case"
          submitLabel="Create Case"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'symptoms', label: 'Symptoms', type: 'textarea' },
            { k: 'school', label: 'School Concerns', type: 'textarea' },
            { k: 'parent', label: 'Parent Concerns', type: 'textarea' },
            { k: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
            { k: 'clinician', label: 'Assigned Clinician', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="ADHD case created"
          nextStep="Set up behaviour plan and schedule first medication review."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`ADHD Case · ${selected.child}`}
          sections={[
            { label: 'Case ID', value: selected.id },
            { label: 'Presentation', value: selected.presentation },
            { label: 'Behaviour Plan', value: selected.plan },
            { label: 'School Feedback', value: 'Concentration improving in afternoon sessions' },
            { label: 'Medication Tracking', value: selected.med },
            { label: 'Follow-Up', value: selected.next },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Progress', value: 'Moderate improvement vs baseline' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 7. RISK & SAFEGUARDING
// ============================================================
export const SafeguardingCenter = () => {
  const [esc, setEsc] = useState<typeof RISKS[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Safeguarding"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Child Risk & Safeguarding Center"
        desc="Track abuse, neglect, self-harm, violence, bullying and family risks with escalation actions and follow-up reviews."
        ctaLabel="New Risk Assessment"
        kpis={[
          { l: 'New Risk Cases', v: 5, i: Plus, tone: 'purple' },
          { l: 'High-Risk', v: 9, i: ShieldAlert, tone: 'red' },
          { l: 'Medium-Risk', v: 7, i: ShieldAlert, tone: 'amber' },
          { l: 'Low-Risk', v: 12, i: ShieldAlert, tone: 'green' },
          { l: 'Escalated', v: 4, i: AlertTriangle, tone: 'amber' },
          { l: 'Reviews Due', v: 6, i: Repeat, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'high', label: 'High Risk', filter: (r: any) => r.level === 'High' },
          { key: 'med', label: 'Medium Risk', filter: (r: any) => r.level === 'Medium' },
          { key: 'low', label: 'Low Risk', filter: (r: any) => r.level === 'Low' },
          { key: 'esc', label: 'Escalated', filter: (r: any) => r.status === 'Escalated' },
          { key: 'rd', label: 'Reviews Due', filter: (r: any) => r.status === 'Review Due' },
        ]}
        rows={RISKS}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'Case', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'type', header: 'Risk Type', render: r => r.type },
          { key: 'level', header: 'Level', render: r => <Chip label={r.level} t={r.tone} /> },
          { key: 'date', header: 'Flagged', render: r => r.date },
          { key: 'action', header: 'Action', render: r => r.action },
          { key: 'status', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Escalated' ? 'red' : r.status === 'Review Due' ? 'amber' : 'green'} /> },
        ]}
        rowActions={(r) => (
          <>
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Case opened', message: `${r.child} · ${r.type}` })}><Eye className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => setEsc(r)}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
          </>
        )}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Risk Assessment"
          submitLabel="Save Assessment"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'type', label: 'Risk Type', type: 'select', options: RISK_TYPES },
            { k: 'level', label: 'Risk Level', type: 'select', options: ['Low', 'Medium', 'High'] },
            { k: 'obs', label: 'Observation', type: 'textarea' },
            { k: 'action', label: 'Immediate Action', type: 'textarea' },
            { k: 'officer', label: 'Assigned Officer', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Risk assessment recorded"
          nextStep="Notify safeguarding lead and review within 24 hours."
        />}
      />
      {esc && (
        <Dialog open onOpenChange={(v) => !v && setEsc(null)}>
          <EscalateForm row={esc} close={() => setEsc(null)} notify={notify} />
        </Dialog>
      )}
      {node}
    </>
  );
};

const EscalateForm = ({ row, close, notify }: { row: typeof RISKS[0]; close: () => void; notify: (p: SuccessPayload) => void }) => {
  const [f, setF] = useState({ reason: '', to: '', urgency: '', notes: '' });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Escalate Safeguarding Case</DialogTitle><DialogDescription>{row.id} · {row.child} · {row.type}</DialogDescription></DialogHeader>
      <div className="space-y-3 mt-2">
        <div><Label>Escalation Reason</Label><Textarea rows={2} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
        <div><Label>Escalate To</Label>
          <Select value={f.to} onValueChange={v => setF({ ...f, to: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Safeguarding Lead', 'Social Services', 'Child Protection Officer', 'Police', 'MDT'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Urgency</Label>
          <Select value={f.urgency} onValueChange={v => setF({ ...f, urgency: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Immediate', 'Within 24h', 'Within 72h'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button onClick={() => { close(); notify({ title: 'Safeguarding case escalated successfully', message: `${row.child} escalated to ${f.to || 'Safeguarding Lead'}.`, nextStep: 'Receiving officer will acknowledge within the urgency window.' }); }}>Submit Escalation</Button>
      </DialogFooter>
    </DialogContent>
  );
};

// ============================================================
// 8. FAMILY COUNSELLING
// ============================================================
export const FamilyCounselling = () => {
  const [selected, setSelected] = useState<typeof FAMILY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Family & Parents"
        icon={<UsersRound className="h-5 w-5" />}
        title="Family & Parent Counselling"
        desc="Parent counselling, family therapy, parenting skills programs and family case conferences."
        ctaLabel="New Family Session"
        kpis={[
          { l: 'Sessions Today', v: 4, i: CalendarDays, tone: 'blue' },
          { l: 'Pending Sessions', v: 6, i: ClipboardList, tone: 'amber' },
          { l: 'Completed Sessions', v: 22, i: CheckCircle2, tone: 'green' },
          { l: 'Parent Counselling', v: 14, i: UsersRound, tone: 'purple' },
          { l: 'Family Therapy Cases', v: 9, i: HeartHandshake, tone: 'blue' },
          { l: 'No-show Rate', v: '8%', i: AlertCircle, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'completed', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'pc', label: 'Parent Counselling', filter: (r: any) => r.type === 'Parent Counselling' },
          { key: 'ft', label: 'Family Therapy', filter: (r: any) => r.type === 'Family Therapy' },
        ]}
        rows={FAMILY}
        searchFields={(r: any) => `${r.family} ${r.child} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'family', header: 'Family', render: r => r.family },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'type', header: 'Type', render: r => r.type },
          { key: 'date', header: 'Date', render: r => r.date },
          { key: 'clin', header: 'Clinician', render: r => r.clinician },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Family Session"
          submitLabel="Schedule Session"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'parent', label: 'Parent / Guardian', type: 'text' },
            { k: 'type', label: 'Session Type', type: 'select', options: ['Parent Counselling', 'Family Therapy', 'Behaviour Coaching', 'Psycho-education'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'clinician', label: 'Assigned Clinician', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Family session scheduled"
          nextStep="Family will receive an SMS reminder 24h before the session."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Family Session · ${selected.family}`}
          sections={[
            { label: 'Child', value: selected.child },
            { label: 'Type', value: selected.type },
            { label: 'Date', value: selected.date },
            { label: 'Clinician', value: selected.clinician },
            { label: 'Session Notes', value: 'Family engaged well; parents agreed to consistency plan.' },
            { label: 'Parent Concerns', value: 'Behaviour at home; sibling rivalry.' },
            { label: 'Recommendations', value: 'Continue parent skills modules; reinforce reward chart.' },
            { label: 'Follow-Up Plan', value: 'Review in 2 weeks; consider joint sibling session.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 9. SCHOOL SERVICES
// ============================================================
export const SchoolServices = () => {
  const [selected, setSelected] = useState<typeof SCHOOLS[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="School Services"
        icon={<School className="h-5 w-5" />}
        title="School Intervention & Reports"
        desc="School reports, academic assessments, behaviour reports and educational recommendations."
        ctaLabel="New Report Service"
        kpis={[
          { l: 'School Reports', v: 35, i: ScrollText, tone: 'blue' },
          { l: 'Pending Reports', v: 7, i: ClipboardList, tone: 'amber' },
          { l: 'Acknowledged', v: 18, i: CheckCircle2, tone: 'green' },
          { l: 'Completed', v: 10, i: CheckCircle2, tone: 'blue' },
          { l: 'School Referrals', v: 14, i: Send, tone: 'purple' },
          { l: 'Schools Engaged', v: 22, i: School, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ack', label: 'Acknowledged', filter: (r: any) => r.status === 'Acknowledged' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'ref', label: 'School Referrals', filter: (r: any) => r.type === 'School Referral' },
        ]}
        rows={SCHOOLS}
        searchFields={(r: any) => `${r.child} ${r.school} ${r.id}`}
        columns={[
          { key: 'id', header: 'Report ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'school', header: 'School', render: r => r.school },
          { key: 'type', header: 'Type', render: r => r.type },
          { key: 'sent', header: 'Sent', render: r => r.sent },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New School Report Service"
          submitLabel="Create Report"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'school', label: 'School Name', type: 'text' },
            { k: 'type', label: 'Report Type', type: 'select', options: ['ADHD Support', 'Learning Plan', 'Quarterly Progress', 'Behaviour Report', 'School Referral'] },
            { k: 'concern', label: 'Concern', type: 'textarea' },
            { k: 'rec', label: 'Recommendation', type: 'textarea' },
            { k: 'clinician', label: 'Clinician', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="School report created"
          nextStep="Print or email to the school liaison."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`School Report · ${selected.id}`}
          sections={[
            { label: 'Child', value: selected.child },
            { label: 'School', value: selected.school },
            { label: 'Type', value: selected.type },
            { label: 'Sent', value: selected.sent },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Clinical Recommendation', value: 'Maintain medication regimen; structured break times.' },
            { label: 'Educational Recommendation', value: 'Front-row seating; visual schedules; small group support.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Marked acknowledged', message: `${selected.id} acknowledged by school.` })}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Acknowledged</Button>
              <Button variant="outline" onClick={() => notify({ title: 'Sent to printer', message: `${selected.id} printed.` })}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button variant="outline" onClick={() => notify({ title: 'PDF downloaded', message: `${selected.id}.pdf` })}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </>
          }
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 10. MDT COLLABORATION
// ============================================================
export const MdtCollaboration = () => {
  const [selected, setSelected] = useState<typeof MDT[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="MDT Collaboration"
        icon={<Network className="h-5 w-5" />}
        title="Multi-Disciplinary Team (MDT) Center"
        desc="Collaboration between Child Psychiatrist, Psychologist, Social Worker, OT, Speech Therapist and Nurse — with case conferences and action plans."
        ctaLabel="Schedule MDT"
        kpis={[
          { l: 'Upcoming MDT', v: 6, i: CalendarDays, tone: 'blue' },
          { l: 'Completed MDT', v: 18, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Action Plans', v: 4, i: ClipboardList, tone: 'amber' },
          { l: 'High-Risk MDT', v: 3, i: ShieldAlert, tone: 'red' },
          { l: 'Participants Avg', v: 5, i: Users, tone: 'blue' },
          { l: 'MDT This Week', v: 2, i: CalendarDays, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'up', label: 'Upcoming', filter: (r: any) => r.status === 'Upcoming' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'pa', label: 'Pending Actions', filter: (r: any) => r.status === 'Pending Actions' },
          { key: 'hr', label: 'High Risk', filter: (r: any) => r.tone === 'red' },
        ]}
        rows={MDT}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.purpose}`}
        columns={[
          { key: 'id', header: 'MDT ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'date', header: 'Date', render: r => r.date },
          { key: 'members', header: 'Members', render: r => <span className="text-xs">{r.members}</span> },
          { key: 'purpose', header: 'Purpose', render: r => r.purpose },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule MDT Meeting"
          submitLabel="Schedule"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'date', label: 'Meeting Date', type: 'date' },
            { k: 'participants', label: 'Participants', type: 'text', placeholder: 'Psychiatrist, Psychologist, Social Worker…' },
            { k: 'purpose', label: 'Purpose', type: 'text' },
            { k: 'summary', label: 'Case Summary', type: 'textarea' },
            { k: 'agenda', label: 'Agenda', type: 'textarea' },
          ]}
          successTitle="MDT meeting scheduled"
          nextStep="Invitations sent to all participants."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`MDT Meeting · ${selected.id}`}
          sections={[
            { label: 'Child', value: selected.child },
            { label: 'Date', value: selected.date },
            { label: 'Participants', value: selected.members },
            { label: 'Purpose', value: selected.purpose },
            { label: 'Meeting Notes', value: 'Reviewed risk factors, current therapy and school plan.' },
            { label: 'Case Discussion', value: 'Multi-disciplinary input on safeguarding and medication.' },
            { label: 'Action Plan', value: '1) Continue therapy 2) Add family session 3) School liaison meeting' },
            { label: 'Follow-Up Tasks', value: 'Social Worker home visit within 7 days' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 11. THERAPY MANAGEMENT
// ============================================================
export const TherapyManagement = () => {
  const [selected, setSelected] = useState<typeof THERAPY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Therapy Management"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Child Therapy Management"
        desc="Play, behaviour, CBT, family, group and social skills therapy — sessions, attendance and outcomes."
        ctaLabel="New Therapy"
        kpis={[
          { l: 'Sessions Today', v: 22, i: CalendarDays, tone: 'blue' },
          { l: 'Pending Sessions', v: 8, i: ClipboardList, tone: 'amber' },
          { l: 'Active Plans', v: 38, i: HeartHandshake, tone: 'green' },
          { l: 'Completed Sessions', v: 124, i: CheckCircle2, tone: 'blue' },
          { l: 'Missed Sessions', v: 5, i: AlertCircle, tone: 'red' },
          { l: 'Avg Outcome', v: '84%', i: TrendingUp, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'active', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'missed', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
        ]}
        rows={THERAPY}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.mode} ${r.therapist}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'mode', header: 'Mode', render: r => r.mode },
          { key: 'th', header: 'Therapist', render: r => r.therapist },
          { key: 'sess', header: 'Sessions', render: r => r.sessions },
          { key: 'date', header: 'Date', render: r => r.date },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Therapy Session"
          submitLabel="Schedule Session"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'type', label: 'Therapy Type', type: 'select', options: ['Play Therapy', 'CBT (child-adapted)', 'Behaviour Therapy', 'Family Therapy', 'Social Skills Group', 'Art Therapy'] },
            { k: 'therapist', label: 'Therapist', type: 'text' },
            { k: 'date', label: 'Session Date', type: 'date' },
            { k: 'goals', label: 'Session Goals', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Therapy session created"
          nextStep="Family reminder will be sent 24h before the session."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Therapy · ${selected.child}`}
          sections={[
            { label: 'Mode', value: selected.mode },
            { label: 'Therapist', value: selected.therapist },
            { label: 'Sessions', value: selected.sessions },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Therapy Goals', value: 'Improve emotional regulation; increase peer interaction.' },
            { label: 'Session Notes', value: 'Engaged in role-play; identified two coping strategies.' },
            { label: 'Progress', value: 'Improving — meeting 2/3 short-term goals.' },
            { label: 'Next Appointment', value: selected.date },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 12. MEDICATIONS
// ============================================================
export const MedicationCenter = () => {
  const [selected, setSelected] = useState<typeof MEDS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Medication & Pharmacy"
        icon={<Pill className="h-5 w-5" />}
        title="Child Medication Management"
        desc="Current/previous medications, side effects and compliance — integrated with the Pharmacy module."
        ctaLabel="New Prescription"
        kpis={[
          { l: 'Active Medications', v: 54, i: Pill, tone: 'green' },
          { l: 'New Prescriptions', v: 6, i: Plus, tone: 'blue' },
          { l: 'Medication Review Due', v: 5, i: Repeat, tone: 'amber' },
          { l: 'Side Effect Reports', v: 3, i: AlertCircle, tone: 'red' },
          { l: 'Pharmacy Pending', v: 4, i: ClipboardList, tone: 'blue' },
          { l: 'Compliance Avg', v: '85%', i: TrendingUp, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'active', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'rev', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
          { key: 'pp', label: 'Pending Pharmacy', filter: (r: any) => r.status === 'Pending Pharmacy' },
          { key: 'se', label: 'Side Effects', filter: (r: any) => r.status === 'Side Effects' },
        ]}
        rows={MEDS}
        searchFields={(r: any) => `${r.child} ${r.drug} ${r.id}`}
        columns={[
          { key: 'id', header: 'Rx ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'drug', header: 'Drug', render: r => r.drug },
          { key: 'dose', header: 'Dose', render: r => `${r.dose} · ${r.freq}` },
          { key: 'comp', header: 'Compliance', render: r => r.compliance },
          { key: 'side', header: 'Side Effects', render: r => r.side },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Review</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Prescription"
          submitLabel="Send to Pharmacy"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'drug', label: 'Drug', type: 'text' },
            { k: 'dose', label: 'Dose', type: 'text', placeholder: 'e.g. 10mg' },
            { k: 'freq', label: 'Frequency', type: 'select', options: ['OD', 'BD', 'TDS', 'QDS', 'Nocte', 'PRN'] },
            { k: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 30 days' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Prescription sent"
          nextStep="Pharmacy will dispense and notify the family."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Medication Review · ${selected.child}`}
          sections={[
            { label: 'Current Medication', value: `${selected.drug} ${selected.dose} ${selected.freq}` },
            { label: 'Response', value: 'Moderate clinical improvement noted' },
            { label: 'Side Effects', value: selected.side },
            { label: 'Compliance', value: selected.compliance },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Recommendation', value: 'Continue current dose; review in 4 weeks' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 13. FOLLOW-UP DASHBOARD
// ============================================================
export const FollowUpDashboard = () => {
  const [selected, setSelected] = useState<typeof FOLLOWUPS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Follow-Up"
        icon={<Repeat className="h-5 w-5" />}
        title="Follow-Up Dashboard"
        desc="Upcoming reviews, missed appointments and school/family/therapy follow-ups."
        ctaLabel="Schedule Follow-Up"
        kpis={[
          { l: 'Follow-Ups Today', v: 5, i: CalendarDays, tone: 'blue' },
          { l: 'Upcoming', v: 14, i: CalendarDays, tone: 'blue' },
          { l: 'Missed', v: 4, i: AlertCircle, tone: 'red' },
          { l: 'Completed', v: 38, i: CheckCircle2, tone: 'green' },
          { l: 'High-Risk Follow-Ups', v: 3, i: ShieldAlert, tone: 'amber' },
          { l: 'Avg Attendance', v: '88%', i: TrendingUp, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'today', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'up', label: 'Upcoming', filter: (r: any) => r.status === 'Upcoming' },
          { key: 'missed', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'hr', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
        ]}
        rows={FOLLOWUPS}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'type', header: 'Type', render: r => r.type },
          { key: 'date', header: 'Date', render: r => r.date },
          { key: 'risk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Medium' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule Follow-Up"
          submitLabel="Schedule"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Medication review', 'ADHD follow-up', 'Therapy review', 'Risk review', 'School review'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'clinician', label: 'Clinician', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Follow-up scheduled"
          nextStep="Reminder will be sent to the family 24h before the visit."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Follow-Up · ${selected.id}`}
          sections={[
            { label: 'Child', value: selected.child },
            { label: 'Type', value: selected.type },
            { label: 'Date', value: selected.date },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Risk', value: <Chip label={selected.risk} t={selected.risk === 'High' ? 'red' : selected.risk === 'Medium' ? 'amber' : 'green'} /> },
            { label: 'Previous Notes', value: 'Last review: stable on current plan.' },
            { label: 'Follow-Up Reason', value: selected.type },
            { label: 'Action Plan', value: 'Confirm attendance; update medication chart.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 14. BILLING & NHIA
// ============================================================
export const CapBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Billing & NHIA Integration"
        desc="Consultation, assessment, therapy, family therapy, school assessment and developmental assessment billing with NHIA claims."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: 124, i: CreditCard, tone: 'blue' },
          { l: 'Paid Invoices', v: 86, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Invoices', v: 22, i: ClipboardList, tone: 'amber' },
          { l: 'NHIA Invoices', v: 41, i: ShieldAlert, tone: 'blue' },
          { l: 'Outstanding', v: 16, i: AlertCircle, tone: 'red' },
          { l: 'Therapy Bills', v: 33, i: HeartHandshake, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'paid', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nhia', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' },
          { key: 'out', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'th', label: 'Therapy', filter: (r: any) => r.status === 'Therapy' },
        ]}
        rows={INVOICES}
        searchFields={(r: any) => `${r.child} ${r.id} ${r.service}`}
        columns={[
          { key: 'id', header: 'Invoice', render: r => r.id },
          { key: 'child', header: 'Child', render: r => r.child },
          { key: 'service', header: 'Service', render: r => r.service },
          { key: 'amt', header: 'Amount', render: r => formatCurrency(r.amount) },
          { key: 'nhia', header: 'NHIA', render: r => r.nhia },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.tone} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Invoice"
          submitLabel="Create Invoice"
          fields={[
            { k: 'child', label: 'Child', type: 'childPicker' },
            { k: 'service', label: 'Service Type', type: 'select', options: ['Consultation', 'Assessment', 'Therapy', 'Family Therapy', 'School Assessment', 'Developmental Assessment'] },
            { k: 'amount', label: 'Amount (₦)', type: 'number' },
            { k: 'nhia', label: 'NHIA Status', type: 'select', options: ['Approved', 'Pending', 'Rejected', '—'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Invoice created"
          nextStep="Invoice queued; print or send to cashier for payment."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Invoice · ${selected.id}`}
          sections={[
            { label: 'Child', value: selected.child },
            { label: 'Service', value: selected.service },
            { label: 'Amount', value: formatCurrency(selected.amount) },
            { label: 'NHIA', value: selected.nhia },
            { label: 'Status', value: <Chip label={selected.status} t={selected.tone} /> },
            { label: 'Issued', value: '2026-06-02' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Invoice printed', message: selected.id })}><Printer className="h-4 w-4 mr-1" /> Print Invoice</Button>
              <Button variant="outline" onClick={() => notify({ title: 'PDF downloaded', message: `${selected.id}.pdf` })}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Invoice marked paid', message: `${selected.id} marked as paid.`, nextStep: 'Receipt generated and posted to ledger.' }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid</Button>
            </>
          }
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 15. REPORTING CENTER
// ============================================================
export const ReportingCenter = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '7d', notes: '' });
  const TYPES = ['Child Psychiatry Report', 'Autism Report', 'ADHD Report', 'School Report', 'Safeguarding Report', 'MDT Report', 'Therapy Report', 'Billing Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="CAP Reporting Center"
        desc="Generate clinical, autism, ADHD, school, safeguarding, MDT, therapy and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 142, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 6, i: ClipboardList, tone: 'amber' },
        { l: 'Autism Reports', v: 28, i: Puzzle, tone: 'purple' },
        { l: 'ADHD Reports', v: 34, i: Sparkles, tone: 'amber' },
        { l: 'Safeguarding Reports', v: 12, i: ShieldAlert, tone: 'red' },
        { l: 'School Reports', v: 22, i: School, tone: 'teal' },
      ]} />
      <Card>
        <div className="text-sm font-semibold mb-3">Report Templates</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TYPES.map(t => (
            <div key={t} className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground mb-2">PDF · CSV · Print</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreview({ type: t, range: 'Last 30d' })}><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Button>
                <Button size="sm" onClick={() => { setF({ ...f, type: t }); setOpen(true); }}><FilePlus className="h-3.5 w-3.5 mr-1" /> Generate</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Generate New Report</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <div className="sm:col-span-2"><Label>Report Type</Label>
              <Select value={f.type} onValueChange={v => setF({ ...f, type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TYPES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Date Range</Label>
              <Select value={f.range} onValueChange={v => setF({ ...f, range: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last quarter'], ['ytd', 'Year-to-date']].map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!f.type) return toast.error('Select a report type');
              setOpen(false);
              setPreview({ type: f.type, range: f.range });
              notify({ title: 'Report generated', message: `${f.type} ready for preview.`, nextStep: 'Print, download as PDF or export CSV.' });
            }}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <Dialog open onOpenChange={v => !v && setPreview(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · CAP Department · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Total Children</div><div className="font-semibold text-lg">187</div></div>
                  <div><div className="text-xs text-muted-foreground">Assessments</div><div className="font-semibold text-lg">68</div></div>
                  <div><div className="text-xs text-muted-foreground">Therapy Sessions</div><div className="font-semibold text-lg">146</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(3850000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>ADHD remains the most common new presentation (38%)</li>
                  <li>Autism therapy compliance improved to 84% this period</li>
                  <li>4 active safeguarding escalations under review</li>
                </ul>
              </Card>
            </div>
            <DialogFooter className="mt-4 flex-wrap gap-2">
              <Button variant="outline" onClick={() => notify({ title: 'Report printed', message: preview.type })}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button variant="outline" onClick={() => notify({ title: 'PDF downloaded', message: `${preview.type}.pdf` })}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
              <Button variant="outline" onClick={() => notify({ title: 'CSV exported', message: `${preview.type}.csv` })}><FileText className="h-4 w-4 mr-1" /> Export CSV</Button>
              <Button onClick={() => setPreview(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {node}
    </Shell>
  );
};

// ============================================================
// 16. COMMUNICATION CENTER
// ============================================================
const THREADS = [
  { id: 'CMS-001', dept: 'CAP ↔ Doctor', with: 'Dr. Bola · Psychiatry', child: 'Tobi Adebayo', preview: 'Medication titration approved — please update chart.', unread: 2, urgent: false, time: '09:14' },
  { id: 'CMS-002', dept: 'CAP ↔ Psychology', with: 'Dr. Aisha · Psychology', child: 'Zainab Ibrahim', preview: 'ADOS-2 result attached, please review for MDT.', unread: 1, urgent: false, time: '08:42' },
  { id: 'CMS-003', dept: 'CAP ↔ Social Work', with: 'Ms. Adekola · Social Work', child: 'Yusuf Bello', preview: 'URGENT: home visit completed, child protection plan.', unread: 4, urgent: true, time: '07:58' },
  { id: 'CMS-004', dept: 'CAP ↔ Nurse', with: 'Nurse Olamide · Paediatric Nursing', child: 'Chukwuemeka Nwosu', preview: 'Patient settled overnight; observations stable.', unread: 0, urgent: false, time: 'Yesterday' },
  { id: 'CMS-005', dept: 'CAP ↔ School Liaison', with: "St. Anne's College", child: 'Amaka Eze', preview: 'School plan acknowledged; accommodations in place.', unread: 0, urgent: false, time: 'Yesterday' },
  { id: 'CMS-006', dept: 'CAP ↔ Pharmacy', with: 'Pharmacy Desk 2', child: 'Bisi Lawal', preview: 'Rx ready for collection — guardian notified.', unread: 1, urgent: false, time: '2d ago' },
];

export const CommsCenter = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'psy', l: 'Psychology' }, { k: 'nur', l: 'Nurse' }, { k: 'sw', l: 'Social Work' }, { k: 'sch', l: 'School' }, { k: 'phm', l: 'Pharmacy' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    return t.dept.toLowerCase().includes({ doc: 'doctor', psy: 'psychology', nur: 'nurse', sw: 'social', sch: 'school', phm: 'pharmacy' }[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="CAP Communication Center"
        desc="Secure internal messaging with Doctor, Psychology, Nurse, Social Work, School Liaison and Pharmacy — patient-linked threads, attachments and urgent alerts."
        action={
          <>
            <Button onClick={() => notify({ title: 'New conversation', message: 'Pick a recipient to start.' })}><Plus className="h-4 w-4 mr-1" /> New Conversation</Button>
            <Button variant="outline" onClick={() => notify({ title: 'Notifications updated', message: 'Notification settings saved.' })}><Bell className="h-4 w-4 mr-1" /> Notifications</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'Inbox Threads', v: THREADS.length, i: MessageSquare, tone: 'blue' },
        { l: 'Unread', v: THREADS.filter(t => t.unread > 0).length, i: Bell, tone: 'amber' },
        { l: 'Urgent', v: THREADS.filter(t => t.urgent).length, i: AlertTriangle, tone: 'red' },
        { l: 'Patient-linked', v: THREADS.length, i: Baby, tone: 'purple' },
        { l: 'Attachments', v: 12, i: Paperclip, tone: 'blue' },
        { l: 'Active Staff', v: 18, i: Users, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-0 overflow-hidden">
          <div className="p-4 border-b">
            <FilterBar q="" setQ={() => { }} placeholder="Search staff or threads…" />
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap h-auto">{TABS.map(t => <TabsTrigger key={t.k} value={t.k} className="text-xs">{t.l}</TabsTrigger>)}</TabsList>
            </Tabs>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.map(t => (
              <button key={t.id} onClick={() => setActive(t)} className={`w-full text-left p-3 border-b hover:bg-muted/40 ${active.id === t.id ? 'bg-muted/60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{t.with}</div>
                  <div className="text-[10px] text-muted-foreground">{t.time}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.dept} · {t.child}</div>
                <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{t.preview}</div>
                <div className="flex gap-1 mt-1">{t.urgent && <Chip label="Urgent" t="red" />}{t.unread > 0 && <Chip label={`${t.unread} new`} t="blue" />}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{active.with}</div>
              <div className="text-xs text-muted-foreground">{active.dept} · Child: {active.child}</div>
            </div>
            <div className="flex gap-2">
              {active.urgent && <Chip label="Urgent" t="red" />}
              <Button size="sm" variant="outline" onClick={() => notify({ title: 'Thread archived', message: active.with })}>Archive</Button>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-[50vh] overflow-y-auto bg-muted/20">
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>{active.preview}</div></div>
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — adding to the plan for tomorrow's review.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest school report.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'school-report.pdf' })}><Paperclip className="h-4 w-4" /></Button>
            <Input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a message…" onKeyDown={e => e.key === 'Enter' && send()} />
            <Button onClick={send}><Send className="h-4 w-4 mr-1" /> Send</Button>
          </div>
        </Card>
      </div>
      {node}
    </Shell>
  );
};

// ============================================================
// 17. RESEARCH (kept lightweight)
// ============================================================
export const ResearchStatistics = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Child Psychiatry Analytics"
      desc="Autism, ADHD, developmental and behaviour disorder statistics, therapy outcomes, age/gender distributions and research analytics." />
    <KpiGrid items={[
      { l: 'Autism Cases', v: 42, i: Puzzle, tone: 'purple' },
      { l: 'ADHD Cases', v: 68, i: Sparkles, tone: 'amber' },
      { l: 'Learning Disorders', v: 31, i: BookOpen, tone: 'blue' },
      { l: 'Behaviour Disorders', v: 24, i: ClipboardList, tone: 'amber' },
      { l: 'School Referrals (Yr)', v: 129, i: School, tone: 'blue' },
      { l: 'Research Enrolment', v: 23, i: GraduationCap, tone: 'purple' },
    ]} />
    <Card>
      <div className="text-sm font-semibold mb-3">Age & Gender Distribution</div>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg bg-muted/30">0–5y: 38 · 6–11y: 76 · 12–17y: 73</div>
        <div className="p-3 rounded-lg bg-muted/30">Male: 112 · Female: 75</div>
      </div>
    </Card>
  </Shell>
);

// ============================================================
// 18. ALERTS / 19. MOBILE / 20. CONFIG (kept minimal)
// ============================================================
export const CapAlerts = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical CAP Alerts" desc="Self-harm, abuse, missed medication, missed sessions and high-risk escalations." />
      <Card>
        <div className="space-y-2">
          {RISKS.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <div className="text-sm font-semibold">{r.child} — {r.type}</div>
                <div className="text-xs text-muted-foreground">Flagged {r.date} · {r.action}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip label={r.level} t={r.tone} />
                <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${r.child} · ${r.type}` })}>Acknowledge</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {node}
    </Shell>
  );
};

export const CapMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for child assessments, development tracking, school reports, family sessions and MDT reviews across desktop, tablet, mobile and PWA." />
    <div className="grid md:grid-cols-4 gap-3">
      {['Desktop', 'Tablet', 'Mobile', 'PWA'].map(d => (
        <Card key={d} className="text-center">
          <div className="text-xs text-muted-foreground">Layout</div>
          <div className="text-2xl font-display font-bold mt-1">{d}</div>
          <Chip label="Responsive" t="green" />
        </Card>
      ))}
    </div>
  </Shell>
);

export const CapConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="CAP Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · CAP Configuration"
        desc="Configure CAP clinics, assessment templates, autism/ADHD tools, risk templates, child protection forms, school templates and outcome measurement tools." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Child Psychiatry Clinics', 'Adolescent Psychiatry Clinics', 'Developmental Assessment Templates',
          'Autism Screening Tools', 'ADHD Assessment Tools', 'Risk Assessment Templates',
          'Child Protection Forms', 'School Report Templates', 'Parent Counselling Templates',
          'Child Therapy Templates', 'Outcome Measurement Tools', 'MDT Templates',
        ].map(c => (
          <Card key={c} className="flex items-center justify-between">
            <div className="text-sm font-semibold">{c}</div>
            <Button size="sm" variant="outline" onClick={() => notify({ title: `${c} opened`, message: 'Template manager loaded.' })}><BookOpen className="h-3.5 w-3.5 mr-1" /> Manage</Button>
          </Card>
        ))}
      </div>
      {node}
    </Shell>
  );
};
