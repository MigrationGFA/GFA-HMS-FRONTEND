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
  Brain, Repeat, Home, UsersRound, ShieldAlert, BedDouble, Send,
  CheckCircle2, Search, Printer, Download, Eye, Bell, Plus, Paperclip, AlertCircle,
  Footprints, Accessibility, Stethoscope, Baby, Armchair, Dumbbell, MoveRight,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/physiotherapy';

export const physioNav = [
  { label: 'Physiotherapy Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Referral Center', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Assessment Center', path: `${base}/assessments`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Mobility Assessment', path: `${base}/mobility`, icon: <Footprints className="h-4 w-4" /> },
  { label: 'Falls Prevention', path: `${base}/falls`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Treatment Plans', path: `${base}/plans`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Exercise Prescription', path: `${base}/exercises`, icon: <Dumbbell className="h-4 w-4" /> },
  { label: 'Therapy Sessions', path: `${base}/sessions`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Neurological Rehab', path: `${base}/neuro`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Psychiatric Rehab', path: `${base}/psych-rehab`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Child Physiotherapy', path: `${base}/child`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Geriatric Physiotherapy', path: `${base}/geriatric`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Addiction Rehab Physio', path: `${base}/addiction`, icon: <MoveRight className="h-4 w-4" /> },
  { label: 'Assistive Devices', path: `${base}/devices`, icon: <Armchair className="h-4 w-4" /> },
  { label: 'Inpatient Physio', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Outpatient Physio', path: `${base}/outpatient`, icon: <Home className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Physiotherapy Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={physioNav} title={`Physiotherapy · ${title}`}>{children}</DashboardLayout>
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

// Success popup hook
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
// Dummy data — GFA HMS Physiotherapy
// ============================================================
const PATIENTS = [
  { id: 'PHY-2026-001', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Falls risk + Alzheimer\'s' },
  { id: 'PHY-2026-002', name: 'Mr. Chidi Eze', age: 62, sex: 'M', dx: 'Right hemiparesis (CVA)' },
  { id: 'PHY-2026-003', name: 'Master Tunde Bakare', age: 7, sex: 'M', dx: 'Developmental coordination disorder' },
  { id: 'PHY-2026-004', name: 'Mr. Sola Adebayo', age: 34, sex: 'M', dx: 'Post-detox deconditioning' },
  { id: 'PHY-2026-005', name: 'Ma Salamatu Bello', age: 72, sex: 'F', dx: 'Vascular dementia + arthralgia' },
  { id: 'PHY-2026-006', name: 'Mrs. Funke Adeyemi', age: 41, sex: 'F', dx: 'Depression — behavioural activation' },
  { id: 'PHY-2026-007', name: 'Pa Tunde Akinola', age: 84, sex: 'M', dx: 'Lewy body dementia + falls' },
  { id: 'PHY-2026-008', name: 'Mr. Ibrahim Musa', age: 58, sex: 'M', dx: 'Parkinsonism' },
  { id: 'PHY-2026-009', name: 'Miss Adaeze Nnamdi', age: 5, sex: 'F', dx: 'Cerebral palsy — spastic diplegia' },
  { id: 'PHY-2026-010', name: 'Master Bolu Ajayi', age: 9, sex: 'M', dx: 'Autism + low tone' },
];

const REFERRALS = [
  { id: 'PTR-001', patient: 'Pa Adebayo Odunsi', from: 'Psychogeriatrics — Dr. Sowemimo', reason: 'Falls prevention + gait training', priority: 'High', status: 'Accepted', assigned: 'PT. Olamide' },
  { id: 'PTR-002', patient: 'Master Tunde Bakare', from: 'CAP — Dr. Aluko', reason: 'Gross motor delay — coordination training', priority: 'Medium', status: 'Pending', assigned: '—' },
  { id: 'PTR-003', patient: 'Mr. Chidi Eze', from: 'Doctor — Dr. Okafor', reason: 'Post-stroke neuro rehab', priority: 'High', status: 'Accepted', assigned: 'PT. Bukola' },
  { id: 'PTR-004', patient: 'Mr. Sola Adebayo', from: 'Addiction — Dr. Adeyemi', reason: 'Physical reconditioning post-detox', priority: 'Low', status: 'Accepted', assigned: 'PT. Femi' },
  { id: 'PTR-005', patient: 'Ma Salamatu Bello', from: 'OT — TR. Adesina', reason: 'Joint mobility + balance', priority: 'Medium', status: 'Pending', assigned: '—' },
  { id: 'PTR-006', patient: 'Mrs. Funke Adeyemi', from: 'Psychiatry — Dr. Lawal', reason: 'Behavioural activation + exercise therapy', priority: 'Low', status: 'Accepted', assigned: 'PT. Bukola' },
  { id: 'PTR-007', patient: 'Pa Tunde Akinola', from: 'Nursing — IPD', reason: 'Bedside review — contracture prevention', priority: 'High', status: 'Completed', assigned: 'PT. Olamide' },
];

const ASSESSMENTS = [
  { id: 'AS-001', patient: 'Pa Adebayo Odunsi', type: 'Mobility Assessment', clinician: 'PT. Olamide', status: 'In Progress', priority: 'High', flag: 'FU' },
  { id: 'AS-002', patient: 'Master Tunde Bakare', type: 'Functional Assessment', clinician: 'PT. Aisha', status: 'Pending', priority: 'Medium', flag: 'New' },
  { id: 'AS-003', patient: 'Mr. Chidi Eze', type: 'Neurological Assessment', clinician: 'PT. Bukola', status: 'Completed', priority: 'High', flag: 'FU' },
  { id: 'AS-004', patient: 'Mr. Sola Adebayo', type: 'Physical Assessment', clinician: 'PT. Femi', status: 'Completed', priority: 'Low', flag: '—' },
  { id: 'AS-005', patient: 'Ma Salamatu Bello', type: 'Balance Assessment', clinician: 'PT. Olamide', status: 'Pending', priority: 'Medium', flag: 'New' },
  { id: 'AS-006', patient: 'Mr. Ibrahim Musa', type: 'Gait Assessment', clinician: 'PT. Bukola', status: 'In Progress', priority: 'Medium', flag: '—' },
  { id: 'AS-007', patient: 'Pa Tunde Akinola', type: 'Pain Assessment', clinician: 'PT. Femi', status: 'Pending', priority: 'High', flag: 'FU' },
];
const ASSESSMENT_TYPES = ['Physical Assessment', 'Musculoskeletal Assessment', 'Neurological Assessment', 'Functional Assessment', 'Mobility Assessment', 'Balance Assessment', 'Gait Assessment', 'Pain Assessment'];

const MOBILITY = [
  { id: 'MOB-001', patient: 'Pa Adebayo Odunsi', baseline: 'TUG 22s', current: 'TUG 18s', trend: 'Improving', device: 'Walker', score: 'Berg 32/56' },
  { id: 'MOB-002', patient: 'Mr. Chidi Eze', baseline: 'TUG —', current: 'Assist transfer', trend: 'Improving', device: 'Quad cane', score: 'Berg 28/56' },
  { id: 'MOB-003', patient: 'Pa Tunde Akinola', baseline: 'Wheelchair', current: 'Wheelchair', trend: 'Severe Limitation', device: 'Wheelchair', score: 'Berg 14/56' },
  { id: 'MOB-004', patient: 'Mr. Ibrahim Musa', baseline: 'TUG 16s', current: 'TUG 12s', trend: 'Improving', device: 'Independent', score: 'Berg 48/56' },
  { id: 'MOB-005', patient: 'Ma Salamatu Bello', baseline: 'TUG 24s', current: 'TUG 26s', trend: 'Declining', device: 'Cane', score: 'Berg 30/56' },
  { id: 'MOB-006', patient: 'Mrs. Funke Adeyemi', baseline: 'TUG 14s', current: 'TUG 14s', trend: 'Stable', device: 'Independent', score: 'Berg 50/56' },
  { id: 'MOB-007', patient: 'Pa Emeka Okonkwo', baseline: 'TUG 28s', current: 'Review Due', trend: 'Review Due', device: 'Walker', score: 'Berg —' },
];

const FALLS = [
  { id: 'FAL-001', patient: 'Pa Adebayo Odunsi', score: 'Berg 32/56', risk: 'High Risk', falls12m: 3, plan: 'Balance + grab bars + footwear' },
  { id: 'FAL-002', patient: 'Pa Tunde Akinola', score: 'Berg 18/56', risk: 'High Risk', falls12m: 5, plan: 'Bed alarm + assist x2' },
  { id: 'FAL-003', patient: 'Ma Salamatu Bello', score: 'Berg 41/56', risk: 'Moderate Risk', falls12m: 1, plan: 'Strength + vision review' },
  { id: 'FAL-004', patient: 'Mr. Ibrahim Musa', score: 'Berg 48/56', risk: 'Low Risk', falls12m: 0, plan: 'Maintenance balance' },
  { id: 'FAL-005', patient: 'Ma Adunni Ogundipe', score: 'Berg 36/56', risk: 'Recent Fall', falls12m: 2, plan: 'Plan Due' },
  { id: 'FAL-006', patient: 'Pa Sunday Iroegbu', score: 'Berg 40/56', risk: 'Plan Due', falls12m: 1, plan: 'Plan Due' },
];

const PLANS = [
  { id: 'TP-001', patient: 'Pa Adebayo Odunsi', goals: 'Reduce falls, improve TUG <14s', objectives: 4, progress: '55%', review: '2026-06-12', status: 'Active', priority: 'High' },
  { id: 'TP-002', patient: 'Mr. Chidi Eze', goals: 'Independent transfer, walk 50m', objectives: 5, progress: '40%', review: '2026-06-08', status: 'Active', priority: 'High' },
  { id: 'TP-003', patient: 'Mr. Sola Adebayo', goals: 'Restore fitness, cardiovascular', objectives: 3, progress: '70%', review: '2026-06-10', status: 'Active', priority: 'Medium' },
  { id: 'TP-004', patient: 'Master Tunde Bakare', goals: 'Gross motor — age-appropriate', objectives: 6, progress: '30%', review: '2026-06-15', status: 'Active', priority: 'Medium' },
  { id: 'TP-005', patient: 'Mrs. Funke Adeyemi', goals: 'Behavioural activation + exercise', objectives: 4, progress: '100%', review: '2026-05-30', status: 'Completed', priority: 'Medium' },
  { id: 'TP-006', patient: 'Pa Tunde Akinola', goals: 'Comfort + positioning', objectives: 3, progress: '20%', review: '2026-05-25', status: 'Suspended', priority: 'High' },
  { id: 'TP-007', patient: 'Ma Salamatu Bello', goals: 'Mobility maintenance', objectives: 3, progress: '50%', review: '2026-06-02', status: 'Due for Review', priority: 'Medium' },
];

const EXERCISES = [
  { id: 'EX-001', name: 'Quadriceps Strengthening', cat: 'Strength', reps: '3×10', freq: 'Daily', target: 'Geriatric / Knee', media: 'PDF + Video', program: 'Inpatient' },
  { id: 'EX-002', name: 'Hamstring Stretch', cat: 'Stretching', reps: '3×30s', freq: 'Daily', target: 'General', media: 'PDF', program: 'Home Program' },
  { id: 'EX-003', name: 'Single-Leg Stance', cat: 'Balance', reps: '3×20s', freq: 'Daily', target: 'Falls prevention', media: 'PDF + Video', program: 'Outpatient' },
  { id: 'EX-004', name: 'Sit-to-Stand', cat: 'Mobility', reps: '3×10', freq: 'Daily', target: 'Geriatric', media: 'PDF', program: 'Inpatient' },
  { id: 'EX-005', name: 'Heel-to-Toe Walking', cat: 'Mobility', reps: '5×10m', freq: '5×/week', target: 'Neurological', media: 'Video', program: 'Outpatient' },
  { id: 'EX-006', name: 'Wall Push-Up', cat: 'Strength', reps: '3×12', freq: 'Daily', target: 'Upper body', media: 'PDF', program: 'Home Program' },
  { id: 'EX-007', name: 'Brisk Walking (HEP)', cat: 'Mobility', reps: '30 min', freq: '5×/wk', target: 'Addiction recovery', media: 'Patient portal', program: 'Home Program' },
  { id: 'EX-008', name: 'PNF Diagonals', cat: 'Mobility', reps: '3×10', freq: 'Daily', target: 'Stroke', media: 'Video', program: 'Inpatient' },
];

const SESSIONS = [
  { id: 'TS-001', patient: 'Pa Adebayo Odunsi', type: 'Individual — Outpatient', date: '2026-06-03 09:30', therapist: 'PT. Olamide', dur: '45 min', notes: 'Improved sit-to-stand x10', status: 'Today' },
  { id: 'TS-002', patient: 'Mr. Chidi Eze', type: 'Individual — Inpatient', date: '2026-06-03 10:30', therapist: 'PT. Bukola', dur: '40 min', notes: 'PNF UE; transfer assist x1', status: 'Today' },
  { id: 'TS-003', patient: 'Group — Long-stay ward', type: 'Group (8 patients)', date: '2026-06-03 11:30', therapist: 'PT. Femi', dur: '60 min', notes: 'Chair-based exercise circuit', status: 'Today' },
  { id: 'TS-004', patient: 'Master Tunde Bakare', type: 'Paediatric — Individual', date: '2026-06-04 14:00', therapist: 'PT. Aisha', dur: '40 min', notes: 'Ball coordination + balance', status: 'Pending' },
  { id: 'TS-005', patient: 'Mr. Sola Adebayo', type: 'Addiction rehab group', date: '2026-06-02 15:30', therapist: 'PT. Femi', dur: '50 min', notes: 'Cardio + mindful movement', status: 'Completed' },
  { id: 'TS-006', patient: 'Pa Tunde Akinola', type: 'Bedside therapy', date: '2026-05-30 09:00', therapist: 'PT. Olamide', dur: '20 min', notes: 'Patient declined session', status: 'Missed' },
  { id: 'TS-007', patient: 'Ma Salamatu Bello', type: 'Outpatient', date: '2026-06-05 10:00', therapist: 'PT. Bukola', dur: '40 min', notes: 'Reassess mobility', status: 'Follow-Up Required' },
];

const NEURO = [
  { id: 'NR-001', patient: 'Mr. Chidi Eze', dx: 'Right hemiparesis (CVA)', category: 'Stroke', stage: 'Sub-acute', milestone: 'Standing with support', status: 'Active' },
  { id: 'NR-002', patient: 'Mr. Ibrahim Musa', dx: 'Parkinsonism', category: 'Parkinsonism', stage: 'Maintenance', milestone: 'Cadence 105 spm', status: 'Active' },
  { id: 'NR-003', patient: 'Pa Tunde Akinola', dx: 'Dementia + apraxia', category: 'Cognitive-Motor', stage: 'Late', milestone: 'Comfort positioning', status: 'Review Due' },
  { id: 'NR-004', patient: 'Mrs. Funke Adeyemi', dx: 'Functional gait — psychogenic', category: 'Cognitive-Motor', stage: 'Recovery', milestone: 'Indep ambulation 100m', status: 'Active' },
  { id: 'NR-005', patient: 'Pa Emeka Okonkwo', dx: 'Vascular cognitive impairment', category: 'Cognitive-Motor', stage: 'Maintenance', milestone: 'Walking 50m', status: 'Active' },
];

const PSY_REHAB = [
  { id: 'PR-001', patient: 'Mrs. Funke Adeyemi', program: 'Behavioural activation — exercise', category: 'Behavioural Activation', target: 'Mood + activity', adherence: '85%', status: 'Active' },
  { id: 'PR-002', patient: 'Long-stay Ward (12)', program: 'Group physical activity', category: 'Long-Stay', target: 'Functional recovery', adherence: '72%', status: 'Active' },
  { id: 'PR-003', patient: 'Pa Emeka Okonkwo', program: 'Late-life depression — walking', category: 'Behavioural Activation', target: 'Cardiorespiratory', adherence: '90%', status: 'Active' },
  { id: 'PR-004', patient: 'Community Group A', program: 'Reintegration fitness', category: 'Community Fitness', target: 'Vocational readiness', adherence: '78%', status: 'Active' },
  { id: 'PR-005', patient: 'Mr. Yusuf Aliyu', program: '8-wk recovery fitness', category: 'Community Fitness', target: 'Wellness', adherence: '100%', status: 'Completed' },
];

const CHILD = [
  { id: 'CH-001', patient: 'Master Tunde Bakare', age: 7, dx: 'DCD', category: 'Developmental Delay', focus: 'Gross motor + coordination', followUp: '2026-06-12', status: 'Active' },
  { id: 'CH-002', patient: 'Miss Adaeze Nnamdi', age: 5, dx: 'Cerebral palsy — spastic diplegia', category: 'Motor Delay', focus: 'Gait + AFOs', followUp: '2026-06-15', status: 'Active' },
  { id: 'CH-003', patient: 'Master Bolu Ajayi', age: 9, dx: 'Autism + low tone', category: 'Coordination', focus: 'Postural + motor planning', followUp: '2026-06-10', status: 'Active' },
  { id: 'CH-004', patient: 'Miss Aisha Bello', age: 4, dx: 'Speech-motor delay', category: 'Developmental Delay', focus: 'Trunk control + play', followUp: '2026-05-30', status: 'Follow-Up Due' },
];

const GERIATRIC = [
  { id: 'GR-001', patient: 'Pa Adebayo Odunsi', category: 'Falls Risk', focus: 'Falls prevention', home: 'Grab bars + lighting', status: 'Active' },
  { id: 'GR-002', patient: 'Ma Salamatu Bello', category: 'Mobility Support', focus: 'Mobility + strength', home: 'Bathroom safety', status: 'Active' },
  { id: 'GR-003', patient: 'Pa Emeka Okonkwo', category: 'Strength Maintenance', focus: 'Maintenance walking', home: 'Stable', status: 'Active' },
  { id: 'GR-004', patient: 'Pa Tunde Akinola', category: 'Home Safety', focus: 'Long-stay rehab', home: 'Residential care', status: 'Active' },
  { id: 'GR-005', patient: 'Ma Hadiza Sani', category: 'Falls Risk', focus: 'Balance training', home: 'Stair rails', status: 'Active' },
];

const ADX = [
  { id: 'AR-001', patient: 'Mr. Sola Adebayo', category: 'Exercise Therapy', focus: 'Post-detox conditioning', program: '12-wk fitness', adherence: '80%', status: 'Active' },
  { id: 'AR-002', patient: 'Mr. Yusuf Aliyu', category: 'Wellness', focus: 'Cardio + strength', program: '8-wk recovery', adherence: '65%', status: 'Active' },
  { id: 'AR-003', patient: 'Community Cohort B', category: 'Reintegration', focus: 'Group wellness', program: '6-mo reintegration', adherence: '72%', status: 'Active' },
  { id: 'AR-004', patient: 'Mr. Kunle Ajayi', category: 'Wellness', focus: 'Mind-body movement', program: '6-wk wellness', adherence: '100%', status: 'Completed' },
];

const DEVICES = [
  { id: 'AD-001', patient: 'Pa Adebayo Odunsi', device: 'Wheeled walker', reason: 'Falls prevention', status: 'Issued', review: '2026-09-01' },
  { id: 'AD-002', patient: 'Pa Tunde Akinola', device: 'Wheelchair (Tilt)', reason: 'Non-ambulatory', status: 'Issued', review: '2026-07-15' },
  { id: 'AD-003', patient: 'Mr. Chidi Eze', device: 'Quad cane + AFO', reason: 'Post-stroke gait', status: 'Approved', review: '2026-06-10' },
  { id: 'AD-004', patient: 'Miss Adaeze Nnamdi', device: 'Paediatric AFOs', reason: 'Spastic diplegia', status: 'Pending', review: '2026-06-20' },
  { id: 'AD-005', patient: 'Mr. Ibrahim Musa', device: 'Walking poles', reason: 'Parkinsonism', status: 'Returned', review: '2026-05-20' },
  { id: 'AD-006', patient: 'Ma Salamatu Bello', device: 'Cane (single-point)', reason: 'Mobility support', status: 'Review Due', review: '2026-06-04' },
];

const INPATIENT = [
  { id: 'IP-PHY-001', patient: 'Mr. Chidi Eze', ward: 'Neuro Ward', bed: 'NW-04', dailyReview: 'Bedside + transfer', risk: 'High Risk', status: 'Today' },
  { id: 'IP-PHY-002', patient: 'Pa Tunde Akinola', ward: 'HDE', bed: 'HDE-01', dailyReview: 'Positioning + contracture prev.', risk: 'High Risk', status: 'Today' },
  { id: 'IP-PHY-003', patient: 'Ma Adunni Ogundipe', ward: 'Psychogeriatric Ward', bed: 'PSG-04', dailyReview: 'Chair-based exercise', risk: 'Moderate', status: 'Pending' },
  { id: 'IP-PHY-004', patient: 'Pa Adebayo Odunsi', ward: 'Memory Care Unit', bed: 'MCU-04', dailyReview: 'Standing tolerance', risk: 'Moderate', status: 'Completed' },
  { id: 'IP-PHY-005', patient: 'Mr. Sola Adebayo', ward: 'Addiction Ward', bed: 'ADW-02', dailyReview: 'Discharge readiness review', risk: 'Low', status: 'Discharge Readiness' },
];

const OUTPATIENT = [
  { id: 'OP-PHY-001', patient: 'Pa Adebayo Odunsi', visitType: 'Mobility review', slot: '2026-06-04 09:30', therapist: 'PT. Olamide', status: 'Confirmed' },
  { id: 'OP-PHY-002', patient: 'Mr. Sola Adebayo', visitType: 'Therapy session', slot: '2026-06-04 10:30', therapist: 'PT. Femi', status: 'Confirmed' },
  { id: 'OP-PHY-003', patient: 'Master Tunde Bakare', visitType: 'Paediatric session', slot: '2026-06-04 14:00', therapist: 'PT. Aisha', status: 'Pending' },
  { id: 'OP-PHY-004', patient: 'Mrs. Funke Adeyemi', visitType: 'Therapy session', slot: '2026-06-05 11:00', therapist: 'PT. Bukola', status: 'Rescheduled' },
  { id: 'OP-PHY-005', patient: 'Ma Salamatu Bello', visitType: 'Reassessment', slot: '2026-05-28 09:30', therapist: 'PT. Olamide', status: 'Completed' },
  { id: 'OP-PHY-006', patient: 'Mr. Ibrahim Musa', visitType: 'Gait review', slot: '2026-05-29 11:30', therapist: 'PT. Bukola', status: 'Missed' },
];

const FOLLOWUPS = [
  { id: 'FU-PHY-001', patient: 'Pa Adebayo Odunsi', type: 'Mobility review', date: '2026-06-03', status: 'Today' },
  { id: 'FU-PHY-002', patient: 'Mr. Chidi Eze', type: 'Neuro rehab review', date: '2026-06-09', status: 'Confirmed' },
  { id: 'FU-PHY-003', patient: 'Mr. Sola Adebayo', type: 'Discharge readiness', date: '2026-06-15', status: 'Pending' },
  { id: 'FU-PHY-004', patient: 'Pa Tunde Akinola', type: 'Home visit (overdue)', date: '2026-05-29', status: 'Missed' },
  { id: 'FU-PHY-005', patient: 'Ma Salamatu Bello', type: 'Mobility reassessment', date: '2026-06-12', status: 'Rescheduled' },
  { id: 'FU-PHY-006', patient: 'Mrs. Funke Adeyemi', type: 'Behavioural activation review', date: '2026-05-30', status: 'Completed' },
];

const SERVICE_TYPES = ['Physiotherapy Assessment', 'Therapy Session', 'Mobility Assessment', 'Falls Assessment', 'Exercise Program', 'Inpatient Physio', 'Outpatient Visit'];

const INVOICES = [
  { id: 'INV-PHY-701', patient: 'Pa Adebayo Odunsi', service: 'Assessment + 4 sessions', amount: 38000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-PHY-702', patient: 'Mr. Chidi Eze', service: 'Neuro rehab × 6', amount: 48000, nhia: 'Pending', status: 'Pending' },
  { id: 'INV-PHY-703', patient: 'Master Tunde Bakare', service: 'Paediatric assessment', amount: 15000, nhia: 'N/A', status: 'Outstanding' },
  { id: 'INV-PHY-704', patient: 'Mr. Sola Adebayo', service: 'Rehab fitness programme', amount: 24000, nhia: 'N/A', status: 'Paid' },
  { id: 'INV-PHY-705', patient: 'Ma Salamatu Bello', service: 'Mobility assessment + therapy', amount: 22000, nhia: 'Approved', status: 'NHIA' },
  { id: 'INV-PHY-706', patient: 'Pa Tunde Akinola', service: 'Bedside physio (10d)', amount: 60000, nhia: 'Pending', status: 'NHIA' },
  { id: 'INV-PHY-707', patient: 'Mr. Ibrahim Musa', service: 'Gait + balance therapy', amount: 18000, nhia: 'N/A', status: 'Outstanding' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Okafor (Doctor)', dept: 'Doctor', patient: 'Mr. Chidi Eze', preview: 'Please escalate neuro rehab — new MRI findings.', time: '09:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Nurse Adesina (Nursing)', dept: 'Nursing', patient: 'Pa Tunde Akinola', preview: 'Pressure sore worsening — escalating.', time: '10:00', unread: 1, urgent: true },
  { id: 'TH-3', with: 'TR. Adesina (Occupational Therapy)', dept: 'Occupational Therapy', patient: 'Ma Salamatu Bello', preview: 'Home safety report ready.', time: '11:15', unread: 0, urgent: false },
  { id: 'TH-4', with: 'Dr. Aisha (Psychology)', dept: 'Psychology', patient: 'Mrs. Funke Adeyemi', preview: 'BA programme adherence improved.', time: '12:00', unread: 0, urgent: false },
  { id: 'TH-5', with: 'Mrs. Funmi (Social Work)', dept: 'Social Work', patient: 'Mr. Sola Adebayo', preview: 'Community reintegration plan attached.', time: '13:20', unread: 1, urgent: false },
  { id: 'TH-6', with: 'Dr. Sowemimo (Psychogeriatrics)', dept: 'Psychogeriatrics', patient: 'Pa Adebayo Odunsi', preview: 'Falls plan updated for review.', time: 'Yesterday', unread: 0, urgent: false },
  { id: 'TH-7', with: 'Dr. Adeyemi (Addiction Team)', dept: 'Addiction Team', patient: 'Mr. Sola Adebayo', preview: 'Recovery fitness milestone met.', time: '2d', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-1', patient: 'Pa Tunde Akinola', type: 'Falls risk — bed alarm', message: 'Berg 18 + 5 falls past year.', date: '2026-06-03', status: 'Critical' },
  { id: 'AL-2', patient: 'Pa Adebayo Odunsi', type: 'Home visit overdue', message: 'Visit missed by 5 days.', date: '2026-06-03', status: 'Falls Risk' },
  { id: 'AL-3', patient: 'Mrs. Funke Adeyemi', type: 'Missed sessions', message: '2 consecutive missed sessions.', date: '2026-06-02', status: 'Missed Sessions' },
  { id: 'AL-4', patient: 'Mr. Chidi Eze', type: 'Mobility plateau', message: '3 weeks without TUG improvement.', date: '2026-06-02', status: 'Mobility Decline' },
  { id: 'AL-5', patient: 'Mr. Sola Adebayo', type: 'Discharge readiness', message: 'Goals met — initiate discharge.', date: '2026-06-01', status: 'Discharge Readiness' },
  { id: 'AL-6', patient: 'Ma Salamatu Bello', type: 'Routine ack', message: 'Reviewed and acknowledged.', date: '2026-05-30', status: 'Acknowledged' },
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

// ============================================================
// 1. DASHBOARD
// ============================================================
export const PhysiotherapyDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'New Assessment', i: ClipboardList, p: 'assessments' },
    { l: 'Start Therapy', i: Activity, p: 'sessions' },
    { l: 'Referral Center', i: Send, p: 'referrals' },
    { l: 'Mobility Assessment', i: Footprints, p: 'mobility' },
    { l: 'Falls Prevention', i: ShieldAlert, p: 'falls' },
    { l: 'Treatment Plans', i: HeartHandshake, p: 'plans' },
    { l: 'Exercise Prescription', i: Dumbbell, p: 'exercises' },
    { l: 'Inpatient Physio', i: BedDouble, p: 'inpatient' },
    { l: 'Outpatient Physio', i: Home, p: 'outpatient' },
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
        title="Physiotherapy Services Workspace"
        desc="GFA HMS · Comprehensive physiotherapy for psychiatric, neurological, geriatric, paediatric, addiction recovery and musculoskeletal rehabilitation."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/sessions?new=1`)}><Activity className="h-4 w-4 mr-1" /> Start Therapy</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'New Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 14, i: Send, tone: 'purple' },
        { l: 'Active Patients', v: 286, i: Users, tone: 'blue' },
        { l: 'Therapy Sessions Today', v: SESSIONS.filter(s => s.status === 'Today').length + 8, i: Activity, tone: 'teal' },
        { l: 'Mobility Assessments', v: MOBILITY.length + 18, i: Footprints, tone: 'amber' },
        { l: 'Falls Risk Cases', v: FALLS.filter(f => f.risk === 'High Risk').length + 18, i: ShieldAlert, tone: 'rose' },
        { l: 'Inpatient Reviews', v: INPATIENT.length + 9, i: BedDouble, tone: 'amber' },
      ]} />
      <KpiGrid items={[
        { l: 'Outpatient Visits', v: OUTPATIENT.length + 142, i: Home, tone: 'teal' },
        { l: 'Follow-Ups Due', v: FOLLOWUPS.filter(f => f.status === 'Today' || f.status === 'Pending').length + 4, i: CalendarDays, tone: 'amber' },
        { l: 'Billing Pending', v: INVOICES.filter(i => i.status === 'Pending' || i.status === 'Outstanding').length + 6, i: CreditCard, tone: 'amber' },
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 1, i: AlertTriangle, tone: 'rose' },
        { l: 'Rehab Programmes', v: 14, i: HeartHandshake, tone: 'purple' },
        { l: 'Revenue (MTD)', v: formatCurrency(2640000), i: CreditCard, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Priority Referrals</div>
          <div className="space-y-2">{REFERRALS.filter(r => r.priority === 'High').slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{r.patient}</div><div className="text-xs text-muted-foreground">{r.from}</div></div>
              <Chip label={r.priority} t="red" />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Sessions</div>
          <div className="space-y-2">{SESSIONS.filter(s => s.status === 'Today').map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{s.patient}</div><div className="text-xs text-muted-foreground">{s.date} · {s.therapist}</div></div>
              <Chip label={s.dur} t="blue" />
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
export const ReferralCenter = () => {
  const [selected, setSelected] = useState<typeof REFERRALS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Referral Center"
        icon={<Send className="h-5 w-5" />}
        title="Physiotherapy Referral Center"
        desc="Inbound referrals from Doctor, Psychiatry, OT, Psychogeriatrics, Addiction, CAP and Nursing. Triage, prioritise and assign physiotherapists."
        ctaLabel="New Referral"
        kpis={[
          { l: 'Total Referrals', v: REFERRALS.length + 124, i: Send, tone: 'blue' },
          { l: 'High Priority', v: REFERRALS.filter(r => r.priority === 'High').length + 18, i: AlertTriangle, tone: 'rose' },
          { l: 'Medium Priority', v: REFERRALS.filter(r => r.priority === 'Medium').length + 42, i: AlertCircle, tone: 'amber' },
          { l: 'Low Priority', v: REFERRALS.filter(r => r.priority === 'Low').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Accepted', v: REFERRALS.filter(r => r.status === 'Accepted').length + 92, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: REFERRALS.filter(r => r.status === 'Pending').length + 14, i: AlertCircle, tone: 'amber' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'hi', label: 'High Priority', filter: (r: any) => r.priority === 'High' },
          { key: 'md', label: 'Medium Priority', filter: (r: any) => r.priority === 'Medium' },
          { key: 'lo', label: 'Low Priority', filter: (r: any) => r.priority === 'Low' },
          { key: 'ac', label: 'Accepted', filter: (r: any) => r.status === 'Accepted' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
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
            { k: 'from', label: 'Referring Department', type: 'select', options: ['Doctor', 'Psychiatry', 'Psychogeriatrics', 'CAP', 'Addiction', 'Nursing', 'OT', 'Social Work'] },
            { k: 'reason', label: 'Referral Reason', type: 'textarea' },
            { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
            { k: 'pt', label: 'Assigned Physiotherapist', type: 'select', options: ['PT. Olamide', 'PT. Bukola', 'PT. Femi', 'PT. Aisha'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Referral created" nextStep="Triage the referral and assign a physiotherapist."
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
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Referral rejected'); }}>Reject with Reason</Button>
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
// 3. ASSESSMENT CENTER
// ============================================================
export const AssessmentCenter = () => {
  const [selected, setSelected] = useState<typeof ASSESSMENTS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Assessment Center"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Physiotherapy Assessment Center"
        desc="Physical, musculoskeletal, neurological, functional, mobility, balance, gait and pain assessments — auto-save, scoring, recommendations."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Pending Assessments', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: ASSESSMENTS.filter(a => a.status === 'In Progress').length + 8, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: ASSESSMENTS.filter(a => a.status === 'Completed').length + 92, i: CheckCircle2, tone: 'green' },
          { l: 'High Priority', v: ASSESSMENTS.filter(a => a.priority === 'High').length + 7, i: AlertTriangle, tone: 'rose' },
          { l: 'Follow-Up Required', v: ASSESSMENTS.filter(a => a.flag === 'FU').length + 14, i: Repeat, tone: 'amber' },
          { l: 'Total Templates', v: ASSESSMENT_TYPES.length, i: BookOpen, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ip', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'hi', label: 'High Priority', filter: (r: any) => r.priority === 'High' },
          { key: 'fu', label: 'Follow-Up Required', filter: (r: any) => r.flag === 'FU' },
        ]}
        rows={ASSESSMENTS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'c', header: 'Clinician', render: r => r.clinician },
          { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'High' ? 'red' : r.priority === 'Medium' ? 'amber' : 'green'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'purple' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><FilePlus className="h-3.5 w-3.5 mr-1" /> Begin</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Start Assessment" submitLabel="Begin Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Assessment Type', type: 'select', options: ASSESSMENT_TYPES },
            { k: 'complaint', label: 'Presenting Complaint', type: 'textarea' },
            { k: 'pt', label: 'Assigned Physiotherapist', type: 'select', options: ['PT. Olamide', 'PT. Bukola', 'PT. Femi', 'PT. Aisha'] },
            { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
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
            { label: 'Clinician', value: selected.clinician },
            { label: 'Status', value: selected.status },
            { label: 'Findings', value: 'ROM limited L knee · MMT 3+/5 quadriceps · Pain VAS 4/10' },
            { label: 'Recommendations', value: 'Quadriceps strengthening, balance, OT referral.' },
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
// 4. MOBILITY ASSESSMENT
// ============================================================
export const MobilityAssessment = () => {
  const [selected, setSelected] = useState<typeof MOBILITY[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Mobility Assessment"
        icon={<Footprints className="h-5 w-5" />}
        title="Mobility Assessment Module"
        desc="Walking, transfers, balance, assistive device needs and mobility trends (TUG, 6MWT, Berg)."
        ctaLabel="New Mobility Test"
        kpis={[
          { l: 'Improving', v: MOBILITY.filter(m => m.trend === 'Improving').length + 32, i: TrendingUp, tone: 'green' },
          { l: 'Stable', v: MOBILITY.filter(m => m.trend === 'Stable').length + 41, i: CheckCircle2, tone: 'blue' },
          { l: 'Declining', v: MOBILITY.filter(m => m.trend === 'Declining').length + 9, i: AlertCircle, tone: 'amber' },
          { l: 'Severe Limitation', v: MOBILITY.filter(m => m.trend === 'Severe Limitation').length + 6, i: AlertTriangle, tone: 'rose' },
          { l: 'Review Due', v: MOBILITY.filter(m => m.trend === 'Review Due').length + 12, i: CalendarDays, tone: 'amber' },
          { l: 'Total', v: MOBILITY.length + 100, i: Footprints, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'im', label: 'Improving', filter: (r: any) => r.trend === 'Improving' },
          { key: 'st', label: 'Stable', filter: (r: any) => r.trend === 'Stable' },
          { key: 'dc', label: 'Declining', filter: (r: any) => r.trend === 'Declining' },
          { key: 'sv', label: 'Severe Limitation', filter: (r: any) => r.trend === 'Severe Limitation' },
          { key: 'rv', label: 'Review Due', filter: (r: any) => r.trend === 'Review Due' },
        ]}
        rows={MOBILITY}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'b', header: 'Baseline', render: r => r.baseline },
          { key: 'c', header: 'Current', render: r => r.current },
          { key: 't', header: 'Trend', render: r => <Chip label={r.trend} t={r.trend === 'Severe Limitation' ? 'red' : r.trend === 'Declining' ? 'amber' : r.trend === 'Improving' ? 'green' : 'blue'} /> },
          { key: 'd', header: 'Device', render: r => r.device },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Mobility Test" submitLabel="Save Mobility Test"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'walk', label: 'Walking Ability', type: 'select', options: ['Independent', 'Supervised', 'Assistive device', 'Non-ambulatory'] },
            { k: 'trans', label: 'Transfer Ability', type: 'select', options: ['Independent', 'Min assist', 'Mod assist', 'Max assist', 'Dependent'] },
            { k: 'bal', label: 'Standing Balance', type: 'select', options: ['Good', 'Fair', 'Poor', 'Unable'] },
            { k: 'dev', label: 'Assistive Device Need', type: 'select', options: ['None', 'Cane', 'Walker', 'Wheelchair', 'AFO'] },
            { k: 'score', label: 'Mobility Score (Berg / TUG)', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Mobility test saved" nextStep="Review trend and update treatment plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Mobility · ${selected.patient}`}
          sections={[
            { label: 'ID', value: selected.id },
            { label: 'Baseline', value: selected.baseline },
            { label: 'Current', value: selected.current },
            { label: 'Trend', value: <Chip label={selected.trend} t={selected.trend === 'Severe Limitation' ? 'red' : 'amber'} /> },
            { label: 'Device', value: selected.device },
            { label: 'Score', value: selected.score },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 5. FALLS PREVENTION
// ============================================================
export const FallsPrevention = () => {
  const [selected, setSelected] = useState<typeof FALLS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Falls Prevention"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Balance & Falls Prevention Center"
        desc="Falls risk, Berg balance testing, environmental review and prevention plans — critical for psychogeriatric, long-stay and neurological patients."
        ctaLabel="New Falls Assessment"
        kpis={[
          { l: 'Low Risk', v: FALLS.filter(f => f.risk === 'Low Risk').length + 64, i: CheckCircle2, tone: 'green' },
          { l: 'Moderate Risk', v: FALLS.filter(f => f.risk === 'Moderate Risk').length + 42, i: AlertCircle, tone: 'amber' },
          { l: 'High Risk', v: FALLS.filter(f => f.risk === 'High Risk').length + 18, i: AlertTriangle, tone: 'rose' },
          { l: 'Recent Fall', v: FALLS.filter(f => f.risk === 'Recent Fall').length + 7, i: ShieldAlert, tone: 'orange' },
          { l: 'Plan Due', v: FALLS.filter(f => f.risk === 'Plan Due').length + 9, i: CalendarDays, tone: 'amber' },
          { l: 'Total', v: FALLS.length + 140, i: ShieldAlert, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'lo', label: 'Low Risk', filter: (r: any) => r.risk === 'Low Risk' },
          { key: 'mo', label: 'Moderate Risk', filter: (r: any) => r.risk === 'Moderate Risk' },
          { key: 'hi', label: 'High Risk', filter: (r: any) => r.risk === 'High Risk' },
          { key: 'rf', label: 'Recent Fall', filter: (r: any) => r.risk === 'Recent Fall' },
          { key: 'pd', label: 'Plan Due', filter: (r: any) => r.risk === 'Plan Due' },
        ]}
        rows={FALLS}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 's', header: 'Berg Score', render: r => r.score },
          { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : r.risk === 'Moderate Risk' ? 'amber' : r.risk === 'Recent Fall' ? 'orange' : r.risk === 'Plan Due' ? 'amber' : 'green'} /> },
          { key: 'f', header: 'Falls 12m', render: r => r.falls12m },
          { key: 'pl', header: 'Prevention Plan', render: r => r.plan },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Falls Assessment" submitLabel="Save Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'hist', label: 'Fall History', type: 'select', options: ['No falls', '1 fall', '2-3 falls', '4+ falls (12m)'] },
            { k: 'bal', label: 'Balance Concern', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
            { k: 'mob', label: 'Mobility Status', type: 'select', options: ['Independent', 'Cane', 'Walker', 'Wheelchair', 'Bed-bound'] },
            { k: 'risk', label: 'Risk Level', type: 'select', options: ['Low Risk', 'Moderate Risk', 'High Risk'] },
            { k: 'plan', label: 'Prevention Plan', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Falls assessment saved" nextStep="Initiate prevention plan and schedule review."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Falls Risk · ${selected.patient}`}
          sections={[
            { label: 'ID', value: selected.id },
            { label: 'Berg Score', value: selected.score },
            { label: 'Risk', value: <Chip label={selected.risk} t={selected.risk === 'High Risk' ? 'red' : 'amber'} /> },
            { label: 'Falls (12m)', value: selected.falls12m },
            { label: 'Prevention Plan', value: selected.plan },
            { label: 'Next Review', value: '2026-06-30' },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
};

// ============================================================
// 6. TREATMENT PLANS
// ============================================================
export const TreatmentPlans = () => {
  const [selected, setSelected] = useState<typeof PLANS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Treatment Plans"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Treatment Plan Management"
        desc="SMART goals, objectives, exercises, milestones and outcome measures with progress and review dates."
        ctaLabel="New Treatment Plan"
        kpis={[
          { l: 'Active Plans', v: PLANS.filter(p => p.status === 'Active').length + 82, i: HeartHandshake, tone: 'green' },
          { l: 'Completed Plans', v: PLANS.filter(p => p.status === 'Completed').length + 54, i: CheckCircle2, tone: 'blue' },
          { l: 'Suspended Plans', v: PLANS.filter(p => p.status === 'Suspended').length + 6, i: AlertCircle, tone: 'amber' },
          { l: 'Due for Review', v: PLANS.filter(p => p.status === 'Due for Review').length + 12, i: CalendarDays, tone: 'amber' },
          { l: 'High Priority', v: PLANS.filter(p => p.priority === 'High').length + 9, i: AlertTriangle, tone: 'rose' },
          { l: 'Total', v: PLANS.length + 160, i: ClipboardList, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'ac', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'sp', label: 'Suspended', filter: (r: any) => r.status === 'Suspended' },
          { key: 'dr', label: 'Due for Review', filter: (r: any) => r.status === 'Due for Review' },
          { key: 'hp', label: 'High Priority', filter: (r: any) => r.priority === 'High' },
        ]}
        rows={PLANS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.goals}`}
        columns={[
          { key: 'id', header: 'Plan', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'g', header: 'Goals', render: r => r.goals },
          { key: 'o', header: 'Objectives', render: r => r.objectives },
          { key: 'pr', header: 'Progress', render: r => <Chip label={r.progress} t={parseInt(r.progress) >= 80 ? 'green' : parseInt(r.progress) >= 40 ? 'amber' : 'red'} /> },
          { key: 'rv', header: 'Review', render: r => r.review },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Treatment Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'goals', label: 'Therapy Goals', type: 'textarea' },
            { k: 'intv', label: 'Interventions', type: 'textarea' },
            { k: 'ex', label: 'Exercise Plan', type: 'textarea' },
            { k: 'rv', label: 'Review Date', type: 'date' },
            { k: 'out', label: 'Expected Outcome', type: 'textarea' },
          ]}
          successTitle="Treatment plan created" nextStep="Assign exercises and schedule first review."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Treatment Plan · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Goals', value: selected.goals },
            { label: 'Objectives', value: selected.objectives },
            { label: 'Progress', value: selected.progress },
            { label: 'Review Date', value: selected.review },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Plan edit opened')}>Edit Plan</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Plan suspended'); }}>Suspend Plan</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Plan completed'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete Plan</Button>
              <Button onClick={() => toast.success('Plan printed')}><Printer className="h-4 w-4 mr-1" /> Print Plan</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 7. EXERCISE PRESCRIPTION
// ============================================================
export const ExercisePrescription = () => {
  const [assign, setAssign] = useState<typeof EXERCISES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Exercise Prescription"
        icon={<Dumbbell className="h-5 w-5" />}
        title="Exercise Prescription & Library"
        desc="Strength, stretching, balance, mobility and home-exercise programmes. Assign, print, and push to patient portal."
        ctaLabel="Add Exercise"
        kpis={[
          { l: 'Total Exercises', v: EXERCISES.length + 84, i: Dumbbell, tone: 'blue' },
          { l: 'Assigned Exercises', v: 142, i: CheckCircle2, tone: 'green' },
          { l: 'Home Programs', v: EXERCISES.filter(e => e.program === 'Home Program').length + 38, i: Home, tone: 'purple' },
          { l: 'Inpatient Exercises', v: EXERCISES.filter(e => e.program === 'Inpatient').length + 26, i: BedDouble, tone: 'amber' },
          { l: 'Outpatient Exercises', v: EXERCISES.filter(e => e.program === 'Outpatient').length + 48, i: Home, tone: 'teal' },
          { l: 'Categories', v: 6, i: BookOpen, tone: 'rose' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'st', label: 'Strength', filter: (r: any) => r.cat === 'Strength' },
          { key: 'bl', label: 'Balance', filter: (r: any) => r.cat === 'Balance' },
          { key: 'mb', label: 'Mobility', filter: (r: any) => r.cat === 'Mobility' },
          { key: 'sr', label: 'Stretching', filter: (r: any) => r.cat === 'Stretching' },
          { key: 'hp', label: 'Home Program', filter: (r: any) => r.program === 'Home Program' },
          { key: 'as', label: 'Assigned', filter: () => true },
        ]}
        rows={EXERCISES}
        searchFields={(r: any) => `${r.name} ${r.id} ${r.cat} ${r.target}`}
        columns={[
          { key: 'id', header: 'Code', render: r => r.id },
          { key: 'n', header: 'Exercise', render: r => r.name },
          { key: 'c', header: 'Category', render: r => <Chip label={r.cat} t="blue" /> },
          { key: 'r', header: 'Reps', render: r => r.reps },
          { key: 'f', header: 'Frequency', render: r => r.freq },
          { key: 't', header: 'Target', render: r => r.target },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setAssign(r)}>Assign</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Add Exercise" submitLabel="Add to Library"
          fields={[
            { k: 'name', label: 'Exercise Name', type: 'text' },
            { k: 'cat', label: 'Category', type: 'select', options: ['Strength', 'Balance', 'Mobility', 'Stretching', 'Cardio', 'Neuro rehab'] },
            { k: 'inst', label: 'Instructions', type: 'textarea' },
            { k: 'reps', label: 'Repetitions', type: 'text' },
            { k: 'freq', label: 'Frequency', type: 'text' },
            { k: 'safe', label: 'Safety Notes', type: 'textarea' },
          ]}
          successTitle="Exercise added to library" nextStep="Assign to patients or include in a treatment plan."
        />}
      />
      <Dialog open={!!assign} onOpenChange={v => !v && setAssign(null)}>
        {assign && (
          <SimpleForm close={() => setAssign(null)} notify={notify}
            title={`Assign · ${assign.name}`} submitLabel="Assign Exercise"
            fields={[
              { k: 'patient', label: 'Patient', type: 'patientPicker' },
              { k: 'ex', label: 'Selected Exercise', type: 'select', options: [assign.name] },
              { k: 'dur', label: 'Duration', type: 'text' },
              { k: 'inst', label: 'Instructions', type: 'textarea' },
              { k: 'fu', label: 'Follow-Up Date', type: 'date' },
            ]}
            successTitle="Exercise assigned" nextStep="Patient will see this in their portal — schedule follow-up." />
        )}
      </Dialog>
      {node}
    </>
  );
};

// ============================================================
// 8. THERAPY SESSIONS
// ============================================================
export const TherapySessions = () => {
  const [selected, setSelected] = useState<typeof SESSIONS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Therapy Sessions"
        icon={<Activity className="h-5 w-5" />}
        title="Therapy Session Workspace"
        desc="Individual, group, inpatient and outpatient sessions with attendance, duration, activities and outcome scores."
        ctaLabel="New Session"
        kpis={[
          { l: 'Sessions Today', v: SESSIONS.filter(s => s.status === 'Today').length + 6, i: CalendarDays, tone: 'teal' },
          { l: 'Pending Sessions', v: SESSIONS.filter(s => s.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
          { l: 'Completed Sessions', v: SESSIONS.filter(s => s.status === 'Completed').length + 184, i: CheckCircle2, tone: 'green' },
          { l: 'Missed Sessions', v: SESSIONS.filter(s => s.status === 'Missed').length + 9, i: AlertTriangle, tone: 'rose' },
          { l: 'Follow-Up Required', v: SESSIONS.filter(s => s.status === 'Follow-Up Required').length + 7, i: Repeat, tone: 'amber' },
          { l: 'Total (MTD)', v: 224, i: Activity, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'td', label: 'Today', filter: (r: any) => r.status === 'Today' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'ms', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
          { key: 'fu', label: 'Follow-Up Required', filter: (r: any) => r.status === 'Follow-Up Required' },
        ]}
        rows={SESSIONS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.therapist}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient / Group', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 'th', header: 'Therapist', render: r => r.therapist },
          { key: 'du', header: 'Duration', render: r => r.dur },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Today' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Therapy Session" submitLabel="Schedule Session"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Session Type', type: 'select', options: ['Individual — Outpatient', 'Individual — Inpatient', 'Group', 'Bedside therapy', 'Paediatric — Individual'] },
            { k: 'pt', label: 'Physiotherapist', type: 'select', options: ['PT. Olamide', 'PT. Bukola', 'PT. Femi', 'PT. Aisha'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'time', label: 'Time', type: 'time' },
            { k: 'goals', label: 'Goals', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Session scheduled" nextStep="Open the session workspace to record progress."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Therapy Session · ${selected.id}`}
          sections={[
            { label: 'Patient Summary', value: selected.patient },
            { label: 'Type', value: selected.type },
            { label: 'Therapist', value: selected.therapist },
            { label: 'Date', value: selected.date },
            { label: 'Duration', value: selected.dur },
            { label: 'Session Notes', value: selected.notes },
            { label: 'Activities Completed', value: 'Warm-up · Strength circuit · Cool-down' },
            { label: 'Outcome', value: 'Goal partially met — continue plan' },
            { label: 'Next Step', value: 'Schedule next session within 1 week.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Notes saved')}>Save Notes</Button>
              <Button onClick={() => { setSelected(null); toast.success('Session completed'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete Session</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// Generic specialised workflow factory (used for several modules)
// ============================================================
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
          title={`${p.shellTitle} · ${selected.patient || selected.id}`}
          sections={p.columns.map(c => ({ label: c.header, value: c.render(selected) }))}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
    </>
  );
}

// ============================================================
// 9. NEUROLOGICAL REHAB
// ============================================================
export const NeuroRehab = () => (
  <SpecialisedPage
    shellTitle="Neurological Rehab" icon={<Brain className="h-5 w-5" />}
    title="Neurological Rehabilitation Module"
    desc="Stroke, Parkinsonism, neurological disorders and cognitive-motor rehabilitation."
    ctaLabel="New Neuro Case"
    kpis={[
      { l: 'Active Neuro Cases', v: NEURO.filter(n => n.status === 'Active').length + 28, i: Brain, tone: 'blue' },
      { l: 'Stroke Rehab', v: NEURO.filter(n => n.category === 'Stroke').length + 18, i: Activity, tone: 'rose' },
      { l: 'Parkinsonism Rehab', v: NEURO.filter(n => n.category === 'Parkinsonism').length + 9, i: Activity, tone: 'amber' },
      { l: 'Cognitive-Motor Rehab', v: NEURO.filter(n => n.category === 'Cognitive-Motor').length + 12, i: Brain, tone: 'purple' },
      { l: 'Review Due', v: NEURO.filter(n => n.status === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: NEURO.length + 52, i: HeartHandshake, tone: 'green' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: undefined },
      { key: 'st', label: 'Stroke', value: 'Stroke' },
      { key: 'pk', label: 'Parkinsonism', value: 'Parkinsonism' },
      { key: 'cm', label: 'Cognitive-Motor', value: 'Cognitive-Motor' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={NEURO}
    searchFields={(r) => `${r.patient} ${r.id} ${r.dx}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'dx', header: 'Diagnosis', render: r => r.dx },
      { key: 's', header: 'Stage', render: r => r.stage },
      { key: 'm', header: 'Current Milestone', render: r => r.milestone },
      { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'dx', label: 'Diagnosis', type: 'text' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Stroke', 'Parkinsonism', 'Cognitive-Motor'] },
      { k: 'stage', label: 'Stage', type: 'select', options: ['Acute', 'Sub-acute', 'Recovery', 'Maintenance', 'Late'] },
      { k: 'goal', label: 'Rehab Goal', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Neuro case created" nextStep="Open the neuro rehab workspace to set milestones."
  />
);

// ============================================================
// 10. PSYCHIATRIC REHAB
// ============================================================
export const PsychiatricRehab = () => (
  <SpecialisedPage
    shellTitle="Psychiatric Rehab" icon={<Stethoscope className="h-5 w-5" />}
    title="Psychiatric Rehabilitation Physiotherapy"
    desc="Behavioural activation, functional recovery and community reintegration fitness for psychiatric and long-stay patients."
    ctaLabel="New Programme"
    kpis={[
      { l: 'Active Programs', v: PSY_REHAB.filter(p => p.status === 'Active').length + 18, i: Activity, tone: 'green' },
      { l: 'Long-Stay Patients', v: PSY_REHAB.filter(p => p.category === 'Long-Stay').length + 12, i: BedDouble, tone: 'amber' },
      { l: 'Behavioural Activation', v: PSY_REHAB.filter(p => p.category === 'Behavioural Activation').length + 14, i: Brain, tone: 'purple' },
      { l: 'Community Fitness', v: PSY_REHAB.filter(p => p.category === 'Community Fitness').length + 9, i: UsersRound, tone: 'blue' },
      { l: 'Completed Programs', v: PSY_REHAB.filter(p => p.status === 'Completed').length + 24, i: CheckCircle2, tone: 'green' },
      { l: 'Total', v: PSY_REHAB.length + 60, i: HeartHandshake, tone: 'rose' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'ls', label: 'Long-Stay', value: 'Long-Stay' },
      { key: 'ba', label: 'Behavioural Activation', value: 'Behavioural Activation' },
      { key: 'cf', label: 'Community Fitness', value: 'Community Fitness' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={PSY_REHAB}
    searchFields={(r) => `${r.patient} ${r.id} ${r.program}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient / Group', render: r => r.patient },
      { key: 'pr', header: 'Programme', render: r => r.program },
      { key: 't', header: 'Target', render: r => r.target },
      { key: 'a', header: 'Adherence', render: r => <Chip label={r.adherence} t={parseInt(r.adherence) >= 80 ? 'green' : 'amber'} /> },
      { key: 's', header: 'Status', render: r => r.status },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient / Group', type: 'patientPicker' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Behavioural Activation', 'Long-Stay', 'Community Fitness'] },
      { k: 'pr', label: 'Programme', type: 'text' },
      { k: 'tg', label: 'Target', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Programme created" nextStep="Schedule sessions and enrol participants."
  />
);

// ============================================================
// 11. CHILD PHYSIO
// ============================================================
export const ChildPhysio = () => (
  <SpecialisedPage
    shellTitle="Child Physiotherapy" icon={<Baby className="h-5 w-5" />}
    title="Paediatric Physiotherapy"
    desc="Developmental assessments, gross motor development, coordination training and school functioning support."
    ctaLabel="New Paediatric Case"
    kpis={[
      { l: 'Active Child Cases', v: CHILD.filter(c => c.status === 'Active').length + 22, i: Baby, tone: 'blue' },
      { l: 'Developmental Delay', v: CHILD.filter(c => c.category === 'Developmental Delay').length + 14, i: TrendingUp, tone: 'amber' },
      { l: 'Motor Delay', v: CHILD.filter(c => c.category === 'Motor Delay').length + 9, i: Footprints, tone: 'rose' },
      { l: 'Coordination Cases', v: CHILD.filter(c => c.category === 'Coordination').length + 7, i: Activity, tone: 'purple' },
      { l: 'Follow-Up Due', v: CHILD.filter(c => c.status === 'Follow-Up Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: CHILD.length + 50, i: HeartHandshake, tone: 'green' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'dd', label: 'Developmental Delay', value: 'Developmental Delay' },
      { key: 'md', label: 'Motor Delay', value: 'Motor Delay' },
      { key: 'co', label: 'Coordination', value: 'Coordination' },
      { key: 'fu', label: 'Follow-Up Due', value: 'Follow-Up Due' },
    ]}
    rows={CHILD}
    searchFields={(r) => `${r.patient} ${r.id} ${r.dx}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Child', render: r => `${r.patient} · ${r.age}y` },
      { key: 'dx', header: 'Diagnosis', render: r => r.dx },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'fu', header: 'Follow-Up', render: r => r.followUp },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Follow-Up Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Child', type: 'patientPicker' },
      { k: 'age', label: 'Age', type: 'number' },
      { k: 'dx', label: 'Diagnosis', type: 'text' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Developmental Delay', 'Motor Delay', 'Coordination'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'school', label: 'School Liaison', type: 'text' },
    ]}
    successTitle="Paediatric case created" nextStep="Schedule first paediatric session and notify caregiver."
  />
);

// ============================================================
// 12. GERIATRIC PHYSIO
// ============================================================
export const GeriatricPhysio = () => (
  <SpecialisedPage
    shellTitle="Geriatric Physiotherapy" icon={<UsersRound className="h-5 w-5" />}
    title="Geriatric Physiotherapy"
    desc="Falls prevention, mobility, strength maintenance and home-safety programmes."
    ctaLabel="New Geriatric Case"
    kpis={[
      { l: 'Active Geriatric Cases', v: GERIATRIC.filter(g => g.status === 'Active').length + 64, i: UsersRound, tone: 'blue' },
      { l: 'Falls Risk', v: GERIATRIC.filter(g => g.category === 'Falls Risk').length + 22, i: ShieldAlert, tone: 'rose' },
      { l: 'Mobility Support', v: GERIATRIC.filter(g => g.category === 'Mobility Support').length + 18, i: Footprints, tone: 'amber' },
      { l: 'Strength Maintenance', v: GERIATRIC.filter(g => g.category === 'Strength Maintenance').length + 14, i: Dumbbell, tone: 'green' },
      { l: 'Home Safety', v: GERIATRIC.filter(g => g.category === 'Home Safety').length + 12, i: Home, tone: 'purple' },
      { l: 'Total', v: GERIATRIC.length + 88, i: HeartHandshake, tone: 'teal' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'fr', label: 'Falls Risk', value: 'Falls Risk' },
      { key: 'ms', label: 'Mobility Support', value: 'Mobility Support' },
      { key: 'sm', label: 'Strength Maintenance', value: 'Strength Maintenance' },
      { key: 'hs', label: 'Home Safety', value: 'Home Safety' },
    ]}
    rows={GERIATRIC}
    searchFields={(r) => `${r.patient} ${r.id}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'c', header: 'Category', render: r => r.category },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'h', header: 'Home', render: r => r.home },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t="green" /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Falls Risk', 'Mobility Support', 'Strength Maintenance', 'Home Safety'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'home', label: 'Home Programme', type: 'text' },
    ]}
    successTitle="Geriatric case created" nextStep="Assign home programme and schedule reviews."
  />
);

// ============================================================
// 13. ADDICTION REHAB PHYSIO
// ============================================================
export const AddictionPhysio = () => (
  <SpecialisedPage
    shellTitle="Addiction Rehab Physio" icon={<MoveRight className="h-5 w-5" />}
    title="Addiction Recovery Physiotherapy"
    desc="Physical recovery, exercise therapy, functional reintegration and wellness — integrated with Addiction Services."
    ctaLabel="New Recovery Case"
    kpis={[
      { l: 'Active Recovery Cases', v: ADX.filter(a => a.status === 'Active').length + 38, i: Activity, tone: 'blue' },
      { l: 'Exercise Therapy', v: ADX.filter(a => a.category === 'Exercise Therapy').length + 18, i: Dumbbell, tone: 'green' },
      { l: 'Wellness Programs', v: ADX.filter(a => a.category === 'Wellness').length + 12, i: HeartHandshake, tone: 'purple' },
      { l: 'Functional Reintegration', v: ADX.filter(a => a.category === 'Reintegration').length + 9, i: UsersRound, tone: 'amber' },
      { l: 'Completed Recovery', v: ADX.filter(a => a.status === 'Completed').length + 22, i: CheckCircle2, tone: 'green' },
      { l: 'Total', v: ADX.length + 60, i: MoveRight, tone: 'rose' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'et', label: 'Exercise Therapy', value: 'Exercise Therapy' },
      { key: 'wl', label: 'Wellness', value: 'Wellness' },
      { key: 'ri', label: 'Reintegration', value: 'Reintegration' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={ADX}
    searchFields={(r) => `${r.patient} ${r.id} ${r.program}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient / Cohort', render: r => r.patient },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'pr', header: 'Programme', render: r => r.program },
      { key: 'a', header: 'Adherence', render: r => <Chip label={r.adherence} t={parseInt(r.adherence) >= 80 ? 'green' : 'amber'} /> },
      { key: 's', header: 'Status', render: r => r.status },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient / Cohort', type: 'patientPicker' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Exercise Therapy', 'Wellness', 'Reintegration'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'prog', label: 'Programme', type: 'text' },
    ]}
    successTitle="Recovery case created" nextStep="Enrol in addiction rehab programme and link with Addiction Services."
  />
);

// ============================================================
// 14. ASSISTIVE DEVICES
// ============================================================
export const AssistiveDevices = () => (
  <SpecialisedPage
    shellTitle="Assistive Devices" icon={<Armchair className="h-5 w-5" />}
    title="Assistive Device Management"
    desc="Wheelchair, walker, cane, AFO and other mobility aid assessments, fittings, issuing and review."
    ctaLabel="New Device Assessment"
    kpis={[
      { l: 'Device Assessments', v: DEVICES.length + 64, i: ClipboardList, tone: 'blue' },
      { l: 'Pending Devices', v: DEVICES.filter(d => d.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'Approved Devices', v: DEVICES.filter(d => d.status === 'Approved').length + 12, i: CheckCircle2, tone: 'green' },
      { l: 'Issued Devices', v: DEVICES.filter(d => d.status === 'Issued').length + 24, i: Armchair, tone: 'teal' },
      { l: 'Returned Devices', v: DEVICES.filter(d => d.status === 'Returned').length + 6, i: Repeat, tone: 'purple' },
      { l: 'Review Due', v: DEVICES.filter(d => d.status === 'Review Due').length + 4, i: CalendarDays, tone: 'rose' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'ap', label: 'Approved', value: 'Approved' },
      { key: 'is', label: 'Issued', value: 'Issued' },
      { key: 'rt', label: 'Returned', value: 'Returned' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={DEVICES}
    searchFields={(r) => `${r.patient} ${r.id} ${r.device}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'd', header: 'Device', render: r => r.device },
      { key: 'r', header: 'Reason', render: r => r.reason },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Issued' ? 'green' : r.status === 'Pending' ? 'amber' : r.status === 'Review Due' ? 'red' : 'blue'} /> },
      { key: 'rv', header: 'Next Review', render: r => r.review },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'dev', label: 'Device Type', type: 'select', options: ['Walker', 'Wheelchair', 'Cane', 'AFO', 'Crutch'] },
      { k: 'reason', label: 'Assessment Reason', type: 'textarea' },
      { k: 'rec', label: 'Recommendation', type: 'textarea' },
      { k: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Issued'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Device assessment saved" nextStep="Approve, fit and issue device with review date."
  />
);

// ============================================================
// 15. INPATIENT PHYSIO
// ============================================================
export const InpatientPhysio = () => (
  <SpecialisedPage
    shellTitle="Inpatient Physio" icon={<BedDouble className="h-5 w-5" />}
    title="Inpatient Physiotherapy Workflow"
    desc="Ward-based reviews, bedside therapy, daily mobility monitoring and discharge readiness."
    ctaLabel="New Bedside Review"
    kpis={[
      { l: 'Inpatient Reviews Today', v: INPATIENT.filter(i => i.status === 'Today').length + 5, i: CalendarDays, tone: 'teal' },
      { l: 'Pending Reviews', v: INPATIENT.filter(i => i.status === 'Pending').length + 4, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Reviews', v: INPATIENT.filter(i => i.status === 'Completed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'High Risk Patients', v: INPATIENT.filter(i => i.risk === 'High Risk').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Discharge Readiness', v: INPATIENT.filter(i => i.status === 'Discharge Readiness').length + 3, i: Home, tone: 'purple' },
      { l: 'Total Inpatient', v: INPATIENT.length + 14, i: BedDouble, tone: 'blue' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'hr', label: 'High Risk', value: 'High Risk' },
      { key: 'dr', label: 'Discharge Readiness', value: 'Discharge Readiness' },
    ]}
    rows={INPATIENT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.ward}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'w', header: 'Ward', render: r => r.ward },
      { key: 'b', header: 'Bed', render: r => r.bed },
      { key: 'd', header: 'Daily Review', render: r => r.dailyReview },
      { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
      { key: 's', header: 'Status', render: r => r.status },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'ward', label: 'Ward', type: 'select', options: ['Neuro Ward', 'HDE', 'Psychogeriatric Ward', 'Memory Care Unit', 'Addiction Ward'] },
      { k: 'bed', label: 'Bed', type: 'text' },
      { k: 'review', label: 'Daily Review Focus', type: 'textarea' },
      { k: 'risk', label: 'Risk', type: 'select', options: ['Low', 'Moderate', 'High Risk'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Bedside review logged" nextStep="Add to ward round and notify nursing."
  />
);

// ============================================================
// 16. OUTPATIENT PHYSIO
// ============================================================
export const OutpatientPhysio = () => (
  <SpecialisedPage
    shellTitle="Outpatient Physio" icon={<Home className="h-5 w-5" />}
    title="Outpatient Physiotherapy Workflow"
    desc="Scheduled visits, follow-ups, community rehabilitation and home-exercise monitoring."
    ctaLabel="Schedule Visit"
    kpis={[
      { l: 'Scheduled Visits', v: OUTPATIENT.length + 124, i: CalendarDays, tone: 'blue' },
      { l: 'Confirmed Visits', v: OUTPATIENT.filter(o => o.status === 'Confirmed').length + 84, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Visits', v: OUTPATIENT.filter(o => o.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Visits', v: OUTPATIENT.filter(o => o.status === 'Rescheduled').length + 7, i: Repeat, tone: 'purple' },
      { l: 'Completed Visits', v: OUTPATIENT.filter(o => o.status === 'Completed').length + 86, i: CheckCircle2, tone: 'teal' },
      { l: 'Missed Visits', v: OUTPATIENT.filter(o => o.status === 'Missed').length + 5, i: AlertTriangle, tone: 'rose' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'cf', label: 'Confirmed', value: 'Confirmed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'rs', label: 'Rescheduled', value: 'Rescheduled' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
    ]}
    rows={OUTPATIENT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.therapist}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'v', header: 'Visit Type', render: r => r.visitType },
      { key: 'sl', header: 'Slot', render: r => r.slot },
      { key: 'th', header: 'Therapist', render: r => r.therapist },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Confirmed' || r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'vt', label: 'Visit Type', type: 'select', options: ['Therapy session', 'Mobility review', 'Gait review', 'Paediatric session', 'Reassessment'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'pt', label: 'Physiotherapist', type: 'select', options: ['PT. Olamide', 'PT. Bukola', 'PT. Femi', 'PT. Aisha'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Visit scheduled" nextStep="Confirmation sent to patient and therapist."
  />
);

// ============================================================
// 17. FOLLOW-UP DASHBOARD
// ============================================================
export const FollowUpDashboard = () => (
  <SpecialisedPage
    shellTitle="Follow-Up Dashboard" icon={<Repeat className="h-5 w-5" />}
    title="Physiotherapy Follow-Up Dashboard"
    desc="Upcoming reviews, missed reviews, exercise compliance and goal achievement tracking."
    ctaLabel="Schedule Follow-Up"
    kpis={[
      { l: 'Follow-Ups Today', v: FOLLOWUPS.filter(f => f.status === 'Today').length + 4, i: CalendarDays, tone: 'teal' },
      { l: 'Confirmed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 32, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 7, i: Repeat, tone: 'purple' },
      { l: 'Missed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Completed', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 84, i: CheckCircle2, tone: 'blue' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'cf', label: 'Confirmed', value: 'Confirmed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'rs', label: 'Rescheduled', value: 'Rescheduled' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={FOLLOWUPS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.type}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Confirmed' || r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Mobility review', 'Neuro rehab review', 'Discharge readiness', 'Home visit', 'Mobility reassessment', 'Behavioural activation review'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Patient and therapist notified."
  />
);

// ============================================================
// 18. BILLING & NHIA
// ============================================================
export const PhysiotherapyBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Physiotherapy Billing & NHIA Integration"
        desc="Assessment, session, programme and exercise prescription billing with NHIA claims and invoice integration."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 184, i: CreditCard, tone: 'blue' },
          { l: 'Paid Invoices', v: INVOICES.filter(i => i.status === 'Paid').length + 124, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Invoices', v: INVOICES.filter(i => i.status === 'Pending').length + 18, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA Invoices', v: INVOICES.filter(i => i.status === 'NHIA' || i.nhia === 'Approved').length + 42, i: ShieldAlert, tone: 'purple' },
          { l: 'Outstanding Invoices', v: INVOICES.filter(i => i.status === 'Outstanding').length + 12, i: AlertTriangle, tone: 'rose' },
          { l: 'Therapy Bills', v: 96, i: Activity, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pd', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nh', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' || r.nhia === 'Approved' },
          { key: 'os', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'th', label: 'Therapy', filter: () => true },
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
// 19. RESEARCH
// ============================================================
export const PhysiotherapyResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Physiotherapy Analytics"
      desc="Mobility outcomes, falls statistics, rehabilitation outcomes, attendance and revenue trends." />
    <KpiGrid items={[
      { l: 'Active caseload', v: 286, i: Users, tone: 'amber' },
      { l: 'Mobility ↑ (avg)', v: '+24%', i: TrendingUp, tone: 'green' },
      { l: 'Falls reduction (90d)', v: '−18%', i: ShieldAlert, tone: 'green' },
      { l: 'Neuro rehab cases', v: 52, i: Brain, tone: 'amber' },
      { l: 'Paediatric cases', v: 34, i: Baby, tone: 'blue' },
      { l: 'Addiction rehab', v: 41, i: MoveRight, tone: 'amber' },
    ]} />
    <Card>
      <div className="text-sm font-semibold mb-2">Research Indicators</div>
      <div className="text-sm text-muted-foreground">Linked dimensions: diagnosis, programme, age group, ward, NHIA status, referral source. Filters: date range, therapist, condition.</div>
    </Card>
  </Shell>
);

// ============================================================
// 20. REPORTING CENTER
// ============================================================
export const PhysiotherapyReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '30d', notes: '' });
  const TYPES = ['Physiotherapy Assessment Report', 'Mobility Report', 'Falls Prevention Report', 'Therapy Session Report', 'Inpatient Physio Report', 'Outpatient Physio Report', 'Billing Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Physiotherapy Reporting Center"
        desc="Generate assessment, mobility, falls, therapy, inpatient, outpatient and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 124, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 6, i: AlertCircle, tone: 'amber' },
        { l: 'Mobility Reports', v: 32, i: Footprints, tone: 'purple' },
        { l: 'Falls Reports', v: 24, i: ShieldAlert, tone: 'rose' },
        { l: 'Therapy Reports', v: 38, i: Activity, tone: 'teal' },
        { l: 'Billing Reports', v: 18, i: CreditCard, tone: 'green' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Physiotherapy · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Patients</div><div className="font-semibold text-lg">286</div></div>
                  <div><div className="text-xs text-muted-foreground">Sessions (MTD)</div><div className="font-semibold text-lg">224</div></div>
                  <div><div className="text-xs text-muted-foreground">Falls Reduction</div><div className="font-semibold text-lg">−18%</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(2640000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Mobility scores improved 24% on average for falls-risk patients</li>
                  <li>Bedside neuro rehab adherence at 83%</li>
                  <li>Outstanding billing reduced 12% through NHIA workflow</li>
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
// 21. COMMUNICATION CENTER
// ============================================================
export const PhysiotherapyComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'nur', l: 'Nursing' }, { k: 'ot', l: 'OT' },
    { k: 'psy', l: 'Psychology' }, { k: 'sw', l: 'Social Work' }, { k: 'pg', l: 'Psychogeriatrics' }, { k: 'ad', l: 'Addiction' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', nur: 'nursing', ot: 'occupational', psy: 'psychology', sw: 'social', pg: 'psychogeriatrics', ad: 'addiction' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Physiotherapy Communication Center"
        desc="Secure messaging with Doctor, Nursing, OT, Psychology, Social Work, Psychogeriatrics and Addiction Team — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Attachments', v: 12, i: Paperclip, tone: 'blue' },
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
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — updating chart and care plan now.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest mobility assessment.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'mobility-assessment.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 22. CRITICAL ALERTS
// ============================================================
export const PhysiotherapyAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'fa', l: 'Falls Risk', f: (a: any) => a.status === 'Falls Risk' },
    { k: 'ms', l: 'Missed Sessions', f: (a: any) => a.status === 'Missed Sessions' },
    { k: 'md', l: 'Mobility Decline', f: (a: any) => a.status === 'Mobility Decline' },
    { k: 'dr', l: 'Discharge Readiness', f: (a: any) => a.status === 'Discharge Readiness' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Physiotherapy Alerts"
        desc="High falls risk, missed sessions, mobility decline, discharge readiness and safeguarding flags." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length, i: AlertTriangle, tone: 'red' },
        { l: 'Falls Risk Alerts', v: ALERTS.filter(a => a.status === 'Falls Risk').length + 4, i: ShieldAlert, tone: 'rose' },
        { l: 'Missed Sessions', v: ALERTS.filter(a => a.status === 'Missed Sessions').length + 3, i: AlertCircle, tone: 'amber' },
        { l: 'Mobility Decline', v: ALERTS.filter(a => a.status === 'Mobility Decline').length + 2, i: TrendingUp, tone: 'orange' },
        { l: 'Discharge Readiness', v: ALERTS.filter(a => a.status === 'Discharge Readiness').length + 2, i: Home, tone: 'purple' },
        { l: 'Acknowledged', v: ALERTS.filter(a => a.status === 'Acknowledged').length + 12, i: CheckCircle2, tone: 'green' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Falls Risk' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to on-call physiotherapist.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
                      <Button size="sm" onClick={() => nav(`${base}/sessions`)}><Users className="h-3.5 w-3.5 mr-1" /> Open Patient</Button>
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
// 23. MOBILE
// ============================================================
export const PhysiotherapyMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for bedside therapy, mobility quick-capture, home visits and exercise demos." />
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
// 24. CONFIG
// ============================================================
export const PhysiotherapyConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Physiotherapy Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Physiotherapy Configuration"
        desc="Manage programmes, treatment templates, exercise library, assessment templates, mobility scales, billing templates and NHIA mappings." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Programmes', 'Treatment Templates', 'Exercise Library', 'Assessment Templates',
          'Mobility Scales', 'Balance Tools', 'Outcome Measures', 'Rehab Programmes',
          'Billing Templates', 'NHIA Mapping', 'Research Indicators', 'Therapist Roster',
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
