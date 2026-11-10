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
  Activity, BookOpen, ScrollText, BarChart3, CreditCard, MessageSquare, Smartphone,
  Settings2, AlertTriangle, FileText, Repeat, Home, UsersRound, BedDouble, Stethoscope,
  Brain, Send, CheckCircle2, Search, Printer, Download, Eye, Bell, Plus, Paperclip,
  AlertCircle, Baby, MapPin, HandHeart, UserSearch, Gavel, DoorOpen, Briefcase,
  WifiOff, TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/socialwork';

export const socialWorkNav = [
  { label: 'Social Work Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Referral Center', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Social Assessment', path: `${base}/assessments`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Family Assessment', path: `${base}/family`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Home Visits', path: `${base}/home-visits`, icon: <MapPin className="h-4 w-4" /> },
  { label: 'Community Reintegration', path: `${base}/reintegration`, icon: <Home className="h-4 w-4" /> },
  { label: 'Trial Leave', path: `${base}/trial-leave`, icon: <DoorOpen className="h-4 w-4" /> },
  { label: 'Discharge & Aftercare', path: `${base}/discharge`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Child Welfare', path: `${base}/child`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Elder Welfare', path: `${base}/elder`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Addiction Recovery', path: `${base}/addiction`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Court & Legal Liaison', path: `${base}/legal`, icon: <Gavel className="h-4 w-4" /> },
  { label: 'Abandoned & Vulnerable', path: `${base}/vulnerable`, icon: <UserSearch className="h-4 w-4" /> },
  { label: 'Welfare & Support', path: `${base}/welfare`, icon: <HandHeart className="h-4 w-4" /> },
  { label: 'Community Follow-Up', path: `${base}/community`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Vocational Reintegration', path: `${base}/vocational`, icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Activity className="h-4 w-4" /> },
  { label: 'EMR Timeline', path: `${base}/timeline`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Offline & Sync', path: `${base}/offline`, icon: <WifiOff className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Social Work Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={socialWorkNav} title={`Social Work · ${title}`}>{children}</DashboardLayout>
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
// Dummy data — GFA HMS Social Work
// ============================================================
const PATIENTS = [
  { id: 'SW-2026-001', name: 'Mr. Chidi Eze', age: 41, sex: 'M', dx: 'Schizophrenia — relapse' },
  { id: 'SW-2026-002', name: 'Master Tunde Bakare', age: 7, sex: 'M', dx: 'Autism — school issues' },
  { id: 'SW-2026-003', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Dementia — neglect concern' },
  { id: 'SW-2026-004', name: 'Mr. Yusuf Aliyu', age: 32, sex: 'M', dx: 'Opioid use disorder' },
  { id: 'SW-2026-005', name: 'Mrs. Funke Adeyemi', age: 36, sex: 'F', dx: 'Bipolar I — stable' },
  { id: 'SW-2026-006', name: 'Jane Doe 042', age: 28, sex: 'F', dx: 'Acute psychosis — unknown ID' },
  { id: 'SW-2026-007', name: 'Master Bolu Ajayi', age: 9, sex: 'M', dx: 'ADHD — school exclusion' },
  { id: 'SW-2026-008', name: 'Pa Tunde Akinola', age: 84, sex: 'M', dx: 'Late dementia — long stay' },
  { id: 'SW-2026-009', name: 'Mr. Ibrahim Musa', age: 38, sex: 'M', dx: 'Schizoaffective — trial leave' },
  { id: 'SW-2026-010', name: 'Miss Halima Yusuf', age: 5, sex: 'F', dx: 'Suspected neglect' },
];

const REFERRALS = [
  { id: 'SWR-001', patient: 'Mr. Chidi Eze', from: 'Psychiatry — Dr. Balogun', reason: 'Discharge planning + family support', priority: 'High', status: 'Accepted', assigned: 'SW. Bukola' },
  { id: 'SWR-002', patient: 'Master Tunde Bakare', from: 'CAP — Dr. Aluko', reason: 'Child welfare — school liaison', priority: 'Medium', status: 'Accepted', assigned: 'SW. Tope' },
  { id: 'SWR-003', patient: 'Pa Adebayo Odunsi', from: 'Psychogeriatrics — Dr. Sowemimo', reason: 'Caregiver assessment + elder protection', priority: 'High', status: 'Accepted', assigned: 'SW. Bukola' },
  { id: 'SWR-004', patient: 'Mr. Yusuf Aliyu', from: 'Addiction — Dr. Adesina', reason: 'Recovery housing + reintegration', priority: 'High', status: 'Accepted', assigned: 'SW. Kunle' },
  { id: 'SWR-005', patient: 'Mrs. Funke Adeyemi', from: 'Nursing — Ward A', reason: 'Trial leave preparation', priority: 'Medium', status: 'Pending', assigned: '—' },
  { id: 'SWR-006', patient: 'Jane Doe 042', from: 'A&E — Dr. Okafor', reason: 'Abandoned patient — family tracing', priority: 'High', status: 'Accepted', assigned: 'SW. Tope' },
  { id: 'SWR-007', patient: 'Master Bolu Ajayi', from: 'CAP — Dr. Aluko', reason: 'ADHD school + parent support', priority: 'Low', status: 'Pending', assigned: '—' },
  { id: 'SWR-008', patient: 'Pa Tunde Akinola', from: 'Psychogeriatrics', reason: 'Long-stay community placement', priority: 'Medium', status: 'Completed', assigned: 'SW. Bukola' },
];

const ASSESSMENTS = [
  { id: 'SA-001', patient: 'Mr. Chidi Eze', type: 'Psychosocial Assessment', officer: 'SW. Bukola', status: 'In Progress', risk: 'Moderate', flag: 'FU' },
  { id: 'SA-002', patient: 'Pa Adebayo Odunsi', type: 'Family Assessment', officer: 'SW. Bukola', status: 'In Progress', risk: 'High', flag: 'FU' },
  { id: 'SA-003', patient: 'Master Tunde Bakare', type: 'Welfare Assessment', officer: 'SW. Tope', status: 'Completed', risk: 'Low', flag: '—' },
  { id: 'SA-004', patient: 'Mr. Yusuf Aliyu', type: 'Reintegration Assessment', officer: 'SW. Kunle', status: 'Pending', risk: 'Moderate', flag: 'New' },
  { id: 'SA-005', patient: 'Jane Doe 042', type: 'Community Assessment', officer: 'SW. Tope', status: 'In Progress', risk: 'High', flag: 'FU' },
  { id: 'SA-006', patient: 'Mrs. Funke Adeyemi', type: 'Economic Assessment', officer: 'SW. Bukola', status: 'Completed', risk: 'Low', flag: '—' },
  { id: 'SA-007', patient: 'Miss Halima Yusuf', type: 'Psychosocial Assessment', officer: 'SW. Tope', status: 'Pending', risk: 'High', flag: 'New' },
];
const ASSESSMENT_TYPES = [
  'Psychosocial Assessment', 'Family Assessment', 'Economic Assessment',
  'Community Assessment', 'Welfare Assessment', 'Reintegration Assessment',
];

const FAMILY = [
  { id: 'FA-001', patient: 'Mr. Chidi Eze', structure: 'Nuclear — wife + 3 kids', dynamics: 'Strained — stigma', support: 'Moderate Support', risks: 'Income loss', plan: 'Family counselling × 6' },
  { id: 'FA-002', patient: 'Master Tunde Bakare', structure: 'Extended — grandparents', dynamics: 'Supportive', support: 'Strong Support', risks: 'School exclusion', plan: 'School liaison + parent training' },
  { id: 'FA-003', patient: 'Pa Adebayo Odunsi', structure: 'Single — niece caregiver', dynamics: 'Caregiver burnout', support: 'Weak Support', risks: 'Neglect concern', plan: 'Respite + caregiver support' },
  { id: 'FA-004', patient: 'Mr. Yusuf Aliyu', structure: 'Nuclear — wife only', dynamics: 'Rebuilding trust', support: 'Moderate Support', risks: 'Relapse triggers', plan: 'Couple counselling × 4' },
  { id: 'FA-005', patient: 'Mrs. Funke Adeyemi', structure: 'Nuclear — husband + 2 kids', dynamics: 'Stable', support: 'Strong Support', risks: 'None', plan: 'Trial leave monitoring' },
  { id: 'FA-006', patient: 'Mr. Ibrahim Musa', structure: 'Polygamous — extended', dynamics: 'Conflict', support: 'High Risk', risks: 'Conflict + stigma', plan: 'Family mediation' },
  { id: 'FA-007', patient: 'Master Bolu Ajayi', structure: 'Single parent — mother', dynamics: 'Conflict over discipline', support: 'Conflict Cases', risks: 'Corporal punishment', plan: 'Parent training + advocacy' },
];

const HOME_VISITS = [
  { id: 'HV-001', patient: 'Pa Adebayo Odunsi', visitor: 'SW. Bukola', date: '2026-06-03 10:00', address: 'Ijaiye, Abeokuta', purpose: 'Elder neglect investigation', status: 'Scheduled' },
  { id: 'HV-002', patient: 'Mr. Chidi Eze', visitor: 'SW. Bukola', date: '2026-06-04 11:30', address: 'Adatan, Abeokuta', purpose: 'Discharge readiness check', status: 'Scheduled' },
  { id: 'HV-003', patient: 'Master Tunde Bakare', visitor: 'SW. Tope', date: '2026-06-05 09:00', address: 'Lafenwa, Abeokuta', purpose: 'Home + school environment review', status: 'Pending' },
  { id: 'HV-004', patient: 'Mr. Yusuf Aliyu', visitor: 'SW. Kunle', date: '2026-05-30 14:00', address: 'Kuto, Abeokuta', purpose: 'Recovery housing safety', status: 'Completed' },
  { id: 'HV-005', patient: 'Mrs. Funke Adeyemi', visitor: 'SW. Bukola', date: '2026-06-06 10:00', address: 'Asero, Abeokuta', purpose: 'Trial leave monitoring', status: 'Scheduled' },
  { id: 'HV-006', patient: 'Jane Doe 042', visitor: 'SW. Tope', date: '2026-06-02 12:00', address: 'Sapon Market, Abeokuta', purpose: 'Family tracing visit', status: 'High Risk' },
  { id: 'HV-007', patient: 'Pa Tunde Akinola', visitor: 'SW. Kunle', date: '2026-05-28 09:00', address: 'Obantoko, Abeokuta', purpose: 'Long-stay placement check', status: 'Missed' },
];

const REINTEGRATION = [
  { id: 'CR-001', patient: 'Mr. Chidi Eze', kind: 'Family Reintegration', readiness: '70%', stage: 'Active' },
  { id: 'CR-002', patient: 'Mr. Yusuf Aliyu', kind: 'Employment', readiness: '60%', stage: 'Active' },
  { id: 'CR-003', patient: 'Mrs. Funke Adeyemi', kind: 'Family Reintegration', readiness: '85%', stage: 'Completed' },
  { id: 'CR-004', patient: 'Master Bolu Ajayi', kind: 'Community Placement', readiness: '75%', stage: 'Active' },
  { id: 'CR-005', patient: 'Pa Tunde Akinola', kind: 'Community Placement', readiness: '40%', stage: 'Active' },
  { id: 'CR-006', patient: 'Mr. Sola Adebayo', kind: 'Employment', readiness: '95%', stage: 'Completed' },
];

const TRIAL_LEAVE = [
  { id: 'TL-001', patient: 'Mrs. Funke Adeyemi', start: '2026-05-30', end: '2026-06-13', relative: 'Mr. Adeyemi (husband)', schedule: 'Weekly call + visit Day 7', status: 'Active' },
  { id: 'TL-002', patient: 'Mr. Chidi Eze', start: '2026-06-08', end: '2026-06-22', relative: 'Mrs. Eze (wife)', schedule: 'Day 3, 7, 14 reviews', status: 'Pending' },
  { id: 'TL-003', patient: 'Mr. Sola Adebayo', start: '2026-05-15', end: '2026-05-29', relative: 'Brother — Akin', schedule: 'Completed', status: 'Completed' },
  { id: 'TL-004', patient: 'Mr. Ibrahim Musa', start: '2026-05-20', end: '2026-06-03', relative: 'Father — Alhaji Musa', schedule: 'Overdue return', status: 'Failed' },
  { id: 'TL-005', patient: 'Master Bolu Ajayi', start: '2026-06-10', end: '2026-06-17', relative: 'Mother — Mrs. Ajayi', schedule: 'Pending approval', status: 'Pending' },
  { id: 'TL-006', patient: 'Mr. Femi Ojo', start: '2026-06-12', end: '2026-06-19', relative: 'Sister — Mrs. Olaolu', schedule: 'Awaiting MDT review', status: 'Review Required' },
];

const DISCHARGE = [
  { id: 'DC-001', patient: 'Mr. Chidi Eze', readiness: '70%', housing: 'Family home', employment: 'Pending', followup: 'Weekly × 4', status: 'Active' },
  { id: 'DC-002', patient: 'Mr. Yusuf Aliyu', readiness: '60%', housing: 'Recovery house', employment: 'Mechanic training', followup: 'Bi-weekly × 8', status: 'Active' },
  { id: 'DC-003', patient: 'Mrs. Funke Adeyemi', readiness: '85%', housing: 'Family home', employment: 'Returning to school', followup: 'Monthly × 6', status: 'Pending' },
  { id: 'DC-004', patient: 'Pa Tunde Akinola', readiness: '40%', housing: 'Community placement pending', employment: 'N/A', followup: 'Home visits', status: 'Community Placement' },
  { id: 'DC-005', patient: 'Mr. Sola Adebayo', readiness: '100%', housing: 'Family home', employment: 'Resumed teaching', followup: 'Quarterly', status: 'Completed' },
  { id: 'DC-006', patient: 'Master Tunde Bakare', readiness: '80%', housing: 'Family home', employment: 'School', followup: 'Weekly', status: 'Follow-Up Due' },
];

const CHILD = [
  { id: 'CW-001', child: 'Master Tunde Bakare', age: 7, concern: 'School exclusion + bullying', risk: 'Moderate Risk', plan: 'School liaison + advocacy' },
  { id: 'CW-002', child: 'Miss Halima Yusuf', age: 5, concern: 'Suspected neglect — malnourished', risk: 'High Risk', plan: 'Welfare investigation + ARO referral' },
  { id: 'CW-003', child: 'Master Bolu Ajayi', age: 9, concern: 'ADHD + corporal punishment at school', risk: 'Moderate Risk', plan: 'School + parent education' },
  { id: 'CW-004', child: 'Miss Adaeze Nnamdi', age: 5, concern: 'CP — family resource gap', risk: 'High Risk', plan: 'NGO support + therapy' },
  { id: 'CW-005', child: 'Master Femi Lawal', age: 8, concern: 'School refusal', risk: 'Low Risk', plan: 'School Support' },
  { id: 'CW-006', child: 'Miss Sade Aliyu', age: 6, concern: 'Suspected physical abuse', risk: 'Abuse Concerns', plan: 'Child welfare report + safeguarding' },
];

const ELDER = [
  { id: 'EW-001', patient: 'Pa Adebayo Odunsi', concern: 'Caregiver burnout + neglect', risk: 'High Risk', plan: 'Respite + caregiver support' },
  { id: 'EW-002', patient: 'Pa Tunde Akinola', concern: 'Abandoned by family', risk: 'Neglect', plan: 'Long-stay welfare + tracing' },
  { id: 'EW-003', patient: 'Mama Bisi Adekunle', concern: 'Financial exploitation suspected', risk: 'Moderate Risk', plan: 'Legal + welfare review' },
  { id: 'EW-004', patient: 'Pa Yusuf Garba', concern: 'Caregiver requesting respite', risk: 'Caregiver Support', plan: 'Caregiver counselling + respite plan' },
  { id: 'EW-005', patient: 'Ma Salamatu Bello', concern: 'Living alone, mild dementia', risk: 'Low Risk', plan: 'Community follow-up' },
];

const ADDICTION = [
  { id: 'AS-001', patient: 'Mr. Yusuf Aliyu', stage: 'Community', focus: 'Recovery housing + employment', stability: 'Moderate' },
  { id: 'AS-002', patient: 'Mr. Sola Adebayo', stage: 'Community', focus: 'Peer support + family', stability: 'Stable' },
  { id: 'AS-003', patient: 'Mr. Kunle Adeola', stage: 'Employment', focus: 'NA group + mentor', stability: 'Stable' },
  { id: 'AS-004', patient: 'Mr. Femi Ojo', stage: 'High Relapse Risk', focus: 'Crisis support + housing review', stability: 'High Relapse Risk' },
  { id: 'AS-005', patient: 'Mr. Tunde Ade', stage: 'Stable', focus: 'NA + family check-ins', stability: 'Stable' },
];

const LEGAL = [
  { id: 'LG-001', patient: 'Mr. Femi Ojo', court: 'Abeokuta Magistrate Court 3', date: '2026-06-09', kind: 'Forensic social report', status: 'Pending' },
  { id: 'LG-002', patient: 'Mr. Ibrahim Musa', court: 'Ogun State High Court', date: '2026-06-14', kind: 'Mental health expert report', status: 'Pending' },
  { id: 'LG-003', patient: 'Miss Halima Yusuf', court: 'Child Welfare Committee', date: '2026-06-05', kind: 'Child protection report', status: 'Submitted' },
  { id: 'LG-004', patient: 'Jane Doe 042', court: 'NHRC referral', date: '2026-06-12', kind: 'Vulnerable adult report', status: 'Pending' },
  { id: 'LG-005', patient: 'Mr. Sola Adebayo', court: 'Family Court', date: '2026-06-18', kind: 'Custody assessment', status: 'Court Cases' },
  { id: 'LG-006', patient: 'Mr. Yusuf Aliyu', court: 'Drug Rehab Tribunal', date: '2026-06-20', kind: 'Aftercare compliance review', status: 'Follow-Up' },
];

const VULNERABLE = [
  { id: 'VP-001', patient: 'Jane Doe 042', status: 'Active', stage: 'Family tracing — Day 4' },
  { id: 'VP-002', patient: 'John Doe 029', status: 'Placement Pending', stage: 'Welfare placement' },
  { id: 'VP-003', patient: 'Pa Tunde Akinola', status: 'Active', stage: 'Community placement search' },
  { id: 'VP-004', patient: 'Mr. Adekunle (Walk-in)', status: 'Emergency', stage: 'Shelter referral' },
  { id: 'VP-005', patient: 'Miss Folake (Found)', status: 'New', stage: 'Intake' },
  { id: 'VP-006', patient: 'Mr. Mohammed Sani', status: 'Resolved', stage: 'Reunited with family' },
];

const WELFARE = [
  { id: 'WS-001', patient: 'Mrs. Eze (for Chidi)', request: 'Transport fare support', amount: 8000, status: 'Approved', source: 'GFA HMS Welfare Fund' },
  { id: 'WS-002', patient: 'Miss Adaeze (mother)', request: 'Therapeutic feeds top-up', amount: 25000, status: 'Approved', source: 'Hope Alive NGO' },
  { id: 'WS-003', patient: 'Jane Doe 042', request: 'Clothing + toiletries', amount: 12000, status: 'Approved', source: 'GFA HMS Welfare Fund' },
  { id: 'WS-004', patient: 'Mr. Aliyu (recovery)', request: 'Vocational tools (mechanic)', amount: 45000, status: 'Pending', source: 'Reach Out NGO' },
  { id: 'WS-005', patient: 'Master Bakare (parents)', request: 'School fee support', amount: 30000, status: 'Pending', source: 'TETFund partner' },
  { id: 'WS-006', patient: 'Mrs. Bisi (elder)', request: 'Emergency feeding grant', amount: 18000, status: 'Emergency', source: 'GFA HMS Welfare Fund' },
  { id: 'WS-007', patient: 'Mr. Femi (relapse)', request: 'Housing deposit', amount: 60000, status: 'Rejected', source: 'NGO partner' },
  { id: 'WS-008', patient: 'Pa Odunsi (caregiver)', request: 'Respite care funding', amount: 22000, status: 'New', source: 'GFA Welfare' },
];

const COMMUNITY = [
  { id: 'CF-001', patient: 'Mr. Sola Adebayo', date: '2026-06-08', kind: 'Community review', compliance: 'Compliant' },
  { id: 'CF-002', patient: 'Mr. Kunle Adeola', date: '2026-06-10', kind: 'Medication compliance check', compliance: 'Compliant' },
  { id: 'CF-003', patient: 'Mr. Ibrahim Musa', date: '2026-05-29', kind: 'Risk monitoring (overdue)', compliance: 'Missed' },
  { id: 'CF-004', patient: 'Mrs. Bisi Akande', date: '2026-06-12', kind: 'Family monitoring', compliance: 'Partial' },
  { id: 'CF-005', patient: 'Master Bolu Ajayi', date: '2026-06-15', kind: 'School + home review', compliance: 'Non-Compliant' },
  { id: 'CF-006', patient: 'Mr. Femi Ojo', date: '2026-06-16', kind: 'Relapse monitoring', compliance: 'High Risk' },
];

const VOCATIONAL = [
  { id: 'VR-001', patient: 'Mr. Yusuf Aliyu', track: 'Mechanic apprenticeship', partner: 'NDE — Abeokuta', progress: '40%', status: 'Active Placement' },
  { id: 'VR-002', patient: 'Mr. Kunle Adeola', track: 'Tailoring vocational', partner: 'ITF partner', progress: '70%', status: 'Skills Training' },
  { id: 'VR-003', patient: 'Mrs. Funke Adeyemi', track: 'Returning to NCE school', partner: 'OOU Open School', progress: '20%', status: 'Employment Ready' },
  { id: 'VR-004', patient: 'Mr. Sola Adebayo', track: 'Teaching reinstatement', partner: 'SUBEB Ogun', progress: '100%', status: 'Completed' },
  { id: 'VR-005', patient: 'Mr. Femi Ojo', track: 'Catering training', partner: 'Skill Up NGO', progress: '55%', status: 'Follow-Up' },
];

const FOLLOWUPS = [
  { id: 'FU-SW-001', patient: 'Mrs. Funke Adeyemi', type: 'Trial leave Day 7 review', date: '2026-06-06', status: 'Confirmed' },
  { id: 'FU-SW-002', patient: 'Mr. Ibrahim Musa', type: 'Overdue return — urgent', date: '2026-06-03', status: 'Missed' },
  { id: 'FU-SW-003', patient: 'Pa Adebayo Odunsi', type: 'Elder protection review', date: '2026-06-09', status: 'Pending' },
  { id: 'FU-SW-004', patient: 'Master Bakare family', type: 'Family counselling', date: '2026-06-11', status: 'Confirmed' },
  { id: 'FU-SW-005', patient: 'Mr. Yusuf Aliyu', type: 'Recovery housing check', date: '2026-06-13', status: 'Rescheduled' },
  { id: 'FU-SW-006', patient: 'Mr. Sola Adebayo', type: 'Community review', date: '2026-05-28', status: 'Completed' },
];

const SERVICE_TYPES = [
  'Social Assessment', 'Home Visit', 'Reintegration Plan',
  'Welfare Support', 'Trial Leave Review', 'Family Assessment',
];

const INVOICES = [
  { id: 'INV-SW-501', patient: 'Mr. Chidi Eze', service: 'Family assessment + 2 visits', amount: 28000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-SW-502', patient: 'Pa Adebayo Odunsi', service: 'Elder protection investigation', amount: 18000, nhia: 'Approved', status: 'NHIA' },
  { id: 'INV-SW-503', patient: 'Mr. Femi Ojo', service: 'Forensic court report', amount: 18000, nhia: 'N/A', status: 'Pending' },
  { id: 'INV-SW-504', patient: 'Mr. Yusuf Aliyu', service: 'Reintegration + 4 visits', amount: 32000, nhia: 'N/A', status: 'Outstanding' },
  { id: 'INV-SW-505', patient: 'Mrs. Funke Adeyemi', service: 'Trial leave review × 3', amount: 15000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-SW-506', patient: 'Jane Doe 042', service: 'Welfare disbursement + tracing', amount: 22000, nhia: 'N/A', status: 'Welfare' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Balogun (Psychiatry)', dept: 'Doctor', patient: 'Mr. Chidi Eze', preview: 'Family ready, please confirm Friday discharge plan.', time: '09:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Nurse Blessing (Ward A)', dept: 'Nursing', patient: 'Mrs. Funke Adeyemi', preview: 'Day 7 trial leave review confirmed for tomorrow.', time: '10:00', unread: 1, urgent: false },
  { id: 'TH-3', with: 'Dr. Aluko (Child Psychiatry)', dept: 'Child Psychiatry', patient: 'Master Tunde Bakare', preview: 'School liaison letter signed — please dispatch.', time: '11:15', unread: 0, urgent: false },
  { id: 'TH-4', with: 'Dr. Sowemimo (Psychogeriatrics)', dept: 'Psychogeriatrics', patient: 'Pa Adebayo Odunsi', preview: 'Elder protection — niece notified, awaiting visit.', time: '12:00', unread: 1, urgent: true },
  { id: 'TH-5', with: 'Dr. Adesina (Addiction)', dept: 'Addiction Services', patient: 'Mr. Yusuf Aliyu', preview: 'Vocational placement confirmed at NDE.', time: '13:20', unread: 0, urgent: false },
  { id: 'TH-6', with: 'TR. Adesina (OT)', dept: 'Occupational Therapy', patient: 'Mr. Yusuf Aliyu', preview: 'Joint vocational reintegration plan ready.', time: 'Yesterday', unread: 0, urgent: false },
  { id: 'TH-7', with: 'PT. Bukola (Physiotherapy)', dept: 'Physiotherapy', patient: 'Pa Tunde Akinola', preview: 'Mobility plan for long-stay placement.', time: '2d', unread: 0, urgent: false },
  { id: 'TH-8', with: 'SLT. Mojisola (Speech)', dept: 'Speech Therapy', patient: 'Master Tunde Bakare', preview: 'PECS progress note attached.', time: '2d', unread: 0, urgent: false },
  { id: 'TH-9', with: 'Dr. Aisha (Psychology)', dept: 'Psychology', patient: 'Mrs. Funke Adeyemi', preview: 'CBT continuation aligned with trial leave.', time: '3d', unread: 0, urgent: false },
  { id: 'TH-10', with: 'Welfare Office', dept: 'Welfare Office', patient: 'Jane Doe 042', preview: 'Clothing kit disbursed — receipt attached.', time: '3d', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-1', patient: 'Mr. Ibrahim Musa', type: 'Trial leave overdue (24h)', message: 'Contact family + escalate to Psychiatry.', date: '2026-06-03', status: 'Critical' },
  { id: 'AL-2', patient: 'Miss Halima Yusuf', type: 'Child neglect — confirmed', message: 'File child welfare report.', date: '2026-06-03', status: 'Child Protection' },
  { id: 'AL-3', patient: 'Pa Adebayo Odunsi', type: 'Elder neglect — investigation', message: 'Home visit + caregiver review.', date: '2026-06-02', status: 'Elder Protection' },
  { id: 'AL-4', patient: 'Jane Doe 042', type: 'Abandoned patient — Day 4', message: 'Family tracing + NHRC referral.', date: '2026-06-02', status: 'Abandonment' },
  { id: 'AL-5', patient: 'Mrs. Eze (transport)', type: 'Welfare emergency', message: 'Funds released — confirm receipt.', date: '2026-06-01', status: 'Welfare Emergency' },
  { id: 'AL-6', patient: 'Mr. Sola Adebayo', type: 'Routine ack', message: 'Acknowledged and closed.', date: '2026-05-30', status: 'Acknowledged' },
];

// ============================================================
// Helpers
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

const FilterBar = ({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) => (
  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
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

type Field = { k: string; label: string; type: 'text' | 'textarea' | 'select' | 'date' | 'time' | 'number' | 'patientPicker'; options?: string[]; placeholder?: string };
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
                    <Input type={fd.type === 'date' ? 'date' : fd.type === 'time' ? 'time' : fd.type === 'number' ? 'number' : 'text'} value={f[fd.k] || ''} onChange={e => setF({ ...f, [fd.k]: e.target.value })} placeholder={fd.placeholder} />
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
            <Button onClick={() => setOpenNew(true)}><FilePlus className="h-4 w-4 mr-1" />{props.ctaLabel}</Button>
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

const openBtn = (onClick: () => void, label = 'Open') => (
  <Button size="sm" variant="outline" onClick={onClick}><Eye className="h-3.5 w-3.5 mr-1" /> {label}</Button>
);

type GenericProps = {
  shellTitle: string; icon: ReactNode; title: string; desc: string; ctaLabel: string;
  kpis: any[]; tabKey: string; tabs: { key: string; label: string; value?: string }[];
  rows: any[]; columns: Col<any>[]; searchFields: (r: any) => string;
  modalFields: Field[]; successTitle: string; nextStep?: string;
};
function SpecialisedPage(p: GenericProps) {
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <WorkflowPage
        shellTitle={p.shellTitle} icon={p.icon} title={p.title} desc={p.desc} ctaLabel={p.ctaLabel}
        kpis={p.kpis}
        tabs={p.tabs.map(t => ({
          key: t.key, label: t.label,
          filter: (r: any) => t.key === 'all' ? true : r[p.tabKey] === (t.value ?? t.label),
        }))}
        rows={p.rows}
        searchFields={p.searchFields}
        columns={p.columns}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title={p.ctaLabel} submitLabel="Save"
          fields={p.modalFields}
          successTitle={p.successTitle} nextStep={p.nextStep} />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`${p.shellTitle} · ${selected.patient || selected.child || selected.id}`}
          sections={p.columns.map(c => ({ label: c.header, value: c.render(selected) }))}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
}

// ============================================================
// 1. DASHBOARD
// ============================================================
export const SocialWorkDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'New Assessment', i: ClipboardList, p: 'assessments' },
    { l: 'Family Assessment', i: UsersRound, p: 'family' },
    { l: 'Home Visit', i: MapPin, p: 'home-visits' },
    { l: 'Reintegration', i: Home, p: 'reintegration' },
    { l: 'Trial Leave', i: DoorOpen, p: 'trial-leave' },
    { l: 'Discharge Planning', i: HeartHandshake, p: 'discharge' },
    { l: 'Child Welfare', i: Baby, p: 'child' },
    { l: 'Elder Welfare', i: Stethoscope, p: 'elder' },
    { l: 'Addiction Recovery', i: Brain, p: 'addiction' },
    { l: 'Court Liaison', i: Gavel, p: 'legal' },
    { l: 'Welfare Support', i: HandHeart, p: 'welfare' },
    { l: 'Community Follow-Up', i: Repeat, p: 'community' },
    { l: 'Vocational Reintegration', i: Briefcase, p: 'vocational' },
    { l: 'Billing & NHIA', i: CreditCard, p: 'billing' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Communication', i: MessageSquare, p: 'comms' },
    { l: 'Critical Alerts', i: AlertTriangle, p: 'alerts' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<HandHeart className="h-5 w-5" />}
        title="Social Work & Community Support Workspace"
        desc="GFA HMS · Psychiatric social work, family interventions, home visits, trial leave monitoring, community reintegration, child & elder protection, court liaison, welfare and NGO partnerships."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/home-visits?new=1`)}><MapPin className="h-4 w-4 mr-1" /> Schedule Home Visit</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'New Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 12, i: Send, tone: 'purple' },
        { l: 'Pending Assessments', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 8, i: ClipboardList, tone: 'amber' },
        { l: 'Home Visits Today', v: HOME_VISITS.filter(h => h.status === 'Scheduled').length + 4, i: MapPin, tone: 'teal' },
        { l: 'Trial Leave Cases', v: TRIAL_LEAVE.filter(t => t.status === 'Active').length + 17, i: DoorOpen, tone: 'green' },
        { l: 'Reintegration Cases', v: REINTEGRATION.length + 30, i: Home, tone: 'blue' },
        { l: 'Child Welfare Cases', v: CHILD.length + 16, i: Baby, tone: 'amber' },
      ]} />
      <KpiGrid items={[
        { l: 'Elder Welfare Cases', v: ELDER.length + 12, i: Stethoscope, tone: 'amber' },
        { l: 'Welfare Requests', v: WELFARE.filter(w => w.status === 'Pending' || w.status === 'New').length + 9, i: HandHeart, tone: 'purple' },
        { l: 'Follow-Ups Due', v: FOLLOWUPS.filter(f => f.status === 'Pending' || f.status === 'Confirmed').length + 6, i: Repeat, tone: 'amber' },
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical' || a.status === 'Child Protection' || a.status === 'Elder Protection').length + 2, i: AlertTriangle, tone: 'rose' },
        { l: 'Court Reports', v: LEGAL.length + 6, i: Gavel, tone: 'blue' },
        { l: 'Welfare Disbursed (MTD)', v: formatCurrency(845000), i: CreditCard, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Priority Referrals</div>
          <div className="space-y-2">{REFERRALS.filter(r => r.priority === 'High').slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{r.patient}</div><div className="text-xs text-muted-foreground">{r.from}</div></div>
              <Chip label={r.priority} t="red" />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Home Visits</div>
          <div className="space-y-2">{HOME_VISITS.filter(h => h.status === 'Scheduled').slice(0, 5).map(h => (
            <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{h.patient}</div><div className="text-xs text-muted-foreground">{h.address} · {h.visitor}</div></div>
              <Chip label={h.date.split(' ')[1]} t="blue" />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
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
// 2. REFERRAL CENTER
// ============================================================
export const SocialWorkReferralCenter = () => {
  const [selected, setSelected] = useState<typeof REFERRALS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Referral Center"
        icon={<Send className="h-5 w-5" />}
        title="Social Work Referral Center"
        desc="Inbound referrals from Psychiatry, Psychology, Nursing, Addiction, CAP, Psychogeriatrics and OT. Triage, prioritise and assign social workers."
        ctaLabel="New Referral"
        kpis={[
          { l: 'Total Referrals', v: REFERRALS.length + 124, i: Send, tone: 'blue' },
          { l: 'High Priority', v: REFERRALS.filter(r => r.priority === 'High').length + 18, i: AlertTriangle, tone: 'rose' },
          { l: 'Medium Priority', v: REFERRALS.filter(r => r.priority === 'Medium').length + 42, i: AlertCircle, tone: 'amber' },
          { l: 'Low Priority', v: REFERRALS.filter(r => r.priority === 'Low').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 14, i: AlertCircle, tone: 'amber' },
          { l: 'Completed Referrals', v: REFERRALS.filter(r => r.status === 'Completed').length + 96, i: CheckCircle2, tone: 'green' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'hi', label: 'High Priority', filter: (r: any) => r.priority === 'High' },
          { key: 'md', label: 'Medium Priority', filter: (r: any) => r.priority === 'Medium' },
          { key: 'lo', label: 'Low Priority', filter: (r: any) => r.priority === 'Low' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ac', label: 'Accepted', filter: (r: any) => r.status === 'Accepted' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={REFERRALS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.from} ${r.reason}`}
        columns={[
          { key: 'id', header: 'Ref', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'fr', header: 'From', render: r => r.from },
          { key: 'rs', header: 'Reason', render: r => r.reason },
          { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Accepted' || r.status === 'Completed' ? 'green' : 'amber'} /> },
          { key: 'as', header: 'Assigned', render: r => r.assigned },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Referral" submitLabel="Create Referral"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'from', label: 'Referring Department', type: 'select', options: ['Psychiatry', 'Psychology', 'Nursing', 'Child & Adolescent Psychiatry', 'Addiction Services', 'Psychogeriatrics', 'Occupational Therapy', 'Physiotherapy', 'Speech Therapy', 'Records', 'A&E'] },
            { k: 'reason', label: 'Referral Reason', type: 'textarea' },
            { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
            { k: 'sw', label: 'Assigned Social Worker', type: 'select', options: ['SW. Bukola', 'SW. Tope', 'SW. Kunle', 'SW. Funmi'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Referral created" nextStep="Triage the referral and assign a social worker."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Referral · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'From', value: selected.from },
            { label: 'Reason', value: selected.reason },
            { label: 'Priority', value: <Chip label={selected.priority} t={selected.priority === 'High' ? 'red' : selected.priority === 'Medium' ? 'amber' : 'green'} /> },
            { label: 'Status', value: selected.status },
            { label: 'Assigned', value: selected.assigned },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Referral rejected'); }}>Reject Referral</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success(`${selected.id} accepted`); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Accept Referral</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Assessment started'); }}><ClipboardList className="h-4 w-4 mr-1" /> Start Assessment</Button>
              <Button onClick={() => { setSelected(null); toast.success(`${selected.id} completed`); }}>Mark Completed</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 3. SOCIAL ASSESSMENT
// ============================================================
export const SocialAssessmentCenter = () => {
  const [selected, setSelected] = useState<typeof ASSESSMENTS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Social Assessment"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Social Assessment Center"
        desc="Psychosocial, family, economic, community, welfare and reintegration assessments — auto-save, draft recovery and recommendations."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Pending Assessments', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 9, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: ASSESSMENTS.filter(a => a.status === 'In Progress').length + 7, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: ASSESSMENTS.filter(a => a.status === 'Completed').length + 84, i: CheckCircle2, tone: 'green' },
          { l: 'High Risk', v: ASSESSMENTS.filter(a => a.risk === 'High').length + 8, i: AlertTriangle, tone: 'rose' },
          { l: 'Follow-Up Required', v: ASSESSMENTS.filter(a => a.flag === 'FU').length + 11, i: Repeat, tone: 'amber' },
          { l: 'Templates', v: ASSESSMENT_TYPES.length, i: BookOpen, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ip', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'hr', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
          { key: 'fu', label: 'Follow-Up Required', filter: (r: any) => r.flag === 'FU' },
        ]}
        rows={ASSESSMENTS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'o', header: 'Officer', render: r => r.officer },
          { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'purple' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><FilePlus className="h-3.5 w-3.5 mr-1" /> Begin</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Start Assessment" submitLabel="Begin Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Assessment Type', type: 'select', options: ASSESSMENT_TYPES },
            { k: 'reason', label: 'Reason for Assessment', type: 'textarea' },
            { k: 'sw', label: 'Assigned Officer', type: 'select', options: ['SW. Bukola', 'SW. Tope', 'SW. Kunle'] },
            { k: 'risk', label: 'Initial Risk', type: 'select', options: ['Low', 'Moderate', 'High'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Assessment started" nextStep="Open the workspace to capture findings."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Assessment · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Template', value: selected.type },
            { label: 'Officer', value: selected.officer },
            { label: 'Risk', value: selected.risk },
            { label: 'Status', value: selected.status },
            { label: 'Findings', value: 'Family stress · income loss · stigma reported · 2 dependants in school.' },
            { label: 'Recommendations', value: 'Family counselling × 6, welfare grant, school liaison; review in 4 weeks.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Draft saved')}>Save Draft</Button>
              <Button variant="outline" onClick={() => toast.success('Assessment printed')}><Printer className="h-4 w-4 mr-1" /> Print Assessment</Button>
              <Button onClick={() => { setSelected(null); toast.success('Assessment submitted'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Assessment</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 4. FAMILY ASSESSMENT
// ============================================================
export const FamilyAssessment = () => (
  <SpecialisedPage
    shellTitle="Family Assessment" icon={<UsersRound className="h-5 w-5" />}
    title="Family Assessment Module"
    desc="Family structure, dynamics, support system, risks and intervention plans. Genograms, ecomaps and family counselling tracking."
    ctaLabel="New Family Assessment"
    kpis={[
      { l: 'Strong Family Support', v: FAMILY.filter(f => f.support === 'Strong Support').length + 18, i: HeartHandshake, tone: 'green' },
      { l: 'Moderate Support', v: FAMILY.filter(f => f.support === 'Moderate Support').length + 22, i: UsersRound, tone: 'blue' },
      { l: 'Weak Support', v: FAMILY.filter(f => f.support === 'Weak Support').length + 9, i: AlertCircle, tone: 'amber' },
      { l: 'High Risk Families', v: FAMILY.filter(f => f.support === 'High Risk').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Conflict Cases', v: FAMILY.filter(f => f.support === 'Conflict Cases').length + 4, i: AlertTriangle, tone: 'orange' },
      { l: 'Active Plans', v: FAMILY.length + 36, i: ClipboardList, tone: 'purple' },
    ]}
    tabKey="support"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'st', label: 'Strong Support', value: 'Strong Support' },
      { key: 'mo', label: 'Moderate Support', value: 'Moderate Support' },
      { key: 'we', label: 'Weak Support', value: 'Weak Support' },
      { key: 'hi', label: 'High Risk', value: 'High Risk' },
      { key: 'cf', label: 'Conflict Cases', value: 'Conflict Cases' },
    ]}
    rows={FAMILY}
    searchFields={(r) => `${r.patient} ${r.id} ${r.structure}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'st', header: 'Structure', render: r => r.structure },
      { key: 'dy', header: 'Dynamics', render: r => r.dynamics },
      { key: 'sp', header: 'Support', render: r => <Chip label={r.support} t={r.support === 'Strong Support' ? 'green' : r.support === 'High Risk' || r.support === 'Conflict Cases' ? 'red' : 'amber'} /> },
      { key: 'pl', header: 'Plan', render: r => r.plan },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'structure', label: 'Family Structure', type: 'text' },
      { k: 'dynamics', label: 'Family Dynamics', type: 'textarea' },
      { k: 'support', label: 'Support Level', type: 'select', options: ['Strong Support', 'Moderate Support', 'Weak Support', 'High Risk', 'Conflict Cases'] },
      { k: 'risks', label: 'Risks Identified', type: 'textarea' },
      { k: 'plan', label: 'Intervention Plan', type: 'textarea' },
    ]}
    successTitle="Family assessment opened" nextStep="Complete the genogram and intervention plan."
  />
);

// ============================================================
// 5. HOME VISITS
// ============================================================
export const HomeVisits = () => (
  <SpecialisedPage
    shellTitle="Home Visits" icon={<MapPin className="h-5 w-5" />}
    title="Home Visit Management Center"
    desc="Visit scheduling, route planning, home & community assessment, safety and caregiver review."
    ctaLabel="Schedule Visit"
    kpis={[
      { l: 'Scheduled Visits', v: HOME_VISITS.filter(h => h.status === 'Scheduled').length + 14, i: CalendarDays, tone: 'blue' },
      { l: 'Completed Visits', v: HOME_VISITS.filter(h => h.status === 'Completed').length + 64, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Visits', v: HOME_VISITS.filter(h => h.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'Missed Visits', v: HOME_VISITS.filter(h => h.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'High Risk Visits', v: HOME_VISITS.filter(h => h.status === 'High Risk').length + 3, i: AlertTriangle, tone: 'orange' },
      { l: 'Active Officers', v: 6, i: Users, tone: 'purple' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'sc', label: 'Scheduled', value: 'Scheduled' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'hr', label: 'High Risk', value: 'High Risk' },
    ]}
    rows={HOME_VISITS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.address} ${r.purpose}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'v', header: 'Officer', render: r => r.visitor },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 'a', header: 'Address', render: r => r.address },
      { key: 'pu', header: 'Purpose', render: r => r.purpose },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'Missed' || r.status === 'High Risk' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'address', label: 'Address', type: 'text' },
      { k: 'purpose', label: 'Visit Purpose', type: 'select', options: ['Discharge readiness check', 'Trial leave monitoring', 'Elder protection investigation', 'Child welfare check', 'Family tracing', 'Recovery housing safety', 'Community follow-up'] },
      { k: 'officer', label: 'Assigned Officer', type: 'select', options: ['SW. Bukola', 'SW. Tope', 'SW. Kunle', 'SW. Funmi'] },
      { k: 'date', label: 'Visit Date', type: 'date' },
      { k: 'time', label: 'Visit Time', type: 'time' },
    ]}
    successTitle="Home visit scheduled" nextStep="Officer and patient notified — route added to calendar."
  />
);

// ============================================================
// 6. COMMUNITY REINTEGRATION
// ============================================================
export const CommunityReintegration = () => (
  <SpecialisedPage
    shellTitle="Community Reintegration" icon={<Home className="h-5 w-5" />}
    title="Community Reintegration Workspace"
    desc="Family, employment, community and educational reintegration with readiness scoring, milestones and reviews."
    ctaLabel="New Reintegration Plan"
    kpis={[
      { l: 'Active Plans', v: REINTEGRATION.filter(r => r.stage === 'Active').length + 22, i: Activity, tone: 'blue' },
      { l: 'Completed Plans', v: REINTEGRATION.filter(r => r.stage === 'Completed').length + 38, i: CheckCircle2, tone: 'green' },
      { l: 'Community Placement', v: REINTEGRATION.filter(r => r.kind === 'Community Placement').length + 12, i: Home, tone: 'purple' },
      { l: 'Employment Placement', v: REINTEGRATION.filter(r => r.kind === 'Employment').length + 16, i: Briefcase, tone: 'amber' },
      { l: 'Family Reintegration', v: REINTEGRATION.filter(r => r.kind === 'Family Reintegration').length + 20, i: UsersRound, tone: 'teal' },
      { l: 'Total Plans', v: REINTEGRATION.length + 60, i: ClipboardList, tone: 'rose' },
    ]}
    tabKey="kind"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active' },
      { key: 'cp', label: 'Completed' },
      { key: 'co', label: 'Community Placement', value: 'Community Placement' },
      { key: 'em', label: 'Employment', value: 'Employment' },
      { key: 'fa', label: 'Family Reintegration', value: 'Family Reintegration' },
    ]}
    rows={REINTEGRATION}
    searchFields={(r) => `${r.patient} ${r.id} ${r.kind}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'k', header: 'Kind', render: r => r.kind },
      { key: 'r', header: 'Readiness', render: r => <Chip label={r.readiness} t={parseInt(r.readiness) >= 80 ? 'green' : parseInt(r.readiness) >= 50 ? 'amber' : 'red'} /> },
      { key: 's', header: 'Stage', render: r => <Chip label={r.stage} t={r.stage === 'Completed' ? 'green' : 'blue'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Reintegration Type', type: 'select', options: ['Family Reintegration', 'Employment', 'Community Placement', 'Educational'] },
      { k: 'goal', label: 'Primary Goal', type: 'textarea' },
      { k: 'milestones', label: 'Key Milestones', type: 'textarea' },
      { k: 'partner', label: 'Community Partner', type: 'text' },
      { k: 'review', label: 'Review Date', type: 'date' },
    ]}
    successTitle="Reintegration plan created" nextStep="Add milestones and assign community partner."
  />
);

// ============================================================
// 7. TRIAL LEAVE
// ============================================================
export const TrialLeave = () => (
  <SpecialisedPage
    shellTitle="Trial Leave" icon={<DoorOpen className="h-5 w-5" />}
    title="Trial Leave Management Module"
    desc="ARO-specific special discharge — request, approval, responsible relative, monitoring schedule, return tracking and outcome review."
    ctaLabel="New Trial Leave"
    kpis={[
      { l: 'Pending Approval', v: TRIAL_LEAVE.filter(t => t.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Active Leave', v: TRIAL_LEAVE.filter(t => t.status === 'Active').length + 17, i: Activity, tone: 'green' },
      { l: 'Completed Leave', v: TRIAL_LEAVE.filter(t => t.status === 'Completed').length + 42, i: CheckCircle2, tone: 'blue' },
      { l: 'Failed Leave', v: TRIAL_LEAVE.filter(t => t.status === 'Failed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Review Required', v: TRIAL_LEAVE.filter(t => t.status === 'Review Required').length + 3, i: Repeat, tone: 'purple' },
      { l: 'Success Rate', v: '82%', i: TrendingUp, tone: 'green' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'fa', label: 'Failed', value: 'Failed' },
      { key: 'rv', label: 'Review Required', value: 'Review Required' },
    ]}
    rows={TRIAL_LEAVE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.relative}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 's', header: 'Start', render: r => r.start },
      { key: 'e', header: 'End', render: r => r.end },
      { key: 'rel', header: 'Responsible Relative', render: r => r.relative },
      { key: 'sch', header: 'Schedule', render: r => r.schedule },
      { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Active' || r.status === 'Completed' ? 'green' : r.status === 'Failed' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'start', label: 'Start Date', type: 'date' },
      { k: 'end', label: 'End Date', type: 'date' },
      { k: 'relative', label: 'Responsible Relative', type: 'text' },
      { k: 'phone', label: 'Contact Phone', type: 'text' },
      { k: 'schedule', label: 'Monitoring Schedule', type: 'textarea' },
    ]}
    successTitle="Trial leave request submitted" nextStep="Routed to Psychiatry & Nursing for MDT approval."
  />
);

// ============================================================
// 8. DISCHARGE & AFTERCARE
// ============================================================
export const DischargeAftercare = () => (
  <SpecialisedPage
    shellTitle="Discharge & Aftercare" icon={<HeartHandshake className="h-5 w-5" />}
    title="Discharge & Aftercare Planning"
    desc="Psychiatric discharge, community reintegration, housing, employment, recovery support and follow-up scheduling."
    ctaLabel="New Discharge Plan"
    kpis={[
      { l: 'Pending Discharge', v: DISCHARGE.filter(d => d.status === 'Pending').length + 7, i: AlertCircle, tone: 'amber' },
      { l: 'Active Aftercare', v: DISCHARGE.filter(d => d.status === 'Active').length + 24, i: Activity, tone: 'blue' },
      { l: 'Completed Aftercare', v: DISCHARGE.filter(d => d.status === 'Completed').length + 56, i: CheckCircle2, tone: 'green' },
      { l: 'Follow-Up Due', v: DISCHARGE.filter(d => d.status === 'Follow-Up Due').length + 9, i: Repeat, tone: 'purple' },
      { l: 'Community Placement', v: DISCHARGE.filter(d => d.status === 'Community Placement').length + 5, i: Home, tone: 'orange' },
      { l: 'Total Plans', v: DISCHARGE.length + 100, i: ClipboardList, tone: 'rose' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'fu', label: 'Follow-Up Due', value: 'Follow-Up Due' },
      { key: 'co', label: 'Community Placement', value: 'Community Placement' },
    ]}
    rows={DISCHARGE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.housing}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'r', header: 'Readiness', render: r => <Chip label={r.readiness} t={parseInt(r.readiness) >= 80 ? 'green' : parseInt(r.readiness) >= 50 ? 'amber' : 'red'} /> },
      { key: 'h', header: 'Housing', render: r => r.housing },
      { key: 'e', header: 'Employment', render: r => r.employment },
      { key: 'f', header: 'Follow-Up', render: r => r.followup },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'housing', label: 'Housing Plan', type: 'text' },
      { k: 'employment', label: 'Employment Plan', type: 'text' },
      { k: 'followup', label: 'Follow-Up Schedule', type: 'text' },
      { k: 'meds', label: 'Medication Plan', type: 'textarea' },
      { k: 'support', label: 'Support Network', type: 'textarea' },
    ]}
    successTitle="Discharge plan created" nextStep="Notify Nursing, Pharmacy and Family for handover."
  />
);

// ============================================================
// 9. CHILD WELFARE
// ============================================================
export const ChildWelfare = () => (
  <SpecialisedPage
    shellTitle="Child Welfare" icon={<Baby className="h-5 w-5" />}
    title="Child Welfare & Protection Module"
    desc="Child abuse, neglect, welfare reviews, school collaboration and family support programmes."
    ctaLabel="New Child Case"
    kpis={[
      { l: 'Low Risk', v: CHILD.filter(c => c.risk === 'Low Risk').length + 10, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Risk', v: CHILD.filter(c => c.risk === 'Moderate Risk').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'High Risk', v: CHILD.filter(c => c.risk === 'High Risk').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'Abuse Concerns', v: CHILD.filter(c => c.risk === 'Abuse Concerns').length + 3, i: AlertTriangle, tone: 'red' },
      { l: 'School Support Cases', v: CHILD.filter(c => c.plan.includes('school') || c.plan === 'School Support').length + 7, i: BookOpen, tone: 'blue' },
      { l: 'Total Cases', v: CHILD.length + 24, i: Baby, tone: 'purple' },
    ]}
    tabKey="risk"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'lo', label: 'Low Risk', value: 'Low Risk' },
      { key: 'mo', label: 'Moderate Risk', value: 'Moderate Risk' },
      { key: 'hi', label: 'High Risk', value: 'High Risk' },
      { key: 'ab', label: 'Abuse Concerns', value: 'Abuse Concerns' },
      { key: 'ss', label: 'School Support' },
    ]}
    rows={CHILD}
    searchFields={(r) => `${r.child} ${r.id} ${r.concern}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'c', header: 'Child', render: r => r.child },
      { key: 'a', header: 'Age', render: r => r.age },
      { key: 'co', header: 'Concern', render: r => r.concern },
      { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' || r.risk === 'Abuse Concerns' ? 'red' : r.risk === 'Moderate Risk' ? 'amber' : 'green'} /> },
      { key: 'p', header: 'Plan', render: r => r.plan },
    ]}
    modalFields={[
      { k: 'child', label: 'Child Name', type: 'text' },
      { k: 'age', label: 'Age', type: 'number' },
      { k: 'concern', label: 'Concern', type: 'textarea' },
      { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low Risk', 'Moderate Risk', 'High Risk', 'Abuse Concerns', 'School Support'] },
      { k: 'plan', label: 'Intervention Plan', type: 'textarea' },
      { k: 'agency', label: 'Liaison Agency', type: 'text' },
    ]}
    successTitle="Child welfare case opened" nextStep="Notify safeguarding lead and ARO child welfare team."
  />
);

// ============================================================
// 10. ELDER WELFARE
// ============================================================
export const ElderWelfare = () => (
  <SpecialisedPage
    shellTitle="Elder Welfare" icon={<Stethoscope className="h-5 w-5" />}
    title="Elder Welfare & Protection Module"
    desc="Elder abuse, neglect, caregiver support, home safety reviews and community support — integrated with Psychogeriatrics."
    ctaLabel="New Elder Case"
    kpis={[
      { l: 'Low Risk', v: ELDER.filter(e => e.risk === 'Low Risk').length + 8, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Risk', v: ELDER.filter(e => e.risk === 'Moderate Risk').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'High Risk', v: ELDER.filter(e => e.risk === 'High Risk').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Neglect Concerns', v: ELDER.filter(e => e.risk === 'Neglect').length + 3, i: AlertTriangle, tone: 'red' },
      { l: 'Caregiver Support', v: ELDER.filter(e => e.risk === 'Caregiver Support').length + 5, i: HeartHandshake, tone: 'blue' },
      { l: 'Total Cases', v: ELDER.length + 18, i: Stethoscope, tone: 'purple' },
    ]}
    tabKey="risk"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'lo', label: 'Low Risk', value: 'Low Risk' },
      { key: 'mo', label: 'Moderate Risk', value: 'Moderate Risk' },
      { key: 'hi', label: 'High Risk', value: 'High Risk' },
      { key: 'ne', label: 'Neglect', value: 'Neglect' },
      { key: 'cs', label: 'Caregiver Support', value: 'Caregiver Support' },
    ]}
    rows={ELDER}
    searchFields={(r) => `${r.patient} ${r.id} ${r.concern}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'co', header: 'Concern', render: r => r.concern },
      { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' || r.risk === 'Neglect' ? 'red' : r.risk === 'Moderate Risk' ? 'amber' : 'green'} /> },
      { key: 'pl', header: 'Plan', render: r => r.plan },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'concern', label: 'Concern', type: 'textarea' },
      { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low Risk', 'Moderate Risk', 'High Risk', 'Neglect', 'Caregiver Support'] },
      { k: 'caregiver', label: 'Primary Caregiver', type: 'text' },
      { k: 'plan', label: 'Intervention Plan', type: 'textarea' },
      { k: 'agency', label: 'Liaison Agency', type: 'text' },
    ]}
    successTitle="Elder welfare case opened" nextStep="Notify Psychogeriatrics and schedule home assessment."
  />
);

// ============================================================
// 11. ADDICTION RECOVERY
// ============================================================
export const AddictionRecoverySupport = () => (
  <SpecialisedPage
    shellTitle="Addiction Recovery" icon={<Brain className="h-5 w-5" />}
    title="Addiction Recovery Social Support"
    desc="Family recovery programmes, recovery housing, employment reintegration, community reintegration and peer support."
    ctaLabel="New Recovery Plan"
    kpis={[
      { l: 'Stable Recovery', v: ADDICTION.filter(a => a.stability === 'Stable').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Recovery', v: ADDICTION.filter(a => a.stability === 'Moderate').length + 9, i: AlertCircle, tone: 'amber' },
      { l: 'High Relapse Risk', v: ADDICTION.filter(a => a.stability === 'High Relapse Risk').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Community Reintegration', v: ADDICTION.filter(a => a.stage === 'Community').length + 14, i: Home, tone: 'blue' },
      { l: 'Employment Reintegration', v: ADDICTION.filter(a => a.stage === 'Employment').length + 7, i: Briefcase, tone: 'purple' },
      { l: 'Total Cases', v: ADDICTION.length + 28, i: Brain, tone: 'teal' },
    ]}
    tabKey="stage"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'st', label: 'Stable', value: 'Stable' },
      { key: 'mo', label: 'Moderate' },
      { key: 'hi', label: 'High Relapse Risk', value: 'High Relapse Risk' },
      { key: 'co', label: 'Community', value: 'Community' },
      { key: 'em', label: 'Employment', value: 'Employment' },
    ]}
    rows={ADDICTION}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 's', header: 'Stage', render: r => r.stage },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'st', header: 'Stability', render: r => <Chip label={r.stability} t={r.stability === 'Stable' ? 'green' : r.stability === 'High Relapse Risk' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'stage', label: 'Recovery Stage', type: 'select', options: ['Stable', 'Community', 'Employment', 'High Relapse Risk'] },
      { k: 'focus', label: 'Plan Focus', type: 'textarea' },
      { k: 'partner', label: 'Community Partner', type: 'text' },
      { k: 'meetings', label: 'NA/Peer Group Schedule', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Recovery plan opened" nextStep="Link patient to recovery housing and NA group."
  />
);

// ============================================================
// 12. COURT & LEGAL LIAISON
// ============================================================
export const LegalLiaison = () => (
  <SpecialisedPage
    shellTitle="Court & Legal Liaison" icon={<Gavel className="h-5 w-5" />}
    title="Court & Legal Liaison Module"
    desc="Court reports, legal documentation, forensic social investigation reports and legal follow-up."
    ctaLabel="New Court Report"
    kpis={[
      { l: 'Pending Reports', v: LEGAL.filter(l => l.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Submitted Reports', v: LEGAL.filter(l => l.status === 'Submitted').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Court Cases', v: LEGAL.filter(l => l.status === 'Court Cases').length + 9, i: Gavel, tone: 'blue' },
      { l: 'Legal Reviews', v: LEGAL.filter(l => l.kind.toLowerCase().includes('review')).length + 4, i: ClipboardList, tone: 'purple' },
      { l: 'Follow-Up Required', v: LEGAL.filter(l => l.status === 'Follow-Up').length + 5, i: Repeat, tone: 'rose' },
      { l: 'Total Cases', v: LEGAL.length + 32, i: ScrollText, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'su', label: 'Submitted', value: 'Submitted' },
      { key: 'cc', label: 'Court Cases', value: 'Court Cases' },
      { key: 'lr', label: 'Legal Reviews' },
      { key: 'fu', label: 'Follow-Up', value: 'Follow-Up' },
    ]}
    rows={LEGAL}
    searchFields={(r) => `${r.patient} ${r.id} ${r.court} ${r.kind}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'c', header: 'Court', render: r => r.court },
      { key: 'd', header: 'Hearing Date', render: r => r.date },
      { key: 'k', header: 'Report Type', render: r => r.kind },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Submitted' ? 'green' : r.status === 'Follow-Up' ? 'blue' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'court', label: 'Court / Tribunal', type: 'text' },
      { k: 'date', label: 'Hearing Date', type: 'date' },
      { k: 'kind', label: 'Report Type', type: 'select', options: ['Forensic social report', 'Mental health expert report', 'Child protection report', 'Vulnerable adult report', 'Custody assessment', 'Aftercare compliance review'] },
      { k: 'summary', label: 'Report Summary', type: 'textarea' },
      { k: 'lawyer', label: 'Counsel / Legal Officer', type: 'text' },
    ]}
    successTitle="Court report drafted" nextStep="Submit for legal review and senior social worker sign-off."
  />
);

// ============================================================
// 13. ABANDONED & VULNERABLE
// ============================================================
export const VulnerablePatients = () => (
  <SpecialisedPage
    shellTitle="Abandoned & Vulnerable" icon={<UserSearch className="h-5 w-5" />}
    title="Abandoned & Vulnerable Patient Module"
    desc="Abandoned, unknown-identity and vulnerable patients — family tracing, welfare interventions, reintegration planning."
    ctaLabel="New Vulnerable Case"
    kpis={[
      { l: 'New Cases', v: VULNERABLE.filter(v => v.status === 'New').length + 4, i: Plus, tone: 'blue' },
      { l: 'Active Cases', v: VULNERABLE.filter(v => v.status === 'Active').length + 8, i: Activity, tone: 'amber' },
      { l: 'Placement Pending', v: VULNERABLE.filter(v => v.status === 'Placement Pending').length + 3, i: Home, tone: 'purple' },
      { l: 'Resolved Cases', v: VULNERABLE.filter(v => v.status === 'Resolved').length + 22, i: CheckCircle2, tone: 'green' },
      { l: 'Emergency Cases', v: VULNERABLE.filter(v => v.status === 'Emergency').length + 2, i: AlertTriangle, tone: 'rose' },
      { l: 'Total', v: VULNERABLE.length + 40, i: UserSearch, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ne', label: 'New', value: 'New' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'pp', label: 'Placement Pending', value: 'Placement Pending' },
      { key: 'rs', label: 'Resolved', value: 'Resolved' },
      { key: 'em', label: 'Emergency', value: 'Emergency' },
    ]}
    rows={VULNERABLE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.stage}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Emergency' ? 'red' : r.status === 'Resolved' ? 'green' : 'amber'} /> },
      { key: 'st', header: 'Stage', render: r => r.stage },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient / Identifier', type: 'text' },
      { k: 'status', label: 'Status', type: 'select', options: ['New', 'Active', 'Placement Pending', 'Resolved', 'Emergency'] },
      { k: 'concern', label: 'Concern', type: 'textarea' },
      { k: 'source', label: 'Source / Referrer', type: 'text' },
      { k: 'tracing', label: 'Family Tracing Steps', type: 'textarea' },
      { k: 'placement', label: 'Placement Plan', type: 'textarea' },
    ]}
    successTitle="Vulnerable case opened" nextStep="Notify safeguarding lead and start family tracing."
  />
);

// ============================================================
// 14. WELFARE & SUPPORT
// ============================================================
export const WelfareSupport = () => (
  <SpecialisedPage
    shellTitle="Welfare & Support" icon={<HandHeart className="h-5 w-5" />}
    title="Welfare & Support Services Module"
    desc="Financial assistance, welfare grants, NGO support, charity assistance and community support programmes."
    ctaLabel="New Welfare Request"
    kpis={[
      { l: 'New Requests', v: WELFARE.filter(w => w.status === 'New').length + 6, i: Plus, tone: 'blue' },
      { l: 'Approved', v: WELFARE.filter(w => w.status === 'Approved').length + 32, i: CheckCircle2, tone: 'green' },
      { l: 'Pending', v: WELFARE.filter(w => w.status === 'Pending').length + 9, i: AlertCircle, tone: 'amber' },
      { l: 'Rejected', v: WELFARE.filter(w => w.status === 'Rejected').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'Emergency Support', v: WELFARE.filter(w => w.status === 'Emergency').length + 3, i: AlertTriangle, tone: 'orange' },
      { l: 'Disbursed (MTD)', v: formatCurrency(845000), i: CreditCard, tone: 'purple' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ne', label: 'New', value: 'New' },
      { key: 'ap', label: 'Approved', value: 'Approved' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'rj', label: 'Rejected', value: 'Rejected' },
      { key: 'em', label: 'Emergency', value: 'Emergency' },
    ]}
    rows={WELFARE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.request} ${r.source}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Beneficiary', render: r => r.patient },
      { key: 'r', header: 'Request', render: r => r.request },
      { key: 'a', header: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'so', header: 'Source', render: r => r.source },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : r.status === 'Emergency' ? 'orange' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Beneficiary', type: 'patientPicker' },
      { k: 'request', label: 'Request Description', type: 'textarea' },
      { k: 'amount', label: 'Amount (₦)', type: 'number' },
      { k: 'source', label: 'Funding Source', type: 'select', options: ['GFA HMS Welfare Fund', 'Hope Alive NGO', 'Reach Out NGO', 'TETFund partner', 'NHIA', 'NGO partner'] },
      { k: 'urgency', label: 'Urgency', type: 'select', options: ['Routine', 'Urgent', 'Emergency'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Welfare request submitted" nextStep="Routed to Welfare Office for approval and disbursement."
  />
);

// ============================================================
// 15. COMMUNITY FOLLOW-UP
// ============================================================
export const CommunityFollowUp = () => (
  <SpecialisedPage
    shellTitle="Community Follow-Up" icon={<Repeat className="h-5 w-5" />}
    title="Community Mental Health Follow-Up"
    desc="Community reviews, medication compliance, family monitoring and risk monitoring."
    ctaLabel="Schedule Follow-Up"
    kpis={[
      { l: 'Compliant', v: COMMUNITY.filter(c => c.compliance === 'Compliant').length + 38, i: CheckCircle2, tone: 'green' },
      { l: 'Partially Compliant', v: COMMUNITY.filter(c => c.compliance === 'Partial').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Non-Compliant', v: COMMUNITY.filter(c => c.compliance === 'Non-Compliant').length + 6, i: AlertTriangle, tone: 'orange' },
      { l: 'Missed Follow-Up', v: COMMUNITY.filter(c => c.compliance === 'Missed').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'High Risk', v: COMMUNITY.filter(c => c.compliance === 'High Risk').length + 4, i: AlertTriangle, tone: 'red' },
      { l: 'Total', v: COMMUNITY.length + 60, i: Repeat, tone: 'blue' },
    ]}
    tabKey="compliance"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'co', label: 'Compliant', value: 'Compliant' },
      { key: 'pa', label: 'Partial', value: 'Partial' },
      { key: 'nc', label: 'Non-Compliant', value: 'Non-Compliant' },
      { key: 'mi', label: 'Missed', value: 'Missed' },
      { key: 'hi', label: 'High Risk', value: 'High Risk' },
    ]}
    rows={COMMUNITY}
    searchFields={(r) => `${r.patient} ${r.id} ${r.kind}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 'k', header: 'Type', render: r => r.kind },
      { key: 'c', header: 'Compliance', render: r => <Chip label={r.compliance} t={r.compliance === 'Compliant' ? 'green' : r.compliance === 'Missed' || r.compliance === 'High Risk' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'date', label: 'Follow-Up Date', type: 'date' },
      { k: 'kind', label: 'Follow-Up Type', type: 'select', options: ['Community review', 'Medication compliance check', 'Family monitoring', 'Risk monitoring', 'School + home review', 'Relapse monitoring'] },
      { k: 'officer', label: 'Assigned Officer', type: 'select', options: ['SW. Bukola', 'SW. Tope', 'SW. Kunle'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Officer and patient notified."
  />
);

// ============================================================
// 16. VOCATIONAL REINTEGRATION
// ============================================================
export const VocationalReintegration = () => (
  <SpecialisedPage
    shellTitle="Vocational Reintegration" icon={<Briefcase className="h-5 w-5" />}
    title="Vocational & Educational Reintegration"
    desc="Vocational training tracks, apprenticeships, educational re-entry and NGO partner programmes — integrated with OT."
    ctaLabel="New Track"
    kpis={[
      { l: 'Employment Ready', v: VOCATIONAL.filter(v => v.status === 'Employment Ready').length + 9, i: CheckCircle2, tone: 'green' },
      { l: 'Skills Training', v: VOCATIONAL.filter(v => v.status === 'Skills Training').length + 14, i: BookOpen, tone: 'blue' },
      { l: 'Active Placement', v: VOCATIONAL.filter(v => v.status === 'Active Placement').length + 11, i: Briefcase, tone: 'amber' },
      { l: 'Completed Placement', v: VOCATIONAL.filter(v => v.status === 'Completed').length + 18, i: CheckCircle2, tone: 'teal' },
      { l: 'Follow-Up Required', v: VOCATIONAL.filter(v => v.status === 'Follow-Up').length + 6, i: Repeat, tone: 'purple' },
      { l: 'NGO Partners', v: 12, i: HandHeart, tone: 'rose' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'er', label: 'Employment Ready', value: 'Employment Ready' },
      { key: 'st', label: 'Skills Training', value: 'Skills Training' },
      { key: 'ap', label: 'Active Placement', value: 'Active Placement' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'fu', label: 'Follow-Up', value: 'Follow-Up' },
    ]}
    rows={VOCATIONAL}
    searchFields={(r) => `${r.patient} ${r.id} ${r.track} ${r.partner}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Track', render: r => r.track },
      { key: 'pa', header: 'Partner', render: r => r.partner },
      { key: 'pr', header: 'Progress', render: r => <Chip label={r.progress} t={parseInt(r.progress) >= 80 ? 'green' : parseInt(r.progress) >= 50 ? 'amber' : 'red'} /> },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'Active Placement' ? 'blue' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'track', label: 'Training Track', type: 'text' },
      { k: 'partner', label: 'Partner / Provider', type: 'text' },
      { k: 'status', label: 'Status', type: 'select', options: ['Employment Ready', 'Skills Training', 'Active Placement', 'Completed', 'Follow-Up'] },
      { k: 'mentor', label: 'Mentor / Supervisor', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Vocational track created" nextStep="Notify OT and partner agency."
  />
);

// ============================================================
// 17. FOLLOW-UP DASHBOARD
// ============================================================
export const SocialWorkFollowUp = () => (
  <SpecialisedPage
    shellTitle="Follow-Up Dashboard" icon={<Activity className="h-5 w-5" />}
    title="Social Work Follow-Up Dashboard"
    desc="Upcoming reviews, missed reviews, trial leave follow-ups, community follow-ups and family reviews."
    ctaLabel="Schedule Follow-Up"
    kpis={[
      { l: 'Confirmed', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 26, i: CheckCircle2, tone: 'green' },
      { l: 'Pending', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 11, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 5, i: Repeat, tone: 'purple' },
      { l: 'Missed', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Completed', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 68, i: CheckCircle2, tone: 'blue' },
      { l: 'This Week', v: 46, i: CalendarDays, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'cf', label: 'Confirmed', value: 'Confirmed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'rs', label: 'Rescheduled', value: 'Rescheduled' },
      { key: 'mi', label: 'Missed', value: 'Missed' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={FOLLOWUPS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.type}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Confirmed' || r.status === 'Completed' ? 'green' : r.status === 'Missed' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Trial leave review', 'Family counselling', 'Community review', 'Elder protection review', 'Child welfare review', 'Recovery housing check'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Patient and officer notified."
  />
);

// ============================================================
// 18. EMR TIMELINE
// ============================================================
export const SocialWorkTimeline = () => {
  const TIMELINE = [
    { when: '2026-06-03 10:00', what: 'Home visit — Pa Adebayo Odunsi (elder protection)', who: 'SW. Bukola' },
    { when: '2026-06-02 14:00', what: 'Family assessment — Mr. Chidi Eze', who: 'SW. Bukola' },
    { when: '2026-06-01 11:30', what: 'Trial leave granted — Mrs. Adeyemi', who: 'SW. Bukola' },
    { when: '2026-05-30 09:00', what: 'Recovery housing review — Mr. Aliyu', who: 'SW. Kunle' },
    { when: '2026-05-29 13:00', what: 'Court report filed — Miss Halima Yusuf', who: 'SW. Tope' },
  ];
  return (
    <Shell title="EMR Timeline">
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Social Work EMR Timeline"
        desc="Chronological log of assessments, family reviews, home visits, trial leave and welfare actions." />
      <Card>
        <div className="space-y-3">
          {TIMELINE.map((e, i) => (
            <div key={i} className="flex gap-3">
              <div className="text-xs text-muted-foreground w-36 shrink-0">{e.when}</div>
              <div className="flex-1 p-2.5 rounded-lg border bg-muted/30">
                <div className="text-sm font-semibold">{e.what}</div>
                <div className="text-xs text-muted-foreground">{e.who}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============================================================
// 19. BILLING & NHIA
// ============================================================
export const SocialWorkBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Social Work Billing & NHIA Integration"
        desc="Social assessment, home visit, reintegration, welfare, trial leave and family assessment billing — with NHIA claims."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 162, i: CreditCard, tone: 'blue' },
          { l: 'Paid', v: INVOICES.filter(i => i.status === 'Paid').length + 108, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: INVOICES.filter(i => i.status === 'Pending').length + 14, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA', v: INVOICES.filter(i => i.status === 'NHIA' || i.nhia === 'Approved').length + 36, i: AlertTriangle, tone: 'purple' },
          { l: 'Outstanding', v: INVOICES.filter(i => i.status === 'Outstanding').length + 11, i: AlertTriangle, tone: 'rose' },
          { l: 'Welfare Bills', v: INVOICES.filter(i => i.status === 'Welfare').length + 24, i: HandHeart, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pd', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nh', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' || r.nhia === 'Approved' },
          { key: 'os', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'wf', label: 'Welfare', filter: (r: any) => r.status === 'Welfare' },
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
            { k: 'svc', label: 'Service Type', type: 'select', options: SERVICE_TYPES },
            { k: 'amt', label: 'Amount (₦)', type: 'number' },
            { k: 'nhia', label: 'NHIA Status', type: 'select', options: ['N/A', 'Pending', 'Approved'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Invoice created" nextStep="Print invoice or push for NHIA claim review."
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
            { label: 'Date', value: '2026-06-02' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Invoice printed', message: selected.id })}><Printer className="h-4 w-4 mr-1" /> Print</Button>
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
// 20. RESEARCH & STATISTICS
// ============================================================
export const SocialWorkResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Social Work Analytics"
      desc="Family intervention statistics, home visits, trial leave outcomes, reintegration outcomes, welfare disbursement and follow-up attendance." />
    <KpiGrid items={[
      { l: 'Active caseload', v: 212, i: Users, tone: 'amber' },
      { l: 'Home visits (MTD)', v: 146, i: MapPin, tone: 'green' },
      { l: 'Trial leave (active)', v: 18, i: DoorOpen, tone: 'blue' },
      { l: 'Trial leave success', v: '82%', i: TrendingUp, tone: 'green' },
      { l: 'Family interventions', v: 64, i: UsersRound, tone: 'amber' },
      { l: 'Court reports (MTD)', v: 9, i: Gavel, tone: 'purple' },
    ]} />
    <Card>
      <div className="text-sm font-semibold mb-2">Research Indicators</div>
      <div className="text-sm text-muted-foreground">Linked dimensions: diagnosis, programme, age group, ward, NHIA status, referral source. Filters: date range, officer, intervention.</div>
    </Card>
  </Shell>
);

// ============================================================
// 21. REPORTING CENTER
// ============================================================
export const SocialWorkReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '30d', notes: '' });
  const TYPES = [
    'Social Assessment Report', 'Home Visit Report', 'Welfare Report',
    'Reintegration Report', 'Trial Leave Report', 'Child Welfare Report',
    'Elder Welfare Report', 'Billing Report',
  ];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Social Work Reporting Center"
        desc="Generate social assessment, home visit, welfare, reintegration, trial leave, child/elder welfare and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 112, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 6, i: AlertCircle, tone: 'amber' },
        { l: 'Welfare Reports', v: 28, i: HandHeart, tone: 'purple' },
        { l: 'Home Visit Reports', v: 34, i: MapPin, tone: 'teal' },
        { l: 'Reintegration Reports', v: 18, i: Home, tone: 'green' },
        { l: 'Billing Reports', v: 14, i: CreditCard, tone: 'rose' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Social Work · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Caseload</div><div className="font-semibold text-lg">212</div></div>
                  <div><div className="text-xs text-muted-foreground">Home Visits (MTD)</div><div className="font-semibold text-lg">146</div></div>
                  <div><div className="text-xs text-muted-foreground">Trial Leave</div><div className="font-semibold text-lg">18 active</div></div>
                  <div><div className="text-xs text-muted-foreground">Welfare Disbursed</div><div className="font-semibold text-lg">{formatCurrency(845000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Trial leave success rate at 82%</li>
                  <li>Child welfare cases up 18% MTD</li>
                  <li>Family intervention attendance at 86%</li>
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
// 22. COMMUNICATION CENTER
// ============================================================
export const SocialWorkComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'nur', l: 'Nursing' }, { k: 'psy', l: 'Psychology' },
    { k: 'cap', l: 'Child Psychiatry' }, { k: 'add', l: 'Addiction' }, { k: 'ot', l: 'OT' },
    { k: 'pt', l: 'Physio' }, { k: 'slt', l: 'Speech' }, { k: 'wf', l: 'Welfare' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', nur: 'nursing', psy: 'psychology', cap: 'child', add: 'addiction', ot: 'occupational', pt: 'physio', slt: 'speech', wf: 'welfare' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Social Work Communication Center"
        desc="Secure messaging with Doctors, Nursing, Psychology, CAP, Addiction, OT, Physiotherapy, Speech Therapy and Welfare Office — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Attachments', v: 16, i: Paperclip, tone: 'blue' },
        { l: 'Active Staff', v: 32, i: Users, tone: 'green' },
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
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — updating social work record and notifying family.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest assessment summary.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'social-assessment.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 23. CRITICAL ALERTS
// ============================================================
export const SocialWorkAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'cp', l: 'Child Protection', f: (a: any) => a.status === 'Child Protection' },
    { k: 'ep', l: 'Elder Protection', f: (a: any) => a.status === 'Elder Protection' },
    { k: 'ab', l: 'Abandonment', f: (a: any) => a.status === 'Abandonment' },
    { k: 'we', l: 'Welfare Emergency', f: (a: any) => a.status === 'Welfare Emergency' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Social Work Critical Alerts"
        desc="Overdue trial leave returns, child & elder protection escalations, abandoned patients, missed community follow-ups and welfare crises." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 2, i: AlertTriangle, tone: 'red' },
        { l: 'Child Protection Alerts', v: ALERTS.filter(a => a.status === 'Child Protection').length + 3, i: Baby, tone: 'rose' },
        { l: 'Elder Protection Alerts', v: ALERTS.filter(a => a.status === 'Elder Protection').length + 2, i: Stethoscope, tone: 'orange' },
        { l: 'Abandonment Alerts', v: ALERTS.filter(a => a.status === 'Abandonment').length + 1, i: UserSearch, tone: 'amber' },
        { l: 'Welfare Emergencies', v: ALERTS.filter(a => a.status === 'Welfare Emergency').length + 2, i: HandHeart, tone: 'purple' },
        { l: 'Acknowledged Alerts', v: ALERTS.filter(a => a.status === 'Acknowledged').length + 12, i: CheckCircle2, tone: 'green' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Child Protection' || a.status === 'Elder Protection' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to on-call senior social worker.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
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
// 24. OFFLINE & SYNC
// ============================================================
export const SocialWorkOffline = () => {
  const { notify, node } = useSuccess();
  const rows = [
    { id: 'SYS-001', kind: 'Home visit note', item: 'Pa Odunsi — voice + photo', state: 'Pending sync' },
    { id: 'SYS-002', kind: 'Family assessment draft', item: 'Bakare family — genogram', state: 'Auto-saved' },
    { id: 'SYS-003', kind: 'Trial leave note', item: 'Mrs. Adeyemi — Day 3', state: 'Synced' },
    { id: 'SYS-004', kind: 'Welfare disbursement', item: 'Jane Doe 042 receipt', state: 'Pending sync' },
  ];
  return (
    <Shell title="Offline & Sync">
      <Section icon={<WifiOff className="h-5 w-5" />} title="Offline & Connectivity Resilience"
        desc="Offline auto-save, queued sync and recovery for home visit and community workflows."
        action={<Button onClick={() => notify({ title: 'Sync started', message: 'Queued items syncing now.' })}><Repeat className="h-4 w-4 mr-1" /> Sync All</Button>}
      />
      <KpiGrid items={[
        { l: 'Connection', v: 'Online', i: WifiOff, tone: 'green' },
        { l: 'Pending Sync', v: rows.filter(r => r.state === 'Pending sync').length, i: AlertCircle, tone: 'amber' },
        { l: 'Auto-saved Drafts', v: rows.filter(r => r.state === 'Auto-saved').length, i: ClipboardList, tone: 'blue' },
        { l: 'Synced', v: rows.filter(r => r.state === 'Synced').length, i: CheckCircle2, tone: 'green' },
        { l: 'Last Sync', v: '4 min ago', i: Repeat, tone: 'purple' },
        { l: 'Conflicts', v: 0, i: AlertTriangle, tone: 'rose' },
      ]} />
      <Card>
        <Table>
          <TableHeader><TableRow>{['ID', 'Kind', 'Item', 'State', ''].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{rows.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell><TableCell>{r.kind}</TableCell><TableCell>{r.item}</TableCell>
              <TableCell><Chip label={r.state} t={r.state === 'Synced' ? 'green' : 'amber'} /></TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => notify({ title: 'Item synced', message: r.item })}>Sync</Button></TableCell>
            </TableRow>))}</TableBody>
        </Table>
      </Card>
      {node}
    </Shell>
  );
};

// ============================================================
// 25. MOBILE / TABLET
// ============================================================
export const SocialWorkMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for home visits, community work, family meetings, trial leave reviews and welfare assessments." />
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
// 26. CONFIG
// ============================================================
export const SocialWorkConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Social Work Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Social Work Configuration"
        desc="Manage social work services, assessment templates, NGO partnerships, welfare programmes, court templates and reporting templates." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Social Work Services', 'Family Assessment Templates', 'Home Visit Templates',
          'Community Reintegration Templates', 'Trial Leave Templates', 'Welfare Programmes',
          'NGO Partnerships', 'Court Liaison Templates', 'Child Protection Templates',
          'Elder Protection Templates', 'Community Follow-Up Templates', 'Reporting Templates',
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
