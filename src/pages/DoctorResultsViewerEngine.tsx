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
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ApiError } from '@/lib/api/client';
import {
  acknowledgeLabResult,
  getLabHistory,
  getLabResult,
  isLaboratoryApiEnabled,
  listLabResults,
  type ApiLabHistory,
  type ApiLabResult,
  type ApiLabResultValues,
  type ApiTemplateField,
} from '@/lib/api/laboratory';
import {
  acknowledgeImagingReport,
  getImagingReport,
  imagingPatientName,
  isImagingApiEnabled,
  listImagingReports,
  type ApiImagingReport,
} from '@/lib/api/imaging';
import { ResultValuesView, isCriticalValue } from '@/pages/lab/LabResultFields';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  Eye, Search, RefreshCw, Printer, Download, FlaskConical, ScanLine, AlertTriangle,
  CheckCircle2, Clock, UserPlus, FileText, Activity, Heart,
  Repeat, GitCompare, Siren, Loader2,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const RES_AUDIT_KEY = 'gfa_doc_results_audit_v1';
const RES_TIMELINE_KEY = 'gfa_doc_results_timeline_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Results Viewer">{children}</DashboardLayout>
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
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

type ResultType = 'Lab' | 'Imaging' | 'ECG' | 'Other';
type ResultFlag = 'Normal' | 'Low' | 'High' | 'Abnormal' | 'Critical' | 'Pending' | 'Preliminary';
type ResultStatus = 'Awaiting Validation' | 'Validated' | 'Pending Doctor Review' | 'Accepted' | 'Repeated' | 'Escalated';
type TabId = 'all' | 'lab' | 'imaging' | 'ecg' | 'critical' | 'abnormal' | 'pending' | 'history';
type KpiFilter = 'lab' | 'imaging' | 'critical' | 'pending' | 'abnormal' | 'validation';

interface ResultPatient {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: string; diagnosis: string; allergies: string;
  medications: string; vitals: string; lastVisit: string;
}

interface ResultRow {
  id: string; resultNo: string; patientId: string; patientName: string; hospitalId: string;
  type: ResultType; testName: string; summary: string; refRange: string; flag: ResultFlag;
  status: ResultStatus; resultDate: string; validatedBy: string;
  fullValues: string; interpretation: string; reporter: string; validator: string;
  relatedRequest: string; relatedDiagnosis: string; acknowledged: boolean;
  attachments: string; isCritical: boolean; isAbnormal: boolean;
  imagingFindings?: string; imagingImpression?: string; imagingRecommendation?: string;
  ecgRate?: string; ecgRhythm?: string; ecgAxis?: string;
  history?: { date: string; value: string; flag: ResultFlag }[];
  templateFields?: ApiTemplateField[] | null;
  values?: ApiLabResultValues;
  apiLabResultId?: number;
  apiImagingReportId?: number;
}

function summarizeValues(values: ApiLabResultValues | null | undefined, fields?: ApiTemplateField[] | null): string {
  if (!values) return '—';
  const entries = Object.entries(values).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return '—';
  return entries
    .slice(0, 6)
    .map(([k, v]) => {
      const label = fields?.find((f) => f.key === k)?.label ?? k;
      const display = Array.isArray(v) ? v.join(', ') : String(v);
      return `${label} ${display}`;
    })
    .join(' · ');
}

function detectCritical(r: ApiLabResult): boolean {
  return (
    Boolean(r.criticalFlag) ||
    (r.templateFields ?? []).some((f) => isCriticalValue(f, r.values?.[f.key]))
  );
}

function isOutOfRef(ref: string, value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  const v = Number(raw);
  if (Number.isNaN(v)) return false;
  const match = ref.match(/^([\d.]+)\s*[–-]\s*([\d.]+)$/);
  if (!match) return false;
  return v < Number(match[1]) || v > Number(match[2]);
}

function detectResultFlag(r: ApiLabResult): ResultFlag {
  if (detectCritical(r)) return 'Critical';
  for (const f of r.templateFields ?? []) {
    const value = r.values?.[f.key];
    if (f.ref && isOutOfRef(f.ref, value)) {
      const v = Number(Array.isArray(value) ? value[0] : value);
      const match = f.ref.match(/^([\d.]+)\s*[–-]\s*([\d.]+)$/);
      if (match) return v < Number(match[1]) ? 'Low' : 'High';
      return 'Abnormal';
    }
  }
  return 'Normal';
}

function detectAbnormal(r: ApiLabResult): boolean {
  const flag = detectResultFlag(r);
  return flag !== 'Normal';
}

