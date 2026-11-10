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
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { isPatientsApiEnabled, searchPersons, type PersonRecord } from '@/lib/api/patients';
import {
  createPatientDiagnosis,
  getDiagnosisStats,
  isDiagnosesApiEnabled,
  listDiagnosisCatalog,
  listPatientDiagnoses,
  updatePatientDiagnosis,
  type ApiDiagnosisCatalogEntry,
  type ApiPatientDiagnosis,
  type DiagnosisStats,
} from '@/lib/api/diagnoses';
import {
  BookOpen, Search, Plus, Printer, Download, Eye, Clock, CheckCircle2,
  AlertTriangle, FileText, History, XCircle, RefreshCw, Stethoscope,
  FlaskConical, ScanLine, Pill, Star, Sparkles, Activity, UserPlus, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const DX_AUDIT_KEY = 'gfa_doc_diagnosis_audit_v1';
const DX_FAVORITES_KEY = 'gfa_doc_diagnosis_favorites_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Diagnosis Engine">{children}</DashboardLayout>
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
    case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

type DxSystem = 'ICD-11' | 'DSM-5' | 'Local';
type DxType = 'Primary' | 'Secondary' | 'Differential' | 'Provisional' | 'Confirmed' | 'Ruled out';
type DxStatus = 'Active' | 'Chronic' | 'Resolved' | 'In remission';
type Certainty = 'Suspected' | 'Probable' | 'Confirmed';
type Severity = 'Mild' | 'Moderate' | 'Severe';
type TabId = 'add' | 'active' | 'differential' | 'chronic' | 'psychiatric' | 'history' | 'resolved' | 'coding';
type KpiFilter = 'active' | 'new' | 'chronic' | 'psychiatric' | 'provisional' | 'differential' | 'resolved';

interface DxPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: 'OPC' | 'GMPC'; encounter: string;
  diagnosis: string; allergies: string; medications: string; vitals: string;
  previousDx: string; recentLab: string; recentImaging: string;
}

interface CatalogEntry {
  id: string; code: string; dsmCode?: string; system: DxSystem; name: string;
  category: string; description: string; symptoms: string; keywords: string;
  isPsychiatric?: boolean;
}

interface PatientDiagnosis {
  id: string; patientId: string; patientName: string; hospitalId: string;
  code: string; dsmCode?: string; system: DxSystem; name: string;
  type: DxType; severity: Severity; status: DxStatus; certainty: Certainty;
  dateAdded: string; addedBy: string; encounter: string; clinic: string;
  notes: string; onsetDate: string; onProblemList: boolean;
  reasonConsidered?: string; supportingFindings?: string; againstFindings?: string;
  controlStatus?: string; lastReview?: string; nextReview?: string;
  riskLevel?: string; closedReason?: string; closedBy?: string; closedDate?: string;
  isPsychiatric?: boolean; isNewThisWeek?: boolean;
  linkedSymptoms?: string; linkedLab?: string; linkedImaging?: string; linkedRx?: string;
}

interface DxForm {
  encounter: string; clinic: string; system: DxSystem; search: string;
  code: string; description: string; type: DxType; onsetDate: string;
  severity: Severity; status: DxStatus; certainty: Certainty; notes: string;
  linkedSymptoms: string; linkedLab: string; linkedImaging: string; linkedRx: string;
  onProblemList: boolean;
}

const emptyForm = (): DxForm => ({
  encounter: 'ENC-2026-0706-001', clinic: 'OPC', system: 'ICD-11', search: '',
  code: '', description: '', type: 'Primary', onsetDate: new Date().toISOString().slice(0, 10),
  severity: 'Moderate', status: 'Active', certainty: 'Probable', notes: '',
  linkedSymptoms: '', linkedLab: '', linkedImaging: '', linkedRx: '',
  onProblemList: true,
});

const PENDING_EXPORT = 'Diagnosis export requires reporting service integration.';
const PENDING_CHRONIC_NOTE = 'Chronic progress notes require clinical documentation integration.';
const PENDING_FOLLOWUP = 'Follow-up scheduling requires appointments module integration.';
const PENDING_SEVERITY = 'Psychiatric severity updates require structured assessment integration.';
const PENDING_SCALES = 'PHQ-9 / GAD-7 scales require psychiatric assessment module integration.';
const PENDING_VITALS = 'Live vitals feed is not connected to this workspace.';
const PENDING_LAB = 'Recent laboratory results are not connected to this workspace.';
const PENDING_IMAGING = 'Recent imaging results are not connected to this workspace.';

function tabToApiTab(t: TabId, kpi?: KpiFilter | null): string | undefined {
  switch (t) {
    case 'active': return kpi === 'provisional' ? 'provisional' : kpi === 'new' ? 'new' : 'active';
    case 'differential': return 'differential';
    case 'chronic': return 'chronic';
    case 'psychiatric': return 'psychiatric';
    case 'resolved': return 'resolved';
    default: return kpi && kpi !== 'active' ? kpi : undefined;
  }
}

function logAudit(action: string, detail?: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(DX_AUDIT_KEY) || '[]');
    arr.unshift({ action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(DX_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(DX_FAVORITES_KEY) || '[]'); } catch { return []; }
}

function saveFavorites(favs: string[]) {
  try { localStorage.setItem(DX_FAVORITES_KEY, JSON.stringify(favs)); } catch { /* noop */ }
}

function mapApiCatalog(c: ApiDiagnosisCatalogEntry): CatalogEntry {
  return {
    id: c.id,
    code: c.code,
    dsmCode: c.dsmCode ?? undefined,
    system: (c.system as DxSystem) || 'ICD-11',
    name: c.name,
    category: c.category || '',
    description: c.description || '',
    symptoms: c.symptoms || '',
    keywords: c.keywords || '',
    isPsychiatric: c.isPsychiatric,
  };
}

