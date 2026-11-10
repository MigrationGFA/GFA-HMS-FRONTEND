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
  LayoutDashboard, ClipboardList, FilePlus, Users, HeartHandshake, Activity,
  BarChart3, CreditCard, MessageSquare, Smartphone, Settings2, AlertTriangle,
  AlertCircle, FileText, Repeat, Home, UsersRound, BedDouble, Stethoscope, Brain,
  Send, Baby, Apple, ChefHat, Ruler, Droplets, Utensils, Salad, ShieldAlert,
  Calendar, WifiOff, CheckCircle2, Search, Printer, Download, Eye, Bell, Plus,
  Paperclip, TrendingUp, ScrollText, BookOpen, ListChecks,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/nutrition';

export const nutritionNav = [
  { label: 'Nutrition Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Referral Center', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Nutrition Assessment', path: `${base}/assessments`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Anthropometric', path: `${base}/anthropometric`, icon: <Ruler className="h-4 w-4" /> },
  { label: 'Malnutrition Screening', path: `${base}/malnutrition`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Diet Plan Management', path: `${base}/diet-plans`, icon: <Salad className="h-4 w-4" /> },
  { label: 'Therapeutic Diet', path: `${base}/therapeutic`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Inpatient Feeding', path: `${base}/inpatient`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Enteral & Tube Feeding', path: `${base}/enteral`, icon: <Droplets className="h-4 w-4" /> },
  { label: 'Catering & Kitchen', path: `${base}/catering`, icon: <ChefHat className="h-4 w-4" /> },
  { label: 'Allergy & Restrictions', path: `${base}/allergy`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Nutrition Counselling', path: `${base}/counselling`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Child Nutrition', path: `${base}/child`, icon: <Baby className="h-4 w-4" /> },
  { label: 'Addiction Recovery', path: `${base}/addiction`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Psychogeriatric Nutrition', path: `${base}/psychogeriatric`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Community Follow-Up', path: `${base}/community`, icon: <Home className="h-4 w-4" /> },
  { label: 'Outpatient Nutrition', path: `${base}/outpatient`, icon: <Utensils className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'EMR Timeline', path: `${base}/timeline`, icon: <Calendar className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Nutrition Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Offline & Sync', path: `${base}/offline`, icon: <WifiOff className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Nutrition Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={nutritionNav} title={`Nutrition & Dietetics · ${title}`}>{children}</DashboardLayout>
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
// Dummy data — GFA HMS Nutrition & Dietetics
// ============================================================
const PATIENTS = [
  { id: 'NUT-2026-001', name: 'Mr. Chidi Eze', age: 62, dx: 'Stroke + dysphagia' },
  { id: 'NUT-2026-002', name: 'Master Tunde Bakare', age: 7, dx: 'Autism — selective eating' },
  { id: 'NUT-2026-003', name: 'Pa Adebayo Odunsi', age: 78, dx: 'Dementia — weight loss' },
  { id: 'NUT-2026-004', name: 'Mrs. Funke Adeyemi', age: 39, dx: 'Drug-induced obesity' },
  { id: 'NUT-2026-005', name: 'Mr. Yusuf Aliyu', age: 34, dx: 'Detox malnutrition' },
  { id: 'NUT-2026-006', name: 'Miss Adaeze Nnamdi', age: 5, dx: 'CP — SAM' },
  { id: 'NUT-2026-007', name: 'Mrs. Bisi Akande', age: 51, dx: 'Hypertensive' },
  { id: 'NUT-2026-008', name: 'Pa Tunde Akinola', age: 84, dx: 'Late dementia — NG fed' },
  { id: 'NUT-2026-009', name: 'Mr. Ibrahim Musa', age: 58, dx: 'Diabetic' },
  { id: 'NUT-2026-010', name: 'Master Bolu Ajayi', age: 9, dx: 'ADHD' },
];

const REFERRALS = [
  { id: 'NTR-001', patient: 'Mr. Chidi Eze', from: 'Doctor — Dr. Okafor', reason: 'Post-stroke dysphagia diet + malnutrition', priority: 'High', status: 'Accepted', assigned: 'Diet. Bunmi' },
  { id: 'NTR-002', patient: 'Master Tunde Bakare', from: 'CAP — Dr. Aluko', reason: 'Autism — feeding selectivity', priority: 'Medium', status: 'Accepted', assigned: 'Diet. Adaeze' },
  { id: 'NTR-003', patient: 'Pa Adebayo Odunsi', from: 'Psychogeriatrics — Dr. Sowemimo', reason: 'Dementia — weight loss', priority: 'High', status: 'Accepted', assigned: 'Diet. Bunmi' },
  { id: 'NTR-004', patient: 'Mrs. Funke Adeyemi', from: 'Psychiatry — Dr. Balogun', reason: 'Olanzapine weight gain — counselling', priority: 'Low', status: 'Pending', assigned: '—' },
  { id: 'NTR-005', patient: 'Mr. Yusuf Aliyu', from: 'Addiction — Dr. Adesina', reason: 'Detox nutrition rehab', priority: 'High', status: 'Accepted', assigned: 'Diet. Tope' },
  { id: 'NTR-006', patient: 'Miss Adaeze Nnamdi', from: 'Nursing — Ward C', reason: 'Paediatric malnutrition (CP)', priority: 'High', status: 'Accepted', assigned: 'Diet. Adaeze' },
  { id: 'NTR-007', patient: 'Mrs. Bisi Akande', from: 'Doctor — Dr. Adesoye', reason: 'Hypertension — DASH plan', priority: 'Medium', status: 'Completed', assigned: 'Diet. Bunmi' },
  { id: 'NTR-008', patient: 'Mr. Ibrahim Musa', from: 'GMPC', reason: 'Diabetic carb counting', priority: 'Medium', status: 'Pending', assigned: '—' },
];

const REFER_DEPTS = ['Doctor', 'Nursing', 'Psychiatry', 'CAP', 'Psychogeriatrics', 'Addiction', 'Pharmacy', 'Social Work', 'GMPC'];
const DIETITIANS = ['Diet. Bunmi', 'Diet. Adaeze', 'Diet. Tope', 'Diet. Femi'];

const ASSESSMENTS = [
  { id: 'AS-N-001', patient: 'Mr. Chidi Eze', type: 'Full Nutrition Assessment', clinician: 'Diet. Bunmi', status: 'In Progress', risk: 'High Risk' },
  { id: 'AS-N-002', patient: 'Master Tunde Bakare', type: 'Dietary History', clinician: 'Diet. Adaeze', status: 'Pending', risk: 'Moderate' },
  { id: 'AS-N-003', patient: 'Mrs. Funke Adeyemi', type: 'BMI Assessment', clinician: 'Diet. Bunmi', status: 'Completed', risk: 'Moderate' },
  { id: 'AS-N-004', patient: 'Mr. Yusuf Aliyu', type: 'Nutrition Screening', clinician: 'Diet. Tope', status: 'In Progress', risk: 'High Risk' },
  { id: 'AS-N-005', patient: 'Mrs. Bisi Akande', type: 'Special Diet Assessment', clinician: 'Diet. Bunmi', status: 'Review Due', risk: 'Low' },
  { id: 'AS-N-006', patient: 'Miss Adaeze Nnamdi', type: 'Anthropometric Assessment', clinician: 'Diet. Adaeze', status: 'Completed', risk: 'High Risk' },
  { id: 'AS-N-007', patient: 'Mr. Ibrahim Musa', type: 'Food Allergy Assessment', clinician: 'Diet. Femi', status: 'Pending', risk: 'Low' },
];
const ASSESSMENT_TYPES = ['Nutrition Screening', 'Anthropometric Assessment', 'Dietary History', 'BMI Assessment', 'Food Allergy Assessment', 'Special Diet Assessment'];

const ANTHRO = [
  { id: 'AN-001', patient: 'Mr. Chidi Eze', wt: '58 kg', ht: '170 cm', bmi: '20.1', muac: '22 cm', trend: 'Declining', status: 'Active' },
  { id: 'AN-002', patient: 'Pa Adebayo Odunsi', wt: '54 kg', ht: '168 cm', bmi: '19.1', muac: '21 cm', trend: 'Loss 3kg/3mo', status: 'Active' },
  { id: 'AN-003', patient: 'Mrs. Funke Adeyemi', wt: '92 kg', ht: '162 cm', bmi: '35.1', muac: '34 cm', trend: 'Gain 8kg/6mo', status: 'Active' },
  { id: 'AN-004', patient: 'Miss Adaeze Nnamdi', wt: '14 kg', ht: '112 cm', bmi: '11.2', muac: '12 cm', trend: '<3rd centile', status: 'Active' },
  { id: 'AN-005', patient: 'Master Tunde Bakare', wt: '22 kg', ht: '124 cm', bmi: '14.3', muac: '15 cm', trend: 'Below 25th', status: 'Active' },
];

const MALNUTRITION = [
  { id: 'MN-001', patient: 'Miss Adaeze Nnamdi', tool: 'WHO z-score', score: '-3.4 SD', risk: 'Severe', rec: 'RUTF + admission' },
  { id: 'MN-002', patient: 'Pa Adebayo Odunsi', tool: 'MNA-SF', score: '6/14', risk: 'High', rec: 'Fortified diet + monitor' },
  { id: 'MN-003', patient: 'Mr. Chidi Eze', tool: 'MUST', score: '2', risk: 'High', rec: 'Dietitian review + feed plan' },
  { id: 'MN-004', patient: 'Master Tunde Bakare', tool: 'WHO z-score', score: '-1.6 SD', risk: 'Moderate', rec: 'Diet expansion + monitor' },
  { id: 'MN-005', patient: 'Mr. Yusuf Aliyu', tool: 'SGA', score: 'B', risk: 'Moderate', rec: 'Recovery nutrition' },
  { id: 'MN-006', patient: 'Mrs. Bisi Akande', tool: 'MUST', score: '0', risk: 'Low', rec: 'Routine review' },
  { id: 'MN-007', patient: 'Master Bolu Ajayi', tool: 'WHO z-score', score: '-0.4 SD', risk: 'Low', rec: 'Maintain diet' },
  { id: 'MN-008', patient: 'Pa Tunde Akinola', tool: 'MNA-SF', score: '4/14', risk: 'Severe', rec: 'NG enteral feed' },
];

const DIET_PLANS = [
  { id: 'DP-001', patient: 'Mrs. Funke Adeyemi', diet: 'Weight management', kcal: '1500 kcal', status: 'Active', special: 'No' },
  { id: 'DP-002', patient: 'Mrs. Bisi Akande', diet: 'DASH — low salt', kcal: '1900 kcal', status: 'Active', special: 'No' },
  { id: 'DP-003', patient: 'Mr. Ibrahim Musa', diet: 'Diabetic — carb count', kcal: '1800 kcal', status: 'Active', special: 'Special' },
  { id: 'DP-004', patient: 'Mr. Yusuf Aliyu', diet: 'Addiction recovery', kcal: '2400 kcal', status: 'Pending', special: 'Special' },
  { id: 'DP-005', patient: 'Master Tunde Bakare', diet: 'Paediatric expansion', kcal: '1600 kcal', status: 'Active', special: 'No' },
  { id: 'DP-006', patient: 'Pa Adebayo Odunsi', diet: 'Geriatric energy-dense', kcal: '2200 kcal', status: 'Review Due', special: 'No' },
  { id: 'DP-007', patient: 'Mr. Chidi Eze', diet: 'Dysphagia IDDSI L4', kcal: '2100 kcal', status: 'Active', special: 'Special' },
  { id: 'DP-008', patient: 'Miss Adaeze Nnamdi', diet: 'RUTF therapeutic feed', kcal: '1800 kcal', status: 'Completed', special: 'Special' },
];
const DIET_TYPES = ['Regular', 'Weight management', 'DASH — low salt', 'Diabetic — carb count', 'Recovery diet', 'Paediatric expansion', 'Geriatric energy-dense', 'Dysphagia IDDSI L4', 'Therapeutic RUTF'];

const THERAPEUTIC = [
  { id: 'TD-001', code: 'High Protein', use: 'Recovery / wound / cachexia', macros: 'Protein 1.5 g/kg', category: 'High Protein', status: 'Active' },
  { id: 'TD-002', code: 'Low Sodium (DASH)', use: 'Hypertension / cardiac', macros: '<1.5 g Na', category: 'Low Salt', status: 'Active' },
  { id: 'TD-003', code: 'Renal Diet', use: 'CKD / dialysis', macros: 'K/PO4/Na controlled', category: 'Renal', status: 'Active' },
  { id: 'TD-004', code: 'Diabetic Diet', use: 'DM I/II + drug-induced', macros: 'Carb count + low GI', category: 'Diabetic', status: 'Active' },
  { id: 'TD-005', code: 'Psychiatric Wellness', use: 'Mood / cognition support', macros: 'Omega-3 + B-complex', category: 'Psychiatric', status: 'Active' },
  { id: 'TD-006', code: 'Cardiac Low Salt', use: 'Post-MI / CHF', macros: 'Low Na + low sat fat', category: 'Low Salt', status: 'Active' },
  { id: 'TD-007', code: 'High Protein Geriatric', use: 'Frailty / sarcopenia', macros: 'Protein 1.2-1.5 g/kg', category: 'High Protein', status: 'Active' },
];

const INPATIENT = [
  { id: 'IP-N-001', patient: 'Mr. Chidi Eze', ward: 'Neuro Ward', bed: 'NW-04', diet: 'IDDSI L4 + high protein', meal: 'Lunch', status: 'Served' },
  { id: 'IP-N-002', patient: 'Pa Tunde Akinola', ward: 'HDE', bed: 'HDE-01', diet: 'NG enteral 1.5 kcal/ml', meal: 'Continuous', status: 'Pending' },
  { id: 'IP-N-003', patient: 'Miss Adaeze Nnamdi', ward: 'Paeds', bed: 'PED-02', diet: 'RUTF + therapeutic feed', meal: 'Breakfast', status: 'Served' },
  { id: 'IP-N-004', patient: 'Mrs. Bisi Akande', ward: 'Ward A', bed: 'WA-12', diet: 'DASH low salt', meal: 'Lunch', status: 'Served' },
  { id: 'IP-N-005', patient: 'Mr. Yusuf Aliyu', ward: 'Rehab', bed: 'RH-05', diet: 'Recovery nutrition', meal: 'Dinner', status: 'Pending' },
  { id: 'IP-N-006', patient: 'Mrs. Funke Adeyemi', ward: 'Ward B', bed: 'WB-03', diet: 'Weight management', meal: 'Lunch', status: 'Special Diet' },
  { id: 'IP-N-007', patient: 'Mr. Ibrahim Musa', ward: 'Ward A', bed: 'WA-09', diet: 'Diabetic', meal: 'Dinner', status: 'Missed' },
  { id: 'IP-N-008', patient: 'Pa Adebayo Odunsi', ward: 'Psychogeri', bed: 'PG-02', diet: 'Energy-dense', meal: 'Breakfast', status: 'Review Due' },
];

const ENTERAL = [
  { id: 'EN-001', patient: 'Pa Tunde Akinola', route: 'NG tube', feed: 'Standard 1.5 kcal/ml', rate: '60 ml/hr × 20 hr', kcal: '1800 kcal/d', status: 'Tube Feeding' },
  { id: 'EN-002', patient: 'Mr. Chidi Eze', route: 'Oral + supplements', feed: 'Fortified + sip feeds', rate: '3 × 200 ml', kcal: '600 kcal supp', status: 'Active' },
  { id: 'EN-003', patient: 'Miss Adaeze Nnamdi', route: 'Oral RUTF', feed: 'F-100 + RUTF sachets', rate: '4 sachets/day', kcal: '2000 kcal/d', status: 'Active' },
  { id: 'EN-004', patient: 'Mrs. Tinuke Adekunle', route: 'PEG', feed: 'High protein 1.5 kcal/ml', rate: '50 ml/hr × 18 hr', kcal: '1350 kcal/d', status: 'Intolerance' },
  { id: 'EN-005', patient: 'Pa Sola Adeola', route: 'NG tube', feed: 'Standard 1.0 kcal/ml', rate: '40 ml/hr × 20 hr', kcal: '800 kcal/d', status: 'Review Due' },
  { id: 'EN-006', patient: 'Mr. Femi Ojo', route: 'Oral supp', feed: 'Sip feeds', rate: '2 × 200 ml', kcal: '400 kcal supp', status: 'Completed' },
];

const CATERING = [
  { id: 'CK-001', menu: 'Monday — Lunch', regular: 124, soft: 18, diabetic: 22, lowSalt: 14, dysphagia: 9, status: 'Served' },
  { id: 'CK-002', menu: 'Monday — Dinner', regular: 124, soft: 18, diabetic: 22, lowSalt: 14, dysphagia: 9, status: 'In Preparation' },
  { id: 'CK-003', menu: 'Tuesday — Breakfast', regular: 130, soft: 16, diabetic: 22, lowSalt: 14, dysphagia: 10, status: 'Planned' },
  { id: 'CK-004', menu: 'Tuesday — Lunch', regular: 128, soft: 18, diabetic: 24, lowSalt: 16, dysphagia: 9, status: 'Pending' },
  { id: 'CK-005', menu: 'Special Eid menu', regular: 80, soft: 12, diabetic: 18, lowSalt: 10, dysphagia: 6, status: 'Special Requests' },
];

const ALLERGY = [
  { id: 'AL-001', patient: 'Mrs. Funke Adeyemi', allergen: 'Peanut', severity: 'Severe', reaction: 'Anaphylaxis', alert: 'Avoid all peanut & ground-nut' },
  { id: 'AL-002', patient: 'Master Bolu Ajayi', allergen: 'Milk', severity: 'Moderate', reaction: 'GI symptoms', alert: 'Lactose-free' },
  { id: 'AL-003', patient: 'Mr. Ibrahim Musa', allergen: 'Pork (religious)', severity: 'Restrictions', reaction: 'N/A', alert: 'Halal diet only' },
  { id: 'AL-004', patient: 'Mrs. Bisi Akande', allergen: 'Sodium > 1.5g', severity: 'Restrictions', reaction: 'BP spike', alert: 'Low sodium' },
  { id: 'AL-005', patient: 'Mr. Chidi Eze', allergen: 'Thin fluids', severity: 'Critical', reaction: 'Aspiration', alert: 'IDDSI Level 2 fluids only' },
  { id: 'AL-006', patient: 'Mrs. Adebola Lawal', allergen: 'Shellfish', severity: 'Mild', reaction: 'Skin rash', alert: 'Avoid shellfish' },
];

const COUNSELLING = [
  { id: 'CN-001', patient: 'Mrs. Funke Adeyemi', kind: 'Weight management', date: '2026-06-03', status: 'Today', outcome: '-3 kg' },
  { id: 'CN-002', patient: 'Family — Bakare', kind: 'Child autism nutrition', date: '2026-06-03', status: 'Completed', outcome: 'Food expansion +4 items' },
  { id: 'CN-003', patient: 'Mr. Yusuf Aliyu', kind: 'Addiction recovery diet', date: '2026-06-04', status: 'Pending', outcome: 'Wt regained 2 kg' },
  { id: 'CN-004', patient: 'Family — Odunsi', kind: 'Elderly feeding support', date: '2026-06-05', status: 'Pending', outcome: 'Intake +20%' },
  { id: 'CN-005', patient: 'Mrs. Bisi Akande', kind: 'Hypertension diet', date: '2026-05-30', status: 'Completed', outcome: 'BP improved' },
  { id: 'CN-006', patient: 'Mr. Ibrahim Musa', kind: 'Diabetic carb counting', date: '2026-05-28', status: 'Missed', outcome: 'Reschedule' },
  { id: 'CN-007', patient: 'Mrs. Tinuke Adekunle', kind: 'Follow-up review', date: '2026-06-06', status: 'Follow-Up Required', outcome: 'Pending' },
];

const CHILD = [
  { id: 'CN-N-001', patient: 'Miss Adaeze Nnamdi', age: 5, dx: 'CP — SAM', plan: 'RUTF + therapeutic feed', growth: '<3rd centile', status: 'Underweight' },
  { id: 'CN-N-002', patient: 'Master Tunde Bakare', age: 7, dx: 'Autism — selectivity', plan: 'Food chaining', growth: '25th centile', status: 'Special Diet' },
  { id: 'CN-N-003', patient: 'Master Bolu Ajayi', age: 9, dx: 'ADHD — appetite suppression', plan: 'Calorie-dense breakfast', growth: '40th centile', status: 'Active' },
  { id: 'CN-N-004', patient: 'Miss Halima Yusuf', age: 5, dx: 'Mild underweight', plan: 'School feeding guidance', growth: '15th centile', status: 'Underweight' },
  { id: 'CN-N-005', patient: 'Master Femi Okeke', age: 8, dx: 'Growth monitoring', plan: 'Routine plan', growth: '60th centile', status: 'Growth Monitoring' },
  { id: 'CN-N-006', patient: 'Miss Ngozi Eze', age: 6, dx: 'Post-RUTF maintenance', plan: 'High-protein meals', growth: '20th centile', status: 'Review Due' },
];

const ADDICTION = [
  { id: 'AD-N-001', patient: 'Mr. Yusuf Aliyu', stage: 'Detox', focus: 'Refeeding + thiamine + folate', status: 'Detox Nutrition' },
  { id: 'AD-N-002', patient: 'Mr. Sola Adebayo', stage: 'Rehab', focus: 'Liver support + protein', status: 'Recovery Diet' },
  { id: 'AD-N-003', patient: 'Mr. Kunle Adeola', stage: 'Aftercare', focus: 'Wellness diet + relapse prevention', status: 'Wellness' },
  { id: 'AD-N-004', patient: 'Mr. Femi Bankole', stage: 'Detox', focus: 'Slow titration kcal', status: 'Detox Nutrition' },
  { id: 'AD-N-005', patient: 'Mr. Tunde Lawal', stage: 'Rehab', focus: 'Nutritional rehabilitation', status: 'Active' },
  { id: 'AD-N-006', patient: 'Mr. Bayo Ojo', stage: 'Aftercare', focus: 'Review wellness diet', status: 'Review Due' },
];

const GERIATRIC = [
  { id: 'GE-N-001', patient: 'Pa Adebayo Odunsi', focus: 'Energy dense + fortified', dysphagia: 'No', status: 'Malnutrition Risk' },
  { id: 'GE-N-002', patient: 'Pa Tunde Akinola', focus: 'NG enteral feeding', dysphagia: 'Severe', status: 'Dysphagia' },
  { id: 'GE-N-003', patient: 'Mama Bisi Adekunle', focus: 'Dementia — finger foods', dysphagia: 'Mild', status: 'Dementia Nutrition' },
  { id: 'GE-N-004', patient: 'Pa Adeola Lawal', focus: 'Fortified meals', dysphagia: 'No', status: 'Active' },
  { id: 'GE-N-005', patient: 'Mama Tinuke Okoro', focus: 'Dementia — modified texture', dysphagia: 'Moderate', status: 'Dementia Nutrition' },
  { id: 'GE-N-006', patient: 'Pa Sola Bankole', focus: 'Routine review', dysphagia: 'No', status: 'Review Due' },
];

const COMMUNITY = [
  { id: 'CM-001', patient: 'Mrs. Funke Adeyemi', visit: 'Home review', date: '2026-06-08', focus: 'Weight loss compliance', status: 'Scheduled' },
  { id: 'CM-002', patient: 'Family — Bakare', visit: 'Home + school', date: '2026-06-10', focus: 'School lunch plan', status: 'Scheduled' },
  { id: 'CM-003', patient: 'Mr. Kunle Adeola', visit: 'Community clinic', date: '2026-06-12', focus: 'Recovery diet review', status: 'Completed' },
  { id: 'CM-004', patient: 'Miss Adaeze Nnamdi', visit: 'Home review', date: '2026-05-28', focus: 'SAM follow-up', status: 'Missed' },
  { id: 'CM-005', patient: 'Pa Adebayo Odunsi', visit: 'Home review', date: '2026-06-15', focus: 'Geriatric nutrition', status: 'High Risk' },
  { id: 'CM-006', patient: 'Mr. Yusuf Aliyu', visit: 'Community follow-up', date: '2026-06-06', focus: 'Recovery monitoring', status: 'Follow-Up Required' },
];

const OUTPATIENT = [
  { id: 'OP-N-001', patient: 'Mrs. Funke Adeyemi', slot: '2026-06-04 09:30', dietitian: 'Diet. Bunmi', status: 'Confirmed' },
  { id: 'OP-N-002', patient: 'Master Tunde Bakare', slot: '2026-06-04 11:00', dietitian: 'Diet. Adaeze', status: 'Confirmed' },
  { id: 'OP-N-003', patient: 'Mr. Sola Adebayo', slot: '2026-06-05 10:00', dietitian: 'Diet. Tope', status: 'Pending' },
  { id: 'OP-N-004', patient: 'Mr. Ibrahim Musa', slot: '2026-06-05 12:00', dietitian: 'Diet. Femi', status: 'Rescheduled' },
  { id: 'OP-N-005', patient: 'Mrs. Bisi Akande', slot: '2026-05-30 09:00', dietitian: 'Diet. Bunmi', status: 'Completed' },
  { id: 'OP-N-006', patient: 'Pa Adebayo Odunsi', slot: '2026-05-29 10:30', dietitian: 'Diet. Bunmi', status: 'Missed' },
];

const FOLLOWUPS = [
  { id: 'FU-N-001', patient: 'Mr. Chidi Eze', type: 'Dysphagia diet review', date: '2026-06-03', status: 'Today' },
  { id: 'FU-N-002', patient: 'Pa Adebayo Odunsi', type: 'Weight + intake review', date: '2026-06-10', status: 'Pending' },
  { id: 'FU-N-003', patient: 'Miss Adaeze Nnamdi', type: 'Growth review', date: '2026-06-12', status: 'Confirmed' },
  { id: 'FU-N-004', patient: 'Mr. Yusuf Aliyu', type: 'Recovery review', date: '2026-05-30', status: 'Rescheduled' },
  { id: 'FU-N-005', patient: 'Mrs. Funke Adeyemi', type: 'Weight management', date: '2026-05-28', status: 'Missed' },
  { id: 'FU-N-006', patient: 'Mrs. Bisi Akande', type: 'DASH plan review', date: '2026-05-22', status: 'Completed' },
];

const TIMELINE = [
  { when: '2026-06-02 10:00', what: 'Diet plan updated — Mr. Chidi Eze (IDDSI L4)', who: 'Diet. Bunmi', tone: 'green' },
  { when: '2026-06-02 09:30', what: 'Anthropometric review — Pa Odunsi', who: 'Diet. Bunmi', tone: 'amber' },
  { when: '2026-06-01 14:00', what: 'Paediatric growth chart — Adaeze Nnamdi', who: 'Diet. Adaeze', tone: 'red' },
  { when: '2026-05-30 11:00', what: 'Recovery nutrition counselling — Mr. Aliyu', who: 'Diet. Tope', tone: 'amber' },
  { when: '2026-05-29 09:00', what: 'Weight mgmt session — Mrs. Adeyemi', who: 'Diet. Bunmi', tone: 'green' },
];

const SERVICE_TYPES = ['Nutrition Assessment', 'Diet Plan', 'Counselling', 'Inpatient Feeding', 'Enteral Feeding', 'Therapeutic Diet Review', 'Community Follow-Up'];

const INVOICES = [
  { id: 'INV-N-901', patient: 'Mrs. Funke Adeyemi', service: 'Counselling × 4 + Diet plan', amount: 24000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-N-902', patient: 'Mr. Chidi Eze', service: 'Inpatient feeding + therapeutic', amount: 42000, nhia: 'Pending', status: 'NHIA' },
  { id: 'INV-N-903', patient: 'Mr. Yusuf Aliyu', service: 'Recovery nutrition × 2', amount: 18000, nhia: 'N/A', status: 'Pending' },
  { id: 'INV-N-904', patient: 'Miss Adaeze Nnamdi', service: 'Paediatric SAM programme', amount: 36000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-N-905', patient: 'Pa Tunde Akinola', service: 'Enteral feeding × 14d', amount: 56000, nhia: 'Pending', status: 'Outstanding' },
  { id: 'INV-N-906', patient: 'Mr. Ibrahim Musa', service: 'Diabetic counselling', amount: 9000, nhia: 'N/A', status: 'Feeding' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Okafor (Doctor)', dept: 'Doctor', patient: 'Mr. Chidi Eze', preview: 'Confirming IDDSI L4 diet for stroke patient.', time: '09:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Nurse Blessing (Nursing)', dept: 'Nursing', patient: 'Pa Odunsi', preview: 'Intake chart shows ↓50% — added fortifiers.', time: '10:00', unread: 1, urgent: false },
  { id: 'TH-3', with: 'Pharm. Yetunde (Pharmacy)', dept: 'Pharmacy', patient: 'Mr. Yusuf Aliyu', preview: 'Thiamine + folate added to recovery plan.', time: '11:15', unread: 0, urgent: false },
  { id: 'TH-4', with: 'Mrs. Funmi (Social Work)', dept: 'Social Work', patient: 'Miss Adaeze Nnamdi', preview: 'Welfare feeding cleared for SAM patient.', time: '12:00', unread: 0, urgent: true },
  { id: 'TH-5', with: 'SLT. Mojisola (Speech Therapy)', dept: 'Speech Therapy', patient: 'Mr. Chidi Eze', preview: 'Aligned IDDSI texture recommendations.', time: '13:20', unread: 1, urgent: false },
  { id: 'TH-6', with: 'Dr. Sowemimo (Psychogeriatrics)', dept: 'Psychogeriatrics', patient: 'Pa Adebayo Odunsi', preview: 'Dementia nutrition plan reviewed.', time: 'Yesterday', unread: 0, urgent: false },
  { id: 'TH-7', with: 'Dr. Aluko (Child Psychiatry)', dept: 'Child Psychiatry', patient: 'Master Tunde Bakare', preview: 'Autism feeding expansion plan accepted.', time: '2d', unread: 0, urgent: false },
  { id: 'TH-8', with: 'Chef Bukola (Catering)', dept: 'Catering', patient: 'Ward A', preview: 'Low-salt menu prepped for Ward A.', time: '3d', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-N-1', patient: 'Miss Adaeze Nnamdi', type: 'Severe malnutrition (SAM)', message: 'RUTF + admission required.', date: '2026-06-03', status: 'Critical' },
  { id: 'AL-N-2', patient: 'Mrs. Funke Adeyemi', type: 'Peanut allergy', message: 'Avoid all peanut & ground-nut products.', date: '2026-06-03', status: 'Severe Allergy' },
  { id: 'AL-N-3', patient: 'Pa Adebayo Odunsi', type: 'High malnutrition risk', message: 'MNA-SF 6/14 — fortified diet.', date: '2026-06-02', status: 'Malnutrition Risk' },
  { id: 'AL-N-4', patient: 'Pa Tunde Akinola', type: 'Missed enteral feed', message: 'NG feed missed 2 cycles — escalate.', date: '2026-06-02', status: 'Missed Feeding' },
  { id: 'AL-N-5', patient: 'Mr. Chidi Eze', type: 'Diet restriction breach', message: 'Thin fluids served — corrected.', date: '2026-06-01', status: 'Diet Restriction' },
  { id: 'AL-N-6', patient: 'Mr. Yusuf Aliyu', type: 'Refeeding syndrome risk', message: 'Slow kcal titration + electrolytes.', date: '2026-05-30', status: 'Critical' },
  { id: 'AL-N-7', patient: 'Mrs. Bisi Akande', type: 'Routine ack', message: 'Reviewed and acknowledged.', date: '2026-05-29', status: 'Acknowledged' },
];

const OFFLINE = [
  { id: 'SYN-001', kind: 'Assessment draft', item: 'MUST screening — Mr. Eze', state: 'Auto-saved (offline)' },
  { id: 'SYN-002', kind: 'Diet plan', item: 'Weight mgmt — Mrs. Adeyemi', state: 'Pending sync' },
  { id: 'SYN-003', kind: 'Growth chart', item: 'Paediatric — Adaeze', state: 'Synced' },
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
  shellTitle: string; icon: ReactNode; title: string; desc: string; ctaLabel: string;
  newDialog: (close: () => void, notify: (p: SuccessPayload) => void) => ReactNode;
  kpis: { l: string; v: string | number; i?: any; tone?: any }[];
  tabs: { key: string; label: string; filter: (r: T) => boolean }[];
  rows: T[]; columns: Col<T>[];
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
  openLabel?: string;
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
        rowActions={(r) => openBtn(() => setSelected(r), p.openLabel)}
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
export const NutritionDashboard = () => {
  const nav = useNavigate();
  const quick = [
    { l: 'Referral Center', i: Send, p: 'referrals' },
    { l: 'Nutrition Assessment', i: ClipboardList, p: 'assessments' },
    { l: 'Malnutrition Screening', i: ShieldAlert, p: 'malnutrition' },
    { l: 'Diet Plan Management', i: Salad, p: 'diet-plans' },
    { l: 'Therapeutic Diet', i: HeartHandshake, p: 'therapeutic' },
    { l: 'Inpatient Feeding', i: BedDouble, p: 'inpatient' },
    { l: 'Enteral & Tube Feeding', i: Droplets, p: 'enteral' },
    { l: 'Catering & Kitchen', i: ChefHat, p: 'catering' },
    { l: 'Allergy & Restrictions', i: AlertTriangle, p: 'allergy' },
    { l: 'Nutrition Counselling', i: UsersRound, p: 'counselling' },
    { l: 'Child Nutrition', i: Baby, p: 'child' },
    { l: 'Addiction Recovery', i: Brain, p: 'addiction' },
    { l: 'Psychogeriatric', i: Stethoscope, p: 'psychogeriatric' },
    { l: 'Community Follow-Up', i: Home, p: 'community' },
    { l: 'Outpatient', i: Utensils, p: 'outpatient' },
    { l: 'Follow-Up', i: Repeat, p: 'followup' },
    { l: 'Billing & NHIA', i: CreditCard, p: 'billing' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Communication', i: MessageSquare, p: 'comms' },
    { l: 'Alerts', i: AlertTriangle, p: 'alerts' },
  ];
  return (
    <Shell title="Department Dashboard">
      <Section
        icon={<Salad className="h-5 w-5" />}
        title="Nutrition & Dietetics Workspace"
        desc="GFA HMS · Clinical nutrition, dietetics, therapeutic feeding, malnutrition screening, inpatient feeding, catering coordination and multidisciplinary nutrition care."
        action={
          <>
            <Button onClick={() => nav(`${base}/assessments?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> New Assessment</Button>
            <Button variant="outline" onClick={() => nav(`${base}/diet-plans?new=1`)}><Salad className="h-4 w-4 mr-1" /> Create Diet Plan</Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'New Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 12, i: Send, tone: 'purple' },
        { l: 'Active Nutrition Cases', v: 186, i: Users, tone: 'blue' },
        { l: 'Malnutrition Risk', v: MALNUTRITION.filter(m => m.risk === 'High' || m.risk === 'Severe').length + 18, i: ShieldAlert, tone: 'rose' },
        { l: 'Diet Plans Active', v: DIET_PLANS.filter(d => d.status === 'Active').length + 62, i: Salad, tone: 'green' },
        { l: 'Inpatient Feeding Orders', v: 187, i: BedDouble, tone: 'blue' },
        { l: 'Allergy Alerts', v: ALLERGY.filter(a => a.severity === 'Severe' || a.severity === 'Critical').length + 4, i: AlertTriangle, tone: 'rose' },
      ]} />
      <KpiGrid items={[
        { l: 'Follow-Ups Due', v: FOLLOWUPS.filter(f => f.status === 'Today' || f.status === 'Pending').length + 4, i: Calendar, tone: 'amber' },
        { l: 'Billing Pending', v: INVOICES.filter(i => i.status === 'Pending' || i.status === 'Outstanding').length + 6, i: CreditCard, tone: 'amber' },
        { l: 'Nutrition Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 4, i: AlertTriangle, tone: 'rose' },
        { l: 'Child Nutrition', v: 52, i: Baby, tone: 'amber' },
        { l: 'Elderly Nutrition', v: 39, i: Stethoscope, tone: 'amber' },
        { l: 'Revenue (MTD)', v: formatCurrency(3120000), i: CreditCard, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">High-Priority Referrals</div>
          <div className="space-y-2">{REFERRALS.filter(r => r.priority === 'High').slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{r.patient}</div><div className="text-xs text-muted-foreground">{r.from}</div></div>
              <Chip label={r.priority} t="red" />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Today's Counselling</div>
          <div className="space-y-2">{COUNSELLING.filter(c => c.status === 'Today' || c.status === 'Pending').slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{c.patient}</div><div className="text-xs text-muted-foreground">{c.date} · {c.kind}</div></div>
              <Chip label={c.status} t={c.status === 'Today' ? 'blue' : 'amber'} />
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
      <Card>
        <div className="text-sm font-semibold mb-3">Active Nutrition Caseload</div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow>{['ID', 'Patient', 'Diagnosis', 'Plan', 'Energy', 'Status', ''].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {DIET_PLANS.slice(0, 6).map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.patient}</TableCell>
                  <TableCell>{PATIENTS.find(x => x.name === p.patient)?.dx || '—'}</TableCell>
                  <TableCell>{p.diet}</TableCell>
                  <TableCell>{p.kcal}</TableCell>
                  <TableCell><Chip label={p.status} t={p.status === 'Active' ? 'green' : p.status === 'Pending' ? 'amber' : 'blue'} /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => nav(`${base}/diet-plans`)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Shell>
  );
};

// ============================================================
// 2. REFERRAL CENTER
// ============================================================
export const NutritionReferralCenter = () => {
  const [selected, setSelected] = useState<typeof REFERRALS[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Referral Center"
        icon={<Send className="h-5 w-5" />}
        title="Nutrition Referral Center"
        desc="Inbound referrals from Doctor, Nursing, Psychiatry, CAP, Addiction, Psychogeriatrics, Pharmacy and Social Work. Triage, prioritise and assign dietitians."
        ctaLabel="New Referral"
        kpis={[
          { l: 'Total Referrals', v: REFERRALS.length + 112, i: Send, tone: 'blue' },
          { l: 'High Priority', v: REFERRALS.filter(r => r.priority === 'High').length + 12, i: AlertTriangle, tone: 'rose' },
          { l: 'Medium Priority', v: REFERRALS.filter(r => r.priority === 'Medium').length + 28, i: AlertCircle, tone: 'amber' },
          { l: 'Low Priority', v: REFERRALS.filter(r => r.priority === 'Low').length + 44, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Referrals', v: REFERRALS.filter(r => r.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
          { l: 'Accepted Referrals', v: REFERRALS.filter(r => r.status === 'Accepted').length + 86, i: CheckCircle2, tone: 'green' },
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
        newDialog={(close, n) => <SimpleForm close={close} notify={n}
          title="New Referral" submitLabel="Create Referral"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'from', label: 'Referring Department', type: 'select', options: REFER_DEPTS },
            { k: 'reason', label: 'Referral Reason', type: 'textarea' },
            { k: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
            { k: 'diet', label: 'Assigned Dietitian', type: 'select', options: DIETITIANS },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Referral created" nextStep="Triage the referral and assign a dietitian."
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
              <Button variant="outline" onClick={() => { setSelected(null); notify({ title: 'Referral rejected', message: `${selected.id} returned to source.` }); }}>Reject with Reason</Button>
              <Button variant="outline" onClick={() => { setSelected(null); notify({ title: 'Marked completed', message: selected.id }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Completed</Button>
              <Button variant="outline" onClick={() => { setSelected(null); notify({ title: 'Assessment started', message: selected.patient, nextStep: 'Open the assessment workspace.' }); }}><ClipboardList className="h-4 w-4 mr-1" /> Start Assessment</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Referral accepted', message: selected.id, nextStep: 'Dietitian assigned.' }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Accept Referral</Button>
            </>
          }
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 3. NUTRITION ASSESSMENT
// ============================================================
export const NutritionAssessmentCenter = () => {
  const [selected, setSelected] = useState<any>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Nutrition Assessment"
        icon={<ClipboardList className="h-5 w-5" />}
        title="Nutrition Assessment Center"
        desc="Nutrition screening, anthropometric, dietary history, BMI, food allergy and special diet assessments with auto-save, draft recovery, scoring and recommendations."
        ctaLabel="Start Assessment"
        kpis={[
          { l: 'Pending Assessments', v: ASSESSMENTS.filter(a => a.status === 'Pending').length + 9, i: AlertCircle, tone: 'amber' },
          { l: 'In Progress', v: ASSESSMENTS.filter(a => a.status === 'In Progress').length + 7, i: Activity, tone: 'blue' },
          { l: 'Completed', v: ASSESSMENTS.filter(a => a.status === 'Completed').length + 88, i: CheckCircle2, tone: 'green' },
          { l: 'High Risk', v: ASSESSMENTS.filter(a => a.risk === 'High Risk').length + 12, i: AlertTriangle, tone: 'rose' },
          { l: 'Review Due', v: ASSESSMENTS.filter(a => a.status === 'Review Due').length + 4, i: Repeat, tone: 'purple' },
          { l: 'Assessment Types', v: ASSESSMENT_TYPES.length, i: ClipboardList, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ip', label: 'In Progress', filter: (r: any) => r.status === 'In Progress' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'hr', label: 'High Risk', filter: (r: any) => r.risk === 'High Risk' },
          { key: 'rd', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
        ]}
        rows={ASSESSMENTS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.type}`}
        columns={[
          { key: 'id', header: 'Code', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Type', render: r => r.type },
          { key: 'c', header: 'Dietitian', render: r => r.clinician },
          { key: 'r', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'In Progress' ? 'blue' : 'amber'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Activity className="h-3.5 w-3.5 mr-1" /> Begin</Button>}
        newDialog={(close, n) => <SimpleForm close={close} notify={n}
          title="Start Assessment" submitLabel="Begin Assessment"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Assessment Type', type: 'select', options: ASSESSMENT_TYPES },
            { k: 'diet', label: 'Diet History', type: 'textarea' },
            { k: 'wt', label: 'Current Weight (kg)', type: 'number' },
            { k: 'ht', label: 'Height (cm)', type: 'number' },
            { k: 'bmi', label: 'BMI', type: 'number' },
            { k: 'dt', label: 'Assigned Dietitian', type: 'select', options: DIETITIANS },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Assessment started" nextStep="Open the assessment workspace and complete scoring."
        />}
      />
      {selected && (
        <Dialog open onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selected.type} · {selected.patient}</DialogTitle><DialogDescription>Assessment workspace — auto-saved.</DialogDescription></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div><Label>Weight (kg)</Label><Input defaultValue="58" /></div>
              <div><Label>Height (cm)</Label><Input defaultValue="170" /></div>
              <div><Label>BMI</Label><Input defaultValue="20.1" /></div>
              <div><Label>MUAC</Label><Input defaultValue="22" /></div>
              <div className="sm:col-span-2"><Label>Dietary History</Label><Textarea rows={3} placeholder="24-hr recall + FFQ" /></div>
              <div className="sm:col-span-2"><Label>Recommendation</Label><Textarea rows={2} placeholder="Dietitian recommendation" /></div>
            </div>
            <DialogFooter className="mt-4 flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setSelected(null); notify({ title: 'Draft saved', message: selected.id, nextStep: 'Draft auto-saved; resume any time.' }); }}>Save Draft</Button>
              <Button variant="outline" onClick={() => notify({ title: 'Assessment printed', message: selected.id })}><Printer className="h-4 w-4 mr-1" /> Print Assessment</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Assessment submitted', message: selected.patient, nextStep: 'Create a diet plan or refer for screening.' }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Submit Assessment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {node}
    </>
  );
};

// ============================================================
// 4. ANTHROPOMETRIC
// ============================================================
export const AnthropometricCenter = () => (
  <SpecialisedPage
    shellTitle="Anthropometric"
    icon={<Ruler className="h-5 w-5" />}
    title="Anthropometric Assessment Center"
    desc="Weight, height, BMI, MUAC, waist circumference, growth charts and weight trends."
    ctaLabel="New Measurement"
    tabKey="status"
    tabs={[{ key: 'all', label: 'All' }, { key: 'ac', label: 'Active', value: 'Active' }]}
    kpis={[
      { l: 'Total Measurements', v: ANTHRO.length + 84, i: Ruler, tone: 'blue' },
      { l: 'Underweight', v: 12, i: AlertTriangle, tone: 'rose' },
      { l: 'Obese (BMI≥30)', v: 18, i: AlertCircle, tone: 'amber' },
      { l: 'Children Tracked', v: 22, i: Baby, tone: 'purple' },
      { l: 'Declining Trend', v: 9, i: TrendingUp, tone: 'orange' },
      { l: 'Stable', v: 64, i: CheckCircle2, tone: 'green' },
    ]}
    rows={ANTHRO}
    searchFields={(r) => `${r.patient} ${r.id}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'wt', header: 'Weight', render: r => r.wt },
      { key: 'ht', header: 'Height', render: r => r.ht },
      { key: 'bmi', header: 'BMI', render: r => r.bmi },
      { key: 'm', header: 'MUAC', render: r => r.muac },
      { key: 'tr', header: 'Trend', render: r => <Chip label={r.trend} t="amber" /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'wt', label: 'Weight (kg)', type: 'number' },
      { k: 'ht', label: 'Height (cm)', type: 'number' },
      { k: 'muac', label: 'MUAC (cm)', type: 'number' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Measurement recorded" nextStep="Plot on growth chart and review BMI trend."
    openLabel="Chart"
  />
);

// ============================================================
// 5. MALNUTRITION SCREENING
// ============================================================
export const MalnutritionScreening = () => (
  <SpecialisedPage
    shellTitle="Malnutrition Screening"
    icon={<ShieldAlert className="h-5 w-5" />}
    title="Malnutrition Screening Module"
    desc="Adult, child and elderly malnutrition screening (MUST, MNA-SF, WHO z-score, SGA) with risk categorisation, recommendations and onward referrals."
    ctaLabel="New Screening"
    tabKey="risk"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'lo', label: 'Low Risk', value: 'Low' },
      { key: 'mo', label: 'Moderate Risk', value: 'Moderate' },
      { key: 'hi', label: 'High Risk', value: 'High' },
      { key: 'sv', label: 'Severe', value: 'Severe' },
      { key: 'rd', label: 'Screening Due', value: 'Review Due' },
    ]}
    kpis={[
      { l: 'Low Risk', v: MALNUTRITION.filter(m => m.risk === 'Low').length + 28, i: CheckCircle2, tone: 'green' },
      { l: 'Moderate Risk', v: MALNUTRITION.filter(m => m.risk === 'Moderate').length + 14, i: AlertCircle, tone: 'amber' },
      { l: 'High Risk', v: MALNUTRITION.filter(m => m.risk === 'High').length + 10, i: AlertTriangle, tone: 'rose' },
      { l: 'Severe Malnutrition', v: MALNUTRITION.filter(m => m.risk === 'Severe').length + 4, i: AlertTriangle, tone: 'red' },
      { l: 'Screening Due', v: 6, i: Repeat, tone: 'purple' },
      { l: 'Total Screened (MTD)', v: 184, i: ShieldAlert, tone: 'blue' },
    ]}
    rows={MALNUTRITION}
    searchFields={(r) => `${r.patient} ${r.id} ${r.tool}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Tool', render: r => r.tool },
      { key: 's', header: 'Score', render: r => r.score },
      { key: 'rk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'Severe' || r.risk === 'High' ? 'red' : r.risk === 'Moderate' ? 'amber' : 'green'} /> },
      { key: 'rc', header: 'Recommendation', render: r => r.rec },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'wl', label: 'Weight Loss (kg)', type: 'number' },
      { k: 'ap', label: 'Appetite', type: 'select', options: ['Normal', 'Reduced', 'Poor', 'None'] },
      { k: 'bmi', label: 'BMI', type: 'number' },
      { k: 'sc', label: 'Risk Score', type: 'number' },
      { k: 'rl', label: 'Risk Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Severe'] },
      { k: 'rec', label: 'Recommendation', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Screening saved" nextStep="Refer high-risk patients to dietitian for full assessment."
  />
);

// ============================================================
// 6. DIET PLAN MANAGEMENT
// ============================================================
export const DietPlanManagement = () => {
  const [selected, setSelected] = useState<any>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Diet Plan Management"
        icon={<Salad className="h-5 w-5" />}
        title="Diet Plan Management Center"
        desc="Regular, psychiatric, diabetic, hypertensive, weight management, addiction recovery, paediatric and geriatric diet plans with compliance tracking."
        ctaLabel="Create Diet Plan"
        kpis={[
          { l: 'Active Diet Plans', v: DIET_PLANS.filter(d => d.status === 'Active').length + 62, i: Salad, tone: 'green' },
          { l: 'Pending Plans', v: DIET_PLANS.filter(d => d.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
          { l: 'Completed Plans', v: DIET_PLANS.filter(d => d.status === 'Completed').length + 88, i: CheckCircle2, tone: 'blue' },
          { l: 'Review Due', v: DIET_PLANS.filter(d => d.status === 'Review Due').length + 6, i: Repeat, tone: 'purple' },
          { l: 'Special Diet Plans', v: DIET_PLANS.filter(d => d.special === 'Special').length + 22, i: HeartHandshake, tone: 'rose' },
          { l: 'Diet Types', v: DIET_TYPES.length, i: ListChecks, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'ac', label: 'Active', filter: (r: any) => r.status === 'Active' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
          { key: 'rd', label: 'Review Due', filter: (r: any) => r.status === 'Review Due' },
          { key: 'sp', label: 'Special Diet', filter: (r: any) => r.special === 'Special' },
        ]}
        rows={DIET_PLANS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.diet}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'd', header: 'Diet', render: r => r.diet },
          { key: 'k', header: 'Energy', render: r => r.kcal },
          { key: 'sp', header: 'Type', render: r => <Chip label={r.special} t={r.special === 'Special' ? 'purple' : 'blue'} /> },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Active' || r.status === 'Completed' ? 'green' : r.status === 'Pending' ? 'amber' : 'orange'} /> },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, n) => <SimpleForm close={close} notify={n}
          title="Create Diet Plan" submitLabel="Save Diet Plan"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Diet Type', type: 'select', options: DIET_TYPES },
            { k: 'goal', label: 'Nutrition Goal', type: 'textarea' },
            { k: 'freq', label: 'Meal Frequency', type: 'select', options: ['3 meals/day', '3 meals + 2 snacks', '5 small meals', 'Continuous enteral'] },
            { k: 'res', label: 'Restrictions', type: 'textarea' },
            { k: 'rev', label: 'Review Date', type: 'date' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Diet plan created" nextStep="Send plan to Nursing & Catering."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Diet Plan · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Diet', value: selected.diet },
            { label: 'Energy', value: selected.kcal },
            { label: 'Type', value: selected.special },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Edit mode', message: selected.id })}>Edit Plan</Button>
              <Button variant="outline" onClick={() => notify({ title: 'Plan printed', message: selected.id })}><Printer className="h-4 w-4 mr-1" /> Print Plan</Button>
              <Button variant="outline" onClick={() => { setSelected(null); notify({ title: 'Plan completed', message: selected.id }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete Plan</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Plan sent to Nursing', message: selected.patient, nextStep: 'Nursing & Catering will see this plan in their queues.' }); }}><Send className="h-4 w-4 mr-1" /> Send to Nursing</Button>
            </>
          }
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 7. THERAPEUTIC DIET
// ============================================================
export const TherapeuticDiets = () => (
  <SpecialisedPage
    shellTitle="Therapeutic Diet"
    icon={<HeartHandshake className="h-5 w-5" />}
    title="Therapeutic Diet Management"
    desc="High protein, low sodium, low fat, renal, cardiac, diabetic and psychiatric wellness diets with standardised templates and macros."
    ctaLabel="Add Diet"
    tabKey="category"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'db', label: 'Diabetic', value: 'Diabetic' },
      { key: 'ls', label: 'Low Salt', value: 'Low Salt' },
      { key: 'hp', label: 'High Protein', value: 'High Protein' },
      { key: 're', label: 'Renal', value: 'Renal' },
      { key: 'ps', label: 'Psychiatric Wellness', value: 'Psychiatric' },
      { key: 'ac', label: 'Active', value: 'Active' },
    ]}
    kpis={[
      { l: 'Diabetic Diets', v: THERAPEUTIC.filter(t => t.category === 'Diabetic').length + 14, i: HeartHandshake, tone: 'amber' },
      { l: 'Low Salt Diets', v: THERAPEUTIC.filter(t => t.category === 'Low Salt').length + 22, i: HeartHandshake, tone: 'blue' },
      { l: 'High Protein Diets', v: THERAPEUTIC.filter(t => t.category === 'High Protein').length + 18, i: HeartHandshake, tone: 'green' },
      { l: 'Renal Diets', v: THERAPEUTIC.filter(t => t.category === 'Renal').length + 4, i: HeartHandshake, tone: 'rose' },
      { l: 'Psychiatric Wellness', v: THERAPEUTIC.filter(t => t.category === 'Psychiatric').length + 12, i: Brain, tone: 'purple' },
      { l: 'Active Therapeutic', v: THERAPEUTIC.length + 60, i: CheckCircle2, tone: 'teal' },
    ]}
    rows={THERAPEUTIC}
    searchFields={(r) => `${r.code} ${r.use}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'c', header: 'Diet', render: r => <Chip label={r.code} t="green" /> },
      { key: 'u', header: 'Indication', render: r => r.use },
      { key: 'm', header: 'Macros', render: r => r.macros },
      { key: 'k', header: 'Category', render: r => r.category },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'code', label: 'Therapeutic Diet', type: 'select', options: THERAPEUTIC.map(t => t.code) },
      { k: 'goal', label: 'Clinical Goal', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Therapeutic diet assigned" nextStep="Confirm with Catering and Nursing."
  />
);

// ============================================================
// 8. INPATIENT FEEDING
// ============================================================
export const InpatientFeeding = () => (
  <SpecialisedPage
    shellTitle="Inpatient Feeding"
    icon={<BedDouble className="h-5 w-5" />}
    title="Inpatient Feeding Management"
    desc="Ward feeding lists, meal distribution, diet compliance and special feeding requests. Integrated with Admission, Nursing and Catering."
    ctaLabel="New Ward Order"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'sv', label: 'Served', value: 'Served' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'sp', label: 'Special Diet', value: 'Special Diet' },
      { key: 'rd', label: 'Review Due', value: 'Review Due' },
    ]}
    kpis={[
      { l: 'Pending Meal Orders', v: INPATIENT.filter(i => i.status === 'Pending').length + 18, i: AlertCircle, tone: 'amber' },
      { l: 'Served Meals', v: INPATIENT.filter(i => i.status === 'Served').length + 144, i: CheckCircle2, tone: 'green' },
      { l: 'Missed Meals', v: INPATIENT.filter(i => i.status === 'Missed').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Special Diets', v: INPATIENT.filter(i => i.status === 'Special Diet').length + 32, i: HeartHandshake, tone: 'purple' },
      { l: 'Feeding Reviews Due', v: INPATIENT.filter(i => i.status === 'Review Due').length + 4, i: Repeat, tone: 'orange' },
      { l: 'Inpatient Meals Today', v: 187, i: BedDouble, tone: 'blue' },
    ]}
    rows={INPATIENT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.ward} ${r.bed}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'w', header: 'Ward', render: r => r.ward },
      { key: 'b', header: 'Bed', render: r => r.bed },
      { key: 'd', header: 'Diet', render: r => r.diet },
      { key: 'm', header: 'Meal', render: r => r.meal },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Served' ? 'green' : r.status === 'Missed' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'ward', label: 'Ward', type: 'select', options: ['Ward A', 'Ward B', 'Ward C', 'Neuro Ward', 'HDE', 'Paeds', 'Rehab', 'Psychogeri'] },
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'bed', label: 'Bed', type: 'text' },
      { k: 'diet', label: 'Diet Type', type: 'select', options: DIET_TYPES },
      { k: 'meal', label: 'Meal Type', type: 'select', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Continuous'] },
      { k: 'time', label: 'Serving Time', type: 'time' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Ward feeding order created" nextStep="Order sent to Catering & Nursing queue."
  />
);

// ============================================================
// 9. ENTERAL & TUBE FEEDING
// ============================================================
export const EnteralFeeding = () => (
  <SpecialisedPage
    shellTitle="Enteral & Tube Feeding"
    icon={<Droplets className="h-5 w-5" />}
    title="Enteral & Tube Feeding Module"
    desc="Tube feeding plans, enteral orders, schedules, intake monitoring and volume/frequency/compliance tracking."
    ctaLabel="New Enteral Plan"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'tb', label: 'Tube Feeding', value: 'Tube Feeding' },
      { key: 'in', label: 'Intolerance', value: 'Intolerance' },
      { key: 'rd', label: 'Review Due', value: 'Review Due' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    kpis={[
      { l: 'Active Enteral Plans', v: ENTERAL.filter(e => e.status === 'Active').length + 18, i: Droplets, tone: 'blue' },
      { l: 'Tube Feeding', v: ENTERAL.filter(e => e.status === 'Tube Feeding').length + 9, i: Droplets, tone: 'amber' },
      { l: 'Feeding Intolerance', v: ENTERAL.filter(e => e.status === 'Intolerance').length + 2, i: AlertTriangle, tone: 'rose' },
      { l: 'Review Due', v: ENTERAL.filter(e => e.status === 'Review Due').length + 3, i: Repeat, tone: 'purple' },
      { l: 'Completed Plans', v: ENTERAL.filter(e => e.status === 'Completed').length + 28, i: CheckCircle2, tone: 'green' },
      { l: 'Daily Feed Volume', v: '12.4 L', i: Droplets, tone: 'teal' },
    ]}
    rows={ENTERAL}
    searchFields={(r) => `${r.patient} ${r.id} ${r.route}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'r', header: 'Route', render: r => r.route },
      { key: 'f', header: 'Feed', render: r => r.feed },
      { key: 'rt', header: 'Rate', render: r => r.rate },
      { key: 'k', header: 'Energy', render: r => r.kcal },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'route', label: 'Route', type: 'select', options: ['NG tube', 'PEG', 'Oral + supplements', 'Oral RUTF', 'NJ tube'] },
      { k: 'feed', label: 'Feed Type', type: 'select', options: ['Standard 1.0 kcal/ml', 'Standard 1.5 kcal/ml', 'High protein 1.5 kcal/ml', 'Fortified + sip feeds', 'F-100 + RUTF'] },
      { k: 'rate', label: 'Rate / Schedule', type: 'text' },
      { k: 'kcal', label: 'Daily kcal target', type: 'number' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Enteral plan saved" nextStep="Plan dispatched to Nursing and pharmacy."
  />
);

// ============================================================
// 10. CATERING & KITCHEN
// ============================================================
export const CateringKitchen = () => (
  <SpecialisedPage
    shellTitle="Catering & Kitchen"
    icon={<ChefHat className="h-5 w-5" />}
    title="Catering & Kitchen Coordination Center"
    desc="Daily menu planning, meal production lists, special diet lists, ward meal distribution and kitchen requests."
    ctaLabel="Plan Menu"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pl', label: 'Planned', value: 'Planned' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'ip', label: 'In Preparation', value: 'In Preparation' },
      { key: 'sv', label: 'Served', value: 'Served' },
      { key: 'sp', label: 'Special Requests', value: 'Special Requests' },
    ]}
    kpis={[
      { l: 'Menus Planned', v: CATERING.filter(c => c.status === 'Planned').length + 6, i: ChefHat, tone: 'blue' },
      { l: 'Pending Kitchen Orders', v: CATERING.filter(c => c.status === 'Pending').length + 3, i: AlertCircle, tone: 'amber' },
      { l: 'In Preparation', v: CATERING.filter(c => c.status === 'In Preparation').length + 4, i: Activity, tone: 'orange' },
      { l: 'Served', v: CATERING.filter(c => c.status === 'Served').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Special Requests', v: CATERING.filter(c => c.status === 'Special Requests').length + 8, i: HeartHandshake, tone: 'purple' },
      { l: 'Meals Today', v: 187, i: ChefHat, tone: 'teal' },
    ]}
    rows={CATERING}
    searchFields={(r) => `${r.menu} ${r.id}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'm', header: 'Menu', render: r => r.menu },
      { key: 'r', header: 'Regular', render: r => r.regular },
      { key: 'so', header: 'Soft', render: r => r.soft },
      { key: 'db', header: 'Diabetic', render: r => r.diabetic },
      { key: 'ls', header: 'Low Salt', render: r => r.lowSalt },
      { key: 'dy', header: 'Dysphagia', render: r => r.dysphagia },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Served' ? 'green' : r.status === 'Planned' ? 'blue' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'menu', label: 'Menu Name', type: 'text' },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'meal', label: 'Meal', type: 'select', options: ['Breakfast', 'Lunch', 'Dinner'] },
      { k: 'reg', label: 'Regular meals', type: 'number' },
      { k: 'sp', label: 'Special diet meals', type: 'number' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Menu planned" nextStep="Kitchen will see the production list."
  />
);

// ============================================================
// 11. ALLERGY & RESTRICTIONS
// ============================================================
export const AllergyRestrictions = () => {
  const [selected, setSelected] = useState<any>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Allergy & Restrictions"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Food Allergy & Diet Restrictions"
        desc="Allergy tracking, food restrictions, religious & cultural preferences. Alerts displayed across the HMS for nursing, catering and pharmacy."
        ctaLabel="Add Allergy"
        kpis={[
          { l: 'Mild Allergies', v: ALLERGY.filter(a => a.severity === 'Mild').length + 8, i: AlertCircle, tone: 'green' },
          { l: 'Moderate Allergies', v: ALLERGY.filter(a => a.severity === 'Moderate').length + 6, i: AlertCircle, tone: 'amber' },
          { l: 'Severe Allergies', v: ALLERGY.filter(a => a.severity === 'Severe').length + 4, i: AlertTriangle, tone: 'rose' },
          { l: 'Critical Allergies', v: ALLERGY.filter(a => a.severity === 'Critical').length + 2, i: AlertTriangle, tone: 'red' },
          { l: 'Active Restrictions', v: ALLERGY.filter(a => a.severity === 'Restrictions').length + 18, i: ShieldAlert, tone: 'purple' },
          { l: 'Broadcast Today', v: 7, i: Bell, tone: 'blue' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'mi', label: 'Mild', filter: (r: any) => r.severity === 'Mild' },
          { key: 'mo', label: 'Moderate', filter: (r: any) => r.severity === 'Moderate' },
          { key: 'sv', label: 'Severe', filter: (r: any) => r.severity === 'Severe' },
          { key: 'cr', label: 'Critical', filter: (r: any) => r.severity === 'Critical' },
          { key: 're', label: 'Restrictions', filter: (r: any) => r.severity === 'Restrictions' },
        ]}
        rows={ALLERGY}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.allergen}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'a', header: 'Allergen / Restriction', render: r => r.allergen },
          { key: 'sv', header: 'Severity', render: r => <Chip label={r.severity} t={r.severity === 'Critical' || r.severity === 'Severe' ? 'red' : r.severity === 'Moderate' ? 'amber' : 'green'} /> },
          { key: 'rx', header: 'Reaction', render: r => r.reaction },
          { key: 'al', header: 'Alert', render: r => r.alert },
        ]}
        rowActions={(r, n) => (
          <>
            <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button>
            <Button size="sm" onClick={() => n({ title: 'Allergy alert broadcast successfully.', message: `${r.patient} · ${r.allergen}`, nextStep: 'Nursing, Catering and Pharmacy will see this alert.' })}><Bell className="h-3.5 w-3.5 mr-1" /> Broadcast</Button>
          </>
        )}
        newDialog={(close, n) => <SimpleForm close={close} notify={n}
          title="Add Allergy" submitLabel="Save Allergy"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'type', label: 'Allergy Type', type: 'select', options: ['Food', 'Medication', 'Religious', 'Cultural', 'Dietary'] },
            { k: 'sev', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Critical', 'Restrictions'] },
            { k: 'food', label: 'Food Item / Allergen', type: 'text' },
            { k: 'rx', label: 'Reaction', type: 'textarea' },
            { k: 'res', label: 'Restriction Instruction', type: 'textarea' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Allergy saved" nextStep="Broadcast to Nursing, Catering and Pharmacy."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Allergy · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Allergen', value: selected.allergen },
            { label: 'Severity', value: selected.severity },
            { label: 'Reaction', value: selected.reaction },
            { label: 'Alert', value: selected.alert },
          ]}
          footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        />
      )}
      {node}
    </>
  );
};

// ============================================================
// 12. NUTRITION COUNSELLING
// ============================================================
export const NutritionCounselling = () => (
  <SpecialisedPage
    shellTitle="Counselling"
    icon={<UsersRound className="h-5 w-5" />}
    title="Nutrition Counselling Module"
    desc="Individual, family, weight management, addiction recovery, child and elderly nutrition counselling with attendance and outcomes."
    ctaLabel="Nutrition Counselling"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'fu', label: 'Follow-Up Required', value: 'Follow-Up Required' },
    ]}
    kpis={[
      { l: 'Sessions Today', v: COUNSELLING.filter(c => c.status === 'Today').length + 4, i: Calendar, tone: 'blue' },
      { l: 'Pending Sessions', v: COUNSELLING.filter(c => c.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Sessions', v: COUNSELLING.filter(c => c.status === 'Completed').length + 64, i: CheckCircle2, tone: 'green' },
      { l: 'Missed Sessions', v: COUNSELLING.filter(c => c.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Follow-Up Required', v: COUNSELLING.filter(c => c.status === 'Follow-Up Required').length + 6, i: Repeat, tone: 'purple' },
      { l: 'Attendance', v: '88%', i: TrendingUp, tone: 'teal' },
    ]}
    rows={COUNSELLING}
    searchFields={(r) => `${r.patient} ${r.id} ${r.kind}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient / Family', render: r => r.patient },
      { key: 'k', header: 'Type', render: r => r.kind },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'Missed' ? 'red' : 'amber'} /> },
      { key: 'o', header: 'Outcome', render: r => r.outcome },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient / Family', type: 'patientPicker' },
      { k: 'kind', label: 'Counselling Type', type: 'select', options: ['Weight management', 'Diabetic diet', 'Hypertension diet', 'Child autism nutrition', 'Elderly feeding support', 'Addiction recovery diet', 'Family counselling'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'diet', label: 'Dietitian', type: 'select', options: DIETITIANS },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Counselling session scheduled" nextStep="Patient and dietitian notified."
  />
);

// ============================================================
// 13. CHILD NUTRITION
// ============================================================
export const ChildNutrition = () => (
  <SpecialisedPage
    shellTitle="Child Nutrition"
    icon={<Baby className="h-5 w-5" />}
    title="Child Nutrition Module"
    desc="Growth monitoring, developmental nutrition, school feeding guidance, autism nutritional support and ADHD nutrition programmes."
    ctaLabel="Nutrition Paediatric Case"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'gm', label: 'Growth Monitoring', value: 'Growth Monitoring' },
      { key: 'uw', label: 'Underweight', value: 'Underweight' },
      { key: 'sp', label: 'Special Diet', value: 'Special Diet' },
      { key: 'rd', label: 'Review Due', value: 'Review Due' },
    ]}
    kpis={[
      { l: 'Active Child Cases', v: CHILD.filter(c => c.status === 'Active').length + 18, i: Baby, tone: 'blue' },
      { l: 'Growth Monitoring', v: CHILD.filter(c => c.status === 'Growth Monitoring').length + 22, i: TrendingUp, tone: 'teal' },
      { l: 'Underweight Cases', v: CHILD.filter(c => c.status === 'Underweight').length + 8, i: AlertTriangle, tone: 'rose' },
      { l: 'Special Diet Cases', v: CHILD.filter(c => c.status === 'Special Diet').length + 6, i: HeartHandshake, tone: 'purple' },
      { l: 'Review Due', v: CHILD.filter(c => c.status === 'Review Due').length + 4, i: Repeat, tone: 'amber' },
      { l: 'School Liaison', v: 11, i: BookOpen, tone: 'green' },
    ]}
    rows={CHILD}
    searchFields={(r) => `${r.patient} ${r.id} ${r.dx}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'c', header: 'Child', render: r => r.patient },
      { key: 'a', header: 'Age', render: r => r.age },
      { key: 'd', header: 'Diagnosis', render: r => r.dx },
      { key: 'p', header: 'Plan', render: r => r.plan },
      { key: 'g', header: 'Growth', render: r => <Chip label={r.growth} t={r.growth.includes('<3') ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Child', type: 'patientPicker' },
      { k: 'age', label: 'Age', type: 'number' },
      { k: 'dx', label: 'Diagnosis', type: 'text' },
      { k: 'plan', label: 'Nutrition Plan', type: 'textarea' },
      { k: 'goal', label: 'Growth Goal', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Paediatric case created" nextStep="Open child growth chart for plotting."
    openLabel="Chart"
  />
);

// ============================================================
// 14. ADDICTION RECOVERY NUTRITION
// ============================================================
export const AddictionRecoveryNutrition = () => (
  <SpecialisedPage
    shellTitle="Addiction Recovery"
    icon={<Brain className="h-5 w-5" />}
    title="Addiction Recovery Nutrition"
    desc="Detox nutrition, recovery nutrition, nutritional rehabilitation and wellness programmes. Integrated with Addiction Services."
    ctaLabel="New Case"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'dx', label: 'Detox Nutrition', value: 'Detox Nutrition' },
      { key: 'rd', label: 'Recovery Diet', value: 'Recovery Diet' },
      { key: 'wl', label: 'Wellness', value: 'Wellness' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    kpis={[
      { l: 'Active Recovery Cases', v: ADDICTION.filter(a => a.status === 'Active').length + 14, i: Brain, tone: 'blue' },
      { l: 'Detox Nutrition', v: ADDICTION.filter(a => a.status === 'Detox Nutrition').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Recovery Diets', v: ADDICTION.filter(a => a.status === 'Recovery Diet').length + 9, i: Salad, tone: 'amber' },
      { l: 'Wellness Plans', v: ADDICTION.filter(a => a.status === 'Wellness').length + 12, i: HeartHandshake, tone: 'green' },
      { l: 'Review Due', v: ADDICTION.filter(a => a.status === 'Review Due').length + 3, i: Repeat, tone: 'purple' },
      { l: 'MDT Reviews', v: 4, i: Users, tone: 'teal' },
    ]}
    rows={ADDICTION}
    searchFields={(r) => `${r.patient} ${r.id} ${r.stage}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 's', header: 'Stage', render: r => r.stage },
      { key: 'f', header: 'Focus', render: r => r.focus },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'stage', label: 'Stage', type: 'select', options: ['Detox', 'Rehab', 'Aftercare'] },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Recovery nutrition case created" nextStep="Coordinate with Addiction Services team."
  />
);

// ============================================================
// 15. PSYCHOGERIATRIC NUTRITION
// ============================================================
export const PsychogeriatricNutrition = () => (
  <SpecialisedPage
    shellTitle="Psychogeriatric"
    icon={<Stethoscope className="h-5 w-5" />}
    title="Psychogeriatric Nutrition"
    desc="Elderly feeding plans, dementia nutrition, malnutrition prevention and dysphagia diet support. Integrated with Psychogeriatrics."
    ctaLabel="New Case"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'mr', label: 'Malnutrition Risk', value: 'Malnutrition Risk' },
      { key: 'dn', label: 'Dementia Nutrition', value: 'Dementia Nutrition' },
      { key: 'dy', label: 'Dysphagia', value: 'Dysphagia' },
      { key: 'rd', label: 'Review Due', value: 'Review Due' },
    ]}
    kpis={[
      { l: 'Active Elderly Cases', v: GERIATRIC.filter(g => g.status === 'Active').length + 22, i: Stethoscope, tone: 'blue' },
      { l: 'Malnutrition Risk', v: GERIATRIC.filter(g => g.status === 'Malnutrition Risk').length + 9, i: AlertTriangle, tone: 'rose' },
      { l: 'Dementia Nutrition', v: GERIATRIC.filter(g => g.status === 'Dementia Nutrition').length + 14, i: Brain, tone: 'purple' },
      { l: 'Dysphagia Diet', v: GERIATRIC.filter(g => g.status === 'Dysphagia').length + 6, i: Apple, tone: 'amber' },
      { l: 'Review Due', v: GERIATRIC.filter(g => g.status === 'Review Due').length + 3, i: Repeat, tone: 'orange' },
      { l: 'Home Caregivers Trained', v: 18, i: Home, tone: 'green' },
    ]}
    rows={GERIATRIC}
    searchFields={(r) => `${r.patient} ${r.id} ${r.focus}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'f', header: 'Focus', render: r => r.focus },
      { key: 'd', header: 'Dysphagia', render: r => <Chip label={r.dysphagia} t={r.dysphagia === 'Severe' ? 'red' : r.dysphagia === 'Moderate' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'dys', label: 'Dysphagia', type: 'select', options: ['No', 'Mild', 'Moderate', 'Severe'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Psychogeriatric nutrition case saved" nextStep="Coordinate with Psychogeriatrics ward."
  />
);

// ============================================================
// 16. COMMUNITY FOLLOW-UP
// ============================================================
export const CommunityNutrition = () => (
  <SpecialisedPage
    shellTitle="Community Follow-Up"
    icon={<Home className="h-5 w-5" />}
    title="Community Nutrition Follow-Up"
    desc="Community reviews, home nutrition monitoring, follow-up counselling and compliance tracking."
    ctaLabel="Schedule Visit"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'sc', label: 'Scheduled', value: 'Scheduled' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'hr', label: 'High Risk', value: 'High Risk' },
      { key: 'fu', label: 'Follow-Up Required', value: 'Follow-Up Required' },
    ]}
    kpis={[
      { l: 'Scheduled Visits', v: COMMUNITY.filter(c => c.status === 'Scheduled').length + 8, i: Calendar, tone: 'blue' },
      { l: 'Completed Visits', v: COMMUNITY.filter(c => c.status === 'Completed').length + 22, i: CheckCircle2, tone: 'green' },
      { l: 'Missed Visits', v: COMMUNITY.filter(c => c.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'High-Risk Cases', v: COMMUNITY.filter(c => c.status === 'High Risk').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Follow-Up Required', v: COMMUNITY.filter(c => c.status === 'Follow-Up Required').length + 5, i: Repeat, tone: 'purple' },
      { l: 'Active Community Cases', v: 38, i: Home, tone: 'teal' },
    ]}
    rows={COMMUNITY}
    searchFields={(r) => `${r.patient} ${r.id} ${r.visit}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'v', header: 'Visit Type', render: r => r.visit },
      { key: 'd', header: 'Date', render: r => r.date },
      { key: 'f', header: 'Focus', render: r => r.focus },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'visit', label: 'Visit Type', type: 'select', options: ['Home review', 'Community clinic', 'Home + school', 'Follow-up call'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'focus', label: 'Focus', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Community visit scheduled" nextStep="Visit added to dietitian schedule."
  />
);

// ============================================================
// 17. OUTPATIENT NUTRITION
// ============================================================
export const OutpatientNutrition = () => (
  <SpecialisedPage
    shellTitle="Outpatient Nutrition"
    icon={<Utensils className="h-5 w-5" />}
    title="Outpatient Nutrition Services"
    desc="Scheduled outpatient nutrition visits, diet planning and follow-up reviews."
    ctaLabel="Schedule Visit"
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'cf', label: 'Confirmed', value: 'Confirmed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'rs', label: 'Rescheduled', value: 'Rescheduled' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
    ]}
    kpis={[
      { l: 'Confirmed Visits', v: OUTPATIENT.filter(o => o.status === 'Confirmed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Visits', v: OUTPATIENT.filter(o => o.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Visits', v: OUTPATIENT.filter(o => o.status === 'Rescheduled').length + 3, i: Repeat, tone: 'orange' },
      { l: 'Completed Visits', v: OUTPATIENT.filter(o => o.status === 'Completed').length + 44, i: CheckCircle2, tone: 'blue' },
      { l: 'Missed Visits', v: OUTPATIENT.filter(o => o.status === 'Missed').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Attendance', v: '86%', i: TrendingUp, tone: 'teal' },
    ]}
    rows={OUTPATIENT}
    searchFields={(r) => `${r.patient} ${r.id} ${r.dietitian}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'sl', header: 'Slot', render: r => r.slot },
      { key: 'd', header: 'Dietitian', render: r => r.dietitian },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'diet', label: 'Dietitian', type: 'select', options: DIETITIANS },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Outpatient visit scheduled" nextStep="Visit added to dietitian's calendar."
  />
);

// ============================================================
// 18. FOLLOW-UP DASHBOARD
// ============================================================
export const NutritionFollowUp = () => (
  <SpecialisedPage
    shellTitle="Follow-Up Dashboard"
    icon={<Repeat className="h-5 w-5" />}
    title="Nutrition Follow-Up Management"
    desc="Upcoming reviews, missed reviews, diet compliance, feeding compliance, weight trends and nutrition outcomes."
    ctaLabel="Schedule Follow-Up"
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
    kpis={[
      { l: 'Follow-Ups Today', v: FOLLOWUPS.filter(f => f.status === 'Today').length + 3, i: Calendar, tone: 'blue' },
      { l: 'Confirmed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 6, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 4, i: Repeat, tone: 'orange' },
      { l: 'Missed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 5, i: AlertTriangle, tone: 'rose' },
      { l: 'Completed Follow-Ups', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 48, i: CheckCircle2, tone: 'teal' },
    ]}
    rows={FOLLOWUPS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.type}`}
    columns={[
      { key: 'id', header: 'ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Type', render: r => r.type },
      { key: 'd', header: 'Date', render: r => r.date },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Dysphagia diet review', 'Weight + intake review', 'Growth review', 'Recovery review', 'DASH plan review', 'Counselling follow-up'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'diet', label: 'Dietitian', type: 'select', options: DIETITIANS },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Patient and dietitian notified."
  />
);

// ============================================================
// 19. EMR TIMELINE
// ============================================================
export const NutritionTimeline = () => (
  <Shell title="EMR Timeline">
    <Section icon={<Calendar className="h-5 w-5" />} title="Unified EMR — Nutrition Timeline"
      desc="Chronological nutrition events: assessments, diet plans, feeding programmes, counselling sessions, growth monitoring and malnutrition reviews." />
    <Card>
      <ol className="space-y-3">
        {TIMELINE.map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="text-xs text-muted-foreground w-36 shrink-0">{t.when}</div>
            <Chip label={t.who} t={t.tone} />
            <div className="text-sm">{t.what}</div>
          </li>
        ))}
      </ol>
    </Card>
  </Shell>
);

// ============================================================
// 20. BILLING & NHIA
// ============================================================
export const NutritionBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="Nutrition Billing & NHIA Integration"
        desc="Assessment, diet plan, counselling, inpatient feeding, enteral feeding and therapeutic review billing with NHIA claims."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 168, i: CreditCard, tone: 'blue' },
          { l: 'Paid Invoices', v: INVOICES.filter(i => i.status === 'Paid').length + 114, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Invoices', v: INVOICES.filter(i => i.status === 'Pending').length + 16, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA Invoices', v: INVOICES.filter(i => i.status === 'NHIA' || i.nhia === 'Approved').length + 38, i: AlertTriangle, tone: 'purple' },
          { l: 'Outstanding Invoices', v: INVOICES.filter(i => i.status === 'Outstanding').length + 10, i: AlertTriangle, tone: 'rose' },
          { l: 'Feeding Bills', v: INVOICES.filter(i => i.status === 'Feeding').length + 22, i: BedDouble, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pd', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nh', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' || r.nhia === 'Approved' },
          { key: 'os', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'fd', label: 'Feeding', filter: (r: any) => r.status === 'Feeding' || r.service.toLowerCase().includes('feed') },
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
        newDialog={(close, n) => <SimpleForm close={close} notify={n}
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
// 21. RESEARCH
// ============================================================
export const NutritionResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="Nutrition Analytics Dashboard"
      desc="Malnutrition statistics, BMI distribution, child growth statistics, diet compliance, nutrition outcomes and departmental revenue." />
    <KpiGrid items={[
      { l: 'Active caseload', v: 186, i: Users, tone: 'amber' },
      { l: 'Severe malnutrition', v: 14, i: AlertTriangle, tone: 'rose' },
      { l: 'Drug-induced obesity', v: 38, i: AlertCircle, tone: 'amber' },
      { l: 'Paediatric growth', v: 52, i: Baby, tone: 'blue' },
      { l: 'Dysphagia diets', v: 29, i: Apple, tone: 'rose' },
      { l: 'Diet compliance', v: '78%', i: TrendingUp, tone: 'green' },
    ]} />
    <Card><div className="text-sm font-semibold mb-2">Research Indicators</div>
      <div className="text-sm text-muted-foreground">Linked dimensions: diagnosis, programme, age group, ward, NHIA status, referral source. Filters: date range, dietitian, condition.</div>
    </Card>
  </Shell>
);

// ============================================================
// 22. REPORTING CENTER
// ============================================================
export const NutritionReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '30d', notes: '' });
  const TYPES = ['Nutrition Assessment Report', 'Malnutrition Report', 'Diet Plan Report', 'Feeding Report', 'Allergy Report', 'Child Nutrition Report', 'Billing Report'];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="Nutrition Reporting Center"
        desc="Generate assessment, malnutrition, diet plan, feeding, allergy, child nutrition and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 124, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 6, i: AlertCircle, tone: 'amber' },
        { l: 'Feeding Reports', v: 38, i: BedDouble, tone: 'teal' },
        { l: 'Malnutrition Reports', v: 22, i: AlertTriangle, tone: 'rose' },
        { l: 'Diet Plan Reports', v: 34, i: Salad, tone: 'purple' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · Nutrition & Dietetics · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Active Patients</div><div className="font-semibold text-lg">186</div></div>
                  <div><div className="text-xs text-muted-foreground">Diet Plans</div><div className="font-semibold text-lg">128</div></div>
                  <div><div className="text-xs text-muted-foreground">Feeding Orders</div><div className="font-semibold text-lg">187</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(3120000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Severe malnutrition cases up 2 (paediatric weighting)</li>
                  <li>Diet plan compliance at 78% — up 4 pts</li>
                  <li>Counselling attendance steady at 88%</li>
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
// 23. COMMUNICATION CENTER
// ============================================================
export const NutritionComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'nur', l: 'Nursing' }, { k: 'phr', l: 'Pharmacy' },
    { k: 'sw', l: 'Social Work' }, { k: 'slt', l: 'Speech Therapy' },
    { k: 'pg', l: 'Psychogeriatrics' }, { k: 'cap', l: 'Child Psychiatry' }, { k: 'cat', l: 'Catering' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', nur: 'nursing', phr: 'pharmacy', sw: 'social', slt: 'speech', pg: 'psychogeriatrics', cap: 'child', cat: 'catering' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="Nutrition Communication Center"
        desc="Secure messaging with Doctor, Nursing, Pharmacy, Social Work, Speech Therapy, Psychogeriatrics, Child Psychiatry and Catering — patient-linked threads, attachments and urgent alerts."
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
        { l: 'Urgent', v: THREADS.filter(t => t.urgent).length, i: AlertTriangle, tone: 'rose' },
        { l: 'Patient-linked', v: THREADS.length, i: Users, tone: 'purple' },
        { l: 'Attachments', v: 11, i: Paperclip, tone: 'blue' },
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
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — updating diet plan and care chart.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach the latest nutrition assessment.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'nutrition-assessment.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 24. CRITICAL ALERTS
// ============================================================
export const NutritionAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const [actOn, setActOn] = useState<typeof ALERTS[0] | null>(null);
  const [form, setForm] = useState({ action: '', assigned: '', notes: '' });
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 'sv', l: 'Severe Allergy', f: (a: any) => a.status === 'Severe Allergy' },
    { k: 'mn', l: 'Malnutrition Risk', f: (a: any) => a.status === 'Malnutrition Risk' },
    { k: 'mf', l: 'Missed Feeding', f: (a: any) => a.status === 'Missed Feeding' },
    { k: 'dr', l: 'Diet Restriction', f: (a: any) => a.status === 'Diet Restriction' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Nutrition Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Nutrition Alerts"
        desc="Severe allergy, high malnutrition risk, missed feeding, diet restriction breaches and refeeding risks requiring immediate action."
        action={<Button onClick={() => notify({ title: 'All alerts acknowledged', message: `${filtered.length} alerts acknowledged.`, nextStep: 'Alerts moved to the Acknowledged tab.' })}><CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge All</Button>}
      />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 2, i: AlertTriangle, tone: 'red' },
        { l: 'Severe Allergy', v: ALERTS.filter(a => a.status === 'Severe Allergy').length + 3, i: AlertTriangle, tone: 'rose' },
        { l: 'High Malnutrition Risk', v: ALERTS.filter(a => a.status === 'Malnutrition Risk').length + 5, i: ShieldAlert, tone: 'orange' },
        { l: 'Missed Feeding', v: ALERTS.filter(a => a.status === 'Missed Feeding').length + 4, i: BedDouble, tone: 'amber' },
        { l: 'Diet Restriction Alerts', v: ALERTS.filter(a => a.status === 'Diet Restriction').length + 3, i: HeartHandshake, tone: 'purple' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Severe Allergy' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" onClick={() => setActOn(a)}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Act</Button>
                      <Button size="sm" variant="outline" onClick={() => nav(`${base}/diet-plans`)}><Users className="h-3.5 w-3.5 mr-1" /> Open Patient</Button>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      {actOn && (
        <Dialog open onOpenChange={v => !v && setActOn(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Alert Action · {actOn.patient}</DialogTitle><DialogDescription>{actOn.type}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Patient</Label><Input value={actOn.patient} readOnly /></div>
              <div><Label>Alert Type</Label><Input value={actOn.type} readOnly /></div>
              <div><Label>Required Action</Label>
                <Select value={form.action} onValueChange={v => setForm({ ...form, action: v })}>
                  <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                  <SelectContent>{['Update diet plan', 'Escalate to doctor', 'Notify pharmacy', 'Broadcast allergy alert', 'Schedule review', 'Dispatch dietitian'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assigned Staff</Label>
                <Select value={form.assigned} onValueChange={v => setForm({ ...form, assigned: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{DIETITIANS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setActOn(null)}>Cancel</Button>
              <Button onClick={() => {
                if (!form.action) return toast.error('Select a required action');
                setActOn(null);
                notify({ title: 'Action recorded', message: `${actOn.patient} · ${form.action}`, nextStep: 'Assigned staff notified.' });
              }}>Submit Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {node}
    </Shell>
  );
};

// ============================================================
// 25. OFFLINE & SYNC
// ============================================================
export const NutritionOffline = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Offline & Sync">
      <Section icon={<WifiOff className="h-5 w-5" />} title="Offline & Connectivity Resilience"
        desc="Offline indicator, pending sync queue, auto-saved drafts, local recovery and connection-restored notifications — for bedside reviews and community visits." />
      <div className="grid md:grid-cols-4 gap-3 mb-5">
        <Card><div className="text-xs text-muted-foreground">Connection</div><div className="mt-1"><Chip label="Online" t="green" /></div></Card>
        <Card><div className="text-xs text-muted-foreground">Pending Sync</div><div className="text-2xl font-display font-bold text-warning mt-1">2</div></Card>
        <Card><div className="text-xs text-muted-foreground">Auto-saved Drafts</div><div className="text-2xl font-display font-bold text-primary mt-1">4</div></Card>
        <Card><div className="text-xs text-muted-foreground">Last Sync</div><div className="text-sm font-semibold mt-1">2 min ago</div></Card>
      </div>
      <Card>
        <div className="text-sm font-semibold mb-3">Pending Sync Queue</div>
        <Table>
          <TableHeader><TableRow>{['ID', 'Type', 'Item', 'State', ''].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {OFFLINE.map(o => (
              <TableRow key={o.id}>
                <TableCell>{o.id}</TableCell>
                <TableCell><Chip label={o.kind} t="blue" /></TableCell>
                <TableCell>{o.item}</TableCell>
                <TableCell>{o.state}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => notify({ title: 'Sync queued', message: o.item })}>Sync</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {node}
    </Shell>
  );
};

// ============================================================
// 26. MOBILE
// ============================================================
export const NutritionMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Mobile & Tablet Workspace"
      desc="Optimised interfaces for bedside reviews, ward feeding rounds, counselling, growth monitoring and community visits. Works as a PWA on tablet and phone." />
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
// 27. CONFIG
// ============================================================
export const NutritionConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="Nutrition Config">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · Nutrition Configuration"
        desc="Manage diet categories, therapeutic diet plans, meal templates, feeding schedules, assessment templates, BMI classifications, malnutrition tools, allergy library, catering menus, billing templates and NHIA mapping." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'Diet Categories', 'Therapeutic Diet Plans', 'Meal Templates',
          'Feeding Schedules', 'Assessment Templates', 'BMI Classifications',
          'Malnutrition Tools', 'Food Allergy Library', 'Catering Menus',
          'Nutrition Billing Templates', 'NHIA Mapping', 'Research Indicators',
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
