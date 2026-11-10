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
  Brain, Pill, Repeat, Home, UsersRound, ShieldAlert, BedDouble, Send,
  CheckCircle2, Search, Printer, Download, Eye, Bell, Plus, Paperclip, AlertCircle,
  Footprints, Accessibility, UserCheck, Stethoscope,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/psychogeriatrics';

export const psychogeriatricsNav = [
  { label: 'Psychogeriatric Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Elderly Registry', path: `${base}/registry`, icon: <Users className="h-4 w-4" /> },
  { label: 'Memory Clinic', path: `${base}/memory`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Cognitive Assessment', path: `${base}/cognitive`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Functional Assessment', path: `${base}/functional`, icon: <Accessibility className="h-4 w-4" /> },
  { label: 'Frailty & Falls Risk', path: `${base}/falls`, icon: <Footprints className="h-4 w-4" /> },
  { label: 'Elder Abuse Screening', path: `${base}/elder-abuse`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Caregiver Center', path: `${base}/caregivers`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Medication Review', path: `${base}/medications`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Long-Term Care', path: `${base}/long-term`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Home Care & Community', path: `${base}/home-care`, icon: <Home className="h-4 w-4" /> },
  { label: 'Family Support', path: `${base}/family`, icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Inpatient Psychogeriatrics', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Follow-Up Management', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Psychogeriatric Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={psychogeriatricsNav} title={`Psychogeriatrics · ${title}`}>{children}</DashboardLayout>
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
// Dummy data — GFA HMS psychogeriatric clinic
// ============================================================
const PATIENTS = [
  { id: 'PSG-2026-001', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Alzheimer\'s — moderate' },
  { id: 'PSG-2026-002', name: 'Ma Salamatu Bello', age: 72, sex: 'F', dx: 'Vascular dementia' },
  { id: 'PSG-2026-003', name: 'Pa Emeka Okonkwo', age: 81, sex: 'M', dx: 'Late-onset depression' },
  { id: 'PSG-2026-004', name: 'Ma Hadiza Sani', age: 69, sex: 'F', dx: 'MCI — amnestic' },
  { id: 'PSG-2026-005', name: 'Pa Tunde Akinola', age: 84, sex: 'M', dx: 'Lewy body dementia' },
  { id: 'PSG-2026-006', name: 'Ma Adunni Ogundipe', age: 76, sex: 'F', dx: 'Late-onset psychosis' },
  { id: 'PSG-2026-007', name: 'Pa Sunday Iroegbu', age: 70, sex: 'M', dx: 'Delirium (resolving)' },
  { id: 'PSG-2026-008', name: 'Ma Folake Adeyemi', age: 74, sex: 'F', dx: 'Anxiety + insomnia' },
];

const ELDERLY = [
  { id: 'PSG-2026-001', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Alzheimer\'s — moderate', caregiver: 'Mrs. Funmi Odunsi', risk: 'High', new: false },
  { id: 'PSG-2026-002', name: 'Ma Salamatu Bello', age: 72, sex: 'F', dx: 'Vascular dementia', caregiver: 'Mr. Aliyu Bello', risk: 'Moderate', new: false },
  { id: 'PSG-2026-003', name: 'Pa Emeka Okonkwo', age: 81, sex: 'M', dx: 'Late-onset depression', caregiver: 'Mrs. Ngozi Okonkwo', risk: 'Moderate', new: false },
  { id: 'PSG-2026-004', name: 'Ma Hadiza Sani', age: 69, sex: 'F', dx: 'MCI — amnestic', caregiver: 'Daughter', risk: 'Low', new: true },
  { id: 'PSG-2026-005', name: 'Pa Tunde Akinola', age: 84, sex: 'M', dx: 'Lewy body dementia', caregiver: 'Live-in nurse', risk: 'Critical', new: false },
  { id: 'PSG-2026-006', name: 'Ma Adunni Ogundipe', age: 76, sex: 'F', dx: 'Late-onset psychosis', caregiver: 'Son + spouse', risk: 'High', new: false },
  { id: 'PSG-2026-007', name: 'Pa Sunday Iroegbu', age: 70, sex: 'M', dx: 'Delirium (resolving)', caregiver: 'Spouse', risk: 'Moderate', new: true },
  { id: 'PSG-2026-008', name: 'Ma Folake Adeyemi', age: 74, sex: 'F', dx: 'Anxiety + insomnia', caregiver: 'Daughter-in-law', risk: 'Low', new: false },
];

const MEMORY = [
  { id: 'MEM-001', patient: 'Pa Adebayo Odunsi', baseline: 'MMSE 22 (2025)', current: 'MMSE 17', trend: 'Severe Decline', next: '2026-09-01' },
  { id: 'MEM-002', patient: 'Ma Salamatu Bello', baseline: 'MMSE 23 (2025)', current: 'MMSE 21', trend: 'Mild Decline', next: '2026-09-05' },
  { id: 'MEM-003', patient: 'Ma Hadiza Sani', baseline: 'MMSE 25 (2025)', current: 'MMSE 24', trend: 'Stable', next: '2026-12-01' },
  { id: 'MEM-004', patient: 'Pa Tunde Akinola', baseline: 'MMSE 19 (2025)', current: 'MMSE 15', trend: 'Severe Decline', next: '2026-08-15' },
  { id: 'MEM-005', patient: 'Pa Emeka Okonkwo', baseline: 'MoCA 24', current: 'MoCA 22', trend: 'Moderate Decline', next: '2026-06-04' },
  { id: 'MEM-006', patient: 'Ma Adunni Ogundipe', baseline: 'MMSE 22', current: 'MMSE 19', trend: 'Follow-Up Due', next: '2026-06-03' },
];

const COGNITIVE = [
  { id: 'COG-001', patient: 'Pa Adebayo Odunsi', type: 'Dementia Assessment', clinician: 'Dr. Bola', status: 'In Progress', flag: 'Dementia', priority: 'Urgent' },
  { id: 'COG-002', patient: 'Ma Salamatu Bello', type: 'MoCA', clinician: 'Dr. Aisha', status: 'Pending', flag: 'Dementia', priority: 'Routine' },
  { id: 'COG-003', patient: 'Pa Sunday Iroegbu', type: 'Delirium Assessment', clinician: 'Dr. Hassan', status: 'Completed', flag: 'Delirium', priority: 'Urgent' },
  { id: 'COG-004', patient: 'Pa Tunde Akinola', type: 'Dementia Workup', clinician: 'Dr. Bola', status: 'In Progress', flag: 'Severe', priority: 'Urgent' },
  { id: 'COG-005', patient: 'Ma Hadiza Sani', type: 'MMSE', clinician: 'Dr. Olufemi', status: 'Completed', flag: 'Stable', priority: 'Routine' },
  { id: 'COG-006', patient: 'Pa Emeka Okonkwo', type: 'Cognitive Impairment Screening', clinician: 'Dr. Aisha', status: 'Pending', flag: 'Dementia', priority: 'Routine' },
];
const COG_TYPES = ['Dementia Assessment', 'Alzheimer\'s Assessment', 'Cognitive Impairment Screening', 'Delirium Assessment', 'Memory Testing', 'Orientation Testing'];

const FUNCTIONAL = [
  { id: 'FN-001', patient: 'Pa Adebayo Odunsi', adl: '3/6', iadl: '2/8', mobility: 'Walker', selfcare: 'Partial Assistance' },
  { id: 'FN-002', patient: 'Ma Salamatu Bello', adl: '5/6', iadl: '4/8', mobility: 'Independent', selfcare: 'Independent' },
  { id: 'FN-003', patient: 'Pa Tunde Akinola', adl: '1/6', iadl: '0/8', mobility: 'Wheelchair', selfcare: 'Full Assistance' },
  { id: 'FN-004', patient: 'Ma Adunni Ogundipe', adl: '4/6', iadl: '3/8', mobility: 'Cane', selfcare: 'Partial Assistance' },
  { id: 'FN-005', patient: 'Pa Emeka Okonkwo', adl: '0/6', iadl: '0/8', mobility: 'Bed-bound', selfcare: 'Dependent' },
  { id: 'FN-006', patient: 'Ma Hadiza Sani', adl: '6/6', iadl: '8/8', mobility: 'Independent', selfcare: 'Due' },
];

const FALLS = [
  { id: 'FR-001', patient: 'Pa Adebayo Odunsi', frailty: 'Frail (CFS 6)', score: 'High (Morse 65)', risk: 'High', falls12m: 3, plan: 'PT referral + grab bars' },
  { id: 'FR-002', patient: 'Pa Tunde Akinola', frailty: 'Very frail (CFS 7)', score: 'High (Morse 80)', risk: 'High', falls12m: 5, plan: 'Bedside alarm + assist x2' },
  { id: 'FR-003', patient: 'Ma Salamatu Bello', frailty: 'Pre-frail (CFS 4)', score: 'Moderate (Morse 45)', risk: 'Moderate', falls12m: 1, plan: 'Vision review + lighting' },
  { id: 'FR-004', patient: 'Ma Hadiza Sani', frailty: 'Robust (CFS 3)', score: 'Low (Morse 20)', risk: 'Low', falls12m: 0, plan: 'Balance exercises' },
  { id: 'FR-005', patient: 'Ma Adunni Ogundipe', frailty: 'Frail (CFS 5)', score: 'Moderate', risk: 'Recent Falls', falls12m: 2, plan: 'Plan Due' },
  { id: 'FR-006', patient: 'Pa Sunday Iroegbu', frailty: 'Pre-frail', score: 'Moderate', risk: 'Plan Due', falls12m: 1, plan: 'Plan Due' },
];

const ELDER_ABUSE = [
  { id: 'EA-001', patient: 'Pa Tunde Akinola', concern: 'Neglect — pressure sores', source: 'Home visit nurse', level: 'High', status: 'Investigation Pending' },
  { id: 'EA-002', patient: 'Ma Adunni Ogundipe', concern: 'Financial — pension diverted', source: 'Daughter complaint', level: 'High', status: 'Escalated' },
  { id: 'EA-003', patient: 'Ma Salamatu Bello', concern: 'Caregiver stress / verbal', source: 'Self-report', level: 'Moderate', status: 'New' },
  { id: 'EA-004', patient: 'Pa Adebayo Odunsi', concern: 'Emotional abuse', source: 'Social work', level: 'Low', status: 'New' },
];
const ABUSE_TYPES = ['Physical Abuse', 'Emotional Abuse', 'Financial Abuse', 'Neglect', 'Caregiver Stress Concern'];

const CAREGIVERS = [
  { id: 'CG-001', name: 'Mrs. Funmi Odunsi', patient: 'Pa Adebayo Odunsi', relation: 'Daughter', burden: 'High', score: 'Zarit 58' },
  { id: 'CG-002', name: 'Mr. Aliyu Bello', patient: 'Ma Salamatu Bello', relation: 'Son', burden: 'Moderate', score: 'Zarit 36' },
  { id: 'CG-003', name: 'Mrs. Ngozi Okonkwo', patient: 'Pa Emeka Okonkwo', relation: 'Spouse', burden: 'Moderate', score: 'Zarit 30' },
  { id: 'CG-004', name: 'Live-in Nurse', patient: 'Pa Tunde Akinola', relation: 'Hired carer', burden: 'Burnout Risk', score: 'Zarit 62' },
  { id: 'CG-005', name: 'Mrs. Sade Akin', patient: 'Ma Adunni Ogundipe', relation: 'Daughter-in-law', burden: 'Support Needed', score: 'Zarit 48' },
  { id: 'CG-006', name: 'Mr. Bayo Sani', patient: 'Ma Hadiza Sani', relation: 'Son', burden: 'Low', score: 'Zarit 14' },
];

const MEDS = [
  { id: 'RX-PSG-001', patient: 'Pa Adebayo Odunsi', count: 9, status: 'Polypharmacy', highRisk: 'Donepezil, Quetiapine', interactions: '2 major' },
  { id: 'RX-PSG-002', patient: 'Ma Salamatu Bello', count: 6, status: 'High Risk', highRisk: 'Memantine, Sertraline', interactions: '1 moderate' },
  { id: 'RX-PSG-003', patient: 'Ma Adunni Ogundipe', count: 5, status: 'Due', highRisk: 'Risperidone (BPSD)', interactions: 'None' },
  { id: 'RX-PSG-004', patient: 'Pa Emeka Okonkwo', count: 4, status: 'Completed', highRisk: 'Mirtazapine', interactions: 'None' },
  { id: 'RX-PSG-005', patient: 'Pa Tunde Akinola', count: 11, status: 'Adverse Reaction', highRisk: 'Haloperidol — EPSE', interactions: '3 major' },
  { id: 'RX-PSG-006', patient: 'Ma Hadiza Sani', count: 3, status: 'Completed', highRisk: '—', interactions: 'None' },
];

const LONGTERM = [
  { id: 'LTC-001', patient: 'Pa Adebayo Odunsi', plan: 'Home Care', goals: 'Maintain ADL, prevent falls', status: 'Active', review: '2026-07-15' },
  { id: 'LTC-002', patient: 'Pa Tunde Akinola', plan: 'Residential Care', goals: 'Comfort, dignity, safety', status: 'Review Due', review: '2026-06-30' },
  { id: 'LTC-003', patient: 'Ma Salamatu Bello', plan: 'Home Care', goals: 'Cognitive stimulation', status: 'Active', review: '2026-08-01' },
  { id: 'LTC-004', patient: 'Ma Adunni Ogundipe', plan: 'Residential Care', goals: 'Behaviour stabilisation', status: 'Active', review: '2026-07-01' },
  { id: 'LTC-005', patient: 'Pa Emeka Okonkwo', plan: 'Home Care', goals: 'Mood support', status: 'Completed', review: '2026-05-20' },
];

const HOMECARE = [
  { id: 'HC-001', patient: 'Pa Adebayo Odunsi', visit: 'Nurse + OT', area: 'Abeokuta GRA', date: '2026-06-03', status: 'Today' },
  { id: 'HC-002', patient: 'Pa Tunde Akinola', visit: 'Nurse + Psychiatrist', area: 'Ibara Housing', date: '2026-06-03', status: 'High Risk' },
  { id: 'HC-003', patient: 'Ma Adunni Ogundipe', visit: 'Social Worker', area: 'Itoku', date: '2026-06-05', status: 'Scheduled' },
  { id: 'HC-004', patient: 'Ma Salamatu Bello', visit: 'Nurse follow-up', area: 'Kuto', date: '2026-05-27', status: 'Completed' },
  { id: 'HC-005', patient: 'Pa Emeka Okonkwo', visit: 'Nurse review', area: 'Lafenwa', date: '2026-05-30', status: 'Missed' },
];

const FAMILY = [
  { id: 'FAM-001', family: 'Odunsi family', patient: 'Pa Adebayo Odunsi', focus: 'Dementia education', type: 'Caregiver Education', status: 'Today', date: '2026-06-03' },
  { id: 'FAM-002', family: 'Akinola household', patient: 'Pa Tunde Akinola', focus: 'End-of-life planning', type: 'Crisis Support', status: 'Pending', date: '2026-06-05' },
  { id: 'FAM-003', family: 'Ogundipe family', patient: 'Ma Adunni Ogundipe', focus: 'Conflict mediation', type: 'Crisis Support', status: 'Pending', date: '2026-06-09' },
  { id: 'FAM-004', family: 'Okonkwo family', patient: 'Pa Emeka Okonkwo', focus: 'Mood support', type: 'Caregiver Education', status: 'Completed', date: '2026-05-29' },
];

const INPATIENT = [
  { id: 'IPD-PSG-001', patient: 'Ma Adunni Ogundipe', unit: 'Psychogeriatric Ward', bed: 'PSG-04', status: 'Critical', admitted: '2026-05-28' },
  { id: 'IPD-PSG-002', patient: 'Pa Sunday Iroegbu', unit: 'Memory Care Unit', bed: 'MCU-02', status: 'Watch', admitted: '2026-05-29' },
  { id: 'IPD-PSG-003', patient: 'Pa Tunde Akinola', unit: 'High Dependency Elderly', bed: 'HDE-01', status: 'Active', admitted: '2026-05-20' },
  { id: 'IPD-PSG-004', patient: 'Ma Hadiza Sani', unit: 'Psychogeriatric Ward', bed: 'PSG-07', status: 'Stable', admitted: '2026-06-01' },
  { id: 'IPD-PSG-005', patient: 'Pa Adebayo Odunsi', unit: 'Memory Care Unit', bed: 'MCU-04', status: 'New', admitted: '2026-06-02' },
  { id: 'IPD-PSG-006', patient: 'Pa Emeka Okonkwo', unit: 'Psychogeriatric Ward', bed: 'PSG-02', status: 'Discharge Planned', admitted: '2026-05-22' },
];

const FOLLOWUPS = [
  { id: 'FU-001', patient: 'Pa Adebayo Odunsi', type: 'Memory clinic review', date: '2026-06-03', status: 'Today' },
  { id: 'FU-002', patient: 'Ma Salamatu Bello', type: 'Cognitive reassessment', date: '2026-06-05', status: 'Confirmed' },
  { id: 'FU-003', patient: 'Mrs. Funmi Odunsi', type: 'Caregiver burden review', date: '2026-06-06', status: 'Pending' },
  { id: 'FU-004', patient: 'Pa Tunde Akinola', type: 'Home visit', date: '2026-05-30', status: 'Missed' },
  { id: 'FU-005', patient: 'Ma Adunni Ogundipe', type: 'Inpatient review', date: '2026-06-04', status: 'Rescheduled' },
  { id: 'FU-006', patient: 'Pa Emeka Okonkwo', type: 'Medication review', date: '2026-05-30', status: 'Rejected' },
];

const SERVICE_TYPES = [
  'Memory Clinic Visit', 'Cognitive Assessment', 'Functional Assessment',
  'Home Visit', 'Family Session', 'Long-Term Care Review', 'Medication Review',
];

const INVOICES = [
  { id: 'INV-PSG-901', patient: 'Pa Adebayo Odunsi', service: 'Memory clinic + MoCA + medication review', amount: 38000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-PSG-902', patient: 'Ma Adunni Ogundipe', service: 'Inpatient (5d)', amount: 175000, nhia: 'Pending', status: 'NHIA' },
  { id: 'INV-PSG-903', patient: 'Pa Tunde Akinola', service: 'Home Visit ×2 + caregiver training', amount: 42000, nhia: '—', status: 'Home Care' },
  { id: 'INV-PSG-904', patient: 'Mrs. Ngozi Okonkwo', service: 'Family counselling (4 sessions)', amount: 32000, nhia: '—', status: 'Paid' },
  { id: 'INV-PSG-905', patient: 'Ma Salamatu Bello', service: 'Cognitive Assessment', amount: 18000, nhia: 'Pending', status: 'Pending' },
  { id: 'INV-PSG-906', patient: 'Pa Sunday Iroegbu', service: 'Long-Term Care Review', amount: 22000, nhia: '—', status: 'Outstanding' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Bola (Doctor)', dept: 'Doctor', patient: 'Pa Adebayo Odunsi', preview: 'Cognitive decline accelerating; please review meds.', time: '09:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Dr. Aisha (Psychology)', dept: 'Psychology', patient: 'Ma Salamatu Bello', preview: 'CST programme confirmed for Thursday.', time: '08:42', unread: 0, urgent: false },
  { id: 'TH-3', with: 'Nurse Blessing (Nurse)', dept: 'Nurse', patient: 'Pa Tunde Akinola', preview: 'Pressure sore worsening — escalating.', time: 'Yesterday', unread: 1, urgent: true },
  { id: 'TH-4', with: 'Pharm. Femi (Pharmacy)', dept: 'Pharmacy', patient: 'Ma Adunni Ogundipe', preview: 'Risperidone dose review queued.', time: '2d', unread: 0, urgent: false },
  { id: 'TH-5', with: 'Mrs. Funmi (Social Work)', dept: 'Social Work', patient: 'Pa Tunde Akinola', preview: 'Neglect investigation update attached.', time: '3d', unread: 1, urgent: true },
  { id: 'TH-6', with: 'OT Tunde (Occupational Therapy)', dept: 'Occupational Therapy', patient: 'Pa Adebayo Odunsi', preview: 'Home safety report ready.', time: '4d', unread: 0, urgent: false },
  { id: 'TH-7', with: 'PT Bola (Physiotherapy)', dept: 'Physiotherapy', patient: 'Ma Adunni Ogundipe', preview: 'Balance exercises updated.', time: '5d', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-1', patient: 'Pa Tunde Akinola', type: 'Severe Cognitive Decline', message: 'MMSE drop 19→15 in 90 days.', date: '2026-06-03', status: 'Critical' },
  { id: 'AL-2', patient: 'Pa Adebayo Odunsi', type: 'High Falls Risk', message: 'Morse 65 + 3 falls past year.', date: '2026-06-03', status: 'Falls Risk' },
  { id: 'AL-3', patient: 'Ma Adunni Ogundipe', type: 'Elder Abuse — Financial', message: 'Pension diversion escalated.', date: '2026-06-02', status: 'Elder Abuse' },
  { id: 'AL-4', patient: 'Pa Tunde Akinola', type: 'Medication Risk', message: 'Polypharmacy with EPSE.', date: '2026-06-02', status: 'Medication Risk' },
  { id: 'AL-5', patient: 'Ma Salamatu Bello', type: 'Cognitive Decline', message: 'Trend declining.', date: '2026-06-01', status: 'Cognitive Decline' },
  { id: 'AL-6', patient: 'Ma Hadiza Sani', type: 'Stable case', message: 'Routine follow-up acknowledged.', date: '2026-05-30', status: 'Acknowledged' },
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
export const PsychogeriatricsDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'Elderly Registry', i: Users, p: 'registry' },
    { l: 'Memory Clinic', i: Brain, p: 'memory' },
    { l: 'Cognitive Assessment', i: ClipboardList, p: 'cognitive' },
    { l: 'Functional Assessment', i: Accessibility, p: 'functional' },
    { l: 'Frailty & Falls Risk', i: Footprints, p: 'falls' },
    { l: 'Elder Abuse', i: ShieldAlert, p: 'elder-abuse' },
    { l: 'Caregiver Center', i: UsersRound, p: 'caregivers' },
    { l: 'Medication Review', i: Pill, p: 'medications' },
    { l: 'Long-Term Care', i: HeartHandshake, p: 'long-term' },
    { l: 'Home Care', i: Home, p: 'home-care' },
    { l: 'Family Support', i: UserCheck, p: 'family' },
    { l: 'Inpatient', i: BedDouble, p: 'inpatient' },
    { l: 'Follow-Up', i: Repeat, p: 'followup' },
    { l: 'Billing & NHIA', i: CreditCard, p: 'billing' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Communication', i: MessageSquare, p: 'comms' },
    { l: 'Critical Alerts', i: AlertTriangle, p: 'alerts' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<Activity className="h-5 w-5" />}
        title="Psychogeriatric Services Workspace"
        desc="GFA HMS · Specialist workspace for elderly mental health: dementia, Alzheimer's, MCI, delirium, late-life depression and psychosis, frailty, falls, caregiver support and long-term care."
        action={
          <>
            <Button onClick={() => nav(`${base}/cognitive?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/memory?new=1`)}><Brain className="h-4 w-4 mr-1" /> Memory Clinic</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'Active Elderly Patients', v: 418, i: Users, tone: 'blue' },
        { l: 'Dementia Cases', v: 248, i: Brain, tone: 'purple' },
        { l: 'Cognitive Decline Cases', v: 84, i: TrendingUp, tone: 'amber' },
        { l: 'Stable Memory Cases', v: 116, i: CheckCircle2, tone: 'green' },
        { l: 'High Falls Risk', v: 37, i: Footprints, tone: 'rose' },
        { l: 'High Caregiver Burden', v: 24, i: UsersRound, tone: 'amber' },
      ]} />
      <KpiGrid items={[
        { l: 'Elder Abuse Concerns', v: 11, i: ShieldAlert, tone: 'rose' },
        { l: 'Follow-Ups Due', v: 18, i: CalendarDays, tone: 'amber' },
        { l: 'Inpatient Cases', v: 14, i: BedDouble, tone: 'purple' },
        { l: 'Billing Pending', v: 9, i: CreditCard, tone: 'rose' },
        { l: 'Critical Alerts', v: 4, i: AlertTriangle, tone: 'rose' },
        { l: 'Revenue (MTD)', v: formatCurrency(3180000), i: CreditCard, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Risk Patients</div>
          <div className="space-y-2">{ELDERLY.filter(e => e.risk === 'High' || e.risk === 'Critical').map(e => (
            <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div>
                <div className="text-sm font-semibold">{e.name} <span className="text-xs text-muted-foreground">· {e.age}y</span></div>
                <div className="text-xs text-muted-foreground">{e.dx}</div>
              </div>
              <Chip label={e.risk} t={e.risk === 'Critical' ? 'red' : 'orange'} />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Memory Clinic</div>
          <div className="space-y-2">{MEMORY.slice(0, 4).map(m => (
            <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{m.patient}</div><div className="text-xs text-muted-foreground">{m.baseline} → {m.current}</div></div>
              <Chip label={m.trend} t={m.trend.includes('Severe') ? 'red' : m.trend === 'Stable' ? 'green' : 'amber'} />
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
// 2. ELDERLY REGISTRY
// ============================================================
export const ElderlyRegistry = () => {
  const [selected, setSelected] = useState<typeof ELDERLY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Elderly Registry"
        icon={<Users className="h-5 w-5" />}
        title="Elderly Patient Registry"
        desc="Register and track elderly patients with risk classification, caregiver and follow-up status."
        ctaLabel="Register Elder Patient"
        kpis={[
          { l: 'Total Elderly', v: ELDERLY.length + 410, i: Users, tone: 'blue' },
          { l: 'Low Risk', v: ELDERLY.filter(e => e.risk === 'Low').length + 142, i: CheckCircle2, tone: 'green' },
          { l: 'Moderate Risk', v: ELDERLY.filter(e => e.risk === 'Moderate').length + 168, i: AlertCircle, tone: 'amber' },
          { l: 'High Risk', v: ELDERLY.filter(e => e.risk === 'High').length + 74, i: ShieldAlert, tone: 'rose' },
          { l: 'Critical Risk', v: ELDERLY.filter(e => e.risk === 'Critical').length + 12, i: AlertTriangle, tone: 'red' },
          { l: 'Newly Registered', v: ELDERLY.filter(e => e.new).length + 18, i: FilePlus, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'low', label: 'Low Risk', filter: (r: any) => r.risk === 'Low' },
          { key: 'mod', label: 'Moderate Risk', filter: (r: any) => r.risk === 'Moderate' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
          { key: 'crit', label: 'Critical Risk', filter: (r: any) => r.risk === 'Critical' },
          { key: 'new', label: 'New', filter: (r: any) => r.new },
        ]}
        rows={ELDERLY}
        searchFields={(r: any) => `${r.name} ${r.id} ${r.dx}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'n', header: 'Name', render: r => `${r.name} · ${r.age}y` },
          { key: 'dx', header: 'Diagnosis', render: r => r.dx },
          { key: 'cg', header: 'Caregiver', render: r => r.caregiver },
          { key: 'rk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'Critical' ? 'red' : r.risk === 'High' ? 'orange' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Register Elder Patient" submitLabel="Register"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'age', label: 'Age', type: 'number' },
            { k: 'sex', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
            { k: 'cg', label: 'Primary Caregiver', type: 'text' },
            { k: 'living', label: 'Living Arrangement', type: 'select', options: ['With family', 'Alone', 'Residential', 'Hired carer'] },
            { k: 'mob', label: 'Mobility Status', type: 'select', options: ['Independent', 'Cane', 'Walker', 'Wheelchair', 'Bed-bound'] },
            { k: 'mem', label: 'Memory Concern', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
            { k: 'falls', label: 'Falls History (12m)', type: 'number' },
            { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Elderly patient registered successfully" nextStep="Open patient profile or register another."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Elder Patient · ${selected.name}`}
          sections={[
            { label: 'Patient ID', value: selected.id },
            { label: 'Age / Sex', value: `${selected.age}y · ${selected.sex}` },
            { label: 'Diagnosis', value: selected.dx },
            { label: 'Risk Level', value: <Chip label={selected.risk} t={selected.risk === 'Critical' ? 'red' : selected.risk === 'High' ? 'orange' : 'amber'} /> },
            { label: 'Memory Status', value: 'MMSE 17 — moderate impairment' },
            { label: 'Functional Status', value: 'ADL 3/6 · IADL 2/8' },
            { label: 'Caregiver', value: selected.caregiver },
            { label: 'Follow-Up History', value: '3 reviews · last 2026-05-20' },
            { label: 'Medication Review', value: 'Polypharmacy flagged' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 3. MEMORY CLINIC
// ============================================================
export const MemoryClinic = () => {
  const [selected, setSelected] = useState<typeof MEMORY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Memory Clinic"
        icon={<Brain className="h-5 w-5" />}
        title="Memory Clinic"
        desc="Memory clinic visits, cognitive trends, MMSE/MoCA tracking and follow-up scheduling."
        ctaLabel="New Visit"
        kpis={[
          { l: 'Memory Clinic Visits', v: MEMORY.length + 90, i: Brain, tone: 'blue' },
          { l: 'Stable', v: MEMORY.filter(m => m.trend === 'Stable').length + 38, i: CheckCircle2, tone: 'green' },
          { l: 'Mild Decline', v: MEMORY.filter(m => m.trend === 'Mild Decline').length + 24, i: TrendingUp, tone: 'amber' },
          { l: 'Moderate Decline', v: MEMORY.filter(m => m.trend === 'Moderate Decline').length + 18, i: TrendingUp, tone: 'orange' },
          { l: 'Severe Decline', v: MEMORY.filter(m => m.trend === 'Severe Decline').length + 9, i: AlertTriangle, tone: 'red' },
          { l: 'Follow-Up Due', v: MEMORY.filter(m => m.trend === 'Follow-Up Due').length + 7, i: CalendarDays, tone: 'amber' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'st', label: 'Stable', filter: (r: any) => r.trend === 'Stable' },
          { key: 'md', label: 'Mild Decline', filter: (r: any) => r.trend === 'Mild Decline' },
          { key: 'mod', label: 'Moderate Decline', filter: (r: any) => r.trend === 'Moderate Decline' },
          { key: 'sv', label: 'Severe Decline', filter: (r: any) => r.trend === 'Severe Decline' },
          { key: 'fu', label: 'Follow-Up Due', filter: (r: any) => r.trend === 'Follow-Up Due' },
        ]}
        rows={MEMORY}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'Visit', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'b', header: 'Baseline', render: r => r.baseline },
          { key: 'c', header: 'Current', render: r => r.current },
          { key: 't', header: 'Trend', render: r => <Chip label={r.trend} t={r.trend.includes('Severe') ? 'red' : r.trend === 'Stable' ? 'green' : 'amber'} /> },
          { key: 'n', header: 'Next', render: r => r.next },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Memory Clinic Visit" submitLabel="Book Visit"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Visit Type', type: 'select', options: ['Baseline', 'Follow-Up', 'Reassessment', 'Crisis'] },
            { k: 'concern', label: 'Memory Complaint', type: 'textarea' },
            { k: 'trend', label: 'Cognitive Trend', type: 'select', options: ['Stable', 'Mild Decline', 'Moderate Decline', 'Severe Decline'] },
            { k: 'doc', label: 'Clinician', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan', 'Dr. Olufemi'] },
            { k: 'fu', label: 'Follow-Up Date', type: 'date' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Memory clinic visit booked" nextStep="Open the memory workspace to record findings."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Memory Clinic · ${selected.patient}`}
          sections={[
            { label: 'Visit ID', value: selected.id },
            { label: 'Previous Scores', value: selected.baseline },
            { label: 'Current Assessment', value: selected.current },
            { label: 'Cognitive Trend', value: <Chip label={selected.trend} t={selected.trend.includes('Severe') ? 'red' : 'amber'} /> },
            { label: 'Recommendations', value: 'Initiate cholinesterase inhibitor; refer OT.' },
            { label: 'Follow-Up Plan', value: `Next visit: ${selected.next}` },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 4. COGNITIVE ASSESSMENT
// ============================================================
export const CognitiveAssessment = () => {
  const [selected, setSelected] = useState<typeof COGNITIVE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Cognitive Assessment"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Cognitive Assessment"
        desc="MMSE, MoCA, dementia and delirium screening for elderly patients."
        ctaLabel="Start Cognitive Assessment"
        kpis={[
          { l: 'Pending', v: COGNITIVE.filter(c => c.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: COGNITIVE.filter(c => c.status === 'In Progress').length + 8, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: COGNITIVE.filter(c => c.status === 'Completed').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Dementia Screening', v: COGNITIVE.filter(c => c.flag === 'Dementia').length + 18, i: Brain, tone: 'purple' },
          { l: 'Delirium Screening', v: COGNITIVE.filter(c => c.flag === 'Delirium').length + 6, i: AlertTriangle, tone: 'red' },
          { l: 'Severe Decline', v: COGNITIVE.filter(c => c.flag === 'Severe').length + 4, i: ShieldAlert, tone: 'red' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ip', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'dm', label: 'Dementia', filter: (r: any) => r.flag === 'Dementia' },
          { key: 'dl', label: 'Delirium', filter: (r: any) => r.flag === 'Delirium' },
          { key: 'sv', label: 'Severe', filter: (r: any) => r.flag === 'Severe' },
        ]}
        rows={COGNITIVE}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'c', header: 'Clinician', render: r => r.clinician },
          { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'Urgent' ? 'red' : 'blue'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'purple' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><FilePlus className="h-3.5 w-3.5 mr-1" /> Begin</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Start Cognitive Assessment" submitLabel="Start Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Assessment Type', type: 'select', options: COG_TYPES },
            { k: 'baseline', label: 'Baseline Score', type: 'text' },
            { k: 'concern', label: 'Current Concern', type: 'textarea' },
            { k: 'clinician', label: 'Clinician', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Dr. Hassan', 'Dr. Olufemi'] },
            { k: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent', 'Stat'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Cognitive assessment started" nextStep="Open the assessment workspace to enter scores."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Cognitive Assessment · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Assessment Template', value: selected.type },
            { label: 'Clinician', value: selected.clinician },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Completed' ? 'green' : 'amber'} /> },
            { label: 'Score Entry', value: 'MMSE 17 / 30 — moderate impairment' },
            { label: 'Interpretation', value: 'Suggestive of moderate Alzheimer\'s dementia.' },
            { label: 'Recommendations', value: 'Initiate donepezil 5mg; OT referral; caregiver education.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Draft saved')}>Save Draft</Button>
              <Button onClick={() => { setSelected(null); toast.success('Assessment submitted'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Assessment</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 5. FUNCTIONAL ASSESSMENT
// ============================================================
export const FunctionalAssessment = () => {
  const [selected, setSelected] = useState<typeof FUNCTIONAL[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Functional Assessment"
        icon={<Accessibility className="h-5 w-5" />}
        title="Functional & Self-Care Assessment"
        desc="ADL/IADL scoring, mobility, feeding, bathing, dressing and medication self-management."
        ctaLabel="New Assessment"
        kpis={[
          { l: 'Independent', v: FUNCTIONAL.filter(f => f.selfcare === 'Independent').length + 92, i: CheckCircle2, tone: 'green' },
          { l: 'Partial Assistance', v: FUNCTIONAL.filter(f => f.selfcare === 'Partial Assistance').length + 76, i: AlertCircle, tone: 'amber' },
          { l: 'Full Assistance', v: FUNCTIONAL.filter(f => f.selfcare === 'Full Assistance').length + 34, i: ShieldAlert, tone: 'orange' },
          { l: 'Dependent', v: FUNCTIONAL.filter(f => f.selfcare === 'Dependent').length + 16, i: AlertTriangle, tone: 'red' },
          { l: 'Assessment Due', v: FUNCTIONAL.filter(f => f.selfcare === 'Due').length + 14, i: CalendarDays, tone: 'amber' },
          { l: 'Total', v: FUNCTIONAL.length + 234, i: ClipboardList, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'in', label: 'Independent', filter: (r: any) => r.selfcare === 'Independent' },
          { key: 'pa', label: 'Partial Assistance', filter: (r: any) => r.selfcare === 'Partial Assistance' },
          { key: 'fu', label: 'Full Assistance', filter: (r: any) => r.selfcare === 'Full Assistance' },
          { key: 'dp', label: 'Dependent', filter: (r: any) => r.selfcare === 'Dependent' },
          { key: 'du', label: 'Due', filter: (r: any) => r.selfcare === 'Due' },
        ]}
        rows={FUNCTIONAL}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'a', header: 'ADL (Katz)', render: r => r.adl },
          { key: 'i', header: 'IADL (Lawton)', render: r => r.iadl },
          { key: 'm', header: 'Mobility', render: r => r.mobility },
          { key: 's', header: 'Self-Care', render: r => <Chip label={r.selfcare} t={r.selfcare === 'Dependent' ? 'red' : r.selfcare === 'Full Assistance' ? 'orange' : r.selfcare === 'Independent' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Functional Assessment" submitLabel="Save Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'adl', label: 'ADL Status (Katz 0-6)', type: 'number' },
            { k: 'iadl', label: 'IADL Status (Lawton 0-8)', type: 'number' },
            { k: 'mob', label: 'Mobility', type: 'select', options: ['Independent', 'Cane', 'Walker', 'Wheelchair', 'Bed-bound'] },
            { k: 'feed', label: 'Feeding', type: 'select', options: ['Independent', 'Assist', 'Full assist'] },
            { k: 'bath', label: 'Bathing', type: 'select', options: ['Independent', 'Assist', 'Full assist'] },
            { k: 'dress', label: 'Dressing', type: 'select', options: ['Independent', 'Assist', 'Full assist'] },
            { k: 'med', label: 'Medication Mgmt', type: 'select', options: ['Independent', 'Reminder', 'Full assist'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Functional assessment saved" nextStep="Open the workspace to add recommendations."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Functional Assessment · ${selected.patient}`}
          sections={[
            { label: 'ID', value: selected.id },
            { label: 'ADL / IADL', value: `${selected.adl} · ${selected.iadl}` },
            { label: 'Mobility', value: selected.mobility },
            { label: 'Self-Care', value: <Chip label={selected.selfcare} t={selected.selfcare === 'Dependent' ? 'red' : 'amber'} /> },
            { label: 'Functional Recommendations', value: 'OT home review; mobility aid; caregiver training.' },
            { label: 'Progress Trend', value: 'Declining function over 6 months.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 6. FRAILTY & FALLS RISK
// ============================================================
export const FrailtyFallsCenter = () => {
  const [selected, setSelected] = useState<typeof FALLS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Frailty & Falls Risk"
        icon={<Footprints className="h-5 w-5" />}
        title="Frailty & Falls Risk"
        desc="Frailty scoring (CFS), Morse falls scale, prevention planning and follow-up."
        ctaLabel="New Falls Assessment"
        kpis={[
          { l: 'Low Falls Risk', v: FALLS.filter(f => f.risk === 'Low').length + 60, i: CheckCircle2, tone: 'green' },
          { l: 'Moderate Falls Risk', v: FALLS.filter(f => f.risk === 'Moderate').length + 42, i: AlertCircle, tone: 'amber' },
          { l: 'High Falls Risk', v: FALLS.filter(f => f.risk === 'High').length + 28, i: ShieldAlert, tone: 'red' },
          { l: 'Recent Falls', v: FALLS.filter(f => f.risk === 'Recent Falls').length + 12, i: AlertTriangle, tone: 'orange' },
          { l: 'Plan Due', v: FALLS.filter(f => f.risk === 'Plan Due').length + 8, i: CalendarDays, tone: 'amber' },
          { l: 'Total', v: FALLS.length + 150, i: Footprints, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'low', label: 'Low Risk', filter: (r: any) => r.risk === 'Low' },
          { key: 'mod', label: 'Moderate Risk', filter: (r: any) => r.risk === 'Moderate' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.risk === 'High' },
          { key: 'rec', label: 'Recent Falls', filter: (r: any) => r.risk === 'Recent Falls' },
          { key: 'pd', label: 'Plan Due', filter: (r: any) => r.risk === 'Plan Due' },
        ]}
        rows={FALLS}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'fr', header: 'Frailty', render: r => r.frailty },
          { key: 'sc', header: 'Score', render: r => r.score },
          { key: 'f12', header: 'Falls (12m)', render: r => r.falls12m },
          { key: 'rk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High' ? 'red' : r.risk === 'Moderate' ? 'amber' : r.risk === 'Low' ? 'green' : 'orange'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Falls Assessment" submitLabel="Save Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'history', label: 'Falls History (12m)', type: 'number' },
            { k: 'mob', label: 'Mobility Status', type: 'select', options: ['Independent', 'Cane', 'Walker', 'Wheelchair'] },
            { k: 'bal', label: 'Balance Concern', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
            { k: 'cfs', label: 'Frailty Score (CFS 1-9)', type: 'number' },
            { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High'] },
            { k: 'plan', label: 'Prevention Plan', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Falls assessment saved" nextStep="Open the workspace to define prevention plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Falls Risk · ${selected.patient}`}
          sections={[
            { label: 'Risk Score', value: selected.score },
            { label: 'Frailty', value: selected.frailty },
            { label: 'Falls History', value: `${selected.falls12m} in last 12 months` },
            { label: 'Prevention Plan', value: selected.plan },
            { label: 'Follow-Up Actions', value: 'PT review · home safety inspection · caregiver training' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 7. ELDER ABUSE SCREENING
// ============================================================
export const ElderAbuseScreening = () => {
  const [selected, setSelected] = useState<typeof ELDER_ABUSE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Elder Abuse Screening"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Elder Abuse Screening"
        desc="Identify, classify and escalate elder abuse and neglect concerns with safeguarding workflow."
        ctaLabel="New Concern"
        kpis={[
          { l: 'New Concerns', v: ELDER_ABUSE.filter(e => e.status === 'New').length + 6, i: FilePlus, tone: 'purple' },
          { l: 'Low Risk', v: ELDER_ABUSE.filter(e => e.level === 'Low').length + 3, i: CheckCircle2, tone: 'green' },
          { l: 'Moderate Risk', v: ELDER_ABUSE.filter(e => e.level === 'Moderate').length + 5, i: AlertCircle, tone: 'amber' },
          { l: 'High Risk', v: ELDER_ABUSE.filter(e => e.level === 'High').length + 4, i: ShieldAlert, tone: 'red' },
          { l: 'Escalated', v: ELDER_ABUSE.filter(e => e.status === 'Escalated').length + 2, i: AlertTriangle, tone: 'red' },
          { l: 'Investigation Pending', v: ELDER_ABUSE.filter(e => e.status === 'Investigation Pending').length + 3, i: Search, tone: 'amber' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'new', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'low', label: 'Low Risk', filter: (r: any) => r.level === 'Low' },
          { key: 'mod', label: 'Moderate Risk', filter: (r: any) => r.level === 'Moderate' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.level === 'High' },
          { key: 'esc', label: 'Escalated', filter: (r: any) => r.status === 'Escalated' },
          { key: 'inv', label: 'Investigation Pending', filter: (r: any) => r.status === 'Investigation Pending' },
        ]}
        rows={ELDER_ABUSE}
        searchFields={(r: any) => `${r.patient} ${r.concern}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'c', header: 'Concern', render: r => r.concern },
          { key: 's', header: 'Source', render: r => r.source },
          { key: 'l', header: 'Level', render: r => <Chip label={r.level} t={r.level === 'High' ? 'red' : r.level === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Escalated' ? 'red' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Search className="h-3.5 w-3.5 mr-1" /> Investigate</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Elder Abuse Concern" submitLabel="Log Concern"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Concern Type', type: 'select', options: ABUSE_TYPES },
            { k: 'reporter', label: 'Reported By', type: 'text' },
            { k: 'level', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High'] },
            { k: 'action', label: 'Immediate Action', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Elder abuse concern logged" nextStep="Investigation workflow started; social work notified."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Investigation · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Concern Details', value: selected.concern },
            { label: 'Source', value: selected.source },
            { label: 'Risk Level', value: <Chip label={selected.level} t={selected.level === 'High' ? 'red' : 'amber'} /> },
            { label: 'Investigation Notes', value: 'Home visit scheduled; police liaison briefed.' },
            { label: 'Action Plan', value: 'Caregiver replacement; financial freeze; safeguarding plan.' },
            { label: 'Outcome', value: 'Pending case conference.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Investigation note saved')}>Save Note</Button>
              <Button onClick={() => { setSelected(null); toast.success('Concern escalated'); }}><AlertTriangle className="h-4 w-4 mr-1" /> Escalate</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 8. CAREGIVER CENTER
// ============================================================
export const CaregiverCenter = () => {
  const [selected, setSelected] = useState<typeof CAREGIVERS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Caregiver Center"
        icon={<UsersRound className="h-5 w-5" />}
        title="Caregiver Center"
        desc="Register caregivers, track Zarit burden scores, training and support plans."
        ctaLabel="Register Caregiver"
        kpis={[
          { l: 'Registered Caregivers', v: CAREGIVERS.length + 220, i: UsersRound, tone: 'blue' },
          { l: 'Low Burden', v: CAREGIVERS.filter(c => c.burden === 'Low').length + 92, i: CheckCircle2, tone: 'green' },
          { l: 'Moderate Burden', v: CAREGIVERS.filter(c => c.burden === 'Moderate').length + 64, i: AlertCircle, tone: 'amber' },
          { l: 'High Burden', v: CAREGIVERS.filter(c => c.burden === 'High').length + 28, i: ShieldAlert, tone: 'orange' },
          { l: 'Burnout Risk', v: CAREGIVERS.filter(c => c.burden === 'Burnout Risk').length + 9, i: AlertTriangle, tone: 'red' },
          { l: 'Support Needed', v: CAREGIVERS.filter(c => c.burden === 'Support Needed').length + 18, i: HeartHandshake, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'lo', label: 'Low Burden', filter: (r: any) => r.burden === 'Low' },
          { key: 'mo', label: 'Moderate Burden', filter: (r: any) => r.burden === 'Moderate' },
          { key: 'hi', label: 'High Burden', filter: (r: any) => r.burden === 'High' },
          { key: 'br', label: 'Burnout Risk', filter: (r: any) => r.burden === 'Burnout Risk' },
          { key: 'sp', label: 'Support Needed', filter: (r: any) => r.burden === 'Support Needed' },
        ]}
        rows={CAREGIVERS}
        searchFields={(r: any) => `${r.name} ${r.patient}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'n', header: 'Caregiver', render: r => r.name },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'r', header: 'Relation', render: r => r.relation },
          { key: 's', header: 'Score', render: r => r.score },
          { key: 'b', header: 'Burden', render: r => <Chip label={r.burden} t={r.burden === 'Burnout Risk' ? 'red' : r.burden === 'High' ? 'orange' : r.burden === 'Moderate' ? 'amber' : r.burden === 'Low' ? 'green' : 'purple'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Register Caregiver" submitLabel="Register"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'name', label: 'Caregiver Name', type: 'text' },
            { k: 'rel', label: 'Relationship', type: 'select', options: ['Spouse', 'Son', 'Daughter', 'Sibling', 'Hired carer', 'Friend'] },
            { k: 'phone', label: 'Phone Number', type: 'text' },
            { k: 'addr', label: 'Address', type: 'text' },
            { k: 'bur', label: 'Burden Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Burnout Risk', 'Support Needed'] },
            { k: 'needs', label: 'Support Needs', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Caregiver registered successfully" nextStep="Open caregiver profile for burden assessment."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Caregiver · ${selected.name}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Relation', value: selected.relation },
            { label: 'Burden Score', value: selected.score },
            { label: 'Burden Level', value: <Chip label={selected.burden} t={selected.burden === 'Burnout Risk' ? 'red' : 'amber'} /> },
            { label: 'Support Plan', value: 'Weekly check-in · respite arranged · psychoeducation' },
            { label: 'Follow-Up Sessions', value: '4 sessions scheduled' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 9. MEDICATION REVIEW
// ============================================================
export const MedicationReview = () => {
  const [selected, setSelected] = useState<typeof MEDS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Medication Review"
        icon={<Pill className="h-5 w-5" />}
        title="Medication Review"
        desc="Polypharmacy detection, Beers criteria flags, anticholinergic burden and elderly-specific risk alerts."
        ctaLabel="New Medication Review"
        kpis={[
          { l: 'Reviews Due', v: MEDS.filter(m => m.status === 'Due').length + 14, i: CalendarDays, tone: 'amber' },
          { l: 'Polypharmacy', v: MEDS.filter(m => m.status === 'Polypharmacy').length + 38, i: Pill, tone: 'orange' },
          { l: 'High-Risk', v: MEDS.filter(m => m.status === 'High Risk').length + 21, i: ShieldAlert, tone: 'red' },
          { l: 'Adverse Reaction', v: MEDS.filter(m => m.status === 'Adverse Reaction').length + 6, i: AlertTriangle, tone: 'red' },
          { l: 'Completed', v: MEDS.filter(m => m.status === 'Completed').length + 92, i: CheckCircle2, tone: 'green' },
          { l: 'Total', v: MEDS.length + 180, i: ClipboardList, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'du', label: 'Due', filter: (r: any) => r.status === 'Due' },
          { key: 'po', label: 'Polypharmacy', filter: (r: any) => r.status === 'Polypharmacy' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.status === 'High Risk' },
          { key: 'ar', label: 'Adverse Reaction', filter: (r: any) => r.status === 'Adverse Reaction' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={MEDS}
        searchFields={(r: any) => `${r.patient} ${r.highRisk}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'c', header: 'Meds', render: r => r.count },
          { key: 'hr', header: 'High Risk', render: r => r.highRisk },
          { key: 'in', header: 'Interactions', render: r => r.interactions },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Adverse Reaction' || r.status === 'High Risk' ? 'red' : r.status === 'Polypharmacy' ? 'orange' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Medication Review" submitLabel="Start Review"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'meds', label: 'Current Medications', type: 'textarea' },
            { k: 'poly', label: 'Polypharmacy Risk', type: 'select', options: ['No', 'Borderline', 'Yes'] },
            { k: 'side', label: 'Side Effects', type: 'textarea' },
            { k: 'comp', label: 'Compliance', type: 'select', options: ['Good', 'Partial', 'Poor'] },
            { k: 'rec', label: 'Recommendation', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Medication review started" nextStep="Open the workspace to review the medication list."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Medication Review · ${selected.patient}`}
          sections={[
            { label: 'Total Meds', value: selected.count },
            { label: 'Current Medication List', value: 'Donepezil 5mg · Quetiapine 25mg · Lisinopril 10mg · Tramadol 50mg · …' },
            { label: 'High-Risk Drugs', value: selected.highRisk },
            { label: 'Interaction Warnings', value: selected.interactions },
            { label: 'Elderly Risk Alerts', value: 'Beers criteria flagged for tramadol; anticholinergic burden moderate.' },
            { label: 'Recommendations', value: 'Taper tramadol; switch to paracetamol; review quetiapine indication.' },
            { label: 'Review History', value: '3 prior reviews — last 2026-04-12' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 10. LONG-TERM CARE
// ============================================================
export const LongTermCare = () => {
  const [selected, setSelected] = useState<typeof LONGTERM[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Long-Term Care"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Long-Term Care Plans"
        desc="Home and residential long-term care planning, goals, review schedule and care team."
        ctaLabel="New Care Plan"
        kpis={[
          { l: 'Active Plans', v: LONGTERM.filter(l => l.status === 'Active').length + 56, i: HeartHandshake, tone: 'blue' },
          { l: 'Home Care', v: LONGTERM.filter(l => l.plan === 'Home Care').length + 38, i: Home, tone: 'green' },
          { l: 'Residential', v: LONGTERM.filter(l => l.plan === 'Residential Care').length + 22, i: BedDouble, tone: 'purple' },
          { l: 'Review Due', v: LONGTERM.filter(l => l.status === 'Review Due').length + 9, i: CalendarDays, tone: 'amber' },
          { l: 'Completed', v: LONGTERM.filter(l => l.status === 'Completed').length + 12, i: CheckCircle2, tone: 'green' },
          { l: 'Total', v: LONGTERM.length + 80, i: ClipboardList, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'ac', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'hc', label: 'Home Care', filter: (r: any) => r.plan === 'Home Care' },
          { key: 'rc', label: 'Residential Care', filter: (r: any) => r.plan === 'Residential Care' },
          { key: 'rd', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={LONGTERM}
        searchFields={(r: any) => `${r.patient} ${r.plan}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'pl', header: 'Care Type', render: r => r.plan },
          { key: 'g', header: 'Goals', render: r => r.goals },
          { key: 'r', header: 'Review', render: r => r.review },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : r.status === 'Completed' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Long-Term Care Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Care Type', type: 'select', options: ['Home Care', 'Residential Care', 'Day Care', 'Hospice'] },
            { k: 'goals', label: 'Goals', type: 'textarea' },
            { k: 'cg', label: 'Caregiver Support', type: 'textarea' },
            { k: 'nurse', label: 'Nursing Support', type: 'textarea' },
            { k: 'fu', label: 'Follow-Up Schedule', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Care plan created" nextStep="Care team notified; first review scheduled."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Care Plan · ${selected.patient}`}
          sections={[
            { label: 'Plan Summary', value: selected.plan },
            { label: 'Goals', value: selected.goals },
            { label: 'Progress', value: 'Goals met on schedule.' },
            { label: 'Care Team', value: 'Psychogeriatrician · Nurse · OT · Social Work' },
            { label: 'Review Notes', value: `Next review: ${selected.review}` },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 11. HOME CARE & COMMUNITY
// ============================================================
export const HomeCareCommunity = () => {
  const [selected, setSelected] = useState<typeof HOMECARE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Home Care & Community"
        icon={<Home className="h-5 w-5" />}
        title="Home Care & Community Visits"
        desc="Schedule, conduct and document home visits with caregiver education and home safety assessments."
        ctaLabel="Schedule Home Visit"
        kpis={[
          { l: 'Today', v: HOMECARE.filter(h => h.status === 'Today').length + 4, i: CalendarDays, tone: 'blue' },
          { l: 'Scheduled', v: HOMECARE.filter(h => h.status === 'Scheduled').length + 18, i: CalendarDays, tone: 'amber' },
          { l: 'Completed', v: HOMECARE.filter(h => h.status === 'Completed').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Missed', v: HOMECARE.filter(h => h.status === 'Missed').length + 5, i: AlertTriangle, tone: 'red' },
          { l: 'High Risk', v: HOMECARE.filter(h => h.status === 'High Risk').length + 3, i: ShieldAlert, tone: 'rose' },
          { l: 'Total', v: HOMECARE.length + 94, i: Home, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'td', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'sc', label: 'Scheduled', filter: (r: any) => r.status === 'Scheduled' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'ms', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.status === 'High Risk' },
        ]}
        rows={HOMECARE}
        searchFields={(r: any) => `${r.patient} ${r.area}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'v', header: 'Visit Team', render: r => r.visit },
          { key: 'a', header: 'Area', render: r => r.area },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' || r.status === 'High Risk' ? 'red' : r.status === 'Today' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule Home Visit" submitLabel="Schedule"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'date', label: 'Visit Date', type: 'date' },
            { k: 'purpose', label: 'Purpose', type: 'select', options: ['Routine review', 'Caregiver training', 'Crisis visit', 'Medication check', 'Safety assessment'] },
            { k: 'staff', label: 'Assigned Staff', type: 'select', options: ['Nurse Olamide', 'Nurse Blessing', 'Dr. Bola', 'OT Tunde', 'Social Worker'] },
            { k: 'addr', label: 'Home Address', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Home visit scheduled" nextStep="Visit team notified and route planned."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Home Visit · ${selected.patient}`}
          sections={[
            { label: 'Visit Team', value: selected.visit },
            { label: 'Area', value: selected.area },
            { label: 'Date', value: selected.date },
            { label: 'Visit Notes', value: 'Patient stable; environment clean; mobility aids in place.' },
            { label: 'Home Assessment', value: 'Bathroom rails installed; rugs removed.' },
            { label: 'Caregiver Notes', value: 'Caregiver reports manageable load.' },
            { label: 'Recommendations', value: 'Continue current plan; review in 2 weeks.' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 12. FAMILY SUPPORT
// ============================================================
export const FamilySupport = () => {
  const [selected, setSelected] = useState<typeof FAMILY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Family Support"
        icon={<UserCheck className="h-5 w-5" />}
        title="Family Support Sessions"
        desc="Family counselling, caregiver education and crisis support for elderly patients and their families."
        ctaLabel="New Family Session"
        kpis={[
          { l: 'Today', v: FAMILY.filter(f => f.status === 'Today').length + 3, i: CalendarDays, tone: 'blue' },
          { l: 'Pending', v: FAMILY.filter(f => f.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: FAMILY.filter(f => f.status === 'Completed').length + 48, i: CheckCircle2, tone: 'green' },
          { l: 'Caregiver Education', v: FAMILY.filter(f => f.type === 'Caregiver Education').length + 26, i: BookOpen, tone: 'purple' },
          { l: 'Crisis Support', v: FAMILY.filter(f => f.type === 'Crisis Support').length + 8, i: AlertTriangle, tone: 'red' },
          { l: 'Total', v: FAMILY.length + 70, i: UserCheck, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'td', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'ce', label: 'Caregiver Education', filter: (r: any) => r.type === 'Caregiver Education' },
          { key: 'cs', label: 'Crisis Support', filter: (r: any) => r.type === 'Crisis Support' },
        ]}
        rows={FAMILY}
        searchFields={(r: any) => `${r.family} ${r.patient}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'f', header: 'Family', render: r => r.family },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'fo', header: 'Focus', render: r => r.focus },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Today' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Family Support Session" submitLabel="Schedule Session"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'member', label: 'Family Member', type: 'text' },
            { k: 'type', label: 'Session Type', type: 'select', options: ['Caregiver Education', 'Crisis Support', 'Counselling', 'Family Mediation', 'Bereavement'] },
            { k: 'concern', label: 'Concern', type: 'textarea' },
            { k: 'staff', label: 'Assigned Staff', type: 'select', options: ['Dr. Aisha', 'Dr. Olufemi', 'Social Worker', 'Mrs. Funmi'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Family session scheduled" nextStep="Family notified; reminders queued."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Family Session · ${selected.family}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Focus', value: selected.focus },
            { label: 'Type', value: selected.type },
            { label: 'Session Notes', value: 'Family engaged; agreed on rota and respite plan.' },
            { label: 'Caregiver Education', value: 'Dementia behaviour management discussed.' },
            { label: 'Recommendations', value: 'Continue weekly check-ins; revisit in 4 weeks.' },
            { label: 'Follow-Up', value: '2026-06-20' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 13. INPATIENT
// ============================================================
export const InpatientPsychogeriatrics = () => {
  const [selected, setSelected] = useState<typeof INPATIENT[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Inpatient Psychogeriatrics"
        icon={<BedDouble className="h-5 w-5" />}
        title="Inpatient Psychogeriatric Ward"
        desc="Active admissions, ward/bed allocation, status tracking and discharge planning."
        ctaLabel="Admit Patient"
        kpis={[
          { l: 'Active', v: INPATIENT.filter(i => i.status === 'Active').length + 8, i: BedDouble, tone: 'blue' },
          { l: 'New', v: INPATIENT.filter(i => i.status === 'New').length + 3, i: FilePlus, tone: 'purple' },
          { l: 'Stable', v: INPATIENT.filter(i => i.status === 'Stable').length + 12, i: CheckCircle2, tone: 'green' },
          { l: 'Watch', v: INPATIENT.filter(i => i.status === 'Watch').length + 5, i: AlertCircle, tone: 'amber' },
          { l: 'Critical', v: INPATIENT.filter(i => i.status === 'Critical').length + 2, i: AlertTriangle, tone: 'red' },
          { l: 'Discharge Planned', v: INPATIENT.filter(i => i.status === 'Discharge Planned').length + 4, i: ScrollText, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'ac', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'nw', label: 'New', filter: (r: any) => r.status === 'New' },
          { key: 'st', label: 'Stable', filter: (r: any) => r.status === 'Stable' },
          { key: 'wa', label: 'Watch', filter: (r: any) => r.status === 'Watch' },
          { key: 'cr', label: 'Critical', filter: (r: any) => r.status === 'Critical' },
          { key: 'dp', label: 'Discharge Planned', filter: (r: any) => r.status === 'Discharge Planned' },
        ]}
        rows={INPATIENT}
        searchFields={(r: any) => `${r.patient} ${r.unit} ${r.bed}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'u', header: 'Unit', render: r => r.unit },
          { key: 'b', header: 'Bed', render: r => r.bed },
          { key: 'a', header: 'Admitted', render: r => r.admitted },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical' ? 'red' : r.status === 'Watch' ? 'amber' : r.status === 'Stable' ? 'green' : r.status === 'New' ? 'purple' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Admit Patient" submitLabel="Admit"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'ward', label: 'Ward / Bed', type: 'select', options: ['Psychogeriatric Ward · PSG-01', 'PSG-02', 'PSG-03', 'Memory Care Unit · MCU-01', 'MCU-02', 'HDE-01'] },
            { k: 'reason', label: 'Admission Reason', type: 'textarea' },
            { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Critical'] },
            { k: 'team', label: 'Assigned Team', type: 'select', options: ['Dr. Bola + Nurse Olamide', 'Dr. Aisha + Nurse Blessing', 'Dr. Hassan + Nurse Aisha'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Patient admitted" nextStep="Open inpatient workspace to start care plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Inpatient · ${selected.patient}`}
          sections={[
            { label: 'Ward / Bed', value: `${selected.unit} · ${selected.bed}` },
            { label: 'Admitted', value: selected.admitted },
            { label: 'Care Plan', value: 'Behaviour management; cognitive stimulation; safe environment.' },
            { label: 'Medication Review', value: 'Reviewed today — risperidone reduced.' },
            { label: 'Falls Risk', value: 'High — bedside alarm in place.' },
            { label: 'Cognitive Status', value: 'MMSE 16; oriented to person only.' },
            { label: 'Nursing Notes', value: 'Slept poorly; appetite fair; vitals stable.' },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Critical' ? 'red' : 'amber'} /> },
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
export const FollowUpManagement = () => {
  const [selected, setSelected] = useState<typeof FOLLOWUPS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Follow-Up Management"
        icon={<Repeat className="h-5 w-5" />}
        title="Follow-Up Management"
        desc="Scheduled clinic, home and caregiver follow-ups with confirmation, reschedule and missed-visit workflows."
        ctaLabel="Add Follow-Up"
        kpis={[
          { l: 'Today', v: FOLLOWUPS.filter(f => f.status === 'Today').length + 6, i: CalendarDays, tone: 'blue' },
          { l: 'Confirmed', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 22, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 14, i: AlertCircle, tone: 'amber' },
          { l: 'Rescheduled', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 4, i: Repeat, tone: 'purple' },
          { l: 'Rejected', v: FOLLOWUPS.filter(f => f.status === 'Rejected').length + 2, i: AlertTriangle, tone: 'red' },
          { l: 'Missed', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 3, i: AlertTriangle, tone: 'rose' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'td', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'cf', label: 'Confirmed', filter: (r: any) => r.status === 'Confirmed' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'rs', label: 'Rescheduled', filter: (r: any) => r.status === 'Rescheduled' },
          { key: 'rj', label: 'Rejected', filter: (r: any) => r.status === 'Rejected' },
          { key: 'ms', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
        ]}
        rows={FOLLOWUPS}
        searchFields={(r: any) => `${r.patient} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' || r.status === 'Rejected' ? 'red' : r.status === 'Today' ? 'blue' : r.status === 'Confirmed' ? 'green' : r.status === 'Rescheduled' ? 'purple' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Add Follow-Up" submitLabel="Schedule"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Memory clinic review', 'Cognitive reassessment', 'Caregiver burden review', 'Home visit', 'Medication review', 'Inpatient review'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'staff', label: 'Staff', type: 'select', options: ['Dr. Bola', 'Dr. Aisha', 'Nurse Olamide', 'Social Worker'] },
            { k: 'status', label: 'Status', type: 'select', options: ['Pending', 'Confirmed', 'Rescheduled'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Follow-up scheduled" nextStep="SMS reminder queued; added to upcoming list."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Follow-Up · ${selected.patient}`}
          sections={[
            { label: 'Follow-Up Reason', value: selected.type },
            { label: 'Date', value: selected.date },
            { label: 'Previous Notes', value: 'Last visit: MMSE stable, mood improved.' },
            { label: 'Current Status', value: <Chip label={selected.status} t={selected.status === 'Missed' ? 'red' : 'amber'} /> },
            { label: 'Next Steps', value: 'Confirm attendance; reassess if missed.' },
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
export const PsychogeriatricsBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Psychogeriatric Billing & NHIA"
        desc="Memory clinic, cognitive, functional, home visit and inpatient billing with NHIA mapping."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 130, i: CreditCard, tone: 'blue' },
          { l: 'Paid', v: INVOICES.filter(i => i.status === 'Paid').length + 78, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: INVOICES.filter(i => i.status === 'Pending').length + 16, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA', v: INVOICES.filter(i => i.status === 'NHIA').length + 22, i: ShieldAlert, tone: 'blue' },
          { l: 'Outstanding', v: INVOICES.filter(i => i.status === 'Outstanding').length + 9, i: AlertTriangle, tone: 'red' },
          { l: 'Home Care', v: INVOICES.filter(i => i.status === 'Home Care').length + 14, i: Home, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pd', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nh', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' },
          { key: 'os', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'hc', label: 'Home Care', filter: (r: any) => r.status === 'Home Care' },
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
export const PsychogeriatricsReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '7d', notes: '' });
  const TYPES = ['Dementia Report', 'Memory Clinic Report', 'Cognitive Assessment Report', 'Falls Risk Report', 'Caregiver Burden Report', 'Home Care Report', 'Billing Report', 'Follow-Up Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Psychogeriatric Reporting Center"
        desc="Generate dementia, memory, cognitive, falls, caregiver, home care, billing and follow-up reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 86, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 5, i: AlertCircle, tone: 'amber' },
        { l: 'Dementia Reports', v: 24, i: Brain, tone: 'purple' },
        { l: 'Falls Reports', v: 14, i: Footprints, tone: 'rose' },
        { l: 'Caregiver Reports', v: 18, i: UsersRound, tone: 'amber' },
        { l: 'Billing Reports', v: 12, i: CreditCard, tone: 'green' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Psychogeriatrics · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Elderly</div><div className="font-semibold text-lg">418</div></div>
                  <div><div className="text-xs text-muted-foreground">Dementia Cases</div><div className="font-semibold text-lg">248</div></div>
                  <div><div className="text-xs text-muted-foreground">Home Visits</div><div className="font-semibold text-lg">94</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(3180000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Alzheimer's remains the leading dementia subtype (57%)</li>
                  <li>High caregiver burden in 24 active households</li>
                  <li>Falls incidents down 12% with prevention programme</li>
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
export const PsychogeriatricsComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'psy', l: 'Psychology' }, { k: 'nur', l: 'Nurse' },
    { k: 'phm', l: 'Pharmacy' }, { k: 'sw', l: 'Social Work' }, { k: 'ot', l: 'OT' }, { k: 'pt', l: 'Physio' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', psy: 'psychology', nur: 'nurse', phm: 'pharmacy', sw: 'social', ot: 'occupational', pt: 'physiotherapy' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Psychogeriatric Communication Center"
        desc="Secure messaging with Doctor, Psychology, Nurse, Pharmacy, Social Work, OT and Physiotherapy — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Attachments', v: 9, i: Paperclip, tone: 'blue' },
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
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Noted — updating chart and care plan now.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest MMSE form.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'mmse-form.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
export const PsychogeriatricsAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'fa', l: 'Falls Risk', f: (a: any) => a.status === 'Falls Risk' },
    { k: 'cd', l: 'Cognitive Decline', f: (a: any) => a.status === 'Cognitive Decline' || a.status === 'Critical' },
    { k: 'ea', l: 'Elder Abuse', f: (a: any) => a.status === 'Elder Abuse' },
    { k: 'mr', l: 'Medication Risk', f: (a: any) => a.status === 'Medication Risk' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Psychogeriatric Alerts"
        desc="Severe cognitive decline, falls, elder abuse, polypharmacy and medication-risk alerts." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length, i: AlertTriangle, tone: 'red' },
        { l: 'High Falls Risk', v: ALERTS.filter(a => a.status === 'Falls Risk').length, i: Footprints, tone: 'rose' },
        { l: 'Severe Cognitive Decline', v: ALERTS.filter(a => a.status === 'Cognitive Decline').length + 1, i: Brain, tone: 'orange' },
        { l: 'Elder Abuse Alerts', v: ALERTS.filter(a => a.status === 'Elder Abuse').length, i: ShieldAlert, tone: 'red' },
        { l: 'Medication Risk', v: ALERTS.filter(a => a.status === 'Medication Risk').length, i: Pill, tone: 'amber' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Elder Abuse' || a.status === 'Falls Risk' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to on-call psychogeriatrician.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
                      <Button size="sm" onClick={() => nav(`${base}/registry`)}><Users className="h-3.5 w-3.5 mr-1" /> Open Patient</Button>
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
export const PsychogeriatricsResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Psychogeriatric Analytics"
      desc="Dementia subtype trends, depression rates, falls and caregiver burden statistics." />
    <KpiGrid items={[
      { l: 'Alzheimer\'s (YTD)', v: 142, i: Brain, tone: 'amber' },
      { l: 'Vascular dementia', v: 78, i: Brain, tone: 'amber' },
      { l: 'Late-onset depression', v: 96, i: Stethoscope, tone: 'amber' },
      { l: 'Anxiety in elderly', v: 64, i: Stethoscope, tone: 'green' },
      { l: 'Falls (90d)', v: 23, i: Footprints, tone: 'green' },
      { l: 'Elder abuse reports', v: 11, i: ShieldAlert, tone: 'red' },
    ]} />
  </Shell>
);

// ============================================================
// 20. MOBILE
// ============================================================
export const PsychogeriatricsMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for home visits, memory clinic, caregiver workflows and follow-ups across desktop, tablet, mobile and PWA." />
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
export const PsychogeriatricsConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Psychogeriatric Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Psychogeriatric Configuration"
        desc="Manage cognitive assessment templates, falls protocols, caregiver tools, long-term care presets, NHIA mapping and report templates." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Cognitive Assessment Templates', 'Functional Assessment Templates', 'Falls Risk Protocols',
          'Elder Abuse Screening Tools', 'Caregiver Burden Tools', 'Long-Term Care Presets',
          'Home Care Templates', 'Family Session Templates', 'NHIA Service Mapping',
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