function mapApiDx(r: ApiPatientDiagnosis): PatientDiagnosis {
  return {
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    hospitalId: r.hospitalId || '',
    code: r.code,
    dsmCode: r.dsmCode ?? undefined,
    system: (r.system as DxSystem) || 'ICD-11',
    name: r.name,
    type: r.type as DxType,
    severity: (r.severity as Severity) || 'Moderate',
    status: r.status as DxStatus,
    certainty: (r.certainty as Certainty) || 'Probable',
    dateAdded: r.dateAdded || '',
    addedBy: r.addedBy || '',
    encounter: r.encounter || '',
    clinic: r.clinic || '',
    notes: r.notes || '',
    onsetDate: r.onsetDate || '',
    onProblemList: r.onProblemList,
    reasonConsidered: r.reasonConsidered ?? undefined,
    supportingFindings: r.supportingFindings ?? undefined,
    againstFindings: r.againstFindings ?? undefined,
    controlStatus: r.controlStatus ?? undefined,
    lastReview: r.lastReview ?? undefined,
    nextReview: r.nextReview ?? undefined,
    riskLevel: r.riskLevel ?? undefined,
    closedReason: r.closedReason ?? undefined,
    closedBy: r.closedBy ?? undefined,
    closedDate: r.closedDate ?? undefined,
    isPsychiatric: r.isPsychiatric,
    isNewThisWeek: r.isNewThisWeek,
    linkedSymptoms: r.linkedSymptoms ?? undefined,
    linkedLab: r.linkedLab ?? undefined,
    linkedImaging: r.linkedImaging ?? undefined,
    linkedRx: r.linkedRx ?? undefined,
  };
}

function personToDxPatient(p: PersonRecord): DxPatient {
  const age = p.dateOfBirth
    ? Math.max(0, Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)))
    : 0;
  return {
    id: String(p.personId),
    name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unknown',
    hospitalId: p.hospitalNo || `PID-${p.personId}`,
    phone: p.patientPhoneNo || '',
    nin: p.identityNo || '',
    nhiaNo: p.nhisNo || '',
    age,
    gender: p.sex || '—',
    clinic: 'OPC',
    encounter: '',
    diagnosis: '—',
    allergies: '—',
    medications: '—',
    vitals: '—',
    previousDx: '—',
    recentLab: '—',
    recentImaging: '—',
  };
}

const toCtx = (p: DxPatient): DocPatientContext => ({
  id: p.id, name: p.name, hospitalId: p.hospitalId, phone: p.phone, nin: p.nin, nhiaNo: p.nhiaNo,
  age: p.age, gender: p.gender, clinic: p.clinic, diagnosis: p.diagnosis,
  allergies: p.allergies, medications: p.medications,
});

