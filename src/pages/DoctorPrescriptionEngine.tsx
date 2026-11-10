import { useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import {
  useApplyDocPatient, type DocPatientContext,
} from '@/utils/docClinicalPatientContext';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { searchPersons } from '@/lib/api/patients';
import { isPharmacyApiEnabled, listDrugs } from '@/lib/api/pharmacy';
import {
  createPrescription,
  createExternalPrescription,
  isPrescriptionsApiEnabled,
  listPrescriptionMedications,
  listPrescriptions,
  refillPrescription,
  stopPrescriptionItem,
  updatePrescription,
  type ApiMedicationLine,
  type ApiPrescription,
} from '@/lib/api/prescriptions';
import {
  checkClinicalInteractions,
  closeClinicalPharmacyAlert,
  isClinicalPharmacyApiEnabled,
  listClinicalPharmacyAlerts,
  overrideClinicalPharmacyAlert,
  type ClinicalPharmacyAlert,
} from '@/lib/api/clinical-pharmacy';
import {
  Pill, Send, Clock, AlertTriangle, Search, Plus, Printer, Download, Eye, Trash2,
  Edit, RefreshCw, StopCircle, History, FileText, FlaskConical, ShieldAlert, CheckCircle2,
  XCircle, Copy, MessageSquare,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const PHARMACY_QUEUE_KEY = 'gfa_pharmacy_inbound_rx_v1';
const RX_AUDIT_KEY = 'gfa_doc_rx_audit_v1';
const TIMELINE_KEY = 'gfa_doc_timeline_rx_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Prescription Engine">{children}</DashboardLayout>
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

type AlertSeverity = 'Mild' | 'Moderate' | 'Severe' | 'Critical';
type TabId = 'build' | 'active' | 'drafts' | 'pending' | 'dispensed' | 'stopped' | 'external' | 'alerts' | 'history';
type KpiFilter = 'all' | 'active' | 'sent' | 'pending' | 'alerts' | 'stopped' | 'external';

interface RxPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; weight: string; clinic: 'OPC' | 'GMPC'; diagnosis: string;
  allergies: string; pregnancy: string; renalFlag: boolean; liverFlag: boolean;
  activeMeds: string; walletStatus: string;
  /** PERSON_ID when loaded from live patients API */
  personId?: number;
}

interface FormularyDrug {
  id: string; generic: string; brand: string; drugClass: string;
  strengths: string[]; forms: string[]; routes: string[];
  controlled?: boolean; stock: number; price: number; formulary: 'Formulary' | 'Non-formulary' | 'Restricted';
  monitoring?: string;
}

interface MedLine {
  id: string; drug: string; generic: string; strength: string; form: string; dose: string;
  frequency: string; duration: string; startDate: string; endDate: string; prescribedBy: string;
  dispenseStatus: string; source: 'Internal' | 'External'; route?: string;
  stopReason?: string; stopDate?: string;
  prescriptionId?: number; itemId?: number;
}

interface BasketLine {
  id: string; drugId: string; drug: string; strength: string; form: string; dose: string;
  frequency: string; duration: string; quantity: number; source: string; interaction: string;
  status: 'Draft' | 'Ready';
}

interface SafetyAlert {
  id: string; type: string; severity: AlertSeverity; message: string; recommendation: string;
  acknowledged?: boolean; justification?: string;
}

interface DraftRx {
  id: string; patientName: string; hospitalId: string; drugs: string; createdBy: string;
  lastSaved: string; safetyStatus: string; items: BasketLine[];
  prescriptionId?: number;
}

interface PendingRx {
  id: string; patientName: string; hospitalId: string; drugSummary: string; sentTime: string;
  pharmacyStatus: string; paymentStatus: string; prescribedBy: string; diagnosis: string;
  allergies: string; items: { drug: string; strength: string; form: string; dose: string; frequency: string; duration: string; quantity: number; source: string }[];
  prescriptionId?: number;
}

interface DispensedRx {
  id: string; patient: string; hospitalId: string; summary: string; by: string; time: string;
  qty: string; balance: string; prescribedBy: string; paymentStatus: string; totalAmount: number;
  items: { drug: string; strength: string; dose: string; frequency: string; duration: string; quantity: number; unitPrice: number }[];
  prescriptionId?: number;
}

type CdsAlertRow = SafetyAlert & { patient: string; drug: string; status: string; alertId?: number };

interface AllergyRecord {
  substance: string; reaction: string; severity: string; verifiedDate: string; notes?: string;
}

const FORMULARY: FormularyDrug[] = [
  { id: 'd1', generic: 'Sertraline', brand: 'Lustral', drugClass: 'SSRI', strengths: ['50mg', '100mg'], forms: ['Tablet'], routes: ['PO'], stock: 840, price: 45, formulary: 'Formulary' },
  { id: 'd2', generic: 'Clozapine', brand: 'Leponex', drugClass: 'Atypical Antipsychotic', strengths: ['25mg', '100mg'], forms: ['Tablet'], routes: ['PO'], controlled: true, stock: 120, price: 180, formulary: 'Restricted', monitoring: 'ANC weekly × 18 weeks' },
  { id: 'd3', generic: 'Olanzapine', brand: 'Zyprexa', drugClass: 'Atypical Antipsychotic', strengths: ['5mg', '10mg'], forms: ['Tablet'], routes: ['PO'], stock: 560, price: 95, formulary: 'Formulary' },
  { id: 'd4', generic: 'Haloperidol', brand: 'Serenace', drugClass: 'Typical Antipsychotic', strengths: ['5mg', '10mg'], forms: ['Tablet', 'Injection'], routes: ['PO', 'IM'], stock: 400, price: 35, formulary: 'Formulary' },
  { id: 'd5', generic: 'Lithium Carbonate', brand: 'Priadel', drugClass: 'Mood Stabilizer', strengths: ['300mg', '400mg'], forms: ['Tablet'], routes: ['PO'], stock: 320, price: 55, formulary: 'Formulary', monitoring: 'Lithium level, renal function' },
  { id: 'd6', generic: 'Diazepam', brand: 'Valium', drugClass: 'Benzodiazepine', strengths: ['5mg', '10mg'], forms: ['Tablet'], routes: ['PO'], controlled: true, stock: 200, price: 28, formulary: 'Restricted' },
  { id: 'd7', generic: 'Paracetamol', brand: 'Panadol', drugClass: 'Analgesic', strengths: ['500mg', '1g'], forms: ['Tablet'], routes: ['PO'], stock: 4500, price: 20, formulary: 'Formulary' },
  { id: 'd8', generic: 'Risperidone', brand: 'Risperdal', drugClass: 'Atypical Antipsychotic', strengths: ['1mg', '2mg'], forms: ['Tablet'], routes: ['PO'], stock: 280, price: 72, formulary: 'Formulary' },
  { id: 'd9', generic: 'Fluoxetine', brand: 'Prozac', drugClass: 'SSRI', strengths: ['20mg'], forms: ['Capsule'], routes: ['PO'], stock: 410, price: 58, formulary: 'Formulary' },
  { id: 'd10', generic: 'Lorazepam', brand: 'Ativan', drugClass: 'Benzodiazepine', strengths: ['1mg', '2mg'], forms: ['Tablet'], routes: ['PO', 'SL'], controlled: true, stock: 95, price: 42, formulary: 'Restricted' },
];

const PATIENTS: RxPatient[] = [
  {
    id: 'q1', name: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831', phone: '08031234567',
    nin: '12345678901', nhiaNo: 'NHIA-882910', age: 34, gender: 'M', weight: '72 kg',
    clinic: 'OPC', diagnosis: 'Moderate Depressive Episode (F32.1)', allergies: 'Penicillin',
    pregnancy: 'N/A', renalFlag: false, liverFlag: false,
    activeMeds: 'Sertraline 100mg OD, Diazepam 5mg PRN', walletStatus: 'Paid · Wallet ₦12,400',
  },
  {
    id: 'q2', name: 'Aisha Bello', hospitalId: 'GFA-2024-00912', phone: '08042345678',
    nin: '23456789012', nhiaNo: 'NHIA-773421', age: 29, gender: 'F', weight: '58 kg',
    clinic: 'GMPC', diagnosis: 'Generalized Anxiety Disorder', allergies: 'None',
    pregnancy: 'Not pregnant', renalFlag: false, liverFlag: true,
    activeMeds: 'Escitalopram 10mg OD', walletStatus: 'NHIA · Pre-auth pending',
  },
];

const SEED_ACTIVE: MedLine[] = [
  { id: 'm1', drug: 'Sertraline', generic: 'Sertraline', strength: '100mg', form: 'Tablet', dose: '100mg', frequency: 'OD', duration: '28 days', startDate: '2026-05-29', endDate: '2026-06-26', prescribedBy: 'Dr. Lawal', dispenseStatus: 'Dispensed', source: 'Internal' },
  { id: 'm2', drug: 'Diazepam', generic: 'Diazepam', strength: '5mg', form: 'Tablet', dose: '5mg', frequency: 'PRN', duration: '14 days', startDate: '2026-05-20', endDate: '2026-06-03', prescribedBy: 'Dr. Lawal', dispenseStatus: 'Active', source: 'Internal' },
  { id: 'm3', drug: 'Olanzapine', generic: 'Olanzapine', strength: '10mg', form: 'Tablet', dose: '10mg', frequency: 'HS', duration: '—', startDate: '2026-04-01', endDate: '—', prescribedBy: 'Dr. Adewale', dispenseStatus: 'Stopped', source: 'Internal', stopReason: 'Treatment changed', stopDate: '2026-05-15' },
];

const SEED_EXTERNAL: MedLine[] = [
  { id: 'e1', drug: 'Vitamin D3', generic: 'Cholecalciferol', strength: '5000 IU', form: 'Capsule', dose: '1 cap', frequency: 'Weekly', duration: '8 weeks', startDate: '2026-05-01', endDate: '2026-06-26', prescribedBy: 'External · Patient reported', dispenseStatus: 'Verified', source: 'External' },
];

const ALLERGY_PROFILES: Record<string, AllergyRecord[]> = {
  q1: [
    { substance: 'Penicillin', reaction: 'Anaphylaxis, urticaria', severity: 'Severe', verifiedDate: '2024-03-12', notes: 'Documented in admission record. Avoid all beta-lactam antibiotics.' },
    { substance: 'Amoxicillin', reaction: 'Cross-reactivity with penicillin', severity: 'Severe', verifiedDate: '2024-03-12', notes: 'Contraindicated — same drug class as penicillin.' },
  ],
  q2: [],
};

const SEED_PENDING: PendingRx[] = [
  {
    id: 'RX-2026-041', patientName: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
    drugSummary: 'Sertraline 100mg × 28', sentTime: '2026-05-29 10:50',
    pharmacyStatus: 'Awaiting Dispense', paymentStatus: 'Paid', prescribedBy: 'Dr. Lawal',
    diagnosis: 'Moderate Depressive Episode (F32.1)', allergies: 'Penicillin',
    items: [{ drug: 'Sertraline', strength: '100mg', form: 'Tablet', dose: '100mg', frequency: 'OD', duration: '28 days', quantity: 28, source: 'Internal Pharmacy' }],
  },
  {
    id: 'RX-2026-038', patientName: 'Aisha Bello', hospitalId: 'GFA-2024-00912',
    drugSummary: 'Escitalopram 10mg × 30', sentTime: '2026-05-28 14:20',
    pharmacyStatus: 'Awaiting Payment', paymentStatus: 'Unpaid', prescribedBy: 'Dr. Adewale',
    diagnosis: 'Generalized Anxiety Disorder', allergies: 'None',
    items: [{ drug: 'Escitalopram', strength: '10mg', form: 'Tablet', dose: '10mg', frequency: 'OD', duration: '30 days', quantity: 30, source: 'Internal Pharmacy' }],
  },
];

const SEED_DISPENSED: DispensedRx[] = [
  {
    id: 'RX-2026-035', patient: 'Tope Adeyemi', hospitalId: 'GFA-2024-00831',
    summary: 'Sertraline 50mg × 28', by: 'Pharm. Tunde', time: '2026-05-08 13:45',
    qty: '28', balance: '0', prescribedBy: 'Dr. Lawal', paymentStatus: 'Paid', totalAmount: 1260,
    items: [{ drug: 'Sertraline', strength: '50mg', dose: '50mg', frequency: 'OD', duration: '28 days', quantity: 28, unitPrice: 45 }],
  },
];

const RX_CDS_ALERTS_KEY = 'gfa_doc_rx_cds_alerts_v1';

function loadCdsAlerts(): (SafetyAlert & { patient: string; drug: string; status: string })[] {
  try {
    const raw = localStorage.getItem(RX_CDS_ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

const SEED_ALERTS: (SafetyAlert & { patient: string; drug: string; status: string })[] = [
  { id: 'a1', patient: 'Tope Adeyemi', drug: 'Sertraline + Diazepam', type: 'Drug-drug interaction', severity: 'Moderate', message: 'Increased CNS depression risk with SSRI + benzodiazepine.', recommendation: 'Monitor sedation; limit duration of diazepam.', status: 'Open' },
  { id: 'a2', patient: 'Tope Adeyemi', drug: 'Clozapine', type: 'Monitoring required', severity: 'Critical', message: 'Clozapine requires ANC monitoring before initiation.', recommendation: 'Confirm ANC result within 7 days.', status: 'Open' },
];

function logRxAudit(action: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(RX_AUDIT_KEY) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(RX_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: RxPatient) {
  try {
    const arr = JSON.parse(localStorage.getItem(TIMELINE_KEY) || '[]');
    arr.unshift({ event, patient: patient.name, hospitalId: patient.hospitalId, timestamp: new Date().toISOString() });
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(arr.slice(0, 300)));
  } catch { /* noop */ }
}

function pushToPharmacy(rx: PendingRx, patient: RxPatient, items: BasketLine[], doctor: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(PHARMACY_QUEUE_KEY) || '[]');
    arr.unshift({
      id: rx.id, patientName: patient.name, patientId: patient.hospitalId, age: patient.age,
      gender: patient.gender === 'F' ? 'Female' : 'Male', prescribedBy: doctor,
      prescribedAt: new Date().toISOString(), diagnosis: patient.diagnosis, allergies: patient.allergies,
      items: items.map(i => ({
        drugId: i.drugId, drug: i.drug, strength: i.strength, dose: `${i.dose} ${i.frequency}`,
        duration: i.duration, qty: i.quantity, unitPrice: FORMULARY.find(f => f.id === i.drugId)?.price ?? 50,
      })),
      status: 'PENDING_PHARMACY', paymentStatus: patient.walletStatus.includes('Paid') ? 'PAID' : 'UNPAID',
      emrSync: 'PENDING',
    });
    localStorage.setItem(PHARMACY_QUEUE_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch { /* noop */ }
}

function calcQuantity(dose: string, frequency: string, duration: string): number {
  const days = parseInt(duration, 10) || 28;
  const freqMap: Record<string, number> = { OD: 1, BD: 2, TDS: 3, QID: 4, PRN: 1, HS: 1 };
  const fKey = Object.keys(freqMap).find(k => frequency.toUpperCase().includes(k)) ?? 'OD';
  const perDay = freqMap[fKey] ?? 1;
  const tabs = parseInt(dose.replace(/\D/g, ''), 10) || 1;
  return Math.max(1, perDay * days * (tabs > 100 ? 1 : 1));
}

function buildSafetyAlerts(patient: RxPatient | null, drug: FormularyDrug | null, basket: BasketLine[]): SafetyAlert[] {
  if (!patient || !drug) return [];
  const alerts: SafetyAlert[] = [];
  if (patient.allergies && patient.allergies !== 'None' && drug.generic.toLowerCase().includes('amox')) {
    alerts.push({ id: 'al-allergy', type: 'Allergy', severity: 'Critical', message: `Patient allergic to ${patient.allergies}.`, recommendation: 'Do not prescribe penicillin-class agents.' });
  }
  if (drug.controlled) {
    alerts.push({ id: 'al-ctrl', type: 'Controlled drug', severity: 'Severe', message: `${drug.generic} is a controlled medication.`, recommendation: 'Document indication; verify identity before dispensing.' });
  }
  if (drug.monitoring) {
    alerts.push({ id: 'al-mon', type: 'Lab monitoring', severity: drug.generic.includes('Clozapine') ? 'Critical' : 'Moderate', message: drug.monitoring, recommendation: 'Confirm monitoring labs before sending.' });
  }
  if (patient.renalFlag && drug.generic.includes('Lithium')) {
    alerts.push({ id: 'al-renal', type: 'Renal caution', severity: 'Severe', message: 'Renal impairment flag on patient record.', recommendation: 'Reduce dose; monitor levels closely.' });
  }
  if (patient.liverFlag) {
    alerts.push({ id: 'al-liver', type: 'Hepatic caution', severity: 'Moderate', message: 'Liver flag on patient record.', recommendation: 'Use lower starting dose.' });
  }
  if (basket.some(b => b.drug === drug.generic)) {
    alerts.push({ id: 'al-dup', type: 'Duplicate therapy', severity: 'Moderate', message: 'Drug already in prescription basket.', recommendation: 'Review for duplication.' });
  }
  if (patient.activeMeds.includes('Sertraline') && drug.generic === 'Fluoxetine') {
    alerts.push({ id: 'al-ssri', type: 'Drug-drug interaction', severity: 'Severe', message: 'SSRI switching — washout required.', recommendation: 'Allow 2-week washout from fluoxetine.' });
  }
  if (patient.activeMeds.includes('Diazepam') && drug.drugClass.includes('SSRI')) {
    alerts.push({ id: 'al-benzo', type: 'Drug-drug interaction', severity: 'Moderate', message: 'CNS depression risk with SSRI + benzodiazepine.', recommendation: 'Limit benzodiazepine duration.' });
  }
  return alerts;
}

function mapApiSeverity(sev: string): AlertSeverity {
  const s = sev.toLowerCase();
  if (s.includes('critical')) return 'Critical';
  if (s.includes('severe')) return 'Severe';
  if (s.includes('moderate')) return 'Moderate';
  return 'Mild';
}

function mapApiMedicationLine(m: ApiMedicationLine): MedLine {
  const isExternal = (m.source ?? '').toLowerCase().includes('external');
  return {
    id: `${m.prescriptionId}-${m.itemId}`,
    prescriptionId: m.prescriptionId,
    itemId: m.itemId,
    drug: m.drugName,
    generic: m.drugName,
    strength: m.strength ?? '—',
    form: m.form ?? '—',
    dose: m.dose,
    frequency: m.frequency,
    duration: m.duration ?? '—',
    startDate: (m.sentAt ?? m.createdAt ?? '').replace('T', ' ').slice(0, 10) || '—',
    endDate: '—',
    prescribedBy: m.prescribedBy ?? '—',
    dispenseStatus: m.lineStatus || m.prescriptionStatus,
    source: isExternal ? 'External' : 'Internal',
    route: m.route ?? undefined,
  };
}

function mapApiPrescriptionToBasketItems(rx: ApiPrescription): BasketLine[] {
  return rx.items.map((i) => ({
    id: `b${rx.prescriptionId}-${i.itemId}`,
    drugId: String(i.drugId),
    drug: i.drugName,
    strength: i.strength ?? '',
    form: i.form ?? 'Tablet',
    dose: i.dose,
    frequency: i.frequency,
    duration: i.duration ?? '28 days',
    quantity: i.quantity,
    source: i.source,
    interaction: 'None',
    status: 'Draft' as const,
  }));
}

function mapApiPrescriptionToDraft(rx: ApiPrescription): DraftRx {
  const first = rx.person?.firstName ?? '';
  const last = rx.person?.lastName ?? '';
  return {
    id: rx.rxNo,
    prescriptionId: rx.prescriptionId,
    patientName: [first, rx.person?.middleName, last].filter(Boolean).join(' ') || 'Patient',
    hospitalId: rx.person?.hospitalNo ?? String(rx.personId),
    drugs: rx.items.map((i) => `${i.drugName} ${i.strength ?? ''}`.trim()).join(', ') || 'In progress',
    createdBy: rx.prescribedBy ?? '—',
    lastSaved: (rx.updatedAt ?? rx.createdAt ?? '').replace('T', ' ').slice(0, 16),
    safetyStatus: 'Clear',
    items: mapApiPrescriptionToBasketItems(rx),
  };
}

function mapApiPrescriptionToPending(rx: ApiPrescription): PendingRx {
  const first = rx.person?.firstName ?? '';
  const last = rx.person?.lastName ?? '';
  return {
    id: rx.rxNo,
    prescriptionId: rx.prescriptionId,
    patientName: [first, rx.person?.middleName, last].filter(Boolean).join(' ') || 'Patient',
    hospitalId: rx.person?.hospitalNo ?? String(rx.personId),
    drugSummary: rx.items.map((i) => `${i.drugName} ${i.strength ?? ''}`.trim()).join(' · '),
    sentTime: (rx.sentAt ?? rx.createdAt ?? '').replace('T', ' ').slice(0, 16),
    pharmacyStatus: rx.paymentStatus === 'Unpaid' ? 'Awaiting Payment' : 'Awaiting Dispense',
    paymentStatus: rx.paymentStatus,
    prescribedBy: rx.prescribedBy ?? '—',
    diagnosis: rx.diagnosis ?? '—',
    allergies: rx.allergiesNote ?? 'None',
    items: rx.items.map((i) => ({
      drug: i.drugName,
      strength: i.strength ?? '',
      form: i.form ?? '',
      dose: i.dose,
      frequency: i.frequency,
      duration: i.duration ?? '',
      quantity: i.quantity,
      source: i.source,
    })),
  };
}

function mapApiPrescriptionToDispensed(rx: ApiPrescription): DispensedRx {
  const first = rx.person?.firstName ?? '';
  const last = rx.person?.lastName ?? '';
  const totalQty = rx.items.reduce((s, i) => s + i.qtyDispensed, 0);
  const totalOrdered = rx.items.reduce((s, i) => s + i.quantity, 0);
  return {
    id: rx.rxNo,
    prescriptionId: rx.prescriptionId,
    patient: [first, rx.person?.middleName, last].filter(Boolean).join(' ') || 'Patient',
    hospitalId: rx.person?.hospitalNo ?? String(rx.personId),
    summary: rx.items.map((i) => `${i.drugName} ${i.strength ?? ''} × ${i.qtyDispensed}`).join(' · '),
    by: rx.dispensedBy ?? '—',
    time: (rx.dispensedAt ?? rx.updatedAt ?? '').replace('T', ' ').slice(0, 16),
    qty: String(totalQty),
    balance: String(Math.max(0, totalOrdered - totalQty)),
    prescribedBy: rx.prescribedBy ?? '—',
    paymentStatus: rx.paymentStatus,
    totalAmount: rx.total,
    items: rx.items.map((i) => ({
      drug: i.drugName,
      strength: i.strength ?? '',
      dose: i.dose,
      frequency: i.frequency,
      duration: i.duration ?? '',
      quantity: i.qtyDispensed,
      unitPrice: i.unitPrice,
    })),
  };
}

function mapClinicalAlert(a: ClinicalPharmacyAlert): CdsAlertRow {
  const drug = a.drugB ? `${a.drugA} + ${a.drugB}` : a.drugA;
  return {
    id: String(a.alertId),
    alertId: a.alertId,
    type: a.alertType,
    severity: mapApiSeverity(a.severity),
    message: a.message,
    recommendation: a.ruleCode ? `Rule: ${a.ruleCode}` : 'Review before prescribing',
    patient: a.patientName,
    drug,
    status: a.status,
  };
}

function mapClinicalFinding(a: ClinicalPharmacyAlert): SafetyAlert {
  return {
    id: `cds-${a.alertId}`,
    type: a.alertType,
    severity: mapApiSeverity(a.severity),
    message: a.message,
    recommendation: a.ruleCode ? `Rule: ${a.ruleCode}` : 'Review interaction before sending',
  };
}

const emptyForm = () => ({
  drugId: '', generic: '', brand: '', strength: '', form: 'Tablet', route: 'PO',
  dose: '', frequency: 'OD', duration: '28 days', quantity: 0,
  startDate: new Date().toISOString().slice(0, 10), stopDate: '',
  instructions: '', indication: '', urgency: 'Routine', source: 'Internal Pharmacy',
  dispenseType: 'Full', refillAllowed: 'No', refills: '0', pharmNotes: '', patientInstructions: '',
});

export const DocPrescriptions = ({
  embedded,
  patientContext,
  onClose,
  onOpenFull,
}: ClinicalEmbeddedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Dr. User';
  const useApi = isPrescriptionsApiEnabled() && isPharmacyApiEnabled();
  const cdsApiOn = useApi && isClinicalPharmacyApiEnabled();

  const [patient, setPatient] = useState<RxPatient | null>(null);
  const [tab, setTab] = useState<TabId>('build');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('all');
  const [patientModal, setPatientModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [apiPatients, setApiPatients] = useState<RxPatient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [apiFormulary, setApiFormulary] = useState<FormularyDrug[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(useApi);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(useApi);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [stoppingMed, setStoppingMed] = useState(false);
  const [refillingId, setRefillingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [externalSaving, setExternalSaving] = useState(false);
  const [cdsLoading, setCdsLoading] = useState(false);
  const [alertActionId, setAlertActionId] = useState<number | null>(null);

  const [medsLoading, setMedsLoading] = useState(false);
  const [medsError, setMedsError] = useState<string | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [dispensedLoading, setDispensedLoading] = useState(false);
  const [dispensedError, setDispensedError] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [activeMeds, setActiveMeds] = useState<MedLine[]>([]);
  const [stoppedMeds, setStoppedMeds] = useState<MedLine[]>([]);
  const [externalMeds, setExternalMeds] = useState<MedLine[]>([]);
  const [historyMeds, setHistoryMeds] = useState<MedLine[]>([]);
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [drafts, setDrafts] = useState<DraftRx[]>([]);
  const [pending, setPending] = useState<PendingRx[]>([]);
  const [dispensed, setDispensed] = useState<DispensedRx[]>([]);
  const [alerts, setAlerts] = useState<CdsAlertRow[]>([]);
  const [apiBuildAlerts, setApiBuildAlerts] = useState<SafetyAlert[]>([]);

  const [form, setForm] = useState(emptyForm());
  const [drugSearch, setDrugSearch] = useState('');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const [stopModal, setStopModal] = useState<MedLine | null>(null);
  const [stopReason, setStopReason] = useState('');
  const [stopComment, setStopComment] = useState('');
  const [modifyModal, setModifyModal] = useState<MedLine | null>(null);
  const [sendModal, setSendModal] = useState(false);
  const [printModal, setPrintModal] = useState(false);
  const [externalModal, setExternalModal] = useState(false);
  const [overrideModal, setOverrideModal] = useState<SafetyAlert | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [allergiesModal, setAllergiesModal] = useState(false);
  const [viewPendingRx, setViewPendingRx] = useState<PendingRx | null>(null);
  const [viewDispensedRx, setViewDispensedRx] = useState<DispensedRx | null>(null);
  const [extForm, setExtForm] = useState({ drug: '', strength: '', dose: '', frequency: '', duration: '', source: '', reason: '', note: '', active: true });

  const ctxToPatient = (ctx: DocPatientContext): RxPatient => {
    const parsedId = Number(ctx.id);
    return {
      id: ctx.id, name: ctx.name, hospitalId: ctx.hospitalId, phone: ctx.phone ?? '',
      nin: ctx.nin ?? '', nhiaNo: ctx.nhiaNo ?? '', age: ctx.age ?? 0, gender: ctx.gender ?? 'M',
      weight: '—', clinic: (ctx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
      diagnosis: ctx.diagnosis ?? '—', allergies: ctx.allergies ?? 'None', pregnancy: 'N/A',
      renalFlag: false, liverFlag: false, activeMeds: ctx.medications ?? '—', walletStatus: 'Pending verification',
      personId: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : undefined,
    };
  };

  const mapPersonToRx = (p: Awaited<ReturnType<typeof searchPersons>>[number]): RxPatient => {
    const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
    const age = p.dateOfBirth
      ? Math.max(0, new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear())
      : 0;
    return {
      id: String(p.personId),
      personId: p.personId,
      name: name || 'Unknown',
      hospitalId: p.hospitalNo ?? String(p.personId),
      phone: p.patientPhoneNo ?? '',
      nin: p.identityNo ?? '',
      nhiaNo: '',
      age,
      gender: (p.sex ?? 'M').slice(0, 1).toUpperCase(),
      weight: '—',
      clinic: 'OPC',
      diagnosis: '—',
      allergies: 'None',
      pregnancy: 'N/A',
      renalFlag: false,
      liverFlag: false,
      activeMeds: '—',
      walletStatus: p.status === 'Active' ? 'Paid · Registered' : (p.status ?? 'Pending'),
    };
  };

  const applyPatientFromCtx = (ctx: DocPatientContext) => {
    if (useApi) {
      const parsed = Number(ctx.id);
      if (Number.isFinite(parsed) && parsed > 0) {
        setPatient(ctxToPatient(ctx));
        setTab('build');
        if (!embedded) toast.success(`Patient loaded: ${ctx.name}`);
        return;
      }
      void (async () => {
        try {
          const rows = await searchPersons(ctx.hospitalId || ctx.name);
          const match = rows.find((r) =>
            r.hospitalNo === ctx.hospitalId
            || String(r.personId) === ctx.id
            || `${r.firstName} ${r.lastName}`.trim() === ctx.name,
          ) ?? rows[0];
          if (match) {
            setPatient(mapPersonToRx(match));
            setTab('build');
            if (!embedded) toast.success(`Patient loaded from registry: ${match.firstName ?? ''} ${match.lastName ?? ''}`.trim());
          } else {
            toast.error('Patient not found in registry — search and select a registered patient');
            if (!embedded) setPatientModal(true);
          }
        } catch {
          toast.error('Could not resolve patient from API — search manually');
          if (!embedded) setPatientModal(true);
        }
      })();
      return;
    }
    const p = PATIENTS.find(x => x.id === ctx.id || x.hospitalId === ctx.hospitalId || x.name === ctx.name) ?? ctxToPatient(ctx);
    setPatient(p);
    setTab('build');
    if (!embedded) toast.success(`Patient loaded: ${p.name}`);
  };

  useClinicalEmbeddedInit({ embedded, patientContext }, applyPatientFromCtx);

  const loadPendingFromApi = async () => {
    if (!useApi) return;
    setPendingLoading(true);
    setPendingError(null);
    try {
      const data = await listPrescriptions({ status: 'Sent', limit: 100 });
      setPending(data.items.map(mapApiPrescriptionToPending));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load prescriptions from API';
      setPendingError(msg);
      toast.error(msg);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadDraftsFromApi = async () => {
    if (!useApi) return;
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const data = await listPrescriptions({ status: 'Draft', limit: 100 });
      setDrafts(data.items.map(mapApiPrescriptionToDraft));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load draft prescriptions';
      setDraftsError(msg);
      toast.error(msg);
    } finally {
      setDraftsLoading(false);
    }
  };

  const loadDispensedFromApi = async (personId?: number) => {
    if (!useApi) return;
    setDispensedLoading(true);
    setDispensedError(null);
    try {
      const data = await listPrescriptions({
        status: 'Dispensed,Partially Dispensed',
        personId,
        limit: 100,
      });
      setDispensed(data.items.map(mapApiPrescriptionToDispensed));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load dispensed prescriptions';
      setDispensedError(msg);
      toast.error(msg);
    } finally {
      setDispensedLoading(false);
    }
  };

  const loadAlertsFromApi = async () => {
    if (!useApi || !cdsApiOn) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await listClinicalPharmacyAlerts({ status: 'Open', limit: 100 });
      setAlerts(data.items.map(mapClinicalAlert));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load clinical pharmacy alerts';
      setAlertsError(msg);
      toast.error(msg);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadPatientMedications = async (personId: number) => {
    if (!useApi) return;
    setMedsLoading(true);
    setMedsError(null);
    try {
      const [active, stopped, external, history] = await Promise.all([
        listPrescriptionMedications({ personId, scope: 'active' }),
        listPrescriptionMedications({ personId, scope: 'stopped' }),
        listPrescriptionMedications({ personId, scope: 'external' }),
        listPrescriptionMedications({ personId, scope: 'history' }),
      ]);
      setActiveMeds(active.items.map(mapApiMedicationLine));
      setStoppedMeds(stopped.items.map(mapApiMedicationLine));
      setExternalMeds(external.items.map(mapApiMedicationLine));
      setHistoryMeds(history.items.map(mapApiMedicationLine));
      const activeSummary = active.items.map((m) => `${m.drugName} ${m.strength ?? ''} ${m.frequency}`.trim()).join(', ');
      setPatient((prev) => (prev ? { ...prev, activeMeds: activeSummary || '—' } : prev));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load patient medications';
      setMedsError(msg);
      toast.error(msg);
    } finally {
      setMedsLoading(false);
    }
  };

  const runCdsCheck = async (drugIds: number[]) => {
    if (!cdsApiOn || !patient) {
      setApiBuildAlerts([]);
      return;
    }
    const personId = patient.personId ?? Number(patient.id);
    if (!Number.isFinite(personId) || personId <= 0 || drugIds.length === 0) {
      setApiBuildAlerts([]);
      return;
    }
    setCdsLoading(true);
    try {
      const result = await checkClinicalInteractions({ personId, drugIds });
      setApiBuildAlerts(result.findings.map(mapClinicalFinding));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Clinical interaction check failed');
      setApiBuildAlerts([]);
    } finally {
      setCdsLoading(false);
    }
  };

  const refreshPatientData = async (personId: number) => {
    await Promise.all([
      loadPatientMedications(personId),
      loadDispensedFromApi(personId),
    ]);
  };

  const refreshAllApiLists = async () => {
    await Promise.all([
      loadCatalogFromApi(),
      loadPendingFromApi(),
      loadDraftsFromApi(),
      loadDispensedFromApi(patient?.personId),
      loadAlertsFromApi(),
    ]);
    if (patient?.personId) await loadPatientMedications(patient.personId);
  };

  const loadCatalogFromApi = async () => {
    if (!useApi) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const drugs = await listDrugs({ status: 'Active', limit: 200 });
      setApiFormulary(drugs.items.map((d) => ({
        id: String(d.drugId),
        generic: d.name,
        brand: d.genericName ?? d.name,
        drugClass: d.category ?? 'General',
        strengths: d.strength ? [d.strength] : ['—'],
        forms: d.form ? [d.form] : ['Tablet'],
        routes: ['PO'],
        controlled: d.controlled,
        stock: d.stock,
        price: d.unitPrice,
        formulary: d.controlled ? 'Restricted' : 'Formulary',
      })));
      if (drugs.items.length === 0) {
        setCatalogError('Drug catalog is empty — add drugs under Pharmacy → Drug Catalog first');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load drug catalog';
      setCatalogError(msg);
      setApiFormulary([]);
      toast.error(msg);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (!useApi) return;
    void (async () => {
      await loadCatalogFromApi();
      await Promise.all([
        loadPendingFromApi(),
        loadDraftsFromApi(),
        loadDispensedFromApi(),
        loadAlertsFromApi(),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi]);

  useEffect(() => {
    if (!useApi || !patient?.personId) return;
    void refreshPatientData(patient.personId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi, patient?.personId]);

  useEffect(() => {
    if (!useApi || !patientModal) return;
    const q = patientSearch.trim();
    if (q.length < 2) { setApiPatients([]); return; }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearchingPatients(true);
        try {
          const rows = await searchPersons(q);
          setApiPatients(rows.map(mapPersonToRx));
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : 'Patient search failed');
        } finally {
          setSearchingPatients(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(t);
  }, [patientSearch, patientModal, useApi]);

  /** Live catalog only — no mock formulary. */
  const formulary = apiFormulary;
  const selectedDrug = formulary.find(f => f.id === form.drugId) ?? null;
  const psychClasses = ['SSRI', 'Atypical Antipsychotic', 'Typical Antipsychotic', 'Mood Stabilizer', 'Benzodiazepine'];
  const filteredDrugs = useMemo(() => {
    const q = drugSearch.toLowerCase();
    const list = formulary.filter(f => !q || `${f.generic} ${f.brand} ${f.drugClass}`.toLowerCase().includes(q));
    if (patient?.clinic === 'OPC') {
      return [...list].sort((a, b) => {
        const aPsych = psychClasses.some(c => a.drugClass.includes(c)) ? 0 : 1;
        const bPsych = psychClasses.some(c => b.drugClass.includes(c)) ? 0 : 1;
        return aPsych - bPsych;
      });
    }
    return list;
  }, [drugSearch, patient?.clinic, formulary]);

  const requirePatient = (fn: () => void) => {
    if (!patient) { toast.error('Select a patient first'); setPatientModal(true); return; }
    fn();
  };
  const liveAlerts = useMemo(() => {
    if (cdsApiOn) return apiBuildAlerts;
    return buildSafetyAlerts(patient, selectedDrug, basket);
  }, [cdsApiOn, apiBuildAlerts, patient, selectedDrug, basket]);
  const hasBlockingAlert = liveAlerts.some(a => a.severity === 'Critical' && !acknowledgedAlerts.has(a.id));

  useEffect(() => {
    if (!cdsApiOn || !patient) {
      setApiBuildAlerts([]);
      return;
    }
    const ids = new Set<number>();
    if (selectedDrug && /^\d+$/.test(selectedDrug.id)) ids.add(Number(selectedDrug.id));
    basket.forEach((b) => { if (/^\d+$/.test(b.drugId)) ids.add(Number(b.drugId)); });
    const t = window.setTimeout(() => { void runCdsCheck([...ids]); }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdsApiOn, patient?.personId, selectedDrug?.id, basket]);

  const kpis = useMemo(() => ({
    active: activeMeds.filter(m => m.dispenseStatus !== 'Stopped').length,
    sent: pending.length,
    pending: pending.filter(p => p.pharmacyStatus.includes('Awaiting')).length,
    alerts: alerts.filter(a => a.status === 'Open').length,
    stopped: stoppedMeds.length,
    external: externalMeds.length,
  }), [activeMeds, pending, alerts, stoppedMeds, externalMeds]);

  const selectPatient = (p: RxPatient) => {
    if (useApi && (p.personId == null || p.personId <= 0)) {
      toast.error('Select a registered patient from the live search results');
      return;
    }
    setPatient(p);
    setPatientModal(false);
    setPatientSearch('');
    setBasket([]);
    setApiBuildAlerts([]);
    if (!useApi) {
      setActiveMeds([]);
      setStoppedMeds([]);
      setExternalMeds([]);
      setHistoryMeds([]);
    }
    logRxAudit(`Patient selected: ${p.name} (${p.hospitalId})`);
    toast.success(`Prescription workspace ready for ${p.name}`);
  };

  const selectDrug = (d: FormularyDrug) => {
    const qty = calcQuantity(d.strengths[0], form.frequency, form.duration);
    setForm(f => ({
      ...f, drugId: d.id, generic: d.generic, brand: d.brand,
      strength: d.strengths[0], form: d.forms[0], route: d.routes[0],
      quantity: qty, indication: patient?.diagnosis ?? '',
    }));
    toast.success(`${d.generic} selected — formulary data loaded`);
  };

  const addToBasket = () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (!form.drugId) { toast.error('Select a drug'); return; }
    if (useApi && !/^\d+$/.test(form.drugId)) {
      toast.error('Select a drug from the live catalog (GET /api/pharmacy/drugs)');
      return;
    }
    const interaction = liveAlerts.find(a => a.severity !== 'Mild')?.type ?? 'None';
    const line: BasketLine = {
      id: `b${Date.now()}`, drugId: form.drugId, drug: form.generic, strength: form.strength,
      form: form.form, dose: form.dose || form.strength, frequency: form.frequency,
      duration: form.duration, quantity: form.quantity || calcQuantity(form.dose, form.frequency, form.duration),
      source: form.source, interaction, status: 'Draft',
    };
    setBasket(prev => [...prev, line]);
    setForm(emptyForm());
    setDrugSearch('');
    toast.success(`${line.drug} added to prescription`);
  };

  const saveDraft = async () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (basket.length === 0 && !form.drugId) { toast.error('Add at least one drug before saving a draft'); return; }

    if (useApi) {
      const personId = patient.personId ?? Number(patient.id);
      if (!Number.isFinite(personId) || personId <= 0) {
        toast.error('Select a registered patient from search (API) before saving');
        setPatientModal(true);
        return;
      }
      const lines = basket.length > 0 ? basket : [{
        id: 'draft-line', drugId: form.drugId, drug: form.generic, strength: form.strength,
        form: form.form, dose: form.dose || form.strength, frequency: form.frequency,
        duration: form.duration, quantity: form.quantity || calcQuantity(form.dose, form.frequency, form.duration),
        source: form.source, interaction: 'None', status: 'Draft' as const,
      }];
      for (const line of lines) {
        if (!/^\d+$/.test(line.drugId)) {
          toast.error('Use drugs from the live catalog when API mode is on');
          return;
        }
      }
      setSavingDraft(true);
      try {
        await createPrescription({
          personId,
          send: false,
          urgency: form.urgency === 'Stat' || form.urgency === 'Urgent' ? form.urgency : 'Routine',
          paymentStatus: patient.walletStatus.toLowerCase().includes('paid') ? 'Paid' : 'Unpaid',
          diagnosis: form.indication || patient.diagnosis || undefined,
          allergiesNote: patient.allergies !== 'None' ? patient.allergies : undefined,
          clinic: patient.clinic,
          items: lines.map((b) => ({
            drugId: Number(b.drugId),
            strength: b.strength,
            form: b.form,
            dose: b.dose,
            frequency: b.frequency,
            duration: b.duration,
            quantity: b.quantity,
            source: b.source,
            indication: form.indication || patient.diagnosis || undefined,
          })),
        });
        logRxAudit(`Draft saved via API for ${patient.name}`);
        logTimeline(`Prescription draft saved — ${lines.map((b) => b.drug).join(', ')}`, patient);
        setBasket([]);
        setForm(emptyForm());
        await loadDraftsFromApi();
        notifySuccess(`Draft saved for ${patient.name}`, 'Draft Saved');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to save draft');
      } finally {
        setSavingDraft(false);
      }
      return;
    }

    const draft: DraftRx = {
      id: `DRF-${Date.now()}`, patientName: patient.name, hospitalId: patient.hospitalId,
      drugs: basket.map(b => b.drug).join(', ') || form.generic || 'In progress',
      createdBy: doctorName, lastSaved: new Date().toLocaleString(),
      safetyStatus: hasBlockingAlert ? 'Critical alerts open' : liveAlerts.length ? 'Review alerts' : 'Clear',
      items: [...basket],
    };
    setDrafts(prev => [draft, ...prev]);
    logRxAudit(`Draft saved for ${patient.name}`);
    logTimeline(`Prescription draft saved — ${draft.drugs}`, patient);
    notifySuccess(`Draft saved for ${patient.name}`, 'Draft Saved');
  };

  const sendToPharmacy = async () => {
    if (!patient) { toast.error('Select a patient first'); return; }
    if (basket.length === 0) { toast.error('Add at least one drug to the prescription'); return; }
    if (hasBlockingAlert) { toast.error('Resolve critical alerts before sending'); return; }

    if (useApi) {
      const personId = patient.personId ?? Number(patient.id);
      if (!Number.isFinite(personId) || personId <= 0) {
        toast.error('Select a registered patient from search (API) before prescribing');
        setPatientModal(true);
        return;
      }
      for (const line of basket) {
        if (!/^\d+$/.test(line.drugId)) {
          toast.error('Use drugs from the live catalog when API mode is on');
          return;
        }
      }
      setSending(true);
      try {
        const created = await createPrescription({
          personId,
          send: true,
          urgency: form.urgency === 'Stat' || form.urgency === 'Urgent' ? form.urgency : 'Routine',
          paymentStatus: patient.walletStatus.toLowerCase().includes('paid') ? 'Paid' : 'Unpaid',
          diagnosis: form.indication || patient.diagnosis || undefined,
          allergiesNote: patient.allergies !== 'None' ? patient.allergies : undefined,
          clinic: patient.clinic,
          items: basket.map((b) => ({
            drugId: Number(b.drugId),
            strength: b.strength,
            form: b.form,
            dose: b.dose,
            frequency: b.frequency,
            duration: b.duration,
            quantity: b.quantity,
            source: b.source,
            indication: form.indication || patient.diagnosis || undefined,
          })),
        });
        const rx = mapApiPrescriptionToPending(created);
        setPending((prev) => [rx, ...prev.filter((p) => p.id !== rx.id)]);
        if (patient.personId) await refreshPatientData(patient.personId);
        logRxAudit(`Sent ${created.rxNo} to pharmacy for ${patient.name}`);
        logTimeline(`Prescription sent to pharmacy — ${rx.drugSummary}`, patient);
        setBasket([]);
        setSendModal(false);
        setTab('pending');
        await loadPendingFromApi();
        notifySuccess(`Prescription ${created.rxNo} sent to pharmacy`, 'Sent to Pharmacy');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to send prescription');
      } finally {
        setSending(false);
      }
      return;
    }

    const rxId = `RX-2026-${String(100 + pending.length).padStart(3, '0')}`;
    const rx: PendingRx = {
      id: rxId, patientName: patient.name, hospitalId: patient.hospitalId,
      drugSummary: basket.map(b => `${b.drug} ${b.strength}`).join(' · '),
      sentTime: new Date().toLocaleString(), pharmacyStatus: 'Sent to Pharmacy',
      paymentStatus: patient.walletStatus.includes('Paid') ? 'Paid' : 'Awaiting Payment',
      prescribedBy: doctorName, diagnosis: patient.diagnosis, allergies: patient.allergies,
      items: basket.map(b => ({
        drug: b.drug, strength: b.strength, form: b.form, dose: b.dose,
        frequency: b.frequency, duration: b.duration, quantity: b.quantity, source: b.source,
      })),
    };
    setPending(prev => [rx, ...prev]);
    pushToPharmacy(rx, patient, basket, doctorName);
    basket.forEach(b => {
      setActiveMeds(prev => [...prev, {
        id: `m${Date.now()}${b.id}`, drug: b.drug, generic: b.drug, strength: b.strength, form: b.form,
        dose: b.dose, frequency: b.frequency, duration: b.duration,
        startDate: new Date().toISOString().slice(0, 10), endDate: '—', prescribedBy: doctorName,
        dispenseStatus: 'Pending Pharmacy', source: b.source.includes('External') ? 'External' : 'Internal',
      }]);
    });
    logRxAudit(`Sent ${rxId} to pharmacy for ${patient.name}`);
    logTimeline(`Prescription sent to pharmacy — ${rx.drugSummary}`, patient);
    setBasket([]);
    setSendModal(false);
    setTab('pending');
    notifySuccess(`Prescription ${rxId} sent to pharmacy`, 'Sent to Pharmacy');
  };

  const confirmStop = async () => {
    if (!stopModal || !stopReason) { toast.error('Stop reason is required'); return; }

    if (useApi && stopModal.prescriptionId && stopModal.itemId) {
      setStoppingMed(true);
      try {
        await stopPrescriptionItem(stopModal.prescriptionId, stopModal.itemId, {
          reason: stopReason,
          comment: stopComment || undefined,
        });
        if (patient?.personId) await loadPatientMedications(patient.personId);
        if (patient) logTimeline(`Medication stopped: ${stopModal.drug} — ${stopReason}`, patient);
        logRxAudit(`Stopped ${stopModal.drug} — ${stopReason}`);
        notifySuccess(`${stopModal.drug} stopped`, 'Medication Stopped');
        setStopModal(null); setStopReason(''); setStopComment('');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to stop medication');
      } finally {
        setStoppingMed(false);
      }
      return;
    }

    const updated = { ...stopModal, dispenseStatus: 'Stopped', stopReason, stopDate: new Date().toISOString().slice(0, 10) };
    setActiveMeds(prev => prev.map(m => m.id === stopModal.id ? updated : m));
    setStoppedMeds(prev => [updated, ...prev]);
    if (patient) logTimeline(`Medication stopped: ${stopModal.drug} — ${stopReason}`, patient);
    logRxAudit(`Stopped ${stopModal.drug} — ${stopReason}`);
    notifySuccess(`${stopModal.drug} stopped`, 'Medication Stopped');
    setStopModal(null); setStopReason(''); setStopComment('');
  };

  const cancelPendingRx = async (rx: PendingRx) => {
    if (useApi && rx.prescriptionId) {
      setCancellingId(rx.prescriptionId);
      try {
        await updatePrescription(rx.prescriptionId, { status: 'Cancelled' });
        await loadPendingFromApi();
        logRxAudit(`Cancelled ${rx.id}`);
        toast.success(`Prescription ${rx.id} cancelled`);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to cancel prescription');
      } finally {
        setCancellingId(null);
      }
      return;
    }
    setPending(prev => prev.filter(x => x.id !== rx.id));
    toast.success('Prescription cancelled');
  };

  const deleteDraft = async (d: DraftRx) => {
    if (useApi && d.prescriptionId) {
      setDeletingDraftId(d.prescriptionId);
      try {
        await updatePrescription(d.prescriptionId, { status: 'Cancelled' });
        await loadDraftsFromApi();
        toast.success('Draft deleted');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to delete draft');
      } finally {
        setDeletingDraftId(null);
      }
      return;
    }
    setDrafts(prev => prev.filter(x => x.id !== d.id));
    toast.success('Draft deleted');
  };

  const requestRefill = async (m: MedLine) => {
    if (useApi && m.prescriptionId) {
      setRefillingId(m.prescriptionId);
      try {
        await refillPrescription(m.prescriptionId);
        if (patient?.personId) await refreshPatientData(patient.personId);
        await loadPendingFromApi();
        toast.success(`Refill requested for ${m.drug}`);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to request refill');
      } finally {
        setRefillingId(null);
      }
      return;
    }
    toast.success('Refill requested');
  };

  const acknowledgeCdsAlert = async (a: CdsAlertRow) => {
    if (useApi && cdsApiOn && a.alertId) {
      setAlertActionId(a.alertId);
      try {
        if (a.severity === 'Critical' || a.severity === 'Severe') {
          await overrideClinicalPharmacyAlert(a.alertId, 'Acknowledged from prescription engine');
        } else {
          await closeClinicalPharmacyAlert(a.alertId);
        }
        await loadAlertsFromApi();
        toast.success('Alert acknowledged');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to acknowledge alert');
      } finally {
        setAlertActionId(null);
      }
      return;
    }
    setAlerts(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Acknowledged' } : x));
    toast.success('Alert acknowledged');
  };

  const kpiClick = (f: KpiFilter) => {
    setKpiFilter(f);
    const map: Record<KpiFilter, TabId> = {
      all: 'build', active: 'active', sent: 'pending', pending: 'pending',
      alerts: 'alerts', stopped: 'stopped', external: 'external',
    };
    setTab(map[f]);
  };

  const patientResults = apiPatients;

  const filteredActive = patient
    ? activeMeds.filter(m => m.dispenseStatus !== 'Stopped')
    : activeMeds.filter(m => m.dispenseStatus !== 'Stopped');
  const patientPending = patient ? pending.filter(p => p.hospitalId === patient.hospitalId) : pending;
  const patientDrafts = patient ? drafts.filter(d => d.hospitalId === patient.hospitalId) : drafts;
  const patientDispensed = patient ? dispensed.filter(d => d.hospitalId === patient.hospitalId) : dispensed;
  const patientAlerts = patient ? alerts.filter(a => a.patient === patient.name || a.patient.includes(patient.name.split(' ')[0] ?? '')) : alerts;
  const patientAllergies = patient ? (ALLERGY_PROFILES[patient.id] ?? (patient.allergies !== 'None' ? [{ substance: patient.allergies, reaction: 'Documented allergy', severity: 'Unknown', verifiedDate: '—' }] : [])) : [];
  const hasKnownAllergies = patient && patient.allergies !== 'None';

  const openSendFlow = async () => {
    if (basket.length === 0) { toast.error('Add at least one drug to the prescription'); return; }
    if (useApi) {
      const personId = patient?.personId ?? Number(patient?.id);
      if (!patient || !Number.isFinite(personId) || personId <= 0) {
        toast.error('Select a registered patient before sending');
        setPatientModal(true);
        return;
      }
      if (catalogLoading) { toast.error('Drug catalog still loading'); return; }
      if (apiFormulary.length === 0) { toast.error('No catalog drugs available — add drugs in Pharmacy first'); return; }
      if (basket.some((b) => !/^\d+$/.test(b.drugId))) {
        toast.error('Every basket drug must come from the live catalog');
        return;
      }
      if (cdsApiOn) {
        const drugIds = basket.map((b) => Number(b.drugId)).filter((id) => id > 0);
        await runCdsCheck(drugIds);
      }
    }
    setSendModal(true);
  };

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Prescription Engine"
      flowTitle="Prescription Engine"
      flowSubtitle="Create, review, and send patient prescriptions with safety checks"
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Prescription Engine</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Create, review, and send patient prescriptions with allergy, interaction, and pharmacy availability checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPatientModal(true)}><Search className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button size="sm" onClick={() => requirePatient(() => { setTab('build'); setForm(emptyForm()); toast.info('New prescription form cleared'); })}><Plus className="h-4 w-4 mr-1" />New Prescription</Button>
          <Button variant="outline" size="sm" onClick={() => requirePatient(() => void saveDraft())} disabled={savingDraft}>
            <FileText className="h-4 w-4 mr-1" />{savingDraft ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => requirePatient(() => void openSendFlow())}><Send className="h-4 w-4 mr-1" />Send to Pharmacy</Button>
          <Button variant="outline" size="sm" onClick={() => requirePatient(() => setPrintModal(true))}><Printer className="h-4 w-4 mr-1" />Print Rx</Button>
          <Button variant="outline" size="sm" onClick={() => requirePatient(() => setExternalModal(true))}><Download className="h-4 w-4 mr-1" />External Purchase Log</Button>
        </div>
      </div>

      {useApi ? (
        <Card className={`mb-4 border ${catalogError ? 'border-rose-300 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-semibold">Live API mode — POST/GET /api/prescriptions</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {catalogLoading || pendingLoading
                  ? 'Loading drug catalog and pharmacy queue…'
                  : catalogError
                    ? catalogError
                    : `Catalog: ${apiFormulary.length} drugs · Sent Rx: ${pending.length} · Patients via GET /api/patients`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void refreshAllApiLists()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh API
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-4 border-amber-200 bg-amber-50/50 text-sm">
          <div className="font-semibold">Demo mode</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Set <code>VITE_USE_API=true</code> and <code>VITE_API_BASE_URL</code> to prescribe against the live backend.
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ['active', 'Active Rx', kpis.active, 'Active prescriptions', Pill, 'blue'],
          ['sent', 'Sent Today', kpis.sent, 'Sent to pharmacy', Send, 'green'],
          ['pending', 'Pending Dispense', kpis.pending, 'Awaiting pharmacy', Clock, 'amber'],
          ['alerts', 'Interaction Alerts', kpis.alerts, 'Requires review', AlertTriangle, 'rose'],
          ['stopped', 'Stopped Medications', kpis.stopped, 'Discontinued drugs', StopCircle, 'purple'],
          ['external', 'External Prescriptions', kpis.external, 'Outside hospital', Download, 'teal'],
        ] as const).map(([key, title, val, sub, Icon, t]) => (
          <button key={key} type="button" onClick={() => kpiClick(key as KpiFilter)} className="text-left">
            <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t as any} />
          </button>
        ))}
      </div>

      {/* Patient banner */}
      {patient ? (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-semibold">{patient.name}</div><div className="text-xs font-mono">{patient.hospitalId}</div></div>
            <div><div className="text-xs text-muted-foreground">Age / Gender / Weight</div><div>{patient.age} / {patient.gender} / {patient.weight}</div><StatusPill tone={patient.clinic === 'OPC' ? 'purple' : 'blue'}>{patient.clinic}</StatusPill></div>
            <div><div className="text-xs text-muted-foreground">Diagnosis</div><div>{patient.diagnosis}</div></div>
            <div><div className="text-xs text-muted-foreground">Allergies</div><div className="text-rose-700 font-medium">{patient.allergies}</div></div>
            <div><div className="text-xs text-muted-foreground">Flags</div><div className="flex gap-1 flex-wrap">{patient.renalFlag && <StatusPill tone="amber">Renal</StatusPill>}{patient.liverFlag && <StatusPill tone="amber">Liver</StatusPill>}{patient.pregnancy !== 'N/A' && <StatusPill tone="sky">{patient.pregnancy}</StatusPill>}</div></div>
            <div><div className="text-xs text-muted-foreground">Active Medications</div><div className="text-xs">{patient.activeMeds}</div></div>
            <div><div className="text-xs text-muted-foreground">Pharmacy Wallet</div><div>{patient.walletStatus}</div></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="outline" onClick={() => toast.info('Open EMR is not wired in this module yet')}><FileText className="h-3.5 w-3.5 mr-1" />Open EMR</Button>
            <Button size="sm" variant="outline" onClick={() => setTab('history')}><History className="h-3.5 w-3.5 mr-1" />Medication History</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/results`)}><FlaskConical className="h-3.5 w-3.5 mr-1" />Lab Results</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/diagnosis`)}><Eye className="h-3.5 w-3.5 mr-1" />Diagnosis</Button>
            <Button size="sm" variant="outline" onClick={() => setAllergiesModal(true)}><ShieldAlert className="h-3.5 w-3.5 mr-1" />Allergies</Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-4 text-center py-8">
          <Pill className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Select a patient before building or sending prescriptions.</p>
          <Button onClick={() => setPatientModal(true)}><Search className="h-4 w-4 mr-1.5" />Select Patient</Button>
        </Card>
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto mb-4">
          {(['build', 'active', 'drafts', 'pending', 'dispensed', 'stopped', 'external', 'alerts', 'history'] as TabId[]).map(t => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">{t === 'build' ? 'Build Prescription' : t.replace(/([A-Z])/g, ' $1')}</TabsTrigger>
          ))}
        </TabsList>

        {/* BUILD TAB — 3 column */}
        <TabsContent value="build">
          {patient && (
            <div className={`mb-4 rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 ${hasKnownAllergies ? 'border-rose-300 bg-rose-50/80' : 'border-emerald-200 bg-emerald-50/50'}`}>
              <div className="flex items-start gap-2 text-sm">
                <ShieldAlert className={`h-5 w-5 shrink-0 mt-0.5 ${hasKnownAllergies ? 'text-rose-600' : 'text-emerald-600'}`} />
                <div>
                  <div className="font-semibold">{hasKnownAllergies ? 'Known Allergies — review before prescribing' : 'No known drug allergies (NKDA)'}</div>
                  {hasKnownAllergies ? (
                    <div className="text-xs mt-0.5 text-rose-800">
                      {patientAllergies.map(a => a.substance).join(' · ')}
                      {patientAllergies[0]?.severity && ` · Highest severity: ${patientAllergies[0].severity}`}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-0.5">Allergy profile verified for {patient.name}</div>
                  )}
                </div>
              </div>
              <Button size="sm" variant={hasKnownAllergies ? 'destructive' : 'outline'} onClick={() => setAllergiesModal(true)}>
                View Allergy Profile
              </Button>
            </div>
          )}
          <div className="grid lg:grid-cols-12 gap-4">
            {/* Left: active meds */}
            <div className="lg:col-span-3 space-y-3">
              <Card>
                <h3 className="font-semibold text-sm mb-3">Active Medications</h3>
                {useApi && medsLoading && <p className="text-xs text-muted-foreground py-4 text-center">Loading medications…</p>}
                {useApi && medsError && !medsLoading && <p className="text-xs text-rose-700 py-2">{medsError}</p>}
                {useApi && !medsLoading && !medsError && filteredActive.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active medications for this patient.</p>
                )}
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {filteredActive.map(m => (
                    <div key={m.id} className="border rounded-lg p-2 text-xs space-y-1">
                      <div className="font-medium">{m.drug} {m.strength}</div>
                      <div className="text-muted-foreground">{m.dose} · {m.frequency} · {m.duration}</div>
                      <div className="flex gap-1 flex-wrap"><StatusPill tone="green">{m.dispenseStatus}</StatusPill><StatusPill tone="blue">{m.source}</StatusPill></div>
                      <div className="flex gap-1 pt-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => toast.success(`${m.drug} continued`)}>Continue</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setModifyModal(m)}>Modify</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setStopModal(m)}>Stop</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              {externalMeds.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-sm mb-2">External (Patient Reported)</h3>
                  {externalMeds.map(e => (
                    <div key={e.id} className="text-xs border rounded p-2 mb-1">{e.drug} {e.strength} · {e.frequency}</div>
                  ))}
                </Card>
              )}
            </div>

            {/* Center: builder */}
            <div className="lg:col-span-5">
              <Card>
                <h3 className="font-semibold mb-3">Build Prescription {patient ? `— ${patient.name}` : ''}</h3>
                <div className="space-y-3">
                  <div><Label>Drug Search {useApi ? '(live catalog)' : ''}</Label>
                    <Input placeholder={useApi ? 'Search catalog by name / category…' : 'Generic, brand, class…'} value={drugSearch} onChange={e => setDrugSearch(e.target.value)} onFocus={() => !patient && toast.error('Select a patient first')} />
                    {useApi && catalogLoading && (
                      <p className="text-xs text-muted-foreground mt-1">Loading drugs from GET /api/pharmacy/drugs…</p>
                    )}
                    {useApi && !catalogLoading && catalogError && (
                      <p className="text-xs text-rose-700 mt-1">{catalogError}</p>
                    )}
                    {drugSearch && (
                      <div className="border rounded mt-1 max-h-32 overflow-y-auto">
                        {filteredDrugs.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            {useApi ? 'No matching catalog drugs. Add the drug in Pharmacy → Drug Catalog.' : 'No matching formulary drugs.'}
                          </div>
                        ) : filteredDrugs.map(d => (
                          <button key={d.id} type="button" className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted border-b last:border-0" onClick={() => selectDrug(d)}>
                            <span className="font-medium">{d.generic}</span> ({d.brand}) · {d.drugClass}
                            {useApi && <span className="text-muted-foreground"> · id {d.id}</span>}
                            {d.controlled && <StatusPill tone="red">CD</StatusPill>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Generic</Label><Input value={form.generic} readOnly className="bg-muted/40 h-9" /></div>
                    <div><Label>Brand</Label><Input value={form.brand} readOnly className="bg-muted/40 h-9" /></div>
                    <div><Label>Strength</Label>
                      <Select value={form.strength} onValueChange={v => setForm(f => ({ ...f, strength: v }))} disabled={!form.drugId}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{(selectedDrug?.strengths ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Form</Label>
                      <Select value={form.form} onValueChange={v => setForm(f => ({ ...f, form: v }))} disabled={!form.drugId}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{(selectedDrug?.forms ?? ['Tablet']).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Route</Label><Input value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} className="h-9" /></div>
                    <div><Label>Dose</Label><Input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 100mg" className="h-9" /></div>
                    <div><Label>Frequency</Label>
                      <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v, quantity: calcQuantity(f.dose, v, f.duration) }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{['OD', 'BD', 'TDS', 'QID', 'HS', 'PRN'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value, quantity: calcQuantity(f.dose, f.frequency, e.target.value) }))} className="h-9" /></div>
                    <div><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="h-9" /></div>
                    <div><Label>Source</Label>
                      <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Internal Pharmacy', 'External Purchase', 'Patient Own Drug'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Urgency</Label>
                      <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Routine', 'Urgent', 'Stat'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label>Indication / Diagnosis</Label><Input value={form.indication} onChange={e => setForm(f => ({ ...f, indication: e.target.value }))} /></div>
                    <div className="col-span-2"><Label>Patient Instructions</Label><Input value={form.patientInstructions} onChange={e => setForm(f => ({ ...f, patientInstructions: e.target.value }))} placeholder="Take with food…" /></div>
                    <div className="col-span-2"><Label>Notes to Pharmacist</Label><Input value={form.pharmNotes} onChange={e => setForm(f => ({ ...f, pharmNotes: e.target.value }))} /></div>
                  </div>
                  {selectedDrug && (
                    <div className="text-xs grid grid-cols-2 gap-1 p-2 bg-muted/30 rounded">
                      <div>Stock: {selectedDrug.stock > 0 ? `${selectedDrug.stock} units` : 'Out of stock'}</div>
                      <div>Price: ₦{selectedDrug.price}/unit</div>
                      <div>Formulary: {selectedDrug.formulary}</div>
                      {selectedDrug.controlled && <div className="text-rose-700 font-medium">Controlled drug</div>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => requirePatient(addToBasket)}><Plus className="h-3.5 w-3.5 mr-1" />Add Drug to Prescription</Button>
                    <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm()); setDrugSearch(''); }}>Clear Form</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Add multiple drugs to the prescription basket before sending to pharmacy.</p>
                </div>

                {basket.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Prescription Basket ({basket.length} drug{basket.length !== 1 ? 's' : ''})</h4>
                    <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40"><tr>{['Drug', 'Strength', 'Form', 'Dose', 'Freq', 'Duration', 'Qty', 'Source', 'Alert', 'Action'].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                      <tbody className="divide-y">
                        {basket.map(b => (
                          <tr key={b.id}>
                            <td className="px-2 py-1 font-medium">{b.drug}</td>
                            <td className="px-2 py-1">{b.strength}</td>
                            <td className="px-2 py-1">{b.form}</td>
                            <td className="px-2 py-1">{b.dose}</td>
                            <td className="px-2 py-1">{b.frequency}</td>
                            <td className="px-2 py-1">{b.duration}</td>
                            <td className="px-2 py-1">{b.quantity}</td>
                            <td className="px-2 py-1">{b.source}</td>
                            <td className="px-2 py-1">{b.interaction !== 'None' ? <StatusPill tone="amber">{b.interaction}</StatusPill> : '—'}</td>
                            <td className="px-2 py-1">
                              <div className="flex gap-0.5">
                                <Button size="sm" variant="ghost" className="h-6" title="Edit" onClick={() => {
                                  const d = formulary.find(f => f.id === b.drugId);
                                  if (d) setForm(f => ({ ...f, drugId: b.drugId, generic: b.drug, brand: d.brand, strength: b.strength, form: b.form, dose: b.dose, frequency: b.frequency, duration: b.duration, quantity: b.quantity, source: b.source }));
                                  setBasket(prev => prev.filter(x => x.id !== b.id));
                                  toast.info(`${b.drug} loaded for editing`);
                                }}><Edit className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6" title="Duplicate" onClick={() => setBasket(prev => [...prev, { ...b, id: `b${Date.now()}` }])}><Copy className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6" title="Remove" onClick={() => setBasket(prev => prev.filter(x => x.id !== b.id))}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right: safety & preview */}
            <div className="lg:col-span-4">
              <Card className="sticky top-20">
                <h3 className="font-semibold text-sm mb-3">Safety & Preview</h3>

                {patient && hasKnownAllergies && (
                  <div className="mb-3 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-800"><ShieldAlert className="h-3.5 w-3.5" />Allergy Alert</div>
                    <p className="mt-1 text-rose-700">{patient.allergies}</p>
                    <Button size="sm" variant="outline" className="h-6 mt-1.5 text-xs" onClick={() => setAllergiesModal(true)}>View full profile</Button>
                  </div>
                )}

                {basket.length > 0 ? (
                  <div className="border rounded-lg p-3 mb-3 text-sm bg-muted/20 space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Prescription Preview — {basket.length} item{basket.length !== 1 ? 's' : ''}</div>
                    {basket.map(b => (
                      <div key={b.id} className="border-b last:border-0 pb-2 last:pb-0">
                        <div className="font-semibold">{b.drug} {b.strength} {b.form}</div>
                        <div className="text-xs text-muted-foreground">Take {b.dose} {b.frequency} for {b.duration} · Qty: {b.quantity}</div>
                        <div className="text-xs">{b.source}</div>
                      </div>
                    ))}
                    <StatusPill tone="blue">Draft — not yet sent</StatusPill>
                  </div>
                ) : form.generic ? (
                  <div className="border rounded-lg p-3 mb-3 text-sm bg-muted/20">
                    <div className="text-xs text-muted-foreground mb-1">Current drug (not yet added)</div>
                    <div className="font-semibold">{form.generic} {form.strength} {form.form}</div>
                    <div className="text-xs text-muted-foreground mt-1">Take {form.dose || form.strength} {form.frequency} for {form.duration}.</div>
                    <div className="text-xs mt-1">Qty: {form.quantity || '—'} · {form.source}</div>
                    <p className="text-xs text-amber-700 mt-2">Click &quot;Add Drug to Prescription&quot; to include in basket.</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">Select drugs and add them to the prescription basket to see preview.</p>
                )}
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {cdsLoading && cdsApiOn && (
                    <p className="text-xs text-muted-foreground py-2">Checking clinical interactions…</p>
                  )}
                  {!cdsLoading && liveAlerts.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />No safety alerts</div>
                  ) : liveAlerts.map(a => (
                    <div key={a.id} className={`border rounded p-2 text-xs ${a.severity === 'Critical' ? 'border-rose-300 bg-rose-50' : a.severity === 'Severe' ? 'border-orange-200 bg-orange-50' : ''}`}>
                      <div className="flex justify-between gap-1"><StatusPill tone={a.severity === 'Critical' ? 'red' : a.severity === 'Severe' ? 'amber' : 'blue'}>{a.severity}</StatusPill><span className="font-medium">{a.type}</span></div>
                      <p className="mt-1">{a.message}</p>
                      <p className="text-muted-foreground mt-0.5">{a.recommendation}</p>
                      {(a.severity === 'Moderate' || a.severity === 'Severe' || a.severity === 'Critical') && (
                        <Button size="sm" variant="outline" className="h-6 mt-1" onClick={() => setOverrideModal(a)}>
                          {acknowledgedAlerts.has(a.id) ? 'Acknowledged' : 'Acknowledge / Override'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2">
                  <Button className="w-full" size="sm" onClick={() => requirePatient(() => void openSendFlow())} disabled={sending}>
                    <Send className="h-4 w-4 mr-1.5" />{useApi ? 'Send via API → Pharmacy' : 'Send to Pharmacy'}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => requirePatient(() => void saveDraft())} disabled={savingDraft}>
                      <FileText className="h-3.5 w-3.5 mr-1" />{savingDraft ? 'Saving…' : 'Save Draft'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => requirePatient(() => setPrintModal(true))}>
                      <Printer className="h-3.5 w-3.5 mr-1" />Print Rx
                    </Button>
                  </div>
                  {basket.length === 0 && (
                    <p className="text-[11px] text-center text-muted-foreground">Add at least one drug to the basket before sending.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ACTIVE */}
        <TabsContent value="active">
          <Card className="overflow-x-auto">
            {useApi && medsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading active medications…</p>}
            {useApi && medsError && !medsLoading && <p className="text-sm text-rose-700 py-6 text-center">{medsError}</p>}
            {useApi && !medsLoading && !medsError && filteredActive.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No active medications. Select a patient or prescribe new drugs.</p>
            )}
            {( !useApi || (!medsLoading && filteredActive.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Drug', 'Dose', 'Frequency', 'Start', 'End', 'Prescribed By', 'Status', 'Source', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {filteredActive.map(m => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-medium">{m.drug} {m.strength}</td>
                    <td className="px-3 py-2">{m.dose}</td>
                    <td className="px-3 py-2">{m.frequency}</td>
                    <td className="px-3 py-2 text-xs">{m.startDate}</td>
                    <td className="px-3 py-2 text-xs">{m.endDate}</td>
                    <td className="px-3 py-2">{m.prescribedBy}</td>
                    <td className="px-3 py-2"><StatusPill tone="green">{m.dispenseStatus}</StatusPill></td>
                    <td className="px-3 py-2">{m.source}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setModifyModal(m)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setStopModal(m)}><StopCircle className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" disabled={refillingId === m.prescriptionId} onClick={() => void requestRefill(m)}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPrintModal(true)}><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/timeline`)}><History className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* DRAFTS */}
        <TabsContent value="drafts">
          <Card className="overflow-x-auto">
            {useApi && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted-foreground">Loaded from GET /api/prescriptions?status=Draft</p>
                <Button size="sm" variant="outline" onClick={() => void loadDraftsFromApi()} disabled={draftsLoading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />{draftsLoading ? 'Loading…' : 'Refresh'}
                </Button>
              </div>
            )}
            {useApi && draftsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading drafts…</p>}
            {useApi && draftsError && !draftsLoading && <p className="text-sm text-rose-700 py-6 text-center">{draftsError}</p>}
            {!draftsLoading && !draftsError && patientDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No draft prescriptions.</p>
            ) : !draftsLoading && !draftsError && (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Hospital No.', 'Drugs', 'Created By', 'Last Saved', 'Safety', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {patientDrafts.map(d => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">{d.patientName}</td>
                      <td className="px-3 py-2 text-xs font-mono">{d.hospitalId}</td>
                      <td className="px-3 py-2">{d.drugs}</td>
                      <td className="px-3 py-2">{d.createdBy}</td>
                      <td className="px-3 py-2 text-xs">{d.lastSaved}</td>
                      <td className="px-3 py-2"><StatusPill tone={d.safetyStatus.includes('Critical') ? 'red' : 'amber'}>{d.safetyStatus}</StatusPill></td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => { setBasket(d.items); setTab('build'); toast.success('Draft loaded'); }}>Continue</Button>
                        <Button size="sm" variant="outline" onClick={() => { setBasket(d.items); void openSendFlow(); }}>Send</Button>
                        <Button size="sm" variant="ghost" disabled={deletingDraftId === d.prescriptionId} onClick={() => void deleteDraft(d)}><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        {/* PENDING PHARMACY */}
        <TabsContent value="pending">
          <Card className="overflow-x-auto">
            {useApi && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted-foreground">Loaded from GET /api/prescriptions?status=Sent</p>
                <Button size="sm" variant="outline" onClick={() => void loadPendingFromApi()} disabled={pendingLoading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />{pendingLoading ? 'Loading…' : 'Refresh'}
                </Button>
              </div>
            )}
            {useApi && pendingLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading prescriptions…</p>}
            {useApi && pendingError && !pendingLoading && <p className="text-sm text-rose-700 py-6 text-center">{pendingError}</p>}
            {useApi && !pendingLoading && !pendingError && patientPending.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No prescriptions sent yet. Build a basket and Send to Pharmacy.</p>
            )}
            {(!useApi || (!pendingLoading && patientPending.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Rx No.', 'Patient', 'Hospital No.', 'Drugs', 'Sent', 'Pharmacy', 'Payment', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {patientPending.map(p => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                    <td className="px-3 py-2">{p.patientName}</td>
                    <td className="px-3 py-2 text-xs">{p.hospitalId}</td>
                    <td className="px-3 py-2">{p.drugSummary}</td>
                    <td className="px-3 py-2 text-xs">{p.sentTime}</td>
                    <td className="px-3 py-2"><StatusPill tone="amber">{p.pharmacyStatus}</StatusPill></td>
                    <td className="px-3 py-2"><StatusPill tone={p.paymentStatus === 'Paid' ? 'green' : 'red'}>{p.paymentStatus}</StatusPill></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewPendingRx(p)} title="View prescription"><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.info('Message pharmacy is not wired in this module yet')}><MessageSquare className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" disabled={cancellingId === p.prescriptionId} onClick={() => void cancelPendingRx(p)}><XCircle className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* DISPENSED */}
        <TabsContent value="dispensed">
          <Card className="overflow-x-auto">
            {useApi && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted-foreground">Loaded from GET /api/prescriptions?status=Dispensed,Partially Dispensed</p>
                <Button size="sm" variant="outline" onClick={() => void loadDispensedFromApi(patient?.personId)} disabled={dispensedLoading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />{dispensedLoading ? 'Loading…' : 'Refresh'}
                </Button>
              </div>
            )}
            {useApi && dispensedLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading dispensed prescriptions…</p>}
            {useApi && dispensedError && !dispensedLoading && <p className="text-sm text-rose-700 py-6 text-center">{dispensedError}</p>}
            {useApi && !dispensedLoading && !dispensedError && patientDispensed.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No dispensed prescriptions yet.</p>
            )}
            {(!useApi || (!dispensedLoading && patientDispensed.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Rx No.', 'Patient', 'Summary', 'Dispensed By', 'Time', 'Qty', 'Balance', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {patientDispensed.map(d => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                    <td className="px-3 py-2">{d.patient}</td>
                    <td className="px-3 py-2">{d.summary}</td>
                    <td className="px-3 py-2">{d.by}</td>
                    <td className="px-3 py-2 text-xs">{d.time}</td>
                    <td className="px-3 py-2">{d.qty}</td>
                    <td className="px-3 py-2">{d.balance}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => setViewDispensedRx(d)} title="View receipt"><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setViewDispensedRx(d); setTimeout(() => window.print(), 300); }}><Printer className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* STOPPED */}
        <TabsContent value="stopped">
          <Card className="overflow-x-auto">
            {useApi && medsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading stopped medications…</p>}
            {useApi && medsError && !medsLoading && <p className="text-sm text-rose-700 py-6 text-center">{medsError}</p>}
            {useApi && !medsLoading && stoppedMeds.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No stopped medications on record.</p>
            )}
            {(!useApi || (!medsLoading && stoppedMeds.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Drug', 'Previous Dose', 'Stop Date', 'Stopped By', 'Reason', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {stoppedMeds.map(m => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-medium">{m.drug}</td>
                    <td className="px-3 py-2">{m.dose} {m.frequency}</td>
                    <td className="px-3 py-2">{m.stopDate ?? m.startDate}</td>
                    <td className="px-3 py-2">{m.prescribedBy}</td>
                    <td className="px-3 py-2">{m.stopReason ?? '—'}</td>
                    <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => toast.info('Stop history detail is not wired yet')}><History className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* EXTERNAL LOG */}
        <TabsContent value="external">
          <Card className="overflow-x-auto">
            <div className="flex justify-between mb-3">
              <h3 className="font-semibold">External Purchase Log</h3>
              <Button size="sm" onClick={() => requirePatient(() => setExternalModal(true))}><Plus className="h-3.5 w-3.5 mr-1" />Log External Rx</Button>
            </div>
            {useApi && medsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading external medications…</p>}
            {useApi && medsError && !medsLoading && <p className="text-sm text-rose-700 py-6 text-center">{medsError}</p>}
            {useApi && !medsLoading && externalMeds.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No external medications logged.</p>
            )}
            {(!useApi || (!medsLoading && externalMeds.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Date', 'Drug', 'Source', 'Reason', 'Logged By', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {externalMeds.map(e => (
                  <tr key={e.id}>
                    <td className="px-3 py-2">{e.startDate}</td>
                    <td className="px-3 py-2">{e.drug} {e.strength}</td>
                    <td className="px-3 py-2">External pharmacy</td>
                    <td className="px-3 py-2">Patient reported</td>
                    <td className="px-3 py-2">{e.prescribedBy}</td>
                    <td className="px-3 py-2"><StatusPill tone="green">{e.dispenseStatus}</StatusPill></td>
                    <td className="px-3 py-2">
                      {useApi ? (
                        <Button size="sm" variant="ghost" onClick={() => toast.info('External med verification is managed via pharmacy API')}><CheckCircle2 className="h-3 w-3" /></Button>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => toast.info('Add to history — offline only')}><Plus className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toast.info('Mark verified — offline only')}><CheckCircle2 className="h-3 w-3" /></Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts">
          <Card className="overflow-x-auto">
            {useApi && cdsApiOn && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-muted-foreground">Loaded from GET /api/clinical-pharmacy/alerts</p>
                <Button size="sm" variant="outline" onClick={() => void loadAlertsFromApi()} disabled={alertsLoading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />{alertsLoading ? 'Loading…' : 'Refresh'}
                </Button>
              </div>
            )}
            {useApi && !cdsApiOn && (
              <p className="text-sm text-muted-foreground py-6 text-center">Clinical pharmacy API is disabled — alerts unavailable.</p>
            )}
            {cdsApiOn && alertsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading alerts…</p>}
            {cdsApiOn && alertsError && !alertsLoading && <p className="text-sm text-rose-700 py-6 text-center">{alertsError}</p>}
            {cdsApiOn && !alertsLoading && !alertsError && patientAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No open interaction alerts.</p>
            )}
            {!useApi && patientAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No interaction alerts.</p>
            )}
            {((useApi && cdsApiOn && !alertsLoading && patientAlerts.length > 0) || (!useApi && patientAlerts.length > 0)) && (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>{['Patient', 'Drug', 'Type', 'Severity', 'Description', 'Recommendation', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {patientAlerts.map(a => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">{a.patient}</td>
                    <td className="px-3 py-2">{a.drug}</td>
                    <td className="px-3 py-2">{a.type}</td>
                    <td className="px-3 py-2"><StatusPill tone={a.severity === 'Critical' ? 'red' : 'amber'}>{a.severity}</StatusPill></td>
                    <td className="px-3 py-2 text-xs max-w-[200px]">{a.message}</td>
                    <td className="px-3 py-2 text-xs">{a.recommendation}</td>
                    <td className="px-3 py-2">{a.status}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" disabled={alertActionId === a.alertId || a.status !== 'Open'} onClick={() => void acknowledgeCdsAlert(a)}>
                        {alertActionId === a.alertId ? 'Saving…' : 'Acknowledge'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card>
            <h3 className="font-semibold mb-3">Medication History — {patient?.name ?? 'All patients'}</h3>
            {useApi && medsLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading medication history…</p>}
            {useApi && medsError && !medsLoading && <p className="text-sm text-rose-700 py-6 text-center">{medsError}</p>}
            {useApi && !medsLoading && historyMeds.length === 0 && activeMeds.length === 0 && stoppedMeds.length === 0 && externalMeds.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No medication history for this patient.</p>
            )}
            <div className="space-y-4">
              {useApi ? (
                historyMeds.length > 0 ? (
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Full medication history</div>
                    <div className="space-y-1">
                      {historyMeds.map(m => (
                        <div key={m.id} className="border rounded p-2 text-xs flex justify-between">
                          <span><b>{m.drug}</b> {m.strength} · {m.dose} {m.frequency} · {m.prescribedBy}</span>
                          <StatusPill tone="blue">{m.dispenseStatus}</StatusPill>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              ) : (
              ['Current medication', 'Previous medication', 'External medication', 'Stopped medication', 'Pharmacy dispensed'].map(group => (
                <div key={group}>
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-2">{group}</div>
                  <div className="space-y-1">
                    {[...activeMeds, ...stoppedMeds, ...externalMeds].slice(0, 3).map(m => (
                      <div key={`${group}-${m.id}`} className="border rounded p-2 text-xs flex justify-between">
                        <span><b>{m.drug}</b> {m.strength} · {m.dose} {m.frequency} · {m.prescribedBy}</span>
                        <StatusPill tone="blue">{m.dispenseStatus}</StatusPill>
                      </div>
                    ))}
                  </div>
                </div>
              ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patient search modal */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Patient</DialogTitle>
            <DialogDescription>
              {useApi
                ? 'Live search via GET /api/patients — type at least 2 characters (name, hospital no, phone, NIN)'
                : 'Search by name, hospital number, phone, NHIA, or NIN'}
            </DialogDescription>
          </DialogHeader>
          <Input className="mb-2" placeholder={useApi ? 'Search registered patients…' : 'Search…'} value={patientSearch} onChange={e => setPatientSearch(e.target.value)} autoFocus />
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {useApi && searchingPatients && (
              <p className="text-xs text-muted-foreground p-3">Searching patients…</p>
            )}
            {useApi && !searchingPatients && patientSearch.trim().length >= 2 && patientResults.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">No patients found. Register the patient in Records first.</p>
            )}
            {useApi && patientSearch.trim().length < 2 && (
              <p className="text-xs text-muted-foreground p-3">Type at least 2 characters to search the patient registry.</p>
            )}
            {patientResults.map(p => (
              <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.hospitalId} · {p.clinic} · {p.phone}
                  {useApi && p.personId != null ? ` · personId ${p.personId}` : ''}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop medication */}
      <Dialog open={!!stopModal} onOpenChange={v => !v && setStopModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stop Medication — {stopModal?.drug}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Stop date</Label><Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div><Label>Reason *</Label>
              <Select value={stopReason} onValueChange={setStopReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{['Completed course', 'Side effect', 'Allergy', 'Interaction', 'Treatment changed', 'Patient request', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Doctor comment</Label><Textarea value={stopComment} onChange={e => setStopComment(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmStop()} disabled={stoppingMed}>
              {stoppingMed ? 'Stopping…' : 'Stop Medication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify */}
      <Dialog open={!!modifyModal} onOpenChange={v => !v && setModifyModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modify Prescription — {modifyModal?.drug}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 p-2 bg-muted/30 rounded"><b>Previous:</b> {modifyModal?.dose} {modifyModal?.frequency}</div>
            <div><Label>New dose</Label><Input defaultValue={modifyModal?.dose} /></div>
            <div><Label>Frequency</Label><Input defaultValue={modifyModal?.frequency} /></div>
            <div className="col-span-2"><Label>Reason for change</Label><Textarea placeholder="Clinical reason…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyModal(null)}>Cancel</Button>
            {useApi ? (
              <Button onClick={() => { toast.info('To modify a medication, stop the current line and prescribe a refill or new Rx.'); setModifyModal(null); }}>
                Understood
              </Button>
            ) : (
              <Button onClick={() => { notifySuccess('Prescription modified — new version created', 'Modified'); setModifyModal(null); logRxAudit(`Modified ${modifyModal?.drug}`); }}>Save Changes</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to pharmacy checklist */}
      <Dialog open={sendModal} onOpenChange={setSendModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send to Pharmacy</DialogTitle><DialogDescription>Pre-dispatch safety checklist</DialogDescription></DialogHeader>
          <ul className="text-sm space-y-2">
            {[
              ['Patient selected', !!patient],
              ['Diagnosis / indication', !!form.indication || !!patient?.diagnosis],
              ['Allergy checked', !!patient],
              ['Interactions reviewed', !hasBlockingAlert],
              ['Quantity calculated', basket.every(b => b.quantity > 0)],
              ['Billing checked', true],
              ['Doctor signature', !!doctorName],
            ].map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-2">
                {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                {label}
              </li>
            ))}
          </ul>
          {hasBlockingAlert && <p className="text-xs text-rose-700 mt-2">Critical alerts must be acknowledged before sending.</p>}
          {basket.length > 0 && (
            <div className="mt-3 text-xs border rounded p-2 bg-muted/20">
              <div className="font-semibold mb-1">Drugs to send ({basket.length})</div>
              {basket.map(b => <div key={b.id}>· {b.drug} {b.strength} — {b.dose} {b.frequency} × {b.quantity}</div>)}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModal(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { void saveDraft(); setSendModal(false); }} disabled={savingDraft}>
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button onClick={() => void sendToPharmacy()} disabled={hasBlockingAlert || sending}>
              {sending ? 'Sending…' : useApi ? 'Send via API' : 'Send to Pharmacy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print */}
      <Dialog open={printModal} onOpenChange={setPrintModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Prescription — Print Preview</DialogTitle></DialogHeader>
          {patient && (
            <div className="border rounded-lg p-6 text-sm space-y-3 bg-white text-black">
              <div className="text-center border-b pb-2">
                <div className="font-bold">Federal Neuro-Psychiatric Hospital, Aro</div>
                <div className="text-xs">Outpatient Prescription</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><b>Patient:</b> {patient.name}</div>
                <div><b>Hospital No:</b> {patient.hospitalId}</div>
                <div><b>Clinic:</b> {patient.clinic}</div>
                <div><b>Date:</b> {new Date().toLocaleString()}</div>
                <div><b>Doctor:</b> {doctorName}</div>
                <div><b>Allergies:</b> {patient.allergies}</div>
              </div>
              <table className="w-full text-xs border">
                <thead><tr className="bg-muted/40">{['Drug', 'Dose', 'Frequency', 'Duration', 'Qty'].map(h => <th key={h} className="border px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {(basket.length ? basket : useApi ? [] : [{ drug: 'Sertraline', strength: '100mg', dose: '100mg', frequency: 'OD', duration: '28 days', quantity: 28 }]).map((b, i) => (
                    <tr key={i}><td className="border px-2 py-1">{b.drug} {b.strength}</td><td className="border px-2 py-1">{b.dose}</td><td className="border px-2 py-1">{b.frequency}</td><td className="border px-2 py-1">{b.duration}</td><td className="border px-2 py-1">{b.quantity}</td></tr>
                  ))}
                  {basket.length === 0 && useApi && (
                    <tr><td colSpan={5} className="border px-2 py-3 text-center text-muted-foreground">Add drugs to the basket before printing.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="flex justify-between items-end border-t pt-3">
                <div className="text-xs">Doctor signature: _________________________</div>
                <div className="h-14 w-14 border grid place-items-center text-[10px]">QR</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintModal(false)}>Close</Button>
            <Button onClick={() => { if (basket.length === 0 && useApi) { toast.error('Nothing to print — load Rx detail or add basket items'); return; } logRxAudit('Prescription printed'); window.print(); }} disabled={useApi && basket.length === 0}>
              <Printer className="h-4 w-4 mr-1" />Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* External purchase log */}
      <Dialog open={externalModal} onOpenChange={setExternalModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log External Purchase</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Drug name</Label><Input value={extForm.drug} onChange={e => setExtForm(f => ({ ...f, drug: e.target.value }))} /></div>
            <div><Label>Strength</Label><Input value={extForm.strength} onChange={e => setExtForm(f => ({ ...f, strength: e.target.value }))} /></div>
            <div><Label>Dose / Frequency</Label><Input value={extForm.dose} onChange={e => setExtForm(f => ({ ...f, dose: e.target.value }))} /></div>
            <div><Label>Purchased from</Label><Input value={extForm.source} onChange={e => setExtForm(f => ({ ...f, source: e.target.value }))} /></div>
            <div><Label>Reason</Label><Input value={extForm.reason} onChange={e => setExtForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Doctor note</Label><Textarea value={extForm.note} onChange={e => setExtForm(f => ({ ...f, note: e.target.value }))} /></div>
            <div className="col-span-2 flex items-center gap-2"><Checkbox checked={extForm.active} onCheckedChange={v => setExtForm(f => ({ ...f, active: !!v }))} /><Label>Mark as active medication</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalModal(false)}>Cancel</Button>
            <Button onClick={() => void (async () => {
              if (!extForm.drug || !patient) return;
              if (useApi) {
                const personId = patient.personId ?? Number(patient.id);
                if (!Number.isFinite(personId) || personId <= 0) {
                  toast.error('Select a registered patient before logging external Rx');
                  return;
                }
                setExternalSaving(true);
                try {
                  const catalogMatch = formulary.find((f) => f.generic.toLowerCase() === extForm.drug.toLowerCase());
                  await createExternalPrescription({
                    personId,
                    drugName: extForm.drug,
                    drugId: catalogMatch && /^\d+$/.test(catalogMatch.id) ? Number(catalogMatch.id) : undefined,
                    strength: extForm.strength || undefined,
                    dose: extForm.dose || extForm.strength || '—',
                    frequency: extForm.frequency || '—',
                    duration: extForm.duration || undefined,
                    notes: [extForm.reason, extForm.note, extForm.source ? `Source: ${extForm.source}` : ''].filter(Boolean).join(' · ') || undefined,
                  });
                  await loadPatientMedications(personId);
                  logRxAudit(`External Rx logged via API: ${extForm.drug} for ${patient.name}`);
                  logTimeline(`External medication logged — ${extForm.drug}`, patient);
                  notifySuccess('External purchase logged', 'Logged');
                  setExternalModal(false);
                  setExtForm({ drug: '', strength: '', dose: '', frequency: '', duration: '', source: '', reason: '', note: '', active: true });
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Failed to log external prescription');
                } finally {
                  setExternalSaving(false);
                }
                return;
              }
              setExternalMeds(prev => [...prev, {
                id: `e${Date.now()}`, drug: extForm.drug, generic: extForm.drug, strength: extForm.strength,
                form: '—', dose: extForm.dose, frequency: extForm.frequency || '—', duration: extForm.duration || '—',
                startDate: new Date().toISOString().slice(0, 10), endDate: '—',
                prescribedBy: doctorName, dispenseStatus: 'Logged', source: 'External',
              }]);
              logRxAudit(`External Rx logged: ${extForm.drug} for ${patient.name}`);
              logTimeline(`External medication logged — ${extForm.drug}`, patient);
              notifySuccess('External purchase logged', 'Logged');
              setExternalModal(false);
              setExtForm({ drug: '', strength: '', dose: '', frequency: '', duration: '', source: '', reason: '', note: '', active: true });
            })()} disabled={externalSaving}>
              {externalSaving ? 'Saving…' : 'Save Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override alert */}
      <Dialog open={!!overrideModal} onOpenChange={v => !v && setOverrideModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge Alert — {overrideModal?.type}</DialogTitle></DialogHeader>
          <p className="text-sm">{overrideModal?.message}</p>
          {(overrideModal?.severity === 'Moderate' || overrideModal?.severity === 'Severe' || overrideModal?.severity === 'Critical') && (
            <div><Label>Justification *</Label><Textarea value={overrideJustification} onChange={e => setOverrideJustification(e.target.value)} placeholder="Clinical justification for override…" /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideModal(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!overrideJustification.trim() && overrideModal?.severity !== 'Mild') { toast.error('Justification required'); return; }
              if (overrideModal) setAcknowledgedAlerts(prev => new Set(prev).add(overrideModal.id));
              logRxAudit(`Alert overridden: ${overrideModal?.type} — ${overrideJustification}`);
              toast.success('Alert acknowledged');
              setOverrideModal(null); setOverrideJustification('');
            }}>Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allergies profile */}
      <Dialog open={allergiesModal} onOpenChange={setAllergiesModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-600" />Allergy Profile</DialogTitle>
            <DialogDescription>{patient ? `${patient.name} · ${patient.hospitalId}` : 'Select a patient to view allergies'}</DialogDescription>
          </DialogHeader>
          {patient ? (
            patientAllergies.length > 0 ? (
              <div className="space-y-3">
                {patientAllergies.map(a => (
                  <div key={a.substance} className="border border-rose-200 rounded-lg p-3 bg-rose-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-rose-900">{a.substance}</span>
                      <StatusPill tone={a.severity === 'Severe' || a.severity === 'Critical' ? 'red' : 'amber'}>{a.severity}</StatusPill>
                    </div>
                    <div className="text-sm mt-2"><span className="text-muted-foreground">Reaction:</span> {a.reaction}</div>
                    <div className="text-xs text-muted-foreground mt-1">Verified: {a.verifiedDate}</div>
                    {a.notes && <div className="text-xs mt-2 p-2 bg-white/60 rounded border">{a.notes}</div>}
                  </div>
                ))}
                <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded">
                  Always check new prescriptions against this profile before sending to pharmacy.
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-medium">No Known Drug Allergies (NKDA)</p>
                <p className="text-sm text-muted-foreground mt-1">No documented allergies on record for this patient.</p>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Select a patient to view their allergy profile.</p>
          )}
          <DialogFooter>
            <Button onClick={() => setAllergiesModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending prescription detail */}
      <Dialog open={!!viewPendingRx} onOpenChange={v => !v && setViewPendingRx(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pending Prescription — {viewPendingRx?.id}</DialogTitle>
            <DialogDescription>Sent to pharmacy · awaiting dispense</DialogDescription>
          </DialogHeader>
          {viewPendingRx && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                <div><span className="text-muted-foreground">Patient</span><div className="font-medium">{viewPendingRx.patientName}</div></div>
                <div><span className="text-muted-foreground">Hospital No.</span><div className="font-mono">{viewPendingRx.hospitalId}</div></div>
                <div><span className="text-muted-foreground">Prescribed By</span><div>{viewPendingRx.prescribedBy}</div></div>
                <div><span className="text-muted-foreground">Sent</span><div>{viewPendingRx.sentTime}</div></div>
                <div><span className="text-muted-foreground">Diagnosis</span><div>{viewPendingRx.diagnosis}</div></div>
                <div><span className="text-muted-foreground">Allergies</span><div className="text-rose-700 font-medium">{viewPendingRx.allergies}</div></div>
                <div><span className="text-muted-foreground">Pharmacy Status</span><div><StatusPill tone="amber">{viewPendingRx.pharmacyStatus}</StatusPill></div></div>
                <div><span className="text-muted-foreground">Payment</span><div><StatusPill tone={viewPendingRx.paymentStatus === 'Paid' ? 'green' : 'red'}>{viewPendingRx.paymentStatus}</StatusPill></div></div>
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Medications</h4>
                <table className="w-full text-xs border rounded overflow-hidden">
                  <thead className="bg-muted/40"><tr>{['Drug', 'Strength', 'Dose', 'Frequency', 'Duration', 'Qty', 'Source'].map(h => <th key={h} className="px-2 py-1.5 text-left border-b">{h}</th>)}</tr></thead>
                  <tbody>
                    {viewPendingRx.items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-medium">{item.drug}</td>
                        <td className="px-2 py-1.5">{item.strength}</td>
                        <td className="px-2 py-1.5">{item.dose}</td>
                        <td className="px-2 py-1.5">{item.frequency}</td>
                        <td className="px-2 py-1.5">{item.duration}</td>
                        <td className="px-2 py-1.5">{item.quantity}</td>
                        <td className="px-2 py-1.5">{item.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPendingRx(null)}>Close</Button>
            {viewPendingRx && (
              <Button variant="outline" onClick={() => toast.info('Message pharmacy is not wired in this module yet')}><MessageSquare className="h-4 w-4 mr-1" />Message Pharmacy</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispensed receipt detail */}
      <Dialog open={!!viewDispensedRx} onOpenChange={v => !v && setViewDispensedRx(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispense Receipt — {viewDispensedRx?.id}</DialogTitle>
            <DialogDescription>Pharmacy dispense confirmation</DialogDescription>
          </DialogHeader>
          {viewDispensedRx && (
            <div className="border rounded-lg p-5 text-sm space-y-4 bg-white">
              <div className="text-center border-b pb-3">
                <div className="font-bold">Federal Neuro-Psychiatric Hospital, Aro</div>
                <div className="text-xs text-muted-foreground">Pharmacy Dispense Receipt</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><b>Rx No:</b> {viewDispensedRx.id}</div>
                <div><b>Date:</b> {viewDispensedRx.time}</div>
                <div><b>Patient:</b> {viewDispensedRx.patient}</div>
                <div><b>Hospital No:</b> {viewDispensedRx.hospitalId}</div>
                <div><b>Prescribed By:</b> {viewDispensedRx.prescribedBy}</div>
                <div><b>Dispensed By:</b> {viewDispensedRx.by}</div>
                <div><b>Payment:</b> {viewDispensedRx.paymentStatus}</div>
                <div><b>Total:</b> ₦{viewDispensedRx.totalAmount.toLocaleString()}</div>
              </div>
              <table className="w-full text-xs border">
                <thead className="bg-muted/40"><tr>{['Drug', 'Strength', 'Dose', 'Freq', 'Qty', 'Unit Price', 'Subtotal'].map(h => <th key={h} className="border px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {viewDispensedRx.items.map((item, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1 font-medium">{item.drug}</td>
                      <td className="border px-2 py-1">{item.strength}</td>
                      <td className="border px-2 py-1">{item.dose}</td>
                      <td className="border px-2 py-1">{item.frequency}</td>
                      <td className="border px-2 py-1">{item.quantity}</td>
                      <td className="border px-2 py-1">₦{item.unitPrice}</td>
                      <td className="border px-2 py-1">₦{(item.quantity * item.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between text-xs border-t pt-2">
                <div>Quantity dispensed: <b>{viewDispensedRx.qty}</b></div>
                <div>Balance remaining: <b>{viewDispensedRx.balance}</b></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDispensedRx(null)}>Close</Button>
            <Button onClick={() => { window.print(); }}><Printer className="h-4 w-4 mr-1" />Print Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClinicalPageShell>
  );
};
