import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  useApplyDocPatient,
  entryTypeToNoteType,
} from '@/utils/docClinicalPatientContext';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Eye,
  Trash2,
  BookOpen,
  Save,
  Printer,
  History,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import {
  searchPersons,
  isPatientsApiEnabled,
  type PersonRecord,
} from '@/lib/api/patients';
import {
  listClinicalNotes,
  getClinicalNotesSummary,
  createClinicalNote,
  getClinicalNote,
  patchClinicalNote,
  submitClinicalNote,
  signClinicalNote,
  approveClinicalNote,
  returnClinicalNote,
  voidClinicalNote,
  listClinicalNoteVersions,
  isClinicalNotesApiEnabled,
  type ClinicalNoteListItem,
  type ClinicalNoteDetail,
  type ClinicalNoteSummary,
  type ClinicalNoteVersionItem,
} from '@/lib/api/clinicalNotes';
import {
  getPatientClinicalSummary,
  formatVitalsLine,
  isEncountersApiEnabled,
} from '@/lib/api/encounters';
import { ApiError } from '@/lib/api/client';
import {
  upsertClinicalNoteDraft,
  markClinicalNoteDraftSynced,
  getClinicalNoteDraft,
  deleteClinicalNoteDraft,
} from '@/lib/clinicalNoteDrafts';

type NoteType =
  | 'SOAP Note'
  | 'Psychiatric Assessment'
  | 'Follow-Up Note'
  | 'Ward Round Note'
  | 'Emergency Note'
  | 'Progress Note'
  | 'Consultation Note'
  | 'Discharge Draft'
  | 'Procedure Note'
  | 'Referral Note'
  | 'Admission Note'
  | 'Nursing Collaboration Note'
  | 'Medication Review Note'
  | 'Multidisciplinary Team Note';

const TEMPLATE_FIELDS: Record<string, string[]> = {
  'SOAP Note': ['Subjective', 'Objective', 'Assessment', 'Plan'],
  'Psychiatric Assessment': [
    'Presenting Complaint',
    'History of Presenting Complaint',
    'Past Psychiatric History',
    'Medical History',
    'Drug and Alcohol History',
    'Family History',
    'Personal History',
    'Mental State Examination',
    'Risk Assessment',
    'Diagnosis',
    'Management Plan',
  ],
  'Follow-Up Note': [
    'Previous Diagnosis',
    'Current Symptoms',
    'Medication Adherence',
    'Side Effects',
    'Clinical Progress',
    'Current Assessment',
    'Plan',
    'Next Follow-Up Date',
  ],
  'Ward Round Note': [
    'Ward',
    'Bed Number',
    'Consultant / Team',
    'Overnight Events',
    'Current Vitals',
    'Clinical Review',
    'Medication Review',
    'Investigation Review',
    'Plan',
    'Discharge Readiness',
  ],
  'Emergency Note': [
    'Time Seen',
    'Presenting Emergency',
    'Initial Assessment',
    'Vitals',
    'Immediate Intervention',
    'Diagnosis / Impression',
    'Treatment Given',
    'Disposition',
  ],
  'Progress Note': [
    'Date / Time',
    'Current Condition',
    'Clinical Changes',
    'Treatment Response',
    'New Findings',
    'Plan',
  ],
  'Consultation Note': [
    'Chief Complaint',
    'History',
    'Examination',
    'Diagnosis',
    'Treatment Plan',
    'Follow-Up Plan',
  ],
  'Discharge Draft': [
    'Admission Date',
    'Discharge Date',
    'Diagnosis',
    'Summary of Admission',
    'Investigations',
    'Treatment Given',
    'Condition at Discharge',
    'Discharge Medications',
    'Follow-Up Instructions',
    'Doctor Signature',
  ],
  'Procedure Note': [
    'Procedure',
    'Indication',
    'Consent',
    'Findings',
    'Complications',
    'Post-procedure Plan',
  ],
  'Referral Note': [
    'Referring To',
    'Reason for Referral',
    'Clinical Summary',
    'Investigations',
    'Urgency',
  ],
  'Admission Note': [
    'Reason for Admission',
    'History',
    'Examination',
    'Working Diagnosis',
    'Initial Plan',
  ],
  'Nursing Collaboration Note': [
    'Patient Condition',
    'Nursing Concerns',
    'Doctor Response',
    'Joint Plan',
  ],
  'Medication Review Note': [
    'Current Medications',
    'Adherence',
    'Adverse Effects',
    'Changes Made',
    'Rationale',
  ],
  'Multidisciplinary Team Note': [
    'Team Members',
    'Case Summary',
    'Discussion',
    'Decisions',
    'Action Items',
  ],
};

