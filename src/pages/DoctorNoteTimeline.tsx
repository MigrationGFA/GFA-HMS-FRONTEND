import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setDocPatientContext, getDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import {
  getPatientClinicalSummary,
  listPatientEncounterNotes,
  isEncountersApiEnabled,
  type PatientEncounterNoteItem,
  type ClinicalSummary,
} from '@/lib/api/encounters';
import { searchPersons, isPatientsApiEnabled, type PersonRecord } from '@/lib/api/patients';
import { ApiError } from '@/lib/api/client';
import {
  Activity, Stethoscope, Eye, Printer, RefreshCw, Search, Download, Plus, Clock,
  FileText, FlaskConical, ScanLine, Pill, BedDouble, Send, GitCompare, History,
  AlertTriangle, CheckCircle2, ArrowUpDown, UserPlus, LogOut, ArrowRightLeft,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const AUDIT_KEY = 'gfa_doc_timeline_audit_v1';
const RECENT_KEY = 'gfa_doc_timeline_recent_v1';
const FILTER_KEY = 'gfa_doc_timeline_filters_v1';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Doctor Note Timeline">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

type TimelineSource =
  | 'Doctors' | 'Nurses' | 'Psychology' | 'Lab' | 'Imaging' | 'Pharmacy'
  | 'Admissions' | 'Referrals' | 'Transfers' | 'Ward Round' | 'Emergency'
  | 'Discharge' | 'Billing' | 'Audit';

type TimelinePatient = {
  id: string; name: string; hospitalId: string; phone: string; nin: string; nhiaNo: string;
  age: number; gender: string; clinic: string; status: 'Outpatient' | 'Inpatient' | 'Emergency' | 'Discharged';
  ward?: string; bed?: string; allergies: string; diagnosis: string; medications: string;
  lastVisit: string; consultant: string;
};

type TimelineEntry = {
  id: string; patientId: string; iso: string; dateLabel: string; timeLabel: string;
  author: string; role: string; department: string; source: TimelineSource;
  clinic: string; entryType: string; summary: string; fullContent: string;
  status: string; statusTone: string; priority?: string; priorityTone?: string;
  encounterId: string; episodeId: string; signed: boolean; version: number;
  diagnosis?: string; prescription?: string; labResult?: string; imagingResult?: string;
  attachments?: string[]; route: string;
  addenda: { date: string; author: string; reason: string; note: string }[];
  audit: {
    createdBy: string; createdAt: string; editedBy?: string; editedAt?: string;
    viewedBy: string[]; printedBy: string[]; exportedBy: string[]; signedBy?: string;
  };
  critical?: boolean; abnormal?: boolean;
};

const FILTER_CHIPS: (TimelineSource | 'All')[] = [
  'All', 'Doctors', 'Nurses', 'Psychology', 'Lab', 'Imaging', 'Pharmacy',
  'Admissions', 'Referrals', 'Transfers', 'Ward Round', 'Emergency', 'Discharge', 'Billing', 'Audit',
];

function noteFullContent(note: PatientEncounterNoteItem['note']): string {
  const lines = [
    note.chiefComplaint && `Chief Complaint: ${note.chiefComplaint}`,
    note.history && `History: ${note.history}`,
    note.pastMedicalHistory && `Past Medical History: ${note.pastMedicalHistory}`,
    note.drugHistory && `Drug History: ${note.drugHistory}`,
    note.allergyHistory && `Allergy History: ${note.allergyHistory}`,
    note.familyHistory && `Family History: ${note.familyHistory}`,
    note.socialHistory && `Social History: ${note.socialHistory}`,
    note.examination && `Examination: ${note.examination}`,
    note.assessment && `Assessment: ${note.assessment}`,
    note.plan && `Plan: ${note.plan}`,
    note.followUpPlan && `Follow-Up: ${note.followUpPlan}`,
  ].filter(Boolean);
  return lines.join('\n') || 'Clinical note';
}

function mapNoteToTimelineEntry(item: PatientEncounterNoteItem): TimelineEntry {
  const iso = item.startedAt;
  const d = new Date(iso);
  const dateLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const signed = item.status === 'Completed';
  return {
    id: `enc-${item.encounterId}`,
    patientId: String(item.personId),
    iso,
    dateLabel,
    timeLabel,
    author: item.doctorName,
    role: 'Doctor',
    department: 'Doctors',
    source: 'Doctors',
    clinic: item.clinic ?? '—',
    entryType: item.status === 'In Consultation' ? 'Consultation draft' : 'Consultation note',
    summary: item.summary,
    fullContent: noteFullContent(item.note),
    status: item.status,
    statusTone: signed ? 'green' : item.status === 'In Consultation' ? 'blue' : 'amber',
    priority: item.priority ?? undefined,
    priorityTone: item.priority === 'Emergency' ? 'red' : item.priority === 'Urgent' ? 'amber' : 'green',
    encounterId: String(item.encounterId),
    episodeId: item.queueNo ?? `TRIAGE-${item.triageId}`,
    signed,
    version: item.version,
    diagnosis: item.note.assessment || undefined,
    route: `${base}/documentation`,
    addenda: [],
    attachments: [],
    audit: {
      createdBy: item.doctorName,
      createdAt: `${dateLabel} ${timeLabel}`,
      viewedBy: [],
      printedBy: [],
      exportedBy: [],
      signedBy: signed ? item.doctorName : undefined,
    },
  };
}

function summaryToTimelinePatient(summary: ClinicalSummary, personId: number): TimelinePatient {
  const d = summary.demographics;
  return {
    id: String(personId),
    name: d.name,
    hospitalId: d.mrn,
    phone: d.phone ?? '',
    nin: '',
    nhiaNo: d.nhisNo ?? '',
    age: d.age ?? 0,
    gender: d.sex ?? '',
    clinic: summary.currentVisit?.clinic ?? 'General OPD',
    status: 'Outpatient',
    allergies: summary.allergies.length ? summary.allergies.join('; ') : 'None recorded',
    diagnosis: summary.previousDiagnoses[0]?.label ?? 'None recorded',
    medications: summary.activeMeds.length
      ? summary.activeMeds.slice(0, 5).map((m) => [m.drugName, m.dose].filter(Boolean).join(' ')).join(', ')
      : 'None recorded',
    lastVisit: summary.lastVisit ?? '—',
    consultant: summary.recentNotes[0]?.doctorName ?? '—',
  };
}

function personToTimelinePatient(p: PersonRecord): TimelinePatient {
  return {
    id: String(p.personId),
    name: [p.firstName, p.lastName].filter(Boolean).join(' ') || `PERSON ${p.personId}`,
    hospitalId: p.hospitalNo || `PERSON_${p.personId}`,
    phone: p.patientPhoneNo ?? '',
    nin: p.identityNo ?? '',
    nhiaNo: '',
    age: 0,
    gender: p.sex ?? '',
    clinic: 'General OPD',
    status: 'Outpatient',
    allergies: '—',
    diagnosis: '—',
    medications: '—',
    lastVisit: '—',
    consultant: '—',
  };
}

function logTimelineAudit(action: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    arr.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(arr.slice(0, 300)));
  } catch { /* noop */ }
}