function mapApiResult(r: ApiLabResult): ResultRow {
  const critical = detectCritical(r);
  const flag = detectResultFlag(r);
  const abnormal = detectAbnormal(r);
  const acknowledged = Boolean(r.criticalAckAt);
  const status: ResultStatus =
    r.status === 'Validated'
      ? 'Pending Doctor Review'
      : r.status === 'Submitted'
        ? 'Awaiting Validation'
        : 'Validated';
  const summary = summarizeValues(r.values, r.templateFields);
  return {
    id: String(r.labResultId),
    resultNo: `RES-${r.labResultId}`,
    patientId: String(r.personId ?? ''),
    patientName: r.personName || 'Unknown',
    hospitalId: r.hospitalNo || (r.personId ? `PID-${r.personId}` : '—'),
    type: 'Lab',
    testName: r.testName || r.templateName || 'Lab result',
    summary,
    refRange: (r.templateFields ?? []).map((f) => f.ref).filter(Boolean).join('; ') || '—',
    flag,
    status,
    resultDate: (r.validatedAt || r.enteredAt || '').replace('T', ' ').slice(0, 16) || '—',
    validatedBy: r.validatedBy || '—',
    fullValues: summary,
    interpretation: r.comment || '—',
    reporter: r.enteredBy || '—',
    validator: r.validatedBy || '—',
    relatedRequest: r.requestNo || '—',
    relatedDiagnosis: '—',
    acknowledged,
    attachments: '—',
    isCritical: critical,
    isAbnormal: abnormal,
    templateFields: r.templateFields,
    values: r.values,
    apiLabResultId: r.labResultId,
  };
}

function mapImagingReport(r: ApiImagingReport): ResultRow {
  const acknowledged = Boolean(r.criticalAckAt);
  const summary = r.impression ?? r.findings ?? '—';
  return {
    id: `img-${r.reportId}`,
    resultNo: r.reportNo,
    patientId: String(r.personId),
    patientName: imagingPatientName(r.person),
    hospitalId: r.person?.hospitalNo || `PID-${r.personId}`,
    type: 'Imaging',
    testName: r.requestNo ?? 'Imaging report',
    summary,
    refRange: '—',
    flag: r.critical ? 'Critical' : 'Normal',
    status: acknowledged ? 'Accepted' : 'Pending Doctor Review',
    resultDate: (r.releasedAt || r.createdAt || '').replace('T', ' ').slice(0, 16) || '—',
    validatedBy: r.createdBy || '—',
    fullValues: '—',
    interpretation: r.impression || '—',
    reporter: r.createdBy || '—',
    validator: r.createdBy || '—',
    relatedRequest: r.requestNo || '—',
    relatedDiagnosis: '—',
    acknowledged,
    attachments: 'PACS link',
    isCritical: r.critical,
    isAbnormal: r.critical,
    imagingFindings: r.findings ?? undefined,
    imagingImpression: r.impression ?? undefined,
    imagingRecommendation: undefined,
    apiImagingReportId: r.reportId,
  };
}

const flagTone = (f: ResultFlag) => {
  if (f === 'Critical') return 'red';
  if (f === 'High' || f === 'Low' || f === 'Abnormal') return 'amber';
  if (f === 'Normal') return 'green';
  return 'blue';
};

