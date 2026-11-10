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
  LayoutDashboard, ClipboardList, FilePlus, CalendarDays, Users, HeartHandshake,
  Activity, BookOpen, ScrollText, BarChart3, CreditCard,
  MessageSquare, Smartphone, Settings2, AlertTriangle, FileText, TrendingUp,
  Brain, Network, Pill, Repeat, Sparkles, FlaskConical, Home,
  Briefcase, UsersRound, ShieldAlert, Syringe, BedDouble, Send,
  CheckCircle2, Search, Printer, Download, Eye, Bell, Plus, Paperclip, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/addiction';

export const addictionNav = [
  { label: 'Addiction Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Assessment Center', path: `${base}/assessments`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'ASI Center', path: `${base}/asi`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Detoxification', path: `${base}/detox`, icon: <Syringe className="h-4 w-4" /> },
  { label: 'Rehabilitation', path: `${base}/rehab`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Drug Screening', path: `${base}/screening`, icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Therapy Management', path: `${base}/therapy`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Family Involvement', path: `${base}/family`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Occupational Rehab', path: `${base}/occupational`, icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Relapse Prevention', path: `${base}/relapse`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Community Reintegration', path: `${base}/community`, icon: <Home className="h-4 w-4" /> },
  { label: 'Inpatient Rehab', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Discharge & Aftercare', path: `${base}/discharge`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Follow-Up Center', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Addiction Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={addictionNav} title={`Addiction Services & Rehab · ${title}`}>{children}</DashboardLayout>
);

const toneCls = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] || 'bg-muted text-foreground border-border');