const TEMPLATE_META: Record<string, { desc: string; bestFor: string; updated: string }> = {
  'SOAP Note': { desc: 'Standard structured visit note', bestFor: 'Outpatient consultation', updated: '12 May 2026' },
  'Psychiatric Assessment': { desc: 'Comprehensive psychiatric intake', bestFor: 'New OPC patients', updated: '04 Jun 2026' },
  'Follow-Up Note': { desc: 'Continuity of care follow-up', bestFor: 'Repeat visits', updated: '18 May 2026' },
  'Ward Round Note': { desc: 'Daily inpatient round entry', bestFor: 'Admitted patients', updated: '20 May 2026' },
  'Emergency Note': { desc: 'Rapid emergency documentation', bestFor: 'ER / triage', updated: '22 May 2026' },
  'Progress Note': { desc: 'Interval progress entry', bestFor: 'Inpatient progress', updated: '02 Jun 2026' },
  'Consultation Note': { desc: 'Specialist consult note', bestFor: 'Referrals received', updated: '15 May 2026' },
  'Discharge Draft': { desc: 'Pre-discharge summary draft', bestFor: 'Discharge prep', updated: '07 Jun 2026' },
  'Admission Note': { desc: 'Admission documentation', bestFor: 'New admissions', updated: '10 Jun 2026' },
  'Procedure Note': { desc: 'Procedure documentation', bestFor: 'Bedside procedures', updated: '11 Jun 2026' },
  'Referral Note': { desc: 'Outbound referral letter', bestFor: 'External referrals', updated: '13 Jun 2026' },
  'Medication Review Note': { desc: 'Medication reconciliation', bestFor: 'Polypharmacy review', updated: '14 Jun 2026' },
  'Multidisciplinary Team Note': { desc: 'MDT meeting summary', bestFor: 'Team case reviews', updated: '15 Jun 2026' },
  'Nursing Collaboration Note': { desc: 'Doctor–nurse collaboration', bestFor: 'Ward collaboration', updated: '16 Jun 2026' },
};

type DocPatient = {
  personId: number;
  name: string;
  hospitalNo: string;
  age: number | null;
  gender: string;
  clinic: string;
  visit: string;
  allergies: string;
  dx: string;
  meds: string;
  vitals: string;
  phone: string;
  nhia: string;
  nin: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'local';

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title={`Doctor Clinical · ${title}`}>
    {children}
  </DashboardLayout>
);