function saveRecent(patientId: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [patientId, ...arr.filter(id => id !== patientId)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function readRecentPatients(): TimelinePatient[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY + '_meta');
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, TimelinePatient>;
    return readRecent().map((id) => map[id]).filter(Boolean);
  } catch {
    return [];
  }
}

function saveRecentPatientMeta(p: TimelinePatient) {
  try {
    const raw = localStorage.getItem(RECENT_KEY + '_meta');
    const map = raw ? (JSON.parse(raw) as Record<string, TimelinePatient>) : {};
    map[p.id] = p;
    localStorage.setItem(RECENT_KEY + '_meta', JSON.stringify(map));
  } catch { /* noop */ }
}

export const DocTimeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'doctor';
  const canAddAddendum = ['doctor', 'admin', 'superadmin'].includes(role);
  const canCreateNote = role !== 'patient';
  const readOnly = role === 'patient';

  const [patient, setPatient] = useState<TimelinePatient | null>(null);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<TimelineSource | 'All'>('All');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [groupBy, setGroupBy] = useState<'date' | 'encounter' | 'episode' | 'department' | 'entryType'>('date');
  const [advStart, setAdvStart] = useState('');
  const [advEnd, setAdvEnd] = useState('');
  const [advDept, setAdvDept] = useState('all');
  const [advClinic, setAdvClinic] = useState('all');
  const [advEntryType, setAdvEntryType] = useState('all');
  const [advAuthor, setAdvAuthor] = useState('');
  const [advSigned, setAdvSigned] = useState('all');
  const [advCritical, setAdvCritical] = useState(false);

  const [patientModal, setPatientModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<TimelinePatient[]>([]);
  const [apiSearching, setApiSearching] = useState(false);
  const [detailEntry, setDetailEntry] = useState<TimelineEntry | null>(null);
  const [auditEntry, setAuditEntry] = useState<TimelineEntry | null>(null);
  const [addendumEntry, setAddendumEntry] = useState<TimelineEntry | null>(null);
  const [addendumReason, setAddendumReason] = useState('');
  const [addendumNote, setAddendumNote] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}');
      if (saved.sourceFilter) setSourceFilter(saved.sourceFilter);
      if (saved.search) setSearch(saved.search);
      if (saved.sortOrder) setSortOrder(saved.sortOrder);
      if (saved.groupBy) setGroupBy(saved.groupBy);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify({ sourceFilter, search, sortOrder, groupBy }));
  }, [sourceFilter, search, sortOrder, groupBy]);

  const loadPatientTimeline = useCallback(async (personId: number, seed?: TimelinePatient) => {
    if (!isEncountersApiEnabled()) {
      setEntries([]);
      setEntriesError('Backend API is not configured');
      toast.error('Backend API is not configured');
      return;
    }
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const [summary, notes] = await Promise.all([
        getPatientClinicalSummary(personId),
        listPatientEncounterNotes(personId, { page: 1, limit: 100 }),
      ]);
      const tp = summaryToTimelinePatient(summary, personId);
      if (seed?.clinic && tp.clinic === 'General OPD') tp.clinic = seed.clinic;
      setPatient(tp);
      setEntries(notes.items.map(mapNoteToTimelineEntry));
      saveRecent(tp.id);
      saveRecentPatientMeta(tp);
      logTimelineAudit(`Selected patient ${tp.name} (${tp.hospitalId})`);
      toast.success(`Timeline loaded for ${tp.name}`);
    } catch (err) {
      setEntries([]);
      setEntriesError(err instanceof ApiError ? err.message : 'Could not load timeline');
      toast.error(err instanceof ApiError ? err.message : 'Could not load timeline');
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  const selectPatient = useCallback((p: TimelinePatient) => {
    const personId = Number(p.id);
    if (!Number.isFinite(personId) || personId <= 0) {
      toast.error('Invalid patient id');
      return;
    }
    setPatientModal(false);
    setPatientSearch('');
    void loadPatientTimeline(personId, p);
  }, [loadPatientTimeline]);

  // Prefill from workspace patient context when available
  useEffect(() => {
    const ctx = getDocPatientContext();
    if (!ctx) return;
    const personId = Number(ctx.id);
    if (!Number.isFinite(personId) || personId <= 0) return;
    void loadPatientTimeline(personId, {
      id: ctx.id,
      name: ctx.name,
      hospitalId: ctx.hospitalId,
      phone: ctx.phone ?? '',
      nin: ctx.nin ?? '',
      nhiaNo: ctx.nhiaNo ?? '',
      age: ctx.age ?? 0,
      gender: ctx.gender ?? '',
      clinic: ctx.clinic ?? 'General OPD',
      status: 'Outpatient',
      allergies: ctx.allergies ?? '—',
      diagnosis: ctx.diagnosis ?? '—',
      medications: ctx.medications ?? '—',
      lastVisit: '—',
      consultant: '—',
    });
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPatientsApiEnabled() || patientSearch.trim().length < 2) {
      setApiSearchResults([]);
      setApiSearching(false);
      return;
    }
    setApiSearching(true);
    const t = window.setTimeout(() => {
      searchPersons(patientSearch.trim())
        .then((rows) => setApiSearchResults(rows.map(personToTimelinePatient)))
        .catch(() => setApiSearchResults([]))
        .finally(() => setApiSearching(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [patientSearch]);

  const refresh = () => {
    if (patient) {
      const personId = Number(patient.id);
      if (Number.isFinite(personId)) void loadPatientTimeline(personId, patient);
    }
    setRefreshKey(k => k + 1);
    logTimelineAudit('Timeline refreshed');
  };

  const filtered = useMemo(() => {
    let list = [...entries];
    if (sourceFilter !== 'All') list = list.filter(e => e.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        `${e.summary} ${e.author} ${e.entryType} ${e.department} ${e.diagnosis ?? ''} ${e.prescription ?? ''} ${e.labResult ?? ''}`.toLowerCase().includes(q));
    }
    if (advStart) list = list.filter(e => e.iso.slice(0, 10) >= advStart);
    if (advEnd) list = list.filter(e => e.iso.slice(0, 10) <= advEnd);
    if (advDept !== 'all') list = list.filter(e => e.department.toLowerCase().includes(advDept.toLowerCase()));
    if (advClinic !== 'all') list = list.filter(e => e.clinic === advClinic);
    if (advEntryType !== 'all') list = list.filter(e => e.entryType === advEntryType);
    if (advAuthor.trim()) list = list.filter(e => e.author.toLowerCase().includes(advAuthor.toLowerCase()));
    if (advSigned === 'signed') list = list.filter(e => e.signed);
    if (advSigned === 'unsigned') list = list.filter(e => !e.signed);
    if (advCritical) list = list.filter(e => e.critical || e.abnormal);
    list.sort((a, b) => sortOrder === 'newest' ? b.iso.localeCompare(a.iso) : a.iso.localeCompare(b.iso));
    return list;
  }, [entries, sourceFilter, search, sortOrder, advStart, advEnd, advDept, advClinic, advEntryType, advAuthor, advSigned, advCritical, refreshKey]);

  const kpis = useMemo(() => ({
    total: entries.length,
    doctors: entries.filter(e => e.source === 'Doctors').length,
    nursing: entries.filter(e => e.source === 'Nurses').length,
    investigations: entries.filter(e => ['Lab', 'Imaging'].includes(e.source)).length,
    prescriptions: entries.filter(e => e.source === 'Pharmacy' || e.prescription).length,
    admissions: entries.filter(e => ['Admissions', 'Transfers', 'Ward Round', 'Discharge'].includes(e.source)).length,
  }), [entries]);

  const highlights = useMemo(() => {
    if (!patient) return [];
    const items: { label: string; tone: string; entryId?: string }[] = [];
    if (patient.allergies && patient.allergies !== 'None') items.push({ label: `Allergy: ${patient.allergies}`, tone: 'red' });
    entries.filter(e => e.critical).forEach(e => items.push({ label: `Critical: ${e.summary.slice(0, 50)}…`, tone: 'red', entryId: e.id }));
    entries.filter(e => e.abnormal && !e.critical).slice(0, 2).forEach(e => items.push({ label: `Abnormal: ${e.summary.slice(0, 45)}…`, tone: 'amber', entryId: e.id }));
    if (patient.medications.includes('Lithium')) items.push({ label: 'High-risk medication: Lithium — monitor levels', tone: 'amber', entryId: entries.find(e => e.labResult?.includes('Lithium'))?.id });
    if (entries.some(e => e.entryType === 'Discharge draft' && e.status === 'Draft')) items.push({ label: 'Pending discharge summary', tone: 'blue', entryId: entries.find(e => e.entryType === 'Discharge draft')?.id });
    if (entries.some(e => e.status === 'Pending')) items.push({ label: 'Outstanding unpaid investigations', tone: 'amber', entryId: entries.find(e => e.status === 'Pending')?.id });
    return items;
  }, [patient, entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    filtered.forEach(e => {
      let key: string;
      switch (groupBy) {
        case 'encounter': key = e.encounterId; break;
        case 'episode': key = e.episodeId; break;
        case 'department': key = e.department; break;
        case 'entryType': key = e.entryType; break;
        default: key = e.dateLabel;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered, groupBy]);

  const entryTypes = useMemo(() => [...new Set(entries.map(e => e.entryType))], [entries]);

  const toPatientContext = useCallback((extra?: Partial<DocPatientContext>): DocPatientContext | null => {
    if (!patient) return null;
    return {
      id: patient.id,
      name: patient.name,
      hospitalId: patient.hospitalId,
      phone: patient.phone,
      nin: patient.nin,
      nhiaNo: patient.nhiaNo,
      age: patient.age,
      gender: patient.gender,
      clinic: patient.clinic,
      allergies: patient.allergies,
      diagnosis: patient.diagnosis,
      medications: patient.medications,
      ...extra,
    };
  }, [patient]);

  const navigateWithPatient = useCallback((path: string, extra?: Partial<DocPatientContext>) => {
    const ctx = toPatientContext(extra);
    if (!ctx) return;
    setDocPatientContext(ctx);
    logTimelineAudit(`Navigated to ${path} for ${ctx.name} (${ctx.hospitalId})`);
    navigate(path, { state: { patient: ctx, returnTo: `${base}/timeline` } });
    toast.info(`Opened for ${ctx.name}`, { description: ctx.hospitalId });
  }, [navigate, toPatientContext]);

  const openEncounter = (e: TimelineEntry) => {
    navigateWithPatient(e.route, { entryType: e.entryType, noteType: e.entryType, encounterId: e.encounterId });
  };

  const saveAddendum = () => {
    if (!addendumEntry || !addendumReason.trim() || !addendumNote.trim()) { toast.error('Reason and note are required'); return; }
    if (!canAddAddendum) { toast.error('You do not have permission to add addendum'); return; }
    const addendum = { date: new Date().toLocaleString(), author: user?.name ?? 'Dr. User', reason: addendumReason, note: addendumNote };
    setEntries(prev => prev.map(e => e.id === addendumEntry.id ? { ...e, addenda: [...e.addenda, addendum] } : e));
    logTimelineAudit(`Addendum added to ${addendumEntry.id}: ${addendumReason}`);
    toast.success('Addendum saved and locked');
    setAddendumEntry(null); setAddendumReason(''); setAddendumNote('');
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const recentPatients = readRecentPatients();
  const searchResults = apiSearchResults;

  const compareEntries = compareIds.map(id => entries.find(e => e.id === id)).filter(Boolean) as TimelineEntry[];

  if (!patient) {
    return (
      <Shell>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-display font-bold">Doctor Note Timeline</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mt-1">
              Chronological patient history across doctors, nurses, lab, imaging, pharmacy, psychology, admissions, referrals, and discharge workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPatientModal(true)}><Search className="h-4 w-4 mr-1.5" />Select Patient</Button>
            <Button variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          </div>
        </div>
        <Card className="text-center py-16">
          <Activity className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a patient to view complete clinical timeline</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Search by name, hospital number, phone, NIN, or NHIA number.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPatientModal(true)}><Search className="h-4 w-4 mr-1.5" />Search Patient</Button>
            <Button variant="outline" onClick={() => { if (recentPatients[0]) selectPatient(recentPatients[0]); else toast.info('No recently viewed patients'); }}><History className="h-4 w-4 mr-1.5" />Recently Viewed</Button>
            <Button variant="outline" onClick={() => setPatientModal(true)}><UserPlus className="h-4 w-4 mr-1.5" />Search Patients</Button>
          </div>
          {recentPatients.length > 0 && (
            <div className="mt-8 text-left max-w-lg mx-auto">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Recently Viewed</div>
              <ul className="space-y-1">
                {recentPatients.map(p => (
                  <li key={p.id}>
                    <button type="button" onClick={() => selectPatient(p)} className="w-full text-left p-2 border rounded-lg hover:bg-muted/50 text-sm">
                      <span className="font-medium">{p.name}</span> · <span className="text-muted-foreground">{p.hospitalId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <PatientSearchModal open={patientModal} onOpenChange={setPatientModal} search={patientSearch} setSearch={setPatientSearch} results={searchResults} searching={apiSearching} onSelect={selectPatient} recent={recentPatients} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold">Doctor Note Timeline</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Chronological doctor consultation notes for the selected patient (live from encounters).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPatientModal(true)}><Search className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button variant="outline" size="sm" onClick={() => setPrintPreview(true)}><Printer className="h-4 w-4 mr-1" />Print Timeline</Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
          <Button variant="outline" size="sm" onClick={() => { logTimelineAudit('Excel export'); toast.success('Excel export downloaded'); }}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
          <Button size="sm" onClick={() => navigateWithPatient(`${base}/documentation`)} disabled={readOnly}><Plus className="h-4 w-4 mr-1" />Add Clinical Note</Button>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>
      </div>

      {/* Patient summary */}
      <Card className="mb-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Patient Name</div><div className="font-semibold text-base">{patient.name}</div></div>
          <div><div className="text-xs text-muted-foreground">Hospital No.</div><div className="font-medium">{patient.hospitalId}</div></div>
          <div><div className="text-xs text-muted-foreground">Age / Gender</div><div>{patient.age} / {patient.gender}</div></div>
          <div><div className="text-xs text-muted-foreground">Clinic</div><StatusPill tone={patient.clinic === 'OPC' ? 'purple' : 'blue'}>{patient.clinic}</StatusPill></div>
          <div><div className="text-xs text-muted-foreground">Current Status</div><StatusPill tone={patient.status === 'Inpatient' ? 'amber' : patient.status === 'Emergency' ? 'red' : 'green'}>{patient.status}</StatusPill></div>
          {patient.ward && <div><div className="text-xs text-muted-foreground">Ward / Bed</div><div>{patient.ward} · {patient.bed}</div></div>}
          <div><div className="text-xs text-muted-foreground">Allergies</div><div className="text-rose-700 font-medium">{patient.allergies}</div></div>
          <div><div className="text-xs text-muted-foreground">Active Diagnosis</div><div>{patient.diagnosis}</div></div>
          <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Active Medications</div><div>{patient.medications}</div></div>
          <div><div className="text-xs text-muted-foreground">Last Visit</div><div>{patient.lastVisit}</div></div>
          <div><div className="text-xs text-muted-foreground">Consultant</div><div>{patient.consultant}</div></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Button size="sm" variant="outline" onClick={() => toast.info('Opening EMR…')}><FileText className="h-3.5 w-3.5 mr-1" />Open EMR</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/workspace`, { autoStartConsult: true })}><Stethoscope className="h-3.5 w-3.5 mr-1" />Start Consultation</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/prescriptions`)}><Pill className="h-3.5 w-3.5 mr-1" />Prescription</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/lab`)}><FlaskConical className="h-3.5 w-3.5 mr-1" />Lab Request</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/imaging`)}><ScanLine className="h-3.5 w-3.5 mr-1" />Imaging Request</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/admission`)}><BedDouble className="h-3.5 w-3.5 mr-1" />Admission</Button>
          <Button size="sm" variant="outline" onClick={() => navigateWithPatient(`${base}/referrals`, { openReferral: true })}><Send className="h-3.5 w-3.5 mr-1" />Referral</Button>
        </div>
      </Card>

      {/* Clinical highlights */}
      {highlights.length > 0 && (
        <Card className="mb-4 border-amber-200/60 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="font-semibold text-sm">Clinical Highlights</span></div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((h, i) => (
              <button key={i} type="button" onClick={() => h.entryId && setDetailEntry(entries.find(e => e.id === h.entryId) ?? null)}
                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 ${tone(h.tone)}`}>{h.label}</button>
            ))}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total Timeline Entries" value={String(kpis.total)} icon={Activity} tone="blue" />
        <SummaryCard title="Doctor Notes" value={String(kpis.doctors)} icon={Stethoscope} tone="purple" />
        <SummaryCard title="Nursing Notes" value={String(kpis.nursing)} icon={Activity} tone="teal" />
        <SummaryCard title="Investigations" value={String(kpis.investigations)} icon={FlaskConical} tone="green" />
        <SummaryCard title="Prescriptions" value={String(kpis.prescriptions)} icon={Pill} tone="teal" />
        <SummaryCard title="Admissions" value={String(kpis.admissions)} icon={BedDouble} tone="amber" />
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_CHIPS.map(f => (
            <Button key={f} size="sm" variant={sourceFilter === f ? 'default' : 'outline'} onClick={() => setSourceFilter(f)}>{f}</Button>
          ))}
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search notes, diagnosis, medication, lab result, imaging report, author, department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 text-sm">
          <div><Label className="text-xs">Start Date</Label><Input type="date" value={advStart} onChange={e => setAdvStart(e.target.value)} /></div>
          <div><Label className="text-xs">End Date</Label><Input type="date" value={advEnd} onChange={e => setAdvEnd(e.target.value)} /></div>
          <div><Label className="text-xs">Department</Label>
            <Select value={advDept} onValueChange={setAdvDept}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{['Psychiatry','Nursing','Laboratory','Radiology','Pharmacy','Records'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label className="text-xs">Clinic</Label>
            <Select value={advClinic} onValueChange={setAdvClinic}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="OPC">OPC</SelectItem><SelectItem value="GMPC">GMPC</SelectItem><SelectItem value="Ward">Ward</SelectItem></SelectContent></Select>
          </div>
          <div><Label className="text-xs">Entry Type</Label>
            <Select value={advEntryType} onValueChange={setAdvEntryType}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{entryTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label className="text-xs">Author</Label><Input className="h-9" placeholder="Author name" value={advAuthor} onChange={e => setAdvAuthor(e.target.value)} /></div>
          <div><Label className="text-xs">Signed Status</Label>
            <Select value={advSigned} onValueChange={setAdvSigned}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="signed">Signed</SelectItem><SelectItem value="unsigned">Unsigned</SelectItem></SelectContent></Select>
          </div>
          <div className="flex items-end"><Button size="sm" variant={advCritical ? 'default' : 'outline'} onClick={() => setAdvCritical(v => !v)}>Abnormal / Critical</Button></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
          <Select value={groupBy} onValueChange={v => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Group by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Group by Date</SelectItem>
              <SelectItem value="encounter">Group by Encounter</SelectItem>
              <SelectItem value="episode">Group by Episode</SelectItem>
              <SelectItem value="department">Group by Department</SelectItem>
              <SelectItem value="entryType">Group by Entry Type</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}>
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </Button>
          <Button size="sm" variant={compareMode ? 'default' : 'outline'} onClick={() => { setCompareMode(v => !v); setCompareIds([]); }}>
            <GitCompare className="h-3.5 w-3.5 mr-1" />Compare Notes
          </Button>
          {compareMode && compareIds.length === 2 && (
            <Button size="sm" onClick={() => setCompareOpen(true)}>Open Comparison</Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
        </div>
      </Card>

      {/* Timeline */}
      {entriesLoading ? (
        <Card className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading encounter notes…
        </Card>
      ) : entriesError ? (
        <Card className="text-center py-12">
          <p className="text-rose-600 mb-4">{entriesError}</p>
          <Button variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1.5" />Retry</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted-foreground mb-4">No encounter notes found for this patient yet.</p>
          <Button onClick={() => navigateWithPatient(`${base}/workspace`, { autoStartConsult: true })}><Stethoscope className="h-4 w-4 mr-1.5" />Start First Consultation</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupKey, items]) => (
            <div key={groupKey}>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 sticky top-16 bg-background/95 py-1 z-10">
                {groupBy === 'date' ? groupKey : `${groupBy}: ${groupKey}`}
              </div>
              <div className="relative border-l-2 border-primary/20 ml-3 space-y-4 pl-6">
                {items.map(entry => (
                  <div key={entry.id} className={`relative bg-card border rounded-xl p-4 shadow-sm ${compareMode && compareIds.includes(entry.id) ? 'ring-2 ring-primary' : ''} ${entry.critical ? 'border-rose-300' : ''}`}>
                    <span className="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-semibold text-sm">{entry.dateLabel} · {entry.timeLabel}</div>
                        <div className="text-sm text-muted-foreground">{entry.author} · {entry.role}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <StatusPill tone={entry.clinic === 'OPC' ? 'purple' : entry.clinic === 'GMPC' ? 'blue' : 'sky'}>{entry.clinic}</StatusPill>
                        <StatusPill tone="blue">{entry.entryType}</StatusPill>
                        <StatusPill tone={entry.statusTone}>{entry.status}</StatusPill>
                        {entry.priority && <StatusPill tone={entry.priorityTone ?? 'amber'}>{entry.priority}</StatusPill>}
                        {compareMode && (
                          <Button size="sm" variant={compareIds.includes(entry.id) ? 'default' : 'outline'} className="h-6 text-xs" onClick={() => toggleCompare(entry.id)}>Select</Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{entry.summary}</p>
                    <div className="text-xs text-muted-foreground mb-3">Encounter: {entry.encounterId} · {entry.source} · {entry.department}</div>
                    {entry.addenda.length > 0 && (
                      <div className="mb-3 pl-3 border-l-2 border-amber-300 text-xs space-y-1">
                        {entry.addenda.map((a, i) => (
                          <div key={i}><span className="font-medium">Addendum ({a.date}):</span> {a.note}</div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setDetailEntry(entry); logTimelineAudit(`Viewed ${entry.id}`); }}><Eye className="h-3.5 w-3.5 mr-1" />View Details</Button>
                      <Button size="sm" variant="outline" onClick={() => openEncounter(entry)}><ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Open Encounter</Button>
                      <Button size="sm" variant="ghost" onClick={() => { logTimelineAudit(`Printed ${entry.id}`); toast.success('Entry sent to printer'); }}><Printer className="h-3.5 w-3.5" /></Button>
                      {entry.signed && canAddAddendum && (
                        <Button size="sm" variant="ghost" onClick={() => setAddendumEntry(entry)}><Plus className="h-3.5 w-3.5 mr-1" />Add Addendum</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setAuditEntry(entry)}><History className="h-3.5 w-3.5 mr-1" />Audit Trail</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals & drawers */}
      <PatientSearchModal open={patientModal} onOpenChange={setPatientModal} search={patientSearch} setSearch={setPatientSearch} results={searchResults} searching={apiSearching} onSelect={selectPatient} recent={recentPatients} />

      <Sheet open={!!detailEntry} onOpenChange={v => !v && setDetailEntry(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{detailEntry?.entryType}</SheetTitle></SheetHeader>
          {detailEntry && (
            <div className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Patient</span><div className="font-medium">{patient.name}</div></div>
                <div><span className="text-muted-foreground">Hospital No.</span><div>{patient.hospitalId}</div></div>
                <div><span className="text-muted-foreground">Author</span><div>{detailEntry.author} ({detailEntry.role})</div></div>
                <div><span className="text-muted-foreground">Department</span><div>{detailEntry.department}</div></div>
                <div><span className="text-muted-foreground">Created</span><div>{detailEntry.dateLabel} {detailEntry.timeLabel}</div></div>
                <div><span className="text-muted-foreground">Version</span><div>v{detailEntry.version}</div></div>
                {detailEntry.audit.signedBy && <div className="col-span-2"><span className="text-muted-foreground">Signed by</span><div>{detailEntry.audit.signedBy}</div></div>}
              </div>
              <div className="border rounded-lg p-3 bg-muted/30 whitespace-pre-wrap text-sm">{detailEntry.fullContent}</div>
              {detailEntry.diagnosis && <div><Label className="text-xs">Linked Diagnosis</Label><div>{detailEntry.diagnosis}</div></div>}
              {detailEntry.prescription && <div><Label className="text-xs">Linked Prescription</Label><div>{detailEntry.prescription}</div></div>}
              {detailEntry.labResult && <div><Label className="text-xs">Lab Result</Label><div>{detailEntry.labResult}</div></div>}
              {detailEntry.imagingResult && <div><Label className="text-xs">Imaging Result</Label><div>{detailEntry.imagingResult}</div></div>}
              {detailEntry.attachments && detailEntry.attachments.length > 0 && (
                <div><Label className="text-xs">Attachments</Label><ul className="list-disc pl-4">{detailEntry.attachments.map(a => <li key={a}>{a}</li>)}</ul></div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => openEncounter(detailEntry)}>Open Full Record</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('PDF exported')}>Export PDF</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Sent to printer')}>Print</Button>
                {detailEntry.signed && canAddAddendum && <Button size="sm" variant="outline" onClick={() => { setAddendumEntry(detailEntry); setDetailEntry(null); }}>Add Addendum</Button>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!auditEntry} onOpenChange={v => !v && setAuditEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Audit Trail — {auditEntry?.entryType}</DialogTitle></DialogHeader>
          {auditEntry && (
            <div className="text-sm space-y-2">
              <div><b>Created by:</b> {auditEntry.audit.createdBy} · {auditEntry.audit.createdAt}</div>
              {auditEntry.audit.editedBy && <div><b>Edited by:</b> {auditEntry.audit.editedBy} · {auditEntry.audit.editedAt}</div>}
              <div><b>Viewed by:</b> {auditEntry.audit.viewedBy.join(', ') || '—'}</div>
              <div><b>Printed by:</b> {auditEntry.audit.printedBy.join(', ') || '—'}</div>
              <div><b>Exported by:</b> {auditEntry.audit.exportedBy.join(', ') || '—'}</div>
              {auditEntry.audit.signedBy && <div><b>Signed by:</b> {auditEntry.audit.signedBy}</div>}
              {auditEntry.addenda.length > 0 && (
                <div className="border-t pt-2"><b>Addendum history:</b>
                  <ul className="list-disc pl-4 mt-1">{auditEntry.addenda.map((a, i) => <li key={i}>{a.date} — {a.author}: {a.reason}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setAuditEntry(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addendumEntry} onOpenChange={v => !v && setAddendumEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Addendum</DialogTitle><DialogDescription>{addendumEntry?.entryType} — {addendumEntry?.dateLabel}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Reason for addendum *</Label><Input value={addendumReason} onChange={e => setAddendumReason(e.target.value)} placeholder="e.g. Correction of medication dose" /></div>
            <div><Label>Addendum note *</Label><Textarea value={addendumNote} onChange={e => setAddendumNote(e.target.value)} rows={4} /></div>
            <div><Label>Doctor signature</Label><Input defaultValue={user?.name ?? 'Dr. User'} readOnly className="bg-muted/40" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddendumEntry(null)}>Cancel</Button>
            <Button onClick={saveAddendum} disabled={!canAddAddendum}>Save Addendum</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Compare Doctor Notes</DialogTitle></DialogHeader>
          {compareEntries.length === 2 && (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {compareEntries.map((e, idx) => (
                <div key={e.id} className="border rounded-lg p-3">
                  <div className="font-semibold mb-1">{e.dateLabel} · {e.author}</div>
                  <StatusPill tone={e.statusTone}>{e.status}</StatusPill>
                  <div className="mt-2 text-xs text-muted-foreground">Diagnosis: {e.diagnosis ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">Rx: {e.prescription ?? '—'}</div>
                  <div className="mt-2 p-2 bg-muted/40 rounded text-xs whitespace-pre-wrap">{e.fullContent}</div>
                  {idx === 1 && compareEntries[0].diagnosis !== e.diagnosis && (
                    <div className="mt-2 text-xs text-amber-700 font-medium">Δ Diagnosis changed from prior note</div>
                  )}
                  {idx === 1 && compareEntries[0].prescription !== e.prescription && (
                    <div className="text-xs text-amber-700 font-medium">Δ Medication plan changed</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={() => setCompareOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printPreview} onOpenChange={setPrintPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Print Timeline Preview</DialogTitle></DialogHeader>
          <div className="border rounded-lg p-6 text-sm space-y-4 bg-white print:text-black">
            <div className="text-center border-b pb-3">
              <div className="font-bold text-base">Federal Neuro-Psychiatric Hospital, Aro</div>
              <div className="text-xs text-muted-foreground">Clinical Timeline Report</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><b>Patient:</b> {patient.name}</div>
              <div><b>Hospital No:</b> {patient.hospitalId}</div>
              <div><b>Date range:</b> {advStart || 'All'} — {advEnd || 'Present'}</div>
              <div><b>Generated:</b> {new Date().toLocaleString()}</div>
            </div>
            <table className="w-full text-xs border">
              <thead className="bg-muted/40"><tr>{['Date','Author','Department','Type','Summary'].map(h => <th key={h} className="border px-2 py-1 text-left">{h}</th>)}</tr></thead>
              <tbody>{filtered.map(e => (
                <tr key={e.id}><td className="border px-2 py-1">{e.dateLabel} {e.timeLabel}</td><td className="border px-2 py-1">{e.author}</td><td className="border px-2 py-1">{e.department}</td><td className="border px-2 py-1">{e.entryType}</td><td className="border px-2 py-1">{e.summary}</td></tr>
              ))}</tbody>
            </table>
            <div className="flex justify-between items-end border-t pt-3">
              <div className="text-xs">Authorised signature: _________________________</div>
              <div className="h-16 w-16 border grid place-items-center text-[10px] text-muted-foreground">QR</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintPreview(false)}>Close</Button>
            <Button onClick={() => { logTimelineAudit('Timeline printed'); window.print(); toast.success('Timeline sent to printer'); }}><Printer className="h-4 w-4 mr-1" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export Timeline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Export scope</Label>
              <Select value={exportScope} onValueChange={setExportScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entries</SelectItem>
                  <SelectItem value="doctors">Doctor notes only</SelectItem>
                  <SelectItem value="range">Selected date range</SelectItem>
                  <SelectItem value="dept">Selected department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { logTimelineAudit(`PDF export (${exportScope})`); toast.success('PDF downloaded'); setExportOpen(false); }}>Export PDF</Button>
            <Button variant="outline" onClick={() => { logTimelineAudit(`Excel export (${exportScope})`); toast.success('Excel downloaded'); setExportOpen(false); }}>Export Excel</Button>
            <Button variant="outline" onClick={() => { logTimelineAudit(`CSV export (${exportScope})`); toast.success('CSV downloaded'); setExportOpen(false); }}>Export CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

function PatientSearchModal({ open, onOpenChange, search, setSearch, results, searching, onSelect, recent }: {
  open: boolean; onOpenChange: (v: boolean) => void; search: string; setSearch: (v: string) => void;
  results: TimelinePatient[]; searching?: boolean; onSelect: (p: TimelinePatient) => void; recent: TimelinePatient[];
}) {
  const list = search.trim().length >= 2 ? results : recent;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Select Patient</DialogTitle><DialogDescription>Search live PERSONS by name, hospital number, or phone</DialogDescription></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search patient…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {searching && <p className="text-xs text-muted-foreground p-2">Searching…</p>}
          {!searching && search.trim().length >= 2 && list.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">No patients found.</p>
          )}
          {!searching && search.trim().length < 2 && list.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Type at least 2 characters to search, or pick a recently viewed patient.</p>
          )}
          {list.map(p => (
            <button key={p.id} type="button" onClick={() => onSelect(p)} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.phone || '—'} · {p.clinic}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