function logAudit(action: string, detail?: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(RES_AUDIT_KEY) || '[]');
    arr.unshift({ action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(RES_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(RES_TIMELINE_KEY) || '[]');
    arr.unshift({ event, patient, module: 'Results', timestamp: new Date().toISOString() });
    localStorage.setItem(RES_TIMELINE_KEY, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

const toCtx = (p: ResultPatient): DocPatientContext => ({
  id: p.id, name: p.name, hospitalId: p.hospitalId, phone: p.phone, nin: p.nin, nhiaNo: p.nhiaNo,
  age: p.age, gender: p.gender, clinic: p.clinic, diagnosis: p.diagnosis,
  allergies: p.allergies, medications: p.medications,
});

export const DocResults = () => {
  const navigate = useNavigate();
  const labApiOn = isLaboratoryApiEnabled();
  const imagingApiOn = isImagingApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ackSubmitting, setAckSubmitting] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ResultPatient | null>(null);
  const [tab, setTab] = useState<TabId>('all');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [search, setSearch] = useState('');
  const [viewResult, setViewResult] = useState<ResultRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acceptModal, setAcceptModal] = useState<ResultRow | null>(null);
  const [repeatModal, setRepeatModal] = useState<ResultRow | null>(null);
  const [compareResult, setCompareResult] = useState<ResultRow | null>(null);
  const [selectPatientOpen, setSelectPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [apiPatients, setApiPatients] = useState<ResultPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [acceptForm, setAcceptForm] = useState({ acknowledgement: '', interpretation: '', actionTaken: '', followUp: '' });
  const [repeatForm, setRepeatForm] = useState({ reason: '', priority: 'Routine' as 'Routine' | 'Urgent' | 'Emergency', indication: '', billing: 'NHIA' });
  const [labHistory, setLabHistory] = useState<ApiLabHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const refreshResults = useCallback(async () => {
    if (!labApiOn) {
      setResults([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const personId = selectedPatient ? Number(selectedPatient.id) : undefined;
    const q = search.trim() || undefined;
    try {
      const fetches: [
        ReturnType<typeof listLabResults>,
        ReturnType<typeof listLabResults>,
        Promise<{ items: ApiImagingReport[] }> | Promise<{ items: never[] }>,
      ] = [
        listLabResults({ status: 'Validated', personId, q, page: 1, limit: 100 }),
        listLabResults({ status: 'Submitted', personId, q, page: 1, limit: 50 }),
        imagingApiOn
          ? listImagingReports({ status: 'Released', personId, page: 1, limit: 100 })
          : Promise.resolve({ items: [] }),
      ];
      const [validated, submitted, imaging] = await Promise.all(fetches);
      const byId = new Map<string, ResultRow>();
      for (const r of validated.items) byId.set(String(r.labResultId), mapApiResult(r));
      for (const r of submitted.items) byId.set(String(r.labResultId), mapApiResult(r));
      for (const r of imaging.items) byId.set(`img-${r.reportId}`, mapImagingReport(r));
      setResults([...byId.values()]);
      logAudit('Results refreshed from API');
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [labApiOn, imagingApiOn, search, selectedPatient]);

  const loadLabHistory = useCallback(async () => {
    if (!labApiOn || !selectedPatient) {
      setLabHistory(null);
      setHistoryError(null);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getLabHistory({
        personId: Number(selectedPatient.id),
        q: search.trim() || undefined,
        limit: 100,
      });
      setLabHistory(data);
    } catch (err) {
      setHistoryError(err instanceof ApiError ? err.message : 'Could not load lab history');
      setLabHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [labApiOn, selectedPatient, search]);

  useEffect(() => {
    if (!labApiOn) return;
    void refreshResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labApiOn, selectedPatient?.id]);

  useEffect(() => {
    if (!labApiOn || tab !== 'history') return;
    void loadLabHistory();
  }, [labApiOn, tab, loadLabHistory]);

  useEffect(() => {
    if (!selectPatientOpen || !patientsApiOn) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setApiPatients([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPatientSearchLoading(true);
      searchPersons(q)
        .then((rows) => {
          if (cancelled) return;
          setApiPatients(
            rows.map((r) => {
              const age = r.dateOfBirth
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(r.dateOfBirth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
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
                gender: r.sex ?? '',
                clinic: 'OPC',
                diagnosis: '—',
                allergies: '—',
                medications: '—',
                vitals: '—',
                lastVisit: '—',
              };
            }),
          );
        })
        .catch(() => {
          if (!cancelled) setApiPatients([]);
        })
        .finally(() => {
          if (!cancelled) setPatientSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [selectPatientOpen, patientsApiOn, patientSearch]);

  const navigatePatient = useCallback((p: ResultPatient, path: string, extra?: Partial<DocPatientContext>) => {
    setDocPatientContext({ ...toCtx(p), ...extra });
    logAudit(`Navigate → ${path}`, p.name);
    navigate(path);
  }, [navigate]);

  const patientById = (id: string) =>
    apiPatients.find((p) => p.id === id) || (selectedPatient?.id === id ? selectedPatient : null);

  const filteredPatients = useMemo(() => {
    if (!patientsApiOn) return [];
    return apiPatients;
  }, [patientsApiOn, apiPatients]);

  const kpis = useMemo(() => ({
    lab: results.filter(r => r.type === 'Lab').length,
    imaging: results.filter(r => r.type === 'Imaging').length,
    critical: results.filter(r => r.isCritical).length,
    pending: results.filter(r => (r.isCritical && !r.acknowledged) || r.status === 'Pending Doctor Review').length,
    abnormal: results.filter(r => r.isAbnormal).length,
    validation: results.filter(r => r.status === 'Awaiting Validation').length,
  }), [results]);

  const filtered = useMemo(() => {
    let out = [...results];
    if (selectedPatient) out = out.filter(r => r.patientId === selectedPatient.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => `${r.patientName} ${r.testName} ${r.resultNo} ${r.summary}`.toLowerCase().includes(q));
    }
    if (kpiFilter) {
      switch (kpiFilter) {
        case 'lab': out = out.filter(r => r.type === 'Lab'); break;
        case 'imaging': out = out.filter(r => r.type === 'Imaging'); break;
        case 'critical': out = out.filter(r => r.isCritical); break;
        case 'pending': out = out.filter(r => (r.isCritical && !r.acknowledged) || r.status === 'Pending Doctor Review'); break;
        case 'abnormal': out = out.filter(r => r.isAbnormal); break;
        case 'validation': out = out.filter(r => r.status === 'Awaiting Validation'); break;
      }
    } else {
      switch (tab) {
        case 'lab': out = out.filter(r => r.type === 'Lab'); break;
        case 'imaging': out = out.filter(r => r.type === 'Imaging'); break;
        case 'ecg': out = out.filter(r => r.type === 'ECG'); break;
        case 'critical': out = out.filter(r => r.isCritical); break;
        case 'abnormal': out = out.filter(r => r.isAbnormal); break;
        case 'pending': out = out.filter(r => (r.isCritical && !r.acknowledged) || r.status === 'Pending Doctor Review'); break;
        case 'validation': out = out.filter(r => r.status === 'Awaiting Validation'); break;
      }
    }
    return out.sort((a, b) => b.resultDate.localeCompare(a.resultDate));
  }, [results, selectedPatient, search, kpiFilter, tab]);

  const acceptResult = (addToNote = false) => {
    if (!acceptModal || labApiOn) return;
    if (!acceptForm.acknowledgement.trim()) { toast.error('Acknowledgement required'); return; }
    setResults(prev => prev.map(r => r.id === acceptModal.id ? { ...r, status: 'Accepted' as ResultStatus, acknowledged: true } : r));
    logAudit('Result accepted', acceptModal.resultNo);
    logTimeline(`Result accepted: ${acceptModal.testName}`, acceptModal.patientName);
    notifySuccess('Result accepted successfully', 'Result Accepted');
    if (addToNote) {
      const p = patientById(acceptModal.patientId);
      if (p) navigatePatient(p, `${base}/documentation`, { noteType: 'Progress Note' });
    }
    setAcceptModal(null);
    setAcceptForm({ acknowledgement: '', interpretation: '', actionTaken: '', followUp: '' });
  };

  const sendRepeat = () => {
    if (!repeatModal || !repeatForm.reason.trim()) { toast.error('Reason for repeat required'); return; }
    setResults(prev => prev.map(r => r.id === repeatModal.id ? { ...r, status: 'Repeated' as ResultStatus } : r));
    logAudit('Repeat requested', repeatModal.resultNo);
    logTimeline(`Repeat requested: ${repeatModal.testName}`, repeatModal.patientName);
    const p = patientById(repeatModal.patientId);
    if (p) {
      setDocPatientContext(toCtx(p));
      navigate(repeatModal.type === 'Imaging' ? `${base}/imaging` : `${base}/lab`);
    }
    toast.success('Repeat request sent');
    setRepeatModal(null);
    setRepeatForm({ reason: '', priority: 'Routine', indication: '', billing: 'NHIA' });
  };

  const acknowledgeCritical = async (r: ResultRow) => {
    if (!labApiOn) return;
    setAckSubmitting(r.id);
    try {
      if (r.type === 'Lab' && r.apiLabResultId) {
        await acknowledgeLabResult(r.apiLabResultId);
      } else if (r.type === 'Imaging' && r.apiImagingReportId) {
        await acknowledgeImagingReport(r.apiImagingReportId);
      } else {
        toast.error('Cannot acknowledge this result');
        return;
      }
      await refreshResults();
      logAudit('Critical result acknowledged', r.resultNo);
      toast.success('Critical finding acknowledged');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not acknowledge critical result');
    } finally {
      setAckSubmitting(null);
    }
  };

  const openResultDetail = async (r: ResultRow) => {
    setViewResult(r);
    if (!labApiOn) return;
    if (r.apiLabResultId) {
      setDetailLoading(true);
      try {
        const full = await getLabResult(r.apiLabResultId);
        setViewResult(mapApiResult(full));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not load result detail');
      } finally {
        setDetailLoading(false);
      }
      return;
    }
    if (r.apiImagingReportId) {
      setDetailLoading(true);
      try {
        const full = await getImagingReport(r.apiImagingReportId);
        setViewResult(mapImagingReport(full));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not load imaging report');
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const ResultsTable = ({ rows, criticalMode }: { rows: ResultRow[]; criticalMode?: boolean }) => (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm hidden md:table">
        <thead className="bg-muted/40 text-xs uppercase">
          <tr>{(criticalMode
            ? ['Patient', 'Hospital No.', 'Result', 'Critical Finding', 'Reported', 'By', 'Ack', 'Actions']
            : ['Result No.', 'Patient', 'Hospital No.', 'Type', 'Test', 'Summary', 'Ref', 'Flag', 'Status', 'Date', 'Validated By', 'Actions']
          ).map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(r => (
            <tr key={r.id} className={`${r.isCritical && !r.acknowledged ? 'bg-rose-50/60 ring-1 ring-inset ring-rose-200' : ''}`}>
              {criticalMode ? (
                <>
                  <td className="px-2 py-2 font-medium">{r.patientName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.hospitalId}</td>
                  <td className="px-2 py-2">{r.testName}</td>
                  <td className="px-2 py-2 font-mono text-rose-700">{r.summary}</td>
                  <td className="px-2 py-2 text-xs">{r.resultDate}</td>
                  <td className="px-2 py-2 text-xs">{r.reporter}</td>
                  <td className="px-2 py-2">{r.acknowledged ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}</td>
                  <td className="px-2 py-2"><ActionCell r={r} critical /></td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 font-mono text-xs">{r.resultNo}</td>
                  <td className="px-2 py-2">{r.patientName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.hospitalId}</td>
                  <td className="px-2 py-2">{r.type}</td>
                  <td className="px-2 py-2">{r.testName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{r.summary}</td>
                  <td className="px-2 py-2 text-xs">{r.refRange}</td>
                  <td className="px-2 py-2"><StatusPill tone={flagTone(r.flag)}>{r.flag}</StatusPill></td>
                  <td className="px-2 py-2"><StatusPill tone="blue">{r.status}</StatusPill></td>
                  <td className="px-2 py-2 text-xs">{r.resultDate}</td>
                  <td className="px-2 py-2 text-xs">{r.validatedBy}</td>
                  <td className="px-2 py-2"><ActionCell r={r} /></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="md:hidden p-3 space-y-3">
        {rows.map(r => (
          <div key={r.id} className={`border rounded-lg p-3 ${r.isCritical && !r.acknowledged ? 'border-rose-300 bg-rose-50/30' : ''}`}>
            <div className="font-medium">{r.testName}</div>
            <div className="text-xs text-muted-foreground">{r.patientName} · {r.resultNo}</div>
            <div className="font-mono text-sm mt-1">{r.summary}</div>
            <StatusPill tone={flagTone(r.flag)}>{r.flag}</StatusPill>
            <div className="mt-2"><ActionCell r={r} /></div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No results match filters.</p>}
    </Card>
  );

  const ActionCell = ({ r, critical }: { r: ResultRow; critical?: boolean }) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void openResultDetail(r)}><Eye className="h-3 w-3" /></Button>
      {!labApiOn && r.status !== 'Accepted' && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAcceptModal(r)}>Accept</Button>
      )}
      {labApiOn && r.status !== 'Accepted' && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled title="Result acceptance API not available">Accept</Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRepeatModal(r)}>Repeat</Button>
      {!labApiOn && r.history && r.history.length > 1 && (
        <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => { setCompareResult(r); setTab('history'); }}><GitCompare className="h-3 w-3" /></Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => { const p = patientById(r.patientId); if (p) navigatePatient(p, `${base}/documentation`); }}><FileText className="h-3 w-3" /></Button>
      {critical && !r.acknowledged && (
        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs"
          disabled={ackSubmitting === r.id}
          onClick={() => void acknowledgeCritical(r)}
        >
          {ackSubmitting === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ack'}
        </Button>
      )}
    </div>
  );

  const HistoryComparison = () => {
    if (!labApiOn) {
      return (
        <PendingIntegrationBanner reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL to load lab history." />
      );
    }
    if (!selectedPatient) {
      return (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Select a patient to view longitudinal laboratory history.
        </Card>
      );
    }
    if (historyLoading) {
      return (
        <Card className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lab history…
        </Card>
      );
    }
    if (historyError) {
      return (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-800">{historyError}</p>
          <Button size="sm" variant="outline" onClick={() => void loadLabHistory()}>Retry</Button>
        </Card>
      );
    }
    const items = labHistory?.items.filter((i) => i.resultSummary || i.validatedAt) ?? [];
    if (items.length === 0) {
      return (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No validated lab history found for {selectedPatient.name}.
        </Card>
      );
    }
    const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
      const key = item.testName || item.testCode;
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    }, {});
    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([testName, rows]) => {
          const sorted = [...rows].sort((a, b) =>
            (a.validatedAt || a.requestedAt || '').localeCompare(b.validatedAt || b.requestedAt || ''),
          );
          const latest = sorted[sorted.length - 1];
          const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
          return (
            <Card key={testName}>
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold">{testName} — {selectedPatient.name}</div>
                  <div className="text-xs text-muted-foreground">{latest.category || '—'}</div>
                </div>
                <StatusPill tone="blue">{latest.resultStatus || latest.labStatus}</StatusPill>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground"><th className="text-left py-1">Date</th><th className="text-left">Request</th><th className="text-left">Result</th><th className="text-left">Status</th></tr></thead>
                <tbody>
                  {sorted.map((h) => (
                    <tr key={`${h.requestId}-${h.resultId ?? 'none'}`}>
                      <td className="py-1">{(h.validatedAt || h.requestedAt || '').replace('T', ' ').slice(0, 16) || '—'}</td>
                      <td className="font-mono">{h.requestNo}</td>
                      <td className="font-mono">{h.resultSummary || '—'}</td>
                      <td>{h.resultStatus || h.labStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prev && (
                <p className="text-xs text-muted-foreground mt-2">
                  Latest: {latest.resultSummary || '—'} · Previous: {prev.resultSummary || '—'}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Results Viewer</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Review laboratory, imaging, ECG, and diagnostic reports with abnormal flags and historical comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectPatientOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void refreshResults()}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setTab('critical'); setKpiFilter('critical'); }}><Siren className="h-4 w-4 mr-1" />Critical</Button>
          <Button variant="outline" size="sm" onClick={() => { window.print(); logAudit('Results printed'); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          {labApiOn ? (
            <PendingIntegrationBanner compact reason="Result export PDF API is not available yet." className="inline-flex" />
          ) : (
            <Button variant="outline" size="sm" disabled><Download className="h-4 w-4 mr-1" />Export</Button>
          )}
        </div>
      </div>

      {!labApiOn && (
        <div className="mb-4">
          <PendingIntegrationBanner reason="Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL to load live laboratory and imaging results." />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {([
          ['lab', 'Lab Results', kpis.lab, 'Today', FlaskConical, 'blue'],
          ['imaging', 'Imaging Results', kpis.imaging, 'Today', ScanLine, 'indigo'],
          ['critical', 'Critical Findings', kpis.critical, 'Action required', AlertTriangle, 'rose'],
          ['pending', 'Pending Review', kpis.pending, 'Not accepted', Clock, 'amber'],
          ['abnormal', 'Abnormal Results', kpis.abnormal, 'Out of range', Activity, 'purple'],
          ['validation', 'Awaiting Validation', kpis.validation, 'Not validated', Heart, 'teal'],
        ] as const).map(([id, title, val, sub, Icon, t]) => (
          <button key={id} type="button" onClick={() => {
            setKpiFilter(kpiFilter === id ? null : id as KpiFilter);
            if (id === 'lab') setTab('lab');
            else if (id === 'imaging') setTab('imaging');
            else if (id === 'critical') setTab('critical');
            else if (id === 'pending') setTab('pending');
            else if (id === 'abnormal') setTab('abnormal');
          }} className={`text-left rounded-xl ${kpiFilter === id ? 'ring-2 ring-primary' : ''}`}>
            <SummaryCard title={title} value={String(val)} subtitle={sub} icon={Icon} tone={t as 'blue' | 'indigo' | 'rose' | 'amber' | 'purple' | 'teal'} />
          </button>
        ))}
      </div>

      {selectedPatient && (
        <Card className="mb-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-semibold text-lg">{selectedPatient.name}</div>
              <div className="text-sm text-muted-foreground font-mono">{selectedPatient.hospitalId} · {selectedPatient.age}y {selectedPatient.gender} · {selectedPatient.clinic}</div>
              <div className="text-xs mt-1">{selectedPatient.diagnosis} · Allergies: {selectedPatient.allergies}</div>
              <div className="text-xs">Meds: {selectedPatient.medications} · Vitals: {selectedPatient.vitals} · Last visit: {selectedPatient.lastVisit}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/documentation`)}>EMR</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/timeline`)}>Timeline</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/prescriptions`)}>Prescribe</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/lab`)}>Request Lab</Button>
              <Button size="sm" variant="outline" onClick={() => navigatePatient(selectedPatient, `${base}/imaging`)}>Request Imaging</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)}>Clear</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search result, test, patient…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        {labApiOn && (
          <Button size="sm" variant="outline" disabled={loading} onClick={() => void refreshResults()}>Search API</Button>
        )}
      </Card>

      {labApiOn && loading && (
        <Card className="mb-4 p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading results from API…
        </Card>
      )}
      {labApiOn && loadError && !loading && (
        <Card className="mb-4 p-4 flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-800">{loadError}</p>
          <Button size="sm" variant="outline" onClick={() => void refreshResults()}>Retry</Button>
        </Card>
      )}

      <Tabs value={tab} onValueChange={v => { setTab(v as TabId); setKpiFilter(null); }}>
        <TabsList className="flex flex-wrap h-auto mb-4">
          {([
            ['all', 'All Results'], ['lab', 'Lab'], ['imaging', 'Imaging'], ['ecg', 'ECG'],
            ['critical', 'Critical'], ['abnormal', 'Abnormal'], ['pending', 'Pending Review'], ['history', 'Historical'],
          ] as const).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="text-xs">{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="history"><HistoryComparison /></TabsContent>
        <TabsContent value="ecg">
          {labApiOn ? (
            <PendingIntegrationBanner reason="ECG domain API is not available yet." />
          ) : (
            <ResultsTable rows={[]} />
          )}
        </TabsContent>
        {(['all', 'lab', 'imaging', 'critical', 'abnormal', 'pending'] as const).map(tid => (
          <TabsContent key={tid} value={tid}>
            {labApiOn && !loading && !loadError && filtered.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                {tid === 'imaging' && !imagingApiOn
                  ? 'Imaging API is not configured.'
                  : tid === 'critical'
                    ? 'No critical findings requiring acknowledgement.'
                    : tid === 'pending'
                      ? 'No results pending doctor review.'
                      : tid === 'abnormal'
                        ? 'No abnormal results match the current filters.'
                        : 'No results match the current filters.'}
              </Card>
            ) : (
              <ResultsTable rows={filtered} criticalMode={tid === 'critical'} />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* View drawer */}
      <Sheet open={!!viewResult} onOpenChange={v => !v && setViewResult(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewResult?.testName}</SheetTitle>
            <SheetDescription>{viewResult?.resultNo} · {viewResult?.patientName}</SheetDescription>
          </SheetHeader>
          {viewResult && (
            <div className="mt-4 space-y-4 text-sm">
              {detailLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading detail…
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={flagTone(viewResult.flag)}>{viewResult.flag}</StatusPill>
                <StatusPill tone="blue">{viewResult.status}</StatusPill>
                {viewResult.isCritical && <StatusPill tone="red">Critical</StatusPill>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/30 rounded">
                <div><b>Type:</b> {viewResult.type}</div>
                <div><b>Date:</b> {viewResult.resultDate}</div>
                <div className="col-span-2"><b>Summary:</b> <span className="font-mono">{viewResult.summary}</span></div>
                <div><b>Reference:</b> {viewResult.refRange}</div>
                <div><b>Reporter:</b> {viewResult.reporter}</div>
                <div><b>Validator:</b> {viewResult.validator}</div>
                <div><b>Request:</b> {viewResult.relatedRequest}</div>
                <div className="col-span-2"><b>Interpretation:</b> {viewResult.interpretation}</div>
              </div>
              {viewResult.values && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Result fields</Label>
                  <ResultValuesView fields={viewResult.templateFields ?? []} values={viewResult.values} />
                </div>
              )}
              {!viewResult.values && (
                <div className="text-xs"><b>Full values:</b> {viewResult.fullValues}</div>
              )}
              {viewResult.type === 'Imaging' && (
                <div className="space-y-2 text-xs border rounded p-3">
                  <div><b>Findings:</b> {viewResult.imagingFindings}</div>
                  <div><b>Impression:</b> {viewResult.imagingImpression}</div>
                  <div><b>Recommendation:</b> {viewResult.imagingRecommendation ?? '—'}</div>
                  {labApiOn ? (
                    <PendingIntegrationBanner compact reason="PACS viewer integration is not available yet." />
                  ) : (
                    <Button size="sm" variant="outline" disabled>View Image / PACS</Button>
                  )}
                </div>
              )}
              {viewResult.type === 'ECG' && (
                <div className="space-y-1 text-xs border rounded p-3">
                  <div><b>Rate:</b> {viewResult.ecgRate}</div>
                  <div><b>Rhythm:</b> {viewResult.ecgRhythm}</div>
                  <div><b>Axis:</b> {viewResult.ecgAxis}</div>
                  <div><b>Interpretation:</b> {viewResult.interpretation}</div>
                  {labApiOn ? (
                    <PendingIntegrationBanner compact reason="ECG attachment viewer is not available yet." />
                  ) : (
                    <Button size="sm" variant="outline" disabled>View Attachment</Button>
                  )}
                </div>
              )}
              {!labApiOn && viewResult.history && viewResult.history.length > 1 && (
                <div>
                  <Label className="text-xs font-semibold">Historical trend</Label>
                  <div className="text-xs mt-1 space-y-1">
                    {viewResult.history.map(h => <div key={h.date}>{h.date}: {h.value} ({h.flag})</div>)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {labApiOn ? (
                  <div className="col-span-2">
                    <PendingIntegrationBanner compact reason="Doctor result acceptance API is not available yet." />
                  </div>
                ) : (
                  <Button size="sm" onClick={() => { setAcceptModal(viewResult); setViewResult(null); }}>Accept Result</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setRepeatModal(viewResult); setViewResult(null); }}>Repeat Test</Button>
                <Button size="sm" variant="outline" onClick={() => { const p = patientById(viewResult.patientId); if (p) navigatePatient(p, `${base}/documentation`); }}>Add to Note</Button>
                {labApiOn ? (
                  <PendingIntegrationBanner compact reason="Team notification API is not available yet." />
                ) : (
                  <Button size="sm" variant="outline" disabled>Notify Team</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
                {labApiOn ? (
                  <PendingIntegrationBanner compact reason="Result export PDF API is not available yet." />
                ) : (
                  <Button size="sm" variant="outline" disabled>Export PDF</Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Accept modal */}
      <Dialog open={!!acceptModal} onOpenChange={v => !v && setAcceptModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Accept Result</DialogTitle><DialogDescription>{acceptModal?.testName} — {acceptModal?.summary}</DialogDescription></DialogHeader>
          {labApiOn ? (
            <PendingIntegrationBanner reason="Doctor result acceptance API is not available yet. Critical findings can be acknowledged from the Critical tab." />
          ) : (
            <>
              <div className="space-y-3">
                <div><Label>Doctor acknowledgement *</Label><Input value={acceptForm.acknowledgement} onChange={e => setAcceptForm(f => ({ ...f, acknowledgement: e.target.value }))} placeholder="I have reviewed this result…" /></div>
                <div><Label>Clinical interpretation</Label><Textarea rows={2} value={acceptForm.interpretation} onChange={e => setAcceptForm(f => ({ ...f, interpretation: e.target.value }))} /></div>
                <div><Label>Action taken</Label><Input value={acceptForm.actionTaken} onChange={e => setAcceptForm(f => ({ ...f, actionTaken: e.target.value }))} /></div>
                <div><Label>Follow-up plan</Label><Input value={acceptForm.followUp} onChange={e => setAcceptForm(f => ({ ...f, followUp: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAcceptModal(null)}>Cancel</Button>
                <Button variant="outline" onClick={() => acceptResult(true)}>Accept & Add to Note</Button>
                <Button onClick={() => acceptResult(false)}>Accept Result</Button>
              </DialogFooter>
            </>
          )}
          {labApiOn && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcceptModal(null)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Repeat modal */}
      <Dialog open={!!repeatModal} onOpenChange={v => !v && setRepeatModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Repeat Investigation</DialogTitle></DialogHeader>
          {repeatModal && (
            <div className="space-y-3 text-sm">
              <div className="p-2 bg-muted/30 rounded"><b>Patient:</b> {repeatModal.patientName}<br /><b>Original:</b> {repeatModal.testName} — {repeatModal.summary}</div>
              <div><Label>Reason for repeat *</Label><Textarea rows={2} value={repeatForm.reason} onChange={e => setRepeatForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div><Label>Priority</Label>
                <Select value={repeatForm.priority} onValueChange={v => setRepeatForm(f => ({ ...f, priority: v as typeof repeatForm.priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Routine', 'Urgent', 'Emergency'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Clinical indication</Label><Input value={repeatForm.indication} onChange={e => setRepeatForm(f => ({ ...f, indication: e.target.value }))} /></div>
              <div><Label>Billing type</Label><Input value={repeatForm.billing} onChange={e => setRepeatForm(f => ({ ...f, billing: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepeatModal(null)}>Cancel</Button>
            <Button onClick={sendRepeat}><Repeat className="h-4 w-4 mr-1" />Send Repeat Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select patient */}
      <Dialog open={selectPatientOpen} onOpenChange={setSelectPatientOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Select Patient</DialogTitle></DialogHeader>
          <Input placeholder="Search name, hospital no., phone, NHIA, NIN…" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="mb-3" />
          {patientSearchLoading && (
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</p>
          )}
          {!patientsApiOn && (
            <PendingIntegrationBanner reason="Patient search API is not configured." className="mb-3" />
          )}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {patientsApiOn && patientSearch.trim().length < 2 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Type at least 2 characters to search patients.</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No patient found.</p>
            ) : filteredPatients.map(p => (
              <button key={p.id} type="button" className="w-full text-left p-3 border rounded-lg hover:bg-muted" onClick={() => {
                setSelectedPatient(p); setDocPatientContext(toCtx(p)); setSelectPatientOpen(false);
              }}>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.clinic}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare detail */}
      <Dialog open={!!compareResult} onOpenChange={v => !v && setCompareResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historical Comparison — {compareResult?.testName}</DialogTitle></DialogHeader>
          {compareResult?.history && (
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase text-muted-foreground"><th className="text-left py-2">Date</th><th className="text-left">Value</th><th className="text-left">Flag</th></tr></thead>
              <tbody>{compareResult.history.map(h => (
                <tr key={h.date} className="border-t"><td className="py-2">{h.date}</td><td className="font-mono">{h.value}</td><td><StatusPill tone={flagTone(h.flag)}>{h.flag}</StatusPill></td></tr>
              ))}</tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 border-t lg:hidden flex gap-2 z-40">
        <Button className="flex-1" variant="outline" onClick={() => setSelectPatientOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Patient</Button>
        <Button className="flex-1" onClick={() => { setTab('critical'); setKpiFilter('critical'); }}><Siren className="h-4 w-4 mr-1" />Critical</Button>
      </div>
    </Shell>
  );
};
