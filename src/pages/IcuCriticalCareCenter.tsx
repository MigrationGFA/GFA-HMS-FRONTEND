import { useState, useMemo, useEffect, ReactNode } from 'react';
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
import { useDbTick } from '@/contexts/DatabaseProvider';
import { db } from '@/db/database';
import { ApiError } from '@/lib/api/client';
import {
  isImagingApiEnabled,
  listConsumerImagingResults,
  type ApiConsumerResult,
} from '@/lib/api/imaging';
import {
  LayoutDashboard, ClipboardList, FilePlus, Users, HeartPulse, Activity, BarChart3, CreditCard,
  MessageSquare, Smartphone, Settings2, AlertTriangle, FileText, Repeat, BedDouble, Stethoscope,
  Send, Calendar, Pill, FlaskConical, ScanLine, Salad, Bone, Siren, Wind, ShieldAlert,
  ClipboardCheck, GitBranch, DoorClosed, TrendingUp, Skull, ListChecks, CheckCircle2, Search,
  Printer, Download, Eye, Bell, Plus, Paperclip, AlertCircle, CalendarDays, BookOpen, ScrollText,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';

const base = '/dashboard/icu';

export const icuNav = [
  { label: 'ICU Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'ICU Admission Center', path: `${base}/admissions`, icon: <FilePlus className="h-4 w-4" /> },
  { label: 'ICU & HDU Beds', path: `${base}/beds`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Observation Center', path: `${base}/observation`, icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'ICU Charts', path: `${base}/charts`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Ventilator Management', path: `${base}/ventilator`, icon: <Wind className="h-4 w-4" /> },
  { label: 'Code Blue & Rapid Response', path: `${base}/code-blue`, icon: <Siren className="h-4 w-4" /> },
  { label: 'ICU Medication', path: `${base}/medication`, icon: <Pill className="h-4 w-4" /> },
  { label: 'ICU Laboratory', path: `${base}/laboratory`, icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'ICU Radiology', path: `${base}/radiology`, icon: <ScanLine className="h-4 w-4" /> },
  { label: 'ICU Nutrition', path: `${base}/nutrition`, icon: <Salad className="h-4 w-4" /> },
  { label: 'ICU Rehabilitation', path: `${base}/rehab`, icon: <Bone className="h-4 w-4" /> },
  { label: 'Shift Handover', path: `${base}/handover`, icon: <Repeat className="h-4 w-4" /> },
  { label: 'ICU Care Plans', path: `${base}/care-plans`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'ICU Transfers', path: `${base}/transfers`, icon: <GitBranch className="h-4 w-4" /> },
  { label: 'ICU Discharge', path: `${base}/discharge`, icon: <DoorClosed className="h-4 w-4" /> },
  { label: 'Billing & NHIA', path: `${base}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'ICU Analytics', path: `${base}/analytics`, icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Mortality & Morbidity', path: `${base}/mortality`, icon: <Skull className="h-4 w-4" /> },
  { label: 'Research & Statistics', path: `${base}/research`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'EMR Timeline', path: `${base}/timeline`, icon: <Calendar className="h-4 w-4" /> },
  { label: 'Follow-Up Dashboard', path: `${base}/followup`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Staff Productivity', path: `${base}/productivity`, icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${base}/alerts`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Mobile / Tablet', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'ICU Configuration', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: ReactNode }) => (
  <DashboardLayout navItems={icuNav} title={`ICU / Critical Care · ${title}`}>{children}</DashboardLayout>
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
// Dummy data — GFA HMS ICU / Critical Care
// ============================================================
const PATIENTS = [
  { id: 'ICU-2026-001', name: 'Mr. Chidi Eze', age: 54, sex: 'M', dx: 'Acute psychosis + aspiration pneumonia' },
  { id: 'ICU-2026-002', name: 'Mrs. Funke Adeyemi', age: 41, sex: 'F', dx: 'NMS — post lithium toxicity' },
  { id: 'ICU-2026-003', name: 'Mr. Yusuf Aliyu', age: 32, sex: 'M', dx: 'Opioid OD — post-naloxone' },
  { id: 'ICU-2026-004', name: 'Pa Adebayo Odunsi', age: 78, sex: 'M', dx: 'Delirium + sepsis' },
  { id: 'ICU-2026-005', name: 'Master Tunde Bakare', age: 12, sex: 'M', dx: 'Status epilepticus' },
  { id: 'ICU-2026-006', name: 'Ms. Halima Yusuf', age: 28, sex: 'F', dx: 'Paraquat poisoning' },
  { id: 'ICU-2026-007', name: 'Mr. Femi Ojo', age: 47, sex: 'M', dx: 'Alcohol withdrawal seizures' },
  { id: 'ICU-2026-008', name: 'Mrs. Bisi Akande', age: 62, sex: 'F', dx: 'Cardiogenic shock — post-ECT' },
];

const ADMISSIONS = [
  { id: 'ADM-ICU-101', patient: 'Ms. Halima Yusuf', source: 'A&E', dx: 'Paraquat poisoning', vent: 'Yes', crit: 'Critical', status: 'Approved', doctor: 'Dr. Okafor' },
  { id: 'ADM-ICU-102', patient: 'Master Tunde Bakare', source: 'Paediatric Ward', dx: 'Status epilepticus', vent: 'Yes', crit: 'Critical', status: 'Approved', doctor: 'Dr. Aluko' },
  { id: 'ADM-ICU-103', patient: 'Mr. Femi Ojo', source: 'GMPC', dx: 'Alcohol withdrawal', vent: 'No', crit: 'Stable', status: 'Approved', doctor: 'Dr. Adesina' },
  { id: 'ADM-ICU-104', patient: 'Mrs. Bisi Akande', source: 'Theatre (post-ECT)', dx: 'Cardiogenic shock', vent: 'Yes', crit: 'Critical', status: 'Approved', doctor: 'Dr. Sowemimo' },
  { id: 'ADM-ICU-105', patient: 'Pa Adebayo Odunsi', source: 'Psychogeriatric Ward', dx: 'Delirium + sepsis', vent: 'No', crit: 'High Dependency', status: 'Pending', doctor: 'Dr. Sowemimo' },
  { id: 'ADM-ICU-106', patient: 'Mr. Chidi Eze', source: 'Male Ward', dx: 'Aspiration pneumonia', vent: 'Yes', crit: 'Critical', status: 'Approved', doctor: 'Dr. Balogun' },
  { id: 'ADM-ICU-107', patient: 'Mr. Yusuf Aliyu', source: 'A&E', dx: 'Opioid overdose', vent: 'No', crit: 'High Dependency', status: 'Pending', doctor: 'Dr. Adesina' },
];

const BEDS = [
  { id: 'ICU-1', unit: 'ICU', kind: 'Ventilated', patient: 'Mrs. Funke Adeyemi', team: 'Dr. Balogun', status: 'Occupied' },
  { id: 'ICU-2', unit: 'ICU', kind: 'Standard', patient: 'Mr. Yusuf Aliyu', team: 'Dr. Adesina', status: 'Occupied' },
  { id: 'ICU-3', unit: 'ICU', kind: 'Ventilated', patient: 'Mr. Chidi Eze', team: 'Dr. Okafor', status: 'Occupied' },
  { id: 'ICU-4', unit: 'ICU', kind: 'Paediatric', patient: 'Master Tunde Bakare', team: 'Dr. Aluko', status: 'Occupied' },
  { id: 'ICU-5', unit: 'ICU', kind: 'Ventilated', patient: 'Ms. Halima Yusuf', team: 'Dr. Okafor', status: 'Occupied' },
  { id: 'ICU-6', unit: 'ICU', kind: 'Isolation', patient: 'Mrs. Bisi Akande', team: 'Dr. Sowemimo', status: 'Occupied' },
  { id: 'ICU-7', unit: 'ICU', kind: 'Standard', patient: '—', team: '—', status: 'Available' },
  { id: 'ICU-8', unit: 'ICU', kind: 'Standard', patient: '—', team: '—', status: 'Reserved' },
  { id: 'HDU-1', unit: 'HDU', kind: 'Standard', patient: 'Pa Adebayo Odunsi', team: 'Dr. Sowemimo', status: 'Occupied' },
  { id: 'HDU-2', unit: 'HDU', kind: 'Standard', patient: 'Mr. Femi Ojo', team: 'Dr. Adesina', status: 'Occupied' },
  { id: 'HDU-3', unit: 'HDU', kind: 'Standard', patient: '—', team: '—', status: 'Cleaning' },
  { id: 'HDU-4', unit: 'HDU', kind: 'Standard', patient: '—', team: '—', status: 'Maintenance' },
];

const OBSERVATIONS = [
  { id: 'OBS-001', patient: 'Mr. Chidi Eze', time: '12:00', t: '38.1', p: '118', bp: '95/58', rr: '28', spo2: '92%', gcs: '8', uo: '32ml', status: 'Critical' },
  { id: 'OBS-002', patient: 'Mrs. Funke Adeyemi', time: '12:00', t: '37.4', p: '102', bp: '110/70', rr: '22', spo2: '94%', gcs: '11', uo: '45ml', status: 'Abnormal' },
  { id: 'OBS-003', patient: 'Mr. Yusuf Aliyu', time: '12:00', t: '37.0', p: '88', bp: '120/76', rr: '18', spo2: '97%', gcs: '13', uo: '60ml', status: 'Completed' },
  { id: 'OBS-004', patient: 'Pa Adebayo Odunsi', time: '12:00', t: '38.5', p: '124', bp: '100/62', rr: '26', spo2: '90%', gcs: '12', uo: '28ml', status: 'Critical' },
  { id: 'OBS-005', patient: 'Master Tunde Bakare', time: '12:00', t: '37.2', p: '110', bp: '105/68', rr: '24', spo2: '93%', gcs: '9', uo: '40ml', status: 'Abnormal' },
  { id: 'OBS-006', patient: 'Mr. Femi Ojo', time: '12:00', t: '37.1', p: '92', bp: '128/82', rr: '20', spo2: '96%', gcs: '14', uo: '55ml', status: 'Pending' },
];

const CHARTS = [
  { id: 'CHT-001', patient: 'Mr. Chidi Eze', kind: 'ICU Observation Chart', updated: 'Today 12:00', nurse: 'N. Ade' },
  { id: 'CHT-002', patient: 'Mr. Chidi Eze', kind: 'ICU Medication Chart', updated: 'Today 11:30', nurse: 'N. Bisi' },
  { id: 'CHT-003', patient: 'Mrs. Funke Adeyemi', kind: 'ICU Fluid Balance Chart', updated: 'Today 11:45', nurse: 'N. Ade' },
  { id: 'CHT-004', patient: 'Mr. Chidi Eze', kind: 'ICU Turning Chart', updated: 'Today 10:00', nurse: 'N. Tope' },
  { id: 'CHT-005', patient: 'Ms. Halima Yusuf', kind: 'ICU SPO2 Chart', updated: 'Today 12:15', nurse: 'N. Bisi' },
  { id: 'CHT-006', patient: 'Master Tunde Bakare', kind: 'ICU Ventilator Chart', updated: 'Today 12:05', nurse: 'N. Femi' },
  { id: 'CHT-007', patient: 'Pa Adebayo Odunsi', kind: 'ICU Nursing Care Plan', updated: 'Today 09:00', nurse: 'N. Tope' },
  { id: 'CHT-008', patient: 'Mrs. Bisi Akande', kind: 'ICU Shift Summary', updated: 'Shift change 08:00', nurse: 'N. Ade' },
];

const VENTILATORS = [
  { id: 'VENT-1', patient: 'Mrs. Funke Adeyemi', mode: 'CPAP', fio2: '40%', peep: '5', rr: '16', vt: '420', alarm: 'Stable', review: 'Today' },
  { id: 'VENT-2', patient: 'Mr. Chidi Eze', mode: 'SIMV', fio2: '60%', peep: '8', rr: '18', vt: '450', alarm: 'High Alarm', review: 'Today' },
  { id: 'VENT-3', patient: 'Ms. Halima Yusuf', mode: 'PSV', fio2: '55%', peep: '6', rr: '20', vt: '400', alarm: 'Moderate Alarm', review: 'Tomorrow' },
  { id: 'VENT-4', patient: 'Master Tunde Bakare', mode: 'SIMV', fio2: '45%', peep: '5', rr: '22', vt: '320', alarm: 'Stable', review: 'Today' },
  { id: 'VENT-5', patient: 'Mrs. Bisi Akande', mode: 'AC', fio2: '70%', peep: '10', rr: '20', vt: '430', alarm: 'High Alarm', review: 'Today' },
  { id: 'VENT-6', patient: 'Mr. Femi Ojo (weaning)', mode: 'PSV', fio2: '30%', peep: '5', rr: '14', vt: '460', alarm: 'Weaning', review: 'Today' },
];

const CODE_BLUE = [
  { id: 'CB-101', patient: 'Mrs. Bisi Akande', location: 'ICU-6', event: 'Cardiac arrest', team: 'Code team + Anaesthesia', status: 'Resolved', time: '08:42' },
  { id: 'CB-102', patient: 'Ms. Halima Yusuf', location: 'ICU-5', event: 'Respiratory arrest', team: 'Code team', status: 'Active', time: '12:18' },
  { id: 'CB-103', patient: 'Mr. Chidi Eze', location: 'ICU-3', event: 'Desaturation', team: 'Rapid response', status: 'Rapid Response', time: '11:50' },
  { id: 'CB-104', patient: 'Pa Adebayo Odunsi', location: 'HDU-1', event: 'Hypotension', team: 'Rapid response', status: 'Pending Documentation', time: '10:05' },
  { id: 'CB-105', patient: 'Master Tunde Bakare', location: 'ICU-4', event: 'Seizure', team: 'Code team', status: 'Critical', time: '09:20' },
];

const MEDICATIONS = [
  { id: 'MED-101', patient: 'Mr. Chidi Eze', drug: 'Piperacillin-tazobactam 4.5g IV q8h', route: 'IV', status: 'Active', risk: 'Standard' },
  { id: 'MED-102', patient: 'Mrs. Funke Adeyemi', drug: 'Noradrenaline 0.1 mcg/kg/min', route: 'Infusion', status: 'Infusion', risk: 'High Risk' },
  { id: 'MED-103', patient: 'Ms. Halima Yusuf', drug: 'N-acetylcysteine STAT', route: 'IV', status: 'Stat', risk: 'High Risk' },
  { id: 'MED-104', patient: 'Master Tunde Bakare', drug: 'Levetiracetam 500mg IV bd', route: 'IV', status: 'Due', risk: 'Standard' },
  { id: 'MED-105', patient: 'Pa Adebayo Odunsi', drug: 'Vancomycin 1g IV q12h', route: 'IV', status: 'Missed', risk: 'High Risk' },
  { id: 'MED-106', patient: 'Mrs. Bisi Akande', drug: 'Dopamine infusion 5 mcg/kg/min', route: 'Infusion', status: 'Infusion', risk: 'High Risk' },
  { id: 'MED-107', patient: 'Mr. Femi Ojo', drug: 'Diazepam 10mg PRN', route: 'IV', status: 'Active', risk: 'Standard' },
];

const LABS = [
  { id: 'LAB-201', patient: 'Mr. Chidi Eze', test: 'ABG + Lactate', priority: 'Stat', status: 'Critical', flag: 'Critical' },
  { id: 'LAB-202', patient: 'Mrs. Funke Adeyemi', test: 'CK, Lithium level', priority: 'Stat', status: 'Completed', flag: 'High' },
  { id: 'LAB-203', patient: 'Ms. Halima Yusuf', test: 'LFT, U+E, paraquat assay', priority: 'Stat', status: 'Pending', flag: '—' },
  { id: 'LAB-204', patient: 'Master Tunde Bakare', test: 'EEG + Mg, Ca', priority: 'Urgent', status: 'Completed', flag: '—' },
  { id: 'LAB-205', patient: 'Pa Adebayo Odunsi', test: 'Blood culture × 2', priority: 'Urgent', status: 'Pending', flag: '—' },
  { id: 'LAB-206', patient: 'Mrs. Bisi Akande', test: 'Troponin + BNP', priority: 'Stat', status: 'Critical', flag: 'Critical' },
];

const NUTRITION = [
  { id: 'NUT-401', patient: 'Mr. Chidi Eze', plan: 'NG enteral feeds 1.5kcal/ml @ 60ml/hr', kind: 'Enteral', status: 'Active', review: 'Today' },
  { id: 'NUT-402', patient: 'Mrs. Funke Adeyemi', plan: 'NG semi-elemental @ 50ml/hr', kind: 'Tube Feeding', status: 'Active', review: 'Tomorrow' },
  { id: 'NUT-403', patient: 'Ms. Halima Yusuf', plan: 'TPN central line', kind: 'Active', status: 'Intolerance', review: 'Today' },
  { id: 'NUT-404', patient: 'Master Tunde Bakare', plan: 'Paediatric NG feeds', kind: 'Enteral', status: 'Review Due', review: 'Today' },
  { id: 'NUT-405', patient: 'Pa Adebayo Odunsi', plan: 'NG soft diet trial', kind: 'Tube Feeding', status: 'Active', review: 'Tomorrow' },
];

const REHAB = [
  { id: 'REH-501', patient: 'Mr. Chidi Eze', kind: 'Respiratory Therapy', therapist: 'PT. Bukola', status: 'Today', notes: 'Chest physio' },
  { id: 'REH-502', patient: 'Mrs. Funke Adeyemi', kind: 'Early Mobilization', therapist: 'PT. Bukola', status: 'Today', notes: 'Passive ROM' },
  { id: 'REH-503', patient: 'Mr. Yusuf Aliyu', kind: 'Early Mobilization', therapist: 'PT. Bukola', status: 'Completed', notes: 'Sit-out 30 min' },
  { id: 'REH-504', patient: 'Master Tunde Bakare', kind: 'Respiratory Therapy', therapist: 'PT. Aluko', status: 'Pending', notes: 'Suction + neb' },
  { id: 'REH-505', patient: 'Pa Adebayo Odunsi', kind: 'Early Mobilization', therapist: 'PT. Bukola', status: 'Today', notes: 'Bed exercises' },
];

const HANDOVER = [
  { id: 'HND-601', patient: 'Mr. Chidi Eze', from: 'Night Shift', to: 'Morning Shift', priority: 'High Priority', status: 'Pending Sign-Off', notes: 'Sats trending down — review at 09:00' },
  { id: 'HND-602', patient: 'Mrs. Funke Adeyemi', from: 'Morning', to: 'Evening', priority: 'Medium Priority', status: 'Completed', notes: 'Stable on noradrenaline' },
  { id: 'HND-603', patient: 'Ms. Halima Yusuf', from: 'Night', to: 'Morning', priority: 'High Priority', status: 'Completed', notes: 'Paraquat — escalate if SpO2 < 92%' },
  { id: 'HND-604', patient: 'Pa Adebayo Odunsi', from: 'Morning', to: 'Evening', priority: 'Low Priority', status: 'Completed', notes: 'Stable HDU' },
  { id: 'HND-605', patient: 'Mrs. Bisi Akande', from: 'Night', to: 'Morning', priority: 'High Priority', status: 'Pending Sign-Off', notes: 'Cardiogenic shock — cardio review pending' },
  { id: 'HND-606', patient: 'Mr. Femi Ojo', from: 'Morning', to: 'Evening', priority: 'Low Priority', status: 'Pending Sign-Off', notes: 'Weaning, monitor' },
];

const CARE_PLANS = [
  { id: 'CP-701', patient: 'Mr. Chidi Eze', kind: 'Multidisciplinary', goals: 'Wean vent in 72h', status: 'Active', review: '2026-06-04' },
  { id: 'CP-702', patient: 'Mrs. Funke Adeyemi', kind: 'Multidisciplinary', goals: 'Off pressors in 48h', status: 'Active', review: '2026-06-03' },
  { id: 'CP-703', patient: 'Ms. Halima Yusuf', kind: 'Multidisciplinary', goals: 'Antidote protocol + monitor', status: 'Active', review: '2026-06-03' },
  { id: 'CP-704', patient: 'Mr. Yusuf Aliyu', kind: 'Standard', goals: 'Step-down ready', status: 'Pending Review', review: '2026-06-04' },
  { id: 'CP-705', patient: 'Pa Adebayo Odunsi', kind: 'Multidisciplinary', goals: 'Sepsis bundle complete', status: 'Active', review: '2026-06-03' },
  { id: 'CP-706', patient: 'Master Tunde Bakare', kind: 'Standard', goals: 'Seizure-free 48h', status: 'Completed', review: '2026-06-02' },
];

const TRANSFERS = [
  { id: 'TRN-801', patient: 'Mr. Yusuf Aliyu', from: 'HDU-2', to: 'Male Ward', reason: 'Step-down', status: 'Approved' },
  { id: 'TRN-802', patient: 'Mr. Femi Ojo', from: 'HDU-2', to: 'GMPC', reason: 'Detox continuation', status: 'Scheduled' },
  { id: 'TRN-803', patient: 'Master Tunde Bakare', from: 'ICU-4', to: 'Paediatric Ward', reason: 'Stable post-status', status: 'Pending' },
  { id: 'TRN-804', patient: 'Pa Adebayo Odunsi', from: 'HDU-1', to: 'Psychogeriatric Ward', reason: 'Step-down', status: 'Approved' },
  { id: 'TRN-805', patient: 'Mr. Sola Adebayo', from: 'ICU-7', to: 'Male Ward', reason: 'Step-down', status: 'Completed' },
  { id: 'TRN-806', patient: 'Mrs. Bisi Akande', from: 'ICU-6', to: 'Cardiology (FMC)', reason: 'External referral', status: 'Rejected' },
];

const DISCHARGES = [
  { id: 'DIS-901', patient: 'Mr. Yusuf Aliyu', plan: 'Step-down to Male Ward', readiness: '85%', status: 'Step-Down', review: '2026-06-04' },
  { id: 'DIS-902', patient: 'Mrs. Funke Adeyemi', plan: 'Ward Transfer — Female Ward', readiness: '70%', status: 'Ward Transfer', review: '2026-06-04' },
  { id: 'DIS-903', patient: 'Master Tunde Bakare', plan: 'Paediatric Ward', readiness: '90%', status: 'Pending', review: '2026-06-03' },
  { id: 'DIS-904', patient: 'Mr. Femi Ojo', plan: 'GMPC continuation', readiness: '95%', status: 'Completed', review: '2026-06-02' },
  { id: 'DIS-905', patient: 'Pa Adebayo Odunsi', plan: 'Psychogeriatric Ward', readiness: '80%', status: 'Review Due', review: '2026-06-04' },
];

const INVOICES = [
  { id: 'INV-ICU-901', patient: 'Mr. Chidi Eze', service: 'ICU bed × 4 days + ventilator', amount: 480000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-ICU-902', patient: 'Mrs. Funke Adeyemi', service: 'ICU bed × 2 days + pressors', amount: 240000, nhia: 'Approved', status: 'NHIA' },
  { id: 'INV-ICU-903', patient: 'Ms. Halima Yusuf', service: 'ICU bed × 3 days + ventilator', amount: 360000, nhia: 'Pending', status: 'Pending' },
  { id: 'INV-ICU-904', patient: 'Mr. Yusuf Aliyu', service: 'HDU bed × 2 days', amount: 120000, nhia: 'N/A', status: 'Outstanding' },
  { id: 'INV-ICU-905', patient: 'Pa Adebayo Odunsi', service: 'HDU bed × 5 days', amount: 280000, nhia: 'Approved', status: 'Paid' },
  { id: 'INV-ICU-906', patient: 'Mrs. Bisi Akande', service: 'ICU bed × 1 day + ECMO standby', amount: 320000, nhia: 'Pending', status: 'Bed Charges' },
  { id: 'INV-ICU-907', patient: 'Master Tunde Bakare', service: 'Ventilator × 3 days', amount: 180000, nhia: 'Approved', status: 'Ventilator' },
];

const THREADS = [
  { id: 'TH-1', with: 'Dr. Balogun (Psychiatry)', dept: 'Doctor', patient: 'Mr. Chidi Eze', preview: 'Please review vent settings — SpO2 dropping.', time: '12:14', unread: 2, urgent: true },
  { id: 'TH-2', with: 'Nurse Adunola (ICU)', dept: 'Nursing', patient: 'Mrs. Funke Adeyemi', preview: 'Hourly obs uploaded.', time: '12:00', unread: 1, urgent: false },
  { id: 'TH-3', with: 'Lab — Dr. Yakubu', dept: 'Laboratory', patient: 'Mr. Chidi Eze', preview: 'Critical ABG result — pH 7.22.', time: '11:50', unread: 1, urgent: true },
  { id: 'TH-4', with: 'Radiology — Dr. Femi', dept: 'Radiology', patient: 'Mrs. Bisi Akande', preview: 'Echo done at bedside — EF 25%.', time: '11:30', unread: 0, urgent: true },
  { id: 'TH-5', with: 'Pharmacy', dept: 'Pharmacy', patient: 'Ms. Halima Yusuf', preview: 'NAC infusion prepared and dispatched.', time: '11:15', unread: 0, urgent: false },
  { id: 'TH-6', with: 'Dietetics', dept: 'Nutrition', patient: 'Mr. Chidi Eze', preview: 'NG feeds reviewed — increase to 60ml/hr.', time: '10:40', unread: 0, urgent: false },
  { id: 'TH-7', with: 'PT. Bukola', dept: 'Physiotherapy', patient: 'Mrs. Funke Adeyemi', preview: 'Passive ROM completed.', time: '10:00', unread: 0, urgent: false },
  { id: 'TH-8', with: 'CMD Office', dept: 'Management', patient: '—', preview: 'ICU bed audit submitted.', time: '09:00', unread: 0, urgent: false },
];

const ALERTS = [
  { id: 'AL-1', patient: 'Mr. Chidi Eze', type: 'Ventilator high alarm', message: 'High PIP — review settings.', date: '2026-06-03 12:14', status: 'Ventilator' },
  { id: 'AL-2', patient: 'Mr. Chidi Eze', type: 'Critical lab (ABG)', message: 'pH 7.22, lactate 5.4 — escalate.', date: '2026-06-03 11:50', status: 'Laboratory' },
  { id: 'AL-3', patient: 'Ms. Halima Yusuf', type: 'Code Blue active', message: 'Respiratory arrest — code team in attendance.', date: '2026-06-03 12:18', status: 'Code Blue' },
  { id: 'AL-4', patient: 'Pa Adebayo Odunsi', type: 'Missed antibiotic', message: 'Vancomycin dose missed — confirm and re-dose.', date: '2026-06-03 10:00', status: 'Medication' },
  { id: 'AL-5', patient: 'Mrs. Bisi Akande', type: 'Critical Echo finding', message: 'EF 25% — cardiology consult triggered.', date: '2026-06-03 11:30', status: 'Critical' },
  { id: 'AL-6', patient: 'Mr. Femi Ojo', type: 'Acknowledged ack', message: 'Wean plan acknowledged.', date: '2026-06-03 09:20', status: 'Acknowledged' },
];

const FOLLOWUPS = [
  { id: 'FU-1', patient: 'Mr. Yusuf Aliyu', type: 'Step-down review', date: '2026-06-04', status: 'Confirmed' },
  { id: 'FU-2', patient: 'Mrs. Funke Adeyemi', type: 'Pressor wean review', date: '2026-06-03', status: 'Pending' },
  { id: 'FU-3', patient: 'Master Tunde Bakare', type: 'Paediatric ICU follow-up', date: '2026-06-05', status: 'Confirmed' },
  { id: 'FU-4', patient: 'Mr. Femi Ojo', type: 'Detox follow-up', date: '2026-06-04', status: 'Rescheduled' },
  { id: 'FU-5', patient: 'Pa Adebayo Odunsi', type: 'Sepsis follow-up', date: '2026-06-02', status: 'Missed' },
  { id: 'FU-6', patient: 'Mr. Sola Adebayo', type: 'Post-ICU clinic', date: '2026-06-01', status: 'Completed' },
];

const MORTALITY = [
  { id: 'MM-001', patient: 'Mr. Adekunle Ojo', dx: 'Septic shock', kind: 'Mortality', status: 'Pending', lead: 'Dr. Okafor' },
  { id: 'MM-002', patient: 'Mrs. Tope Akin', dx: 'NMS late presentation', kind: 'Mortality', status: 'Completed', lead: 'Dr. Balogun' },
  { id: 'MM-003', patient: 'Pa Bayo Lawal', dx: 'Pneumonia + delirium', kind: 'Morbidity', status: 'Completed', lead: 'Dr. Sowemimo' },
  { id: 'MM-004', patient: 'Mr. Ibrahim Musa', dx: 'Aspiration event', kind: 'Morbidity', status: 'Pending', lead: 'Dr. Adesina' },
  { id: 'MM-005', patient: 'Ms. Bukky Adeola', dx: 'Lithium toxicity', kind: 'QI Actions', status: 'Pending', lead: 'Dr. Balogun' },
];

const PRODUCTIVITY = [
  { id: 'PR-1', staff: 'Dr. Balogun', task: 'Round notes × 4 patients', kind: 'Pending Tasks', due: '14:00' },
  { id: 'PR-2', staff: 'Dr. Okafor', task: 'ABG review note', kind: 'Draft Notes', due: '12:30' },
  { id: 'PR-3', staff: 'N. Adunola', task: 'Hourly obs charting', kind: 'Active Staff', due: 'Live' },
  { id: 'PR-4', staff: 'Dr. Sowemimo', task: 'Discharge summary', kind: 'Due Reviews', due: '15:00' },
  { id: 'PR-5', staff: 'Dr. Adesina', task: 'Family meeting note', kind: 'Completed', due: 'Done' },
];

const SERVICE_TYPES = ['ICU Bed Day', 'HDU Bed Day', 'Ventilator Day', 'Pressors / Infusions', 'Code Blue Event', 'Bedside Echo', 'ICU Procedure'];

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
// 1. ICU DASHBOARD
// ============================================================
export const IcuDashboard = () => {
  const nav = useNavigate();
  const { notify, node } = useSuccess();
  const quick = [
    { l: 'ICU Admission', i: FilePlus, p: 'admissions' },
    { l: 'Bed Management', i: BedDouble, p: 'beds' },
    { l: 'Observation', i: HeartPulse, p: 'observation' },
    { l: 'ICU Charts', i: ClipboardList, p: 'charts' },
    { l: 'Ventilator', i: Wind, p: 'ventilator' },
    { l: 'Code Blue', i: Siren, p: 'code-blue' },
    { l: 'ICU Medication', i: Pill, p: 'medication' },
    { l: 'ICU Lab', i: FlaskConical, p: 'laboratory' },
    { l: 'ICU Radiology', i: ScanLine, p: 'radiology' },
    { l: 'ICU Nutrition', i: Salad, p: 'nutrition' },
    { l: 'ICU Rehab', i: Bone, p: 'rehab' },
    { l: 'Handover', i: Repeat, p: 'handover' },
    { l: 'Care Plans', i: ClipboardCheck, p: 'care-plans' },
    { l: 'Transfers', i: GitBranch, p: 'transfers' },
    { l: 'Discharge', i: DoorClosed, p: 'discharge' },
    { l: 'Reports', i: FileText, p: 'reports' },
    { l: 'Alerts', i: AlertTriangle, p: 'alerts' },
  ];
  return (
    <Shell title="Dashboard">
      <Section
        icon={<HeartPulse className="h-5 w-5" />}
        title="ICU / Critical Care Command Center"
        desc="GFA HMS · Intensive and high-dependency care · ventilator management, code blue, observation and multidisciplinary critical care workflows."
        action={
          <>
            <Button onClick={() => nav(`${base}/admissions?new=1`)}><FilePlus className="h-4 w-4 mr-1" /> Admit to ICU</Button>
            <Button variant="destructive" onClick={() => { nav(`${base}/code-blue?new=1`); toast.error('Code Blue activation requested', { description: 'Open Code Blue page to confirm.' }); }}>
              <Siren className="h-4 w-4 mr-1" /> Code Blue
            </Button>
          </>
        }
      />
      <KpiGrid items={[
        { l: 'ICU Admissions Today', v: ADMISSIONS.length, i: FilePlus, tone: 'blue' },
        { l: 'Critical Patients', v: ADMISSIONS.filter(a => a.crit === 'Critical').length, i: AlertTriangle, tone: 'rose' },
        { l: 'Stable Patients', v: ADMISSIONS.filter(a => a.crit === 'Stable').length + 3, i: CheckCircle2, tone: 'green' },
        { l: 'Ventilator Patients', v: VENTILATORS.length, i: Wind, tone: 'purple' },
        { l: 'Available ICU Beds', v: BEDS.filter(b => b.status === 'Available').length, i: BedDouble, tone: 'teal' },
        { l: 'Code Blue Events', v: CODE_BLUE.length, i: Siren, tone: 'rose' },
      ]} />
      <KpiGrid items={[
        { l: 'Pending Reviews', v: CARE_PLANS.filter(p => p.status === 'Pending Review').length + 4, i: ClipboardList, tone: 'amber' },
        { l: 'Pending Transfers', v: TRANSFERS.filter(t => t.status === 'Pending').length + 2, i: GitBranch, tone: 'amber' },
        { l: 'Pending Discharges', v: DISCHARGES.filter(d => d.status === 'Pending').length + 1, i: DoorClosed, tone: 'amber' },
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical' || a.status === 'Code Blue').length, i: AlertTriangle, tone: 'red' },
        { l: 'Occupied Beds', v: BEDS.filter(b => b.status === 'Occupied').length, i: BedDouble, tone: 'blue' },
        { l: 'Revenue (MTD)', v: formatCurrency(2840000), i: CreditCard, tone: 'green' },
      ]} />
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card><div className="text-sm font-semibold mb-3">Critical Patients</div>
          <div className="space-y-2">{ADMISSIONS.filter(a => a.crit === 'Critical').slice(0, 5).map(a => (
            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{a.patient}</div><div className="text-xs text-muted-foreground">{a.dx} · {a.doctor}</div></div>
              <Chip label={a.crit} t="red" />
            </div>))}</div>
        </Card>
        <Card><div className="text-sm font-semibold mb-3">Active Code Blue / Rapid Response</div>
          <div className="space-y-2">{CODE_BLUE.filter(c => c.status === 'Active' || c.status === 'Rapid Response').slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
              <div><div className="text-sm font-semibold">{c.patient}</div><div className="text-xs text-muted-foreground">{c.event} · {c.location}</div></div>
              <Chip label={c.status} t="red" />
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
      {node}
    </Shell>
  );
};

// ============================================================
// 2. ICU ADMISSION CENTER
// ============================================================
export const IcuAdmissionCenter = () => {
  const [selected, setSelected] = useState<typeof ADMISSIONS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="ICU Admission Center"
        icon={<FilePlus className="h-5 w-5" />}
        title="ICU Admission Center"
        desc="Admit critical patients to ICU/HDU. Triage by criticality, assign team, set ventilator and isolation requirements."
        ctaLabel="New Admission"
        kpis={[
          { l: 'New Admissions', v: ADMISSIONS.length + 24, i: FilePlus, tone: 'blue' },
          { l: 'Critical Admissions', v: ADMISSIONS.filter(a => a.crit === 'Critical').length + 8, i: AlertTriangle, tone: 'rose' },
          { l: 'High Dependency Cases', v: ADMISSIONS.filter(a => a.crit === 'High Dependency').length + 6, i: Activity, tone: 'amber' },
          { l: 'Stable ICU Cases', v: ADMISSIONS.filter(a => a.crit === 'Stable').length + 4, i: CheckCircle2, tone: 'green' },
          { l: 'Pending Admission', v: ADMISSIONS.filter(a => a.status === 'Pending').length + 3, i: AlertCircle, tone: 'amber' },
          { l: 'Approved Admissions', v: ADMISSIONS.filter(a => a.status === 'Approved').length + 18, i: CheckCircle2, tone: 'green' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'cr', label: 'Critical', filter: (r: any) => r.crit === 'Critical' },
          { key: 'hd', label: 'High Dependency', filter: (r: any) => r.crit === 'High Dependency' },
          { key: 'st', label: 'Stable', filter: (r: any) => r.crit === 'Stable' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'ap', label: 'Approved', filter: (r: any) => r.status === 'Approved' },
        ]}
        rows={ADMISSIONS}
        searchFields={(r: any) => `${r.patient} ${r.id} ${r.dx} ${r.source}`}
        columns={[
          { key: 'id', header: 'Adm ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 's', header: 'Source', render: r => r.source },
          { key: 'd', header: 'Diagnosis', render: r => r.dx },
          { key: 'v', header: 'Ventilator', render: r => r.vent },
          { key: 'c', header: 'Criticality', render: r => <Chip label={r.crit} t={r.crit === 'Critical' ? 'red' : r.crit === 'High Dependency' ? 'amber' : 'green'} /> },
          { key: 'st', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Approved' ? 'green' : 'amber'} /> },
        ]}
        rowActions={(r) => openBtn(() => setSelected(r))}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New ICU Admission" submitLabel="Admit Patient"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'source', label: 'Admission Source', type: 'select', options: ['A&E', 'Theatre (post-ECT)', 'Male Ward', 'Female Ward', 'Paediatric Ward', 'Psychogeriatric Ward', 'GMPC', 'External Referral'] },
            { k: 'dx', label: 'Diagnosis', type: 'textarea' },
            { k: 'crit', label: 'Criticality Level', type: 'select', options: ['Critical', 'High Dependency', 'Stable'] },
            { k: 'unit', label: 'ICU/HDU Type', type: 'select', options: ['ICU Standard', 'ICU Ventilated', 'ICU Isolation', 'ICU Paediatric', 'HDU Standard'] },
            { k: 'vent', label: 'Ventilator Required', type: 'select', options: ['Yes', 'No'] },
            { k: 'doctor', label: 'Assigned Doctor', type: 'select', options: ['Dr. Balogun', 'Dr. Okafor', 'Dr. Sowemimo', 'Dr. Adesina', 'Dr. Aluko'] },
            { k: 'nurse', label: 'Assigned Nurse', type: 'select', options: ['N. Adunola', 'N. Bisi', 'N. Tope', 'N. Femi', 'N. Ade'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Patient admitted to ICU" nextStep="Bed assigned. Open admission to start observation and care plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Admission · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Source', value: selected.source },
            { label: 'Diagnosis', value: selected.dx },
            { label: 'Criticality', value: <Chip label={selected.crit} t={selected.crit === 'Critical' ? 'red' : 'amber'} /> },
            { label: 'Ventilator', value: selected.vent },
            { label: 'Doctor', value: selected.doctor },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Admission rejected'); }}>Reject</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success(`${selected.id} approved`); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
              <Button onClick={() => { setSelected(null); toast.success('Bed assigned'); }}><BedDouble className="h-4 w-4 mr-1" /> Assign Bed</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 3. ICU & HDU BED MANAGEMENT
// ============================================================
export const IcuBedManagement = () => {
  const [selected, setSelected] = useState<typeof BEDS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="ICU & HDU Beds"
        icon={<BedDouble className="h-5 w-5" />}
        title="ICU & HDU Bed Management"
        desc="Live ICU and HDU bed map — assign, reserve, clean, schedule maintenance and track team allocation."
        ctaLabel="Assign Bed"
        kpis={[
          { l: 'Total Beds', v: BEDS.length, i: BedDouble, tone: 'blue' },
          { l: 'Available Beds', v: BEDS.filter(b => b.status === 'Available').length, i: CheckCircle2, tone: 'green' },
          { l: 'Occupied Beds', v: BEDS.filter(b => b.status === 'Occupied').length, i: Users, tone: 'rose' },
          { l: 'Reserved Beds', v: BEDS.filter(b => b.status === 'Reserved').length, i: ClipboardCheck, tone: 'purple' },
          { l: 'Cleaning Beds', v: BEDS.filter(b => b.status === 'Cleaning').length, i: Repeat, tone: 'amber' },
          { l: 'Maintenance Beds', v: BEDS.filter(b => b.status === 'Maintenance').length, i: Settings2, tone: 'orange' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'av', label: 'Available', filter: (r: any) => r.status === 'Available' },
          { key: 'oc', label: 'Occupied', filter: (r: any) => r.status === 'Occupied' },
          { key: 're', label: 'Reserved', filter: (r: any) => r.status === 'Reserved' },
          { key: 'cl', label: 'Cleaning', filter: (r: any) => r.status === 'Cleaning' },
          { key: 'mt', label: 'Maintenance', filter: (r: any) => r.status === 'Maintenance' },
        ]}
        rows={BEDS}
        searchFields={(r: any) => `${r.id} ${r.unit} ${r.kind} ${r.patient}`}
        columns={[
          { key: 'id', header: 'Bed', render: r => r.id },
          { key: 'u', header: 'Unit', render: r => r.unit },
          { key: 'k', header: 'Kind', render: r => r.kind },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 't', header: 'Team', render: r => r.team },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Available' ? 'green' : r.status === 'Occupied' ? 'sky' : r.status === 'Reserved' ? 'purple' : r.status === 'Cleaning' ? 'amber' : 'orange'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><Settings2 className="h-3.5 w-3.5 mr-1" /> Manage</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="Assign Bed" submitLabel="Assign"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 'bed', label: 'Bed', type: 'select', options: BEDS.filter(b => b.status === 'Available').map(b => `${b.id} (${b.kind})`) },
            { k: 'team', label: 'Care Team', type: 'select', options: ['Dr. Balogun', 'Dr. Okafor', 'Dr. Sowemimo', 'Dr. Adesina', 'Dr. Aluko'] },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Bed assigned" nextStep="Start hourly observation and care plan."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Bed · ${selected.id}`}
          sections={[
            { label: 'Unit', value: selected.unit },
            { label: 'Kind', value: selected.kind },
            { label: 'Patient', value: selected.patient },
            { label: 'Team', value: selected.team },
            { label: 'Status', value: selected.status },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Bed marked for cleaning'); }}>Mark Cleaning</Button>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Bed reserved'); }}>Reserve</Button>
              <Button onClick={() => { setSelected(null); toast.success('Bed released'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Release Bed</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 4. OBSERVATION CENTER
// ============================================================
export const IcuObservation = () => {
  const [selected, setSelected] = useState<typeof OBSERVATIONS[0] | null>(null);
  return (
    <>
      <WorkflowPage
        shellTitle="Observation Center"
        icon={<HeartPulse className="h-5 w-5" />}
        title="ICU Observation Center"
        desc="Hourly vital signs, GCS, fluid balance, pain scores and urine output. Auto-flag critical and abnormal observations."
        ctaLabel="New Observation"
        kpis={[
          { l: 'Observations Today', v: OBSERVATIONS.length + 96, i: HeartPulse, tone: 'blue' },
          { l: 'Critical Observations', v: OBSERVATIONS.filter(o => o.status === 'Critical').length + 6, i: AlertTriangle, tone: 'rose' },
          { l: 'Abnormal SPO2', v: 4, i: Activity, tone: 'orange' },
          { l: 'Abnormal BP', v: 5, i: Activity, tone: 'amber' },
          { l: 'Pending Observations', v: OBSERVATIONS.filter(o => o.status === 'Pending').length + 3, i: AlertCircle, tone: 'amber' },
          { l: 'Completed', v: OBSERVATIONS.filter(o => o.status === 'Completed').length + 88, i: CheckCircle2, tone: 'green' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'cr', label: 'Critical', filter: (r: any) => r.status === 'Critical' },
          { key: 'ab', label: 'Abnormal', filter: (r: any) => r.status === 'Abnormal' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'cp', label: 'Completed', filter: (r: any) => r.status === 'Completed' },
        ]}
        rows={OBSERVATIONS}
        searchFields={(r: any) => `${r.patient} ${r.id}`}
        columns={[
          { key: 'id', header: 'ID', render: r => r.id },
          { key: 'p', header: 'Patient', render: r => r.patient },
          { key: 'tm', header: 'Time', render: r => r.time },
          { key: 't', header: 'Temp °C', render: r => r.t },
          { key: 'p2', header: 'Pulse', render: r => r.p },
          { key: 'bp', header: 'BP', render: r => r.bp },
          { key: 'spo2', header: 'SPO2', render: r => r.spo2 },
          { key: 'gcs', header: 'GCS', render: r => r.gcs },
          { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical' ? 'red' : r.status === 'Abnormal' ? 'amber' : r.status === 'Completed' ? 'green' : 'blue'} /> },
        ]}
        rowActions={(r) => <Button size="sm" variant="outline" onClick={() => setSelected(r)}><ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Edit</Button>}
        newDialog={(close, notify) => <SimpleForm close={close} notify={notify}
          title="New Observation" submitLabel="Save Observation"
          fields={[
            { k: 'patient', label: 'Patient', type: 'patientPicker' },
            { k: 't', label: 'Temperature (°C)', type: 'text' },
            { k: 'p', label: 'Pulse', type: 'text' },
            { k: 'bp', label: 'BP', type: 'text' },
            { k: 'rr', label: 'Respiratory Rate', type: 'text' },
            { k: 'spo2', label: 'SPO2 (%)', type: 'text' },
            { k: 'gcs', label: 'GCS', type: 'text' },
            { k: 'pain', label: 'Pain Score', type: 'text' },
            { k: 'uo', label: 'Urine Output (ml/hr)', type: 'text' },
            { k: 'fluid', label: 'Fluid Input/Output', type: 'text' },
            { k: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          successTitle="Observation saved" nextStep="Critical values escalated to ICU team automatically."
        />}
      />
      {selected && (
        <DetailDialog open onOpenChange={(v) => !v && setSelected(null)}
          title={`Observation · ${selected.id}`}
          sections={[
            { label: 'Patient', value: selected.patient },
            { label: 'Time', value: selected.time },
            { label: 'Temperature', value: `${selected.t} °C` },
            { label: 'Pulse', value: selected.p },
            { label: 'BP', value: selected.bp },
            { label: 'Respiratory Rate', value: selected.rr },
            { label: 'SPO2', value: selected.spo2 },
            { label: 'GCS', value: selected.gcs },
            { label: 'Urine Output', value: selected.uo },
            { label: 'Status', value: <Chip label={selected.status} t={selected.status === 'Critical' ? 'red' : 'amber'} /> },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => { setSelected(null); toast.success('Doctor notified'); }}>Notify Doctor</Button>
              <Button onClick={() => { setSelected(null); toast.success('Observation saved'); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Save</Button>
            </>
          }
        />
      )}
    </>
  );
};

// ============================================================
// 5. ICU CHARTS
// ============================================================
export const IcuCharts = () => {
  const { notify, node } = useSuccess();
  const [selected, setSelected] = useState<typeof CHARTS[0] | null>(null);
  const CHART_KINDS = [
    'ICU Observation Chart', 'ICU Medication Chart', 'ICU Fluid Balance Chart',
    'ICU Turning Chart', 'ICU SPO2 Chart', 'ICU Ventilator Chart',
    'ICU Nursing Care Plan', 'ICU Shift Summary',
  ];
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(false);
  const filtered = tab === 'all' ? CHARTS : CHARTS.filter(c => c.kind === tab);
  return (
    <Shell title="ICU Charts">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="ICU Charts Workspace"
        desc="Open observation, medication, fluid balance, turning, SPO2, ventilator, nursing care plan and shift summary charts."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Open Chart</Button>}
      />
      <KpiGrid items={CHART_KINDS.slice(0, 6).map(k => ({ l: k, v: CHARTS.filter(c => c.kind === k).length, i: ClipboardCheck, tone: 'blue' }))} />
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            {CHART_KINDS.map(k => <TabsTrigger key={k} value={k}>{k.replace('ICU ', '')}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab}>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow>{['ID', 'Patient', 'Chart', 'Updated', 'Nurse', ''].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>{filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell><TableCell>{r.patient}</TableCell>
                    <TableCell>{r.kind}</TableCell><TableCell>{r.updated}</TableCell>
                    <TableCell>{r.nurse}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelected(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Open</Button></TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Open Chart</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {CHART_KINDS.map(k => (
              <Button key={k} variant="outline" className="justify-start text-xs" onClick={() => { setOpen(false); notify({ title: `${k} opened`, message: 'Chart workspace loaded.' }); }}>
                <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {k.replace('ICU ', '')}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {selected && (
        <DetailDialog open onOpenChange={v => !v && setSelected(null)}
          title={`${selected.kind} · ${selected.patient}`}
          sections={[
            { label: 'Chart', value: selected.kind },
            { label: 'Patient', value: selected.patient },
            { label: 'Updated', value: selected.updated },
            { label: 'Nurse', value: selected.nurse },
            { label: 'Latest Entry', value: 'See observation log — values within parameters.' },
            { label: 'Next Action', value: 'Continue hourly charting.' },
          ]}
          footer={
            <>
              <Button variant="outline" onClick={() => notify({ title: 'Chart printed', message: selected.kind })}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button onClick={() => { setSelected(null); notify({ title: 'Chart updated', message: selected.kind }); }}><CheckCircle2 className="h-4 w-4 mr-1" /> Save</Button>
            </>
          }
        />
      )}
      {node}
    </Shell>
  );
};

// ============================================================
// 6. VENTILATOR MANAGEMENT
// ============================================================
export const IcuVentilator = () => (
  <SpecialisedPage
    shellTitle="Ventilator Management" icon={<Wind className="h-5 w-5" />}
    title="ICU Ventilator Management"
    desc="Live ventilator status, alarm escalation, weaning plans and ventilator review."
    ctaLabel="Vent Review"
    kpis={[
      { l: 'Active Ventilators', v: VENTILATORS.length, i: Wind, tone: 'blue' },
      { l: 'High Alarm', v: VENTILATORS.filter(v => v.alarm === 'High Alarm').length, i: AlertTriangle, tone: 'rose' },
      { l: 'Moderate Alarm', v: VENTILATORS.filter(v => v.alarm === 'Moderate Alarm').length, i: AlertCircle, tone: 'amber' },
      { l: 'Stable Ventilation', v: VENTILATORS.filter(v => v.alarm === 'Stable').length, i: CheckCircle2, tone: 'green' },
      { l: 'Weaning Patients', v: VENTILATORS.filter(v => v.alarm === 'Weaning').length, i: TrendingUp, tone: 'purple' },
      { l: 'Review Due', v: VENTILATORS.filter(v => v.review === 'Today').length, i: ClipboardList, tone: 'amber' },
    ]}
    tabKey="alarm"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ha', label: 'High Alarm', value: 'High Alarm' },
      { key: 'ma', label: 'Moderate Alarm', value: 'Moderate Alarm' },
      { key: 'st', label: 'Stable', value: 'Stable' },
      { key: 'we', label: 'Weaning', value: 'Weaning' },
      { key: 'rv', label: 'Review Due', value: 'Stable' },
    ]}
    rows={VENTILATORS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.mode}`}
    columns={[
      { key: 'id', header: 'Vent', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'm', header: 'Mode', render: r => r.mode },
      { key: 'f', header: 'FiO2', render: r => r.fio2 },
      { key: 'pp', header: 'PEEP', render: r => r.peep },
      { key: 'r', header: 'RR', render: r => r.rr },
      { key: 'v', header: 'VT', render: r => r.vt },
      { key: 'a', header: 'Alarm', render: r => <Chip label={r.alarm} t={r.alarm === 'High Alarm' ? 'red' : r.alarm === 'Moderate Alarm' ? 'amber' : r.alarm === 'Stable' ? 'green' : 'purple'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'mode', label: 'Ventilator Mode', type: 'select', options: ['AC', 'SIMV', 'CPAP', 'PSV', 'BiPAP'] },
      { k: 'fio2', label: 'FiO2 (%)', type: 'text' },
      { k: 'peep', label: 'PEEP', type: 'text' },
      { k: 'rr', label: 'Respiratory Rate', type: 'text' },
      { k: 'vt', label: 'Tidal Volume', type: 'text' },
      { k: 'alarm', label: 'Alarm Status', type: 'select', options: ['Stable', 'Moderate Alarm', 'High Alarm', 'Weaning'] },
      { k: 'plan', label: 'Weaning Plan', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Ventilator review saved" nextStep="Settings adjusted. Hourly reassessment scheduled."
  />
);

// ============================================================
// 7. CODE BLUE & RAPID RESPONSE
// ============================================================
export const IcuCodeBlue = () => (
  <SpecialisedPage
    shellTitle="Code Blue & Rapid Response" icon={<Siren className="h-5 w-5" />}
    title="Code Blue & Rapid Response Center"
    desc="Activate, document and audit code blue and rapid response events. Track team response, interventions and outcomes."
    ctaLabel="Activate Code Blue"
    kpis={[
      { l: 'Active Code Blue', v: CODE_BLUE.filter(c => c.status === 'Active').length, i: Siren, tone: 'rose' },
      { l: 'Resolved Events', v: CODE_BLUE.filter(c => c.status === 'Resolved').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Documentation', v: CODE_BLUE.filter(c => c.status === 'Pending Documentation').length + 2, i: AlertCircle, tone: 'amber' },
      { l: 'Rapid Response Cases', v: CODE_BLUE.filter(c => c.status === 'Rapid Response').length + 5, i: Activity, tone: 'purple' },
      { l: 'Critical Events', v: CODE_BLUE.filter(c => c.status === 'Critical').length + 3, i: AlertTriangle, tone: 'red' },
      { l: 'Team Activations (MTD)', v: 26, i: Users, tone: 'blue' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'rs', label: 'Resolved', value: 'Resolved' },
      { key: 'pd', label: 'Pending Documentation', value: 'Pending Documentation' },
      { key: 'rr', label: 'Rapid Response', value: 'Rapid Response' },
      { key: 'cr', label: 'Critical', value: 'Critical' },
    ]}
    rows={CODE_BLUE}
    searchFields={(r) => `${r.patient} ${r.id} ${r.event}`}
    columns={[
      { key: 'id', header: 'Event', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'l', header: 'Location', render: r => r.location },
      { key: 'e', header: 'Event Type', render: r => r.event },
      { key: 't', header: 'Team', render: r => r.team },
      { key: 'tm', header: 'Time', render: r => r.time },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Active' || r.status === 'Critical' ? 'red' : r.status === 'Resolved' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'location', label: 'Location', type: 'select', options: ['ICU-1', 'ICU-2', 'ICU-3', 'ICU-4', 'ICU-5', 'ICU-6', 'HDU-1', 'HDU-2', 'A&E', 'Ward'] },
      { k: 'event', label: 'Event Type', type: 'select', options: ['Cardiac arrest', 'Respiratory arrest', 'Desaturation', 'Hypotension', 'Seizure', 'Other'] },
      { k: 'team', label: 'Team Notified', type: 'select', options: ['Code team', 'Rapid response', 'Code team + Anaesthesia', 'Code team + Cardiology'] },
      { k: 'action', label: 'Immediate Action', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="🚨 CODE BLUE ACTIVATED" nextStep="Code team paged. Document interventions in real-time."
  />
);

// ============================================================
// 8. ICU MEDICATION
// ============================================================
export const IcuMedication = () => (
  <SpecialisedPage
    shellTitle="ICU Medication" icon={<Pill className="h-5 w-5" />}
    title="ICU Medication Center"
    desc="Active orders, stat doses, infusions, high-risk drugs and missed dose escalations."
    ctaLabel="New Order"
    kpis={[
      { l: 'Active Orders', v: MEDICATIONS.filter(m => m.status === 'Active').length + 28, i: Pill, tone: 'blue' },
      { l: 'Stat Orders', v: MEDICATIONS.filter(m => m.status === 'Stat').length + 4, i: AlertTriangle, tone: 'rose' },
      { l: 'Due Medications', v: MEDICATIONS.filter(m => m.status === 'Due').length + 12, i: AlertCircle, tone: 'amber' },
      { l: 'Missed Medications', v: MEDICATIONS.filter(m => m.status === 'Missed').length + 2, i: AlertTriangle, tone: 'red' },
      { l: 'High-Risk Drugs', v: MEDICATIONS.filter(m => m.risk === 'High Risk').length + 8, i: ShieldAlert, tone: 'orange' },
      { l: 'Infusion Orders', v: MEDICATIONS.filter(m => m.status === 'Infusion').length + 6, i: Activity, tone: 'purple' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'st', label: 'Stat', value: 'Stat' },
      { key: 'du', label: 'Due', value: 'Due' },
      { key: 'ms', label: 'Missed', value: 'Missed' },
      { key: 'hr', label: 'High Risk', value: 'High Risk' },
      { key: 'in', label: 'Infusion', value: 'Infusion' },
    ]}
    rows={MEDICATIONS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.drug}`}
    columns={[
      { key: 'id', header: 'Order', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'd', header: 'Drug', render: r => r.drug },
      { key: 'r', header: 'Route', render: r => r.route },
      { key: 'rk', header: 'Risk', render: r => <Chip label={r.risk} t={r.risk === 'High Risk' ? 'red' : 'green'} /> },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Missed' || r.status === 'Stat' ? 'red' : r.status === 'Due' ? 'amber' : 'blue'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'drug', label: 'Drug + Dose', type: 'text' },
      { k: 'route', label: 'Route', type: 'select', options: ['IV', 'PO', 'SC', 'IM', 'Infusion', 'NG'] },
      { k: 'freq', label: 'Frequency', type: 'text' },
      { k: 'risk', label: 'Risk Level', type: 'select', options: ['Standard', 'High Risk'] },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Medication ordered" nextStep="Order sent to ICU pharmacy. Watch for high-risk alerts."
  />
);

// ============================================================
// 9. ICU LABORATORY
// ============================================================
export const IcuLaboratory = () => (
  <SpecialisedPage
    shellTitle="ICU Laboratory" icon={<FlaskConical className="h-5 w-5" />}
    title="ICU Laboratory Workspace"
    desc="Stat lab requests, critical results, flagged values and pending tests."
    ctaLabel="Stat Lab Request"
    kpis={[
      { l: 'Stat Requests', v: LABS.filter(l => l.priority === 'Stat').length + 6, i: AlertTriangle, tone: 'rose' },
      { l: 'Critical Results', v: LABS.filter(l => l.flag === 'Critical').length + 3, i: AlertTriangle, tone: 'red' },
      { l: 'High Results', v: LABS.filter(l => l.flag === 'High').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'Pending Results', v: LABS.filter(l => l.status === 'Pending').length + 10, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Results', v: LABS.filter(l => l.status === 'Completed').length + 64, i: CheckCircle2, tone: 'green' },
      { l: 'Tests Today', v: 38, i: FlaskConical, tone: 'blue' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'st', label: 'Stat', value: 'Critical' },
      { key: 'cr', label: 'Critical', value: 'Critical' },
      { key: 'hf', label: 'High Flag', value: 'Completed' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={LABS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.test}`}
    columns={[
      { key: 'id', header: 'Lab ID', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 't', header: 'Test', render: r => r.test },
      { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'Stat' ? 'red' : 'amber'} /> },
      { key: 'f', header: 'Flag', render: r => <Chip label={r.flag} t={r.flag === 'Critical' ? 'red' : r.flag === 'High' ? 'amber' : 'green'} /> },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical' ? 'red' : r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'test', label: 'Test', type: 'select', options: ['FBC', 'U+E', 'LFT', 'ABG', 'Lactate', 'Blood culture', 'CRP', 'Troponin', 'BNP', 'Lithium level', 'Toxicology'] },
      { k: 'pr', label: 'Priority', type: 'select', options: ['Stat', 'Urgent', 'Routine'] },
      { k: 'notes', label: 'Clinical Notes', type: 'textarea' },
    ]}
    successTitle="Lab request created" nextStep="Sample collection paged. Results return to ICU dashboard."
  />
);

// ============================================================
// 10. ICU RADIOLOGY
// ============================================================
type IcuRadRow = { id: string; patient: string; test: string; status: string; finding: string };

function mapIcuRadStatus(r: { status: string; critical?: boolean; modality?: string }): string {
  if (r.critical) return 'Critical Findings';
  const s = (r.status || '').toUpperCase();
  if (['RELEASED', 'VERIFIED', 'REPORTED', 'COMPLETED'].includes(s)) return 'Completed';
  const mod = (r.modality || '').toLowerCase();
  if (mod.includes('x-ray') || mod.includes('xray') || mod === 'xr') return 'Portable X-Ray';
  if (mod.includes('ct') || mod.includes('mri')) return 'CT/MRI';
  return 'Pending';
}

function buildIcuRadRowsFromApi(results: ApiConsumerResult[], critical: ApiConsumerResult[]): IcuRadRow[] {
  const byId = new Map<number, ApiConsumerResult>();
  for (const r of [...results, ...critical]) byId.set(r.reportId, r);
  return Array.from(byId.values()).map(r => ({
    id: `RAD-${r.reportId}`,
    patient: r.patientName,
    test: r.studyName || r.modality,
    status: mapIcuRadStatus(r),
    finding: r.impression || r.findings || '—',
  }));
}

function buildIcuRadRowsFromLocal(): IcuRadRow[] {
  const reports = db.radiologyReports.list();
  return reports.map(r => ({
    id: r.id,
    patient: r.patientName,
    test: r.technique ?? r.modality,
    status: mapIcuRadStatus({ status: r.status, critical: r.critical, modality: r.modality }),
    finding: r.impression || r.findings || '—',
  }));
}

export const IcuRadiology = () => {
  useDbTick();
  const apiOn = isImagingApiEnabled();
  const [rows, setRows] = useState<IcuRadRow[]>(() => (apiOn ? [] : buildIcuRadRowsFromLocal()));

  useEffect(() => {
    if (!apiOn) {
      setRows(buildIcuRadRowsFromLocal());
      return;
    }
    void Promise.all([
      listConsumerImagingResults({ limit: 80 }),
      listConsumerImagingResults({ critical: true, limit: 40 }).catch(() => [] as ApiConsumerResult[]),
    ]).then(([all, crit]) => {
      const built = buildIcuRadRowsFromApi(all, crit);
      setRows(built);
    }).catch(e => {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load ICU radiology');
      setRows([]);
    });
  }, [apiOn]);

  return (
    <SpecialisedPage
      shellTitle="ICU Radiology" icon={<ScanLine className="h-5 w-5" />}
      title="ICU Radiology Workspace"
      desc="Portable X-ray, bedside echo, CT and MRI requests with critical-finding escalation."
      ctaLabel="Imaging Request"
      kpis={[
        { l: 'Pending Imaging', v: rows.filter(r => r.status === 'Pending').length, i: AlertCircle, tone: 'amber' },
        { l: 'Completed Imaging', v: rows.filter(r => r.status === 'Completed').length, i: CheckCircle2, tone: 'green' },
        { l: 'Critical Findings', v: rows.filter(r => r.status === 'Critical Findings').length, i: AlertTriangle, tone: 'rose' },
        { l: 'Portable X-Ray', v: rows.filter(r => r.status === 'Portable X-Ray').length, i: ScanLine, tone: 'blue' },
        { l: 'CT/MRI Requests', v: rows.filter(r => r.status === 'CT/MRI').length, i: ScanLine, tone: 'purple' },
        { l: 'Imaging Today', v: rows.length, i: ScanLine, tone: 'teal' },
      ]}
      tabKey="status"
      tabs={[
        { key: 'all', label: 'All' },
        { key: 'pe', label: 'Pending', value: 'Pending' },
        { key: 'cp', label: 'Completed', value: 'Completed' },
        { key: 'cr', label: 'Critical Findings', value: 'Critical Findings' },
        { key: 'pt', label: 'Portable X-Ray', value: 'Portable X-Ray' },
        { key: 'ct', label: 'CT/MRI', value: 'CT/MRI' },
      ]}
      rows={rows}
      searchFields={(r) => `${r.patient} ${r.id} ${r.test}`}
      columns={[
        { key: 'id', header: 'Rad ID', render: r => r.id },
        { key: 'p', header: 'Patient', render: r => r.patient },
        { key: 't', header: 'Test', render: r => r.test },
        { key: 'f', header: 'Finding', render: r => r.finding },
        { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Critical Findings' ? 'red' : r.status === 'Completed' ? 'green' : 'amber'} /> },
      ]}
      modalFields={[
        { k: 'patient', label: 'Patient', type: 'patientPicker' },
        { k: 'test', label: 'Imaging', type: 'select', options: ['Portable CXR', 'Portable AXR', 'CT Brain', 'CT Chest', 'MRI Brain', 'Echo bedside', 'Doppler'] },
        { k: 'pr', label: 'Priority', type: 'select', options: ['Stat', 'Urgent', 'Routine'] },
        { k: 'reason', label: 'Clinical Reason', type: 'textarea' },
      ]}
      successTitle="Imaging request sent" nextStep="Radiographer on the way for portable imaging."
    />
  );
};

// ============================================================
// 11. ICU NUTRITION
// ============================================================
export const IcuNutrition = () => (
  <SpecialisedPage
    shellTitle="ICU Nutrition" icon={<Salad className="h-5 w-5" />}
    title="ICU Nutrition Center"
    desc="Enteral, tube feeding, TPN, intolerance management and dietetics review."
    ctaLabel="Feeding Order"
    kpis={[
      { l: 'Active Feeding Orders', v: NUTRITION.filter(n => n.status === 'Active').length + 10, i: Salad, tone: 'blue' },
      { l: 'Enteral Feeding', v: NUTRITION.filter(n => n.kind === 'Enteral').length + 4, i: Salad, tone: 'green' },
      { l: 'Tube Feeding', v: NUTRITION.filter(n => n.kind === 'Tube Feeding').length + 3, i: Activity, tone: 'purple' },
      { l: 'Feeding Intolerance', v: NUTRITION.filter(n => n.status === 'Intolerance').length + 1, i: AlertTriangle, tone: 'rose' },
      { l: 'Review Due', v: NUTRITION.filter(n => n.status === 'Review Due').length + 2, i: ClipboardList, tone: 'amber' },
      { l: 'Dietetics MDT', v: 4, i: Users, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'en', label: 'Enteral', value: 'Active' },
      { key: 'tf', label: 'Tube Feeding', value: 'Active' },
      { key: 'in', label: 'Intolerance', value: 'Intolerance' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={NUTRITION}
    searchFields={(r) => `${r.patient} ${r.id} ${r.plan}`}
    columns={[
      { key: 'id', header: 'Order', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'pl', header: 'Plan', render: r => r.plan },
      { key: 'k', header: 'Kind', render: r => r.kind },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Intolerance' ? 'red' : r.status === 'Review Due' ? 'amber' : 'green'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Type', type: 'select', options: ['Enteral', 'Tube Feeding', 'TPN', 'Oral'] },
      { k: 'formula', label: 'Formula', type: 'text' },
      { k: 'rate', label: 'Rate', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Feeding order created" nextStep="Dietitian notified. Monitor for tolerance."
  />
);

// ============================================================
// 12. ICU REHABILITATION
// ============================================================
export const IcuRehab = () => (
  <SpecialisedPage
    shellTitle="ICU Rehabilitation" icon={<Bone className="h-5 w-5" />}
    title="ICU Rehabilitation"
    desc="Early mobilization, respiratory therapy and ICU-acquired weakness prevention."
    ctaLabel="Rehab Review"
    kpis={[
      { l: 'Rehab Reviews Today', v: REHAB.filter(r => r.status === 'Today').length + 4, i: Activity, tone: 'blue' },
      { l: 'Early Mobilization', v: REHAB.filter(r => r.kind === 'Early Mobilization').length + 5, i: TrendingUp, tone: 'green' },
      { l: 'Respiratory Therapy', v: REHAB.filter(r => r.kind === 'Respiratory Therapy').length + 3, i: Wind, tone: 'purple' },
      { l: 'Pending Reviews', v: REHAB.filter(r => r.status === 'Pending').length + 2, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Reviews', v: REHAB.filter(r => r.status === 'Completed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'PT/OT On-Call', v: 3, i: Users, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Today' },
      { key: 'em', label: 'Early Mobilization', value: 'Today' },
      { key: 'rt', label: 'Respiratory Therapy', value: 'Today' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
    ]}
    rows={REHAB}
    searchFields={(r) => `${r.patient} ${r.id} ${r.kind}`}
    columns={[
      { key: 'id', header: 'Review', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'k', header: 'Kind', render: r => r.kind },
      { key: 't', header: 'Therapist', render: r => r.therapist },
      { key: 'n', header: 'Notes', render: r => r.notes },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'Today' ? 'blue' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Review Type', type: 'select', options: ['Early Mobilization', 'Respiratory Therapy', 'ICU-acquired weakness', 'Swallow screen'] },
      { k: 'therapist', label: 'Therapist', type: 'select', options: ['PT. Bukola', 'PT. Aluko', 'OT. Adesina', 'SLT. Mojisola'] },
      { k: 'plan', label: 'Plan', type: 'textarea' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Rehab review created" nextStep="Therapist scheduled. Monitor progress in chart."
  />
);

// ============================================================
// 13. SHIFT HANDOVER
// ============================================================
export const IcuHandover = () => (
  <SpecialisedPage
    shellTitle="Shift Handover" icon={<Repeat className="h-5 w-5" />}
    title="ICU Shift Handover Center"
    desc="Structured SBAR handover with priority flagging, sign-off and audit trail."
    ctaLabel="Sign Off Handover"
    kpis={[
      { l: 'High Priority', v: HANDOVER.filter(h => h.priority === 'High Priority').length + 2, i: AlertTriangle, tone: 'rose' },
      { l: 'Medium Priority', v: HANDOVER.filter(h => h.priority === 'Medium Priority').length + 3, i: AlertCircle, tone: 'amber' },
      { l: 'Low Priority', v: HANDOVER.filter(h => h.priority === 'Low Priority').length + 4, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Sign-Off', v: HANDOVER.filter(h => h.status === 'Pending Sign-Off').length + 1, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Handover', v: HANDOVER.filter(h => h.status === 'Completed').length + 14, i: CheckCircle2, tone: 'green' },
      { l: 'Total Today', v: HANDOVER.length + 8, i: Repeat, tone: 'blue' },
    ]}
    tabKey="priority"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'hi', label: 'High Priority', value: 'High Priority' },
      { key: 'md', label: 'Medium Priority', value: 'Medium Priority' },
      { key: 'lo', label: 'Low Priority', value: 'Low Priority' },
      { key: 'ps', label: 'Pending Sign-Off', value: 'High Priority' },
      { key: 'cp', label: 'Completed', value: 'Low Priority' },
    ]}
    rows={HANDOVER}
    searchFields={(r) => `${r.patient} ${r.id} ${r.notes}`}
    columns={[
      { key: 'id', header: 'Handover', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'fr', header: 'From', render: r => r.from },
      { key: 'to', header: 'To', render: r => r.to },
      { key: 'pr', header: 'Priority', render: r => <Chip label={r.priority} t={r.priority === 'High Priority' ? 'red' : r.priority === 'Medium Priority' ? 'amber' : 'green'} /> },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'situation', label: 'Situation', type: 'textarea' },
      { k: 'background', label: 'Background', type: 'textarea' },
      { k: 'assessment', label: 'Assessment', type: 'textarea' },
      { k: 'recommendation', label: 'Recommendation', type: 'textarea' },
      { k: 'priority', label: 'Priority', type: 'select', options: ['High Priority', 'Medium Priority', 'Low Priority'] },
    ]}
    successTitle="Handover signed off" nextStep="Incoming team notified and shift audit logged."
  />
);

// ============================================================
// 14. ICU CARE PLAN
// ============================================================
export const IcuCarePlans = () => (
  <SpecialisedPage
    shellTitle="ICU Care Plans" icon={<ClipboardCheck className="h-5 w-5" />}
    title="ICU Care Plan Workspace"
    desc="Multidisciplinary ICU care plans — goals, interventions, daily reviews and weaning targets."
    ctaLabel="New Care Plan"
    kpis={[
      { l: 'Active Care Plans', v: CARE_PLANS.filter(p => p.status === 'Active').length + 6, i: ClipboardCheck, tone: 'blue' },
      { l: 'Pending Review', v: CARE_PLANS.filter(p => p.status === 'Pending Review').length + 2, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Plans', v: CARE_PLANS.filter(p => p.status === 'Completed').length + 18, i: CheckCircle2, tone: 'green' },
      { l: 'Multidisciplinary Plans', v: CARE_PLANS.filter(p => p.kind === 'Multidisciplinary').length + 8, i: Users, tone: 'purple' },
      { l: 'Daily Reviews Today', v: 6, i: ClipboardList, tone: 'teal' },
      { l: 'MDT Rounds', v: 2, i: Users, tone: 'rose' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'ac', label: 'Active', value: 'Active' },
      { key: 'pr', label: 'Pending Review', value: 'Pending Review' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'md', label: 'Multidisciplinary', value: 'Active' },
    ]}
    rows={CARE_PLANS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.goals}`}
    columns={[
      { key: 'id', header: 'Plan', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'k', header: 'Kind', render: r => r.kind },
      { key: 'g', header: 'Goals', render: r => r.goals },
      { key: 'rv', header: 'Review', render: r => r.review },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Active' ? 'blue' : r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Plan Type', type: 'select', options: ['Standard', 'Multidisciplinary'] },
      { k: 'goals', label: 'Goals', type: 'textarea' },
      { k: 'interventions', label: 'Interventions', type: 'textarea' },
      { k: 'review', label: 'Review Date', type: 'date' },
    ]}
    successTitle="Care plan created" nextStep="MDT team notified. Daily review scheduled."
  />
);

// ============================================================
// 15. ICU TRANSFER
// ============================================================
export const IcuTransfers = () => (
  <SpecialisedPage
    shellTitle="ICU Transfers" icon={<GitBranch className="h-5 w-5" />}
    title="ICU Transfer Center"
    desc="Internal step-downs, ward transfers and external referrals with handover documentation."
    ctaLabel="New Transfer"
    kpis={[
      { l: 'Scheduled Transfers', v: TRANSFERS.filter(t => t.status === 'Scheduled').length + 3, i: GitBranch, tone: 'blue' },
      { l: 'Approved Transfers', v: TRANSFERS.filter(t => t.status === 'Approved').length + 8, i: CheckCircle2, tone: 'green' },
      { l: 'Pending Transfers', v: TRANSFERS.filter(t => t.status === 'Pending').length + 2, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Transfers', v: TRANSFERS.filter(t => t.status === 'Completed').length + 22, i: CheckCircle2, tone: 'green' },
      { l: 'Rejected Transfers', v: TRANSFERS.filter(t => t.status === 'Rejected').length + 1, i: AlertTriangle, tone: 'rose' },
      { l: 'Active This Week', v: 14, i: Activity, tone: 'purple' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'sc', label: 'Scheduled', value: 'Scheduled' },
      { key: 'ap', label: 'Approved', value: 'Approved' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'rj', label: 'Rejected', value: 'Rejected' },
    ]}
    rows={TRANSFERS}
    searchFields={(r) => `${r.patient} ${r.id} ${r.from} ${r.to}`}
    columns={[
      { key: 'id', header: 'Transfer', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'fr', header: 'From', render: r => r.from },
      { key: 'to', header: 'To', render: r => r.to },
      { key: 'rs', header: 'Reason', render: r => r.reason },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Approved' || r.status === 'Completed' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'from', label: 'From', type: 'text' },
      { k: 'to', label: 'To', type: 'select', options: ['Male Ward', 'Female Ward', 'Paediatric Ward', 'Psychogeriatric Ward', 'GMPC', 'External — FMC', 'External — UCH'] },
      { k: 'reason', label: 'Reason', type: 'textarea' },
      { k: 'handover', label: 'Handover Notes', type: 'textarea' },
    ]}
    successTitle="Transfer initiated" nextStep="Receiving team and porters notified."
  />
);

// ============================================================
// 16. ICU DISCHARGE
// ============================================================
export const IcuDischarge = () => (
  <SpecialisedPage
    shellTitle="ICU Discharge" icon={<DoorClosed className="h-5 w-5" />}
    title="ICU Discharge Center"
    desc="Step-down readiness, ward transfer planning, family education and follow-up scheduling."
    ctaLabel="New Discharge"
    kpis={[
      { l: 'Pending Discharge', v: DISCHARGES.filter(d => d.status === 'Pending').length + 2, i: AlertCircle, tone: 'amber' },
      { l: 'Step-Down Patients', v: DISCHARGES.filter(d => d.status === 'Step-Down').length + 4, i: TrendingUp, tone: 'blue' },
      { l: 'Ward Transfer', v: DISCHARGES.filter(d => d.status === 'Ward Transfer').length + 3, i: GitBranch, tone: 'purple' },
      { l: 'Completed Discharges', v: DISCHARGES.filter(d => d.status === 'Completed').length + 28, i: CheckCircle2, tone: 'green' },
      { l: 'Discharge Review Due', v: DISCHARGES.filter(d => d.status === 'Review Due').length + 2, i: ClipboardList, tone: 'amber' },
      { l: 'This Week', v: 12, i: CalendarDays, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Pending' },
      { key: 'sd', label: 'Step-Down', value: 'Step-Down' },
      { key: 'wt', label: 'Ward Transfer', value: 'Ward Transfer' },
      { key: 'cp', label: 'Completed', value: 'Completed' },
      { key: 'rv', label: 'Review Due', value: 'Review Due' },
    ]}
    rows={DISCHARGES}
    searchFields={(r) => `${r.patient} ${r.id} ${r.plan}`}
    columns={[
      { key: 'id', header: 'Discharge', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'pl', header: 'Plan', render: r => r.plan },
      { key: 'rd', header: 'Readiness', render: r => r.readiness },
      { key: 'rv', header: 'Review', render: r => r.review },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : r.status === 'Pending' ? 'amber' : 'blue'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'plan', label: 'Discharge Plan', type: 'textarea' },
      { k: 'destination', label: 'Destination', type: 'select', options: ['Step-Down to HDU', 'Male Ward', 'Female Ward', 'Paediatric Ward', 'Psychogeriatric Ward', 'Home with follow-up'] },
      { k: 'followup', label: 'Follow-up Plan', type: 'textarea' },
      { k: 'family', label: 'Family Education', type: 'textarea' },
    ]}
    successTitle="Discharge initiated" nextStep="Discharge summary generated. Pharmacy and follow-up scheduled."
  />
);

// ============================================================
// 17. BILLING & NHIA
// ============================================================
export const IcuBilling = () => {
  const [selected, setSelected] = useState<typeof INVOICES[0] | null>(null);
  const { notify, node } = useSuccess();
  return (
    <>
      <WorkflowPage
        shellTitle="Billing & NHIA"
        icon={<CreditCard className="h-5 w-5" />}
        title="ICU Billing & NHIA"
        desc="ICU bed-day, HDU, ventilator-day, pressors and procedure billing with NHIA claims."
        ctaLabel="New Invoice"
        kpis={[
          { l: 'Total Invoices', v: INVOICES.length + 184, i: CreditCard, tone: 'blue' },
          { l: 'Paid', v: INVOICES.filter(i => i.status === 'Paid').length + 124, i: CheckCircle2, tone: 'green' },
          { l: 'Pending', v: INVOICES.filter(i => i.status === 'Pending').length + 18, i: AlertCircle, tone: 'amber' },
          { l: 'NHIA', v: INVOICES.filter(i => i.status === 'NHIA' || i.nhia === 'Approved').length + 42, i: AlertTriangle, tone: 'purple' },
          { l: 'Outstanding', v: INVOICES.filter(i => i.status === 'Outstanding').length + 14, i: AlertTriangle, tone: 'rose' },
          { l: 'Bed + Vent (MTD)', v: formatCurrency(2840000), i: BedDouble, tone: 'teal' },
        ]}
        tabs={[
          { key: 'all', label: 'All', filter: () => true },
          { key: 'pd', label: 'Paid', filter: (r: any) => r.status === 'Paid' },
          { key: 'pe', label: 'Pending', filter: (r: any) => r.status === 'Pending' },
          { key: 'nh', label: 'NHIA', filter: (r: any) => r.status === 'NHIA' || r.nhia === 'Approved' },
          { key: 'os', label: 'Outstanding', filter: (r: any) => r.status === 'Outstanding' },
          { key: 'bc', label: 'Bed Charges', filter: (r: any) => r.status === 'Bed Charges' || r.service.toLowerCase().includes('bed') },
          { key: 've', label: 'Ventilator', filter: (r: any) => r.status === 'Ventilator' || r.service.toLowerCase().includes('vent') },
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
          successTitle="Invoice created" nextStep="Print, download PDF or push for NHIA claim review."
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
// 18. ICU ANALYTICS (Executive)
// ============================================================
export const IcuAnalytics = () => (
  <Shell title="Executive Analytics">
    <Section icon={<TrendingUp className="h-5 w-5" />} title="ICU Executive Analytics"
      desc="Operational and clinical performance — occupancy, length of stay, ventilator utilization, mortality, readmission and revenue." />
    <KpiGrid items={[
      { l: 'ICU Occupancy Rate', v: '86%', i: BedDouble, tone: 'blue' },
      { l: 'Average Length of Stay', v: '5.4 days', i: Calendar, tone: 'purple' },
      { l: 'Ventilator Utilization', v: '72%', i: Wind, tone: 'amber' },
      { l: 'Mortality Rate', v: '11.8%', i: Skull, tone: 'rose' },
      { l: 'Readmission Rate (30d)', v: '6.2%', i: Repeat, tone: 'orange' },
      { l: 'Code Blue Events (MTD)', v: 9, i: Siren, tone: 'red' },
    ]} />
    <KpiGrid items={[
      { l: 'Revenue (MTD)', v: formatCurrency(2840000), i: CreditCard, tone: 'green' },
      { l: 'NHIA Approved (MTD)', v: formatCurrency(1620000), i: CheckCircle2, tone: 'teal' },
      { l: 'Bed Days (MTD)', v: 312, i: BedDouble, tone: 'blue' },
      { l: 'Vent Days (MTD)', v: 168, i: Wind, tone: 'purple' },
      { l: 'Successful Weans', v: 22, i: TrendingUp, tone: 'green' },
      { l: 'Critical Case Trend', v: '↑ 8%', i: AlertTriangle, tone: 'amber' },
    ]} />
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <div className="text-sm font-semibold mb-3">Bed Utilization (last 7 days)</div>
        <div className="space-y-2">
          {['Mon 82%', 'Tue 88%', 'Wed 90%', 'Thu 84%', 'Fri 86%', 'Sat 80%', 'Sun 78%'].map(d => {
            const [day, pct] = d.split(' ');
            return (
              <div key={d}>
                <div className="flex justify-between text-xs"><span>{day}</span><span className="font-semibold">{pct}</span></div>
                <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: pct }} /></div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <div className="text-sm font-semibold mb-3">Patient Outcomes (MTD)</div>
        <ul className="text-sm space-y-2">
          <li className="flex justify-between"><span>Discharged improved</span><span className="font-semibold text-emerald-700">68</span></li>
          <li className="flex justify-between"><span>Stepped down to ward</span><span className="font-semibold text-blue-700">42</span></li>
          <li className="flex justify-between"><span>Transferred out</span><span className="font-semibold text-purple-700">6</span></li>
          <li className="flex justify-between"><span>Deaths (M&M reviewed)</span><span className="font-semibold text-rose-700">11</span></li>
        </ul>
      </Card>
      <Card>
        <div className="text-sm font-semibold mb-3">Staff Productivity</div>
        <ul className="text-sm space-y-2">
          <li className="flex justify-between"><span>Doctor notes / day</span><span className="font-semibold">4.2</span></li>
          <li className="flex justify-between"><span>Nurse obs charts / shift</span><span className="font-semibold">12</span></li>
          <li className="flex justify-between"><span>MDT rounds completed</span><span className="font-semibold">38</span></li>
          <li className="flex justify-between"><span>Handover compliance</span><span className="font-semibold">96%</span></li>
        </ul>
      </Card>
      <Card>
        <div className="text-sm font-semibold mb-3">Revenue Mix</div>
        <ul className="text-sm space-y-2">
          <li className="flex justify-between"><span>ICU Bed Days</span><span className="font-semibold">{formatCurrency(1320000)}</span></li>
          <li className="flex justify-between"><span>Ventilator Days</span><span className="font-semibold">{formatCurrency(820000)}</span></li>
          <li className="flex justify-between"><span>Procedures</span><span className="font-semibold">{formatCurrency(420000)}</span></li>
          <li className="flex justify-between"><span>Pharmacy + Lab</span><span className="font-semibold">{formatCurrency(280000)}</span></li>
        </ul>
      </Card>
    </div>
  </Shell>
);

// ============================================================
// 19. MORTALITY & MORBIDITY
// ============================================================
export const IcuMortality = () => (
  <SpecialisedPage
    shellTitle="Mortality & Morbidity" icon={<Skull className="h-5 w-5" />}
    title="Mortality & Morbidity Review"
    desc="Structured M&M review of ICU deaths and serious adverse events with quality improvement actions."
    ctaLabel="New M&M Review"
    kpis={[
      { l: 'Pending Reviews', v: MORTALITY.filter(m => m.status === 'Pending').length + 3, i: AlertCircle, tone: 'amber' },
      { l: 'Completed Reviews', v: MORTALITY.filter(m => m.status === 'Completed').length + 24, i: CheckCircle2, tone: 'green' },
      { l: 'Mortality Reviews', v: MORTALITY.filter(m => m.kind === 'Mortality').length + 8, i: Skull, tone: 'rose' },
      { l: 'Morbidity Reviews', v: MORTALITY.filter(m => m.kind === 'Morbidity').length + 12, i: AlertTriangle, tone: 'orange' },
      { l: 'QI Actions', v: MORTALITY.filter(m => m.kind === 'QI Actions').length + 7, i: TrendingUp, tone: 'purple' },
      { l: 'This Quarter', v: 32, i: Calendar, tone: 'blue' },
    ]}
    tabKey="kind"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'pe', label: 'Pending', value: 'Mortality' },
      { key: 'cp', label: 'Completed', value: 'Mortality' },
      { key: 'mt', label: 'Mortality', value: 'Mortality' },
      { key: 'mb', label: 'Morbidity', value: 'Morbidity' },
      { key: 'qi', label: 'QI Actions', value: 'QI Actions' },
    ]}
    rows={MORTALITY}
    searchFields={(r) => `${r.patient} ${r.id} ${r.dx}`}
    columns={[
      { key: 'id', header: 'Review', render: r => r.id },
      { key: 'p', header: 'Patient', render: r => r.patient },
      { key: 'd', header: 'Diagnosis', render: r => r.dx },
      { key: 'k', header: 'Kind', render: r => <Chip label={r.kind} t={r.kind === 'Mortality' ? 'red' : r.kind === 'Morbidity' ? 'orange' : 'purple'} /> },
      { key: 'l', header: 'Lead', render: r => r.lead },
      { key: 's', header: 'Status', render: r => <Chip label={r.status} t={r.status === 'Completed' ? 'green' : 'amber'} /> },
    ]}
    modalFields={[
      { k: 'patient', label: 'Patient', type: 'patientPicker' },
      { k: 'kind', label: 'Review Type', type: 'select', options: ['Mortality', 'Morbidity', 'QI Actions'] },
      { k: 'dx', label: 'Primary Diagnosis', type: 'text' },
      { k: 'cause', label: 'Cause / Event', type: 'textarea' },
      { k: 'lessons', label: 'Lessons & Actions', type: 'textarea' },
      { k: 'lead', label: 'Review Lead', type: 'select', options: ['Dr. Balogun', 'Dr. Okafor', 'Dr. Sowemimo', 'Dr. Adesina'] },
    ]}
    successTitle="M&M review created" nextStep="MDT review scheduled — QI actions trackable."
  />
);

// ============================================================
// 20. RESEARCH & STATISTICS
// ============================================================
export const IcuResearch = () => (
  <Shell title="Research & Statistics">
    <Section icon={<BarChart3 className="h-5 w-5" />} title="ICU Research & Statistics"
      desc="Cohort statistics, ventilator outcomes, sepsis bundle compliance and research datasets." />
    <KpiGrid items={[
      { l: 'Active Cohorts', v: 6, i: Users, tone: 'blue' },
      { l: 'Ventilator Studies', v: 3, i: Wind, tone: 'purple' },
      { l: 'Sepsis Bundle Compliance', v: '88%', i: ShieldAlert, tone: 'green' },
      { l: 'Published Papers (YTD)', v: 2, i: BookOpen, tone: 'teal' },
      { l: 'IRB Approvals', v: 4, i: CheckCircle2, tone: 'green' },
      { l: 'Dataset Records', v: 1280, i: BarChart3, tone: 'amber' },
    ]} />
    <Card>
      <div className="text-sm font-semibold mb-2">Research Indicators</div>
      <div className="text-sm text-muted-foreground">Filters: date range, diagnosis, ventilator status, mortality outcome, NHIA status.</div>
    </Card>
  </Shell>
);

// ============================================================
// 21. COMMUNICATION CENTER
// ============================================================
export const IcuComms = () => {
  const [tab, setTab] = useState('all');
  const [active, setActive] = useState<typeof THREADS[0]>(THREADS[0]);
  const [msg, setMsg] = useState('');
  const { notify, node } = useSuccess();
  const TABS = [
    { k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'urgent', l: 'Urgent' },
    { k: 'doc', l: 'Doctor' }, { k: 'nur', l: 'Nursing' }, { k: 'lab', l: 'Laboratory' },
    { k: 'rad', l: 'Radiology' }, { k: 'pha', l: 'Pharmacy' }, { k: 'nut', l: 'Nutrition' },
    { k: 'pt', l: 'Physio' }, { k: 'mgt', l: 'Management' },
  ];
  const filtered = THREADS.filter(t => {
    if (tab === 'all') return true;
    if (tab === 'unread') return t.unread > 0;
    if (tab === 'urgent') return t.urgent;
    const map: Record<string, string> = { doc: 'doctor', nur: 'nursing', lab: 'laboratory', rad: 'radiology', pha: 'pharmacy', nut: 'nutrition', pt: 'physio', mgt: 'management' };
    return t.dept.toLowerCase().includes(map[tab] || '');
  });
  const send = () => {
    if (!msg.trim()) return;
    setMsg('');
    notify({ title: 'Message sent', message: `Reply sent to ${active.with}.` });
  };
  return (
    <Shell title="Communication Center">
      <Section icon={<MessageSquare className="h-5 w-5" />} title="ICU Communication Center"
        desc="Secure messaging with Doctors, Nursing, Laboratory, Radiology, Pharmacy, Nutrition, Physiotherapy and Management — patient-linked, attachments and urgent alerts."
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
        { l: 'Patient-linked', v: THREADS.filter(t => t.patient !== '—').length, i: Users, tone: 'purple' },
        { l: 'Attachments', v: 18, i: Paperclip, tone: 'blue' },
        { l: 'Active Staff', v: 36, i: Users, tone: 'green' },
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
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-md">Acknowledged — ICU team reviewing now.</div></div>
            <div className="flex justify-start"><div className="bg-card border rounded-lg p-3 text-sm max-w-md"><div className="text-[10px] text-muted-foreground mb-1">{active.with}</div>Please attach latest ABG.</div></div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => notify({ title: 'Attachment added', message: 'abg-result.pdf' })}><Paperclip className="h-4 w-4" /></Button>
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
// 22. EMR TIMELINE
// ============================================================
export const IcuTimeline = () => {
  const TIMELINE = [
    { when: '2026-06-03 12:18', what: 'Code Blue activated — Ms. Halima Yusuf (ICU-5)', who: 'Dr. Okafor' },
    { when: '2026-06-03 11:50', what: 'Critical ABG — Mr. Chidi Eze (pH 7.22)', who: 'Lab' },
    { when: '2026-06-03 10:00', what: 'Sepsis bundle complete — Pa Adebayo Odunsi', who: 'Dr. Sowemimo' },
    { when: '2026-06-03 08:00', what: 'Shift handover signed off — 6 patients', who: 'N. Adunola' },
    { when: '2026-06-02 22:00', what: 'New admission — Mrs. Bisi Akande (post-ECT cardiogenic shock)', who: 'Dr. Balogun' },
  ];
  return (
    <Shell title="EMR Timeline">
      <Section icon={<CalendarDays className="h-5 w-5" />} title="ICU EMR Timeline"
        desc="Chronological log of admissions, critical events, code blue, handovers and discharges." />
      <Card>
        <div className="space-y-3">
          {TIMELINE.map((e, i) => (
            <div key={i} className="flex gap-3">
              <div className="text-xs text-muted-foreground w-40 shrink-0">{e.when}</div>
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
// 23. FOLLOW-UP DASHBOARD
// ============================================================
export const IcuFollowUp = () => (
  <SpecialisedPage
    shellTitle="Follow-Up Dashboard" icon={<Activity className="h-5 w-5" />}
    title="ICU Follow-Up Dashboard"
    desc="Post-ICU clinic, step-down reviews, family follow-ups and missed appointments."
    ctaLabel="Schedule Follow-Up"
    kpis={[
      { l: 'Follow-Ups Today', v: 8, i: CalendarDays, tone: 'blue' },
      { l: 'Confirmed', v: FOLLOWUPS.filter(f => f.status === 'Confirmed').length + 16, i: CheckCircle2, tone: 'green' },
      { l: 'Pending', v: FOLLOWUPS.filter(f => f.status === 'Pending').length + 8, i: AlertCircle, tone: 'amber' },
      { l: 'Rescheduled', v: FOLLOWUPS.filter(f => f.status === 'Rescheduled').length + 4, i: Repeat, tone: 'purple' },
      { l: 'Missed', v: FOLLOWUPS.filter(f => f.status === 'Missed').length + 3, i: AlertTriangle, tone: 'rose' },
      { l: 'Completed', v: FOLLOWUPS.filter(f => f.status === 'Completed').length + 42, i: CheckCircle2, tone: 'teal' },
    ]}
    tabKey="status"
    tabs={[
      { key: 'all', label: 'All' },
      { key: 'td', label: 'Today', value: 'Confirmed' },
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
      { k: 'type', label: 'Follow-Up Type', type: 'select', options: ['Post-ICU clinic', 'Step-down review', 'Pressor wean review', 'Detox follow-up', 'Sepsis follow-up', 'Paediatric ICU follow-up'] },
      { k: 'date', label: 'Date', type: 'date' },
      { k: 'time', label: 'Time', type: 'time' },
      { k: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    successTitle="Follow-up scheduled" nextStep="Patient and primary team notified."
  />
);

// ============================================================
// 24. STAFF PRODUCTIVITY
// ============================================================
export const IcuProductivity = () => {
  const { notify, node } = useSuccess();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'pt', l: 'Pending Tasks', f: (r: any) => r.kind === 'Pending Tasks' },
    { k: 'dn', l: 'Draft Notes', f: (r: any) => r.kind === 'Draft Notes' },
    { k: 'dr', l: 'Due Reviews', f: (r: any) => r.kind === 'Due Reviews' },
    { k: 'as', l: 'Active Staff', f: (r: any) => r.kind === 'Active Staff' },
    { k: 'cp', l: 'Completed', f: (r: any) => r.kind === 'Completed' },
  ];
  const filtered = PRODUCTIVITY.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Staff Productivity">
      <Section icon={<ListChecks className="h-5 w-5" />} title="ICU Staff Productivity"
        desc="Resume pending work — drafts, due reviews, handover sign-off and on-shift activity." />
      <KpiGrid items={[
        { l: 'Pending Tasks', v: PRODUCTIVITY.filter(p => p.kind === 'Pending Tasks').length + 8, i: ListChecks, tone: 'amber' },
        { l: 'Draft Notes', v: PRODUCTIVITY.filter(p => p.kind === 'Draft Notes').length + 4, i: ClipboardList, tone: 'blue' },
        { l: 'Due Reviews', v: PRODUCTIVITY.filter(p => p.kind === 'Due Reviews').length + 6, i: AlertCircle, tone: 'orange' },
        { l: 'Active Staff', v: PRODUCTIVITY.filter(p => p.kind === 'Active Staff').length + 11, i: Users, tone: 'green' },
        { l: 'Completed Tasks', v: PRODUCTIVITY.filter(p => p.kind === 'Completed').length + 42, i: CheckCircle2, tone: 'teal' },
        { l: 'On-Shift Doctors', v: 4, i: Stethoscope, tone: 'purple' },
      ]} />
      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto mb-3">{TABS.map(t => <TabsTrigger key={t.k} value={t.k}>{t.l}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab}>
            <div className="space-y-2">
              {filtered.map(r => (
                <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                  <div>
                    <div className="text-sm font-semibold">{r.staff} — {r.task}</div>
                    <div className="text-xs text-muted-foreground">{r.kind} · Due {r.due}</div>
                  </div>
                  <Button size="sm" onClick={() => notify({ title: 'Task resumed', message: r.task, nextStep: 'Workspace loaded.' })}>
                    <ListChecks className="h-3.5 w-3.5 mr-1" /> Resume
                  </Button>
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
// 25. CRITICAL ALERTS
// ============================================================
export const IcuAlerts = () => {
  const { notify, node } = useSuccess();
  const nav = useNavigate();
  const [tab, setTab] = useState('all');
  const TABS = [
    { k: 'all', l: 'All', f: () => true },
    { k: 'cr', l: 'Critical', f: (a: any) => a.status === 'Critical' },
    { k: 've', l: 'Ventilator', f: (a: any) => a.status === 'Ventilator' },
    { k: 'lab', l: 'Laboratory', f: (a: any) => a.status === 'Laboratory' },
    { k: 'cb', l: 'Code Blue', f: (a: any) => a.status === 'Code Blue' },
    { k: 'med', l: 'Medication', f: (a: any) => a.status === 'Medication' },
    { k: 'ack', l: 'Acknowledged', f: (a: any) => a.status === 'Acknowledged' },
  ];
  const filtered = ALERTS.filter(TABS.find(t => t.k === tab)!.f);
  return (
    <Shell title="Critical Alerts">
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="ICU Critical Alerts"
        desc="Ventilator alarms, critical lab values, code blue activations, missed meds and escalation tracking." />
      <KpiGrid items={[
        { l: 'Critical Alerts', v: ALERTS.filter(a => a.status === 'Critical').length + 2, i: AlertTriangle, tone: 'red' },
        { l: 'Ventilator Alerts', v: ALERTS.filter(a => a.status === 'Ventilator').length + 3, i: Wind, tone: 'rose' },
        { l: 'Lab Critical Alerts', v: ALERTS.filter(a => a.status === 'Laboratory').length + 2, i: FlaskConical, tone: 'orange' },
        { l: 'Code Blue Alerts', v: ALERTS.filter(a => a.status === 'Code Blue').length + 1, i: Siren, tone: 'red' },
        { l: 'Medication Alerts', v: ALERTS.filter(a => a.status === 'Medication').length + 2, i: Pill, tone: 'amber' },
        { l: 'Acknowledged Alerts', v: ALERTS.filter(a => a.status === 'Acknowledged').length + 18, i: CheckCircle2, tone: 'green' },
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
                      <Chip label={a.status} t={a.status === 'Critical' || a.status === 'Code Blue' ? 'red' : a.status === 'Acknowledged' ? 'green' : 'amber'} />
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert opened', message: a.message })}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert acknowledged', message: `${a.patient} · ${a.type}` })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge</Button>
                      <Button size="sm" variant="outline" onClick={() => notify({ title: 'Alert escalated', message: `${a.patient} escalated to ICU consultant on-call.` })}><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Escalate</Button>
                      <Button size="sm" onClick={() => nav(`${base}/admissions`)}><Users className="h-3.5 w-3.5 mr-1" /> Open Patient</Button>
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
// 26. REPORTING CENTER
// ============================================================
export const IcuReports = () => {
  const { notify, node } = useSuccess();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ type: string; range: string } | null>(null);
  const [f, setF] = useState({ type: '', range: '30d', notes: '' });
  const TYPES = [
    'ICU Daily Report', 'ICU Admission Report', 'ICU Discharge Report',
    'Ventilator Report', 'Code Blue Report', 'Mortality Report',
    'Billing Report', 'Critical Care Summary',
  ];
  return (
    <Shell title="Reporting Center">
      <Section icon={<ScrollText className="h-5 w-5" />} title="ICU Reporting Center"
        desc="Generate ICU daily, admission, discharge, ventilator, code blue, mortality and billing reports with PDF/CSV export."
        action={<Button onClick={() => setOpen(true)}><FilePlus className="h-4 w-4 mr-1" /> Generate New Report</Button>}
      />
      <KpiGrid items={[
        { l: 'Reports Generated', v: 142, i: ScrollText, tone: 'blue' },
        { l: 'Pending Reports', v: 6, i: AlertCircle, tone: 'amber' },
        { l: 'ICU Reports', v: 48, i: HeartPulse, tone: 'teal' },
        { l: 'Ventilator Reports', v: 22, i: Wind, tone: 'purple' },
        { l: 'Code Blue Reports', v: 12, i: Siren, tone: 'rose' },
        { l: 'Mortality Reports', v: 14, i: Skull, tone: 'red' },
        { l: 'Billing Reports', v: 28, i: CreditCard, tone: 'green' },
        { l: 'Critical Care Summary', v: 10, i: FileText, tone: 'blue' },
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
            <DialogHeader><DialogTitle>{preview.type}</DialogTitle><DialogDescription>GFA HMS · ICU / Critical Care · Range: {preview.range}</DialogDescription></DialogHeader>
            <div className="space-y-3 mt-2">
              <Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Occupancy</div><div className="font-semibold text-lg">86%</div></div>
                  <div><div className="text-xs text-muted-foreground">LOS</div><div className="font-semibold text-lg">5.4 days</div></div>
                  <div><div className="text-xs text-muted-foreground">Vent days</div><div className="font-semibold text-lg">168</div></div>
                  <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-semibold text-lg">{formatCurrency(2840000)}</div></div>
                </div>
              </Card>
              <Card>
                <div className="text-sm font-semibold mb-2">Top Findings</div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  <li>Mortality rate at 11.8% — within target range</li>
                  <li>Sepsis bundle compliance up to 88%</li>
                  <li>9 code blue events; 2 progressed to cardiac arrest</li>
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
// 27. MOBILE / TABLET
// ============================================================
export const IcuMobile = () => (
  <Shell title="Mobile / Tablet">
    <Section icon={<Smartphone className="h-5 w-5" />} title="ICU Mobile & Tablet Experience"
      desc="Bedside charting, ventilator monitoring, code blue activation and handover on mobile and tablet form factors." />
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
// 28. CONFIG
// ============================================================
export const IcuConfig = () => {
  const { notify, node } = useSuccess();
  return (
    <Shell title="ICU Configuration">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Super Admin · ICU Configuration"
        desc="Manage ICU services, bed inventory, ventilator presets, alarm thresholds, code blue teams, NHIA tariffs and reporting templates." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          'ICU Services & Tariffs', 'Bed Inventory', 'Ventilator Presets',
          'Alarm Thresholds', 'Code Blue Team Roster', 'Sepsis Bundle Templates',
          'Handover SBAR Templates', 'NHIA Tariffs', 'Reporting Templates',
          'M&M Templates', 'Care Plan Templates', 'Discharge Templates',
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
