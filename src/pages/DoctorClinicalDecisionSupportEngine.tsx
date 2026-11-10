import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { setDocPatientContext, getDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import {
  checkClinicalInteractions,
  closeClinicalPharmacyAlert,
  isClinicalPharmacyApiEnabled,
  listClinicalPharmacyAlerts,
  listPatientAllergies,
  overrideClinicalPharmacyAlert,
  type ClinicalPharmacyAlert,
  type ClinicalPharmacyKpis,
  type PatientAllergy,
} from '@/lib/api/clinical-pharmacy';
import { isPatientsApiEnabled, searchPersons, type PersonRecord } from '@/lib/api/patients';
import { isPharmacyApiEnabled, listDrugs, type ApiDrug } from '@/lib/api/pharmacy';
import {
  ShieldCheck, AlertTriangle, User, Plus, Calculator, BookOpen, Search,
  FlaskConical, Pill, Eye, CheckCircle2, X, Loader2, Heart,
} from 'lucide-react';

const PENDING_CONFIG =
  'Clinical pharmacy API is not configured. Set VITE_USE_API and VITE_API_BASE_URL to load live CDS data.';
const PENDING_EMR = 'Clinical documentation and EMR export are not yet integrated from CDS.';
const PENDING_EXPORT = 'CDS report export is not yet integrated.';
const PENDING_GUIDELINES = 'Clinical guidelines library API is not yet connected.';
const PENDING_CONTRA = 'Contraindication checking API is not yet connected.';
const PENDING_PREG = 'Pregnancy safety checking API is not yet connected.';
const PENDING_RENAL_TAB = 'Renal dose adjustment API is not yet connected.';
const PENDING_LIVER_TAB = 'Hepatic dose adjustment API is not yet connected.';
const PENDING_HISTORY = 'No closed clinical pharmacy alerts are available for history yet.';

const base = '/dashboard/doctor/clinical';
const CDS_HISTORY_KEY = 'gfa_doc_cds_history_v1';
const CDS_AUDIT_KEY = 'gfa_doc_cds_audit_v1';
const TODAY = new Date().toISOString().slice(0, 10);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · CDS">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const StatusPill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => {
  const cls = tone === 'red' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : tone === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : tone === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

type TabId = 'safety' | 'interactions' | 'allergy' | 'contraindications' | 'pregnancy' | 'renal' | 'liver' | 'calculators' | 'guidelines' | 'history';
type KpiFilter = 'checksToday' | 'interactions' | 'allergy' | 'contraindications' | 'doseAdjust' | 'guidelines';
type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Critical';

interface CdsPatient {
  id: string;
  personId: number;
  name: string;
  hospitalId: string;
  age: number;
  gender: string;
  weight: string;
  pregnancy: string;
  allergies: string[];
  diagnosis: string;
  medications: string;
  egfr: string;
  lft: string;
  clinic: 'GMPC' | 'OPC';
}

interface CheckRecord {
  id: string; date: string; patient: string; checkType: string; inputSummary: string;
  result: string; severity: Severity | 'Info'; doctor: string; acknowledged: boolean;
}

interface SafetyAlertCard {
  id: string;
  alertId?: number;
  category: string;
  severity: Severity;
  title: string;
  recommendation: string;
  status: 'Open' | 'Acknowledged' | 'Overridden' | 'Closed' | 'Notified';
}

function mapApiSeverity(sev: string): Severity {
  const s = sev.toLowerCase();
  if (s.includes('critical')) return 'Critical';
  if (s.includes('severe')) return 'Severe';
  if (s.includes('moderate')) return 'Moderate';
  return 'Minor';
}

function mapAlertStatus(status: string): SafetyAlertCard['status'] {
  if (status === 'Overridden') return 'Overridden';
  if (status === 'Closed' || status === 'Notified') return 'Acknowledged';
  return 'Open';
}

function mapClinicalAlertToCard(a: ClinicalPharmacyAlert): SafetyAlertCard {
  const title = a.drugB ? `${a.drugA} + ${a.drugB}` : a.drugA;
  return {
    id: String(a.alertId),
    alertId: a.alertId,
    category: a.alertType,
    severity: mapApiSeverity(a.severity),
    title: `${title} — ${a.message.slice(0, 60)}`,
    recommendation: a.ruleCode ? `Rule: ${a.ruleCode}` : a.message,
    status: mapAlertStatus(a.status),
  };
}

function mapAlertToHistory(a: ClinicalPharmacyAlert, doctorName: string): CheckRecord {
  return {
    id: String(a.alertId),
    date: (a.createdAt ?? '').replace('T', ' ').slice(0, 16) || '—',
    patient: a.patientName,
    checkType: a.alertType,
    inputSummary: a.drugB ? `${a.drugA} + ${a.drugB}` : a.drugA,
    result: a.message,
    severity: mapApiSeverity(a.severity),
    doctor: a.overriddenBy ?? a.createdBy ?? doctorName,
    acknowledged: a.status === 'Closed' || a.status === 'Overridden' || a.status === 'Notified',
  };
}

function mapPersonToCds(p: PersonRecord): CdsPatient {
  const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
  const age = p.dateOfBirth
    ? Math.max(0, new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear())
    : 0;
  return {
    id: String(p.personId),
    personId: p.personId,
    name: name || 'Unknown',
    hospitalId: p.hospitalNo ?? String(p.personId),
    age,
    gender: p.sex ?? '—',
    weight: '—',
    pregnancy: '—',
    allergies: [],
    diagnosis: '—',
    medications: '—',
    egfr: '—',
    lft: '—',
    clinic: 'OPC',
  };
}

function loadLocalHistory(): CheckRecord[] {
  try { const raw = localStorage.getItem(CDS_HISTORY_KEY); if (raw) return JSON.parse(raw); } catch { /* noop */ }
  return [];
}

function saveHistory(h: CheckRecord[]) { try { localStorage.setItem(CDS_HISTORY_KEY, JSON.stringify(h)); } catch { /* noop */ } }

function logAudit(action: string, detail?: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(CDS_AUDIT_KEY) || '[]');
    arr.unshift({ action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(CDS_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
    const master = JSON.parse(localStorage.getItem('gfa_doc_audit_master_v1') || '[]');
    master.unshift({ action, detail, module: 'Clinical Decision Support', timestamp: new Date().toISOString() });
    localStorage.setItem('gfa_doc_audit_master_v1', JSON.stringify(master.slice(0, 500)));
  } catch { /* noop */ }
}

const severityTone = (s: string) => s === 'Critical' || s === 'Severe' ? 'red' : s === 'Moderate' ? 'amber' : 'green';

export const DoctorCDS = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Dr. User';
  const cdsApiOn = isClinicalPharmacyApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();
  const pharmacyApiOn = isPharmacyApiEnabled();

  const ctxPatient = getDocPatientContext();
  const [patient, setPatient] = useState<CdsPatient | null>(null);
  const [tab, setTab] = useState<TabId>('safety');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [localHistory, setLocalHistory] = useState<CheckRecord[]>(loadLocalHistory);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [apiPatients, setApiPatients] = useState<CdsPatient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [guidelineQuery, setGuidelineQuery] = useState('');
  const [calcOpen, setCalcOpen] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState<SafetyAlertCard | null>(null);
  const [overrideComment, setOverrideComment] = useState('');
  const [ackOpen, setAckOpen] = useState<SafetyAlertCard | null>(null);
  const [ackComment, setAckComment] = useState('');
  const [alertActionLoading, setAlertActionLoading] = useState(false);

  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlertCard[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(cdsApiOn);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [apiKpis, setApiKpis] = useState<ClinicalPharmacyKpis | null>(null);

  const [drugCatalog, setDrugCatalog] = useState<ApiDrug[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(cdsApiOn && pharmacyApiOn);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedDrugIds, setSelectedDrugIds] = useState<number[]>([]);
  const [interactionResults, setInteractionResults] = useState<{ drug: string; severity: Severity; description: string; recommendation: string }[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const [patientAllergies, setPatientAllergies] = useState<PatientAllergy[]>([]);
  const [allergiesLoading, setAllergiesLoading] = useState(false);
  const [allergiesError, setAllergiesError] = useState<string | null>(null);
  const [allergyDrugId, setAllergyDrugId] = useState<number | null>(null);
  const [allergyResult, setAllergyResult] = useState<{ match: boolean; reaction: string; severity: Severity } | null>(null);
  const [allergyCheckLoading, setAllergyCheckLoading] = useState(false);

  const [closedHistory, setClosedHistory] = useState<CheckRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadSafetyAlerts = useCallback(async () => {
    if (!cdsApiOn) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await listClinicalPharmacyAlerts({ status: 'Open', limit: 100 });
      setSafetyAlerts(data.items.map(mapClinicalAlertToCard));
      setApiKpis(data.kpis);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load safety alerts';
      setAlertsError(msg);
      setSafetyAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [cdsApiOn]);

  const loadClosedHistory = useCallback(async () => {
    if (!cdsApiOn) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await listClinicalPharmacyAlerts({ status: 'Closed', limit: 100 });
      setClosedHistory(data.items.map((a) => mapAlertToHistory(a, doctorName)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load alert history';
      setHistoryError(msg);
      setClosedHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [cdsApiOn, doctorName]);

  const loadDrugCatalog = useCallback(async () => {
    if (!cdsApiOn || !pharmacyApiOn) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await listDrugs({ limit: 200 });
      setDrugCatalog(data.items);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load drug catalog';
      setCatalogError(msg);
      setDrugCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [cdsApiOn, pharmacyApiOn]);

  const loadPatientAllergies = useCallback(async (personId: number) => {
    if (!cdsApiOn) return;
    setAllergiesLoading(true);
    setAllergiesError(null);
    try {
      const items = await listPatientAllergies(personId);
      setPatientAllergies(items);
      setPatient((prev) => (prev
        ? { ...prev, allergies: items.map((a) => a.substance) }
        : prev));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load patient allergies';
      setAllergiesError(msg);
      setPatientAllergies([]);
    } finally {
      setAllergiesLoading(false);
    }
  }, [cdsApiOn]);

  useEffect(() => {
    if (cdsApiOn) void loadSafetyAlerts();
  }, [cdsApiOn, loadSafetyAlerts]);

  useEffect(() => {
    if (cdsApiOn && tab === 'history') void loadClosedHistory();
  }, [cdsApiOn, tab, loadClosedHistory]);

  useEffect(() => {
    if (cdsApiOn && pharmacyApiOn) void loadDrugCatalog();
  }, [cdsApiOn, pharmacyApiOn, loadDrugCatalog]);

  useEffect(() => {
    if (cdsApiOn && patient?.personId) void loadPatientAllergies(patient.personId);
  }, [cdsApiOn, patient?.personId, loadPatientAllergies]);

  useEffect(() => {
    if (!cdsApiOn || !patientsApiOn || !ctxPatient) return;
    const parsed = Number(ctxPatient.id);
    if (Number.isFinite(parsed) && parsed > 0) {
      setPatient({
        id: ctxPatient.id,
        personId: parsed,
        name: ctxPatient.name,
        hospitalId: ctxPatient.hospitalId,
        age: ctxPatient.age ?? 0,
        gender: ctxPatient.gender ?? '—',
        weight: '—',
        pregnancy: '—',
        allergies: ctxPatient.allergies ? ctxPatient.allergies.split(',').map((s) => s.trim()) : [],
        diagnosis: ctxPatient.diagnosis ?? '—',
        medications: ctxPatient.medications ?? '—',
        egfr: '—',
        lft: '—',
        clinic: ctxPatient.clinic === 'GMPC' ? 'GMPC' : 'OPC',
      });
      return;
    }
    void (async () => {
      try {
        const rows = await searchPersons(ctxPatient.hospitalId || ctxPatient.name);
        const match = rows.find((r) =>
          r.hospitalNo === ctxPatient.hospitalId
          || String(r.personId) === ctxPatient.id
          || `${r.firstName} ${r.lastName}`.trim() === ctxPatient.name,
        ) ?? rows[0];
        if (match) setPatient(mapPersonToCds(match));
      } catch { /* patient context resolve optional */ }
    })();
  }, [cdsApiOn, patientsApiOn, ctxPatient]);

  useEffect(() => {
    if (!patientSearchOpen || !cdsApiOn || !patientsApiOn) return;
    const q = patientQuery.trim();
    if (q.length < 2) {
      setApiPatients([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchingPatients(true);
      setPatientSearchError(null);
      try {
        const rows = await searchPersons(q);
        setApiPatients(rows.map(mapPersonToCds));
      } catch (err) {
        setPatientSearchError(err instanceof ApiError ? err.message : 'Patient search failed');
        setApiPatients([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [patientSearchOpen, patientQuery, cdsApiOn, patientsApiOn]);

  const addHistory = useCallback((rec: Omit<CheckRecord, 'id' | 'date' | 'doctor' | 'acknowledged'>) => {
    const entry: CheckRecord = { ...rec, id: `h${Date.now()}`, date: new Date().toLocaleString('en-GB', { hour12: false }).replace(',', ''), doctor: doctorName, acknowledged: false };
    setLocalHistory((prev) => { const next = [entry, ...prev]; saveHistory(next); return next; });
    logAudit(`${rec.checkType} performed`, rec.patient);
    return entry;
  }, [doctorName]);

  const selectPatient = (p: CdsPatient) => {
    setPatient(p);
    setDocPatientContext({
      id: p.id, name: p.name, hospitalId: p.hospitalId, age: p.age, gender: p.gender,
      clinic: p.clinic, allergies: p.allergies.join(', '), diagnosis: p.diagnosis, medications: p.medications,
    } as DocPatientContext);
    setPatientSearchOpen(false);
    notifySuccess(`Patient context set — ${p.name}`, 'Patient Selected');
    if (cdsApiOn) void loadPatientAllergies(p.personId);
  };

  const navigatePatient = (path: string, extra?: Partial<DocPatientContext>) => {
    if (!patient) return;
    setDocPatientContext({
      id: patient.id, name: patient.name, hospitalId: patient.hospitalId, age: patient.age,
      gender: patient.gender, clinic: patient.clinic, ...extra,
    } as DocPatientContext);
    navigate(path);
  };

  const kpis = useMemo(() => {
    if (cdsApiOn && apiKpis) {
      return {
        checksToday: apiKpis.open + apiKpis.overriddenToday,
        interactions: safetyAlerts.filter((a) => a.category.includes('DDI') || a.category.toLowerCase().includes('interaction')).length,
        allergy: apiKpis.allergy,
        contraindications: safetyAlerts.filter((a) => a.category.toLowerCase().includes('contra')).length,
        doseAdjust: safetyAlerts.filter((a) => /renal|liver|dose/i.test(a.category)).length,
        guidelines: 0,
      };
    }
    return { checksToday: 0, interactions: 0, allergy: 0, contraindications: 0, doseAdjust: 0, guidelines: 0 };
  }, [cdsApiOn, apiKpis, safetyAlerts]);

  const history = cdsApiOn ? closedHistory : localHistory;

  const filteredHistory = useMemo(() => {
    let rows = history;
    if (kpiFilter === 'interactions') rows = rows.filter((h) => h.checkType.includes('Interaction') || h.checkType === 'DDI');
    else if (kpiFilter === 'allergy') rows = rows.filter((h) => h.checkType.includes('Allergy'));
    else if (kpiFilter === 'contraindications') rows = rows.filter((h) => h.checkType.includes('Contraindication'));
    else if (kpiFilter === 'doseAdjust') rows = rows.filter((h) => h.checkType.includes('Dose') || h.checkType.includes('Renal') || h.checkType.includes('Liver'));
    else if (kpiFilter === 'checksToday') rows = rows.filter((h) => h.date.includes(TODAY.split('-').reverse().join('/')) || h.date.startsWith(TODAY));
    else if (kpiFilter === 'guidelines') rows = rows.filter((h) => h.checkType.includes('Guideline'));
    return rows;
  }, [history, kpiFilter]);

  const checkInteractions = async () => {
    if (!cdsApiOn || !patient) {
      toast.error('Select a patient and enable the clinical pharmacy API');
      return;
    }
    const drugIds = selectedDrugIds.filter((id) => id > 0);
    if (drugIds.length === 0) {
      toast.error('Select at least one drug from the catalog');
      return;
    }
    setInteractionLoading(true);
    setInteractionResults([]);
    try {
      const result = await checkClinicalInteractions({ personId: patient.personId, drugIds });
      const mapped = result.findings.map((f) => ({
        drug: f.drugB ? `${f.drugA} + ${f.drugB}` : f.drugA,
        severity: mapApiSeverity(f.severity),
        description: f.message,
        recommendation: f.ruleCode ? `Rule: ${f.ruleCode}` : 'Review before prescribing',
      }));
      setInteractionResults(mapped);
      if (mapped.length === 0) {
        toast.success('No interaction findings returned');
      } else {
        toast.success(`Found ${mapped.length} interaction finding(s)`);
      }
      addHistory({
        patient: patient.name,
        checkType: 'Drug Interaction',
        inputSummary: drugIds.map((id) => drugCatalog.find((d) => d.drugId === id)?.name ?? String(id)).join(' + '),
        result: mapped[0]?.description ?? 'No findings',
        severity: mapped[0]?.severity ?? 'Minor',
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Interaction check failed');
    } finally {
      setInteractionLoading(false);
    }
  };

  const checkAllergy = async () => {
    if (!cdsApiOn || !patient) {
      toast.error('Select a patient and enable the clinical pharmacy API');
      return;
    }
    if (!allergyDrugId) {
      toast.error('Select a drug from the catalog');
      return;
    }
    setAllergyCheckLoading(true);
    setAllergyResult(null);
    try {
      const result = await checkClinicalInteractions({ personId: patient.personId, drugIds: [allergyDrugId] });
      const allergyFindings = result.findings.filter((f) =>
        f.alertType.toLowerCase().includes('allergy'),
      );
      const drugName = drugCatalog.find((d) => d.drugId === allergyDrugId)?.name ?? 'Drug';
      if (allergyFindings.length > 0) {
        const f = allergyFindings[0];
        setAllergyResult({
          match: true,
          reaction: f.message,
          severity: mapApiSeverity(f.severity),
        });
      } else {
        setAllergyResult({
          match: false,
          reaction: `No allergy conflict found for ${drugName}`,
          severity: 'Minor',
        });
      }
      addHistory({
        patient: patient.name,
        checkType: 'Allergy Check',
        inputSummary: drugName,
        result: allergyFindings[0]?.message ?? 'No allergy findings',
        severity: allergyFindings[0] ? mapApiSeverity(allergyFindings[0].severity) : 'Minor',
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Allergy check failed');
    } finally {
      setAllergyCheckLoading(false);
    }
  };

  const acknowledgeAlert = async () => {
    if (!ackOpen) return;
    if (['Moderate', 'Severe', 'Critical'].includes(ackOpen.severity) && !ackComment.trim()) {
      toast.error('Comment required for moderate/severe alerts');
      return;
    }
    if (cdsApiOn && ackOpen.alertId) {
      setAlertActionLoading(true);
      try {
        if (['Severe', 'Critical'].includes(ackOpen.severity)) {
          await overrideClinicalPharmacyAlert(ackOpen.alertId, ackComment.trim() || 'Acknowledged from CDS');
        } else {
          await closeClinicalPharmacyAlert(ackOpen.alertId);
        }
        await loadSafetyAlerts();
        logAudit('Safety alert acknowledged', ackOpen.title);
        setAckOpen(null);
        setAckComment('');
        toast.success('Alert acknowledged');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to acknowledge alert');
      } finally {
        setAlertActionLoading(false);
      }
      return;
    }
  };

  const overrideAlert = async () => {
    if (!overrideOpen) return;
    if (!overrideComment.trim()) { toast.error('Justification required'); return; }
    if (cdsApiOn && overrideOpen.alertId) {
      setAlertActionLoading(true);
      try {
        await overrideClinicalPharmacyAlert(overrideOpen.alertId, overrideComment.trim());
        await loadSafetyAlerts();
        logAudit('Safety alert overridden', `${overrideOpen.title}: ${overrideComment}`);
        setOverrideOpen(null);
        setOverrideComment('');
        toast.success('Override recorded');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to override alert');
      } finally {
        setAlertActionLoading(false);
      }
      return;
    }
  };

  const closeAlert = async (alert: SafetyAlertCard) => {
    if (!cdsApiOn || !alert.alertId) return;
    setAlertActionLoading(true);
    try {
      await closeClinicalPharmacyAlert(alert.alertId);
      await loadSafetyAlerts();
      toast.success('Alert closed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to close alert');
    } finally {
      setAlertActionLoading(false);
    }
  };

  const CalcModal = () => {
    const [calcResult, setCalcResult] = useState<{ score: string; interpretation: string; recommendation: string } | null>(null);
    const [inputs, setInputs] = useState<Record<string, string>>({});

    const runCalc = () => {
      let score = '', interpretation = '', recommendation = '';
      switch (calcOpen) {
        case 'BMI': {
          const w = parseFloat(inputs.weight) || 70; const h = (parseFloat(inputs.height) || 170) / 100;
          const bmi = w / (h * h);
          score = bmi.toFixed(1);
          interpretation = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
          recommendation = bmi >= 30 ? 'Consider metabolic screening.' : 'Routine follow-up.';
          break;
        }
        case 'CHA2DS2-VASc': {
          score = String(['chf', 'htn', 'age75', 'dm', 'stroke', 'vasc', 'age65', 'female'].reduce((s, k) => s + (inputs[k] === 'yes' ? 1 : 0), 0));
          interpretation = parseInt(score) >= 2 ? 'Anticoagulation recommended' : 'Low stroke risk';
          recommendation = 'Review bleeding risk (HAS-BLED).';
          break;
        }
        case 'Glasgow Coma Scale': {
          score = String((parseInt(inputs.eye) || 4) + (parseInt(inputs.verbal) || 5) + (parseInt(inputs.motor) || 6));
          interpretation = parseInt(score) <= 8 ? 'Severe — intubation consideration' : parseInt(score) <= 12 ? 'Moderate' : 'Mild';
          recommendation = 'Document and reassess q1h if ≤12.';
          break;
        }
        case 'NEWS2': {
          score = String(Object.values(inputs).reduce((s, v) => s + (parseInt(v) || 0), 0));
          interpretation = parseInt(score) >= 7 ? 'High risk — urgent review' : parseInt(score) >= 5 ? 'Medium risk' : 'Low risk';
          recommendation = parseInt(score) >= 5 ? 'Escalate to senior clinician.' : 'Continue routine obs.';
          break;
        }
        case 'PHQ-9': {
          score = String(Object.values(inputs).reduce((s, v) => s + (parseInt(v) || 0), 0));
          interpretation = parseInt(score) >= 15 ? 'Moderately severe' : parseInt(score) >= 10 ? 'Moderate' : parseInt(score) >= 5 ? 'Mild' : 'Minimal';
          recommendation = parseInt(score) >= 10 ? 'Consider treatment / referral.' : 'Monitor.';
          break;
        }
        default:
          score = inputs.score ?? '—';
          interpretation = 'See clinical context';
          recommendation = 'Document in clinical note.';
      }
      setCalcResult({ score, interpretation, recommendation });
      if (patient) {
        addHistory({ patient: patient.name, checkType: `Calculator: ${calcOpen}`, inputSummary: calcOpen ?? '', result: `${score} — ${interpretation}`, severity: 'Info' });
      }
    };

    const calcFields: Record<string, { label: string; fields: { key: string; label: string; type?: string }[] }> = {
      BMI: { label: 'BMI', fields: [{ key: 'weight', label: 'Weight (kg)' }, { key: 'height', label: 'Height (cm)' }] },
      'CHA2DS2-VASc': { label: 'CHA2DS2-VASc', fields: ['chf', 'htn', 'age75', 'dm', 'stroke', 'vasc', 'age65', 'female'].map(k => ({ key: k, label: k.toUpperCase(), type: 'select' })) },
      'Glasgow Coma Scale': { label: 'GCS', fields: [{ key: 'eye', label: 'Eye (1–4)' }, { key: 'verbal', label: 'Verbal (1–5)' }, { key: 'motor', label: 'Motor (1–6)' }] },
      NEWS2: { label: 'NEWS2', fields: [{ key: 'rr', label: 'Resp rate score' }, { key: 'spo2', label: 'SpO2 score' }, { key: 'temp', label: 'Temp score' }, { key: 'bp', label: 'BP score' }, { key: 'hr', label: 'HR score' }] },
      'PHQ-9': { label: 'PHQ-9', fields: Array.from({ length: 9 }, (_, i) => ({ key: `q${i + 1}`, label: `Item ${i + 1} (0–3)` })) },
      'GAD-7': { label: 'GAD-7', fields: Array.from({ length: 7 }, (_, i) => ({ key: `q${i + 1}`, label: `Item ${i + 1} (0–3)` })) },
      'CURB-65': { label: 'CURB-65', fields: [{ key: 'confusion', label: 'Confusion (0/1)' }, { key: 'urea', label: 'Urea >7 (0/1)' }, { key: 'rr', label: 'RR ≥30 (0/1)' }, { key: 'bp', label: 'BP low (0/1)' }, { key: 'age', label: 'Age ≥65 (0/1)' }] },
      'Wells Score': { label: 'Wells DVT', fields: [{ key: 'cancer', label: 'Cancer (0/1)' }, { key: 'paralysis', label: 'Paralysis (0/1)' }, { key: 'bedridden', label: 'Bedridden (0/1)' }, { key: 'tenderness', label: 'Calf tenderness (0/1)' }] },
      APGAR: { label: 'APGAR', fields: [{ key: 'appearance', label: 'Appearance (0–2)' }, { key: 'pulse', label: 'Pulse (0–2)' }, { key: 'grimace', label: 'Grimace (0–2)' }, { key: 'activity', label: 'Activity (0–2)' }, { key: 'resp', label: 'Respiration (0–2)' }] },
      'AUDIT-C': { label: 'AUDIT-C', fields: [{ key: 'freq', label: 'Frequency (0–4)' }, { key: 'drinks', label: 'Drinks per day (0–4)' }, { key: 'binge', label: 'Binge (0–4)' }] },
      CAGE: { label: 'CAGE', fields: [{ key: 'cut', label: 'Cut down (0/1)' }, { key: 'annoyed', label: 'Annoyed (0/1)' }, { key: 'guilty', label: 'Guilty (0/1)' }, { key: 'eye', label: 'Eye-opener (0/1)' }] },
      'MMSE/MoCA': { label: 'MMSE/MoCA', fields: [{ key: 'score', label: 'Total score (0–30)' }] },
    };

    const cfg = calcOpen ? calcFields[calcOpen] : null;

    return (
      <Dialog open={!!calcOpen} onOpenChange={o => !o && setCalcOpen(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{calcOpen} Calculator</DialogTitle></DialogHeader>
          {cfg && (
            <div className="grid gap-2">
              {cfg.fields.map(f => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {f.type === 'select' ? (
                    <Select value={inputs[f.key] ?? 'no'} onValueChange={v => setInputs(i => ({ ...i, [f.key]: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Input type="number" value={inputs[f.key] ?? ''} onChange={e => setInputs(i => ({ ...i, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <Button onClick={runCalc}>Calculate</Button>
              {calcResult && (
                <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                  <div><strong>Score:</strong> {calcResult.score}</div>
                  <div><strong>Interpretation:</strong> {calcResult.interpretation}</div>
                  <div><strong>Recommendation:</strong> {calcResult.recommendation}</div>
                  <PendingIntegrationBanner compact reason={PENDING_EMR} className="mt-2" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  const CALCULATORS = ['BMI', 'CHA2DS2-VASc', 'Glasgow Coma Scale', 'NEWS2', 'APGAR', 'CURB-65', 'Wells Score', 'PHQ-9', 'GAD-7', 'AUDIT-C', 'CAGE', 'MMSE/MoCA'];

  return (
    <Shell>
      {!cdsApiOn && (
        <div className="mb-4">
          <PendingIntegrationBanner reason={PENDING_CONFIG} />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Clinical Decision Support</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">Real-time safety checks, calculators, alerts, and clinical guideline support.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPatientSearchOpen(true)} disabled={!cdsApiOn || !patientsApiOn}>
            <User className="h-4 w-4 mr-1" />Select Patient
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTab('safety')}><ShieldCheck className="h-4 w-4 mr-1" />New Safety Check</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('calculators')}><Calculator className="h-4 w-4 mr-1" />Open Calculator</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('guidelines')}><BookOpen className="h-4 w-4 mr-1" />Guidelines</Button>
          <PendingIntegrationBanner compact reason={PENDING_EXPORT} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {([
          { id: 'checksToday' as KpiFilter, title: 'Safety Checks Today', value: kpis.checksToday, icon: ShieldCheck, tone: 'blue' as const },
          { id: 'interactions' as KpiFilter, title: 'Interaction Alerts', value: kpis.interactions, icon: AlertTriangle, tone: 'rose' as const },
          { id: 'allergy' as KpiFilter, title: 'Allergy Alerts', value: kpis.allergy, icon: Heart, tone: 'amber' as const },
          { id: 'contraindications' as KpiFilter, title: 'Contraindication Alerts', value: kpis.contraindications, icon: X, tone: 'rose' as const },
          { id: 'doseAdjust' as KpiFilter, title: 'Dose Adjustments', value: kpis.doseAdjust, icon: FlaskConical, tone: 'teal' as const },
          { id: 'guidelines' as KpiFilter, title: 'Guidelines Viewed', value: kpis.guidelines, icon: BookOpen, tone: 'purple' as const },
        ]).map(k => (
          <button key={k.id} type="button" onClick={() => { setKpiFilter(kpiFilter === k.id ? null : k.id); if (k.id === 'guidelines') setTab('guidelines'); else if (k.id !== 'checksToday') setTab('history'); else setTab('safety'); }}
            className={`text-left rounded-xl ${kpiFilter === k.id ? 'ring-2 ring-primary' : ''}`}>
            <SummaryCard title={k.title} value={String(k.value)} icon={k.icon} tone={k.tone} />
          </button>
        ))}
      </div>

      {/* Patient safety profile */}
      <Card className="mb-4">
        {patient ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-lg">{patient.name} <StatusPill tone="blue">{patient.clinic}</StatusPill></div>
              <div className="text-sm text-muted-foreground font-mono">{patient.hospitalId} · {patient.age}y · {patient.gender} · {patient.weight} kg</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 mt-2 text-sm">
                <div><span className="text-muted-foreground">Pregnancy:</span> {patient.pregnancy}</div>
                <div><span className="text-muted-foreground">Allergies:</span> {allergiesLoading ? 'Loading…' : patient.allergies.length ? patient.allergies.join(', ') : 'None documented'}</div>
                <div><span className="text-muted-foreground">Diagnosis:</span> {patient.diagnosis}</div>
                <div><span className="text-muted-foreground">eGFR:</span> {patient.egfr}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Meds:</span> {patient.medications}</div>
                <div className="col-span-2"><span className="text-muted-foreground">LFT:</span> {patient.lft}</div>
              </div>
              {allergiesError && <p className="text-xs text-destructive mt-2">{allergiesError}</p>}
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {cdsApiOn ? (
                <>
                  <PendingIntegrationBanner compact reason={PENDING_EMR} />
                  <Button size="sm" variant="outline" onClick={() => navigatePatient(`${base}/prescriptions`)}><Pill className="h-3 w-3 mr-1" />Prescriptions</Button>
                  <Button size="sm" variant="outline" onClick={() => navigatePatient(`${base}/results`)}><FlaskConical className="h-3 w-3 mr-1" />Results</Button>
                </>
              ) : (
                <PendingIntegrationBanner compact reason="Select a patient once the clinical pharmacy API is configured." />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {cdsApiOn ? 'No patient selected — search the registry to run CDS checks.' : 'Patient context unavailable until the API is configured.'}
            </p>
            {cdsApiOn && patientsApiOn && (
              <Button size="sm" onClick={() => setPatientSearchOpen(true)}><User className="h-4 w-4 mr-1" />Select Patient</Button>
            )}
          </div>
        )}
      </Card>

      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {([
            ['safety', 'Safety Checks'], ['interactions', 'Drug Interaction'], ['allergy', 'Allergy'], ['contraindications', 'Contraindications'],
            ['pregnancy', 'Pregnancy Safety'], ['renal', 'Renal Dose'], ['liver', 'Liver Dose'], ['calculators', 'Calculators'], ['guidelines', 'Guidelines'], ['history', 'History'],
          ] as [TabId, string][]).map(([id, label]) => (
            <TabsTrigger key={id} value={id}>{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="safety">
          {!cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          ) : alertsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading safety alerts…</div>
          ) : alertsError ? (
            <Card><p className="text-sm text-destructive">{alertsError}</p><Button size="sm" className="mt-2" onClick={() => void loadSafetyAlerts()}>Retry</Button></Card>
          ) : safetyAlerts.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground text-center py-6">No open safety alerts.</p></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {safetyAlerts.map((a) => (
                <Card key={a.id} className={a.status !== 'Open' ? 'opacity-60' : ''}>
                  <div className="flex justify-between items-start mb-2">
                    <StatusPill tone={severityTone(a.severity)}>{a.severity}</StatusPill>
                    <span className="text-xs text-muted-foreground">{a.category}</span>
                  </div>
                  <div className="font-medium text-sm mb-1">{a.title}</div>
                  <p className="text-xs text-muted-foreground mb-3">{a.recommendation}</p>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setTab(a.category.includes('DDI') || a.category.toLowerCase().includes('interaction') ? 'interactions' : a.category.toLowerCase().includes('allergy') ? 'allergy' : 'safety')}><Eye className="h-3 w-3" />Review</Button>
                    <PendingIntegrationBanner compact reason={PENDING_EMR} />
                    <Button size="sm" variant="outline" onClick={() => { setAckOpen(a); setAckComment(''); }} disabled={a.status !== 'Open' || alertActionLoading}>Acknowledge</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setOverrideOpen(a); setOverrideComment(''); }} disabled={a.status !== 'Open' || alertActionLoading}>Override</Button>
                    <Button size="sm" variant="ghost" onClick={() => void closeAlert(a)} disabled={a.status !== 'Open' || alertActionLoading}>Close</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interactions">
          {!cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          ) : (
            <Card>
              {catalogLoading ? (
                <div className="flex items-center text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading drug catalog…</div>
              ) : catalogError ? (
                <p className="text-sm text-destructive">{catalogError}</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Drugs to check (catalog)</Label>
                      {selectedDrugIds.length === 0 ? (
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => setSelectedDrugIds([0])}><Plus className="h-3 w-3 mr-1" />Add Drug</Button>
                      ) : (
                        selectedDrugIds.map((drugId, i) => (
                          <div key={i} className="flex gap-2 mt-1">
                            <Select
                              value={drugId ? String(drugId) : ''}
                              onValueChange={(v) => setSelectedDrugIds((ids) => ids.map((x, j) => (j === i ? Number(v) : x)))}
                            >
                              <SelectTrigger><SelectValue placeholder="Select drug…" /></SelectTrigger>
                              <SelectContent>
                                {drugCatalog.map((d) => (
                                  <SelectItem key={d.drugId} value={String(d.drugId)}>{d.name}{d.strength ? ` ${d.strength}` : ''}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {i > 0 && (
                              <Button size="icon" variant="ghost" onClick={() => setSelectedDrugIds((ids) => ids.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                            )}
                          </div>
                        ))
                      )}
                      {selectedDrugIds.length > 0 && (
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => setSelectedDrugIds((d) => [...d, 0])}><Plus className="h-3 w-3 mr-1" />Add Drug</Button>
                      )}
                    </div>
                    <div>
                      <Label>Patient active medications</Label>
                      <div className="text-sm mt-1 p-2 rounded bg-muted">{patient?.medications ?? 'Select a patient first'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <Button onClick={() => void checkInteractions()} disabled={interactionLoading || !patient}>
                      {interactionLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Checking…</> : 'Check Interactions'}
                    </Button>
                    <Button variant="outline" onClick={() => { setSelectedDrugIds([]); setInteractionResults([]); }}>Clear</Button>
                  </div>
                  {interactionResults.map((r, i) => (
                    <div key={i} className="border rounded-lg p-3 mb-2 text-sm">
                      <div className="flex justify-between"><span className="font-medium">{r.drug}</span><StatusPill tone={severityTone(r.severity)}>{r.severity}</StatusPill></div>
                      <p className="text-muted-foreground mt-1">{r.description}</p>
                      <p className="mt-1"><strong>Recommendation:</strong> {r.recommendation}</p>
                      <PendingIntegrationBanner compact reason={PENDING_EMR} className="mt-2" />
                    </div>
                  ))}
                </>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="allergy">
          {!cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          ) : (
            <Card className="max-w-lg">
              <div className="grid gap-3">
                <div>
                  <Label>Patient allergies</Label>
                  {allergiesLoading ? (
                    <div className="text-sm p-2 bg-muted rounded flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</div>
                  ) : (
                    <div className="text-sm p-2 bg-muted rounded">
                      {patientAllergies.length
                        ? patientAllergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ''}`).join(', ')
                        : patient ? 'None documented' : 'Select a patient first'}
                    </div>
                  )}
                  {allergiesError && <p className="text-xs text-destructive mt-1">{allergiesError}</p>}
                </div>
                <div>
                  <Label>Drug to check (catalog)</Label>
                  <Select value={allergyDrugId ? String(allergyDrugId) : ''} onValueChange={(v) => setAllergyDrugId(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Select drug…" /></SelectTrigger>
                    <SelectContent>
                      {drugCatalog.map((d) => (
                        <SelectItem key={d.drugId} value={String(d.drugId)}>{d.name}{d.strength ? ` ${d.strength}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => void checkAllergy()} disabled={allergyCheckLoading || !patient}>
                  {allergyCheckLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Checking…</> : 'Check Allergy'}
                </Button>
                {allergyResult && (
                  <div className={`p-3 rounded-lg border ${allergyResult.match ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <StatusPill tone={severityTone(allergyResult.severity)}>{allergyResult.severity}</StatusPill>
                    <p className="mt-1 text-sm">{allergyResult.reaction}</p>
                    <PendingIntegrationBanner compact reason={PENDING_EMR} className="mt-2" />
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contraindications">
          {cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONTRA} />
          ) : (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          )}
        </TabsContent>

        <TabsContent value="pregnancy">
          {cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_PREG} />
          ) : (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          )}
        </TabsContent>

        <TabsContent value="renal">
          {cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_RENAL_TAB} />
          ) : (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          )}
        </TabsContent>

        <TabsContent value="liver">
          {cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_LIVER_TAB} />
          ) : (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          )}
        </TabsContent>

        <TabsContent value="calculators">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {CALCULATORS.map(c => (
              <Card key={c} className="!p-3 cursor-pointer hover:border-primary/50" onClick={() => setCalcOpen(c)}>
                <Calculator className="h-5 w-5 mb-1 text-primary" />
                <div className="font-medium text-sm">{c}</div>
                <Button size="sm" variant="link" className="px-0 h-auto mt-1" onClick={e => { e.stopPropagation(); setCalcOpen(c); }}>Open</Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guidelines">
          {cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_GUIDELINES} />
          ) : (
            <>
              <PendingIntegrationBanner reason={PENDING_CONFIG} className="mb-4" />
              <div className="mb-3 relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search guidelines…" value={guidelineQuery} onChange={(e) => setGuidelineQuery(e.target.value)} disabled />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          {!cdsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONFIG} />
          ) : historyLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading alert history…</div>
          ) : historyError ? (
            <Card><p className="text-sm text-destructive">{historyError}</p><Button size="sm" className="mt-2" onClick={() => void loadClosedHistory()}>Retry</Button></Card>
          ) : filteredHistory.length === 0 ? (
            <PendingIntegrationBanner reason={PENDING_HISTORY} />
          ) : (
            <>
              <Card className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead><tr>{['Date/time', 'Patient', 'Check Type', 'Input', 'Result', 'Severity', 'Doctor', 'Action'].map((h) => <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b">{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/40">
                        <td className="px-3 py-2 border-b text-xs">{h.date}</td>
                        <td className="px-3 py-2 border-b">{h.patient}</td>
                        <td className="px-3 py-2 border-b">{h.checkType}</td>
                        <td className="px-3 py-2 border-b text-xs max-w-[120px] truncate">{h.inputSummary}</td>
                        <td className="px-3 py-2 border-b text-xs max-w-[160px] truncate">{h.result}</td>
                        <td className="px-3 py-2 border-b"><StatusPill tone={severityTone(h.severity)}>{h.severity}</StatusPill></td>
                        <td className="px-3 py-2 border-b text-xs">{h.doctor}</td>
                        <td className="px-3 py-2 border-b">
                          <PendingIntegrationBanner compact reason={PENDING_EMR} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="md:hidden space-y-2">
                {filteredHistory.map((h) => (
                  <Card key={h.id} className="!p-3">
                    <div className="flex justify-between"><span className="font-medium text-sm">{h.checkType}</span><StatusPill tone={severityTone(h.severity)}>{h.severity}</StatusPill></div>
                    <div className="text-xs text-muted-foreground">{h.date} · {h.patient}</div>
                    <p className="text-sm mt-1">{h.result}</p>
                    <PendingIntegrationBanner compact reason={PENDING_EMR} className="mt-2" />
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur p-2 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => setTab('safety')}><ShieldCheck className="h-4 w-4 mr-1" />Safety</Button>
        <Button size="sm" variant="outline" onClick={() => setCalcOpen('PHQ-9')}><Calculator className="h-4 w-4" /></Button>
        <PendingIntegrationBanner compact reason={PENDING_EMR} />
      </div>

      <CalcModal />

      {/* Patient search */}
      <Sheet open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
        <SheetContent><SheetHeader><SheetTitle>Select Patient</SheetTitle><SheetDescription>Search and select patient for CDS context.</SheetDescription></SheetHeader>
          {!cdsApiOn || !patientsApiOn ? (
            <PendingIntegrationBanner reason={PENDING_CONFIG} className="mt-4" />
          ) : (
            <>
              <Input className="mt-4" placeholder="Search name or hospital no…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
              {searchingPatients && (
                <div className="mt-3 text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Searching…</div>
              )}
              {patientSearchError && <p className="mt-2 text-sm text-destructive">{patientSearchError}</p>}
              <div className="mt-3 space-y-1">
                {apiPatients.map((p) => (
                  <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 text-sm">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.clinic}</div>
                  </button>
                ))}
                {!searchingPatients && patientQuery.trim().length >= 2 && apiPatients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No patients found.</p>
                )}
                {patientQuery.trim().length < 2 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Acknowledge */}
      <Dialog open={!!ackOpen} onOpenChange={o => !o && setAckOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acknowledge Alert</DialogTitle><DialogDescription>{ackOpen?.title}</DialogDescription></DialogHeader>
          <Textarea placeholder="Doctor comment (required for moderate/severe)…" value={ackComment} onChange={e => setAckComment(e.target.value)} />
          <DialogFooter><Button onClick={() => void acknowledgeAlert()} disabled={alertActionLoading}>{alertActionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Acknowledge</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override */}
      <Dialog open={!!overrideOpen} onOpenChange={o => !o && setOverrideOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Override with Justification</DialogTitle><DialogDescription>{overrideOpen?.title}</DialogDescription></DialogHeader>
          <Textarea placeholder="Clinical justification required…" value={overrideComment} onChange={e => setOverrideComment(e.target.value)} />
          <DialogFooter><Button variant="destructive" onClick={() => void overrideAlert()} disabled={alertActionLoading}>{alertActionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Record Override</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