const Chip = ({ label, t = 'blue' }: { label: string; t?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${toneCls(t)}`}>{label}</span>
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
// Success popup hook
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
// Dummy data — Nigerian context, GFA HMS Abeokuta
// ============================================================
const PATIENTS = [
  { id: 'ADC-2026-001', name: 'Segun Aluko', age: 28, sex: 'M', substance: 'Cannabis + Tramadol', risk: 'High' },
  { id: 'ADC-2026-002', name: 'Fatima Yusuf', age: 34, sex: 'F', substance: 'Alcohol', risk: 'Moderate' },
  { id: 'ADC-2026-003', name: 'Chinedu Okeke', age: 22, sex: 'M', substance: 'Codeine syrup', risk: 'Moderate' },
  { id: 'ADC-2026-004', name: 'Bola Adesina', age: 41, sex: 'M', substance: 'Heroin', risk: 'High' },
  { id: 'ADC-2026-005', name: 'Halima Bello', age: 19, sex: 'F', substance: 'Gambling (behavioural)', risk: 'Low' },
  { id: 'ADC-2026-006', name: 'Tunde Ojo', age: 30, sex: 'M', substance: 'Methamphetamine', risk: 'Moderate' },
  { id: 'ADC-2026-007', name: 'Adeyemi Cole', age: 48, sex: 'M', substance: 'Alcohol + Benzo', risk: 'High' },
  { id: 'ADC-2026-008', name: 'Olu Idowu', age: 36, sex: 'F', substance: 'Alcohol', risk: 'Low' },
];

const ASSESSMENTS = [
  { id: 'AS-9001', patient: 'Segun Aluko', type: 'Initial Addiction Assessment', clinician: 'Dr. Bola', priority: 'Urgent', status: 'Pending', risk: 'High', date: '2026-06-02' },
  { id: 'AS-9002', patient: 'Fatima Yusuf', type: 'Alcohol Use Assessment', clinician: 'Dr. Aisha', priority: 'Routine', status: 'In Progress', risk: 'Moderate', date: '2026-06-01' },
  { id: 'AS-9003', patient: 'Chinedu Okeke', type: 'Substance Use Assessment', clinician: 'Dr. Hassan', priority: 'Routine', status: 'Completed', risk: 'Moderate', date: '2026-05-30' },
  { id: 'AS-9004', patient: 'Bola Adesina', type: 'Drug Use Assessment', clinician: 'Dr. Bola', priority: 'Urgent', status: 'In Progress', risk: 'High', date: '2026-06-02' },
  { id: 'AS-9005', patient: 'Halima Bello', type: 'Mental Health Assessment', clinician: 'Dr. Olufemi', priority: 'Routine', status: 'Completed', risk: 'Low', date: '2026-05-29' },
  { id: 'AS-9006', patient: 'Adeyemi Cole', type: 'Relapse Risk Assessment', clinician: 'Dr. Hassan', priority: 'Urgent', status: 'Pending', risk: 'High', date: '2026-06-03' },
];
const ASSESS_TYPES = ['Initial Addiction Assessment', 'Substance Use Assessment', 'Alcohol Use Assessment', 'Drug Use Assessment', 'Relapse Risk Assessment', 'Mental Health Assessment', 'Family/Social Assessment'];

const ASI = [
  { id: 'ASI-001', patient: 'Bola Adesina', section: 'Drug Use', score: 8, severity: 'Extreme', status: 'Completed', date: '2026-05-30' },
  { id: 'ASI-002', patient: 'Segun Aluko', section: 'Psychiatric Status', score: 7, severity: 'Severe', status: 'Pending', date: '2026-06-02' },
  { id: 'ASI-003', patient: 'Fatima Yusuf', section: 'Alcohol Use', score: 5, severity: 'Moderate', status: 'Completed', date: '2026-05-28' },
  { id: 'ASI-004', patient: 'Halima Bello', section: 'Family / Social', score: 3, severity: 'Mild', status: 'Completed', date: '2026-05-25' },
  { id: 'ASI-005', patient: 'Adeyemi Cole', section: 'Medical Status', score: 6, severity: 'Severe', status: 'Pending', date: '2026-06-03' },
  { id: 'ASI-006', patient: 'Chinedu Okeke', section: 'Employment / Support', score: 4, severity: 'Moderate', status: 'Completed', date: '2026-05-30' },
];
const ASI_SECTIONS = ['Medical Status', 'Employment / Support Status', 'Alcohol Use', 'Drug Use', 'Legal Status', 'Family / Social Status', 'Psychiatric Status'];

const DETOX = [
  { id: 'DTX-001', patient: 'Segun Aluko', substance: 'Cannabis + Tramadol', day: 4, of: 10, withdrawal: 'Moderate (CIWA 12)', status: 'Stable' },
  { id: 'DTX-002', patient: 'Bola Adesina', substance: 'Heroin', day: 2, of: 14, withdrawal: 'Severe (COWS 28)', status: 'Critical' },
  { id: 'DTX-003', patient: 'Olu Idowu', substance: 'Alcohol', day: 7, of: 7, withdrawal: 'Resolved', status: 'Completed' },
  { id: 'DTX-004', patient: 'Adeyemi Cole', substance: 'Alcohol + Benzo', day: 5, of: 12, withdrawal: 'Moderate', status: 'Watch' },
  { id: 'DTX-005', patient: 'Chinedu Okeke', substance: 'Codeine', day: 3, of: 7, withdrawal: 'Mild', status: 'Monitoring Due' },
];

const REHAB = [
  { id: 'RHB-001', patient: 'Fatima Yusuf', program: 'Residential (90-day)', week: '4/12', progress: 'On Track' },
  { id: 'RHB-002', patient: 'Chinedu Okeke', program: 'Outpatient (IOP)', week: '6/12', progress: 'Stable' },
  { id: 'RHB-003', patient: 'Halima Bello', program: 'Day Program', week: '2/8', progress: 'On Track' },
  { id: 'RHB-004', patient: 'Adeyemi Cole', program: 'Halfway House', week: '8/12', progress: 'Watch' },
  { id: 'RHB-005', patient: 'Tunde Ojo', program: 'Community Program', week: '12/12', progress: 'Completed' },
  { id: 'RHB-006', patient: 'Bola Adesina', program: 'Residential', week: '1/12', progress: 'Delayed' },
];

const SCREENS = [
  { id: 'DS-451', patient: 'Segun Aluko', test: '10-panel UDS', result: 'Positive', status: 'Positive', date: '2026-06-01' },
  { id: 'DS-452', patient: 'Bola Adesina', test: '10-panel UDS', result: 'Positive (opiates)', status: 'Positive', date: '2026-06-01' },
  { id: 'DS-453', patient: 'Fatima Yusuf', test: 'EtG (Alcohol)', result: 'Negative', status: 'Negative', date: '2026-05-30' },
  { id: 'DS-454', patient: 'Chinedu Okeke', test: '5-panel UDS', result: 'Awaiting', status: 'Pending', date: '2026-06-02' },
  { id: 'DS-455', patient: 'Halima Bello', test: 'Saliva drug screen', result: '—', status: 'Requested', date: '2026-06-03' },
  { id: 'DS-456', patient: 'Adeyemi Cole', test: '10-panel UDS', result: 'Inconclusive', status: 'Repeat Required', date: '2026-05-31' },
];

const THERAPY = [
  { id: 'TH-001', patient: 'Fatima Yusuf', mode: 'CBT', therapist: 'Dr. Bola', date: '2026-06-03', status: 'Today' },
  { id: 'TH-002', patient: 'Chinedu Okeke', mode: 'Motivational Interviewing', therapist: 'Dr. Aisha', date: '2026-06-05', status: 'Pending' },
  { id: 'TH-003', patient: 'Aluko Family', mode: 'Family Therapy', therapist: 'Dr. Olufemi', date: '2026-06-04', status: 'Pending' },
  { id: 'TH-004', patient: 'Halima Bello', mode: 'Group Therapy', therapist: 'Dr. Hassan', date: '2026-05-30', status: 'Completed' },
  { id: 'TH-005', patient: 'Bola Adesina', mode: 'Psychoeducation', therapist: 'Nurse Blessing', date: '2026-05-28', status: 'Missed' },
  { id: 'TH-006', patient: 'Adeyemi Cole', mode: 'Relapse Prevention', therapist: 'Dr. Bola', date: '2026-06-08', status: 'Follow-Up' },
];
const THERAPY_TYPES = ['CBT', 'Motivational Interviewing', 'Group Therapy', 'Family Therapy', 'Relapse Prevention', 'Psychoeducation'];

const FAMILY = [
  { id: 'FAM-001', family: 'Aluko Family', patient: 'Segun Aluko', focus: 'Codependency & boundaries', date: '2026-06-06', status: 'Active' },
  { id: 'FAM-002', family: 'Yusuf Family', patient: 'Fatima Yusuf', focus: 'Spouse support', date: '2026-06-08', status: 'Pending' },
  { id: 'FAM-003', family: 'Adesina Family', patient: 'Bola Adesina', focus: 'Family education (heroin)', date: '2026-06-04', status: 'Support Required' },
  { id: 'FAM-004', family: 'Cole Family', patient: 'Adeyemi Cole', focus: 'Recovery planning', date: '2026-05-28', status: 'Completed' },
];

const OCC = [
  { id: 'OT-001', patient: 'Fatima Yusuf', program: 'Tailoring & Fashion', skill: 'Skills Training', hours: '24/60', status: 'Active' },
  { id: 'OT-002', patient: 'Chinedu Okeke', program: 'Computer Literacy', skill: 'Job Readiness', hours: '40/60', status: 'Job Readiness' },
  { id: 'OT-003', patient: 'Adeyemi Cole', program: 'Welding Apprenticeship', skill: 'Skills Training', hours: '12/80', status: 'Enrolled' },
  { id: 'OT-004', patient: 'Tunde Ojo', program: 'Agribusiness', skill: 'Job Readiness', hours: '60/60', status: 'Completed' },
];

const RELAPSE = [
  { id: 'RP-001', patient: 'Bola Adesina', level: 'High', triggers: 'Old peers, stress', plan: 'Daily check-in', followup: '2026-06-05', status: 'Review Due' },
  { id: 'RP-002', patient: 'Adeyemi Cole', level: 'High', triggers: 'Alcohol environment', plan: 'Environmental restructuring', followup: '2026-06-04', status: 'Recent Relapse' },
  { id: 'RP-003', patient: 'Chinedu Okeke', level: 'Moderate', triggers: 'Loneliness', plan: 'Group attendance', followup: '2026-06-09', status: 'Active' },
  { id: 'RP-004', patient: 'Fatima Yusuf', level: 'Low', triggers: 'Family conflict', plan: 'Family therapy', followup: '2026-06-12', status: 'Active' },
  { id: 'RP-005', patient: 'Segun Aluko', level: 'Extreme', triggers: 'Polysubstance, housing', plan: 'Inpatient transfer', followup: '2026-06-03', status: 'Review Due' },
];

const COMMUNITY = [
  { id: 'CR-001', patient: 'Tunde Ojo', housing: 'Stable (family)', employment: 'Casual labour', status: 'In Progress' },
  { id: 'CR-002', patient: 'Adeyemi Cole', housing: 'Halfway house', employment: 'In training', status: 'Follow-Up Required' },
  { id: 'CR-003', patient: 'Fatima Yusuf', housing: 'Stable', employment: 'Self-employed', status: 'Completed' },
  { id: 'CR-004', patient: 'Halima Bello', housing: 'Family home', employment: 'Student', status: 'Pending' },
  { id: 'CR-005', patient: 'Bola Adesina', housing: 'No fixed address', employment: 'None', status: 'Community Risk' },
];

const INPATIENT = [
  { id: 'IPD-001', patient: 'Segun Aluko', bed: 'DTX-04', program: 'Detox Unit', admitted: '2026-05-29', status: 'Active' },
  { id: 'IPD-002', patient: 'Bola Adesina', bed: 'DTX-07', program: 'Detox Unit', admitted: '2026-05-31', status: 'Critical' },
  { id: 'IPD-003', patient: 'Fatima Yusuf', bed: 'RHB-12', program: 'Rehab Ward A', admitted: '2026-05-04', status: 'Stable' },
  { id: 'IPD-004', patient: 'Adeyemi Cole', bed: 'HW-03', program: 'Halfway House', admitted: '2026-04-10', status: 'Watch' },
  { id: 'IPD-005', patient: 'Olu Idowu', bed: 'RHB-08', program: 'Rehab Ward B', admitted: '2026-05-28', status: 'Discharge Planned' },
  { id: 'IPD-006', patient: 'Chinedu Okeke', bed: 'DTX-02', program: 'Detox Unit', admitted: '2026-06-02', status: 'New' },
];

const DISCHARGE = [
  { id: 'DSC-001', patient: 'Olu Idowu', plan: 'Outpatient AA + monthly clinic', date: '2026-06-10', status: 'Active Aftercare' },
  { id: 'DSC-002', patient: 'Tunde Ojo', plan: 'Aftercare + community support', date: '2026-06-15', status: 'Active Aftercare' },
  { id: 'DSC-003', patient: 'Fatima Yusuf', plan: 'Step-down to outpatient', date: '2026-06-20', status: 'Pending' },
  { id: 'DSC-004', patient: 'Halima Bello', plan: 'Behavioural follow-up', date: '2026-05-28', status: 'Completed' },
  { id: 'DSC-005', patient: 'Adeyemi Cole', plan: 'Relapse follow-up', date: '2026-06-05', status: 'Follow-Up Required' },
];

const FOLLOWUPS = [
  { id: 'FU-001', patient: 'Tunde Ojo', type: 'Aftercare review', date: '2026-06-15', risk: 'Low', status: 'Upcoming' },
  { id: 'FU-002', patient: 'Chinedu Okeke', type: 'IOP weekly review', date: '2026-06-05', risk: 'Moderate', status: 'Today' },
  { id: 'FU-003', patient: 'Halima Bello', type: 'Behavioural check', date: '2026-06-07', risk: 'Low', status: 'Upcoming' },
  { id: 'FU-004', patient: 'Adeyemi Cole', type: 'Relapse review', date: '2026-05-30', risk: 'High', status: 'Missed' },
  { id: 'FU-005', patient: 'Fatima Yusuf', type: 'Therapy review', date: '2026-05-28', risk: 'Low', status: 'Completed' },
  { id: 'FU-006', patient: 'Bola Adesina', type: 'Detox follow-up', date: '2026-06-03', risk: 'High', status: 'Today' },
];

const INVOICES = [
  { id: 'INV-ADX-901', patient: 'Segun Aluko', service: 'Detox + Assessment', amount: 280000, nhia: 'Pending', status: 'Outstanding' },
  { id: 'INV-ADX-902', patient: 'Fatima Yusuf', service: 'Residential Rehab (28d)', amount: 560000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-ADX-903', patient: 'Chinedu Okeke', service: 'IOP Block (12 sessions)', amount: 120000, nhia: 'Approved', status: 'NHIA' },
  { id: 'INV-ADX-904', patient: 'Aluko Family', service: 'Family Therapy (6 sessions)', amount: 72000, nhia: '—', status: 'Paid' },
  { id: 'INV-ADX-905', patient: 'Adeyemi Cole', service: 'Halfway House (month)', amount: 180000, nhia: 'Pending', status: 'Pending' },
  { id: 'INV-ADX-906', patient: 'Bola Adesina', service: 'Inpatient Rehab (week)', amount: 210000, nhia: '—', status: 'Rehab' },
];
const SERVICE_TYPES = ['Addiction Assessment', 'ASI Assessment', 'Detox Program', 'Rehabilitation Program', 'Therapy Session', 'Drug Screening', 'Family Session', 'Inpatient Rehab', 'Aftercare'];

const ALERTS = [
  { id: 'AL-001', patient: 'Bola Adesina', type: 'Critical', message: 'COWS 28 — severe heroin withdrawal', date: '2026-06-02', status: 'Critical' },
  { id: 'AL-002', patient: 'Segun Aluko', type: 'High Risk', message: 'Suicidal ideation reported in assessment', date: '2026-06-02', status: 'High Risk' },
  { id: 'AL-003', patient: 'Adeyemi Cole', type: 'Relapse', message: 'Positive UDS after 3 weeks abstinent', date: '2026-06-01', status: 'Relapse' },
  { id: 'AL-004', patient: 'Chinedu Okeke', type: 'Detox', message: 'Missed CIWA observation window', date: '2026-06-02', status: 'Detox' },
  { id: 'AL-005', patient: 'Halima Bello', type: 'Overdue', message: 'Follow-up overdue by 5 days', date: '2026-05-28', status: 'Overdue' },
  { id: 'AL-006', patient: 'Tunde Ojo', type: 'Acknowledged', message: 'Aftercare contact confirmed', date: '2026-05-27', status: 'Acknowledged' },
];

const THREADS = [
  { id: 'CMS-001', dept: 'Addiction ↔ Doctor', with: 'Dr. Bola · Psychiatry', patient: 'Segun Aluko', preview: 'Detox plan reviewed — please continue diazepam taper.', unread: 2, urgent: false, time: '09:14' },
  { id: 'CMS-002', dept: 'Addiction ↔ Psychology', with: 'Dr. Aisha · Psychology', patient: 'Fatima Yusuf', preview: 'CBT relapse-prevention notes attached.', unread: 1, urgent: false, time: '08:42' },
  { id: 'CMS-003', dept: 'Addiction ↔ Nurse', with: 'Nurse Olamide · Detox Unit', patient: 'Bola Adesina', preview: 'URGENT: COWS rising overnight, requesting review.', unread: 4, urgent: true, time: '07:58' },
  { id: 'CMS-004', dept: 'Addiction ↔ Laboratory', with: 'Lab Reception · UDS Desk', patient: 'Chinedu Okeke', preview: 'UDS pending — sample received.', unread: 0, urgent: false, time: 'Yesterday' },
  { id: 'CMS-005', dept: 'Addiction ↔ Pharmacy', with: 'Pharmacy Desk 2', patient: 'Adeyemi Cole', preview: 'Naltrexone ready for collection.', unread: 1, urgent: false, time: 'Yesterday' },
  { id: 'CMS-006', dept: 'Addiction ↔ Social Work', with: 'Ms. Adekola · Social Work', patient: 'Tunde Ojo', preview: 'Home visit completed; reintegration plan attached.', unread: 0, urgent: false, time: '2d ago' },
  { id: 'CMS-007', dept: 'Addiction ↔ Occupational Therapy', with: 'OT Office', patient: 'Halima Bello', preview: 'Skills program enrolment confirmed.', unread: 0, urgent: false, time: '3d ago' },
];

// ============================================================
// Generic helpers
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

const PatientPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div>
    <Label>Search Patient</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
      <SelectContent>{PATIENTS.map(c => <SelectItem key={c.id} value={c.name}>{c.name} · {c.id} · {c.age}y</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

type Field = { k: string; label: string; type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'patientPicker'; options?: string[]; placeholder?: string };
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
          const wide = ['textarea', 'patientPicker'].includes(fd.type);
          return (
            <div key={fd.k} className={wide ? 'sm:col-span-2' : ''}>
              {fd.type === 'patientPicker' ? (
                <PatientPicker value={f[fd.k] || ''} onChange={v => setF({ ...f, [fd.k]: v })} />
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

type Col<T> = { key: string; header: string; render: (row: T) => ReactNode };
type WorkflowProps<T> = {
  shellTitle: string;
  icon: ReactNode;
  title: string;
  desc: string;
  ctaLabel: string;
  ctaIcon?: ReactNode;
  newDialog: (close: () => void, notify: (p: SuccessPayload) => void) => ReactNode;
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
  const [openNew, setOpenNew] = useState(false);
  useMemo(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') setOpenNew(true);
  }, []);
  const active = props.tabs.find(t => t.key === tab)!;
  const filtered = props.rows.filter(active.filter).filter(r => !q || props.searchFields(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell title={props.shellTitle}>
      <Section icon={props.icon} title={props.title} desc={props.desc}
        action={
          <>
            <Button onClick={() => setOpenNew(true)}>{props.ctaIcon || <FilePlus className="h-4 w-4 mr-1" />}{props.ctaLabel}</Button>
            <Button variant="outline" onClick={() => notify({ title: 'Export ready', message: `${props.shellTitle} list exported`, nextStep: 'Check your downloads folder for the CSV.' })}><Download className="h-4 w-4 mr-1" /> Export</Button>
          </>
        }
      />
      <KpiGrid items={props.kpis} />
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto mb-3">{props.tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
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
      <Dialog open={openNew} onOpenChange={setOpenNew}>{props.newDialog(() => setOpenNew(false), notify)}</Dialog>
      {node}
    </Shell>
  );
}

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
// 1. DASHBOARD
// ============================================================
export const AddictionDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'ASI Assessment', i: Brain, p: 'asi' },
    { l: 'Detoxification', i: Syringe, p: 'detox' },
    { l: 'Rehabilitation', i: HeartHandshake, p: 'rehab' },
    { l: 'Drug Screening', i: FlaskConical, p: 'screening' },
    { l: 'Therapy Session', i: UsersRound, p: 'therapy' },
    { l: 'Family Plan', i: HeartHandshake, p: 'family' },
    { l: 'Occupational Rehab', i: Briefcase, p: 'occupational' },
    { l: 'Relapse Review', i: ShieldAlert, p: 'relapse' },
    { l: 'Community Reintegration', i: Home, p: 'community' },
    { l: 'Inpatient Rehab', i: BedDouble, p: 'inpatient' },
    { l: 'Discharge Plan', i: ScrollText, p: 'discharge' },
    { l: 'Follow-Up', i: Repeat, p: 'followup' },
    { l: 'Billing & NHIA', i: CreditCard, p: 'billing' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Alerts', i: AlertTriangle, p: 'alerts' },
    { l: 'Communication', i: MessageSquare, p: 'comms' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<Activity className="h-5 w-5" />}
        title="Addiction Services & Rehabilitation Workspace"
        desc="GFA HMS · Specialist workspace for substance abuse, detoxification, rehabilitation, ASI, relapse prevention and community reintegration — integrated with EMR, Psychology, Pharmacy, Laboratory, Billing and NHIA."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/detox?new=1`)}><Syringe className="h-4 w-4 mr-1" /> Start Detox</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'Active Addiction Cases', v: 214, i: Users, tone: 'blue' },
        { l: 'New Assessments', v: 18, i: ClipboardList, tone: 'purple' },
        { l: 'Detox Patients', v: 22, i: Syringe, tone: 'rose' },
        { l: 'Stable Patients', v: 96, i: CheckCircle2, tone: 'green' },
        { l: 'Watch Patients', v: 31, i: AlertCircle, tone: 'amber' },
        { l: 'High-Risk Patients', v: 27, i: ShieldAlert, tone: 'rose' },
      ]} />
      <KpiGrid items={[
        { l: 'Relapse Risk Cases', v: 14, i: Repeat, tone: 'amber' },
        { l: 'Rehab Patients', v: 46, i: HeartHandshake, tone: 'purple' },
        { l: 'Community Reintegration', v: 19, i: Home, tone: 'teal' },
        { l: 'Follow-Ups Due', v: 12, i: CalendarDays, tone: 'amber' },
        { l: 'Billing Pending', v: 9, i: CreditCard, tone: 'rose' },
        { l: 'Critical Alerts', v: 4, i: AlertTriangle, tone: 'rose' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Risk (Relapse)</div>
          <div className="space-y-2">{RELAPSE.slice(0, 4).map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{r.patient}</div><div className="text-xs text-muted-foreground">{r.triggers}</div></div>
              <Chip label={r.level} t={r.level === 'High' || r.level === 'Extreme' ? 'red' : r.level === 'Moderate' ? 'amber' : 'green'} />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Therapy Sessions</div>
          <div className="space-y-2">{THERAPY.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{s.patient}</div><div className="text-xs text-muted-foreground">{s.mode} · {s.therapist}</div></div>
              <Chip label={s.status} t={s.status === 'Today' ? 'blue' : s.status === 'Missed' ? 'red' : 'amber'} />
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
// 2. ASSESSMENT CENTER
// ============================================================
export const AddictionAssessmentCenter = () => {
  const [selected, setSelected] = useState<typeof ASSESSMENTS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Assessment Center"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Addiction Assessments"
        desc="Initial intake, substance use, alcohol, drug, relapse risk, mental health and family/social assessments."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Total Assessments', v: 142, i: ClipboardList, tone: 'blue' },
          { l: 'Pending', v: 18, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: 12, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: 104, i: CheckCircle2, tone: 'green' },
          { l: 'High-Risk', v: 9, i: ShieldAlert, tone: 'red' },
          { l: 'Urgent', v: 6, i: AlertTriangle, tone: 'rose' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pending', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'inprog', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'done', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'high', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
        ]}
        rows={ASSESSMENTS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'c', header: 'Clinician', render: r => r.clinician },
          { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'Urgent' ? 'red' : 'blue'} /> },
          { key: 'risk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'purple' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Addiction Assessment" submitLabel="Start Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Assessment Type', type: 'select', options: ASSESS_TYPES },
            { k: 'substance', label: 'Substance Concern', type: 'select', options: ['Alcohol', 'Cannabis', 'Opioids', 'Stimulants', 'Sedatives', 'Polysubstance', 'Behavioural'] },
            { k: 'source', label: 'Referral Source', type: 'select', options: ['Self', 'GP', 'OPD', 'Court', 'Family', 'Social Services'] },
            { k: 'clinician', label: 'Assigned Clinician', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan', 'Dr. Olufemi'] },
            { k: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent', 'Stat'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Addiction assessment started successfully" nextStep="Open the assessment workspace to complete each section."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Assessment · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Type', value: selected.type },
            { label: 'Clinician', value: selected.clinician },
            { label: 'Priority', value: selected.priority },
            { label: 'Risk Level', value: <Chip label={selected.risk} t={selected.risk === 'High' ? 'red' : selected.risk === 'Moderate' ? 'amber' : 'green'} /> },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Completed' ? 'green' : 'amber'} /> },
            { label: 'Substance Use History', value: 'Documented per intake — see Substance Use tab.' },
            { label: 'Mental Health Status', value: 'Co-morbid depression noted; PHQ-9 = 14.' },
            { label: 'Family / Social Details', value: 'Married, 2 children, supportive spouse.' },
            { label: 'Recommendations', value: 'Admit for medical detox; commence CBT.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => { toast.success('Draft saved'); }}>Save Draft</Button>
              <Button onClick={() => { setSelected(null); toast.success('Assessment submitted'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Assessment</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 3. ASI CENTER
// ============================================================
export const AsiCenter = () => {
  const [selected, setSelected] = useState<typeof ASI[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="ASI Center"
        icon={<Brain className="h-5 w-5" />}
        title="Addiction Severity Index (ASI)"
        desc="Seven-domain severity scoring with classification, problem list, recommendations and follow-up planning."
        ctaLabel="New ASI"
        kpis={[
          { l: 'Total ASI', v: 88, i: ClipboardList, tone: 'blue' },
          { l: 'Pending', v: 14, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: 74, i: CheckCircle2, tone: 'green' },
          { l: 'Mild', v: 18, i: ShieldAlert, tone: 'green' },
          { l: 'Moderate', v: 26, i: ShieldAlert, tone: 'amber' },
          { l: 'Severe/Extreme', v: 30, i: ShieldAlert, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'mild', label: 'Mild', filter: (r: any) => r.severity === 'Mild' },
          { key: 'mod', label: 'Moderate', filter: (r: any) => r.severity === 'Moderate' },
          { key: 'sev', label: 'Severe', filter: (r: any) => r.severity === 'Severe' },
          { key: 'ext', label: 'Extreme', filter: (r: any) => r.severity === 'Extreme' },
        ]}
        rows={ASI}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.section}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 's', header: 'Section', render: r => r.section },
          { key: 'sc', header: 'Score', render: r => `${r.score}/9` },
          { key: 'sv', header: 'Severity', render: r => <Chip label={r.severity} t={r.severity === 'Extreme' ? 'red' : r.severity === 'Severe' ? 'orange' : r.severity === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New ASI Assessment" submitLabel="Save ASI"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'section', label: 'ASI Section', type: 'select', options: ASI_SECTIONS },
            { k: 'score', label: 'Severity Score (0–9)', type: 'number' },
            { k: 'problems', label: 'Problem List', type: 'textarea' },
            { k: 'rec', label: 'Recommendation', type: 'textarea' },
            { k: 'clinician', label: 'Assigned Clinician', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan', 'Dr. Olufemi'] },
          ]}
          successTitle="ASI assessment saved successfully" nextStep="Open the ASI workspace to add follow-up plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`ASI · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Section', value: selected.section },
            { label: 'Score', value: `${selected.score}/9` },
            { label: 'Severity Class', value: <Chip label={selected.severity} t={selected.severity === 'Extreme' ? 'red' : 'amber'} /> },
            { label: 'Problem List', value: 'Daily IV use, hep B, unemployment.' },
            { label: 'Treatment Recommendations', value: 'Medical detox + MMT + psychosocial support.' },
            { label: 'Follow-Up Plan', value: 'ASI reassessment at week 6.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 4. DETOX
// ============================================================
export const DetoxManagement = () => {
  const [selected, setSelected] = useState<typeof DETOX[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Detoxification"
        icon={<Syringe className="h-5 w-5" />}
        title="Detoxification Unit"
        desc="Withdrawal monitoring (CIWA/COWS), medication tapers, daily chart updates and risk stratification."
        ctaLabel="Admit to Detox"
        kpis={[
          { l: 'Active Detox', v: DETOX.length, i: Syringe, tone: 'rose' },
          { l: 'Stable', v: DETOX.filter(d => d.status === 'Stable').length, i: CheckCircle2, tone: 'green' },
          { l: 'Watch', v: DETOX.filter(d => d.status === 'Watch').length, i: AlertCircle, tone: 'amber' },
          { l: 'Critical', v: DETOX.filter(d => d.status === 'Critical').length, i: AlertTriangle, tone: 'red' },
          { l: 'Monitoring Due', v: DETOX.filter(d => d.status === 'Monitoring Due').length, i: CalendarDays, tone: 'amber' },
          { l: 'Completed', v: DETOX.filter(d => d.status === 'Completed').length, i: CheckCircle2, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'stable', label: 'Stable', filter: (r: any) => r.status === 'Stable' },
          { key: 'watch', label: 'Watch', filter: (r: any) => r.status === 'Watch' },
          { key: 'crit', label: 'Critical', filter: (r: any) => r.status === 'Critical' },
          { key: 'mon', label: 'Monitoring Due', filter: (r: any) => r.status === 'Monitoring Due' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={DETOX}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.substance}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 's', header: 'Substance', render: r => r.substance },
          { key: 'd', header: 'Day', render: r => `${r.day} / ${r.of}` },
          { key: 'w', header: 'Withdrawal', render: r => r.withdrawal },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical' ? 'red' : r.status === 'Watch' ? 'amber' : r.status === 'Stable' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><FileText className="h-3.5 w-3.5 mr-1" /> Chart</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Admit to Detox" submitLabel="Admit Patient"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'sub', label: 'Substance Type', type: 'select', options: ['Alcohol', 'Heroin', 'Cannabis', 'Tramadol', 'Codeine', 'Benzodiazepines', 'Methamphetamine', 'Polysubstance'] },
            { k: 'start', label: 'Detox Start Date', type: 'date' },
            { k: 'risk', label: 'Withdrawal Risk', type: 'select', options: ['Low', 'Moderate', 'Severe'] },
            { k: 'doc', label: 'Assigned Doctor', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan'] },
            { k: 'nurse', label: 'Assigned Nurse', type: 'select', options: ['Nurse Olamide', 'Nurse Blessing', 'Nurse Aisha'] },
            { k: 'bed', label: 'Bed / Ward', type: 'select', options: ['DTX-01', 'DTX-02', 'DTX-03', 'DTX-04', 'DTX-05'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Patient admitted to detox successfully" nextStep="Open detox chart to begin withdrawal monitoring."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Detox Chart · ${selected.patient}`}
          sections={[
            { label: 'Detox ID', value: selected.id },
            { label: 'Substance', value: selected.substance },
            { label: 'Day Count', value: `${selected.day} of ${selected.of}` },
            { label: 'Withdrawal Symptoms', value: selected.withdrawal },
            { label: 'Vital Signs', value: 'BP 132/84 · HR 96 · T 37.0°C' },
            { label: 'Medication Schedule', value: 'Diazepam 10mg q6h taper · Thiamine OD' },
            { label: 'Daily Progress', value: 'Tremor reduced; sleeping in fragments.' },
            { label: 'Risk Level', value: <Chip label={selected.status} t={selected.status === 'Critical' ? 'red' : 'amber'} /> },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 5. REHAB
// ============================================================
export const RehabilitationCenter = () => {
  const [selected, setSelected] = useState<typeof REHAB[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Rehabilitation"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Rehabilitation Programs"
        desc="Residential, outpatient, day and community rehab plans with goals, therapy and family components."
        ctaLabel="Create Rehab Plan"
        kpis={[
          { l: 'Active Plans', v: REHAB.length, i: HeartHandshake, tone: 'blue' },
          { l: 'Stable', v: REHAB.filter(r => r.progress === 'Stable').length, i: CheckCircle2, tone: 'green' },
          { l: 'Watch', v: REHAB.filter(r => r.progress === 'Watch').length, i: AlertCircle, tone: 'amber' },
          { l: 'On Track', v: REHAB.filter(r => r.progress === 'On Track').length, i: TrendingUp, tone: 'green' },
          { l: 'Delayed', v: REHAB.filter(r => r.progress === 'Delayed').length, i: AlertTriangle, tone: 'red' },
          { l: 'Completed', v: REHAB.filter(r => r.progress === 'Completed').length, i: CheckCircle2, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'on', label: 'On Track', filter: (r: any) => r.progress === 'On Track' },
          { key: 'watch', label: 'Watch', filter: (r: any) => r.progress === 'Watch' },
          { key: 'stable', label: 'Stable', filter: (r: any) => r.progress === 'Stable' },
          { key: 'del', label: 'Delayed', filter: (r: any) => r.progress === 'Delayed' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.progress === 'Completed' },
        ]}
        rows={REHAB}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.program}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'pr', header: 'Program', render: r => r.program },
          { key: 'w', header: 'Week', render: r => r.week },
          { key: 'pg', header: 'Progress', render: r => <Chip label={r.progress} t={r.progress === 'Delayed' ? 'red' : r.progress === 'Watch' ? 'amber' : 'green'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Create Rehab Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Rehab Type', type: 'select', options: ['Residential Rehab', 'Outpatient Rehab', 'Day Program', 'Community Program'] },
            { k: 'goals', label: 'Goals', type: 'textarea' },
            { k: 'therapy', label: 'Therapy Plan', type: 'textarea' },
            { k: 'occ', label: 'Occupational Rehab Plan', type: 'textarea' },
            { k: 'fam', label: 'Family Support Plan', type: 'textarea' },
            { k: 'review', label: 'Review Date', type: 'date' },
          ]}
          successTitle="Rehabilitation plan created" nextStep="Schedule therapy and family sessions for this plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Rehab Plan · ${selected.patient}`}
          sections={[
            { label: 'Plan ID', value: selected.id },
            { label: 'Program', value: selected.program },
            { label: 'Progress', value: <Chip label={selected.progress} t={selected.progress === 'Delayed' ? 'red' : 'green'} /> },
            { label: 'Week', value: selected.week },
            { label: 'Therapy Attendance', value: '88% (last 4 weeks)' },
            { label: 'Relapse Risk', value: 'Moderate' },
            { label: 'Family Involvement', value: '4 sessions completed' },
            { label: 'Community Reintegration', value: 'Started; OT enrolled.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 6. SCREENING
// ============================================================
export const DrugScreening = () => {
  const [selected, setSelected] = useState<typeof SCREENS[0] | null>(null);
  const nav = useNavigate();
  return (
    <>
      <WorkflowPage
        shellTitle="Drug Screening"
        icon={<FlaskConical className="h-5 w-5" />}
        title="Drug Screening"
        desc="Urine, saliva and EtG screening requests, lab results and repeat-test workflows."
        ctaLabel="Request Screen"
        kpis={[
          { l: 'Requested', v: SCREENS.filter(s => s.status === 'Requested').length + 6, i: FlaskConical, tone: 'blue' },
          { l: 'Pending Results', v: SCREENS.filter(s => s.status === 'Pending').length + 4, i: AlertCircle, tone: 'amber' },
          { l: 'Positive', v: SCREENS.filter(s => s.status === 'Positive').length + 3, i: AlertTriangle, tone: 'red' },
          { l: 'Negative', v: SCREENS.filter(s => s.status === 'Negative').length + 8, i: CheckCircle2, tone: 'green' },
          { l: 'Repeat Required', v: SCREENS.filter(s => s.status === 'Repeat Required').length + 1, i: Repeat, tone: 'amber' },
          { l: 'Total Tests (Mo)', v: 38, i: ClipboardList, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'req', label: 'Requested', filter: (r: any) => r.status === 'Requested' },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'pos', label: 'Positive', filter: (r: any) => r.status === 'Positive' },
          { key: 'neg', label: 'Negative', filter: (r: any) => r.status === 'Negative' },
          { key: 'rep', label: 'Repeat Required', filter: (r: any) => r.status === 'Repeat Required' },
        ]}
        rows={SCREENS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.test}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Test', render: r => r.test },
          { key: 'r', header: 'Result', render: r => r.result },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Positive' ? 'red' : r.status === 'Negative' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => {
          return (
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Request Drug Screen</DialogTitle></DialogHeader>
              <ScreenRequestForm close={close} notify={notify} />
            </DialogContent>
          );
        }}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Drug Screen · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Test', value: selected.test },
            { label: 'Result', value: selected.result },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Positive' ? 'red' : 'green'} /> },
            { label: 'Lab Link', value: 'Laboratory · Toxicology Bench' },
            { label: 'Follow-Up Action', value: selected.status === 'Positive' ? 'Counselling + relapse review' : 'Routine review' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => nav('/dashboard/lab')}><FlaskConical className="h-4 w-4 mr-1" /> Open in Lab</Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </>
          }
        />
      )}
    </>
  );
};
const ScreenRequestForm = ({ close, notify }: { close: () => void; notify: (p: SuccessPayload) => void }) => {
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const submit = (goLab = false) => {
    if (!f.patient) return toast.error('Patient is required');
    close();
    notify({
      title: 'Drug screening request sent to Laboratory',
      message: `${f.patient} · ${f.test || 'Standard panel'}`,
      nextStep: 'Result will arrive in this screening list once the lab releases it.',
      actions: goLab ? [{ label: 'Go to Laboratory', onClick: () => nav('/dashboard/lab') }] : undefined,
    });
  };
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div className="sm:col-span-2"><PatientPicker value={f.patient || ''} onChange={v => setF({ ...f, patient: v })} /></div>
        <div><Label>Test Type</Label>
          <Select value={f.test || ''} onValueChange={v => setF({ ...f, test: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['5-panel UDS', '10-panel UDS', 'EtG (Alcohol)', 'Saliva drug screen', 'Hair drug test'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Priority</Label>
          <Select value={f.pr || ''} onValueChange={v => setF({ ...f, pr: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{['Routine', 'Urgent', 'Stat'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="sm:col-span-2"><Label>Reason</Label><Textarea rows={2} value={f.reason || ''} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes || ''} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter className="mt-4 flex-wrap gap-2">
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button variant="outline" onClick={() => submit(true)}><FlaskConical className="h-4 w-4 mr-1" /> Submit & Go to Lab</Button>
        <Button onClick={() => submit(false)}>Submit Request</Button>
      </DialogFooter>
    </>
  );
};

// ============================================================
// 7. THERAPY
// ============================================================
export const TherapyManagement = () => {
  const [selected, setSelected] = useState<typeof THERAPY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Therapy Management"
        icon={<UsersRound className="h-5 w-5" />}
        title="Therapy Sessions"
        desc="CBT, MI, group, family, relapse-prevention and psychoeducation session scheduling and notes."
        ctaLabel="Schedule Session"
        kpis={[
          { l: 'Sessions Today', v: THERAPY.filter(t => t.status === 'Today').length + 5, i: CalendarDays, tone: 'blue' },
          { l: 'Pending', v: THERAPY.filter(t => t.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: THERAPY.filter(t => t.status === 'Completed').length + 42, i: CheckCircle2, tone: 'green' },
          { l: 'Missed', v: THERAPY.filter(t => t.status === 'Missed').length + 4, i: AlertTriangle, tone: 'red' },
          { l: 'Follow-Up', v: THERAPY.filter(t => t.status === 'Follow-Up').length + 6, i: Repeat, tone: 'amber' },
          { l: 'Total (Mo)', v: 168, i: ClipboardList, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'today', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'done', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'miss', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
          { key: 'fu', label: 'Follow-Up', filter: (r: any) => r.status === 'Follow-Up' },
        ]}
        rows={THERAPY}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.mode}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'm', header: 'Mode', render: r => r.mode },
          { key: 't', header: 'Therapist', render: r => r.therapist },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Today' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule Therapy Session" submitLabel="Schedule"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'mode', label: 'Therapy Type', type: 'select', options: THERAPY_TYPES },
            { k: 'therapist', label: 'Therapist', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan', 'Dr. Olufemi'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 10:30' },
            { k: 'mode2', label: 'Mode', type: 'select', options: ['In-person', 'Telehealth', 'Home visit'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Therapy session scheduled" nextStep="Patient and therapist notified; visible on the therapy calendar."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Therapy · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Mode', value: selected.mode },
            { label: 'Therapist', value: selected.therapist },
            { label: 'Session Goals', value: 'Identify triggers; rehearse refusal skills.' },
            { label: 'Session Notes', value: 'Engaged; reports two cravings this week.' },
            { label: 'Progress', value: 'Improving' },
            { label: 'Outcome', value: 'Continue weekly CBT.' },
            { label: 'Next Appointment', value: '2026-06-12 10:30' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 8. FAMILY
// ============================================================
export const FamilyInvolvement = () => {
  const [selected, setSelected] = useState<typeof FAMILY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Family Involvement"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Family Involvement & Support"
        desc="Family plans, education, support sessions and family-therapy progress tracking."
        ctaLabel="New Family Plan"
        kpis={[
          { l: 'Active Plans', v: FAMILY.filter(f => f.status === 'Active').length + 8, i: HeartHandshake, tone: 'blue' },
          { l: 'Pending', v: FAMILY.filter(f => f.status === 'Pending').length + 3, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: FAMILY.filter(f => f.status === 'Completed').length + 12, i: CheckCircle2, tone: 'green' },
          { l: 'Support Required', v: FAMILY.filter(f => f.status === 'Support Required').length + 2, i: ShieldAlert, tone: 'red' },
          { l: 'Sessions (Mo)', v: 34, i: CalendarDays, tone: 'purple' },
          { l: 'Families Engaged', v: 26, i: Users, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'act', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'done', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'sup', label: 'Support Required', filter: (r: any) => r.status === 'Support Required' },
        ]}
        rows={FAMILY}
        searchFields={(r: any) => `${r.family} ${r.patient} ${r.focus}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'f', header: 'Family', render: r => r.family },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'fo', header: 'Focus', render: r => r.focus },
          { key: 'd', header: 'Next', render: r => r.date },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Support Required' ? 'red' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Family Support Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'contact', label: 'Family Contact', type: 'text' },
            { k: 'concern', label: 'Family Concern', type: 'textarea' },
            { k: 'plan', label: 'Support Plan', type: 'textarea' },
            { k: 'staff', label: 'Assigned Staff', type: 'select', options: ['Dr. Olufemi', 'Ms. Adekola (Social Work)', 'Dr. Bola'] },
            { k: 'review', label: 'Review Date', type: 'date' },
          ]}
          successTitle="Family plan created" nextStep="Family session can now be scheduled."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Family · ${selected.family}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Family Members', value: 'Spouse, 2 adult children' },
            { label: 'Focus', value: selected.focus },
            { label: 'Session Notes', value: 'Education delivered; boundaries discussed.' },
            { label: 'Education Plan', value: 'Drug effects, relapse signs, naloxone training.' },
            { label: 'Support Actions', value: 'Weekly call from social worker.' },
            { label: 'Progress', value: <Chip label={selected.status} t={selected.status === 'Completed' ? 'green' : 'amber'} /> },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 9. OCCUPATIONAL
// ============================================================
export const OccupationalRehab = () => {
  const [selected, setSelected] = useState<typeof OCC[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Occupational Rehab"
        icon={<Briefcase className="h-5 w-5" />}
        title="Occupational Rehabilitation"
        desc="Vocational programs, skills training, job-readiness and placement for recovering patients."
        ctaLabel="Enrol Patient"
        kpis={[
          { l: 'Enrolled', v: 24, i: Users, tone: 'blue' },
          { l: 'Active Programs', v: 18, i: Briefcase, tone: 'purple' },
          { l: 'Skills Training', v: OCC.filter(o => o.skill === 'Skills Training').length + 6, i: BookOpen, tone: 'teal' },
          { l: 'Job Readiness', v: OCC.filter(o => o.skill === 'Job Readiness').length + 4, i: TrendingUp, tone: 'green' },
          { l: 'Completed', v: OCC.filter(o => o.status === 'Completed').length + 9, i: CheckCircle2, tone: 'green' },
          { l: 'Drop-outs', v: 3, i: AlertCircle, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'enr', label: 'Enrolled', filter: (r: any) => r.status === 'Enrolled' },
          { key: 'act', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'sk', label: 'Skills Training', filter: (r: any) => r.skill === 'Skills Training' },
          { key: 'jr', label: 'Job Readiness', filter: (r: any) => r.skill === 'Job Readiness' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={OCC}
        searchFields={(r: any) => `${r.patient} ${r.program}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'pr', header: 'Program', render: r => r.program },
          { key: 'sk', header: 'Skill Area', render: r => r.skill },
          { key: 'h', header: 'Hours', render: r => r.hours },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Enrol Patient in Occupational Program" submitLabel="Enrol"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'prog', label: 'Program Type', type: 'select', options: ['Tailoring & Fashion', 'Computer Literacy', 'Welding Apprenticeship', 'Agribusiness', 'Catering', 'Carpentry'] },
            { k: 'skill', label: 'Skills Area', type: 'select', options: ['Skills Training', 'Job Readiness', 'Placement'] },
            { k: 'therapist', label: 'Assigned Therapist', type: 'select', options: ['OT Adebola', 'OT Chuka', 'OT Fatima'] },
            { k: 'start', label: 'Start Date', type: 'date' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Patient enrolled in occupational program" nextStep="First skills session scheduled this week."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Occupational Rehab · ${selected.patient}`}
          sections={[
            { label: 'Program', value: selected.program },
            { label: 'Skill Area', value: selected.skill },
            { label: 'Hours', value: selected.hours },
            { label: 'Attendance', value: '88%' },
            { label: 'Progress', value: 'On track' },
            { label: 'Job Readiness', value: '70%' },
            { label: 'Recommendations', value: 'Continue program; explore placement next month.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 10. RELAPSE
// ============================================================
export const RelapsePrevention = () => {
  const [selected, setSelected] = useState<typeof RELAPSE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Relapse Prevention"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Relapse Risk & Prevention"
        desc="Risk reviews, trigger mapping, warning signs and intervention plans."
        ctaLabel="New Risk Review"
        kpis={[
          { l: 'Low Risk', v: RELAPSE.filter(r => r.level === 'Low').length + 18, i: ShieldAlert, tone: 'green' },
          { l: 'Moderate Risk', v: RELAPSE.filter(r => r.level === 'Moderate').length + 12, i: ShieldAlert, tone: 'amber' },
          { l: 'High Risk', v: RELAPSE.filter(r => r.level === 'High').length + 6, i: ShieldAlert, tone: 'red' },
          { l: 'Extreme Risk', v: RELAPSE.filter(r => r.level === 'Extreme').length + 1, i: AlertTriangle, tone: 'red' },
          { l: 'Reviews Due', v: RELAPSE.filter(r => r.status === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
          { l: 'Recent Relapse', v: RELAPSE.filter(r => r.status === 'Recent Relapse').length + 2, i: Repeat, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'low', label: 'Low', filter: (r: any) => r.level === 'Low' },
          { key: 'mod', label: 'Moderate', filter: (r: any) => r.level === 'Moderate' },
          { key: 'high', label: 'High', filter: (r: any) => r.level === 'High' },
          { key: 'ext', label: 'Extreme', filter: (r: any) => r.level === 'Extreme' },
          { key: 'rd', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
          { key: 'rr', label: 'Recent Relapse', filter: (r: any) => r.status === 'Recent Relapse' },
        ]}
        rows={RELAPSE}
        searchFields={(r: any) => `${r.patient} ${r.triggers}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'l', header: 'Risk', render: r => <Chip label={r.level} t={r.level === 'High' || r.level === 'Extreme' ? 'red' : r.level === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 't', header: 'Triggers', render: r => r.triggers },
          { key: 'fu', header: 'Follow-Up', render: r => r.followup },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Recent Relapse' ? 'red' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Relapse Risk Review" submitLabel="Save Review"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'level', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Extreme'] },
            { k: 'triggers', label: 'Triggers', type: 'textarea' },
            { k: 'signs', label: 'Warning Signs', type: 'textarea' },
            { k: 'plan', label: 'Intervention Plan', type: 'textarea' },
            { k: 'fu', label: 'Follow-Up Date', type: 'date' },
          ]}
          successTitle="Relapse risk review saved" nextStep="Patient flagged; follow-up scheduled."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Relapse Risk · ${selected.patient}`}
          sections={[
            { label: 'Risk History', value: 'Two relapses in past 12 months.' },
            { label: 'Current Risk', value: <Chip label={selected.level} t={selected.level === 'High' ? 'red' : 'amber'} /> },
            { label: 'Triggers', value: selected.triggers },
            { label: 'Prevention Plan', value: selected.plan },
            { label: 'Follow-Up Actions', value: `Next check-in: ${selected.followup}` },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 11. COMMUNITY
// ============================================================
export const CommunityReintegration = () => {
  const [selected, setSelected] = useState<typeof COMMUNITY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Community Reintegration"
        icon={<Home className="h-5 w-5" />}
        title="Community Reintegration"
        desc="Housing, employment, family and community support planning post-rehabilitation."
        ctaLabel="New Reintegration Plan"
        kpis={[
          { l: 'Active Plans', v: COMMUNITY.length + 6, i: Home, tone: 'blue' },
          { l: 'Pending', v: COMMUNITY.filter(c => c.status === 'Pending').length + 2, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: COMMUNITY.filter(c => c.status === 'In Progress').length + 5, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: COMMUNITY.filter(c => c.status === 'Completed').length + 8, i: CheckCircle2, tone: 'green' },
          { l: 'Follow-Up Required', v: COMMUNITY.filter(c => c.status === 'Follow-Up Required').length + 3, i: Repeat, tone: 'amber' },
          { l: 'Community Risk', v: COMMUNITY.filter(c => c.status === 'Community Risk').length + 1, i: ShieldAlert, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'prog', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'fu', label: 'Follow-Up Required', filter: (r: any) => r.status === 'Follow-Up Required' },
          { key: 'risk', label: 'Community Risk', filter: (r: any) => r.status === 'Community Risk' },
        ]}
        rows={COMMUNITY}
        searchFields={(r: any) => `${r.patient} ${r.housing}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'h', header: 'Housing', render: r => r.housing },
          { key: 'e', header: 'Employment', render: r => r.employment },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Community Risk' ? 'red' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Reintegration Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'housing', label: 'Housing Plan', type: 'textarea' },
            { k: 'emp', label: 'Employment Plan', type: 'textarea' },
            { k: 'fam', label: 'Family Support', type: 'textarea' },
            { k: 'com', label: 'Community Support', type: 'textarea' },
            { k: 'fu', label: 'Follow-Up Plan', type: 'textarea' },
          ]}
          successTitle="Reintegration plan created" nextStep="Plan shared with social work and OT teams."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Reintegration · ${selected.patient}`}
          sections={[
            { label: 'Plan', value: 'Stable housing + part-time employment' },
            { label: 'Progress', value: <Chip label={selected.status} t={selected.status === 'Completed' ? 'green' : 'amber'} /> },
            { label: 'Community Visit Notes', value: 'Last visit successful — engaged with NA group.' },
            { label: 'Family Support', value: 'Spouse and parents actively supportive.' },
            { label: 'Outcome Status', value: 'On track for sustained recovery.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 12. INPATIENT
// ============================================================
export const InpatientRehab = () => {
  const [selected, setSelected] = useState<typeof INPATIENT[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Inpatient Rehab"
        icon={<BedDouble className="h-5 w-5" />}
        title="Inpatient Rehabilitation"
        desc="Active inpatient list, bed allocation, daily charts and discharge planning."
        ctaLabel="Admit Patient"
        kpis={[
          { l: 'Active Inpatients', v: INPATIENT.length + 8, i: BedDouble, tone: 'blue' },
          { l: 'New Admissions', v: INPATIENT.filter(i => i.status === 'New').length + 3, i: Plus, tone: 'purple' },
          { l: 'Stable', v: INPATIENT.filter(i => i.status === 'Stable').length + 6, i: CheckCircle2, tone: 'green' },
          { l: 'Watch', v: INPATIENT.filter(i => i.status === 'Watch').length + 2, i: AlertCircle, tone: 'amber' },
          { l: 'Critical', v: INPATIENT.filter(i => i.status === 'Critical').length + 1, i: AlertTriangle, tone: 'red' },
          { l: 'Discharge Planned', v: INPATIENT.filter(i => i.status === 'Discharge Planned').length + 2, i: ScrollText, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'act', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'new', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'stab', label: 'Stable', filter: (r: any) => r.status === 'Stable' },
          { key: 'watch', label: 'Watch', filter: (r: any) => r.status === 'Watch' },
          { key: 'crit', label: 'Critical', filter: (r: any) => r.status === 'Critical' },
          { key: 'disc', label: 'Discharge Planned', filter: (r: any) => r.status === 'Discharge Planned' },
        ]}
        rows={INPATIENT}
        searchFields={(r: any) => `${r.patient} ${r.bed} ${r.program}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'b', header: 'Bed', render: r => r.bed },
          { key: 'pr', header: 'Program', render: r => r.program },
          { key: 'a', header: 'Admitted', render: r => r.admitted },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical' ? 'red' : r.status === 'Watch' ? 'amber' : r.status === 'Stable' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><FileText className="h-3.5 w-3.5 mr-1" /> Chart</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Admit Patient to Inpatient Rehab" submitLabel="Admit"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'bed', label: 'Ward / Bed', type: 'select', options: ['Rehab Ward A', 'Rehab Ward B', 'Detox Unit', 'Halfway House'] },
            { k: 'program', label: 'Rehab Program', type: 'select', options: ['Residential (90-day)', 'Residential (60-day)', 'Detox + Step-down', 'Halfway House'] },
            { k: 'reason', label: 'Admission Reason', type: 'textarea' },
            { k: 'team', label: 'Assigned Team', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Patient admitted" nextStep="Open chart to begin daily notes."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Inpatient Chart · ${selected.patient}`}
          sections={[
            { label: 'Bed', value: selected.bed },
            { label: 'Program', value: selected.program },
            { label: 'Admitted', value: selected.admitted },
            { label: 'Daily Notes', value: 'Cooperative; attended group therapy.' },
            { label: 'Vitals', value: 'BP 128/82 · HR 84' },
            { label: 'Detox Status', value: 'Day 4, CIWA 8 — improving.' },
            { label: 'Therapy Attendance', value: '5/5 sessions this week.' },
            { label: 'Medication', value: 'Diazepam taper · Thiamine OD' },
            { label: 'Rehab Progress', value: 'Engaged; goals on track.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 13. DISCHARGE
// ============================================================
export const DischargeAftercare = () => {
  const [selected, setSelected] = useState<typeof DISCHARGE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Discharge & Aftercare"
        icon={<ScrollText className="h-5 w-5" />}
        title="Discharge & Aftercare"
        desc="Discharge planning, medication, family support, follow-up scheduling and community handover."
        ctaLabel="New Discharge Plan"
        kpis={[
          { l: 'Discharge Plans', v: DISCHARGE.length + 8, i: ScrollText, tone: 'blue' },
          { l: 'Pending', v: DISCHARGE.filter(d => d.status === 'Pending').length + 2, i: AlertCircle, tone: 'amber' },
          { l: 'Aftercare Active', v: DISCHARGE.filter(d => d.status === 'Active Aftercare').length + 6, i: HeartHandshake, tone: 'green' },
          { l: 'Completed', v: DISCHARGE.filter(d => d.status === 'Completed').length + 9, i: CheckCircle2, tone: 'green' },
          { l: 'Follow-Up Required', v: DISCHARGE.filter(d => d.status === 'Follow-Up Required').length + 3, i: Repeat, tone: 'amber' },
          { l: 'Transferred Out', v: 2, i: Send, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'act', label: 'Active Aftercare', filter: (r: any) => r.status === 'Active Aftercare' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'fu', label: 'Follow-Up Required', filter: (r: any) => r.status === 'Follow-Up Required' },
        ]}
        rows={DISCHARGE}
        searchFields={(r: any) => `${r.patient} ${r.plan}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'pl', header: 'Plan', render: r => r.plan },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Follow-Up Required' ? 'amber' : r.status === 'Completed' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Discharge & Aftercare Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'date', label: 'Discharge Date', type: 'date' },
            { k: 'recovery', label: 'Recovery Plan', type: 'textarea' },
            { k: 'meds', label: 'Medication Plan', type: 'textarea' },
            { k: 'fam', label: 'Family Support', type: 'textarea' },
            { k: 'fu', label: 'Follow-Up Schedule', type: 'textarea' },
            { k: 'com', label: 'Community Support', type: 'textarea' },
          ]}
          successTitle="Discharge plan created" nextStep="Aftercare team notified; first follow-up booked."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Discharge · ${selected.patient}`}
          sections={[
            { label: 'Plan Summary', value: selected.plan },
            { label: 'Aftercare Tasks', value: 'Weekly outpatient · AA meeting · Family check-ins' },
            { label: 'Follow-Up Status', value: <Chip label={selected.status} t={selected.status === 'Completed' ? 'green' : 'amber'} /> },
            { label: 'Family Support', value: 'Spouse engaged; emergency contact set.' },
            { label: 'Community Reintegration', value: 'OT and social work referrals active.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 14. FOLLOW-UP
// ============================================================
export const FollowUpCenter = () => {
  const [selected, setSelected] = useState<typeof FOLLOWUPS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Follow-Up Center"
        icon={<Repeat className="h-5 w-5" />}
        title="Follow-Up & Aftercare Reviews"
        desc="Scheduled aftercare, IOP reviews and missed-appointment workflows."
        ctaLabel="Schedule Follow-Up"
        kpis={[
          { l: 'Today', v: FOLLOWUPS.filter(f => f.status === 'Today').length + 4, i: CalendarDays, tone: 'blue' },
          { l: 'Upcoming', v: FOLLOWUPS.filter(f => f.status === 'Upcoming').length + 12, i: CalendarDays, tone: 'purple' },
          { l: 'Missed', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 3, i: AlertTriangle, tone: 'red' },
          { l: 'Completed', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 22, i: CheckCircle2, tone: 'green' },
          { l: 'High-Risk', v: FOLLOWUPS.filter(f => f.risk === 'High').length + 2, i: ShieldAlert, tone: 'red' },
          { l: 'Total (Mo)', v: 56, i: ClipboardList, tone: 'amber' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'today', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'up', label: 'Upcoming', filter: (r: any) => r.status === 'Upcoming' },
          { key: 'miss', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
          { key: 'comp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
        ]}
        rows={FOLLOWUPS}
        searchFields={(r: any) => `${r.patient} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 'risk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Today' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule Follow-Up" submitLabel="Schedule"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Aftercare review', 'IOP review', 'Detox follow-up', 'Therapy review', 'Relapse review', 'Home visit'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'staff', label: 'Staff', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Nurse Olamide', 'Social Work'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Follow-up scheduled" nextStep="Patient added to upcoming list and SMS reminder queued."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Follow-Up · ${selected.patient}`}
          sections={[
            { label: 'Type', value: selected.type },
            { label: 'Date', value: selected.date },
            { label: 'Recovery Status', value: 'Abstinent for 6 weeks' },
            { label: 'Relapse Risk', value: <Chip label={selected.risk} t={selected.risk === 'High' ? 'red' : 'green'} /> },
            { label: 'Notes', value: 'Reports good support; sleeping well.' },
            { label: 'Next Steps', value: 'Continue current plan; review again in 4 weeks.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 15. BILLING & NHIA
// ============================================================
export const AddictionBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Addiction Billing & NHIA"
        desc="Assessment, detox, rehab, therapy, screening and inpatient invoicing with NHIA mapping."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 110, i: CreditCard, tone: 'blue' },
          { l: 'Paid', v: INVOICES.filter(i => i.status === 'Paid').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: INVOICES.filter(i => i.status === 'Pending').length + 18, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA', v: INVOICES.filter(i => i.status === 'NHIA').length + 28, i: ShieldAlert, tone: 'blue' },
          { l: 'Outstanding', v: INVOICES.filter(i => i.status === 'Outstanding').length + 12, i: AlertTriangle, tone: 'red' },
          { l: 'Rehab Bills', v: INVOICES.filter(i => i.status === 'Rehab').length + 22, i: HeartHandshake, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'paid', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pend', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nhia', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' },
          { key: 'out', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'rh', label: 'Rehab', filter: (r: any) => r.status === 'Rehab' },
        ]}
        rows={INVOICES}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.service}`}
        columns={[
          { key: 'id', header: 'Invoice', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 's', header: 'Service', render: r => r.service },
          { key: 'a', header: 'Amount', render: r => formatCurrency(r.amount) },
          { key: 'n', header: 'NHIA', render: r => r.nhia },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Paid' ? 'green' : r.status === 'Outstanding' ? 'red' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Invoice" submitLabel="Create Invoice"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'service', label: 'Service Type', type: 'select', options: SERVICE_TYPES },
            { k: 'amount', label: 'Amount (₦)', type: 'number' },
            { k: 'nhia', label: 'NHIA Status', type: 'select', options: ['Approved', 'Pending', 'Rejected', '—'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Invoice created" nextStep="Send to cashier or print receipt."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Invoice · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Service', value: selected.service },
            { label: 'Amount', value: formatCurrency(selected.amount) },
            { label: 'NHIA', value: selected.nhia },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Paid' ? 'green' : 'amber'} /> },
            { label: 'Issued', value: '2026-06-02' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Invoice printed', message: selected.id })}><Printer className="h-4 w-4 mr-1" /> Print Invoice</Button>
              <Button variant="outline" onClick={() => notify({ title: 'PDF downloaded', message: `${selected.id}.pdf` })}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Invoice marked paid', message: selected.id, nextStep: 'Receipt posted to ledger.' }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Paid</Button>
            </>
          }
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 16. REPORTING CENTER
// ============================================================
export const ReportingCenter = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '7d', notes: '' });
  const TYPES = ['Addiction Assessment Report', 'ASI Report', 'Detox Report', 'Rehabilitation Report', 'Relapse Report', 'Community Reintegration Report', 'Billing Report', 'Follow-Up Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Addiction Reporting Center"
        desc="Generate clinical, ASI, detox, rehab, relapse, community, billing and follow-up reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 96, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 4, i: AlertCircle, tone: 'amber' },
        { l: 'ASI Reports', v: 18, i: Brain, tone: 'purple' },
        { l: 'Detox Reports', v: 14, i: Syringe, tone: 'rose' },
        { l: 'Rehab Reports', v: 22, i: HeartHandshake, tone: 'green' },
        { l: 'Relapse Reports', v: 12, i: ShieldAlert, tone: 'amber' },
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
              notify({ title: 'Report generated', message: `${f.type} ready for preview.`, nextStep: 'Print, download PDF or export CSV.' });
            }}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <Dialog open onOpenChange={v => !v && setPreview(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Addiction Services · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Cases</div><div className="font-semibold text-lg">214</div></div>
                  <div><div className="text-xs text-muted-foreground">Detox Patients</div><div className="font-semibold text-lg">22</div></div>
                  <div><div className="text-xs text-muted-foreground">Therapy Sessions</div><div className="font-semibold text-lg">168</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(4620000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Cannabis + Tramadol remains the top presentation (32%)</li>
                  <li>Detox completion rate improved to 78% this period</li>
                  <li>14 relapse alerts active across all programs</li>
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
// 17. COMMUNICATION CENTER
// ============================================================
export const CommunicationCenter = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'psy', l: 'Psychology' }, { k: 'nur', l: 'Nurse' },
    { k: 'lab', l: 'Lab' }, { k: 'phm', l: 'Pharmacy' }, { k: 'sw', l: 'Social Work' }, { k: 'ot', l: 'OT' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', psy: 'psychology', nur: 'nurse', lab: 'laboratory', phm: 'pharmacy', sw: 'social', ot: 'occupational' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Addiction Communication Center"
        desc="Secure messaging with Doctor, Psychology, Nurse, Laboratory, Pharmacy, Social Work and OT — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Patient-linked', v: THREADS.length, i: Users, tone: 'purple' },
        { l: 'Attachments', v: 14, i: Paperclip, tone: 'blue' },
        { l: 'Active Staff', v: 22, i: Users, tone: 'green' },
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
                <div className="text-[11px] text-muted-foreground">{t.dept} · {t.patient}</div>
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
              <div className="text-xs text-muted-foreground">{active.dept} · Patient: {active.patient}</div>
            </div>
            <div className="flex gap-2">
              {active.urgent && <Chip label="Urgent" t="red" />}
              <Button size="sm" variant="outline" onClick={() => notify({ title: 'Thread archived', message: active.with })}>Archive</Button>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-[50vh] overflow-y-auto bg-muted/20">
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>{active.preview}</div></div>
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — adding to the chart now.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest UDS result.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'uds-result.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 18. CRITICAL ALERTS
// ============================================================
export const AddictionAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'crit', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'hi', l: 'High Risk', f: (a: any) => a.status === 'High Risk' },
    { k: 'rel', l: 'Relapse', f: (a: any) => a.status === 'Relapse' },
    { k: 'det', l: 'Detox', f: (a: any) => a.status === 'Detox' },
    { k: 'ov', l: 'Overdue', f: (a: any) => a.status === 'Overdue' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Addiction Alerts"
        desc="Withdrawal severity, suicidal ideation, missed detox monitoring, relapse, overdose risk and overdue follow-ups." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length, i: AlertTriangle, tone: 'red' },
        { l: 'High-Risk Alerts', v: ALERTS.filter(a => a.status === 'High Risk').length, i: ShieldAlert, tone: 'red' },
        { l: 'Relapse Alerts', v: ALERTS.filter(a => a.status === 'Relapse').length, i: Repeat, tone: 'amber' },
        { l: 'Detox Alerts', v: ALERTS.filter(a => a.status === 'Detox').length, i: Syringe, tone: 'rose' },
        { l: 'Overdue Follow-Ups', v: ALERTS.filter(a => a.status === 'Overdue').length, i: CalendarDays, tone: 'amber' },
        { l: 'Acknowledged', v: ALERTS.filter(a => a.status === 'Acknowledged').length, i: CheckCircle2, tone: 'green' },
      ]} />
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto mb-3">{TABS.map(t => <TabsTrigger key={t.k} value={t.k}>{t.l}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab}>
            <div className="space-y-2">
              {filtered.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">No alerts match this filter.</div> :
                filtered.map(a => (
                  <div key={a.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                    <div>
                      <div className="text-sm font-semibold">{a.patient} — {a.type}</div>
                      <div className="text-xs text-muted-foreground">Flagged {a.date} · {a.message}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'High Risk' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to on-call psychiatrist.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
                      <Button size="sm" onClick={() => nav(`${base}/assessments`)}><Users className="h-3.5 w-3.5 mr-1" /> Open Patient</Button>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      {node}
    </Shell>
  );
};

// ============================================================
// 19. RESEARCH (lightweight)
// ============================================================
export const ResearchStatistics = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Addiction Analytics"
      desc="Substance trends, completion and abstinence rates, relapse statistics and program outcomes." />
    <KpiGrid items={[
      { l: 'Cannabis (YTD)', v: 128, i: BarChart3, tone: 'amber' },
      { l: 'Opioids (YTD)', v: 94, i: BarChart3, tone: 'red' },
      { l: 'Alcohol (YTD)', v: 76, i: BarChart3, tone: 'green' },
      { l: 'Methamphetamine', v: 31, i: BarChart3, tone: 'red' },
      { l: 'Completion Rate', v: '64%', i: TrendingUp, tone: 'green' },
      { l: '90-day Abstinence', v: '52%', i: TrendingUp, tone: 'green' },
    ]} />
  </Shell>
);

// ============================================================
// 20. MOBILE
// ============================================================
export const AddictionMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for assessments, detox charting, therapy sessions and follow-ups across desktop, tablet, mobile and PWA." />
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

// ============================================================
// 21. CONFIG
// ============================================================
export const AddictionConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Addiction Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Addiction Configuration"
        desc="Manage assessment templates, ASI tools, detox protocols, rehab program presets, NHIA service mapping and report templates." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Assessment Templates', 'ASI Tool Configuration', 'Detox Protocols',
          'Rehab Program Presets', 'Therapy Templates', 'Family Session Templates',
          'Occupational Program Catalogue', 'Drug Screening Panels', 'NHIA Service Mapping',
          'Discharge Templates', 'Follow-Up Templates', 'Report Templates',
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