export const DocDiagnosis = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Dr. User';
  const dxApiOn = isDiagnosesApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();

  const [tab, setTab] = useState<TabId>('add');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<DxPatient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<DxPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [records, setRecords] = useState<PatientDiagnosis[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [stats, setStats] = useState<DiagnosisStats | null>(null);
  const [loadingDx, setLoadingDx] = useState(false);
  const [dxError, setDxError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DxForm>(emptyForm);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [symptomInput, setSymptomInput] = useState({ symptoms: '', duration: '', severity: '', associated: '', riskFactors: '' });
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);
  const [detailEntry, setDetailEntry] = useState<CatalogEntry | null>(null);
  const [viewDx, setViewDx] = useState<PatientDiagnosis | null>(null);
  const [closeModal, setCloseModal] = useState<{ dx: PatientDiagnosis; mode: 'resolved' | 'ruledout' } | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [closeComment, setCloseComment] = useState('');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const ctxToDxPatient = (ctx: DocPatientContext): DxPatient => ({
    id: ctx.id,
    name: ctx.name,
    hospitalId: ctx.hospitalId,
    phone: ctx.phone ?? '',
    nin: ctx.nin ?? '',
    nhiaNo: ctx.nhiaNo ?? '',
    age: ctx.age ?? 0,
    gender: ctx.gender ?? 'M',
    clinic: (ctx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
    encounter: ctx.encounterId ?? '',
    diagnosis: ctx.diagnosis ?? '—',
    allergies: ctx.allergies ?? 'None',
    medications: ctx.medications ?? '—',
    vitals: '—',
    previousDx: '—',
    recentLab: '—',
    recentImaging: '—',
  });

  const refreshPatientDx = useCallback(async (personId: number, apiTab?: string) => {
    if (!dxApiOn) return;
    setLoadingDx(true);
    setDxError(null);
    try {
      const [list, st] = await Promise.all([
        listPatientDiagnoses({ personId, limit: 100, tab: apiTab }),
        getDiagnosisStats(personId),
      ]);
      setRecords(list.items.map(mapApiDx));
      setStats(st);
    } catch (err) {
      setDxError(err instanceof ApiError ? err.message : 'Could not load diagnoses');
      setRecords([]);
    } finally {
      setLoadingDx(false);
    }
  }, [dxApiOn]);

  useEffect(() => {
    if (!dxApiOn) {
      setDxError('Backend API is not configured (VITE_API_BASE_URL).');
      return;
    }
    setCatalogLoading(true);
    listDiagnosisCatalog()
      .then((items) => setCatalog(items.map(mapApiCatalog)))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, [dxApiOn]);

  useEffect(() => {
    if (!selectedPatient || !dxApiOn) return;
    const pid = Number(selectedPatient.id);
    if (!Number.isFinite(pid)) return;
    void refreshPatientDx(pid, tabToApiTab(tab, kpiFilter));
  }, [selectedPatient?.id, tab, kpiFilter, dxApiOn, refreshPatientDx]);

  useEffect(() => {
    if (!embedded || !patientContext?.name) return;
    const p = ctxToDxPatient(patientContext);
    setSelectedPatient(p);
    setForm(f => ({ ...f, clinic: p.clinic, encounter: p.encounter }));
    setTab('add');
    setDocPatientContext(toCtx(p));
  }, [embedded, patientContext?.id, patientContext?.hospitalId, patientContext?.name]);

  useEffect(() => {
    if (!patientsApiOn) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    setPatientSearchLoading(true);
    const t = window.setTimeout(() => {
      searchPersons(q)
        .then((rows) => {
          if (!cancelled) setPatientResults(rows.map(personToDxPatient));
        })
        .catch(() => {
          if (!cancelled) setPatientResults([]);
        })
        .finally(() => {
          if (!cancelled) setPatientSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientSearch, patientsApiOn]);

  const handleSelectPatient = useCallback((p: DxPatient) => {
    setSelectedPatient(p);
    setForm(f => ({ ...f, clinic: p.clinic, encounter: p.encounter }));
    setDocPatientContext(toCtx(p));
    logAudit('Patient selected for diagnosis', p.name);
  }, []);

  const handleChangePatient = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setRecords([]);
    setStats(null);
    setTab('add');
  };

  const navigatePatient = useCallback((p: DxPatient, path: string, extra?: Partial<DocPatientContext>) => {
    setDocPatientContext({ ...toCtx(p), ...extra });
    logAudit(`Navigate to ${path}`, p.name);
    navigate(path);
  }, [navigate]);

  const filteredPatients = patientResults;

  const kpis = useMemo(() => ({
    active: stats?.active ?? records.filter(r => r.status === 'Active' || r.status === 'Chronic' || r.status === 'In remission').length,
    new: stats?.newThisWeek ?? records.filter(r => r.isNewThisWeek).length,
    chronic: stats?.chronic ?? records.filter(r => r.status === 'Chronic').length,
    psychiatric: stats?.psychiatric ?? records.filter(r => r.isPsychiatric && r.status !== 'Resolved' && r.type !== 'Ruled out').length,
    provisional: stats?.provisional ?? records.filter(r => r.type === 'Provisional').length,
    differential: stats?.differential ?? records.filter(r => r.type === 'Differential').length,
    resolved: stats?.resolved ?? records.filter(r => r.status === 'Resolved' || r.type === 'Ruled out').length,
  }), [records, stats]);

  const applyKpiFilter = (recordsIn: PatientDiagnosis[]) => {
    if (!kpiFilter) return recordsIn;
    switch (kpiFilter) {
      case 'active': return recordsIn.filter(r => r.status === 'Active' || r.status === 'In remission');
      case 'new': return recordsIn.filter(r => r.isNewThisWeek);
      case 'chronic': return recordsIn.filter(r => r.status === 'Chronic');
      case 'psychiatric': return recordsIn.filter(r => r.isPsychiatric);
      case 'provisional': return recordsIn.filter(r => r.type === 'Provisional');
      case 'differential': return recordsIn.filter(r => r.type === 'Differential');
      case 'resolved': return recordsIn.filter(r => r.status === 'Resolved' || r.type === 'Ruled out');
      default: return recordsIn;
    }
  };

  const patientRecords = useMemo(() => applyKpiFilter(records), [records, kpiFilter]);

  const catalogResults = useMemo(() => {
    if (!catalogSearch.trim()) return catalog.slice(0, 8);
    const q = catalogSearch.toLowerCase();
    return catalog.filter(c =>
      `${c.code} ${c.dsmCode ?? ''} ${c.name} ${c.keywords} ${c.symptoms} ${c.category}`.toLowerCase().includes(q));
  }, [catalogSearch, catalog]);

  const gmpcCatalogEntries = useMemo(
    () => catalog.filter(c => !c.isPsychiatric).slice(0, 12),
    [catalog],
  );

  const opcCatalogEntries = useMemo(
    () => catalog.filter(c => c.isPsychiatric).slice(0, 12),
    [catalog],
  );

  const SummaryField = ({ label, value, pendingReason }: { label: string; value: string; pendingReason?: string }) => (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {label}: {value}
      {value === '—' && pendingReason ? <PendingIntegrationBanner compact reason={pendingReason} /> : null}
    </span>
  );

  const addDiagnosis = async (entry: CatalogEntry | null, typeOverride?: DxType, asDraft = false) => {
    if (!selectedPatient) {
      toast.error('Select a patient before adding a diagnosis');
      return;
    }
    if (!dxApiOn) {
      toast.error('Backend API is not configured');
      return;
    }
    const desc = entry?.name ?? form.description;
    const code = entry?.code ?? form.code;
    if (!desc && !code) {
      toast.error('Enter diagnosis description or select from search');
      return;
    }
    const personId = Number(selectedPatient.id);
    if (!Number.isFinite(personId)) {
      toast.error('Invalid patient id');
      return;
    }
    const dxType = typeOverride ?? form.type;
    const certainty = dxType === 'Provisional' ? 'Suspected' as Certainty : form.certainty;
    setSaving(true);
    try {
      await createPatientDiagnosis({
        personId,
        diagnosisCodeId: entry ? Number(entry.id) : undefined,
        code: code || undefined,
        name: desc,
        system: entry?.system ?? form.system,
        type: dxType,
        severity: form.severity,
        status: form.status,
        certainty,
        onsetDate: form.onsetDate || undefined,
        notes: form.notes || undefined,
        clinic: form.clinic,
        onProblemList: form.onProblemList,
        linkedSymptoms: form.linkedSymptoms || undefined,
        linkedLab: form.linkedLab || undefined,
        linkedImaging: form.linkedImaging || undefined,
        linkedRx: form.linkedRx || undefined,
      });
      logAudit(asDraft ? 'Diagnosis draft saved' : 'Diagnosis added', `${desc} (${dxType}) — ${selectedPatient.name}`);
      if (asDraft) toast.success('Draft saved');
      else notifySuccess(`Diagnosis added: ${desc}`, 'Diagnosis Added');
      setSelectedPatient(prev => prev ? { ...prev, diagnosis: desc } : prev);
      await refreshPatientDx(personId, tabToApiTab(tab, kpiFilter));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save diagnosis');
    } finally {
      setSaving(false);
    }
  };

  const populateForm = (entry: CatalogEntry) => {
    setForm(f => ({
      ...f, code: entry.code, description: entry.name, system: entry.system,
      linkedSymptoms: entry.symptoms,
    }));
  };

  const suggestDiagnoses = () => {
    const q = `${symptomInput.symptoms} ${symptomInput.associated} ${symptomInput.riskFactors}`.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const matched = catalog.filter(c => words.some(w => c.keywords.includes(w) || c.symptoms.toLowerCase().includes(w) || c.name.toLowerCase().includes(w)));
    setSuggestions(matched.length ? matched.slice(0, 6) : catalog.filter(c => c.isPsychiatric).slice(0, 4));
    toast.info('Suggestions are decision support only');
  };

  const markResolved = async () => {
    if (!closeModal || !closeReason.trim()) { toast.error('Reason required'); return; }
    const { dx, mode } = closeModal;
    setSaving(true);
    try {
      await updatePatientDiagnosis(Number(dx.id), {
        status: mode === 'resolved' ? 'Resolved' : dx.status,
        type: mode === 'ruledout' ? 'Ruled out' : dx.type,
        closedReason: closeReason,
        notes: dx.notes + (closeComment ? `\n[Closed] ${closeComment}` : ''),
      });
      logAudit(mode === 'resolved' ? 'Diagnosis resolved' : 'Diagnosis ruled out', dx.name);
      toast.success(mode === 'resolved' ? 'Marked resolved' : 'Ruled out');
      setCloseModal(null);
      setCloseReason('');
      setCloseComment('');
      if (selectedPatient) await refreshPatientDx(Number(selectedPatient.id), tabToApiTab(tab, kpiFilter));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markChronic = async (dx: PatientDiagnosis) => {
    setSaving(true);
    try {
      await updatePatientDiagnosis(Number(dx.id), { status: 'Chronic', controlStatus: dx.controlStatus ?? 'Unknown' });
      logAudit('Marked chronic', dx.name);
      toast.success('Marked as chronic condition');
      if (selectedPatient) await refreshPatientDx(Number(selectedPatient.id), tabToApiTab(tab, kpiFilter));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const navForDx = (dx: PatientDiagnosis, path: string) => {
    if (selectedPatient && selectedPatient.id === dx.patientId) navigatePatient(selectedPatient, path);
    else navigatePatient({
      id: dx.patientId, name: dx.patientName, hospitalId: dx.hospitalId, phone: '', nin: '', nhiaNo: '',
      age: 0, gender: '—', clinic: (dx.clinic === 'GMPC' ? 'GMPC' : 'OPC') as 'OPC' | 'GMPC',
      encounter: dx.encounter, diagnosis: dx.name, allergies: '—', medications: '—', vitals: '—',
      previousDx: '—', recentLab: '—', recentImaging: '—',
    }, path);
  };

  const promoteDx = async (dx: PatientDiagnosis, to: DxType) => {
    setSaving(true);
    try {
      await updatePatientDiagnosis(Number(dx.id), { type: to, certainty: 'Confirmed' });
      logAudit(`Promoted to ${to}`, dx.name);
      toast.success(`Promoted to ${to}`);
      if (selectedPatient) await refreshPatientDx(Number(selectedPatient.id), tabToApiTab(tab, kpiFilter));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = (code: string) => {
    const next = favorites.includes(code) ? favorites.filter(f => f !== code) : [...favorites, code];
    setFavorites(next);
    saveFavorites(next);
    toast.success(favorites.includes(code) ? 'Removed from favorites' : 'Added to favorites');
  };

  const TableWrap = ({ children }: { children: React.ReactNode }) => (
    <Card className="overflow-x-auto p-0">
      <div className="hidden md:block">{children}</div>
      <div className="md:hidden p-3 space-y-3">{/* mobile cards rendered per tab */}</div>
    </Card>
  );

  const MobileDxCard = ({ dx, actions }: { dx: PatientDiagnosis; actions: React.ReactNode }) => (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="font-medium">{dx.name}</div>
      <div className="text-xs text-muted-foreground font-mono">{dx.code} · {dx.system}</div>
      <div className="flex flex-wrap gap-1">
        <StatusPill tone="blue">{dx.type}</StatusPill>
        <StatusPill tone={dx.status === 'Chronic' ? 'purple' : 'green'}>{dx.status}</StatusPill>
      </div>
      {actions}
    </div>
  );

  const SelectPatientView = () => (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-display font-bold">Diagnosis Engine ICD-11 + DSM</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Select a patient to search, assign, and manage diagnoses.
        </p>
      </div>
      <Card>
        <h3 className="font-semibold mb-1 flex items-center gap-2"><UserPlus className="h-4 w-4" />Select Patient</h3>
        <p className="text-xs text-muted-foreground mb-4">Search by name, hospital number, phone, NHIA, or NIN</p>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patient…"
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        {patientSearchLoading ? (
          <p className="text-center text-muted-foreground py-10 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching patients…
          </p>
        ) : !patientsApiOn || !dxApiOn ? (
          <p className="text-center text-rose-600 py-10 text-sm">Backend API is not configured. Set VITE_API_BASE_URL.</p>
        ) : patientSearch.trim().length < 2 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Type at least 2 characters to search live patients.</p>
        ) : filteredPatients.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">No patient found. Try another search term.</p>
        ) : (
          <div className="space-y-2 max-h-[min(60vh,480px)] overflow-y-auto">
            {filteredPatients.map(p => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/40 transition-colors"
                onClick={() => handleSelectPatient(p)}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.hospitalId} · {p.age}y {p.gender} · {p.clinic}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.diagnosis}</div>
                  </div>
                  <StatusPill tone={p.clinic === 'OPC' ? 'purple' : 'blue'}>{p.clinic}</StatusPill>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  if (!selectedPatient && embedded && patientContext) {
    return (
      <ClinicalPageShell
        embedded={embedded}
        shellTitle="Doctor Clinical · Diagnosis Engine"
        flowTitle="Diagnosis Engine"
        flowSubtitle="Loading patient workspace…"
        patientContext={patientContext}
        onClose={onClose}
        onOpenFull={onOpenFull}
      >
        <p className="text-sm text-muted-foreground py-8 text-center">Preparing diagnosis workspace…</p>
      </ClinicalPageShell>
    );
  }

  if (!selectedPatient && !embedded) {
    return (
      <ClinicalPageShell
        embedded={embedded}
        shellTitle="Doctor Clinical · Diagnosis Engine"
        flowTitle="Diagnosis Engine"
        flowSubtitle="ICD-11 / DSM coding and problem list"
        patientContext={patientContext}
        onClose={onClose}
        onOpenFull={onOpenFull}
      >
        <SelectPatientView />
      </ClinicalPageShell>
    );
  }

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Diagnosis Engine"
      flowTitle="Diagnosis Engine"
      flowSubtitle="Search, assign, review and track patient diagnoses"
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Diagnosis Engine ICD-11 + DSM</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Search, assign, review, and track patient diagnoses using ICD-11 and DSM support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleChangePatient}><UserPlus className="h-4 w-4 mr-1" />Change Patient</Button>
          <Button size="sm" onClick={() => setTab('add')}><Plus className="h-4 w-4 mr-1" />Add Diagnosis</Button>
          <Button variant="outline" size="sm" onClick={() => setTab('history')}><History className="h-4 w-4 mr-1" />Diagnosis History</Button>
          <Button variant="outline" size="sm" onClick={() => { window.print(); logAudit('Diagnosis summary printed'); }}><Printer className="h-4 w-4 mr-1" />Print Summary</Button>
          <div className="inline-flex items-center gap-2">
            <Button variant="outline" size="sm" disabled title={PENDING_EXPORT}><Download className="h-4 w-4 mr-1" />Export</Button>
            <PendingIntegrationBanner compact reason={PENDING_EXPORT} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ['active', 'Active Diagnoses', kpis.active, 'Current active records', Activity, 'blue'],
          ['new', 'New Diagnoses', kpis.new, 'This week', Plus, 'green'],
          ['chronic', 'Chronic Conditions', kpis.chronic, 'Long-term monitoring', Clock, 'purple'],
          ['psychiatric', 'Psychiatric Diagnoses', kpis.psychiatric, 'OPC / DSM records', BookOpen, 'indigo'],
          ['provisional', 'Provisional Diagnoses', kpis.provisional, 'Pending confirmation', AlertTriangle, 'amber'],
          ['differential', 'Differential Diagnoses', kpis.differential, 'Under consideration', Sparkles, 'teal'],
          ['resolved', 'Resolved Diagnoses', kpis.resolved, 'Closed or inactive', CheckCircle2, 'rose'],
        ] as const).map(([id, title, val, sub, Icon, t]) => (
          <button key={id} type="button" onClick={() => {
            setKpiFilter(kpiFilter === id ? null : id as KpiFilter);
            if (id === 'differential') setTab('differential');
            else if (id === 'chronic') setTab('chronic');
            else if (id === 'psychiatric') setTab('psychiatric');
            else if (id === 'resolved') setTab('resolved');
            else if (id === 'provisional') setTab('active');
            else setTab('active');
          }} className={`text-left rounded-xl ${kpiFilter === id ? 'ring-2 ring-primary' : ''}`}>
            <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t as 'blue' | 'green' | 'purple' | 'indigo' | 'amber' | 'teal' | 'rose'} />
          </button>
        ))}
      </div>

      {/* Patient summary */}
      <Card className="mb-4">
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-semibold text-lg">{selectedPatient.name}</div>
              <div className="text-sm text-muted-foreground font-mono">{selectedPatient.hospitalId} · {selectedPatient.age}y {selectedPatient.gender} · {selectedPatient.clinic}</div>
              <div className="text-xs mt-1">Encounter: {selectedPatient.encounter} · Allergies: <span className="text-rose-700">{selectedPatient.allergies}</span></div>
              <div className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Meds: {selectedPatient.medications}</span>
                <SummaryField label="Vitals" value={selectedPatient.vitals} pendingReason={PENDING_VITALS} />
              </div>
              <div className="text-xs mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Previous dx: {selectedPatient.previousDx}</span>
                <SummaryField label="Lab" value={selectedPatient.recentLab} pendingReason={PENDING_LAB} />
                <SummaryField label="Imaging" value={selectedPatient.recentImaging} pendingReason={PENDING_IMAGING} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/documentation`)}><FileText className="h-3 w-3 mr-1" />EMR</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/timeline`)}><Clock className="h-3 w-3 mr-1" />Timeline</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/results`)}><FlaskConical className="h-3 w-3 mr-1" />Results</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/prescriptions`)}><Pill className="h-3 w-3 mr-1" />Rx</Button>
              <Button size="sm" onClick={() => navigatePatient(selectedPatient, `${base}/workspace`, { autoStartConsult: true })}><Stethoscope className="h-3 w-3 mr-1" />Consult</Button>
            </div>
          </div>
        </div>
      </Card>

      {dxError && (
        <p className="text-sm text-rose-600 mb-4">{dxError}</p>
      )}
      {loadingDx && (
        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading diagnoses…
        </p>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto mb-4">
          {([
            ['add', 'Add Diagnosis'], ['active', 'Active Diagnoses'], ['differential', 'Differential'],
            ['chronic', 'Chronic Conditions'], ['psychiatric', 'Psychiatric'], ['history', 'History'],
            ['resolved', 'Resolved / Ruled Out'], ['coding', 'Coding Support'],
          ] as const).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Add Diagnosis */}
        <TabsContent value="add">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold mb-3">Diagnosis Entry</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Encounter</Label><Input value={form.encounter} onChange={e => setForm(f => ({ ...f, encounter: e.target.value }))} /></div>
                <div><Label className="text-xs">Clinic / Department</Label>
                  <Select value={form.clinic} onValueChange={v => setForm(f => ({ ...f, clinic: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="OPC">OPC</SelectItem><SelectItem value="GMPC">GMPC</SelectItem><SelectItem value="Ward">Ward</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Diagnosis System</Label>
                  <Select value={form.system} onValueChange={v => setForm(f => ({ ...f, system: v as DxSystem }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ICD-11">ICD-11</SelectItem><SelectItem value="DSM-5">DSM-5</SelectItem><SelectItem value="Local">Local diagnosis list</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Diagnosis Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as DxType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Primary', 'Secondary', 'Differential', 'Provisional', 'Confirmed', 'Ruled out'] as DxType[]).map(t =>
                        <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 6A70.1" /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label className="text-xs">Onset Date</Label><Input type="date" value={form.onsetDate} onChange={e => setForm(f => ({ ...f, onsetDate: e.target.value }))} /></div>
                <div><Label className="text-xs">Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as Severity }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['Mild', 'Moderate', 'Severe'] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as DxStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['Active', 'Chronic', 'Resolved', 'In remission'] as DxStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Certainty</Label>
                  <Select value={form.certainty} onValueChange={v => setForm(f => ({ ...f, certainty: v as Certainty }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(['Suspected', 'Probable', 'Confirmed'] as Certainty[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label className="text-xs">Diagnosis Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <div><Label className="text-xs">Link to Symptoms</Label><Input value={form.linkedSymptoms} onChange={e => setForm(f => ({ ...f, linkedSymptoms: e.target.value }))} /></div>
                <div><Label className="text-xs">Link to Lab Result</Label><Input value={form.linkedLab} onChange={e => setForm(f => ({ ...f, linkedLab: e.target.value }))} /></div>
                <div><Label className="text-xs">Link to Imaging</Label><Input value={form.linkedImaging} onChange={e => setForm(f => ({ ...f, linkedImaging: e.target.value }))} /></div>
                <div><Label className="text-xs">Link to Prescription</Label><Input value={form.linkedRx} onChange={e => setForm(f => ({ ...f, linkedRx: e.target.value }))} /></div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch checked={form.onProblemList} onCheckedChange={v => setForm(f => ({ ...f, onProblemList: v }))} />
                  <Label className="text-xs">Add to problem list</Label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={() => addDiagnosis(null)} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Diagnosis
                </Button>
                <Button variant="outline" onClick={() => addDiagnosis(null, form.type, true)} disabled={saving}>Save Draft</Button>
                <Button variant="ghost" onClick={() => setForm(emptyForm())} disabled={saving}>Clear</Button>
                <Button variant="outline" onClick={() => { addDiagnosis(null); setForm(emptyForm()); }} disabled={saving}>Add Another</Button>
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold mb-3">ICD-11 / DSM Search</h3>
                <div className="flex gap-2 mb-3">
                  <Input placeholder="Search name, code, symptoms, keywords…" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} className="flex-1" />
                  <Button variant="outline" disabled={catalogLoading}><Search className="h-4 w-4" /></Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase">
                      <tr>{['Code', 'System', 'Diagnosis', 'Category', 'Action'].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {catalogLoading ? (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading catalog…</td></tr>
                      ) : catalogResults.length === 0 ? (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-sm text-muted-foreground">No catalog matches.</td></tr>
                      ) : catalogResults.map(c => (
                        <tr key={c.id}>
                          <td className="px-2 py-1.5 font-mono text-xs">{c.code}{c.dsmCode ? ` / ${c.dsmCode}` : ''}</td>
                          <td className="px-2 py-1.5 text-xs">{c.system}</td>
                          <td className="px-2 py-1.5">{c.name}</td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">{c.category}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { populateForm(c); addDiagnosis(c, 'Primary'); }}>Primary</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { populateForm(c); addDiagnosis(c, 'Secondary'); }}>Secondary</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { populateForm(c); addDiagnosis(c, 'Differential'); }}>Diff</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailEntry(c)}><Eye className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Symptom-Based Suggestions</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div><Label className="text-xs">Symptoms</Label><Input value={symptomInput.symptoms} onChange={e => setSymptomInput(s => ({ ...s, symptoms: e.target.value }))} placeholder="e.g. low mood, insomnia" /></div>
                  <div><Label className="text-xs">Duration</Label><Input value={symptomInput.duration} onChange={e => setSymptomInput(s => ({ ...s, duration: e.target.value }))} /></div>
                  <div><Label className="text-xs">Severity</Label><Input value={symptomInput.severity} onChange={e => setSymptomInput(s => ({ ...s, severity: e.target.value }))} /></div>
                  <div><Label className="text-xs">Associated Symptoms</Label><Input value={symptomInput.associated} onChange={e => setSymptomInput(s => ({ ...s, associated: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Risk Factors</Label><Input value={symptomInput.riskFactors} onChange={e => setSymptomInput(s => ({ ...s, riskFactors: e.target.value }))} /></div>
                </div>
                <Button className="mt-3" variant="outline" onClick={suggestDiagnoses}><Sparkles className="h-4 w-4 mr-1" />Suggest Diagnoses</Button>
                <p className="text-xs text-amber-700 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                  Suggestions are decision support only. Final diagnosis must be confirmed by a doctor.
                </p>
                {suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {suggestions.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-2 border rounded text-sm">
                        <span>{s.name} <span className="font-mono text-xs text-muted-foreground">({s.code})</span></span>
                        <Button size="sm" variant="outline" onClick={() => { populateForm(s); setDetailEntry(s); }}>Review</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Active Diagnoses */}
        <TabsContent value="active">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Patient', 'Hospital No.', 'Diagnosis', 'Code', 'System', 'Type', 'Severity', 'Status', 'Date', 'Added By', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {patientRecords.filter(r => r.status !== 'Resolved' && r.type !== 'Ruled out' && r.type !== 'Differential').map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2 font-medium">{dx.patientName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.hospitalId}</td>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.code}</td>
                    <td className="px-3 py-2">{dx.system}</td>
                    <td className="px-3 py-2"><StatusPill tone="blue">{dx.type}</StatusPill></td>
                    <td className="px-3 py-2">{dx.severity}</td>
                    <td className="px-3 py-2"><StatusPill tone={dx.status === 'Chronic' ? 'purple' : 'green'}>{dx.status}</StatusPill></td>
                    <td className="px-3 py-2 text-xs">{dx.dateAdded}</td>
                    <td className="px-3 py-2 text-xs">{dx.addedBy}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewDx(dx)}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setForm(f => ({ ...f, notes: dx.notes })); setTab('add'); toast.info('Edit in Add tab'); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => markChronic(dx)}>Chronic</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCloseModal({ dx, mode: 'resolved' })}>Resolve</Button>
                        <Button size="sm" variant="ghost" onClick={() => navForDx(dx, `${base}/prescriptions`)}><Pill className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Differential */}
        <TabsContent value="differential">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Patient', 'Diagnosis', 'Reason', 'Supporting', 'Against', 'Status', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {patientRecords.filter(r => r.type === 'Differential').map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2">{dx.patientName}</td>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 text-xs">{dx.reasonConsidered ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{dx.supportingFindings ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{dx.againstFindings ?? '—'}</td>
                    <td className="px-3 py-2"><StatusPill tone="amber">{dx.certainty}</StatusPill></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => promoteDx(dx, 'Primary')}>→ Primary</Button>
                        <Button size="sm" variant="ghost" onClick={() => promoteDx(dx, 'Secondary')}>→ Secondary</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCloseModal({ dx, mode: 'ruledout' })}>Rule Out</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Chronic */}
        <TabsContent value="chronic">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Patient', 'Condition', 'Code', 'Diagnosed', 'Control', 'Last Review', 'Next Review', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {patientRecords.filter(r => r.status === 'Chronic').map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2">{dx.patientName}</td>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.code}</td>
                    <td className="px-3 py-2 text-xs">{dx.onsetDate}</td>
                    <td className="px-3 py-2"><StatusPill tone="green">{dx.controlStatus ?? 'Unknown'}</StatusPill></td>
                    <td className="px-3 py-2 text-xs">{dx.lastReview ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{dx.nextReview ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewDx(dx)}>Review</Button>
                        <Button size="sm" variant="ghost" disabled title={PENDING_CHRONIC_NOTE}>Note</Button>
                        <PendingIntegrationBanner compact reason={PENDING_CHRONIC_NOTE} />
                        <Button size="sm" variant="ghost" disabled title={PENDING_FOLLOWUP}>Schedule</Button>
                        <PendingIntegrationBanner compact reason={PENDING_FOLLOWUP} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Psychiatric */}
        <TabsContent value="psychiatric">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Patient', 'Diagnosis', 'ICD-11', 'DSM', 'Severity', 'Risk', 'Last Review', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {patientRecords.filter(r => r.isPsychiatric && r.type !== 'Ruled out').map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2">{dx.patientName}</td>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.code}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.dsmCode ?? '—'}</td>
                    <td className="px-3 py-2">{dx.severity}</td>
                    <td className="px-3 py-2"><StatusPill tone={dx.riskLevel === 'Critical' ? 'red' : 'purple'}>{dx.riskLevel ?? 'Moderate'}</StatusPill></td>
                    <td className="px-3 py-2 text-xs">{dx.lastReview ?? dx.dateAdded}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewDx(dx)}>View</Button>
                        <Button size="sm" variant="ghost" disabled title={PENDING_SEVERITY}>Severity</Button>
                        <PendingIntegrationBanner compact reason={PENDING_SEVERITY} />
                        <Button size="sm" variant="ghost" onClick={() => navForDx(dx, `${base}/documentation`)}>MSE</Button>
                        <Button size="sm" variant="ghost" disabled title={PENDING_SCALES}>Scales</Button>
                        <PendingIntegrationBanner compact reason={PENDING_SCALES} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Date', 'Diagnosis', 'Code', 'System', 'Type', 'Status', 'Added By', 'Encounter', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {[...patientRecords].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2 text-xs">{dx.dateAdded}</td>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.code}</td>
                    <td className="px-3 py-2">{dx.system}</td>
                    <td className="px-3 py-2">{dx.type}</td>
                    <td className="px-3 py-2">{dx.status}</td>
                    <td className="px-3 py-2 text-xs">{dx.addedBy}</td>
                    <td className="px-3 py-2 text-xs font-mono">{dx.encounter}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navForDx(dx, `${base}/workspace`)}>Encounter</Button>
                        <Button size="sm" variant="ghost" onClick={() => navForDx(dx, `${base}/timeline`)}>Timeline</Button>
                        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Resolved */}
        <TabsContent value="resolved">
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>{['Diagnosis', 'Code', 'Status', 'Reason', 'Closed By', 'Closed Date', 'Action'].map(h =>
                  <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {records.filter(r => r.status === 'Resolved' || r.type === 'Ruled out').map(dx => (
                  <tr key={dx.id}>
                    <td className="px-3 py-2">{dx.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{dx.code}</td>
                    <td className="px-3 py-2"><StatusPill tone="grey">{dx.type === 'Ruled out' ? 'Ruled out' : dx.status}</StatusPill></td>
                    <td className="px-3 py-2 text-xs">{dx.closedReason ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{dx.closedBy ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{dx.closedDate ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewDx(dx)}>View</Button>
                        <Button size="sm" variant="ghost" onClick={() => { promoteDx(dx, 'Provisional'); toast.success('Reopened'); }}>Reopen</Button>
                        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </TabsContent>

        {/* Coding Support */}
        <TabsContent value="coding">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold mb-2">Common GMPC Diagnoses</h3>
              <p className="text-xs text-muted-foreground mb-3">From diagnosis catalog (non-psychiatric)</p>
              {catalogLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
                </p>
              ) : gmpcCatalogEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No GMPC catalog entries available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gmpcCatalogEntries.map(entry => (
                    <Button key={entry.id} size="sm" variant="outline" onClick={() => {
                      populateForm(entry);
                      setDetailEntry(entry);
                      setTab('add');
                    }}>{entry.name}</Button>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold mb-2">Common OPC Diagnoses</h3>
              <p className="text-xs text-muted-foreground mb-3">From diagnosis catalog (psychiatric)</p>
              {catalogLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
                </p>
              ) : opcCatalogEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No OPC catalog entries available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {opcCatalogEntries.map(entry => (
                    <Button key={entry.id} size="sm" variant="outline" onClick={() => {
                      populateForm(entry);
                      setDetailEntry(entry);
                      setTab('add');
                    }}>{entry.name}</Button>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold mb-2">Recently Used</h3>
              <div className="space-y-1 text-sm">
                {records.slice(0, 5).map(r => (
                  <button key={r.id} type="button" className="block w-full text-left p-2 hover:bg-muted rounded text-xs" onClick={() => {
                    const entry = catalog.find(c => c.code === r.code);
                    if (entry) populateForm(entry);
                    setTab('add');
                  }}>{r.name} ({r.code})</button>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-2">Favorite Diagnoses</h3>
              <div className="space-y-1">
                {favorites.length === 0 && <p className="text-xs text-muted-foreground">Star a diagnosis from search to add favorites.</p>}
                {favorites.map(code => {
                  const c = catalog.find(x => x.code === code);
                  return c ? (
                    <div key={code} className="flex justify-between items-center p-2 border rounded text-sm">
                      <span>{c.name} <span className="font-mono text-xs">({code})</span></span>
                      <Button size="sm" variant="ghost" onClick={() => { populateForm(c); setTab('add'); }}>Use</Button>
                    </div>
                  ) : null;
                })}
              </div>
            </Card>
            <Card className="md:col-span-2">
              <h3 className="font-semibold mb-2">ICD-11 Quick Codes</h3>
              {catalogLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
                </p>
              ) : catalog.filter(c => c.system === 'ICD-11').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No ICD-11 codes in catalog.</p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                  {catalog.filter(c => c.system === 'ICD-11').slice(0, 9).map(c => (
                    <button key={c.id} type="button" className="p-2 border rounded hover:bg-muted text-left" onClick={() => { populateForm(c); setTab('add'); }}>
                      <span className="font-mono">{c.code}</span> — {c.name}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>


      {/* Catalog detail drawer */}
      <Sheet open={!!detailEntry} onOpenChange={v => !v && setDetailEntry(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailEntry?.name}</SheetTitle>
            <SheetDescription>{detailEntry?.code} · {detailEntry?.system}{detailEntry?.dsmCode ? ` · DSM ${detailEntry.dsmCode}` : ''}</SheetDescription>
          </SheetHeader>
          {detailEntry && (
            <div className="mt-4 space-y-3 text-sm">
              <div><Label className="text-xs font-semibold">Category</Label><p>{detailEntry.category}</p></div>
              <div><Label className="text-xs font-semibold">Description</Label><p>{detailEntry.description}</p></div>
              <div><Label className="text-xs font-semibold">Common Symptoms</Label><p>{detailEntry.symptoms}</p></div>
              <div className="p-3 bg-muted/30 rounded text-xs"><b>Diagnostic criteria:</b> Refer to ICD-11 / DSM-5-TR official criteria for full specification.</div>
              <div className="p-3 bg-muted/30 rounded text-xs"><b>Treatment guideline:</b> Follow GFA clinical protocol and MDT recommendations.</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { populateForm(detailEntry); addDiagnosis(detailEntry, 'Primary'); setDetailEntry(null); }}>Add as Primary</Button>
                <Button size="sm" variant="outline" onClick={() => { populateForm(detailEntry); addDiagnosis(detailEntry, 'Secondary'); setDetailEntry(null); }}>Secondary</Button>
                <Button size="sm" variant="outline" onClick={() => { populateForm(detailEntry); addDiagnosis(detailEntry, 'Differential'); setDetailEntry(null); }}>Differential</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleFavorite(detailEntry.code)}><Star className={`h-4 w-4 ${favorites.includes(detailEntry.code) ? 'fill-amber-400 text-amber-400' : ''}`} /></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* View diagnosis drawer */}
      <Sheet open={!!viewDx} onOpenChange={v => !v && setViewDx(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewDx?.name}</SheetTitle>
            <SheetDescription>{viewDx?.code} · {viewDx?.system} · {viewDx?.type}</SheetDescription>
          </SheetHeader>
          {viewDx && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/30 rounded">
                <div><b>Patient:</b> {viewDx.patientName}</div>
                <div><b>Severity:</b> {viewDx.severity}</div>
                <div><b>Status:</b> {viewDx.status}</div>
                <div><b>Certainty:</b> {viewDx.certainty}</div>
                <div><b>Added:</b> {viewDx.dateAdded}</div>
                <div><b>By:</b> {viewDx.addedBy}</div>
                <div className="col-span-2"><b>Notes:</b> {viewDx.notes || '—'}</div>
              </div>
              {viewDx.linkedLab && <div className="text-xs"><b>Linked lab:</b> {viewDx.linkedLab}</div>}
              {viewDx.linkedImaging && <div className="text-xs"><b>Linked imaging:</b> {viewDx.linkedImaging}</div>}
              {viewDx.linkedRx && <div className="text-xs"><b>Linked Rx:</b> {viewDx.linkedRx}</div>}
              <div className="text-xs text-muted-foreground">Audit: changes versioned in {DX_AUDIT_KEY}</div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Resolve / Rule out modal */}
      <Dialog open={!!closeModal} onOpenChange={v => !v && setCloseModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{closeModal?.mode === 'resolved' ? 'Mark Resolved' : 'Rule Out Diagnosis'}</DialogTitle>
            <DialogDescription>{closeModal?.dx.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Reason *</Label><Input value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="Clinical reason…" /></div>
            <div><Label>Date</Label><Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div><Label>Doctor Comment</Label><Textarea rows={2} value={closeComment} onChange={e => setCloseComment(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModal(null)} disabled={saving}>Cancel</Button>
            <Button onClick={markResolved} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {closeModal?.mode === 'resolved' ? 'Mark Resolved' : 'Rule Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile sticky */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t lg:hidden flex gap-2 z-40">
        <Button className="flex-1" onClick={() => setTab('add')}><Plus className="h-4 w-4 mr-1" />Add Diagnosis</Button>
        <Button variant="outline" onClick={handleChangePatient}>{selectedPatient.name.split(' ')[0]}</Button>
      </div>
    </ClinicalPageShell>
  );
};
