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
  Settings2, AlertTriangle, FileText, TrendingUp, Brain, Repeat, Home, UsersRound,
  BedDouble, Stethoscope, Send, CheckCircle2, Search, Printer, Download, Eye, Bell,
  Plus, Paperclip, AlertCircle, Baby, Mic, Volume2, Apple, Video, WifiOff,
  ListChecks, BookOpenCheck,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/speech';

export const speechNav = [
  { label: 'Speech Therapy Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Referral Center', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Assessment Center', path: `${base}/assessments`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Speech Disorders', path: `${base}/speech-disorders`, icon: <Mic className="h-4 w-4" /> },
  { label: 'Language Disorders', path: `${base}/language-disorders`, icon: <BookOpenCheck className="h-4 w-4" /> },
  { label: 'Voice & Fluency', path: `${base}/voice-fluency`, icon: <Volume2 className="h-4 w-4" /> },
  { label: 'Dysphagia Center', path: `${base}/dysphagia`, icon: <Apple className="h-4 w-4" /> },
  { label: 'Autism Communication', path: `${base}/autism`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Cognitive Communication', path: `${base}/cognitive`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Treatment Plans', path: `${base}/plans`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Therapy Sessions', path: `${base}/sessions`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Family Training', path: `${base}/family`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Home Programs', path: `${base}/home-program`, icon: <Home className="h-4 w-4" /> },
  { label: 'Teletherapy', path: `${base}/teletherapy`, icon: <Video className="h-4 w-4" /> },
  { label: 'Child Speech Therapy', path: `${base}/child`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Adult Speech Therapy', path: `${base}/adult`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Inpatient Therapy', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Outpatient Therapy', path: `${base}/outpatient`, icon: <Home className="h-4 w-4" /> },
  { label: 'Smart Productivity', path: `${base}/smart`, icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Offline & Sync', path: `${base}/offline`, icon: <WifiOff className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'EMR Timeline', path: `${base}/timeline`, icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Speech Therapy Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={speechNav} title={`Speech Therapy · ${title}`}>{children}</DashboardLayout>
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
// Dummy data — GFA HMS Speech Therapy
// ============================================================
const PATIENTS = [
  { id: 'SLT-2026-001', name: 'Master Tunde Bakare', age: 7, sex: 'M', dx: 'Autism — minimally verbal' },
  { id: 'SLT-2026-002', name: 'Mr. Chidi Eze', age: 62, sex: 'M', dx: "Broca's aphasia + dysphagia" },
  { id: 'SLT-2026-003', name: 'Master Bolu Ajayi', age: 9, sex: 'M', dx: 'Developmental stuttering' },
  { id: 'SLT-2026-004', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Mild cognitive impairment' },
  { id: 'SLT-2026-005', name: 'Mrs. Bisi Akande', age: 41, sex: 'F', dx: 'Vocal nodules' },
  { id: 'SLT-2026-006', name: 'Miss Adaeze Nnamdi', age: 5, sex: 'F', dx: 'CP — dysarthria + feeding' },
  { id: 'SLT-2026-007', name: 'Pa Tunde Akinola', age: 84, sex: 'M', dx: 'Late dementia — dysphagia' },
  { id: 'SLT-2026-008', name: 'Mr. Ibrahim Musa', age: 58, sex: 'M', dx: 'Parkinsonian dysarthria' },
  { id: 'SLT-2026-009', name: 'Miss Halima Yusuf', age: 5, sex: 'F', dx: 'Autism — pre-verbal' },
  { id: 'SLT-2026-010', name: 'Pastor Femi Ojo', age: 47, sex: 'M', dx: 'Vocal abuse' },
];

const REFERRALS = [
  { id: 'STR-001', patient: 'Master Tunde Bakare', from: 'CAP — Dr. Aluko', reason: 'Autism — social communication therapy', priority: 'High', status: 'Accepted', assigned: 'SLT. Mojisola' },
  { id: 'STR-002', patient: 'Mr. Chidi Eze', from: 'Doctor — Dr. Okafor', reason: 'Post-stroke aphasia + dysphagia', priority: 'High', status: 'Accepted', assigned: 'SLT. Funmi' },
  { id: 'STR-003', patient: 'Miss Adaeze Nnamdi', from: 'Physiotherapy — PT. Aisha', reason: 'CP — feeding & speech support', priority: 'High', status: 'Accepted', assigned: 'SLT. Mojisola' },
  { id: 'STR-004', patient: 'Pa Adebayo Odunsi', from: 'Psychogeriatrics — Dr. Sowemimo', reason: 'Dementia — cognitive communication', priority: 'Medium', status: 'Accepted', assigned: 'SLT. Tope' },
  { id: 'STR-005', patient: 'Mrs. Bisi Akande', from: 'OT — TR. Adesina', reason: 'Voice rehab post-laryngitis', priority: 'Medium', status: 'Pending', assigned: '—' },
  { id: 'STR-006', patient: 'Master Bolu Ajayi', from: 'CAP — Dr. Aluko', reason: 'Stuttering — school readiness', priority: 'Low', status: 'Pending', assigned: '—' },
  { id: 'STR-007', patient: 'Mr. Yusuf Aliyu', from: 'Addiction — Dr. Adeyemi', reason: 'Cluttering — communication review', priority: 'Low', status: 'Completed', assigned: 'SLT. Funmi' },
];

const ASSESSMENTS = [
  { id: 'AS-001', patient: 'Master Tunde Bakare', type: 'Autism Communication Assessment', clinician: 'SLT. Mojisola', status: 'In Progress', priority: 'High', flag: 'FU' },
  { id: 'AS-002', patient: 'Mr. Chidi Eze', type: 'Dysphagia Assessment', clinician: 'SLT. Funmi', status: 'Pending', priority: 'High', flag: 'New' },
  { id: 'AS-003', patient: 'Mrs. Bisi Akande', type: 'Voice Assessment', clinician: 'SLT. Tope', status: 'Completed', priority: 'Medium', flag: 'FU' },
  { id: 'AS-004', patient: 'Master Bolu Ajayi', type: 'Fluency Assessment', clinician: 'SLT. Mojisola', status: 'Completed', priority: 'Low', flag: '—' },
  { id: 'AS-005', patient: 'Pa Adebayo Odunsi', type: 'Cognitive Communication Assessment', clinician: 'SLT. Tope', status: 'In Progress', priority: 'Medium', flag: '—' },
  { id: 'AS-006', patient: 'Miss Adaeze Nnamdi', type: 'Articulation Assessment', clinician: 'SLT. Mojisola', status: 'Pending', priority: 'Medium', flag: 'New' },
  { id: 'AS-007', patient: 'Mr. Ibrahim Musa', type: 'Speech Assessment', clinician: 'SLT. Funmi', status: 'Completed', priority: 'High', flag: 'FU' },
];
const ASSESSMENT_TYPES = [
  'Speech Assessment', 'Language Assessment', 'Communication Assessment', 'Articulation Assessment',
  'Voice Assessment', 'Fluency Assessment', 'Dysphagia Assessment',
  'Cognitive Communication Assessment', 'Autism Communication Assessment',
];

const SPEECH_DIS = [
  { id: 'SD-001', patient: 'Master Tunde Bakare', type: 'Phonological disorder', severity: 'Moderate', goals: 'Final consonant deletion ↓', status: 'Active' },
  { id: 'SD-002', patient: 'Mr. Chidi Eze', type: 'Apraxia of speech', severity: 'Severe', goals: 'Mono-syllable accuracy', status: 'Active' },
  { id: 'SD-003', patient: 'Mr. Ibrahim Musa', type: 'Hypokinetic dysarthria', severity: 'Moderate', goals: 'Loudness & intelligibility', status: 'Active' },
  { id: 'SD-004', patient: 'Miss Adaeze Nnamdi', type: 'Spastic dysarthria', severity: 'Severe', goals: 'Oral motor control', status: 'Active' },
  { id: 'SD-005', patient: 'Miss Halima Yusuf', type: 'Articulation delay', severity: 'Mild', goals: 'Phoneme accuracy /s/', status: 'Review Due' },
];

const LANG_DIS = [
  { id: 'LD-001', patient: 'Master Tunde Bakare', type: 'Mixed (autism context)', baseline: 'MLU 1.4', current: 'MLU 2.1', outcome: 'Improving' },
  { id: 'LD-002', patient: 'Mr. Chidi Eze', type: 'Expressive (Broca)', baseline: 'WAB 38', current: 'WAB 52', outcome: 'Improving' },
  { id: 'LD-003', patient: 'Pa Adebayo Odunsi', type: 'Word-finding (MCI)', baseline: 'BNT 22/30', current: 'BNT 25/30', outcome: 'Stable' },
  { id: 'LD-004', patient: 'Master Bolu Ajayi', type: 'Developmental language', baseline: 'PLS 78', current: 'PLS 84', outcome: 'Improving' },
  { id: 'LD-005', patient: 'Pa Tunde Akinola', type: 'Dementia-related', baseline: 'BNT 14/30', current: 'BNT 10/30', outcome: 'Declining' },
  { id: 'LD-006', patient: 'Mrs. Tinuke Aluko', type: 'Receptive language', baseline: 'TROG 60', current: 'TROG 60', outcome: 'New' },
  { id: 'LD-007', patient: 'Mr. Femi Oguntade', type: 'Mixed aphasia', baseline: 'WAB 28', current: 'WAB 30', outcome: 'Review Due' },
];

const VOICE_FLU = [
  { id: 'VF-001', patient: 'Mrs. Bisi Akande', kind: 'Voice', condition: 'Vocal nodules', severity: 'Moderate', plan: 'Hygiene + resonant voice' },
  { id: 'VF-002', patient: 'Master Bolu Ajayi', kind: 'Fluency', condition: 'Developmental stuttering', severity: 'Mild', plan: 'Lidcombe + parent training' },
  { id: 'VF-003', patient: 'Mr. Yusuf Aliyu', kind: 'Fluency', condition: 'Cluttering', severity: 'Moderate', plan: 'Rate control + awareness' },
  { id: 'VF-004', patient: 'Pastor Femi Ojo', kind: 'Voice', condition: 'Vocal abuse', severity: 'Severe', plan: 'Voice rest + behavioural' },
  { id: 'VF-005', patient: 'Mrs. Adebola Lawal', kind: 'Voice', condition: 'Muscle tension dysphonia', severity: 'Mild', plan: 'Manual circumlaryngeal therapy' },
];

const DYSPHAGIA = [
  { id: 'DY-001', patient: 'Mr. Chidi Eze', risk: 'High Risk', aspiration: 'Aspiration Risk', diet: 'IDDSI Level 4 + Level 2 fluids', therapy: 'Mendelsohn + effortful swallow', review: '2026-06-08' },
  { id: 'DY-002', patient: 'Pa Tunde Akinola', risk: 'High Risk', aspiration: 'Aspiration Risk', diet: 'NBM — NG feed', therapy: 'Oral care + comfort feeds', review: '2026-06-07' },
  { id: 'DY-003', patient: 'Miss Adaeze Nnamdi', risk: 'Moderate Risk', aspiration: 'Low', diet: 'Level 5 minced & moist', therapy: 'Oral motor + chin tuck', review: '2026-06-12' },
  { id: 'DY-004', patient: 'Pa Adebayo Odunsi', risk: 'Low Risk', aspiration: 'Low', diet: 'Regular + Level 1 fluids', therapy: 'Monitoring + reassessment', review: '2026-06-20' },
  { id: 'DY-005', patient: 'Mrs. Hadiza Bello', risk: 'Review Due', aspiration: 'Low', diet: '—', therapy: '—', review: '2026-06-02' },
];

const AUTISM = [
  { id: 'AU-001', patient: 'Master Tunde Bakare', age: 7, category: 'Social Communication', focus: 'PECS + joint attention', parent: 'Active training', school: 'IEP support', status: 'Active' },
  { id: 'AU-002', patient: 'Master Bolu Ajayi', age: 9, category: 'Social Communication', focus: 'Social scripts + pragmatics', parent: 'Weekly sessions', school: 'Liaison active', status: 'Active' },
  { id: 'AU-003', patient: 'Miss Halima Yusuf', age: 5, category: 'New', focus: 'AAC trial + requesting', parent: 'Onboarding', school: 'Pre-school referral', status: 'New' },
  { id: 'AU-004', patient: 'Master Tariq Bello', age: 6, category: 'Parent Training', focus: 'Parent-mediated intervention', parent: 'Active training', school: 'Mainstream', status: 'Active' },
  { id: 'AU-005', patient: 'Miss Zara Idris', age: 8, category: 'Social Communication', focus: 'Conversation turn-taking', parent: 'Monthly review', school: 'IEP support', status: 'Review Due' },
];

const COGNITIVE = [
  { id: 'CC-001', patient: 'Pa Adebayo Odunsi', focus: 'Memory aids + spaced retrieval', stage: 'Early' },
  { id: 'CC-002', patient: 'Mr. Chidi Eze', focus: 'Attention + executive — post-CVA', stage: 'Moderate' },
  { id: 'CC-003', patient: 'Pa Tunde Akinola', focus: 'Comfort communication strategies', stage: 'Severe' },
  { id: 'CC-004', patient: 'Mrs. Funke Adeyemi', focus: 'Functional communication — depression', stage: 'Rehab Active' },
  { id: 'CC-005', patient: 'Ma Salamatu Bello', focus: 'Word-finding strategies', stage: 'Review Due' },
];

const PLANS = [
  { id: 'TP-001', patient: 'Master Tunde Bakare', goals: 'Use 10 PECS icons, 2-word requests', objectives: 5, progress: '40%', review: '2026-06-14', status: 'Active', priority: 'High' },
  { id: 'TP-002', patient: 'Mr. Chidi Eze', goals: 'Single-word naming 70%, safe swallow', objectives: 6, progress: '55%', review: '2026-06-09', status: 'Active', priority: 'High' },
  { id: 'TP-003', patient: 'Master Bolu Ajayi', goals: '%SS <3 in conversation', objectives: 4, progress: '60%', review: '2026-06-18', status: 'Active', priority: 'Medium' },
  { id: 'TP-004', patient: 'Mrs. Bisi Akande', goals: 'Resonant voice in 80% trials', objectives: 3, progress: '100%', review: '2026-05-30', status: 'Completed', priority: 'Medium' },
  { id: 'TP-005', patient: 'Pa Tunde Akinola', goals: 'Comfort feeds + oral care', objectives: 3, progress: '20%', review: '2026-05-28', status: 'Suspended', priority: 'High' },
  { id: 'TP-006', patient: 'Pa Adebayo Odunsi', goals: 'Memory cues + functional naming', objectives: 4, progress: '50%', review: '2026-06-02', status: 'Due for Review', priority: 'Medium' },
];

const SESSIONS = [
  { id: 'TS-001', patient: 'Master Tunde Bakare', type: 'Paediatric — Individual', date: '2026-06-03 09:30', therapist: 'SLT. Mojisola', dur: '45 min', notes: 'PECS phase II — 5 spontaneous exchanges', status: 'Today' },
  { id: 'TS-002', patient: 'Mr. Chidi Eze', type: 'Adult — Inpatient', date: '2026-06-03 10:30', therapist: 'SLT. Funmi', dur: '40 min', notes: 'SLP + swallow trial — Level 4 tolerated', status: 'Today' },
  { id: 'TS-003', patient: 'Group — Stroke Club', type: 'Group (6)', date: '2026-06-03 11:30', therapist: 'SLT. Funmi', dur: '60 min', notes: 'Conversation therapy + peer support', status: 'Today' },
  { id: 'TS-004', patient: 'Mrs. Bisi Akande', type: 'Voice — Outpatient', date: '2026-06-04 14:00', therapist: 'SLT. Tope', dur: '40 min', notes: 'Resonant voice + SOVT exercises', status: 'Pending' },
  { id: 'TS-005', patient: 'Master Bolu Ajayi', type: 'Family session', date: '2026-06-01 15:30', therapist: 'SLT. Mojisola', dur: '50 min', notes: 'Lidcombe parent rating training', status: 'Completed' },
  { id: 'TS-006', patient: 'Pa Adebayo Odunsi', type: 'Cognitive comms', date: '2026-05-30 09:00', therapist: 'SLT. Tope', dur: '40 min', notes: 'Patient declined — reschedule', status: 'Missed' },
  { id: 'TS-007', patient: 'Mr. Ibrahim Musa', type: 'LSVT LOUD', date: '2026-06-05 11:00', therapist: 'SLT. Funmi', dur: '45 min', notes: 'Re-evaluation due', status: 'Follow-Up Required' },
];

const FAMILY = [
  { id: 'FT-001', patient: 'Bakare Family', type: 'Parent Training', focus: 'PECS at home + joint attention play', therapist: 'SLT. Mojisola', date: '2026-06-03', status: 'Today' },
  { id: 'FT-002', patient: 'Eze Family', type: 'Caregiver Education', focus: 'Safe swallow + supported conversation', therapist: 'SLT. Funmi', date: '2026-06-04', status: 'Pending' },
  { id: 'FT-003', patient: 'Ajayi Family', type: 'Parent Training', focus: 'Lidcombe daily practice', therapist: 'SLT. Mojisola', date: '2026-05-30', status: 'Completed' },
  { id: 'FT-004', patient: 'Odunsi Family', type: 'Caregiver Education', focus: 'Memory cues + simplified language', therapist: 'SLT. Tope', date: '2026-06-02', status: 'Completed' },
];

const HOME_PROG = [
  { id: 'HP-001', patient: 'Master Tunde Bakare', program: 'PECS icons + naming book', frequency: 'Daily 15 min', compliance: '80%', status: 'Active' },
  { id: 'HP-002', patient: 'Mr. Chidi Eze', program: 'Naming drills + chin tuck swallow', frequency: '2× daily', compliance: '65%', status: 'Sent' },
  { id: 'HP-003', patient: 'Mrs. Bisi Akande', program: 'Vocal hygiene log + warm-ups', frequency: 'Daily', compliance: '95%', status: 'Completed' },
  { id: 'HP-004', patient: 'Master Bolu Ajayi', program: 'Lidcombe parent ratings', frequency: 'Daily', compliance: '90%', status: 'Active' },
  { id: 'HP-005', patient: 'Pa Adebayo Odunsi', program: 'Memory recall booklet', frequency: '3× weekly', compliance: '—', status: 'Pending' },
  { id: 'HP-006', patient: 'Pa Tunde Akinola', program: 'Caregiver oral care plan', frequency: 'Daily', compliance: '—', status: 'Review Due' },
];

const TELE = [
  { id: 'TT-001', patient: 'Mr. Sola Adebayo', type: 'Follow-up review', date: '2026-06-03 10:00', therapist: 'SLT. Funmi', status: 'Confirmed' },
  { id: 'TT-002', patient: 'Mrs. Adebola Lawal', type: 'Voice review', date: '2026-06-03 11:30', therapist: 'SLT. Tope', status: 'Confirmed' },
  { id: 'TT-003', patient: 'Master Bolu Ajayi', type: 'Lidcombe parent session', date: '2026-06-04 16:00', therapist: 'SLT. Mojisola', status: 'Scheduled' },
  { id: 'TT-004', patient: 'Mr. Femi Oguntade', type: 'Aphasia review', date: '2026-06-05 09:00', therapist: 'SLT. Funmi', status: 'Pending' },
  { id: 'TT-005', patient: 'Mrs. Funke Adeyemi', type: 'Cognitive comms', date: '2026-05-30 14:00', therapist: 'SLT. Tope', status: 'Completed' },
  { id: 'TT-006', patient: 'Mr. Yusuf Aliyu', type: 'Fluency review', date: '2026-05-29 10:00', therapist: 'SLT. Mojisola', status: 'Missed' },
];

const CHILD = [
  { id: 'CH-001', patient: 'Master Tunde Bakare', age: 7, category: 'Autism Communication', focus: 'PECS + joint attention', school: 'Active liaison', status: 'Active' },
  { id: 'CH-002', patient: 'Miss Adaeze Nnamdi', age: 5, category: 'Developmental Delay', focus: 'Feeding + oral motor', school: 'IEP support', status: 'Active' },
  { id: 'CH-003', patient: 'Master Bolu Ajayi', age: 9, category: 'School Communication', focus: 'Lidcombe + school readiness', school: 'Active liaison', status: 'Active' },
  { id: 'CH-004', patient: 'Miss Halima Yusuf', age: 5, category: 'Autism Communication', focus: 'AAC trial', school: 'Pre-school referral', status: 'Active' },
  { id: 'CH-005', patient: 'Master Tariq Bello', age: 6, category: 'Developmental Delay', focus: 'Phonology', school: 'Mainstream', status: 'Review Due' },
];

const ADULT = [
  { id: 'AD-001', patient: 'Mr. Chidi Eze', category: 'Dysphagia', dx: 'Aphasia + dysphagia', focus: 'Naming + swallow', status: 'Active' },
  { id: 'AD-002', patient: 'Mr. Ibrahim Musa', category: 'Voice', dx: 'Parkinsonian dysarthria', focus: 'LSVT LOUD', status: 'Active' },
  { id: 'AD-003', patient: 'Pa Adebayo Odunsi', category: 'Cognitive Communication', dx: 'MCI', focus: 'Cognitive comms', status: 'Active' },
  { id: 'AD-004', patient: 'Mrs. Bisi Akande', category: 'Voice', dx: 'Vocal nodules', focus: 'Voice rehab', status: 'Active' },
  { id: 'AD-005', patient: 'Pa Tunde Akinola', category: 'Dysphagia', dx: 'Late dementia dysphagia', focus: 'Comfort feeds', status: 'Review Due' },
];

const INPATIENT = [
  { id: 'IP-SLT-001', patient: 'Mr. Chidi Eze', ward: 'Neuro Ward', bed: 'NW-04', risk: 'High Risk', dailyReview: 'Bedside swallow + naming drills', status: 'Today' },
  { id: 'IP-SLT-002', patient: 'Pa Tunde Akinola', ward: 'HDE', bed: 'HDE-01', risk: 'High Risk', dailyReview: 'Oral care + comfort feeds', status: 'Today' },
  { id: 'IP-SLT-003', patient: 'Miss Adaeze Nnamdi', ward: 'Paeds Ward', bed: 'PED-02', risk: 'Moderate', dailyReview: 'Oral motor + thickened feeds', status: 'Pending' },
  { id: 'IP-SLT-004', patient: 'Mr. Sola Adebayo', ward: 'Addiction Ward', bed: 'ADW-02', risk: 'Low', dailyReview: 'Discharge readiness review', status: 'Discharge Readiness' },
  { id: 'IP-SLT-005', patient: 'Mrs. Hadiza Bello', ward: 'Geriatric Ward', bed: 'GER-03', risk: 'Moderate', dailyReview: 'Swallow reassessment', status: 'Completed' },
];

const OUTPATIENT = [
  { id: 'OP-SLT-001', patient: 'Master Tunde Bakare', visitType: 'Paediatric session', slot: '2026-06-04 09:30', therapist: 'SLT. Mojisola', status: 'Confirmed' },
  { id: 'OP-SLT-002', patient: 'Mrs. Bisi Akande', visitType: 'Voice rehab', slot: '2026-06-04 11:00', therapist: 'SLT. Tope', status: 'Confirmed' },
  { id: 'OP-SLT-003', patient: 'Master Bolu Ajayi', visitType: 'Fluency review', slot: '2026-06-04 14:30', therapist: 'SLT. Mojisola', status: 'Pending' },
  { id: 'OP-SLT-004', patient: 'Mr. Ibrahim Musa', visitType: 'LSVT LOUD', slot: '2026-06-05 10:00', therapist: 'SLT. Funmi', status: 'Rescheduled' },
  { id: 'OP-SLT-005', patient: 'Mr. Yusuf Aliyu', visitType: 'Cluttering review', slot: '2026-05-28 11:00', therapist: 'SLT. Funmi', status: 'Completed' },
  { id: 'OP-SLT-006', patient: 'Mrs. Funke Adeyemi', visitType: 'Cognitive comms', slot: '2026-05-29 09:30', therapist: 'SLT. Tope', status: 'Missed' },
];

const SMART = [
  { id: 'TQ-001', kind: 'Pending Documentation', item: 'Mr. Chidi Eze — session note', due: 'Today' },
  { id: 'TQ-002', kind: 'Follow-Up Due', item: 'Master Tunde Bakare — review', due: '2026-06-14' },
  { id: 'TQ-003', kind: 'Missed Sessions', item: 'Pa Adebayo Odunsi — contact family', due: 'Today' },
  { id: 'TQ-004', kind: 'Draft Sessions', item: 'Voice assessment — Mrs. Akande', due: 'Auto-saved 11:20' },
  { id: 'TQ-005', kind: 'Pending Sync', item: 'Dysphagia plan — Pa Tunde Akinola', due: 'Today' },
];

const FOLLOWUPS = [
  { id: 'FU-SLT-001', patient: 'Master Tunde Bakare', type: 'Autism review', date: '2026-06-03', status: 'Today' },
  { id: 'FU-SLT-002', patient: 'Mr. Chidi Eze', type: 'Aphasia + swallow review', date: '2026-06-09', status: 'Confirmed' },
  { id: 'FU-SLT-003', patient: 'Master Bolu Ajayi', type: 'Fluency review', date: '2026-06-18', status: 'Pending' },
  { id: 'FU-SLT-004', patient: 'Pa Tunde Akinola', type: 'Dysphagia review (overdue)', date: '2026-05-30', status: 'Missed' },
  { id: 'FU-SLT-005', patient: 'Mrs. Bisi Akande', type: 'Voice review', date: '2026-06-12', status: 'Rescheduled' },
  { id: 'FU-SLT-006', patient: 'Pa Adebayo Odunsi', type: 'Cognitive comms review', date: '2026-05-29', status: 'Completed' },
];

const SERVICE_TYPES = [
  'Speech Assessment', 'Language Assessment', 'Dysphagia Review', 'Therapy Session',
  'Teletherapy Session', 'Family Training', 'Home Program',
];

const INVOICES = [
  { id: 'INV-SLT-801', patient: 'Master Tunde Bakare', service: 'Assessment + 4 sessions', amount: 36000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-SLT-802', patient: 'Mr. Chidi Eze', service: 'Dysphagia + aphasia × 6', amount: 54000, nhia: 'Pending', status: 'NHIA' },
  { id: 'INV-SLT-803', patient: 'Mrs. Bisi Akande', service: 'Voice rehab × 3', amount: 21000, nhia: 'N/A', status: 'Paid' },
  { id: 'INV-SLT-804', patient: 'Master Bolu Ajayi', service: 'Fluency programme (Lidcombe)', amount: 28000, nhia: 'N/A', status: 'Pending' },
  { id: 'INV-SLT-805', patient: 'Pa Adebayo Odunsi', service: 'Cognitive comms × 5', amount: 30000, nhia: 'Approved', status: 'NHIA' },
  { id: 'INV-SLT-806', patient: 'Mr. Ibrahim Musa', service: 'LSVT LOUD × 4', amount: 26000, nhia: 'N/A', status: 'Outstanding' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Okafor (Doctor)', dept: 'Doctor', patient: 'Mr. Chidi Eze', preview: 'Please escalate swallow assessment — chest infection risk.', time: '09:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Nurse Adesina (Nursing)', dept: 'Nursing', patient: 'Pa Tunde Akinola', preview: 'Oral care plan needs review — coughing during feeds.', time: '10:00', unread: 1, urgent: true },
  { id: 'TH-3', with: 'TR. Adesina (Occupational Therapy)', dept: 'Occupational Therapy', patient: 'Miss Adaeze Nnamdi', preview: 'Feeding adaptations ready.', time: '11:15', unread: 0, urgent: false },
  { id: 'TH-4', with: 'PT. Bukola (Physiotherapy)', dept: 'Physiotherapy', patient: 'Mr. Chidi Eze', preview: 'Joint session for posture during swallow.', time: '12:00', unread: 0, urgent: false },
  { id: 'TH-5', with: 'Dr. Aisha (Psychology)', dept: 'Psychology', patient: 'Mrs. Funke Adeyemi', preview: 'Communication confidence improving.', time: '13:20', unread: 1, urgent: false },
  { id: 'TH-6', with: 'Mrs. Funmi (Social Work)', dept: 'Social Work', patient: 'Master Bolu Ajayi', preview: 'Family support plan attached.', time: 'Yesterday', unread: 0, urgent: false },
  { id: 'TH-7', with: 'Dr. Aluko (Child Psychiatry)', dept: 'Child Psychiatry', patient: 'Master Tunde Bakare', preview: 'MDT review scheduled Friday.', time: '2d', unread: 0, urgent: false },
  { id: 'TH-8', with: 'Dr. Sowemimo (Psychogeriatrics)', dept: 'Psychogeriatrics', patient: 'Pa Adebayo Odunsi', preview: 'Cognitive comms plan updated.', time: '3d', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-1', patient: 'Pa Tunde Akinola', type: 'High dysphagia risk', message: 'Aspiration noted during last feed.', date: '2026-06-03', status: 'Critical' },
  { id: 'AL-2', patient: 'Mr. Chidi Eze', type: 'Dysphagia review overdue', message: 'Swallow review pending 5 days.', date: '2026-06-03', status: 'Dysphagia Risk' },
  { id: 'AL-3', patient: 'Pa Adebayo Odunsi', type: 'Missed sessions', message: '2 consecutive missed sessions.', date: '2026-06-02', status: 'Missed Sessions' },
  { id: 'AL-4', patient: 'Mrs. Funke Adeyemi', type: 'Communication decline', message: '3-week plateau in functional comms.', date: '2026-06-02', status: 'Communication Decline' },
  { id: 'AL-5', patient: 'Master Bolu Ajayi', type: 'Follow-up overdue', message: 'Fluency review past 7 days.', date: '2026-06-01', status: 'Pending Follow-Up' },
  { id: 'AL-6', patient: 'Mrs. Bisi Akande', type: 'Routine ack', message: 'Reviewed and acknowledged.', date: '2026-05-30', status: 'Acknowledged' },
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
          title={`${p.shellTitle} · ${selected.patient || selected.id}`}
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
export const SpeechTherapyDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'New Assessment', i: ClipboardList, p: 'assessments' },
    { l: 'Start Therapy', i: Activity, p: 'sessions' },
    { l: 'Referral Center', i: Send, p: 'referrals' },
    { l: 'Speech Disorders', i: Mic, p: 'speech-disorders' },
    { l: 'Language Disorders', i: BookOpenCheck, p: 'language-disorders' },
    { l: 'Voice & Fluency', i: Volume2, p: 'voice-fluency' },
    { l: 'Dysphagia Center', i: Apple, p: 'dysphagia' },
    { l: 'Autism Communication', i: Baby, p: 'autism' },
    { l: 'Cognitive Communication', i: Brain, p: 'cognitive' },
    { l: 'Treatment Plans', i: HeartHandshake, p: 'plans' },
    { l: 'Home Programs', i: Home, p: 'home-program' },
    { l: 'Teletherapy', i: Video, p: 'teletherapy' },
    { l: 'Follow-Up', i: Repeat, p: 'followup' },
    { l: 'Billing & NHIA', i: CreditCard, p: 'billing' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Communication', i: MessageSquare, p: 'comms' },
    { l: 'Critical Alerts', i: AlertTriangle, p: 'alerts' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<Mic className="h-5 w-5" />}
        title="Speech & Language Therapy Workspace"
        desc="GFA HMS · Comprehensive speech, language, voice, fluency, dysphagia, autism, paediatric and neurogenic communication therapy."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/sessions?new=1`)}><Activity className="h-4 w-4 mr-1" /> Start Therapy</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'New Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 10, i: Send, tone: 'purple' },
        { l: 'Active Patients', v: 174, i: Users, tone: 'blue' },
        { l: 'Assessments Pending', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 9, i: ClipboardList, tone: 'amber' },
        { l: 'Sessions Today', v: SESSIONS.filter(s => s.status === 'Today').length + 5, i: Activity, tone: 'teal' },
        { l: 'Dysphagia High Risk', v: DYSPHAGIA.filter(d => d.risk === 'High Risk').length + 6, i: Apple, tone: 'rose' },
        { l: 'Autism Cases', v: AUTISM.length + 41, i: Baby, tone: 'amber' },
      ]} />
      <KpiGrid items={[
        { l: 'Home Programs Active', v: HOME_PROG.filter(h => h.status === 'Active').length + 88, i: Home, tone: 'green' },
        { l: 'Teletherapy Sessions', v: TELE.length + 18, i: Video, tone: 'blue' },
        { l: 'Follow-Ups Due', v: FOLLOWUPS.filter(f => f.status === 'Today' || f.status === 'Pending').length + 4, i: CalendarDays, tone: 'amber' },
        { l: 'Billing Pending', v: INVOICES.filter(i => i.status === 'Pending' || i.status === 'Outstanding').length + 6, i: CreditCard, tone: 'amber' },
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 1, i: AlertTriangle, tone: 'rose' },
        { l: 'Revenue (MTD)', v: formatCurrency(2840000), i: CreditCard, tone: 'green' },
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
export const SpeechReferralCenter = () => {
  const [selected, setSelected] = useState<typeof REFERRALS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Referral Center"
        icon={<Send className="h-5 w-5" />}
        title="Speech Therapy Referral Center"
        desc="Inbound referrals from Doctor, CAP, Psychiatry, OT, Physiotherapy, Psychogeriatrics, Psychology and Nursing. Triage, prioritise and assign therapists."
        ctaLabel="New Referral"
        kpis={[
          { l: 'Total Referrals', v: REFERRALS.length + 118, i: Send, tone: 'blue' },
          { l: 'High Priority', v: REFERRALS.filter(r => r.priority === 'High').length + 14, i: AlertTriangle, tone: 'rose' },
          { l: 'Medium Priority', v: REFERRALS.filter(r => r.priority === 'Medium').length + 36, i: AlertCircle, tone: 'amber' },
          { l: 'Low Priority', v: REFERRALS.filter(r => r.priority === 'Low').length + 58, i: CheckCircle2, tone: 'green' },
          { l: 'Accepted', v: REFERRALS.filter(r => r.status === 'Accepted').length + 84, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: REFERRALS.filter(r => r.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
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
            { k: 'from', label: 'Referring Department', type: 'select', options: ['Doctor', 'CAP', 'Psychiatry', 'Psychogeriatrics', 'Physiotherapy', 'OT', 'Nursing', 'Psychology', 'Social Work'] },
            { k: 'reason', label: 'Referral Reason', type: 'textarea' },
            { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
            { k: 'slt', label: 'Assigned Speech Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Referral created" nextStep="Triage the referral and assign a speech therapist."
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
export const SpeechAssessmentCenter = () => {
  const [selected, setSelected] = useState<typeof ASSESSMENTS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Assessment Center"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Speech & Language Assessment Center"
        desc="Speech, language, articulation, voice, fluency, dysphagia, cognitive-communication and autism assessments — auto-save, scoring, recommendations."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Pending Assessments', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 10, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: ASSESSMENTS.filter(a => a.status === 'In Progress').length + 6, i: TrendingUp, tone: 'purple' },
          { l: 'Completed', v: ASSESSMENTS.filter(a => a.status === 'Completed').length + 88, i: CheckCircle2, tone: 'green' },
          { l: 'High Priority', v: ASSESSMENTS.filter(a => a.priority === 'High').length + 6, i: AlertTriangle, tone: 'rose' },
          { l: 'Follow-Up Required', v: ASSESSMENTS.filter(a => a.flag === 'FU').length + 12, i: Repeat, tone: 'amber' },
          { l: 'Templates', v: ASSESSMENT_TYPES.length, i: BookOpen, tone: 'blue' },
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
            { k: 'slt', label: 'Assigned Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
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
            { label: 'Findings', value: 'Articulation errors final position · Intelligibility 65% · Comprehension WNL.' },
            { label: 'Recommendations', value: 'Twice-weekly therapy, parent training, review in 6 weeks.' },
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
// 4. SPEECH DISORDERS
// ============================================================
export const SpeechDisorders = () => (
  <SpecialisedPage
    shellTitle="Speech Disorders" icon={<Mic className="h-5 w-5" />}
    title="Speech Disorders Management"
    desc="Articulation, phonological, motor speech disorders, apraxia and dysarthria — severity, goals and progress."
    ctaLabel="New Case"
    kpis={[
      { l: 'Mild Cases', v: SPEECH_DIS.filter(s => s.severity === 'Mild').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Cases', v: SPEECH_DIS.filter(s => s.severity === 'Moderate').length + 22, i: AlertCircle, tone: 'amber' },
      { l: 'Severe Cases', v: SPEECH_DIS.filter(s => s.severity === 'Severe').length + 9, i: AlertTriangle, tone: 'rose' },
      { l: 'Active Cases', v: SPEECH_DIS.filter(s => s.status === 'Active').length + 38, i: Activity, tone: 'blue' },
      { l: 'Review Due', v: SPEECH_DIS.filter(s => s.status === 'Review Due').length + 5, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: SPEECH_DIS.length + 60, i: Mic, tone: 'purple' },
    ]}
    tabKey="severity"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'mi', label: 'Mild', value: 'Mild' },
      { key: 'mo', label: 'Moderate', value: 'Moderate' },
      { key: 'se', label: 'Severe', value: 'Severe' },
      { key: 'ac', label: 'Active', value: undefined },
      { key: 'rv', label: 'Review Due', value: undefined },
    ]}
    rows={SPEECH_DIS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.type}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'sv', header: 'Severity', render: r => <Chip label={r.severity} t={r.severity === 'Severe' ? 'red' : r.severity === 'Moderate' ? 'amber' : 'green'} /> },
      { key: 'g', header: 'Goals', render: r => r.goals },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'type', label: 'Disorder Type', type: 'select', options: ['Articulation disorder', 'Phonological disorder', 'Apraxia of speech', 'Hypokinetic dysarthria', 'Spastic dysarthria', 'Motor speech disorder'] },
      { k: 'sev', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
      { k: 'sym', label: 'Symptoms', type: 'textarea' },
      { k: 'goal', label: 'Therapy Goal', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Speech disorder case created" nextStep="Open the workspace to set therapy goals."
  />
);

// ============================================================
// 5. LANGUAGE DISORDERS
// ============================================================
export const LanguageDisorders = () => (
  <SpecialisedPage
    shellTitle="Language Disorders" icon={<BookOpenCheck className="h-5 w-5" />}
    title="Language Disorders Management"
    desc="Expressive, receptive, mixed and developmental language disorders — baseline, progress and outcomes."
    ctaLabel="New Case"
    kpis={[
      { l: 'Improving', v: LANG_DIS.filter(l => l.outcome === 'Improving').length + 18, i: TrendingUp, tone: 'green' },
      { l: 'Stable', v: LANG_DIS.filter(l => l.outcome === 'Stable').length + 22, i: CheckCircle2, tone: 'blue' },
      { l: 'Declining', v: LANG_DIS.filter(l => l.outcome === 'Declining').length + 4, i: AlertCircle, tone: 'amber' },
      { l: 'New Cases', v: LANG_DIS.filter(l => l.outcome === 'New').length + 6, i: FilePlus, tone: 'purple' },
      { l: 'Review Due', v: LANG_DIS.filter(l => l.outcome === 'Review Due').length + 5, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: LANG_DIS.length + 55, i: BookOpenCheck, tone: 'teal' },
    ]}
    tabKey="outcome"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'im', label: 'Improving', value: 'Improving' },
      { key: 'st', label: 'Stable', value: 'Stable' },
      { key: 'de', label: 'Declining', value: 'Declining' },
      { key: 'nw', label: 'New', value: 'New' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={LANG_DIS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.type}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'b', header: 'Baseline', render: r => r.baseline },
      { key: 'c', header: 'Current', render: r => r.current },
      { key: 'o', header: 'Outcome', render: r => <Chip label={r.outcome} t={r.outcome === 'Improving' || r.outcome === 'Stable' ? 'green' : r.outcome === 'Declining' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'type', label: 'Language Disorder Type', type: 'select', options: ['Expressive', 'Receptive', 'Mixed', 'Developmental language', 'Aphasia — Broca', 'Aphasia — Wernicke', 'Dementia-related'] },
      { k: 'base', label: 'Baseline Score', type: 'text' },
      { k: 'goal', label: 'Therapy Goal', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Language disorder case created" nextStep="Open the workspace to set goals."
  />
);

// ============================================================
// 6. VOICE & FLUENCY
// ============================================================
export const VoiceFluencyDisorders = () => (
  <SpecialisedPage
    shellTitle="Voice & Fluency" icon={<Volume2 className="h-5 w-5" />}
    title="Voice & Fluency Disorders"
    desc="Voice disorders, stuttering, cluttering and vocal hygiene programmes."
    ctaLabel="New Case"
    kpis={[
      { l: 'Mild Cases', v: VOICE_FLU.filter(v => v.severity === 'Mild').length + 12, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Cases', v: VOICE_FLU.filter(v => v.severity === 'Moderate').length + 14, i: AlertCircle, tone: 'amber' },
      { l: 'Severe Cases', v: VOICE_FLU.filter(v => v.severity === 'Severe').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Voice Cases', v: VOICE_FLU.filter(v => v.kind === 'Voice').length + 18, i: Volume2, tone: 'blue' },
      { l: 'Fluency Cases', v: VOICE_FLU.filter(v => v.kind === 'Fluency').length + 14, i: Mic, tone: 'purple' },
      { l: 'Total', v: VOICE_FLU.length + 40, i: HeartHandshake, tone: 'teal' },
    ]}
    tabKey="severity"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'mi', label: 'Mild', value: 'Mild' },
      { key: 'mo', label: 'Moderate', value: 'Moderate' },
      { key: 'se', label: 'Severe', value: 'Severe' },
      { key: 'vo', label: 'Voice', value: undefined },
      { key: 'fl', label: 'Fluency', value: undefined },
    ]}
    rows={VOICE_FLU}
    searchFields={(r) => `${r.patient} ${r.id} ${r.condition}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'k', header: 'Kind', render: r => r.kind },
      { key: 'c', header: 'Condition', render: r => r.condition },
      { key: 'sv', header: 'Severity', render: r => <Chip label={r.severity} t={r.severity === 'Severe' ? 'red' : r.severity === 'Moderate' ? 'amber' : 'green'} /> },
      { key: 'pl', header: 'Plan', render: r => r.plan },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Kind', type: 'select', options: ['Voice', 'Fluency'] },
      { k: 'cond', label: 'Condition', type: 'text' },
      { k: 'sev', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
      { k: 'plan', label: 'Plan', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Voice/Fluency case created" nextStep="Schedule first session and baseline recording."
  />
);

// ============================================================
// 7. DYSPHAGIA CENTER
// ============================================================
export const DysphagiaCenter = () => (
  <SpecialisedPage
    shellTitle="Dysphagia Center" icon={<Apple className="h-5 w-5" />}
    title="Dysphagia Center"
    desc="Bedside swallow review, aspiration risk, IDDSI diet recommendations and swallow therapy."
    ctaLabel="New Dysphagia Review"
    kpis={[
      { l: 'Low Risk', v: DYSPHAGIA.filter(d => d.risk === 'Low Risk').length + 9, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Risk', v: DYSPHAGIA.filter(d => d.risk === 'Moderate Risk').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'High Risk', v: DYSPHAGIA.filter(d => d.risk === 'High Risk').length + 7, i: AlertTriangle, tone: 'rose' },
      { l: 'Aspiration Risk', v: DYSPHAGIA.filter(d => d.aspiration === 'Aspiration Risk').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'Review Due', v: DYSPHAGIA.filter(d => d.risk === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: DYSPHAGIA.length + 38, i: Apple, tone: 'blue' },
    ]}
    tabKey="risk"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'lr', label: 'Low Risk', value: 'Low Risk' },
      { key: 'mr', label: 'Moderate Risk', value: 'Moderate Risk' },
      { key: 'hr', label: 'High Risk', value: 'High Risk' },
      { key: 'ar', label: 'Aspiration Risk', value: undefined },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={DYSPHAGIA}
    searchFields={(r) => `${r.patient} ${r.id} ${r.diet}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : r.risk === 'Moderate Risk' ? 'amber' : 'green'} /> },
      { key: 'a', header: 'Aspiration', render: r => r.aspiration },
      { key: 'd', header: 'Diet', render: r => r.diet },
      { key: 't', header: 'Therapy', render: r => r.therapy },
      { key: 'rv', header: 'Review', render: r => r.review },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'concern', label: 'Swallowing Concern', type: 'textarea' },
      { k: 'asp', label: 'Aspiration Risk', type: 'select', options: ['Low', 'Aspiration Risk'] },
      { k: 'diet', label: 'Recommended Diet', type: 'select', options: ['Regular + Level 1 fluids', 'IDDSI Level 5 minced & moist', 'IDDSI Level 4 Puréed', 'NBM — NG feed'] },
      { k: 'plan', label: 'Therapy Plan', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Dysphagia review created" nextStep="Open the workspace to record swallow trial."
  />
);

// ============================================================
// 8. AUTISM COMMUNICATION
// ============================================================
export const AutismCommunication = () => (
  <SpecialisedPage
    shellTitle="Autism Communication" icon={<Baby className="h-5 w-5" />}
    title="Autism Communication"
    desc="Social communication, AAC, PECS, parent training and school liaison for children on the autism spectrum."
    ctaLabel="New Autism Case"
    kpis={[
      { l: 'Active Cases', v: AUTISM.filter(a => a.status === 'Active').length + 32, i: Activity, tone: 'blue' },
      { l: 'New Cases', v: AUTISM.filter(a => a.status === 'New').length + 6, i: FilePlus, tone: 'purple' },
      { l: 'Social Communication', v: AUTISM.filter(a => a.category === 'Social Communication').length + 18, i: UsersRound, tone: 'amber' },
      { l: 'Parent Training', v: AUTISM.filter(a => a.category === 'Parent Training').length + 12, i: HeartHandshake, tone: 'green' },
      { l: 'Review Due', v: AUTISM.filter(a => a.status === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: AUTISM.length + 46, i: Baby, tone: 'teal' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: undefined },
      { key: 'nw', label: 'New', value: 'New' },
      { key: 'sc', label: 'Social Communication', value: 'Social Communication' },
      { key: 'pt', label: 'Parent Training', value: 'Parent Training' },
      { key: 'rv', label: 'Review Due', value: undefined },
    ]}
    rows={AUTISM}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Child', render: r => `${r.patient} · ${r.age}y` },
      { key: 'c', header: 'Category', render: r => r.category },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'pa', header: 'Parent', render: r => r.parent },
      { key: 'sc', header: 'School', render: r => r.school },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Child', type: 'patientPicker' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Social Communication', 'Parent Training', 'AAC', 'School Liaison'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'parent', label: 'Parent Plan', type: 'text' },
      { k: 'school', label: 'School Liaison', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Autism case created" nextStep="Schedule first session and parent onboarding."
  />
);

// ============================================================
// 9. COGNITIVE COMMUNICATION
// ============================================================
export const CognitiveCommunication = () => (
  <SpecialisedPage
    shellTitle="Cognitive Communication" icon={<Brain className="h-5 w-5" />}
    title="Cognitive Communication"
    desc="Cognitive-communication therapy for dementia, MCI, post-CVA and functional comms rehabilitation."
    ctaLabel="New Case"
    kpis={[
      { l: 'Early Stage', v: COGNITIVE.filter(c => c.stage === 'Early').length + 14, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Stage', v: COGNITIVE.filter(c => c.stage === 'Moderate').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Severe Stage', v: COGNITIVE.filter(c => c.stage === 'Severe').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Rehab Active', v: COGNITIVE.filter(c => c.stage === 'Rehab Active').length + 8, i: Activity, tone: 'blue' },
      { l: 'Review Due', v: COGNITIVE.filter(c => c.stage === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: COGNITIVE.length + 40, i: Brain, tone: 'purple' },
    ]}
    tabKey="stage"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'er', label: 'Early', value: 'Early' },
      { key: 'mo', label: 'Moderate', value: 'Moderate' },
      { key: 'se', label: 'Severe', value: 'Severe' },
      { key: 'ra', label: 'Rehab Active', value: 'Rehab Active' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={COGNITIVE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 's', header: 'Stage', render: r => <Chip label={r.stage} t={r.stage === 'Severe' ? 'red' : r.stage === 'Moderate' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'stage', label: 'Stage', type: 'select', options: ['Early', 'Moderate', 'Severe', 'Rehab Active'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Cognitive communication case created" nextStep="Schedule cognitive comms session."
  />
);

// ============================================================
// 10. TREATMENT PLANS
// ============================================================
export const TreatmentPlans = () => {
  const [selected, setSelected] = useState<typeof PLANS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Treatment Plans"
        icon={<HeartHandshake className="h-5 w-5" />}
        title="Speech Therapy Treatment Plans"
        desc="Goal-based, time-bound treatment plans with measurable objectives, review dates and outcomes."
        ctaLabel="New Plan"
        kpis={[
          { l: 'Active Plans', v: PLANS.filter(p => p.status === 'Active').length + 42, i: Activity, tone: 'green' },
          { l: 'Completed Plans', v: PLANS.filter(p => p.status === 'Completed').length + 36, i: CheckCircle2, tone: 'blue' },
          { l: 'Suspended Plans', v: PLANS.filter(p => p.status === 'Suspended').length + 4, i: AlertCircle, tone: 'amber' },
          { l: 'Due for Review', v: PLANS.filter(p => p.status === 'Due for Review').length + 6, i: CalendarDays, tone: 'amber' },
          { l: 'High Priority', v: PLANS.filter(p => p.priority === 'High').length + 12, i: AlertTriangle, tone: 'rose' },
          { l: 'Total Plans', v: PLANS.length + 88, i: HeartHandshake, tone: 'purple' },
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
          { key: 'pr', header: 'Progress', render: r => <Chip label={r.progress} t={parseInt(r.progress) >= 80 ? 'green' : 'amber'} /> },
          { key: 'rv', header: 'Review', render: r => r.review },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Suspended' ? 'red' : r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Treatment Plan" submitLabel="Create Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'goals', label: 'Therapy Goals', type: 'textarea' },
            { k: 'inter', label: 'Intervention Plan', type: 'textarea' },
            { k: 'sess', label: 'Session Plan', type: 'text' },
            { k: 'review', label: 'Review Date', type: 'date' },
            { k: 'out', label: 'Expected Outcome', type: 'textarea' },
          ]}
          successTitle="Treatment plan created" nextStep="Schedule first session and set review."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Plan · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Goals', value: selected.goals },
            { label: 'Objectives', value: selected.objectives },
            { label: 'Progress', value: selected.progress },
            { label: 'Review', value: selected.review },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Plan updated')}>Edit Plan</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Plan suspended'); }}>Suspend Plan</Button>
              <Button variant="outline" onClick={() => toast.success('Plan printed')}><Printer className="h-4 w-4 mr-1" /> Print Plan</Button>
              <Button onClick={() => { setSelected(null); toast.success('Plan completed'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete Plan</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 11. THERAPY SESSIONS
// ============================================================
export const TherapySessions = () => {
  const [selected, setSelected] = useState<typeof SESSIONS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Therapy Sessions"
        icon={<Activity className="h-5 w-5" />}
        title="Therapy Session Workspace"
        desc="Individual, group, inpatient, outpatient and family sessions with attendance, activities and outcomes."
        ctaLabel="Start Session"
        kpis={[
          { l: 'Sessions Today', v: SESSIONS.filter(s => s.status === 'Today').length + 5, i: CalendarDays, tone: 'teal' },
          { l: 'Pending Sessions', v: SESSIONS.filter(s => s.status === 'Pending').length + 10, i: AlertCircle, tone: 'amber' },
          { l: 'Completed Sessions', v: SESSIONS.filter(s => s.status === 'Completed').length + 172, i: CheckCircle2, tone: 'green' },
          { l: 'Missed Sessions', v: SESSIONS.filter(s => s.status === 'Missed').length + 8, i: AlertTriangle, tone: 'rose' },
          { l: 'Follow-Up Required', v: SESSIONS.filter(s => s.status === 'Follow-Up Required').length + 6, i: Repeat, tone: 'amber' },
          { l: 'Total (MTD)', v: 208, i: Activity, tone: 'blue' },
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
          title="Start Therapy Session" submitLabel="Schedule Session"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Session Type', type: 'select', options: ['Paediatric — Individual', 'Adult — Individual', 'Adult — Inpatient', 'Group', 'Voice — Outpatient', 'Family session'] },
            { k: 'slt', label: 'Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'time', label: 'Time', type: 'time' },
            { k: 'goals', label: 'Goals', type: 'textarea' },
            { k: 'notes', label: 'Session Notes', type: 'textarea' },
            { k: 'out', label: 'Outcome', type: 'text' },
            { k: 'next', label: 'Next Step', type: 'text' },
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
// 12. FAMILY TRAINING
// ============================================================
export const FamilyTraining = () => (
  <SpecialisedPage
    shellTitle="Family Training" icon={<UsersRound className="h-5 w-5" />}
    title="Family Training"
    desc="Caregiver education, parent training, supported conversation and home-carryover coaching."
    ctaLabel="New Training"
    kpis={[
      { l: 'Trainings Today', v: FAMILY.filter(f => f.status === 'Today').length + 3, i: CalendarDays, tone: 'teal' },
      { l: 'Pending Trainings', v: FAMILY.filter(f => f.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Completed', v: FAMILY.filter(f => f.status === 'Completed').length + 38, i: CheckCircle2, tone: 'green' },
      { l: 'Caregiver Education', v: FAMILY.filter(f => f.type === 'Caregiver Education').length + 14, i: HeartHandshake, tone: 'blue' },
      { l: 'Parent Training', v: FAMILY.filter(f => f.type === 'Parent Training').length + 18, i: UsersRound, tone: 'purple' },
      { l: 'Total', v: FAMILY.length + 50, i: Users, tone: 'amber' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'ce', label: 'Caregiver Education', value: undefined },
      { key: 'pt', label: 'Parent Training', value: undefined },
    ]}
    rows={FAMILY}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Family', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'th', header: 'Therapist', render: r => r.therapist },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Family / Patient', type: 'patientPicker' },
      { k: 'type', label: 'Training Type', type: 'select', options: ['Parent Training', 'Caregiver Education'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'slt', label: 'Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Family training scheduled" nextStep="Confirm date with family and prepare materials."
  />
);

// ============================================================
// 13. HOME PROGRAMS
// ============================================================
export const HomeProgramCenter = () => {
  const [selected, setSelected] = useState<typeof HOME_PROG[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Home Programs"
        icon={<Home className="h-5 w-5" />}
        title="Home Programs"
        desc="Home practice plans, caregiver instructions and compliance tracking."
        ctaLabel="New Home Program"
        kpis={[
          { l: 'Active Programs', v: HOME_PROG.filter(h => h.status === 'Active').length + 64, i: Activity, tone: 'green' },
          { l: 'Sent Programs', v: HOME_PROG.filter(h => h.status === 'Sent').length + 22, i: Send, tone: 'blue' },
          { l: 'Pending Programs', v: HOME_PROG.filter(h => h.status === 'Pending').length + 9, i: AlertCircle, tone: 'amber' },
          { l: 'Completed Programs', v: HOME_PROG.filter(h => h.status === 'Completed').length + 38, i: CheckCircle2, tone: 'green' },
          { l: 'Review Due', v: HOME_PROG.filter(h => h.status === 'Review Due').length + 5, i: CalendarDays, tone: 'amber' },
          { l: 'Total', v: HOME_PROG.length + 130, i: Home, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'ac', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'sn', label: 'Sent', filter: (r: any) => r.status === 'Sent' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'rv', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
        ]}
        rows={HOME_PROG}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.program}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'pr', header: 'Program', render: r => r.program },
          { key: 'f', header: 'Frequency', render: r => r.frequency },
          { key: 'c', header: 'Compliance', render: r => r.compliance },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Active' || r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r, notify) => (
          <>
            {openBtn(() => setSelected(r))}
            <Button size="sm" onClick={() => notify({ title: 'Home program sent successfully', message: `${r.patient} — caregiver notified`, nextStep: 'Schedule a compliance review in 2 weeks.' })}><Send className="h-3.5 w-3.5 mr-1" /> Send</Button>
          </>
        )}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Home Program" submitLabel="Create Program"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Program Type', type: 'select', options: ['Articulation drills', 'Naming book', 'Lidcombe daily ratings', 'PECS practice', 'Vocal hygiene log', 'Cognitive comms cues', 'Oral motor exercises'] },
            { k: 'exer', label: 'Exercises / Activities', type: 'textarea' },
            { k: 'inst', label: 'Caregiver Instructions', type: 'textarea' },
            { k: 'review', label: 'Review Date', type: 'date' },
          ]}
          successTitle="Home program created" nextStep="Send to caregiver and schedule review."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Home Program · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Program', value: selected.program },
            { label: 'Frequency', value: selected.frequency },
            { label: 'Compliance', value: selected.compliance },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => toast.success('Program printed')}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button onClick={() => { setSelected(null); toast.success('Home program sent successfully'); }}><Send className="h-4 w-4 mr-1" /> Send</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 14. TELETHERAPY
// ============================================================
export const Teletherapy = () => {
  const [selected, setSelected] = useState<typeof TELE[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Teletherapy"
        icon={<Video className="h-5 w-5" />}
        title="Teletherapy"
        desc="Virtual review sessions for follow-up, voice, fluency and parent coaching with link generation and notes."
        ctaLabel="Schedule Therapy"
        kpis={[
          { l: 'Scheduled', v: TELE.filter(t => t.status === 'Scheduled').length + 14, i: CalendarDays, tone: 'blue' },
          { l: 'Confirmed', v: TELE.filter(t => t.status === 'Confirmed').length + 22, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: TELE.filter(t => t.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: TELE.filter(t => t.status === 'Completed').length + 38, i: CheckCircle2, tone: 'green' },
          { l: 'Missed', v: TELE.filter(t => t.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
          { l: 'Total (MTD)', v: TELE.length + 76, i: Video, tone: 'purple' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'sc', label: 'Scheduled', filter: (r: any) => r.status === 'Scheduled' },
          { key: 'cf', label: 'Confirmed', filter: (r: any) => r.status === 'Confirmed' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'ms', label: 'Missed', filter: (r: any) => r.status === 'Missed' },
        ]}
        rows={TELE}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'd', header: 'Date', render: r => r.date },
          { key: 'th', header: 'Therapist', render: r => r.therapist },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' ? 'red' : r.status === 'Confirmed' || r.status === 'Completed' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" onClick={() => setSelected(r)}><Video className="h-3.5 w-3.5 mr-1" /> Join</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Schedule Teletherapy" submitLabel="Schedule"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Session Type', type: 'select', options: ['Follow-up review', 'Voice review', 'Lidcombe parent session', 'Aphasia review', 'Cognitive comms', 'Fluency review'] },
            { k: 'slt', label: 'Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
            { k: 'date', label: 'Date', type: 'date' },
            { k: 'time', label: 'Time', type: 'time' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Teletherapy scheduled" nextStep="Link sent to patient and therapist."
        />}
      />
      {selected && (
        <Dialog open onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Teletherapy · {selected.id}</DialogTitle>
              <DialogDescription>{selected.patient} · {selected.therapist}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="text-xs text-muted-foreground">Patient Summary</div>
                <div className="text-sm font-semibold mt-1">{selected.patient} — {selected.type}</div>
                <div className="text-xs text-muted-foreground mt-1">Scheduled: {selected.date}</div>
              </Card>
              <Card>
                <div className="text-xs text-muted-foreground mb-1">Session Link</div>
                <div className="bg-muted/40 rounded p-3 text-xs font-mono">https://tele.fnph-aro.local/{selected.id}</div>
              </Card>
              <div>
                <Label>Session Notes</Label>
                <Textarea rows={4} placeholder="Type session notes…" />
              </div>
            </div>
            <DialogFooter className="mt-4 flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success('Notes saved')}>Save Notes</Button>
              <Button variant="outline" onClick={() => toast.success('Session started')}><Video className="h-4 w-4 mr-1" /> Start Session</Button>
              <Button onClick={() => { setSelected(null); toast.success('Session ended'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> End Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// ============================================================
// 15. CHILD SPEECH THERAPY
// ============================================================
export const ChildSpeechTherapy = () => (
  <SpecialisedPage
    shellTitle="Child Speech Therapy" icon={<Baby className="h-5 w-5" />}
    title="Paediatric Speech Therapy"
    desc="Developmental delays, autism communication, school communication and school liaison."
    ctaLabel="New Paediatric Case"
    kpis={[
      { l: 'Active Cases', v: CHILD.filter(c => c.status === 'Active').length + 28, i: Activity, tone: 'blue' },
      { l: 'Developmental Delay', v: CHILD.filter(c => c.category === 'Developmental Delay').length + 12, i: TrendingUp, tone: 'amber' },
      { l: 'Autism Communication', v: CHILD.filter(c => c.category === 'Autism Communication').length + 18, i: Baby, tone: 'purple' },
      { l: 'School Communication', v: CHILD.filter(c => c.category === 'School Communication').length + 9, i: BookOpen, tone: 'green' },
      { l: 'Review Due', v: CHILD.filter(c => c.status === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: CHILD.length + 58, i: HeartHandshake, tone: 'teal' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: undefined },
      { key: 'dd', label: 'Developmental Delay', value: 'Developmental Delay' },
      { key: 'au', label: 'Autism Communication', value: 'Autism Communication' },
      { key: 'sc', label: 'School Communication', value: 'School Communication' },
      { key: 'rv', label: 'Review Due', value: undefined },
    ]}
    rows={CHILD}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Child', render: r => `${r.patient} · ${r.age}y` },
      { key: 'c', header: 'Category', render: r => r.category },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'sc', header: 'School', render: r => r.school },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Child', type: 'patientPicker' },
      { k: 'age', label: 'Age', type: 'number' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Developmental Delay', 'Autism Communication', 'School Communication'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'school', label: 'School Liaison', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Paediatric case created" nextStep="Schedule first session and notify caregiver."
  />
);

// ============================================================
// 16. ADULT SPEECH THERAPY
// ============================================================
export const AdultSpeechTherapy = () => (
  <SpecialisedPage
    shellTitle="Adult Speech Therapy" icon={<Stethoscope className="h-5 w-5" />}
    title="Adult Speech Therapy"
    desc="Voice, dysphagia, cognitive communication, aphasia and neurogenic speech disorders for adults."
    ctaLabel="New Adult Case"
    kpis={[
      { l: 'Active Cases', v: ADULT.filter(a => a.status === 'Active').length + 42, i: Activity, tone: 'blue' },
      { l: 'Voice Cases', v: ADULT.filter(a => a.category === 'Voice').length + 14, i: Volume2, tone: 'amber' },
      { l: 'Dysphagia Cases', v: ADULT.filter(a => a.category === 'Dysphagia').length + 12, i: Apple, tone: 'rose' },
      { l: 'Cognitive Communication', v: ADULT.filter(a => a.category === 'Cognitive Communication').length + 16, i: Brain, tone: 'purple' },
      { l: 'Review Due', v: ADULT.filter(a => a.status === 'Review Due').length + 4, i: CalendarDays, tone: 'amber' },
      { l: 'Total', v: ADULT.length + 68, i: Stethoscope, tone: 'teal' },
    ]}
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: undefined },
      { key: 'vo', label: 'Voice', value: 'Voice' },
      { key: 'dy', label: 'Dysphagia', value: 'Dysphagia' },
      { key: 'cc', label: 'Cognitive Communication', value: 'Cognitive Communication' },
      { key: 'rv', label: 'Review Due', value: undefined },
    ]}
    rows={ADULT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'c', header: 'Category', render: r => r.category },
      { key: 'dx', header: 'Diagnosis', render: r => r.dx },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'cat', label: 'Category', type: 'select', options: ['Voice', 'Dysphagia', 'Cognitive Communication', 'Aphasia', 'Dysarthria'] },
      { k: 'dx', label: 'Diagnosis', type: 'text' },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Adult case created" nextStep="Schedule first assessment session."
  />
);

// ============================================================
// 17. INPATIENT
// ============================================================
export const InpatientSpeech = () => (
  <SpecialisedPage
    shellTitle="Inpatient Therapy" icon={<BedDouble className="h-5 w-5" />}
    title="Inpatient Speech Therapy"
    desc="Bedside swallow, communication and dysphagia management for inpatients."
    ctaLabel="New Bedside Review"
    kpis={[
      { l: 'Bedside Reviews Today', v: INPATIENT.filter(i => i.status === 'Today').length + 4, i: CalendarDays, tone: 'teal' },
      { l: 'Pending Reviews', v: INPATIENT.filter(i => i.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Reviews', v: INPATIENT.filter(i => i.status === 'Completed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'High Risk Dysphagia', v: INPATIENT.filter(i => i.risk === 'High Risk').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'Discharge Readiness', v: INPATIENT.filter(i => i.status === 'Discharge Readiness').length + 3, i: Home, tone: 'purple' },
      { l: 'Total', v: INPATIENT.length + 36, i: BedDouble, tone: 'blue' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'hr', label: 'High Risk', value: undefined },
      { key: 'dr', label: 'Discharge Readiness', value: 'Discharge Readiness' },
    ]}
    rows={INPATIENT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.ward}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'w', header: 'Ward', render: r => r.ward },
      { key: 'b', header: 'Bed', render: r => r.bed },
      { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
      { key: 'd', header: 'Review', render: r => r.dailyReview },
      { key: 's', header: 'Status', render: r => r.status },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'ward', label: 'Ward', type: 'select', options: ['Neuro Ward', 'HDE', 'Paeds Ward', 'Geriatric Ward', 'Addiction Ward', 'Psychogeriatric Ward'] },
      { k: 'bed', label: 'Bed', type: 'text' },
      { k: 'rev', label: 'Bedside Review', type: 'textarea' },
      { k: 'risk', label: 'Risk', type: 'select', options: ['Low', 'Moderate', 'High Risk'] },
    ]}
    successTitle="Bedside review created" nextStep="Document swallow trial outcomes."
  />
);

// ============================================================
// 18. OUTPATIENT
// ============================================================
export const OutpatientSpeech = () => (
  <SpecialisedPage
    shellTitle="Outpatient Therapy" icon={<Home className="h-5 w-5" />}
    title="Outpatient Speech Therapy"
    desc="Scheduled outpatient visits, reassessments and therapy sessions."
    ctaLabel="Schedule Visit"
    kpis={[
      { l: 'Scheduled Visits', v: OUTPATIENT.length + 24, i: CalendarDays, tone: 'blue' },
      { l: 'Confirmed Visits', v: OUTPATIENT.filter(o => o.status === 'Confirmed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Visits', v: OUTPATIENT.filter(o => o.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Visits', v: OUTPATIENT.filter(o => o.status === 'Rescheduled').length + 5, i: Repeat, tone: 'purple' },
      { l: 'Completed Visits', v: OUTPATIENT.filter(o => o.status === 'Completed').length + 38, i: CheckCircle2, tone: 'green' },
      { l: 'Missed Visits', v: OUTPATIENT.filter(o => o.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
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
    searchFields={(r) => `${r.patient} ${r.id} ${r.visitType}`}
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
      { k: 'vt', label: 'Visit Type', type: 'select', options: ['Paediatric session', 'Voice rehab', 'Fluency review', 'LSVT LOUD', 'Cluttering review', 'Cognitive comms', 'Reassessment'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'slt', label: 'Therapist', type: 'select', options: ['SLT. Mojisola', 'SLT. Funmi', 'SLT. Tope'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Visit scheduled" nextStep="Confirmation sent to patient and therapist."
  />
);

// ============================================================
// 19. SMART PRODUCTIVITY
// ============================================================
export const SmartTaskQueue = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  return (
    <Shell title="Smart Productivity">
      <Section icon={<ListChecks className="h-5 w-5" />} title="Smart Productivity & Task Queue"
        desc="Pending documentation, draft sessions, missed reviews, sync queue and tasks due today." />
      <KpiGrid items={[
        { l: 'Pending Documentation', v: SMART.filter(s => s.kind === 'Pending Documentation').length + 6, i: FileText, tone: 'amber' },
        { l: 'Draft Sessions', v: SMART.filter(s => s.kind === 'Draft Sessions').length + 4, i: ScrollText, tone: 'blue' },
        { l: 'Missed Reviews', v: SMART.filter(s => s.kind === 'Missed Sessions').length + 3, i: AlertTriangle, tone: 'rose' },
        { l: 'Pending Sync', v: SMART.filter(s => s.kind === 'Pending Sync').length + 5, i: WifiOff, tone: 'amber' },
        { l: 'Tasks Due Today', v: SMART.filter(s => s.due === 'Today').length + 7, i: CalendarDays, tone: 'teal' },
        { l: 'Follow-Up Due', v: SMART.filter(s => s.kind === 'Follow-Up Due').length + 8, i: Repeat, tone: 'purple' },
      ]} />
      <Card>
        <div className="text-sm font-semibold mb-3">Task Queue</div>
        <div className="space-y-2">
          {SMART.map(s => (
            <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
              <div>
                <div className="text-sm font-semibold">{s.kind}</div>
                <div className="text-xs text-muted-foreground">{s.item} · due {s.due}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => notify({ title: 'Task dismissed', message: s.item })}>Dismiss</Button>
                <Button size="sm" onClick={() => { nav(`${base}/sessions`); notify({ title: 'Resumed', message: s.item, nextStep: 'Continue where you left off.' }); }}><Activity className="h-3.5 w-3.5 mr-1" /> Resume</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {node}
    </Shell>
  );
};

// ============================================================
// 20. OFFLINE & SYNC
// ============================================================
export const OfflineSync = () => {
  const { notify, node } = useSuccess();
  const rows = [
    { id: 'SY-001', kind: 'Assessment draft', item: 'Articulation — Master Bakare', state: 'Auto-saved (offline)' },
    { id: 'SY-002', kind: 'Session note', item: 'Bedside swallow — Mr. Eze', state: 'Pending sync' },
    { id: 'SY-003', kind: 'Home program', item: 'Lidcombe log — Ajayi', state: 'Synced' },
    { id: 'SY-004', kind: 'Photo evidence', item: 'AAC trial — Halima', state: 'Pending sync' },
  ];
  return (
    <Shell title="Offline & Sync">
      <Section icon={<WifiOff className="h-5 w-5" />} title="Offline & Sync"
        desc="Offline auto-save, queued sync and recovery for bedside and home visit workflows."
        action={<Button onClick={() => notify({ title: 'Sync started', message: 'Queued items syncing now.' })}><Repeat className="h-4 w-4 mr-1" /> Sync All</Button>}
      />
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
// 21. FOLLOW-UP DASHBOARD
// ============================================================
export const SpeechFollowUp = () => (
  <SpecialisedPage
    shellTitle="Follow-Up Dashboard" icon={<Repeat className="h-5 w-5" />}
    title="Speech Therapy Follow-Up Dashboard"
    desc="Upcoming reviews, missed reviews, compliance and goal achievement tracking."
    ctaLabel="Schedule Follow-Up"
    kpis={[
      { l: 'Follow-Ups Today', v: FOLLOWUPS.filter(f => f.status === 'Today').length + 4, i: CalendarDays, tone: 'teal' },
      { l: 'Confirmed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 28, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 6, i: Repeat, tone: 'purple' },
      { l: 'Missed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Completed', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 72, i: CheckCircle2, tone: 'blue' },
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
      { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Autism review', 'Aphasia + swallow review', 'Fluency review', 'Dysphagia review', 'Voice review', 'Cognitive comms review'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Patient and therapist notified."
  />
);

// ============================================================
// 22. EMR TIMELINE
// ============================================================
export const SpeechTimeline = () => {
  const TIMELINE = [
    { when: '2026-06-03 10:30', what: 'Bedside swallow — Mr. Chidi Eze', who: 'SLT. Funmi' },
    { when: '2026-06-03 09:30', what: 'PECS therapy — Master Bakare', who: 'SLT. Mojisola' },
    { when: '2026-06-02 14:00', what: 'Voice assessment — Mrs. Akande', who: 'SLT. Tope' },
    { when: '2026-05-30 11:00', what: 'Lidcombe parent session — Ajayi', who: 'SLT. Mojisola' },
    { when: '2026-05-29 09:00', what: 'Cognitive comms — Pa Odunsi', who: 'SLT. Tope' },
  ];
  return (
    <Shell title="EMR Timeline">
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Speech Therapy EMR Timeline"
        desc="Chronological log of assessments, sessions, dysphagia reviews and family trainings." />
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
// 23. BILLING & NHIA
// ============================================================
export const SpeechBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Speech Therapy Billing & NHIA Integration"
        desc="Assessment, therapy session, dysphagia review, teletherapy and home program billing with NHIA claims."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 168, i: CreditCard, tone: 'blue' },
          { l: 'Paid Invoices', v: INVOICES.filter(i => i.status === 'Paid').length + 114, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Invoices', v: INVOICES.filter(i => i.status === 'Pending').length + 16, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA Invoices', v: INVOICES.filter(i => i.status === 'NHIA' || i.nhia === 'Approved').length + 38, i: AlertTriangle, tone: 'purple' },
          { l: 'Outstanding Invoices', v: INVOICES.filter(i => i.status === 'Outstanding').length + 10, i: AlertTriangle, tone: 'rose' },
          { l: 'Therapy Bills', v: 88, i: Activity, tone: 'teal' },
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
// 24. RESEARCH
// ============================================================
export const SpeechResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Speech Therapy Analytics"
      desc="Caseload, outcome trends, dysphagia statistics, autism communication and attendance KPIs." />
    <KpiGrid items={[
      { l: 'Active caseload', v: 174, i: Users, tone: 'amber' },
      { l: 'Dysphagia cases', v: 38, i: Apple, tone: 'rose' },
      { l: 'Autism comm cases', v: 46, i: Baby, tone: 'amber' },
      { l: 'Aphasia / neurogenic', v: 29, i: Brain, tone: 'amber' },
      { l: 'Paediatric speech', v: 58, i: Baby, tone: 'blue' },
      { l: 'Attendance', v: '86%', i: TrendingUp, tone: 'green' },
    ]} />
    <Card>
      <div className="text-sm font-semibold mb-2">Research Indicators</div>
      <div className="text-sm text-muted-foreground">Linked dimensions: diagnosis, programme, age group, ward, NHIA status, referral source. Filters: date range, therapist, condition.</div>
    </Card>
  </Shell>
);

// ============================================================
// 25. REPORTING CENTER
// ============================================================
export const SpeechReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '30d', notes: '' });
  const TYPES = ['Speech Assessment Report', 'Language Disorder Report', 'Dysphagia Report', 'Therapy Session Report', 'Home Program Report', 'Teletherapy Report', 'Billing Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Speech Therapy Reporting Center"
        desc="Generate assessment, dysphagia, therapy, home program, teletherapy and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 118, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 7, i: AlertCircle, tone: 'amber' },
        { l: 'Assessment Reports', v: 34, i: ClipboardList, tone: 'purple' },
        { l: 'Therapy Reports', v: 42, i: Activity, tone: 'teal' },
        { l: 'Dysphagia Reports', v: 18, i: Apple, tone: 'rose' },
        { l: 'Billing Reports', v: 16, i: CreditCard, tone: 'green' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Speech Therapy · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Patients</div><div className="font-semibold text-lg">174</div></div>
                  <div><div className="text-xs text-muted-foreground">Sessions (MTD)</div><div className="font-semibold text-lg">208</div></div>
                  <div><div className="text-xs text-muted-foreground">Dysphagia Reviews</div><div className="font-semibold text-lg">38</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(2840000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Autism communication caseload up 14%</li>
                  <li>Dysphagia review adherence at 88%</li>
                  <li>Teletherapy follow-up attendance at 92%</li>
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
// 26. COMMUNICATION CENTER
// ============================================================
export const SpeechComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'nur', l: 'Nursing' }, { k: 'ot', l: 'OT' },
    { k: 'pt', l: 'Physio' }, { k: 'psy', l: 'Psychology' }, { k: 'sw', l: 'Social Work' },
    { k: 'cap', l: 'Child Psychiatry' }, { k: 'pg', l: 'Psychogeriatrics' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', nur: 'nursing', ot: 'occupational', pt: 'physio', psy: 'psychology', sw: 'social', cap: 'child', pg: 'psychogeriatrics' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Speech Therapy Communication Center"
        desc="Secure messaging with Doctor, Nursing, OT, Physiotherapy, Psychology, Social Work, Child Psychiatry and Psychogeriatrics — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Active Staff', v: 24, i: Users, tone: 'green' },
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
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest assessment report.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'speech-assessment.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 27. CRITICAL ALERTS
// ============================================================
export const SpeechAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'dy', l: 'Dysphagia Risk', f: (a: any) => a.status === 'Dysphagia Risk' },
    { k: 'ms', l: 'Missed Sessions', f: (a: any) => a.status === 'Missed Sessions' },
    { k: 'cd', l: 'Communication Decline', f: (a: any) => a.status === 'Communication Decline' },
    { k: 'pf', l: 'Pending Follow-Up', f: (a: any) => a.status === 'Pending Follow-Up' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Speech Therapy Alerts"
        desc="High dysphagia risk, missed sessions, communication decline, pending follow-up and safeguarding flags." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length, i: AlertTriangle, tone: 'red' },
        { l: 'High Dysphagia Risk', v: ALERTS.filter(a => a.status === 'Dysphagia Risk').length + 4, i: Apple, tone: 'rose' },
        { l: 'Missed Sessions', v: ALERTS.filter(a => a.status === 'Missed Sessions').length + 3, i: AlertCircle, tone: 'amber' },
        { l: 'Communication Decline', v: ALERTS.filter(a => a.status === 'Communication Decline').length + 2, i: TrendingUp, tone: 'orange' },
        { l: 'Pending Follow-Up', v: ALERTS.filter(a => a.status === 'Pending Follow-Up').length + 4, i: Repeat, tone: 'purple' },
        { l: 'Acknowledged Alerts', v: ALERTS.filter(a => a.status === 'Acknowledged').length + 10, i: CheckCircle2, tone: 'green' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Dysphagia Risk' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to on-call therapist.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
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
// 28. MOBILE
// ============================================================
export const SpeechMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Experience"
      desc="Optimised layouts for bedside dysphagia review, autism comms quick-capture, home visits and AAC demos." />
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
// 29. CONFIG
// ============================================================
export const SpeechConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Speech Therapy Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Speech Therapy Configuration"
        desc="Manage assessment templates, programmes, exercise libraries, IDDSI diet templates, billing templates and NHIA mappings." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Assessment Templates', 'Programmes', 'Exercise Library', 'IDDSI Diet Templates',
          'AAC Library', 'Outcome Measures', 'Therapy Protocols', 'Therapist Roster',
          'Billing Templates', 'NHIA Mapping', 'Research Indicators', 'Notification Rules',
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