const Section = ({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

const StatusPill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function mapPersonToDocPatient(p: PersonRecord, clinic = 'OPC'): DocPatient {
  return {
    personId: p.personId,
    name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unknown',
    hospitalNo: p.hospitalNo || `PID-${p.personId}`,
    age: ageFromDob(p.dateOfBirth),
    gender: p.sex === 'Female' || p.sex === 'F' ? 'F' : p.sex === 'Male' || p.sex === 'M' ? 'M' : p.sex || '—',
    clinic,
    visit: p.patientType || p.regType || 'Visit',
    allergies: '—',
    dx: '—',
    meds: '—',
    vitals: '—',
    phone: p.patientPhoneNo || '',
    nhia: p.nhisNo || '—',
    nin: p.identityNo || '',
  };
}

function statusTone(status: string): string {
  if (status === 'Signed') return 'green';
  if (status === 'Returned for Correction') return 'red';
  if (status === 'Awaiting Review' || status === 'Under Review') return 'amber';
  if (status === 'In Progress') return 'sky';
  return 'blue';
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const DocDocumentation = () => {
  const useApi = isClinicalNotesApiEnabled() && isPatientsApiEnabled();
  const [tab, setTab] = useState('drafts');
  const [kpi, setKpi] = useState<ClinicalNoteSummary | null>(null);
  const [drafts, setDrafts] = useState<ClinicalNoteListItem[]>([]);
  const [completed, setCompleted] = useState<ClinicalNoteListItem[]>([]);
  const [reviews, setReviews] = useState<ClinicalNoteListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState('');

  const [selPatient, setSelPatient] = useState<DocPatient | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [noteType, setNoteType] = useState<NoteType>('SOAP Note');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(1);
  const [noteStatus, setNoteStatus] = useState('Draft');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [signed, setSigned] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [patientResults, setPatientResults] = useState<DocPatient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [preview, setPreview] = useState<ClinicalNoteDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState<ClinicalNoteListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClinicalNoteListItem | null>(null);
  const [returnFor, setReturnFor] = useState<ClinicalNoteListItem | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [reviewItem, setReviewItem] = useState<ClinicalNoteDetail | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [versions, setVersions] = useState<ClinicalNoteVersionItem[]>([]);
  const [versionsMeta, setVersionsMeta] = useState<{ noteNo: string; noteType: string; patientName: string } | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const versionRef = useRef(version);
  versionRef.current = version;
  const autosaveLock = useRef(false);

  const requiredFields = TEMPLATE_FIELDS[noteType] || [];
  const filled = requiredFields.filter((f) => (fields[f] || '').trim().length > 0).length;
  const completion = requiredFields.length ? Math.round((filled / requiredFields.length) * 100) : 0;
  const editable = !signed && noteStatus !== 'Signed' && noteStatus !== 'Awaiting Review' && noteStatus !== 'Under Review';

  const refreshLists = useCallback(async () => {
    if (!useApi) {
      setListError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const [summary, draftRes, doneRes, reviewRes] = await Promise.all([
        getClinicalNotesSummary(),
        listClinicalNotes({ status: 'drafts', mine: true, limit: 100, q: draftSearch || undefined }),
        listClinicalNotes({ status: 'completed', limit: 100 }),
        listClinicalNotes({ status: 'reviews', limit: 100 }),
      ]);
      setKpi(summary);
      setDrafts(draftRes.items);
      setCompleted(doneRes.items);
      setReviews(reviewRes.items);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load clinical notes';
      setListError(msg);
      toast.error(msg);
    } finally {
      setListLoading(false);
    }
  }, [useApi, draftSearch]);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  // Live patient search (name, hospital no, phone, NHIA, NIN)
  useEffect(() => {
    if (!useApi) {
      setPatientResults([]);
      return;
    }
    const q = searchQ.trim();
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearchingPatients(true);
        try {
          const rows = await searchPersons(q);
          setPatientResults(rows.map((p) => mapPersonToDocPatient(p)));
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : 'Patient search failed');
        } finally {
          setSearchingPatients(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQ, useApi]);

  const enrichPatient = useCallback(async (p: DocPatient): Promise<DocPatient> => {
    if (!isEncountersApiEnabled()) return p;
    try {
      const summary = await getPatientClinicalSummary(p.personId);
      return {
        ...p,
        allergies: summary.allergies?.length ? summary.allergies.join(', ') : p.allergies,
        dx: summary.previousDiagnoses?.[0]?.label || p.dx,
        meds: summary.activeMeds?.length
          ? summary.activeMeds.map((m) => m.drugName).slice(0, 3).join(', ')
          : p.meds,
        vitals: formatVitalsLine(summary.vitals) || p.vitals,
        clinic: summary.currentVisit?.clinic || p.clinic,
        visit: summary.currentVisit?.patientType || p.visit,
      };
    } catch {
      return p;
    }
  }, []);

  const selectPatient = async (p: DocPatient) => {
    const enriched = await enrichPatient(p);
    setSelPatient(enriched);
    setNoteId(null);
    setFields({});
    setVersion(1);
    setNoteStatus('Draft');
    setSigned(false);
    setLastSaved(null);
    setSaveStatus('idle');
    setShowSearch(false);
    setTab('new');
    toast.success(`Selected ${enriched.name}`);
  };

  const openNote = async (item: ClinicalNoteListItem) => {
    if (!useApi) return;
    setActionLoading(true);
    try {
      const detail = await getClinicalNote(item.clinicalNoteId);
      const local = await getClinicalNoteDraft(item.clinicalNoteId);
      const useLocal =
        local &&
        local.syncStatus !== 'synced' &&
        (local.version >= detail.version || local.updatedAt > (detail.updatedAt || ''));
      setNoteId(detail.clinicalNoteId);
      setNoteType(detail.noteType as NoteType);
      setFields(useLocal ? local.fields : detail.fields);
      setVersion(useLocal ? local.version : detail.version);
      setNoteStatus(detail.status);
      setSigned(detail.status === 'Signed');
      setLastSaved(detail.updatedAt ? formatWhen(detail.updatedAt) : null);
      setSaveStatus(useLocal ? 'local' : 'saved');
      setSelPatient({
        personId: detail.patient.personId,
        name: detail.patient.name,
        hospitalNo: detail.patient.hospitalNo || `PID-${detail.patient.personId}`,
        age: detail.patient.age,
        gender:
          detail.patient.sex === 'Female' || detail.patient.sex === 'F'
            ? 'F'
            : detail.patient.sex === 'Male' || detail.patient.sex === 'M'
              ? 'M'
              : detail.patient.sex || '—',
        clinic: detail.clinic || 'OPC',
        visit: 'Documentation',
        allergies: '—',
        dx: '—',
        meds: '—',
        vitals: '—',
        phone: detail.patient.phone || '',
        nhia: detail.patient.nhia || '—',
        nin: detail.patient.nin || '',
      });
      setTab('new');
      toast.success(`Loaded ${detail.noteNo}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not open note');
    } finally {
      setActionLoading(false);
    }
  };

  // Debounced autosave (3s) — create if needed, then IndexedDB + PATCH
  useEffect(() => {
    if (!useApi || !selPatient || !editable) return;
    if (!noteId && filled === 0) return;
    const t = window.setTimeout(() => {
      void (async () => {
        if (autosaveLock.current) return;
        autosaveLock.current = true;
        setSaveStatus('saving');
        try {
          let id = noteId;
          let currentVersion = versionRef.current;
          if (id == null) {
            const created = await createClinicalNote({
              personId: selPatient.personId,
              noteType,
              clinic: selPatient.clinic,
              fields,
            });
            id = created.clinicalNoteId;
            currentVersion = created.version;
            setNoteId(id);
            setVersion(created.version);
            setNoteStatus(created.status);
          }
          const idempotencyKey = `cn-${id}-v${currentVersion}-${Date.now()}`;
          await upsertClinicalNoteDraft({
            clinicalNoteId: id,
            fields,
            noteType,
            version: currentVersion,
            syncStatus: 'pending',
            idempotencyKey,
          });
          const updated = await patchClinicalNote(id, {
            version: currentVersion,
            idempotencyKey,
            fields,
            noteType,
          });
          await markClinicalNoteDraftSynced(id, updated.version);
          setVersion(updated.version);
          setNoteStatus(updated.status);
          setLastSaved(new Date().toLocaleTimeString());
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('error');
          if (err instanceof ApiError && err.status === 409 && noteId) {
            toast.error('Note conflict — reloading');
            try {
              const fresh = await getClinicalNote(noteId);
              setFields(fresh.fields);
              setVersion(fresh.version);
              setNoteStatus(fresh.status);
            } catch {
              /* ignore */
            }
          } else {
            toast.error(err instanceof ApiError ? err.message : 'Autosave failed');
          }
        } finally {
          autosaveLock.current = false;
        }
      })();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [fields, noteType, noteId, editable, useApi, selPatient, filled]);

  useEffect(() => {
    const dirty = selPatient && filled > 0 && !signed;
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [selPatient, filled, signed]);

  useEffect(() => {
    if (tab !== 'versions' || !noteId || !useApi) return;
    setVersionsLoading(true);
    void (async () => {
      try {
        const res = await listClinicalNoteVersions(noteId);
        setVersions(res.items);
        setVersionsMeta({
          noteNo: res.noteNo,
          noteType: res.noteType,
          patientName: res.patientName,
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not load versions');
      } finally {
        setVersionsLoading(false);
      }
    })();
  }, [tab, noteId, useApi]);

  const newDoc = () => {
    setSelPatient(null);
    setNoteId(null);
    setFields({});
    setVersion(1);
    setNoteStatus('Draft');
    setSigned(false);
    setLastSaved(null);
    setSaveStatus('idle');
    setSearchQ('');
    setTab('new');
  };

  const ensureNote = async (): Promise<number | null> => {
    if (!useApi) {
      toast.error('Backend API is not configured');
      return null;
    }
    if (!selPatient) {
      toast.error('Select a patient first');
      return null;
    }
    if (noteId) return noteId;
    setActionLoading(true);
    try {
      const created = await createClinicalNote({
        personId: selPatient.personId,
        noteType,
        clinic: selPatient.clinic,
        fields,
      });
      setNoteId(created.clinicalNoteId);
      setVersion(created.version);
      setNoteStatus(created.status);
      setLastSaved(new Date().toLocaleTimeString());
      setSaveStatus('saved');
      await upsertClinicalNoteDraft({
        clinicalNoteId: created.clinicalNoteId,
        fields: created.fields,
        noteType: created.noteType,
        version: created.version,
        syncStatus: 'synced',
      });
      return created.clinicalNoteId;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create note');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const saveDraft = async () => {
    const id = await ensureNote();
    if (id == null) return;
    setActionLoading(true);
    setSaveStatus('saving');
    try {
      const idempotencyKey = `cn-${id}-manual-${Date.now()}`;
      await upsertClinicalNoteDraft({
        clinicalNoteId: id,
        fields,
        noteType,
        version,
        syncStatus: 'pending',
        idempotencyKey,
      });
      const updated = await patchClinicalNote(id, {
        version,
        idempotencyKey,
        fields,
        noteType,
        changeSummary: 'Manual draft save',
      });
      await markClinicalNoteDraftSynced(id, updated.version);
      setVersion(updated.version);
      setNoteStatus(updated.status);
      setLastSaved(new Date().toLocaleTimeString());
      setSaveStatus('saved');
      notifySuccess(`Draft saved for ${selPatient?.name}`, 'Draft Saved');
      void refreshLists();
    } catch (err) {
      setSaveStatus('error');
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const submitNote = async () => {
    if (completion < 100) {
      toast.error(`Complete all ${requiredFields.length} required fields (${completion}%)`);
      return;
    }
    const id = await ensureNote();
    if (id == null) return;
    setActionLoading(true);
    try {
      // Persist latest fields first
      const patched = await patchClinicalNote(id, { version, fields, noteType });
      setVersion(patched.version);
      const submitted = await submitClinicalNote(id);
      await deleteClinicalNoteDraft(id);
      setNoteStatus(submitted.status);
      setVersion(submitted.version);
      notifySuccess('Clinical note submitted for review', 'Note Submitted');
      setTab('reviews');
      void refreshLists();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const signNote = async () => {
    const id = await ensureNote();
    if (id == null) return;
    setActionLoading(true);
    try {
      if (editable) {
        const patched = await patchClinicalNote(id, { version, fields, noteType });
        setVersion(patched.version);
      }
      const signedNote = await signClinicalNote(id, 'Reviewed and signed by author');
      await deleteClinicalNoteDraft(id);
      setSigned(true);
      setNoteStatus(signedNote.status);
      setVersion(signedNote.version);
      notifySuccess('Note digitally signed and locked', 'Note Signed');
      void refreshLists();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sign failed');
    } finally {
      setActionLoading(false);
    }
  };

  const loadPreview = async (item: ClinicalNoteListItem) => {
    setPreviewLoading(true);
    try {
      const detail = await getClinicalNote(item.clinicalNoteId);
      setPreview(detail);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  useApplyDocPatient((ctx) => {
    const personId = Number(ctx.id);
    if (!Number.isFinite(personId) || personId <= 0) {
      toast.error('Patient context missing a valid person id — search to select a registered patient');
      setShowSearch(true);
      setTab('new');
      return;
    }
    void selectPatient({
      personId,
      name: ctx.name,
      hospitalNo: ctx.hospitalId,
      age: ctx.age ?? null,
      gender: ctx.gender === 'F' ? 'F' : ctx.gender === 'M' ? 'M' : ctx.gender || '—',
      clinic: ctx.clinic ?? 'OPC',
      visit: 'Follow-up',
      allergies: ctx.allergies ?? 'NKDA',
      dx: ctx.diagnosis ?? '—',
      meds: ctx.medications ?? '—',
      vitals: '—',
      phone: ctx.phone ?? '',
      nhia: ctx.nhiaNo ?? '—',
      nin: ctx.nin ?? '',
    });
    const nt = entryTypeToNoteType(ctx.noteType ?? ctx.entryType);
    if (nt && Object.prototype.hasOwnProperty.call(TEMPLATE_FIELDS, nt)) {
      setNoteType(nt as NoteType);
    }
  });

  return (
    <Shell title="Documentation Engine">
      <Section
        icon={<FileText className="h-5 w-5" />}
        title="Clinical Documentation"
        desc="Create, review, sign and version clinical notes. Search registered patients by name, hospital number, phone, NHIA or NIN."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={newDoc} disabled={actionLoading}>
              <Plus className="h-4 w-4" />New Documentation
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTab('drafts')}>
              <FileText className="h-4 w-4" />Continue Draft
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowSearch(true); setSearchQ(''); }}>
              <Search className="h-4 w-4" />Search Patient
            </Button>
            <Button size="sm" variant="outline" onClick={() => void refreshLists()} disabled={listLoading}>
              {listLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        }
      />

      {!useApi && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Backend API is not configured. Set <code>VITE_USE_API=true</code> and <code>VITE_API_BASE_URL</code> to
            enable live clinical documentation.
          </p>
        </Card>
      )}

      {listError && useApi && (
        <Card className="mb-4 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-800">{listError}</p>
          <Button size="sm" className="mt-2" variant="outline" onClick={() => void refreshLists()}>
            Retry
          </Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <button type="button" onClick={() => setTab('drafts')} className="text-left">
          <SummaryCard
            title="Draft Notes"
            value={listLoading && !kpi ? '…' : String(kpi?.drafts ?? drafts.length)}
            subtitle="In progress"
            icon={FileText}
          />
        </button>
        <button type="button" onClick={() => setTab('completed')} className="text-left">
          <SummaryCard
            title="Completed Notes"
            value={listLoading && !kpi ? '…' : String(kpi?.signedThisMonth ?? completed.length)}
            subtitle="This month"
            icon={CheckCircle2}
          />
        </button>
        <button type="button" onClick={() => setTab('reviews')} className="text-left">
          <SummaryCard
            title="Pending Reviews"
            value={listLoading && !kpi ? '…' : String(kpi?.awaitingReview ?? reviews.length)}
            subtitle="Awaiting consultant"
            icon={Clock}
          />
        </button>
        <button type="button" onClick={() => setTab('templates')} className="text-left">
          <SummaryCard
            title="Templates Available"
            value={String(kpi?.templates ?? Object.keys(TEMPLATE_META).length)}
            subtitle="Note templates"
            icon={BookOpen}
          />
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="drafts">Draft Notes</TabsTrigger>
          <TabsTrigger value="new">New Documentation</TabsTrigger>
          <TabsTrigger value="completed">Completed Notes</TabsTrigger>
          <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="mt-4">
          <Card>
            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
              <h3 className="font-semibold">Draft Notes ({drafts.length})</h3>
              <Input
                placeholder="Search by patient, hospital no, note type…"
                className="max-w-sm"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
              />
            </div>
            {listLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No draft notes. Search for a patient to start documentation.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Hosp No.</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Note Type</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Last Saved</TableHead>
                      <TableHead>Ver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((d) => (
                      <TableRow key={d.clinicalNoteId}>
                        <TableCell className="font-medium">{d.noteNo}</TableCell>
                        <TableCell>{d.patientName}</TableCell>
                        <TableCell>{d.hospitalNo || '—'}</TableCell>
                        <TableCell>{d.clinic || '—'}</TableCell>
                        <TableCell>{d.noteType}</TableCell>
                        <TableCell>{d.authorName}</TableCell>
                        <TableCell>{formatWhen(d.updatedAt)}</TableCell>
                        <TableCell>v{d.version}</TableCell>
                        <TableCell>
                          <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => void openNote(d)} disabled={actionLoading}>
                              Continue
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void loadPreview(d)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSubmitConfirm(d)}>
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(d)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4 space-y-5">
          {!selPatient ? (
            <Card>
              <h3 className="font-semibold mb-2">Step 1 · Select Patient</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Search by name, hospital number, phone, NHIA or NIN (min 2 characters).
              </p>
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Type to search registered patients…"
                className="mb-3"
                autoFocus
              />
              {searchingPatients && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              )}
              {!searchingPatients && searchQ.trim().length >= 2 && patientResults.length === 0 && (
                <p className="text-sm text-muted-foreground mb-3">No patients matched “{searchQ.trim()}”.</p>
              )}
              {searchQ.trim().length < 2 && (
                <p className="text-sm text-muted-foreground mb-3">Type at least 2 characters to search.</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {patientResults.map((p) => (
                  <button
                    key={p.personId}
                    type="button"
                    onClick={() => void selectPatient(p)}
                    className="text-left rounded-lg border p-3 hover:bg-accent"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{p.name}</span>
                      <StatusPill tone={p.clinic === 'OPC' ? 'purple' : 'blue'}>{p.clinic}</StatusPill>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.hospitalNo} · {p.age ?? '—'}
                      {p.gender} · {p.phone || 'no phone'}
                    </div>
                    <div className="text-xs mt-1">NHIA: {p.nhia} · NIN: {p.nin || '—'}</div>
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <h3 className="font-semibold text-lg">{selPatient.name}</h3>
                      <StatusPill tone={selPatient.clinic === 'OPC' ? 'purple' : 'blue'}>
                        {selPatient.clinic}
                      </StatusPill>
                      {signed && <StatusPill tone="green">Signed · Locked</StatusPill>}
                      {noteId && <StatusPill tone="sky">{noteStatus}</StatusPill>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selPatient.hospitalNo} · {selPatient.age ?? '—'}
                      {selPatient.gender} · {selPatient.visit} · Allergies: {selPatient.allergies}
                    </div>
                    <div className="text-xs mt-1">
                      Dx: {selPatient.dx} · Meds: {selPatient.meds} · Vitals: {selPatient.vitals}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setTab('versions')} disabled={!noteId}>
                      View Timeline
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelPatient(null)}>
                      Change Patient
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label>Note Type</Label>
                    <Select
                      value={noteType}
                      onValueChange={(v) => {
                        setNoteType(v as NoteType);
                        setFields({});
                      }}
                      disabled={!editable}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(TEMPLATE_FIELDS).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex-1">
                      <Label>Template</Label>
                      <div className="text-xs text-muted-foreground">
                        {TEMPLATE_META[noteType]?.desc || 'Custom structured note'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-y py-2 mb-3">
                  <span>
                    {noteId ? `Note #${noteId}` : 'Unsaved draft'} · Version v{version} · Last saved{' '}
                    {lastSaved || 'never'} ·{' '}
                    {saveStatus === 'saving'
                      ? 'Saving…'
                      : saveStatus === 'saved'
                        ? 'Synced'
                        : saveStatus === 'local'
                          ? 'Local draft'
                          : saveStatus === 'error'
                            ? 'Save error'
                            : 'Autosave 3s'}
                  </span>
                  <span>
                    Required {filled}/{requiredFields.length} ({completion}%)
                  </span>
                </div>
                <Progress value={completion} className="mb-4" />

                <div className="space-y-3">
                  {requiredFields.map((f) => (
                    <div key={f}>
                      <Label>
                        {f} <span className="text-rose-500">*</span>
                      </Label>
                      <Textarea
                        disabled={!editable || actionLoading}
                        rows={
                          f.toLowerCase().includes('plan') ||
                          f.toLowerCase().includes('history') ||
                          f.toLowerCase().includes('examination')
                            ? 4
                            : 2
                        }
                        value={fields[f] || ''}
                        onChange={(e) => setFields((s) => ({ ...s, [f]: e.target.value }))}
                        placeholder={`Enter ${f.toLowerCase()}…`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => void saveDraft()} disabled={!editable || actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Draft
                  </Button>
                  <Button size="sm" onClick={() => void submitNote()} disabled={!editable || actionLoading}>
                    <Send className="h-4 w-4" />Submit for Review
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void signNote()} disabled={signed || actionLoading}>
                    <FileSignature className="h-4 w-4" />Review and Sign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />Print
                  </Button>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card>
            <h3 className="font-semibold mb-3">Completed & Signed Notes</h3>
            {listLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : completed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No signed notes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Hosp No.</TableHead>
                      <TableHead>Note Type</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Signed By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completed.map((c) => (
                      <TableRow key={c.clinicalNoteId}>
                        <TableCell className="font-medium">{c.noteNo}</TableCell>
                        <TableCell>{c.patientName}</TableCell>
                        <TableCell>{c.hospitalNo || '—'}</TableCell>
                        <TableCell>{c.noteType}</TableCell>
                        <TableCell>{c.clinic || '—'}</TableCell>
                        <TableCell>{c.authorName}</TableCell>
                        <TableCell>{c.signedBy || '—'}</TableCell>
                        <TableCell>{formatWhen(c.signedAt || c.updatedAt)}</TableCell>
                        <TableCell>
                          <StatusPill tone="green">{c.status}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => void loadPreview(c)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <h3 className="font-semibold mb-3">Notes Awaiting Consultant Review</h3>
            {listLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No notes pending review.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Hosp No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.clinicalNoteId}>
                        <TableCell className="font-medium">{r.noteNo}</TableCell>
                        <TableCell>{r.patientName}</TableCell>
                        <TableCell>{r.hospitalNo || '—'}</TableCell>
                        <TableCell>{r.noteType}</TableCell>
                        <TableCell>{r.authorName}</TableCell>
                        <TableCell>{formatWhen(r.submittedAt || r.updatedAt)}</TableCell>
                        <TableCell>
                          <StatusPill
                            tone={r.priority === 'Stat' ? 'red' : r.priority === 'Urgent' ? 'amber' : 'blue'}
                          >
                            {r.priority}
                          </StatusPill>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone="amber">{r.status}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  setReviewItem(await getClinicalNote(r.clinicalNoteId));
                                } catch (err) {
                                  toast.error(err instanceof ApiError ? err.message : 'Load failed');
                                }
                              }}
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading}
                              onClick={async () => {
                                setActionLoading(true);
                                try {
                                  await approveClinicalNote(r.clinicalNoteId);
                                  notifySuccess(`${r.noteNo} approved`, 'Approved');
                                  void refreshLists();
                                } catch (err) {
                                  toast.error(err instanceof ApiError ? err.message : 'Approve failed');
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReturnFor(r)}>
                              Return
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TEMPLATE_META).map(([name, meta]) => (
              <Card key={name}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{name}</h4>
                  <StatusPill tone="blue">{(TEMPLATE_FIELDS[name] || []).length} fields</StatusPill>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{meta.desc}</p>
                <p className="text-xs mb-1">
                  <span className="text-muted-foreground">Best for:</span> {meta.bestFor}
                </p>
                <div className="flex gap-1 flex-wrap mt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      setNoteType(name as NoteType);
                      setFields({});
                      setTab('new');
                      if (!selPatient) setShowSearch(true);
                      toast.success(`${name} template loaded`);
                    }}
                  >
                    Use Template
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTemplatePreview(name)}>
                    Preview
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <Card>
            <h3 className="font-semibold mb-3">
              Version History
              {versionsMeta ? ` · ${versionsMeta.noteNo} · ${versionsMeta.patientName}` : noteId ? '' : ' — open a note first'}
            </h3>
            {!noteId ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Open or create a note to view its version history.
              </p>
            ) : versionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading versions…
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No versions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ver</TableHead>
                      <TableHead>Edited By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.versionId}>
                        <TableCell>v{v.version}</TableCell>
                        <TableCell>{v.createdBy || '—'}</TableCell>
                        <TableCell>{formatWhen(v.createdAt)}</TableCell>
                        <TableCell>{v.changeSummary || '—'}</TableCell>
                        <TableCell>
                          <StatusPill tone={v.isCurrent ? 'green' : 'sky'}>
                            {v.isCurrent ? 'Current' : v.status}
                          </StatusPill>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Patient</DialogTitle>
            <DialogDescription>
              Live search via GET /api/patients — name, hospital no, phone, NHIA, NIN.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Name, hospital no, NHIA, NIN, phone…"
            autoFocus
          />
          {searchingPatients && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-auto">
            {patientResults.map((p) => (
              <button
                key={p.personId}
                type="button"
                onClick={() => void selectPatient(p)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs">{p.hospitalNo}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.age ?? '—'}
                  {p.gender} · {p.phone || '—'} · NHIA {p.nhia}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview || previewLoading} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview · {preview?.noteNo || '…'}</DialogTitle>
            <DialogDescription>
              {preview
                ? `${preview.patientName} · ${preview.noteType} · v${preview.version}`
                : 'Loading…'}
            </DialogDescription>
          </DialogHeader>
          {previewLoading && !preview ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 text-sm max-h-96 overflow-auto">
              {(TEMPLATE_FIELDS[preview?.noteType || 'SOAP Note'] || []).map((f) => (
                <div key={f}>
                  <div className="font-medium">{f}</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {preview?.fields?.[f]?.trim() || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!submitConfirm} onOpenChange={(o) => !o && setSubmitConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
            <DialogDescription>
              Submit {submitConfirm?.noteNo} for consultant review?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={async () => {
                if (!submitConfirm) return;
                setActionLoading(true);
                try {
                  await submitClinicalNote(submitConfirm.clinicalNoteId);
                  notifySuccess(`${submitConfirm.noteNo} submitted`, 'Submitted');
                  setSubmitConfirm(null);
                  void refreshLists();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Submit failed');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Draft</DialogTitle>
            <DialogDescription>
              Soft-void draft {deleteConfirm?.noteNo}? Signed notes are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={async () => {
                if (!deleteConfirm) return;
                setActionLoading(true);
                try {
                  await voidClinicalNote(deleteConfirm.clinicalNoteId);
                  await deleteClinicalNoteDraft(deleteConfirm.clinicalNoteId);
                  notifySuccess('Draft voided', 'Voided');
                  setDeleteConfirm(null);
                  void refreshLists();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Void failed');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Void Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnFor} onOpenChange={(o) => !o && setReturnFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for Correction</DialogTitle>
          </DialogHeader>
          <Label>
            Reason <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            rows={4}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Describe required corrections…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={async () => {
                if (!returnReason.trim()) return toast.error('Reason required');
                if (!returnFor) return;
                setActionLoading(true);
                try {
                  await returnClinicalNote(returnFor.clinicalNoteId, returnReason.trim());
                  notifySuccess('Returned to draft author', 'Returned');
                  setReturnFor(null);
                  setReturnReason('');
                  void refreshLists();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Return failed');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review · {reviewItem?.noteNo}</DialogTitle>
            <DialogDescription>
              {reviewItem?.patientName} · {reviewItem?.noteType} · {reviewItem?.authorName}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2 max-h-80 overflow-auto">
            {Object.entries(reviewItem?.fields || {}).map(([k, v]) => (
              <div key={k}>
                <div className="font-medium">{k}</div>
                <div className="text-muted-foreground whitespace-pre-wrap">{v || '—'}</div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (reviewItem) {
                  setReturnFor(reviewItem);
                  setReviewItem(null);
                }
              }}
            >
              Return
            </Button>
            <Button
              disabled={actionLoading}
              onClick={async () => {
                if (!reviewItem) return;
                setActionLoading(true);
                try {
                  await approveClinicalNote(reviewItem.clinicalNoteId);
                  notifySuccess(`${reviewItem.noteNo} approved`, 'Approved');
                  setReviewItem(null);
                  void refreshLists();
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Approve failed');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Approve & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!templatePreview} onOpenChange={(o) => !o && setTemplatePreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{templatePreview}</DialogTitle>
            <DialogDescription>{TEMPLATE_META[templatePreview || '']?.desc}</DialogDescription>
          </DialogHeader>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {(TEMPLATE_FIELDS[templatePreview || ''] || []).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setTemplatePreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
