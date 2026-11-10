import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { useAuth } from '@/contexts/AuthContext';
import { useLabFlow, STATUS_LABEL, type LabFlowRequest, type LabFlowStatus } from '@/contexts/LabFlowStore';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  acknowledgeLabResult,
  createLabRequest,
  getLabResult,
  isLaboratoryApiEnabled,
  labPatientName,
  listLabRequests,
  listLabResults,
  listLabSamples,
  listLabTests,
  type ApiLabRequest,
  type ApiLabResult,
  type ApiLabResultValues,
  type ApiLabSample,
  type ApiLabTest,
  type ApiTemplateField,
} from '@/lib/api/laboratory';
import {
  deleteLabRequestDraft,
  listLabRequestDrafts,
  upsertLabRequestDraft,
} from '@/lib/labRequestDrafts';
import { isCriticalValue } from '@/pages/lab/LabResultFields';
import {
  Search, Plus, Printer, Download, Eye, Trash2, Copy, Send, Clock,
  CheckCircle2, AlertTriangle, FileText, History, XCircle, MessageSquare, RefreshCw,
  Stethoscope, Pill, CreditCard, TrendingUp, Bell, ArrowLeft, UserPlus, ShieldCheck, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const LAB_AUDIT_KEY = 'gfa_doc_lab_audit_v1';
const LAB_TIMELINE_KEY = 'gfa_doc_timeline_lab_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Lab Request Engine">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

const StandardLabResultView = ({ result }: { result: LabResult }) => (
  <div className="hms-section border rounded-xl overflow-hidden bg-white shadow-sm">
    <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white px-4 md:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-80">GFA Demo Hospital · Aro</p>
          <h3 className="font-display text-lg font-bold">Laboratory Result Report</h3>
          <p className="text-xs opacity-90 mt-0.5">Clinical Laboratory Services · ISO 15189 Accredited</p>
        </div>
        <div className="text-left sm:text-right text-xs shrink-0">
          <div className="font-mono font-bold text-sm">{result.resultNo}</div>
          <div className="opacity-90">Released: {result.resultDate}</div>
          <StatusPill tone="green">{result.status}</StatusPill>
        </div>
      </div>
    </div>

    <div className="px-4 md:px-6 py-3 bg-muted/30 border-b grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
      <div><span className="text-muted-foreground block">Patient</span><span className="font-semibold">{result.patient}</span></div>
      <div><span className="text-muted-foreground block">Hospital No.</span><span className="font-mono">{result.hospitalId}</span></div>
      <div><span className="text-muted-foreground block">Age / Sex</span><span>{result.age ?? '—'} yrs · {result.gender ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Clinic</span><span>{result.clinic ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Request No.</span><span className="font-mono">{result.requestNo ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Sample ID</span><span className="font-mono">{result.sampleId ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Sample Type</span><span>{result.sampleType ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Requested By</span><span>{result.requestingDoctor ?? '—'}</span></div>
    </div>

    <div className="px-4 md:px-6 py-3 border-b grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
      <div><span className="text-muted-foreground block">Test Panel</span><span className="font-semibold">{result.tests}</span></div>
      <div><span className="text-muted-foreground block">Department</span><span>{result.department ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Collected</span><span>{result.collectedAt ?? '—'}</span></div>
      <div><span className="text-muted-foreground block">Received in Lab</span><span>{result.receivedAt ?? '—'}</span></div>
      {result.clinicalIndication && (
        <div className="col-span-full"><span className="text-muted-foreground block">Clinical Indication</span><span className="italic">{result.clinicalIndication}</span></div>
      )}
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2">Parameter</th>
            <th className="text-left px-4 py-2">Result</th>
            <th className="text-left px-4 py-2">Unit</th>
            <th className="text-left px-4 py-2">Reference Range</th>
            <th className="text-left px-4 py-2">Flag</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map(l => (
            <tr key={l.parameter} className={`border-t ${l.flag !== 'Normal' ? 'bg-amber-50/60' : ''}`}>
              <td className="px-4 py-2 font-medium">{l.parameter}</td>
              <td className="px-4 py-2 font-mono font-semibold">{l.value}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{l.unit}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{l.range}</td>
              <td className="px-4 py-2">
                <StatusPill tone={l.flag === 'Normal' ? 'green' : l.flag === 'Critical' ? 'red' : 'amber'}>{l.flag}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {result.comment && (
      <div className="px-4 md:px-6 py-3 border-t bg-muted/20">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Interpretation / Comment</p>
        <p className="text-sm leading-relaxed">{result.comment}</p>
      </div>
    )}

    <div className="px-4 md:px-6 py-3 border-t bg-emerald-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
      <div className="flex items-start gap-2 text-emerald-800">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Electronically verified & released</p>
          <p className="text-emerald-700/80">Entered by {result.enteredBy} · Validated by {result.validatedBy}</p>
        </div>
      </div>
      <div className="text-muted-foreground font-mono text-[10px]">QR Verify · GFA-LAB · Tamper-evident record</div>
    </div>
  </div>
);

type TabId = 'new' | 'previous' | 'results' | 'critical' | 'validation' | 'drafts' | 'rejected';
type OverviewTabId = 'all' | 'pending' | 'completed' | 'critical' | 'validation' | 'drafts' | 'rejected';
type PageMode = 'overview' | 'patient';
type KpiFilter = 'pending' | 'completed' | 'critical' | 'validation' | 'drafts' | 'rejected';
type Priority = 'Routine' | 'Urgent' | 'Emergency';

interface LabPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: 'OPC' | 'GMPC'; diagnosis: string; allergies: string;
  medications: string; vitals: string; billingStatus: string; nhiaStatus: string;
}

interface LabTest {
  id: string; code: string; name: string; category: string; sampleType: string;
  tat: string; price: number; available: boolean; opcPriority?: boolean; gmpcPriority?: boolean;
}

interface BasketTest {
  id: string; testId: string; code: string; name: string; category: string; sampleType: string;
  priority: Priority; indication: string; note: string; price: number; status: 'Draft';
}

interface LabDraft {
  id: string; patientName: string; hospitalId: string; tests: string; createdBy: string;
  lastSaved: string; priority: Priority; items: BasketTest[];
}

interface LabResult {
  id: string; resultNo: string; patient: string; hospitalId: string; tests: string;
  resultDate: string; status: string; critical: boolean; validatedBy: string;
  lines: { parameter: string; value: string; unit: string; range: string; flag: string }[];
  comment: string; enteredBy: string;
  requestNo?: string; sampleId?: string; sampleType?: string;
  collectedAt?: string; receivedAt?: string; reportedAt?: string;
  clinic?: string; age?: number; gender?: string;
  requestingDoctor?: string; department?: string; clinicalIndication?: string;
  apiLabResultId?: number;
  personId?: string;
  templateFields?: ApiTemplateField[] | null;
  values?: ApiLabResultValues;
}

interface CriticalResult {
  id: string; patient: string; hospitalId: string; test: string; criticalValue: string;
  resultTime: string; reportedBy: string; ackStatus: 'Pending' | 'Acknowledged';
  summary: string;
  apiLabResultId?: number;
  personId?: string;
}

interface ValidationRow {
  id: string; requestNo: string; patient: string; tests: string; enteredBy: string;
  entryTime: string; validationStatus: string;
}

interface RejectedRow {
  id: string; requestNo: string; patient: string; tests: string; rejectedBy: string;
  reason: string; date: string;
  personId?: string;
  resubmitTests?: { code: string; name: string; price: number; testId?: number }[];
}

const CATEGORIES = [
  'All', 'Hematology', 'Chemistry', 'Microbiology', 'Serology', 'Immunology',
  'Hormonal Assay', 'Toxicology', 'Urinalysis', 'Stool Analysis', 'Blood Bank / Cross Match',
  'Psychiatric Monitoring', 'Infectious Disease', 'Pregnancy Test', 'Custom Test',
];

const TEST_CATALOG: LabTest[] = [
  { id: 't1', code: 'FBC', name: 'Full Blood Count', category: 'Hematology', sampleType: 'EDTA Blood', tat: '2 hrs', price: 4500, available: true, gmpcPriority: true },
  { id: 't2', code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', sampleType: 'EDTA Blood', tat: '1 hr', price: 2000, available: true },
  { id: 't3', code: 'UE', name: 'U&E (Electrolytes, Urea, Creatinine)', category: 'Chemistry', sampleType: 'Serum', tat: '3 hrs', price: 7500, available: true, opcPriority: true, gmpcPriority: true },
  { id: 't4', code: 'LFT', name: 'Liver Function Test', category: 'Chemistry', sampleType: 'Serum', tat: '4 hrs', price: 8500, available: true, opcPriority: true, gmpcPriority: true },
  { id: 't5', code: 'TFT', name: 'Thyroid Function Test', category: 'Hormonal Assay', sampleType: 'Serum', tat: '6 hrs', price: 12000, available: true, opcPriority: true },
  { id: 't6', code: 'LITH', name: 'Lithium Level', category: 'Psychiatric Monitoring', sampleType: 'Serum', tat: '4 hrs', price: 9500, available: true, opcPriority: true },
  { id: 't7', code: 'VALP', name: 'Valproate Level', category: 'Psychiatric Monitoring', sampleType: 'Serum', tat: '4 hrs', price: 9500, available: true, opcPriority: true },
  { id: 't8', code: 'CLOZ', name: 'Clozapine Monitoring Panel', category: 'Psychiatric Monitoring', sampleType: 'EDTA Blood', tat: '24 hrs', price: 15000, available: true, opcPriority: true },
  { id: 't9', code: 'FBS', name: 'Fasting Blood Sugar', category: 'Chemistry', sampleType: 'Fluoride Blood', tat: '1 hr', price: 1500, available: true, gmpcPriority: true },
  { id: 't10', code: 'RBS', name: 'Random Blood Sugar', category: 'Chemistry', sampleType: 'Fluoride Blood', tat: '30 min', price: 1500, available: true },
  { id: 't11', code: 'HBA1C', name: 'HbA1c', category: 'Chemistry', sampleType: 'EDTA Blood', tat: '4 hrs', price: 6500, available: true, gmpcPriority: true },
  { id: 't12', code: 'MRDT', name: 'Malaria RDT', category: 'Infectious Disease', sampleType: 'Blood', tat: '15 min', price: 2500, available: true, gmpcPriority: true },
  { id: 't13', code: 'URI', name: 'Urinalysis', category: 'Urinalysis', sampleType: 'Urine', tat: '1 hr', price: 1800, available: true, gmpcPriority: true },
  { id: 't14', code: 'UMCS', name: 'Urine MCS', category: 'Microbiology', sampleType: 'Mid-stream Urine', tat: '48 hrs', price: 6500, available: true },
  { id: 't15', code: 'SMCS', name: 'Stool MCS', category: 'Stool Analysis', sampleType: 'Stool', tat: '48 hrs', price: 6500, available: true },
  { id: 't16', code: 'TOX', name: 'Toxicology Screen', category: 'Toxicology', sampleType: 'Urine', tat: '6 hrs', price: 18000, available: true, opcPriority: true },
  { id: 't17', code: 'HIV', name: 'HIV Screening', category: 'Serology', sampleType: 'Serum', tat: '1 hr', price: 3500, available: true },
  { id: 't18', code: 'HBS', name: 'HBsAg', category: 'Serology', sampleType: 'Serum', tat: '2 hrs', price: 4000, available: true },
  { id: 't19', code: 'HCV', name: 'HCV Antibody', category: 'Serology', sampleType: 'Serum', tat: '2 hrs', price: 4500, available: true },
  { id: 't20', code: 'PT', name: 'Pregnancy Test', category: 'Pregnancy Test', sampleType: 'Urine', tat: '30 min', price: 2000, available: true },
  { id: 't21', code: 'BG', name: 'Blood Grouping', category: 'Blood Bank / Cross Match', sampleType: 'EDTA Blood', tat: '1 hr', price: 3000, available: true },
  { id: 't22', code: 'XM', name: 'Cross Matching', category: 'Blood Bank / Cross Match', sampleType: 'EDTA Blood', tat: '2 hrs', price: 8000, available: true },
];

const PATIENTS: LabPatient[] = [
  {
    id: 'q1', name: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831', phone: '08031234567',
    nin: '12345678901', nhiaNo: 'NHIA-882910', age: 34, gender: 'M', clinic: 'OPC',
    diagnosis: 'Moderate Depressive Episode (F32.1)', allergies: 'Penicillin',
    medications: 'Sertraline 100mg OD, Diazepam 5mg PRN', vitals: 'BP 122/78 · HR 72 · Temp 36.8°C',
    billingStatus: 'Paid · Wallet ₦12,400', nhiaStatus: 'Active · NHIA-882910',
  },
  {
    id: 'q2', name: 'Aisha Bello', hospitalId: 'GFA-2024-00912', phone: '08042345678',
    nin: '23456789012', nhiaNo: 'NHIA-773421', age: 29, gender: 'F', clinic: 'GMPC',
    diagnosis: 'Generalized Anxiety Disorder', allergies: 'None',
    medications: 'Escitalopram 10mg OD', vitals: 'BP 118/76 · HR 68 · Temp 36.6°C',
    billingStatus: 'NHIA · Pre-auth pending', nhiaStatus: 'NHIA enrolled',
  },
];

const SEED_RESULTS: LabResult[] = [
  {
    id: 'r1', resultNo: 'RES-2026-118', patient: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
    tests: 'Thyroid Function Test (TFT)', resultDate: '2026-05-28 14:30', status: 'Released', critical: false,
    validatedBy: 'Sci. Adebanjo A. (MLSCN)', enteredBy: 'Tech. Bola O.',
    comment: 'Thyroid function within normal limits. No biochemical evidence of hypo- or hyperthyroidism.',
    requestNo: 'LAB-2026-076', sampleId: 'SMP-2026-01398', sampleType: 'Serum',
    collectedAt: '2026-05-28 09:00', receivedAt: '2026-05-28 09:35', clinic: 'OPC',
    age: 34, gender: 'Male', requestingDoctor: 'Dr. Olufemi Hassan', department: 'Psychiatry · OPC',
    clinicalIndication: 'Baseline TFT — mood stabilizer monitoring',
    lines: [
      { parameter: 'TSH', value: '2.1', unit: 'mIU/L', range: '0.4–4.0', flag: 'Normal' },
      { parameter: 'Free T4', value: '14.2', unit: 'pmol/L', range: '12–22', flag: 'Normal' },
    ],
  },
  {
    id: 'r2', resultNo: 'RES-2026-112', patient: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
    tests: 'Full Blood Count (FBC)', resultDate: '2026-05-15 11:20', status: 'Released', critical: false,
    validatedBy: 'Sci. Adebanjo A. (MLSCN)', enteredBy: 'Tech. Sade O.',
    comment: 'Mild normocytic anaemia. No leucocytosis. Recommend clinical correlation.',
    requestNo: 'LAB-2026-062', sampleId: 'SMP-2026-01204', sampleType: 'EDTA Whole Blood',
    collectedAt: '2026-05-15 08:30', receivedAt: '2026-05-15 09:00', clinic: 'OPC',
    age: 34, gender: 'Male', requestingDoctor: 'Dr. Olufemi Hassan', department: 'Psychiatry · OPC',
    clinicalIndication: 'Routine haematology on admission review',
    lines: [
      { parameter: 'Haemoglobin (Hb)', value: '11.2', unit: 'g/dL', range: '13.0–17.0', flag: 'Low' },
      { parameter: 'WBC', value: '6.8', unit: '×10⁹/L', range: '4.0–11.0', flag: 'Normal' },
      { parameter: 'Platelets', value: '245', unit: '×10⁹/L', range: '150–400', flag: 'Normal' },
    ],
  },
];

/** Flagship sample — shown in Results tab as reference HMS lab report format */
const SAMPLE_LAB_RESULT: LabResult = {
  id: 'sample-fbc', resultNo: 'RES-2026-124', patient: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
  tests: 'Full Blood Count (FBC) + Differential', resultDate: '2026-06-02 10:15', status: 'Released', critical: false,
  validatedBy: 'Scientist Adebanjo A. (MLSCN)', enteredBy: 'Medical Lab Scientist — Sade O.',
  comment: 'Mild normocytic anaemia. No features of acute infection or haematological malignancy. Recommend clinical correlation and repeat FBC in 4–6 weeks if symptoms persist. Consider iron studies if clinically indicated.',
  requestNo: 'LAB-2026-089', sampleId: 'SMP-2026-01452', sampleType: 'EDTA Whole Blood',
  collectedAt: '2026-06-02 07:45', receivedAt: '2026-06-02 08:10', clinic: 'OPC · Outpatient Clinic',
  age: 34, gender: 'Male', requestingDoctor: 'Dr. Olufemi Hassan', department: 'Psychiatry · OPC',
  clinicalIndication: 'Baseline haematology — patient on long-term SSRI therapy; rule out drug-induced cytopenia',
  lines: [
    { parameter: 'Haemoglobin (Hb)', value: '11.8', unit: 'g/dL', range: '13.0–17.0', flag: 'Low' },
    { parameter: 'Packed Cell Volume (PCV)', value: '36', unit: '%', range: '40–50', flag: 'Low' },
    { parameter: 'Red Cell Count (RBC)', value: '4.2', unit: '×10¹²/L', range: '4.5–5.5', flag: 'Low' },
    { parameter: 'Mean Corpuscular Volume (MCV)', value: '86', unit: 'fL', range: '80–100', flag: 'Normal' },
    { parameter: 'Mean Corpuscular Hb (MCH)', value: '28', unit: 'pg', range: '27–33', flag: 'Normal' },
    { parameter: 'White Blood Cells (WBC)', value: '6.4', unit: '×10⁹/L', range: '4.0–11.0', flag: 'Normal' },
    { parameter: 'Neutrophils', value: '58', unit: '%', range: '40–70', flag: 'Normal' },
    { parameter: 'Lymphocytes', value: '32', unit: '%', range: '20–40', flag: 'Normal' },
    { parameter: 'Platelets', value: '238', unit: '×10⁹/L', range: '150–400', flag: 'Normal' },
    { parameter: 'ESR', value: '12', unit: 'mm/hr', range: '0–15', flag: 'Normal' },
  ],
};

const SEED_CRITICAL: CriticalResult[] = [
  {
    id: 'c1', patient: 'Ngozi Ike', hospitalId: 'GFA-2024-00702', test: 'Sodium (U&E)',
    criticalValue: '128 mmol/L (Critical Low)', resultTime: '2026-05-29 08:15',
    reportedBy: 'Sci. Adebanjo', ackStatus: 'Pending',
    summary: 'Hyponatraemia — urgent clinical review required.',
  },
  {
    id: 'c2', patient: 'Femi Ojo', hospitalId: 'GFA-2024-00655', test: 'Lithium Level',
    criticalValue: '1.8 mmol/L (Critical High)', resultTime: '2026-05-28 16:40',
    reportedBy: 'Sci. Adebanjo', ackStatus: 'Pending',
    summary: 'Lithium toxicity range — dose adjustment required.',
  },
];

const SEED_VALIDATION: ValidationRow[] = [
  { id: 'v1', requestNo: 'LAB-2026-089', patient: 'Adamu Sule', tests: 'LFT', enteredBy: 'Tech. Femi', entryTime: '2026-05-29 09:30', validationStatus: 'Awaiting Validation' },
  { id: 'v2', requestNo: 'LAB-2026-087', patient: 'Bisi Oka', tests: 'FBC, U&E', enteredBy: 'Tech. Sade', entryTime: '2026-05-29 08:50', validationStatus: 'Awaiting Validation' },
  { id: 'v3', requestNo: 'LAB-2026-085', patient: 'Tope Adeyemi', tests: 'Lithium Level', enteredBy: 'Tech. Bola', entryTime: '2026-05-28 17:10', validationStatus: 'Awaiting Validation' },
];

const SEED_REJECTED: RejectedRow[] = [
  { id: 'rj1', requestNo: 'LAB-2026-072', patient: 'Chidi Eze', tests: 'Urine MCS', rejectedBy: 'Lab Supervisor', reason: 'Sample hemolysed — recollection required', date: '2026-05-27' },
];

const TRACK_STEPS = ['Request sent', 'Payment confirmed', 'Sample collected', 'Processing', 'Result entered', 'Validation', 'Result released'];

const PENDING_STATUSES = ['PENDING_DOCTOR', 'SENT_TO_BILLING', 'AWAITING_PAYMENT', 'NHIA_PENDING', 'HMO_PENDING', 'PAID', 'SAMPLE_COLLECTED', 'IN_PROCESSING'];
const COMPLETED_STATUSES = ['COMPLETED'];

function logLabAudit(action: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(LAB_AUDIT_KEY) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(LAB_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: LabPatient) {
  try {
    const arr = JSON.parse(localStorage.getItem(LAB_TIMELINE_KEY) || '[]');
    arr.unshift({ event, patient: patient.name, hospitalId: patient.hospitalId, timestamp: new Date().toISOString() });
    localStorage.setItem(LAB_TIMELINE_KEY, JSON.stringify(arr.slice(0, 300)));
  } catch { /* noop */ }
}

const emptyDetails = () => ({
  encounter: '', clinicalIndication: '', workingDiagnosis: '', priority: 'Routine' as Priority,
  collectionLocation: 'Clinic', fasting: 'No', preferredTime: '', doctorNote: '',
  billingType: 'Cash', urgentReason: '', markAllUrgent: false,
});

const mapFlowStatus = (s: string) => {
  const m: Record<string, string> = {
    PENDING_DOCTOR: 'Sent', SENT_TO_BILLING: 'Sent', AWAITING_PAYMENT: 'Awaiting Payment',
    PAID: 'Sample Collected', SAMPLE_COLLECTED: 'Sample Collected', IN_PROCESSING: 'Processing',
    AWAITING_VALIDATION: 'Awaiting Validation', COMPLETED: 'Completed', REJECTED: 'Rejected',
    CANCELLED: 'Cancelled', NHIA_PENDING: 'Awaiting Payment', NHIA_APPROVED: 'Awaiting Sample',
    HMO_PENDING: 'Awaiting Payment', HMO_APPROVED: 'Awaiting Sample', WAIVED: 'Awaiting Sample',
    DRAFT: 'Draft',
  };
  return m[s] ?? s;
};

function mapApiLabStatusToFlow(r: ApiLabRequest): LabFlowStatus {
  if (r.status === 'Cancelled') return 'CANCELLED';
  const lab = r.labStatus ?? '';
  if (lab === 'Validated') return 'COMPLETED';
  if (lab === 'AwaitingValidation' || lab === 'PendingRevalidation') return 'AWAITING_VALIDATION';
  if (lab === 'ResultDraft') return 'IN_PROCESSING';
  if (lab === 'Collected') return 'SAMPLE_COLLECTED';
  if (r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived') return 'PAID';
  if (r.paymentStatus === 'Unpaid') return 'AWAITING_PAYMENT';
  return 'SENT_TO_BILLING';
}

function apiLabRequestToFlow(r: ApiLabRequest): LabFlowRequest {
  const person = r.person;
  const age = person?.dateOfBirth
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(person.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        ),
      )
    : 0;
  const sex = (person?.sex || '').toLowerCase().startsWith('f') ? 'Female' : 'Male';
  return {
    id: r.requestNo,
    patientId: String(r.personId),
    patientName: labPatientName(person),
    age,
    gender: sex,
    hospitalNo: person?.hospitalNo || `PID-${r.personId}`,
    doctor: r.doctorName || '—',
    department: r.source || 'Doctor',
    source: r.source === 'WalkIn' ? 'Walk-In' : 'Doctor',
    tests: (r.items ?? []).map((i) => ({
      code: i.testCode,
      name: i.testName,
      price: i.unitPrice,
    })),
    priority: (r.priority === 'Stat' || r.priority === 'Urgent' || r.priority === 'Routine'
      ? r.priority
      : 'Routine') as LabFlowRequest['priority'],
    status: mapApiLabStatusToFlow(r),
    paymentType:
      r.paymentStatus === 'Waived'
        ? 'Wallet'
        : r.paymentChannel === 'POS'
          ? 'POS'
          : r.paymentChannel === 'Transfer'
            ? 'Transfer'
            : 'Cash',
    paymentRef: r.paymentRef ?? undefined,
    clinicalNote: [r.clinicalIndication, r.clinicalNotes].filter(Boolean).join(' · ') || undefined,
    createdAt: r.createdAt ? r.createdAt.replace('T', ' ').slice(0, 16) : '—',
    updatedAt: r.updatedAt ? r.updatedAt.replace('T', ' ').slice(0, 16) : '—',
    audit: [],
  };
}

function summarizeApiValues(
  values: ApiLabResultValues | null | undefined,
  fields?: ApiTemplateField[] | null,
): string {
  if (!values) return '—';
  const entries = Object.entries(values).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '—';
  return entries
    .slice(0, 4)
    .map(([k, v]) => {
      const label = fields?.find((f) => f.key === k)?.label ?? k;
      const display = Array.isArray(v) ? v.join(', ') : String(v);
      return `${label}: ${display}`;
    })
    .join(' · ');
}

function apiResultLines(r: ApiLabResult): LabResult['lines'] {
  const fields = r.templateFields ?? [];
  if (fields.length > 0) {
    return fields.map((f) => {
      const value = r.values?.[f.key];
      const display = Array.isArray(value) ? value.join(', ') : value != null && value !== '' ? String(value) : '—';
      const critical = isCriticalValue(f, value);
      return {
        parameter: f.label,
        value: display,
        unit: f.unit ?? '',
        range: f.ref ?? '—',
        flag: critical ? 'Critical' : 'Normal',
      };
    });
  }
  return Object.entries(r.values ?? {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => ({
      parameter: k,
      value: Array.isArray(v) ? v.join(', ') : String(v),
      unit: '',
      range: '—',
      flag: 'Normal',
    }));
}

function mapApiToLabResult(r: ApiLabResult): LabResult {
  const lines = apiResultLines(r);
  const critical =
    Boolean(r.criticalFlag) ||
    (r.templateFields ?? []).some((f) => isCriticalValue(f, r.values?.[f.key]));
  return {
    id: String(r.labResultId),
    apiLabResultId: r.labResultId,
    personId: r.personId != null ? String(r.personId) : undefined,
    resultNo: `RES-${r.labResultId}`,
    patient: r.personName || 'Unknown',
    hospitalId: r.hospitalNo || (r.personId ? `PID-${r.personId}` : '—'),
    tests: r.testName || r.templateName || 'Lab result',
    resultDate: (r.validatedAt || r.enteredAt || '').replace('T', ' ').slice(0, 16) || '—',
    status: r.status === 'Validated' ? 'Released' : r.status,
    critical,
    validatedBy: r.validatedBy || '—',
    enteredBy: r.enteredBy || '—',
    comment: r.comment || '',
    lines,
    requestNo: r.requestNo ?? undefined,
    sampleType: r.specimenType ?? undefined,
    gender: r.sex ?? undefined,
    templateFields: r.templateFields,
    values: r.values,
  };
}

function mapApiToCritical(r: ApiLabResult): CriticalResult {
  return {
    id: String(r.labResultId),
    apiLabResultId: r.labResultId,
    personId: r.personId != null ? String(r.personId) : undefined,
    patient: r.personName || 'Unknown',
    hospitalId: r.hospitalNo || '—',
    test: r.testName || r.templateName || 'Lab result',
    criticalValue: summarizeApiValues(r.values, r.templateFields),
    resultTime: (r.validatedAt || r.enteredAt || '').replace('T', ' ').slice(0, 16) || '—',
    reportedBy: r.validatedBy || r.enteredBy || '—',
    ackStatus: r.criticalAckAt ? 'Acknowledged' : 'Pending',
    summary: r.comment || 'Critical result — urgent clinical review required.',
  };
}

function mapApiToValidation(r: ApiLabRequest): ValidationRow {
  return {
    id: String(r.labRequestId),
    requestNo: r.requestNo,
    patient: labPatientName(r.person),
    tests: (r.items ?? []).map((i) => i.testName).join(', ') || '—',
    enteredBy: 'Laboratory',
    entryTime: r.updatedAt ? r.updatedAt.replace('T', ' ').slice(0, 16) : '—',
    validationStatus: 'Awaiting Validation',
  };
}

function mapCancelledToRejected(r: ApiLabRequest): RejectedRow {
  return {
    id: `req-${r.labRequestId}`,
    requestNo: r.requestNo,
    patient: labPatientName(r.person),
    tests: (r.items ?? []).map((i) => i.testName).join(', ') || '—',
    rejectedBy: 'Laboratory',
    reason: r.clinicalNotes || 'Request cancelled',
    date: r.updatedAt ? r.updatedAt.slice(0, 10) : '—',
    personId: String(r.personId),
    resubmitTests: (r.items ?? []).map((i) => ({
      code: i.testCode,
      name: i.testName,
      price: i.unitPrice,
      testId: i.labTestId,
    })),
  };
}

function mapRejectedSampleToRejected(s: ApiLabSample): RejectedRow {
  return {
    id: `sample-${s.sampleId}`,
    requestNo: s.requestNo || s.sampleNo,
    patient: s.personName || 'Unknown',
    tests: s.specimenType,
    rejectedBy: 'Laboratory',
    reason: s.rejectReason || 'Sample rejected — recollection required',
    date: s.collectedAt ? s.collectedAt.slice(0, 10) : '—',
    personId: s.personId != null ? String(s.personId) : undefined,
  };
}

function mapSearchPersonToLabPatient(
  r: Awaited<ReturnType<typeof searchPersons>>[number],
): LabPatient {
  const age = r.dateOfBirth
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(r.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        ),
      )
    : 0;
  return {
    id: String(r.personId),
    name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
    hospitalId: r.hospitalNo || `PID-${r.personId}`,
    phone: r.patientPhoneNo ?? '',
    nin: r.identityNo ?? '',
    nhiaNo: r.nhisNo ?? '',
    age,
    gender: (r.sex === 'F' || r.sex === 'Female' ? 'F' : 'M') as 'M' | 'F',
    clinic: 'OPC',
    diagnosis: '—',
    allergies: 'None',
    medications: '—',
    vitals: '—',
    billingStatus: '—',
    nhiaStatus: r.nhisNo ? `NHIA · ${r.nhisNo}` : '—',
  };
}

export const DocLab = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const labFlow = useLabFlow();
  const doctorName = user?.name ?? 'Dr. User';

  const [patient, setPatient] = useState<LabPatient | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('overview');
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [tab, setTab] = useState<TabId>('new');
  const [patientModal, setPatientModal] = useState(false);
  const [patientModalMode, setPatientModalMode] = useState<'workspace' | 'new'>('workspace');
  const [patientSearch, setPatientSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [basket, setBasket] = useState<BasketTest[]>([]);
  const [details, setDetails] = useState(emptyDetails());
  const [drafts, setDrafts] = useState<LabDraft[]>([]);
  const [results, setResults] = useState<LabResult[]>(() => (isLaboratoryApiEnabled() ? [] : SEED_RESULTS));
  const [critical, setCritical] = useState<CriticalResult[]>(() => (isLaboratoryApiEnabled() ? [] : SEED_CRITICAL));
  const [validation, setValidation] = useState<ValidationRow[]>(() => (isLaboratoryApiEnabled() ? [] : SEED_VALIDATION));
  const [rejected, setRejected] = useState<RejectedRow[]>(() => (isLaboratoryApiEnabled() ? [] : SEED_REJECTED));

  const [sendModal, setSendModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<LabFlowRequest | null>(null);
  const [trackRequest, setTrackRequest] = useState<LabFlowRequest | null>(null);
  const [viewResult, setViewResult] = useState<LabResult | null>(null);
  const [compareResult, setCompareResult] = useState<LabResult | null>(null);
  const [ackCritical, setAckCritical] = useState<CriticalResult | null>(null);
  const [ackAction, setAckAction] = useState('');
  const [ackFollowUp, setAckFollowUp] = useState('');
  const [noteTestId, setNoteTestId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [viewRejected, setViewRejected] = useState<RejectedRow | null>(null);
  const [printRequest, setPrintRequest] = useState<LabFlowRequest | null>(null);
  const labApiOn = isLaboratoryApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();
  const [apiCatalog, setApiCatalog] = useState<LabTest[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [apiPatientResults, setApiPatientResults] = useState<LabPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [sendingApi, setSendingApi] = useState(false);
  const [apiRequests, setApiRequests] = useState<LabFlowRequest[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [apiResultCount, setApiResultCount] = useState(0);
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [resultDetailLoading, setResultDetailLoading] = useState(false);

  const refreshApiQueues = useCallback(async () => {
    if (!labApiOn) return;
    setQueueLoading(true);
    setQueueError(null);
    const q = globalSearch.trim() || undefined;
    try {
      const [
        reqs,
        validatedResults,
        criticalResults,
        validationReqs,
        cancelledReqs,
        rejectedSamples,
      ] = await Promise.all([
        listLabRequests({ source: 'Doctor', q, page: 1, limit: 100 }),
        listLabResults({ status: 'Validated', q, page: 1, limit: 100 }),
        listLabResults({ critical: true, q, page: 1, limit: 100 }),
        listLabRequests({ labStatus: 'AwaitingValidation', source: 'Doctor', q, page: 1, limit: 100 }),
        listLabRequests({ source: 'Doctor', status: 'Cancelled', q, page: 1, limit: 100 }),
        listLabSamples({ status: 'Rejected', q, page: 1, limit: 100 }),
      ]);
      setApiRequests(reqs.items.map(apiLabRequestToFlow));
      setResults(validatedResults.items.map(mapApiToLabResult));
      setApiResultCount(validatedResults.meta.total);
      setCritical(criticalResults.items.map(mapApiToCritical));
      setValidation(validationReqs.items.map(mapApiToValidation));
      setRejected([
        ...cancelledReqs.items.map(mapCancelledToRejected),
        ...rejectedSamples.items.map(mapRejectedSampleToRejected),
      ]);
    } catch (err) {
      setQueueError(err instanceof ApiError ? err.message : 'Could not load lab data');
      setApiRequests([]);
      setResults([]);
      setCritical([]);
      setValidation([]);
      setRejected([]);
      setApiResultCount(0);
    } finally {
      setQueueLoading(false);
    }
  }, [labApiOn, globalSearch]);

  useEffect(() => {
    if (!labApiOn) {
      setApiRequests([]);
      setQueueError(null);
      setResults(SEED_RESULTS);
      setCritical(SEED_CRITICAL);
      setValidation(SEED_VALIDATION);
      setRejected(SEED_REJECTED);
      return;
    }
    void refreshApiQueues();
  }, [labApiOn, refreshApiQueues]);

  const loadIndexedDrafts = useCallback(async () => {
    if (!labApiOn) return;
    try {
      const stored = await listLabRequestDrafts();
      setDrafts(
        stored.map((d) => ({
          id: d.personId,
          patientName: d.patientName,
          hospitalId: d.hospitalId,
          tests: d.items.map((i) => i.name).join(', ') || 'In progress',
          createdBy: d.createdBy,
          lastSaved: new Date(d.updatedAt).toLocaleString(),
          priority: d.details.priority,
          items: d.items,
        })),
      );
    } catch {
      setDrafts([]);
    }
  }, [labApiOn]);

  useEffect(() => {
    void loadIndexedDrafts();
  }, [loadIndexedDrafts]);

  useEffect(() => {
    if (!labApiOn) {
      setApiCatalog([]);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    listLabTests({ status: 'Active', limit: 200 })
      .then((data) => {
        if (cancelled) return;
        setApiCatalog(
          data.items.map((t: ApiLabTest) => ({
            id: String(t.labTestId),
            code: t.testCode,
            name: t.name,
            category: t.category,
            sampleType: t.specimenType,
            tat: t.turnaround,
            price: t.unitPrice,
            available: t.status === 'Active',
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : 'Could not load lab catalog');
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [labApiOn]);

  const catalog = labApiOn ? apiCatalog : TEST_CATALOG;

  const ctxToPatient = (ctx: DocPatientContext): LabPatient => ({
    id: ctx.id, name: ctx.name, hospitalId: ctx.hospitalId, phone: ctx.phone ?? '',
    nin: ctx.nin ?? '', nhiaNo: ctx.nhiaNo ?? '', age: ctx.age ?? 0, gender: ctx.gender ?? 'M',
    clinic: (ctx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
    diagnosis: ctx.diagnosis ?? '—', allergies: ctx.allergies ?? 'None',
    medications: ctx.medications ?? '—', vitals: '—',
    billingStatus: 'Pending verification', nhiaStatus: ctx.nhiaNo ? `NHIA · ${ctx.nhiaNo}` : '—',
  });

  const enterPatientWorkspace = (p: LabPatient, startTab: TabId = 'new') => {
    setPatient(p);
    setPageMode('patient');
    setTab(startTab);
    setDetails(d => ({ ...d, workingDiagnosis: p.diagnosis, clinicalIndication: p.diagnosis }));
    setPatientModal(false);
    setPatientSearch('');
  };

  useClinicalEmbeddedInit({ embedded, patientContext }, (ctx) => {
    const p = !labApiOn && !patientsApiOn
      ? PATIENTS.find(x => x.id === ctx.id || x.hospitalId === ctx.hospitalId || x.name === ctx.name) ?? ctxToPatient(ctx)
      : ctxToPatient(ctx);
    enterPatientWorkspace(p, 'new');
    if (!embedded) toast.success(`Lab workspace ready for ${p.name}`);
    if (labApiOn && patientsApiOn && (ctx.hospitalId || ctx.name)) {
      void searchPersons(ctx.hospitalId || ctx.name)
        .then((rows) => {
          const match = rows.find((r) =>
            r.hospitalNo === ctx.hospitalId
            || String(r.personId) === ctx.id
            || [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') === ctx.name,
          ) ?? rows[0];
          if (match) enterPatientWorkspace(mapSearchPersonToLabPatient(match), 'new');
        })
        .catch(() => { /* keep ctx fallback */ });
    }
  });

  const backToOverview = () => {
    setPageMode('overview');
    toast.info('Showing all patients — use Search Patient to order new tests');
  };

  const openPatientModal = (mode: 'workspace' | 'new') => {
    setPatientModalMode(mode);
    setPatientModal(true);
  };

  const patientFromRequest = (r: LabFlowRequest): LabPatient => ({
    id: r.patientId, name: r.patientName, hospitalId: r.hospitalNo, phone: '', nin: '', nhiaNo: '',
    age: r.age, gender: r.gender === 'Female' ? 'F' : 'M', clinic: r.department === 'GMPC' ? 'GMPC' : 'OPC',
    diagnosis: '—', allergies: 'None', medications: '—', vitals: '—', billingStatus: '—', nhiaStatus: '—',
  });

  const requirePatient = (fn: () => void) => {
    if (!patient) { toast.error('Select a patient first'); setPatientModal(true); return; }
    fn();
  };

  const filteredCatalog = useMemo(() => {
    const q = testSearch.toLowerCase();
    let list = catalog.filter(t => {
      const matchQ = !q || `${t.name} ${t.code} ${t.category}`.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'All' || t.category === categoryFilter;
      return matchQ && matchCat;
    });
    if (!labApiOn && patient?.clinic === 'OPC') {
      list = [...list].sort((a, b) => (b.opcPriority ? 1 : 0) - (a.opcPriority ? 1 : 0));
    } else if (!labApiOn && patient?.clinic === 'GMPC') {
      list = [...list].sort((a, b) => (b.gmpcPriority ? 1 : 0) - (a.gmpcPriority ? 1 : 0));
    }
    return list;
  }, [testSearch, categoryFilter, patient?.clinic, catalog, labApiOn]);

  const flowRequests = labApiOn ? apiRequests : labFlow.requests;

  const matchesSearch = (q: string) => {
    if (!globalSearch.trim()) return true;
    const s = globalSearch.toLowerCase();
    return q.toLowerCase().includes(s);
  };

  const overviewRequests = useMemo(() => {
    let list = flowRequests.filter(r =>
      matchesSearch(`${r.patientName} ${r.hospitalNo} ${r.id} ${r.tests.map(t => t.name).join(' ')}`),
    );
    switch (overviewTab) {
      case 'pending': list = list.filter(r => PENDING_STATUSES.includes(r.status)); break;
      case 'completed': list = list.filter(r => COMPLETED_STATUSES.includes(r.status)); break;
      case 'rejected': list = list.filter(r => r.status === 'REJECTED'); break;
      case 'all': default: break;
    }
    return list;
  }, [flowRequests, overviewTab, globalSearch]);

  const overviewResults = useMemo(() => {
    if (overviewTab !== 'all' && overviewTab !== 'completed') return [];
    return results.filter(r =>
      matchesSearch(`${r.patient} ${r.hospitalId} ${r.tests} ${r.resultNo}`),
    );
  }, [results, overviewTab, globalSearch]);

  const overviewCritical = useMemo(() =>
    critical.filter(c => matchesSearch(`${c.patient} ${c.hospitalId} ${c.test}`)),
  [critical, globalSearch]);

  const overviewValidation = useMemo(() =>
    validation.filter(v => matchesSearch(`${v.patient} ${v.requestNo} ${v.tests}`)),
  [validation, globalSearch]);

  const overviewRejected = useMemo(() => {
    if (labApiOn) {
      return rejected.filter(rj => matchesSearch(`${rj.patient} ${rj.requestNo} ${rj.tests}`));
    }
    return [
      ...rejected.filter(rj => matchesSearch(`${rj.patient} ${rj.requestNo} ${rj.tests}`)),
      ...flowRequests.filter(r => r.status === 'REJECTED' && matchesSearch(`${r.patientName} ${r.hospitalNo}`)).map(r => ({
        id: r.id, requestNo: r.id, patient: r.patientName, tests: r.tests.map(t => t.name).join(', '),
        rejectedBy: 'Lab Supervisor', reason: r.rejectReason ?? 'Sample rejected', date: r.updatedAt,
      })),
    ];
  }, [rejected, flowRequests, globalSearch, labApiOn]);

  const overviewDrafts = useMemo(() =>
    drafts.filter(d => matchesSearch(`${d.patientName} ${d.hospitalId} ${d.tests}`)),
  [drafts, globalSearch]);

  const patientRequests = patient
    ? flowRequests.filter(r =>
        r.hospitalNo === patient.hospitalId ||
        r.patientName === patient.name ||
        r.patientId === patient.id,
      )
    : flowRequests;

  const kpis = useMemo(() => ({
    pending: flowRequests.filter(r => PENDING_STATUSES.includes(r.status)).length,
    completed: labApiOn
      ? apiResultCount
      : results.length + flowRequests.filter(r => r.status === 'COMPLETED').length,
    critical: labApiOn
      ? critical.filter(c => c.ackStatus === 'Pending').length
      : critical.filter(c => c.ackStatus === 'Pending').length,
    validation: labApiOn
      ? validation.length
      : validation.length,
    drafts: drafts.length,
    rejected: labApiOn ? rejected.length : rejected.length + flowRequests.filter(r => r.status === 'REJECTED').length,
  }), [flowRequests, results, critical, validation, drafts, rejected, labApiOn, apiResultCount]);

  const selectPatient = (p: LabPatient) => {
    const startTab: TabId = patientModalMode === 'new' ? 'new' : 'previous';
    enterPatientWorkspace(p, startTab);
    if (patientModalMode === 'new') {
      setBasket([]);
      setDetails({ ...emptyDetails(), workingDiagnosis: p.diagnosis, clinicalIndication: p.diagnosis });
    }
    logLabAudit(`Patient selected: ${p.name}`);
    toast.success(patientModalMode === 'new' ? `New lab request for ${p.name}` : `Patient workspace: ${p.name}`);
  };

  const addTest = (t: LabTest) => {
    if (!patient) { toast.error('Select a patient first'); setPatientModal(true); return; }
    if (basket.some(b => b.testId === t.id)) { toast.info(`${t.name} already in basket`); return; }
    const pri = details.markAllUrgent ? (details.priority === 'Emergency' ? 'Emergency' : 'Urgent') : details.priority;
    setBasket(prev => [...prev, {
      id: `b${Date.now()}`, testId: t.id, code: t.code, name: t.name, category: t.category,
      sampleType: t.sampleType, priority: pri, indication: details.clinicalIndication || patient.diagnosis,
      note: '', price: t.price, status: 'Draft',
    }]);
    toast.success(`${t.name} added to request`);
  };

  const saveDraft = async () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    const draft: LabDraft = {
      id: labApiOn ? patient.id : `DRF-LAB-${Date.now()}`,
      patientName: patient.name, hospitalId: patient.hospitalId,
      tests: basket.map(b => b.name).join(', ') || 'In progress', createdBy: doctorName,
      lastSaved: new Date().toLocaleString(), priority: details.priority, items: [...basket],
    };
    if (labApiOn) {
      try {
        await upsertLabRequestDraft({
          personId: patient.id,
          patientName: patient.name,
          hospitalId: patient.hospitalId,
          createdBy: doctorName,
          items: basket.map((b) => ({ ...b })),
          details: { ...details },
        });
        await loadIndexedDrafts();
      } catch {
        toast.error('Could not save draft locally');
        return;
      }
    } else {
      setDrafts(prev => [draft, ...prev.filter(d => d.id !== draft.id)]);
    }
    logLabAudit(`Lab draft saved for ${patient.name}`);
    if (patient) logTimeline(`Lab request draft saved — ${draft.tests}`, patient);
    notifySuccess(`Draft saved for ${patient.name}`, 'Draft Saved');
  };

  const openResultDetail = async (r: LabResult) => {
    setViewResult(r);
    if (!labApiOn || !r.apiLabResultId) return;
    setResultDetailLoading(true);
    try {
      const full = await getLabResult(r.apiLabResultId);
      setViewResult(mapApiToLabResult(full));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load result detail');
    } finally {
      setResultDetailLoading(false);
    }
  };

  const confirmCriticalAck = async () => {
    if (!ackAction.trim()) { toast.error('Clinical action is required'); return; }
    if (!ackCritical) return;
    if (labApiOn && ackCritical.apiLabResultId) {
      setAckSubmitting(true);
      try {
        await acknowledgeLabResult(ackCritical.apiLabResultId);
        await refreshApiQueues();
        logLabAudit(`Critical result acknowledged: ${ackCritical.test}`);
        notifySuccess('Critical result acknowledged', 'Acknowledged');
        setAckCritical(null);
        setAckAction('');
        setAckFollowUp('');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not acknowledge critical result');
      } finally {
        setAckSubmitting(false);
      }
      return;
    }
    setCritical(prev => prev.map(c => c.id === ackCritical.id ? { ...c, ackStatus: 'Acknowledged' } : c));
    logLabAudit(`Critical result acknowledged: ${ackCritical.test}`);
    notifySuccess('Critical result acknowledged', 'Acknowledged');
    setAckCritical(null);
    setAckAction('');
    setAckFollowUp('');
  };

  const loadDraftForPatient = async (d: LabDraft) => {
    if (labApiOn) {
      const p: LabPatient = {
        id: d.id,
        name: d.patientName,
        hospitalId: d.hospitalId,
        phone: '', nin: '', nhiaNo: '', age: 0, gender: 'M', clinic: 'OPC',
        diagnosis: '—', allergies: 'None', medications: '—', vitals: '—',
        billingStatus: '—', nhiaStatus: '—',
      };
      setBasket(d.items);
      enterPatientWorkspace(p, 'new');
      toast.success('Draft loaded');
      return;
    }
    const p = PATIENTS.find(x => x.hospitalId === d.hospitalId);
    if (p) {
      setBasket(d.items);
      enterPatientWorkspace(p, 'new');
      toast.success('Draft loaded');
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (labApiOn) {
      try {
        await deleteLabRequestDraft(draftId);
        await loadIndexedDrafts();
      } catch {
        toast.error('Could not delete draft');
        return;
      }
    } else {
      setDrafts(prev => prev.filter(x => x.id !== draftId));
    }
    toast.success('Draft deleted');
  };

  const resubmitRejected = (rj: RejectedRow) => {
    const p: LabPatient = patient ?? {
      id: rj.personId ?? rj.id,
      name: rj.patient,
      hospitalId: '',
      phone: '', nin: '', nhiaNo: '', age: 0, gender: 'M', clinic: 'OPC',
      diagnosis: '—', allergies: 'None', medications: '—', vitals: '—',
      billingStatus: '—', nhiaStatus: '—',
    };
    enterPatientWorkspace(p, 'new');
    if (rj.resubmitTests?.length) {
      setBasket(
        rj.resubmitTests.map((t, i) => {
          const cat = catalog.find(c => c.code === t.code || c.name === t.name);
          return {
            id: `b${Date.now()}${i}`,
            testId: cat?.id ?? String(t.testId ?? t.code),
            code: t.code,
            name: t.name,
            category: cat?.category ?? 'Custom Test',
            sampleType: cat?.sampleType ?? '—',
            priority: 'Routine' as Priority,
            indication: '',
            note: '',
            price: t.price,
            status: 'Draft' as const,
          };
        }),
      );
    }
    toast.info('Edit tests and resubmit from New Request');
  };

  const sendRequest = async () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (basket.length === 0) { toast.error('Add at least one test'); return; }
    if (!details.clinicalIndication.trim()) { toast.error('Clinical indication is required'); return; }
    if (details.markAllUrgent && !details.urgentReason.trim()) { toast.error('Urgency reason is required'); return; }

    const priority = details.markAllUrgent
      ? (details.priority === 'Emergency' ? 'Stat' : 'Urgent')
      : (details.priority === 'Emergency' ? 'Stat' : details.priority === 'Urgent' ? 'Urgent' : 'Routine');

    if (labApiOn) {
      const personId = Number(patient.id);
      if (!Number.isFinite(personId) || personId <= 0) {
        toast.error('Patient must be selected from live search (API) before sending');
        return;
      }
      setSendingApi(true);
      try {
        const encounterId = patientContext?.encounterId
          ? Number(patientContext.encounterId)
          : undefined;
        const created = await createLabRequest({
          personId,
          encounterId: Number.isFinite(encounterId) && (encounterId as number) > 0 ? encounterId : undefined,
          priority: priority as 'Routine' | 'Urgent' | 'Stat',
          clinicalIndication: details.clinicalIndication.trim(),
          clinicalNotes: [
            details.doctorNote.trim(),
            details.urgentReason.trim() ? `Urgent: ${details.urgentReason.trim()}` : '',
          ].filter(Boolean).join(' · ') || undefined,
          items: basket.map((b) => ({
            testId: Number(b.testId),
            lineNotes: b.note.trim() || undefined,
          })),
        });
        logLabAudit(`Lab request ${created.requestNo} sent for ${patient.name} (Unpaid)`);
        if (patient) logTimeline(`Lab request sent — ${created.requestNo}`, patient);
        setBasket([]);
        setDetails(emptyDetails());
        setSendModal(false);
        setTab('previous');
        if (labApiOn) {
          await deleteLabRequestDraft(patient.id).catch(() => undefined);
          await loadIndexedDrafts();
        }
        await refreshApiQueues();
        notifySuccess(
          `${created.requestNo} sent · ₦${created.totalAmount.toLocaleString()} · Unpaid at cashier`,
          'Lab Request Sent',
        );
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not send lab request');
      } finally {
        setSendingApi(false);
      }
      return;
    }

    const req = labFlow.addRequest({
      id: '',
      patientId: patient.hospitalId,
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender === 'F' ? 'Female' : 'Male',
      hospitalNo: patient.hospitalId,
      doctor: doctorName,
      department: patient.clinic,
      source: 'Doctor',
      tests: basket.map(b => ({ code: b.code, name: b.name, price: b.price })),
      priority: priority as 'Routine' | 'Urgent' | 'Stat',
      clinicalNote: `${details.clinicalIndication}${details.doctorNote ? ` · ${details.doctorNote}` : ''}${details.urgentReason ? ` · Urgent: ${details.urgentReason}` : ''}`,
      paymentType: 'Cash',
    });

    labFlow.sendToBilling(req.id, doctorName);

    logLabAudit(`Lab request ${req.id} sent for ${patient.name} — ${basket.map(b => b.code).join(', ')}`);
    logTimeline(`Lab request sent — ${basket.map(b => b.name).join(', ')}`, patient);
    setBasket([]);
    setDetails(emptyDetails());
    setSendModal(false);
    setTab('previous');
    notifySuccess('Lab request sent successfully.', 'Lab Request Sent');
  };

  const repeatRequest = (req: LabFlowRequest) => {
    enterPatientWorkspace(patientFromRequest(req), 'new');
    const tests = req.tests.map(t => {
      const cat = catalog.find(c => c.code === t.code || c.name === t.name);
      return cat ?? { id: t.code, code: t.code, name: t.name, category: 'Custom Test', sampleType: '—', tat: '—', price: t.price, available: true };
    });
    setBasket(tests.map(t => ({
      id: `b${Date.now()}${t.id}`, testId: t.id, code: t.code, name: t.name, category: t.category,
      sampleType: t.sampleType, priority: 'Routine' as Priority, indication: req.clinicalNote ?? '',
      note: '', price: t.price, status: 'Draft' as const,
    })));
    toast.success('Tests copied to New Request');
  };

  const kpiClick = (f: KpiFilter) => {
    setPageMode('overview');
    const map: Record<KpiFilter, OverviewTabId> = {
      pending: 'pending', completed: 'completed', critical: 'critical',
      validation: 'validation', drafts: 'drafts', rejected: 'rejected',
    };
    setOverviewTab(map[f]);
  };

  const renderRequestTable = (rows: LabFlowRequest[], emptyMsg: string) => (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase"><tr>{['Request No.', 'Patient', 'Hospital No.', 'Tests', 'Requested By', 'Date', 'Priority', 'Billing', 'Lab Status', 'Result', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2 font-medium">{r.patientName}</td>
              <td className="px-3 py-2 text-xs">{r.hospitalNo}</td>
              <td className="px-3 py-2 text-xs">{r.tests.map(t => t.name).join(', ')}</td>
              <td className="px-3 py-2">{r.doctor}</td>
              <td className="px-3 py-2 text-xs">{r.createdAt}</td>
              <td className="px-3 py-2"><StatusPill tone={r.priority !== 'Routine' ? 'red' : 'blue'}>{r.priority}</StatusPill></td>
              <td className="px-3 py-2 text-xs">{r.paymentType ?? 'Cash'}</td>
              <td className="px-3 py-2"><StatusPill tone="amber">{mapFlowStatus(r.status)}</StatusPill></td>
              <td className="px-3 py-2">{r.status === 'COMPLETED' ? 'Available' : 'Pending'}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setViewRequest(r)} title="View"><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => enterPatientWorkspace(patientFromRequest(r), 'previous')} title="Open patient"><UserPlus className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setTrackRequest(r)} title="Track"><Clock className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setPrintRequest(r)} title="Print"><Printer className="h-3 w-3" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">{emptyMsg}</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );

  useEffect(() => {
    if (!patientModal || !patientsApiOn) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setApiPatientResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPatientSearchLoading(true);
      searchPersons(q)
        .then((rows) => {
          if (cancelled) return;
          setApiPatientResults(rows.map(mapSearchPersonToLabPatient));
        })
        .catch(() => {
          if (!cancelled) setApiPatientResults([]);
        })
        .finally(() => {
          if (!cancelled) setPatientSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientModal, patientSearch, patientsApiOn]);

  const patientResults = patientsApiOn
    ? apiPatientResults
    : labApiOn
      ? []
      : PATIENTS.filter(p =>
      !patientSearch || `${p.name} ${p.hospitalId} ${p.phone} ${p.nin} ${p.nhiaNo}`.toLowerCase().includes(patientSearch.toLowerCase()),
    );

  const patientMatches = (personId?: string, hospitalId?: string, name?: string) => {
    if (!patient) return true;
    if (personId && personId === patient.id) return true;
    if (hospitalId && hospitalId === patient.hospitalId) return true;
    if (name && name === patient.name) return true;
    return false;
  };

  const filteredResults = patient
    ? results.filter(r => patientMatches(r.personId, r.hospitalId, r.patient))
    : results;
  const filteredCritical = patient
    ? critical.filter(c => patientMatches(c.personId, c.hospitalId, c.patient))
    : critical;
  const filteredValidation = patient
    ? validation.filter(v => patientMatches(undefined, undefined, v.patient))
    : validation;
  const filteredRejected = patient
    ? rejected.filter(rj => patientMatches(rj.personId, undefined, rj.patient))
    : rejected;

  const enterPatientFromResult = (r: LabResult) => {
    enterPatientWorkspace({
      id: r.personId ?? r.id,
      name: r.patient,
      hospitalId: r.hospitalId,
      phone: '', nin: '', nhiaNo: '', age: r.age ?? 0,
      gender: (r.gender?.startsWith('F') ? 'F' : 'M') as 'M' | 'F',
      clinic: 'OPC',
      diagnosis: '—', allergies: 'None', medications: '—', vitals: '—',
      billingStatus: '—', nhiaStatus: '—',
    }, 'results');
  };

  const sendChecklist = [
    ['Patient selected', !!patient],
    ['At least one test selected', basket.length > 0],
    ['Clinical indication entered', !!details.clinicalIndication.trim()],
    ['Diagnosis entered', !!details.workingDiagnosis.trim()],
    ...(labApiOn
      ? [['Payment: Unpaid at cashier (doctor does not bill)', true] as const]
      : [['Billing status checked', !!details.billingType] as const]),
    ['Sample collection location', !!details.collectionLocation],
    ['Urgency reason (if urgent)', !details.markAllUrgent || !!details.urgentReason.trim()],
  ];

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Lab Request Engine"
      flowTitle="Lab Request Engine"
      flowSubtitle="Order investigations, track status and review results"
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Lab Request Engine</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Order laboratory investigations, track request status, and review results from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pageMode === 'patient' && (
            <Button variant="outline" size="sm" onClick={backToOverview}><ArrowLeft className="h-4 w-4 mr-1" />All Patients</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => openPatientModal('workspace')}><Search className="h-4 w-4 mr-1" />Search Patient</Button>
          <Button size="sm" onClick={() => openPatientModal('new')}><Plus className="h-4 w-4 mr-1" />New Lab Request</Button>
          {pageMode === 'overview' && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setOverviewTab('completed'); }}><Eye className="h-4 w-4 mr-1" />View Results</Button>
              {!labApiOn && (
                <Button variant="outline" size="sm" onClick={() => toast.success('Results exported to PDF')}><Download className="h-4 w-4 mr-1" />Export Results</Button>
              )}
            </>
          )}
          {pageMode === 'patient' && patient && (
            <Button variant="outline" size="sm" onClick={() => setPrintRequest(patientRequests[0] ?? null)}><Printer className="h-4 w-4 mr-1" />Print Request</Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ['pending', 'Pending Requests', kpis.pending, 'Awaiting lab action', Clock, 'amber'],
          ['completed', 'Completed Results', kpis.completed, 'Today', CheckCircle2, 'green'],
          ['critical', 'Critical Results', kpis.critical, 'Action required', AlertTriangle, 'rose'],
          ['validation', 'Awaiting Validation', kpis.validation, 'Lab validation pending', Eye, 'blue'],
          ['drafts', 'Draft Requests', kpis.drafts, 'Saved but not sent', FileText, 'purple'],
          ['rejected', 'Rejected Requests', kpis.rejected, 'Returned by laboratory', XCircle, 'rose'],
        ] as const).map(([key, title, val, sub, Icon, t]) => (
          <button key={key} type="button" onClick={() => kpiClick(key as KpiFilter)} className="text-left">
            <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t} />
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW — all patients (default landing) ========== */}
      {pageMode === 'overview' && (
        <>
          <Card className="mb-4 p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search all patients, hospital no., request no., test name…"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">Hospital-wide lab queue — no patient selection required to review results.</p>
            {labApiOn && (
              <Button size="sm" variant="outline" disabled={queueLoading} onClick={() => void refreshApiQueues()}>
                {queueLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Refresh
              </Button>
            )}
            <Button size="sm" onClick={() => openPatientModal('new')}><Plus className="h-4 w-4 mr-1" />Order Tests for Patient</Button>
          </Card>

          {labApiOn && queueLoading && (
            <Card className="mb-4 p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading lab data…
            </Card>
          )}
          {labApiOn && queueError && !queueLoading && (
            <Card className="mb-4 p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
              <p className="text-sm text-rose-800">{queueError}</p>
              <Button size="sm" variant="outline" onClick={() => void refreshApiQueues()}>Retry</Button>
            </Card>
          )}

          <Tabs value={overviewTab} onValueChange={v => setOverviewTab(v as OverviewTabId)}>
            <TabsList className="flex flex-wrap h-auto mb-4">
              {([
                ['all', 'All Requests'], ['pending', 'Pending'], ['completed', 'Completed Results'],
                ['critical', 'Critical'], ['validation', 'Awaiting Validation'],
                ['drafts', 'Drafts'], ['rejected', 'Rejected'],
              ] as const).map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              {renderRequestTable(overviewRequests, labApiOn && !queueLoading ? 'No lab requests found.' : 'No lab requests found.')}
              {overviewResults.length > 0 && (
                <Card className="overflow-x-auto mt-4">
                  <h3 className="font-semibold text-sm mb-3 px-1">Recent Completed Results</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase"><tr>{['Result No.', 'Patient', 'Hospital No.', 'Tests', 'Date', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody className="divide-y">
                      {overviewResults.map(r => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-mono text-xs">{r.resultNo}</td>
                          <td className="px-3 py-2">{r.patient}</td>
                          <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
                          <td className="px-3 py-2">{r.tests}</td>
                          <td className="px-3 py-2 text-xs">{r.resultDate}</td>
                          <td className="px-3 py-2"><StatusPill tone="green">{r.status}</StatusPill></td>
                          <td className="px-3 py-2">
                            <Button size="sm" variant="ghost" onClick={() => void openResultDetail(r)}><Eye className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => enterPatientFromResult(r)}><UserPlus className="h-3 w-3" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pending">
              {renderRequestTable(overviewRequests, 'No pending lab requests.')}
            </TabsContent>

            <TabsContent value="completed">
              {!labApiOn && (
              <Card className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">Sample Lab Result</h3>
                    <p className="text-xs text-muted-foreground">Standard HMS laboratory report format — verified & released</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewResult(SAMPLE_LAB_RESULT)}><Eye className="h-3.5 w-3.5 mr-1" />Full View</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Printing sample result…')}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
                  </div>
                </div>
                <StandardLabResultView result={SAMPLE_LAB_RESULT} />
              </Card>
              )}
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Result No.', 'Patient', 'Hospital No.', 'Tests', 'Result Date', 'Validated By', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {overviewResults.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-mono text-xs">{r.resultNo}</td>
                        <td className="px-3 py-2 font-medium">{r.patient}</td>
                        <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
                        <td className="px-3 py-2">{r.tests}</td>
                        <td className="px-3 py-2 text-xs">{r.resultDate}</td>
                        <td className="px-3 py-2">{r.validatedBy}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="ghost" onClick={() => void openResultDetail(r)}><Eye className="h-3 w-3" /></Button>
                          {!labApiOn && (
                            <Button size="sm" variant="ghost" onClick={() => toast.success('Printing…')}><Printer className="h-3 w-3" /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {overviewResults.length === 0 && overviewRequests.length === 0 && !queueLoading && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{labApiOn ? 'No validated lab results yet.' : 'No completed results yet.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
              {overviewRequests.length > 0 && renderRequestTable(overviewRequests, '')}
            </TabsContent>

            <TabsContent value="critical">
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Hospital No.', 'Test', 'Critical Value', 'Time', 'Ack Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {overviewCritical.map(c => (
                      <tr key={c.id} className={c.ackStatus === 'Pending' ? 'bg-rose-50/50' : ''}>
                        <td className="px-3 py-2 font-medium">{c.patient}</td>
                        <td className="px-3 py-2 text-xs">{c.hospitalId}</td>
                        <td className="px-3 py-2">{c.test}</td>
                        <td className="px-3 py-2 text-rose-700 font-mono text-xs">{c.criticalValue}</td>
                        <td className="px-3 py-2 text-xs">{c.resultTime}</td>
                        <td className="px-3 py-2"><StatusPill tone={c.ackStatus === 'Pending' ? 'red' : 'green'}>{c.ackStatus}</StatusPill></td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => setAckCritical(c)} disabled={c.ackStatus === 'Acknowledged'}>Acknowledge</Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const res = results.find(r => r.id === c.id || r.apiLabResultId === c.apiLabResultId);
                            if (res) void openResultDetail(res);
                            else toast.info(`Open result for ${c.patient}`);
                          }}><Eye className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    ))}
                    {overviewCritical.length === 0 && !queueLoading && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No critical results requiring action.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="validation">
              <Card className="overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-3 p-2 bg-amber-50 border border-amber-200 rounded mx-1">Unvalidated results — not for final clinical use.</p>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Request No.', 'Patient', 'Tests', 'Entered By', 'Entry Time', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {overviewValidation.map(v => (
                      <tr key={v.id}>
                        <td className="px-3 py-2 font-mono text-xs">{v.requestNo}</td>
                        <td className="px-3 py-2">{v.patient}</td>
                        <td className="px-3 py-2">{v.tests}</td>
                        <td className="px-3 py-2">{v.enteredBy}</td>
                        <td className="px-3 py-2 text-xs">{v.entryTime}</td>
                        <td className="px-3 py-2"><StatusPill tone="amber">{v.validationStatus}</StatusPill></td>
                      </tr>
                    ))}
                    {overviewValidation.length === 0 && !queueLoading && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No results awaiting validation.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="drafts">
              <Card className="overflow-x-auto">
                {overviewDrafts.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No draft requests.</p> : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Hospital No.', 'Tests', 'Created By', 'Last Saved', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody className="divide-y">
                      {overviewDrafts.map(d => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">{d.patientName}</td>
                          <td className="px-3 py-2 text-xs">{d.hospitalId}</td>
                          <td className="px-3 py-2">{d.tests}</td>
                          <td className="px-3 py-2">{d.createdBy}</td>
                          <td className="px-3 py-2 text-xs">{d.lastSaved}</td>
                          <td className="px-3 py-2">
                            <Button size="sm" variant="outline" onClick={() => void loadDraftForPatient(d)}>Continue</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="rejected">
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase"><tr>{['Request No.', 'Patient', 'Tests', 'Reason', 'Date', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {overviewRejected.map(rj => (
                      <tr key={rj.id}>
                        <td className="px-3 py-2 font-mono text-xs">{rj.requestNo}</td>
                        <td className="px-3 py-2">{rj.patient}</td>
                        <td className="px-3 py-2">{rj.tests}</td>
                        <td className="px-3 py-2 text-xs max-w-[240px]">{rj.reason}</td>
                        <td className="px-3 py-2 text-xs">{rj.date}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => setViewRejected(rj as RejectedRow)}>View</Button>
                        </td>
                      </tr>
                    ))}
                    {overviewRejected.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No rejected requests.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ========== PATIENT WORKSPACE — order & patient-specific view ========== */}
      {pageMode === 'patient' && patient && (
        <>
      {/* Patient banner */}
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-semibold">{patient.name}</div><div className="text-xs font-mono">{patient.hospitalId}</div></div>
            <div><div className="text-xs text-muted-foreground">Age / Gender</div><div>{patient.age} / {patient.gender}</div><StatusPill tone={patient.clinic === 'OPC' ? 'purple' : 'blue'}>{patient.clinic}</StatusPill></div>
            <div><div className="text-xs text-muted-foreground">Diagnosis</div><div>{patient.diagnosis}</div></div>
            <div><div className="text-xs text-muted-foreground">Allergies</div><div className="text-rose-700 font-medium">{patient.allergies}</div></div>
            <div><div className="text-xs text-muted-foreground">Medications</div><div className="text-xs">{patient.medications}</div></div>
            <div><div className="text-xs text-muted-foreground">Latest Vitals</div><div className="text-xs">{patient.vitals}</div></div>
            <div><div className="text-xs text-muted-foreground">Billing</div><div>{patient.billingStatus}</div></div>
            <div><div className="text-xs text-muted-foreground">NHIA / HMO</div><div>{patient.nhiaStatus}</div></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {!labApiOn && (
              <Button size="sm" variant="outline" onClick={() => toast.info('Opening EMR…')}><FileText className="h-3.5 w-3.5 mr-1" />Open EMR</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setTab('previous')}><History className="h-3.5 w-3.5 mr-1" />Previous Labs</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/diagnosis`)}><Stethoscope className="h-3.5 w-3.5 mr-1" />Diagnosis</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/prescriptions`)}><Pill className="h-3.5 w-3.5 mr-1" />Medications</Button>
            {!labApiOn && (
              <Button size="sm" variant="outline" onClick={() => toast.info(`Billing: ${patient.billingStatus}`)}><CreditCard className="h-3.5 w-3.5 mr-1" />Billing</Button>
            )}
            <Button size="sm" variant="ghost" onClick={backToOverview}><ArrowLeft className="h-3.5 w-3.5 mr-1" />Back to All</Button>
          </div>
        </Card>

      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto mb-4">
          {([
            ['new', 'New Request'], ['previous', 'Previous Requests'], ['results', 'Results'],
            ['critical', 'Critical Results'], ['validation', 'Awaiting Validation'],
            ['drafts', 'Draft Requests'], ['rejected', 'Rejected Requests'],
          ] as const).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
          ))}
        </TabsList>

        {/* NEW REQUEST — 3 column */}
        <TabsContent value="new">
          <div className="grid lg:grid-cols-12 gap-4 pb-20 lg:pb-0">
            {/* Left: catalogue */}
            <div className="lg:col-span-4">
              <Card>
                <h3 className="font-semibold text-sm mb-3">Test Catalogue</h3>
                <Input placeholder="Search tests by name, category, code…" value={testSearch} onChange={e => setTestSearch(e.target.value)} className="mb-2 h-9" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 mb-2"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
                  {catalogLoading && labApiOn && (
                    <p className="text-sm text-muted-foreground py-6 text-center flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading test catalogue…
                    </p>
                  )}
                  {!catalogLoading && filteredCatalog.length === 0 && labApiOn && (
                    <p className="text-sm text-muted-foreground py-6 text-center">No lab tests available.</p>
                  )}
                  {filteredCatalog.map(t => (
                    <button key={t.id} type="button" onClick={() => addTest(t)}
                      className={`w-full text-left p-2.5 border rounded-lg hover:bg-muted/50 transition-colors ${basket.some(b => b.testId === t.id) ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="text-xs text-muted-foreground">₦{t.price.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.code} · {t.category}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <StatusPill tone="blue">{t.sampleType}</StatusPill>
                        <StatusPill tone="green">{t.tat}</StatusPill>
                        {!t.available && <StatusPill tone="red">Unavailable</StatusPill>}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Center: basket */}
            <div className="lg:col-span-5">
              <Card>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Selected Tests: {basket.length}</h3>
                  {basket.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setBasket([])}>Clear All</Button>
                  )}
                </div>
                {basket.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Click tests from the catalogue to build your lab request.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40"><tr>{['Test', 'Category', 'Sample', 'Priority', 'Indication', 'Price', 'Action'].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                      <tbody className="divide-y">
                        {basket.map(b => (
                          <tr key={b.id}>
                            <td className="px-2 py-1.5 font-medium">{b.name}</td>
                            <td className="px-2 py-1.5">{b.category}</td>
                            <td className="px-2 py-1.5">{b.sampleType}</td>
                            <td className="px-2 py-1.5">
                              <Select value={b.priority} onValueChange={v => setBasket(prev => prev.map(x => x.id === b.id ? { ...x, priority: v as Priority } : x))}>
                                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>{['Routine', 'Urgent', 'Emergency'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1.5 max-w-[100px] truncate">{b.indication || '—'}</td>
                            <td className="px-2 py-1.5">₦{b.price.toLocaleString()}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-0.5">
                                <Button size="sm" variant="ghost" className="h-6" title="Mark Urgent" onClick={() => setBasket(prev => prev.map(x => x.id === b.id ? { ...x, priority: 'Urgent' } : x))}><AlertTriangle className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6" title="Add Note" onClick={() => { setNoteTestId(b.id); setNoteText(b.note); }}><FileText className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6" title="Duplicate" onClick={() => setBasket(prev => [...prev, { ...b, id: `b${Date.now()}` }])}><Copy className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6" title="Remove" onClick={() => setBasket(prev => prev.filter(x => x.id !== b.id))}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 text-sm font-medium text-right">Total: ₦{basket.reduce((s, b) => s + b.price, 0).toLocaleString()}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => requirePatient(() => void saveDraft())}><FileText className="h-3.5 w-3.5 mr-1" />Save Draft</Button>
                  <Button size="sm" onClick={() => requirePatient(() => setSendModal(true))}><Send className="h-3.5 w-3.5 mr-1" />Send Request</Button>
                </div>
              </Card>
            </div>

            {/* Right: request details */}
            <div className="lg:col-span-3">
              <Card className="sticky top-20">
                <h3 className="font-semibold text-sm mb-3">Request Details</h3>
                <div className="space-y-2.5 text-sm">
                  <div><Label className="text-xs">Patient</Label><Input value={patient?.name ?? '—'} readOnly className="h-9 bg-muted/40" /></div>
                  <div><Label className="text-xs">Requesting Doctor</Label><Input value={doctorName} readOnly className="h-9 bg-muted/40" /></div>
                  <div><Label className="text-xs">Clinic / Department</Label><Input value={patient?.clinic ?? '—'} readOnly className="h-9 bg-muted/40" /></div>
                  <div><Label className="text-xs">Encounter</Label><Input value={details.encounter} onChange={e => setDetails(d => ({ ...d, encounter: e.target.value }))} placeholder="ENC-2026-…" className="h-9" /></div>
                  <div><Label className="text-xs">Clinical Indication *</Label><Textarea value={details.clinicalIndication} onChange={e => setDetails(d => ({ ...d, clinicalIndication: e.target.value }))} rows={2} /></div>
                  <div><Label className="text-xs">Working Diagnosis</Label><Input value={details.workingDiagnosis} onChange={e => setDetails(d => ({ ...d, workingDiagnosis: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-xs">Priority</Label>
                    <Select value={details.priority} onValueChange={v => setDetails(d => ({ ...d, priority: v as Priority }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Routine', 'Urgent', 'Emergency'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Sample Collection Location</Label>
                    <Select value={details.collectionLocation} onValueChange={v => setDetails(d => ({ ...d, collectionLocation: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Lab', 'Ward', 'Emergency', 'Clinic'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Fasting Required</Label>
                    <Select value={details.fasting} onValueChange={v => setDetails(d => ({ ...d, fasting: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Preferred Collection Time</Label><Input type="time" value={details.preferredTime} onChange={e => setDetails(d => ({ ...d, preferredTime: e.target.value }))} className="h-9" /></div>
                  <div><Label className="text-xs">Doctor Note to Lab</Label><Textarea value={details.doctorNote} onChange={e => setDetails(d => ({ ...d, doctorNote: e.target.value }))} rows={2} /></div>
                  {!labApiOn && (
                  <div><Label className="text-xs">Billing Type</Label>
                    <Select value={details.billingType} onValueChange={v => setDetails(d => ({ ...d, billingType: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Cash', 'NHIA', 'HMO', 'Wallet', 'Exempted'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  )}
                  {labApiOn && (
                    <div className="p-2 border rounded-lg text-xs text-muted-foreground bg-muted/30">
                      Payment stays <strong>Unpaid</strong> until Cashier confirms. Doctor does not select Cash / NHIA / HMO.
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2 border rounded-lg">
                    <Label className="text-xs">Mark Entire Request Urgent</Label>
                    <Switch checked={details.markAllUrgent} onCheckedChange={v => setDetails(d => ({ ...d, markAllUrgent: v }))} />
                  </div>
                  {details.markAllUrgent && (
                    <div><Label className="text-xs">Reason for Urgency *</Label><Textarea value={details.urgentReason} onChange={e => setDetails(d => ({ ...d, urgentReason: e.target.value }))} rows={2} placeholder="Clinical reason…" /></div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Mobile sticky send */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t lg:hidden flex items-center justify-between gap-2 z-40">
            <span className="text-sm font-medium">Selected: {basket.length}</span>
            <Button size="sm" onClick={() => requirePatient(() => setSendModal(true))}><Send className="h-4 w-4 mr-1" />Send Request</Button>
          </div>
        </TabsContent>

        {/* PREVIOUS REQUESTS */}
        <TabsContent value="previous">
          {labApiOn && queueLoading && (
            <Card className="mb-4 p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
            </Card>
          )}
          {renderRequestTable(patientRequests, labApiOn ? 'No lab requests for this patient yet.' : 'No lab requests for this patient yet.')}
        </TabsContent>

        {/* RESULTS — patient filtered */}
        <TabsContent value="results">
          {labApiOn && queueLoading && (
            <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
            </Card>
          )}
          {labApiOn && !queueLoading && filteredResults.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No validated lab results for this patient yet.
            </Card>
          )}
          {(labApiOn ? filteredResults.length > 0 : true) && (
            <>
          {!labApiOn && (
          <Card className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-sm">Sample Lab Result</h3>
                <p className="text-xs text-muted-foreground">Standard HMS laboratory report — reference format for reviewing patient results</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewResult(SAMPLE_LAB_RESULT)}><Eye className="h-3.5 w-3.5 mr-1" />Expand</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Exported to PDF')}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
              </div>
            </div>
            <StandardLabResultView result={SAMPLE_LAB_RESULT} />
          </Card>
          )}
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Result No.', 'Patient', 'Hospital No.', 'Tests', 'Result Date', 'Status', 'Critical', 'Validated By', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {filteredResults.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs">{r.resultNo}</td>
                    <td className="px-3 py-2">{r.patient}</td>
                    <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
                    <td className="px-3 py-2">{r.tests}</td>
                    <td className="px-3 py-2 text-xs">{r.resultDate}</td>
                    <td className="px-3 py-2"><StatusPill tone="green">{r.status}</StatusPill></td>
                    <td className="px-3 py-2">{r.critical ? <StatusPill tone="red">Critical</StatusPill> : '—'}</td>
                    <td className="px-3 py-2">{r.validatedBy}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openResultDetail(r)}><Eye className="h-3 w-3" /></Button>
                        {!labApiOn && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setCompareResult(r)}><TrendingUp className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toast.success('Printing…')}><Printer className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toast.success('Exported to PDF')}><Download className="h-3 w-3" /></Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/documentation`)}><FileText className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!labApiOn && filteredResults.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No results for this patient.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
            </>
          )}
        </TabsContent>

        {/* CRITICAL */}
        <TabsContent value="critical">
          {labApiOn && queueLoading && (
            <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading critical results…
            </Card>
          )}
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Hospital No.', 'Test', 'Critical Value', 'Result Time', 'Reported By', 'Ack Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {filteredCritical.map(c => (
                  <tr key={c.id} className={c.ackStatus === 'Pending' ? 'bg-rose-50/50' : ''}>
                    <td className="px-3 py-2 font-medium">{c.patient}</td>
                    <td className="px-3 py-2 text-xs">{c.hospitalId}</td>
                    <td className="px-3 py-2">{c.test}</td>
                    <td className="px-3 py-2 text-rose-700 font-mono text-xs">{c.criticalValue}</td>
                    <td className="px-3 py-2 text-xs">{c.resultTime}</td>
                    <td className="px-3 py-2">{c.reportedBy}</td>
                    <td className="px-3 py-2"><StatusPill tone={c.ackStatus === 'Pending' ? 'red' : 'green'}>{c.ackStatus}</StatusPill></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setAckCritical(c)} disabled={c.ackStatus === 'Acknowledged'}>Acknowledge</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const res = results.find(r => r.id === c.id || r.apiLabResultId === c.apiLabResultId);
                          if (res) void openResultDetail(res);
                        }}><Eye className="h-3 w-3" /></Button>
                        {!labApiOn && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => toast.success('Team notified')}><Bell className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toast.success('Printing…')}><Printer className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCritical.length === 0 && !queueLoading && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No critical results for this patient.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* VALIDATION */}
        <TabsContent value="validation">
          <Card className="overflow-x-auto">
            <p className="text-xs text-muted-foreground mb-3 p-2 bg-amber-50 border border-amber-200 rounded">Results below are entered but not yet validated — do not use as final clinical results.</p>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Request No.', 'Patient', 'Tests', 'Entered By', 'Entry Time', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {filteredValidation.map(v => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-mono text-xs">{v.requestNo}</td>
                    <td className="px-3 py-2">{v.patient}</td>
                    <td className="px-3 py-2">{v.tests}</td>
                    <td className="px-3 py-2">{v.enteredBy}</td>
                    <td className="px-3 py-2 text-xs">{v.entryTime}</td>
                    <td className="px-3 py-2"><StatusPill tone="amber">{v.validationStatus}</StatusPill></td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => toast.info('Pending result — awaiting lab validation')}><Eye className="h-3 w-3" /></Button>
                      {!labApiOn && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => toast.success('Message sent to lab')}><MessageSquare className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toast.info('Tracking status…')}><Clock className="h-3 w-3" /></Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredValidation.length === 0 && !queueLoading && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No results awaiting validation.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* DRAFTS */}
        <TabsContent value="drafts">
          <Card className="overflow-x-auto">
            {drafts.filter(d => !patient || d.patientName === patient.name || d.hospitalId === patient.hospitalId).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No draft lab requests.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Tests', 'Created By', 'Last Saved', 'Priority', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {drafts.filter(d => !patient || d.patientName === patient.name || d.hospitalId === patient.hospitalId).map(d => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">{d.patientName}</td>
                      <td className="px-3 py-2">{d.tests}</td>
                      <td className="px-3 py-2">{d.createdBy}</td>
                      <td className="px-3 py-2 text-xs">{d.lastSaved}</td>
                      <td className="px-3 py-2"><StatusPill tone="blue">{d.priority}</StatusPill></td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => void loadDraftForPatient(d)}>Continue</Button>
                        <Button size="sm" variant="outline" onClick={() => { setBasket(d.items); setSendModal(true); }}>Send</Button>
                        <Button size="sm" variant="ghost" onClick={() => void deleteDraft(d.id)}><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        {/* REJECTED */}
        <TabsContent value="rejected">
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Request No.', 'Patient', 'Tests', 'Rejected By', 'Reason', 'Date', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {[
                  ...filteredRejected,
                  ...(labApiOn ? [] : flowRequests.filter(r => r.status === 'REJECTED').map(r => ({
                    id: r.id, requestNo: r.id, patient: r.patientName, tests: r.tests.map(t => t.name).join(', '),
                    rejectedBy: 'Lab Supervisor', reason: r.rejectReason ?? 'Sample rejected', date: r.updatedAt,
                  }))),
                ].map(rj => (
                  <tr key={rj.id}>
                    <td className="px-3 py-2 font-mono text-xs">{rj.requestNo}</td>
                    <td className="px-3 py-2">{rj.patient}</td>
                    <td className="px-3 py-2">{rj.tests}</td>
                    <td className="px-3 py-2">{rj.rejectedBy}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px]">{rj.reason}</td>
                    <td className="px-3 py-2 text-xs">{rj.date}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => setViewRejected(rj as RejectedRow)}>View Reason</Button>
                      <Button size="sm" variant="ghost" onClick={() => resubmitRejected(rj as RejectedRow)}>Resubmit</Button>
                    </td>
                  </tr>
                ))}
                {filteredRejected.length === 0 && !queueLoading && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No rejected requests.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}

      {/* Patient modal — shared */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{patientModalMode === 'new' ? 'New Lab Request — Select Patient' : 'Search Patient'}</DialogTitle>
            <DialogDescription>Search by name, hospital number, phone, NHIA, or NIN</DialogDescription>
          </DialogHeader>
          <Input className="mb-2" placeholder="Search…" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} autoFocus />
          {patientSearchLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching patients…
            </p>
          )}
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {patientResults.map(p => (
              <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.clinic} · {p.phone}</div>
              </button>
            ))}
            {!patientSearchLoading && patientResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {patientsApiOn && patientSearch.trim().length < 2
                  ? 'Type at least 2 characters to search.'
                  : 'No patients found.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send confirmation */}
      <Dialog open={sendModal} onOpenChange={setSendModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Lab Request</DialogTitle><DialogDescription>Pre-dispatch checklist</DialogDescription></DialogHeader>
          <ul className="text-sm space-y-2">
            {sendChecklist.map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-2">
                {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                {label}
              </li>
            ))}
          </ul>
          {basket.length > 0 && (
            <div className="mt-3 text-xs border rounded p-2 bg-muted/20">
              <div className="font-semibold mb-1">Tests ({basket.length}) — ₦{basket.reduce((s, b) => s + b.price, 0).toLocaleString()}</div>
              {basket.map(b => <div key={b.id}>· {b.name} ({b.priority})</div>)}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { void saveDraft(); setSendModal(false); }}>Save Draft</Button>
            <Button onClick={() => void sendRequest()} disabled={sendingApi}>
              {sendingApi ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {labApiOn ? 'Send Request (Unpaid)' : 'Send to Lab'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View request */}
      <Dialog open={!!viewRequest} onOpenChange={v => !v && setViewRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Lab Request — {viewRequest?.id}</DialogTitle></DialogHeader>
          {viewRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded text-xs">
                <div><b>Patient:</b> {viewRequest.patientName}</div>
                <div><b>Hospital No:</b> {viewRequest.hospitalNo}</div>
                <div><b>Doctor:</b> {viewRequest.doctor}</div>
                <div><b>Department:</b> {viewRequest.department}</div>
                <div><b>Priority:</b> {viewRequest.priority}</div>
                <div><b>Status:</b> {STATUS_LABEL[viewRequest.status]}</div>
                <div><b>Payment:</b> {viewRequest.paymentType ?? 'Cash'}</div>
                <div><b>Created:</b> {viewRequest.createdAt}</div>
              </div>
              <table className="w-full text-xs border">
                <thead className="bg-muted/40"><tr>{['Test', 'Code', 'Price'].map(h => <th key={h} className="px-2 py-1 text-left border-b">{h}</th>)}</tr></thead>
                <tbody>{viewRequest.tests.map(t => (
                  <tr key={t.code}><td className="px-2 py-1 border-b">{t.name}</td><td className="px-2 py-1 border-b">{t.code}</td><td className="px-2 py-1 border-b">₦{t.price.toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
              {viewRequest.clinicalNote && <p className="text-xs"><b>Clinical note:</b> {viewRequest.clinicalNote}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRequest(null)}>Close</Button>
            {viewRequest && <Button variant="outline" onClick={() => { repeatRequest(viewRequest); setViewRequest(null); }}>Repeat Request</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track status */}
      <Dialog open={!!trackRequest} onOpenChange={v => !v && setTrackRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Track Status — {trackRequest?.id}</DialogTitle></DialogHeader>
          {trackRequest && (
            <div className="space-y-2">
              {TRACK_STEPS.map((step, i) => {
                const statusIdx = ['PENDING_DOCTOR', 'SENT_TO_BILLING', 'AWAITING_PAYMENT', 'PAID', 'SAMPLE_COLLECTED', 'IN_PROCESSING', 'AWAITING_VALIDATION', 'COMPLETED'].indexOf(trackRequest.status);
                const done = i <= Math.max(0, statusIdx);
                return (
                  <div key={step} className={`flex items-center gap-3 p-2 rounded border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/20'}`}>
                    {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">{step}</span>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><Button onClick={() => setTrackRequest(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print request */}
      <Dialog open={!!printRequest} onOpenChange={v => !v && setPrintRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Lab Request — Print Preview</DialogTitle></DialogHeader>
          {printRequest && (
            <div className="border rounded-lg p-6 text-sm space-y-3 bg-white text-black">
              <div className="text-center border-b pb-2">
                <div className="font-bold">Federal Neuro-Psychiatric Hospital, Aro</div>
                <div className="text-xs">Laboratory Request Form</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><b>Request No:</b> {printRequest.id}</div>
                <div><b>Date:</b> {printRequest.createdAt}</div>
                <div><b>Patient:</b> {printRequest.patientName}</div>
                <div><b>Hospital No:</b> {printRequest.hospitalNo}</div>
                <div><b>Doctor:</b> {printRequest.doctor}</div>
                <div><b>Priority:</b> {printRequest.priority}</div>
              </div>
              <table className="w-full text-xs border">
                <thead><tr className="bg-muted/40">{['Test', 'Code', 'Price'].map(h => <th key={h} className="border px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{printRequest.tests.map(t => (
                  <tr key={t.code}><td className="border px-2 py-1">{t.name}</td><td className="border px-2 py-1">{t.code}</td><td className="border px-2 py-1">₦{t.price.toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRequest(null)}>Close</Button>
            <Button onClick={() => { window.print(); toast.success('Sent to printer'); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test note */}
      <Dialog open={!!noteTestId} onOpenChange={v => !v && setNoteTestId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Note to Test</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Note for laboratory…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTestId(null)}>Cancel</Button>
            <Button onClick={() => {
              if (noteTestId) setBasket(prev => prev.map(b => b.id === noteTestId ? { ...b, note: noteText } : b));
              toast.success('Note saved');
              setNoteTestId(null); setNoteText('');
            }}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledge critical */}
      <Dialog open={!!ackCritical} onOpenChange={v => !v && setAckCritical(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge Critical Result</DialogTitle></DialogHeader>
          {ackCritical && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm">
                <div className="font-semibold text-rose-900">{ackCritical.test}</div>
                <div className="font-mono text-rose-700 mt-1">{ackCritical.criticalValue}</div>
                <p className="text-xs mt-2">{ackCritical.summary}</p>
              </div>
              <div><Label>Clinical action taken *</Label><Textarea value={ackAction} onChange={e => setAckAction(e.target.value)} rows={2} /></div>
              <div><Label>Follow-up plan</Label><Textarea value={ackFollowUp} onChange={e => setAckFollowUp(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckCritical(null)}>Cancel</Button>
            <Button onClick={() => void confirmCriticalAck()} disabled={ackSubmitting}>
              {ackSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Confirm Acknowledgement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejected reason */}
      <Dialog open={!!viewRejected} onOpenChange={v => !v && setViewRejected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejection Reason — {viewRejected?.requestNo}</DialogTitle></DialogHeader>
          {viewRejected && (
            <div className="space-y-2 text-sm">
              <p><b>Patient:</b> {viewRejected.patient}</p>
              <p><b>Tests:</b> {viewRejected.tests}</p>
              <p><b>Rejected by:</b> {viewRejected.rejectedBy}</p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded">{viewRejected.reason}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRejected(null)}>Close</Button>
            <Button onClick={() => { if (viewRejected) resubmitRejected(viewRejected); setViewRejected(null); }}>Edit & Resubmit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare previous */}
      <Dialog open={!!compareResult} onOpenChange={v => !v && setCompareResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Trend Comparison — {compareResult?.tests}</DialogTitle></DialogHeader>
          {compareResult && (
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Comparing current vs previous results for {compareResult.patient}</p>
              {compareResult.lines.map(l => (
                <div key={l.parameter} className="flex justify-between p-2 border rounded">
                  <span>{l.parameter}</span>
                  <span className="font-mono">{l.value} {l.unit} <StatusPill tone={l.flag === 'Normal' ? 'green' : 'amber'}>{l.flag}</StatusPill></span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground italic">Previous values loaded from medication history where available.</p>
            </div>
          )}
          <DialogFooter><Button onClick={() => setCompareResult(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result drawer */}
      <Sheet open={!!viewResult} onOpenChange={v => !v && setViewResult(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lab Result — {viewResult?.resultNo}</SheetTitle>
            <SheetDescription>{viewResult?.patient} · {viewResult?.tests}</SheetDescription>
          </SheetHeader>
          {viewResult && (
            <div className="mt-4 space-y-4">
              {resultDetailLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading result…
                </p>
              ) : (
                <StandardLabResultView result={viewResult} />
              )}
              <div className="flex gap-2">
                {!labApiOn && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Printing…')}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('Exported to PDF')}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => navigate(`${base}/documentation`)}><FileText className="h-3.5 w-3.5 mr-1" />Add to Note</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </ClinicalPageShell>
  );
};
