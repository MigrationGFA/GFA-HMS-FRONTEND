import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { setDocPatientContext, getDocPatientContext } from '@/utils/docClinicalPatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import {
  approveCertificate,
  cancelCertificate,
  certificatePatientName,
  clearCertificateMockStorage,
  createCertificate,
  getCertificateSummary,
  isCertificatesApiEnabled,
  listCertificateTemplates,
  listCertificates,
  signCertificate,
  submitCertificateForSign,
  updateCertificate,
  type ApiCertificate,
  type CertificateFieldSchema,
  type CertificateSummary,
  type CertificateTemplate,
} from '@/lib/api/certificates';
import {
  isPatientsApiEnabled,
  searchPersons,
  type PersonRecord,
} from '@/lib/api/patients';
import {
  FileSignature, User, Plus, Printer, Download, FileText, Eye, Trash2, Lock,
  Send, CheckCircle2, QrCode, Search, Stamp, Loader2, RefreshCw,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Certificates & Reports">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const StatusPill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => {
  const cls = tone === 'red' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : tone === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : tone === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : tone === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

type TabId = 'new' | 'drafts' | 'signature' | 'approval' | 'issued' | 'templates' | 'history';
type KpiFilter = 'drafts' | 'issuedMonth' | 'pendingSig' | 'pendingApproval' | 'total' | 'templates';

type SelectedPatient = {
  personId: number;
  name: string;
  hospitalNo: string;
};

function normalizeFieldSchema(raw: unknown): CertificateFieldSchema[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      return { key: item, label: item.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()) };
    }
    if (item && typeof item === 'object') {
      const o = item as { key?: string; label?: string; name?: string };
      const key = o.key || o.name || `field_${i}`;
      return { key, label: o.label || o.name || key };
    }
    return { key: `field_${i}`, label: `Field ${i + 1}` };
  });
}

function personDisplayName(p: PersonRecord): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `Person #${p.personId}`;
}

function statusTone(status: string): string {
  if (status === 'Issued') return 'green';
  if (status === 'Draft') return 'blue';
  if (status === 'Expired' || status === 'Cancelled') return 'red';
  return 'amber';
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', { hour12: false });
  } catch {
    return iso;
  }
}

function tabStatus(tab: TabId): string | undefined {
  if (tab === 'drafts') return 'Draft';
  if (tab === 'signature') return 'PendingSignature';
  if (tab === 'approval') return 'PendingApproval';
  if (tab === 'issued') return 'Issued';
  if (tab === 'history') return 'Issued,Expired,Cancelled';
  return undefined;
}

function downloadCertificatePdf(cert: ApiCertificate, fieldSchema?: CertificateFieldSchema[]) {
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const schema = fieldSchema?.length
      ? fieldSchema
      : normalizeFieldSchema(cert.template?.fieldSchema);
    const patientName = certificatePatientName(cert);
    const hospitalNo = cert.person?.hospitalNo || `PID-${cert.personId}`;
    const templateName = cert.template?.name || cert.layout || 'Clinical Certificate';
    const signer = cert.signedBy || cert.issuedBy || '—';

    let y = 48;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Federal Neuro-Psychiatric Hospital, Aro', 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(templateName, 40, y);
    y += 24;
    doc.setFontSize(10);
    doc.text(`Document No: ${cert.docNo}`, 40, y); y += 14;
    doc.text(`Patient: ${patientName}`, 40, y); y += 14;
    doc.text(`Hospital No: ${hospitalNo}`, 40, y); y += 20;

    const entries = Object.entries(cert.fields || {});
    if (entries.length === 0) {
      doc.text('No field content recorded.', 40, y);
      y += 14;
    } else {
      for (const [key, value] of entries) {
        const label = schema.find((f) => f.key === key)?.label || key;
        const lines = doc.splitTextToSize(`${label}: ${value || '—'}`, 520) as string[];
        for (const line of lines) {
          if (y > 760) {
            doc.addPage();
            y = 48;
          }
          doc.text(line, 40, y);
          y += 14;
        }
        y += 4;
      }
    }

    y += 10;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.text(`Signed by: ${signer}`, 40, y); y += 14;
    if (cert.signedAt) {
      doc.text(`Signed at: ${formatWhen(cert.signedAt)}`, 40, y);
      y += 14;
    }
    if (cert.qrCode) {
      doc.text(`Verification: ${cert.qrCode}`, 40, y);
    }

    doc.save(`${cert.docNo || `certificate-${cert.certificateId}`}.pdf`);
    toast.success('PDF downloaded');
  } catch {
    toast.error('PDF generation failed');
  }
}

export const DoctorCertificates = () => {
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Doctor';
  const apiOn = isCertificatesApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();

  const ctx = getDocPatientContext();
  const [tab, setTab] = useState<TabId>('new');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);

  const [summary, setSummary] = useState<CertificateSummary | null>(null);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [rows, setRows] = useState<ApiCertificate[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(() => {
    if (!ctx?.id) return null;
    const pid = Number(ctx.id);
    if (!Number.isFinite(pid) || pid <= 0) return null;
    return { personId: pid, name: ctx.name, hospitalNo: ctx.hospitalId };
  });
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PersonRecord[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState<ApiCertificate | null>(null);
  const [editing, setEditing] = useState<ApiCertificate | null>(null);
  const [editorFields, setEditorFields] = useState<Record<string, string>>({});
  const [validityUntil, setValidityUntil] = useState('');
  const [signConfirm, setSignConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (apiOn) clearCertificateMockStorage();
  }, [apiOn]);

  const loadSummary = useCallback(async () => {
    if (!apiOn) return;
    setLoadingSummary(true);
    try {
      setSummary(await getCertificateSummary());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load certificate summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [apiOn]);

  const loadTemplates = useCallback(async () => {
    if (!apiOn) return;
    setLoadingTemplates(true);
    try {
      const list = await listCertificateTemplates();
      setTemplates(
        list.map((t) => ({
          ...t,
          fieldSchema: normalizeFieldSchema(t.fieldSchema),
        })),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [apiOn]);

  const loadList = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      return;
    }
    const status = tabStatus(tab);
    if (!status) {
      setRows([]);
      return;
    }
    setLoadingList(true);
    setError(null);
    try {
      const data = await listCertificates({ scope: 'mine', status, limit: 100 });
      setRows(data.items);
    } catch (e) {
      setRows([]);
      setError(e instanceof ApiError ? e.message : 'Failed to load certificates');
    } finally {
      setLoadingList(false);
    }
  }, [apiOn, tab]);

  useEffect(() => {
    void loadSummary();
    void loadTemplates();
  }, [loadSummary, loadTemplates]);

  useEffect(() => {
    if (tab === 'new' || tab === 'templates') return;
    void loadList();
  }, [tab, loadList]);

  useEffect(() => {
    if (!patientsApiOn) {
      setPatientResults([]);
      return;
    }
    const q = patientQuery.trim();
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setPatientSearchLoading(true);
      try {
        setPatientResults(await searchPersons(q));
      } catch {
        setPatientResults([]);
      } finally {
        setPatientSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [patientQuery, patientsApiOn]);

  const kpis = useMemo(
    () => ({
      drafts: summary?.drafts ?? 0,
      issuedMonth: summary?.issuedMonth ?? 0,
      pendingSig: summary?.pendingSignature ?? 0,
      pendingApproval: summary?.pendingApproval ?? 0,
      total: summary?.total ?? 0,
      templates: templates.length,
    }),
    [summary, templates.length],
  );

  const editorSchema = useMemo(() => {
    if (editing?.template?.fieldSchema) return normalizeFieldSchema(editing.template.fieldSchema);
    if (selectedTemplate) return normalizeFieldSchema(selectedTemplate.fieldSchema);
    return [];
  }, [editing, selectedTemplate]);

  const selectPatient = (p: SelectedPatient) => {
    setSelectedPatient(p);
    setDocPatientContext({
      id: String(p.personId),
      name: p.name,
      hospitalId: p.hospitalNo,
    });
    setPatientSearchOpen(false);
    notifySuccess(`Patient selected — ${p.name}`, 'Patient');
  };

  const openNewFromTemplate = (tpl: CertificateTemplate) => {
    if (!selectedPatient) {
      toast.error('Select a patient first');
      setPatientSearchOpen(true);
      return;
    }
    setEditing(null);
    setSelectedTemplate(tpl);
    const schema = normalizeFieldSchema(tpl.fieldSchema);
    const fields: Record<string, string> = {};
    schema.forEach((f) => {
      fields[f.key] = '';
    });
    setEditorFields(fields);
    setValidityUntil('');
    setSignConfirm(false);
    setEditorOpen(true);
  };

  const openExisting = (cert: ApiCertificate) => {
    setEditing(cert);
    setSelectedTemplate(cert.template
      ? { ...cert.template, fieldSchema: normalizeFieldSchema(cert.template.fieldSchema) }
      : templates.find((t) => t.templateId === cert.templateId) ?? null);
    setEditorFields({ ...(cert.fields || {}) });
    setValidityUntil(cert.validityUntil ? cert.validityUntil.slice(0, 10) : '');
    setSignConfirm(false);
    setEditorOpen(true);
  };

  const refreshAll = async () => {
    await Promise.all([loadSummary(), loadTemplates(), tab !== 'new' && tab !== 'templates' ? loadList() : Promise.resolve()]);
  };

  const saveDraft = async () => {
    if (!apiOn) return toast.error('Backend API is not configured');
    setSaving(true);
    try {
      if (editing) {
        await updateCertificate(editing.certificateId, {
          fields: editorFields,
          validityUntil: validityUntil || null,
        });
        toast.success('Draft updated');
      } else {
        if (!selectedPatient || !selectedTemplate) {
          toast.error('Patient and template are required');
          return;
        }
        await createCertificate({
          personId: selectedPatient.personId,
          templateId: selectedTemplate.templateId,
          fields: editorFields,
          validityUntil: validityUntil || undefined,
        });
        toast.success('Draft created');
      }
      setEditorOpen(false);
      setTab('drafts');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const submitForSign = async (id?: number) => {
    if (!apiOn) return toast.error('Backend API is not configured');
    const certId = id ?? editing?.certificateId;
    setSaving(true);
    setBusyId(certId ?? null);
    try {
      if (editing && !id) {
        await updateCertificate(editing.certificateId, {
          fields: editorFields,
          validityUntil: validityUntil || null,
        });
      } else if (!certId && selectedPatient && selectedTemplate) {
        const created = await createCertificate({
          personId: selectedPatient.personId,
          templateId: selectedTemplate.templateId,
          fields: editorFields,
          validityUntil: validityUntil || undefined,
        });
        await submitCertificateForSign(created.certificateId);
        toast.success('Submitted for signature');
        setEditorOpen(false);
        setTab('signature');
        await refreshAll();
        return;
      }
      if (!certId) {
        toast.error('Save the document first');
        return;
      }
      await submitCertificateForSign(certId);
      toast.success('Submitted for signature');
      setEditorOpen(false);
      setTab('signature');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
      setBusyId(null);
    }
  };

  const doSign = async (id?: number) => {
    if (!apiOn) return toast.error('Backend API is not configured');
    if (!id && !signConfirm) {
      toast.error('Confirm digital signature checkbox');
      return;
    }
    const certId = id ?? editing?.certificateId;
    if (!certId) return toast.error('No document selected');
    setSaving(true);
    setBusyId(certId);
    try {
      if (editing && editing.certificateId === certId && editing.status === 'Draft') {
        await updateCertificate(certId, { fields: editorFields, validityUntil: validityUntil || null });
        await submitCertificateForSign(certId);
      }
      const signed = await signCertificate(certId);
      notifySuccess('Document signed and issued', signed.docNo);
      setEditorOpen(false);
      setTab('issued');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Sign failed');
    } finally {
      setSaving(false);
      setBusyId(null);
    }
  };

  const doApprove = async (id: number) => {
    setBusyId(id);
    try {
      await approveCertificate(id);
      notifySuccess('Approved — ready for signature', 'Approved');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async (id: number) => {
    setBusyId(id);
    try {
      await cancelCertificate(id, 'Cancelled by author');
      toast.success('Document cancelled');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  };

  const DocTable = ({
    list,
    actions,
  }: {
    list: ApiCertificate[];
    actions: (d: ApiCertificate) => React.ReactNode;
  }) => (
    <>
      {loadingList ? (
        <Card className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
        </Card>
      ) : (
        <>
          <Card className="overflow-x-auto hidden md:block !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Document No.', 'Patient', 'Type', 'Created By', 'Last Saved', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.certificateId} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b font-mono text-xs">{d.docNo}</td>
                    <td className="px-3 py-2 border-b">{certificatePatientName(d)}</td>
                    <td className="px-3 py-2 border-b text-xs">{d.template?.name ?? d.layout}</td>
                    <td className="px-3 py-2 border-b text-xs">{d.createdBy ?? '—'}</td>
                    <td className="px-3 py-2 border-b text-xs">{formatWhen(d.updatedAt || d.createdAt)}</td>
                    <td className="px-3 py-2 border-b"><StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill></td>
                    <td className="px-3 py-2 border-b"><div className="flex gap-1 flex-wrap">{actions(d)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="text-center text-muted-foreground py-8 text-sm">No documents in this view.</p>}
          </Card>
          <div className="md:hidden space-y-2">
            {list.length === 0 && !loadingList && (
              <p className="text-sm text-muted-foreground text-center py-6">No documents in this view.</p>
            )}
            {list.map((d) => (
              <Card key={d.certificateId} className="!p-3">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{d.docNo}</span>
                  <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>
                </div>
                <div className="font-medium text-sm">{certificatePatientName(d)}</div>
                <div className="text-xs text-muted-foreground">{d.template?.name ?? d.layout} · {formatWhen(d.updatedAt)}</div>
                <div className="flex gap-1 mt-2 flex-wrap">{actions(d)}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );

  const previewCert = editing;
  const previewName = previewCert ? certificatePatientName(previewCert) : selectedPatient?.name;
  const previewHospital = previewCert?.person?.hospitalNo ?? selectedPatient?.hospitalNo;
  const previewType = previewCert?.template?.name ?? selectedTemplate?.name ?? 'Document';

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Certificates & Reports</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Generate, review, sign, print, and issue official clinical documents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void refreshAll()} disabled={loadingSummary || loadingList}>
            {(loadingSummary || loadingList) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setPatientSearchOpen(true)}><User className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('new')}><Plus className="h-4 w-4 mr-1" />New Document</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('issued')}><FileText className="h-4 w-4 mr-1" />Issued Reports</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
        </div>
      </div>

      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm mb-4">
          Backend API is not configured. Enable <code>VITE_USE_API</code> and <code>VITE_API_BASE_URL</code> to use live certificates.
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void refreshAll()}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {([
          { id: 'drafts' as KpiFilter, title: 'Draft Documents', value: loadingSummary ? '…' : kpis.drafts, icon: FileText, tone: 'blue' as const },
          { id: 'issuedMonth' as KpiFilter, title: 'Issued This Month', value: loadingSummary ? '…' : kpis.issuedMonth, icon: CheckCircle2, tone: 'green' as const },
          { id: 'pendingSig' as KpiFilter, title: 'Pending Signature', value: loadingSummary ? '…' : kpis.pendingSig, icon: FileSignature, tone: 'amber' as const },
          { id: 'pendingApproval' as KpiFilter, title: 'Pending Approval', value: loadingSummary ? '…' : kpis.pendingApproval, icon: Stamp, tone: 'purple' as const },
          { id: 'total' as KpiFilter, title: 'All Documents', value: loadingSummary ? '…' : kpis.total, icon: Lock, tone: 'rose' as const },
          { id: 'templates' as KpiFilter, title: 'Templates Available', value: loadingTemplates ? '…' : kpis.templates, icon: FileSignature, tone: 'indigo' as const },
        ]).map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKpiFilter(kpiFilter === k.id ? null : k.id);
              if (k.id === 'drafts') setTab('drafts');
              else if (k.id === 'issuedMonth') setTab('issued');
              else if (k.id === 'pendingSig') setTab('signature');
              else if (k.id === 'pendingApproval') setTab('approval');
              else if (k.id === 'total') setTab('history');
              else setTab('templates');
            }}
            className={`text-left rounded-xl ${kpiFilter === k.id ? 'ring-2 ring-primary' : ''}`}
          >
            <SummaryCard title={k.title} value={String(k.value)} icon={k.icon} tone={k.tone} />
          </button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {(['new', 'drafts', 'signature', 'approval', 'issued', 'templates', 'history'] as TabId[]).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === 'signature' ? 'Pending Signature'
                : t === 'approval' ? 'Pending Approval'
                : t === 'new' ? 'New Document'
                : t === 'issued' ? 'Issued Reports'
                : t === 'history' ? 'Document History'
                : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="new">
          <Card className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search patient name, hospital no… (2+ characters)"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setPatientSearchOpen(true)}>Browse Patients</Button>
            </div>
            {patientSearchLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching patients…
              </p>
            )}
            {patientQuery.trim().length >= 2 && patientResults.length > 0 && (
              <div className="mb-3 max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {patientResults.map((p) => (
                  <button
                    key={p.personId}
                    type="button"
                    className="w-full text-left p-2 rounded hover:bg-muted/50 text-sm"
                    onClick={() => selectPatient({
                      personId: p.personId,
                      name: personDisplayName(p),
                      hospitalNo: p.hospitalNo || `PID-${p.personId}`,
                    })}
                  >
                    <div className="font-medium">{personDisplayName(p)}</div>
                    <div className="text-xs text-muted-foreground">{p.hospitalNo ?? p.personId} · {p.patientPhoneNo ?? '—'}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient ? (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="font-semibold">{selectedPatient.name}</div>
                <div className="text-sm text-muted-foreground font-mono">{selectedPatient.hospitalNo}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a patient to create a document.</p>
            )}
          </Card>
          {loadingTemplates ? (
            <Card className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
            </Card>
          ) : templates.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No certificate templates available.</p></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((dt) => {
                const schema = normalizeFieldSchema(dt.fieldSchema);
                return (
                  <Card key={dt.templateId} className="flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      {dt.approvalRequired && <StatusPill tone="amber">Approval required</StatusPill>}
                    </div>
                    <div className="font-medium text-sm mb-1">{dt.name}</div>
                    <p className="text-xs text-muted-foreground mb-2 flex-1">{dt.description || dt.category}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Fields: {schema.slice(0, 3).map((f) => f.label).join(', ') || '—'}
                      {schema.length > 3 ? '…' : ''}
                    </p>
                    <Button size="sm" onClick={() => openNewFromTemplate(dt)}>Create</Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts">
          <DocTable
            list={rows}
            actions={(d) => (
              <>
                <Button size="sm" variant="outline" disabled={busyId === d.certificateId} onClick={() => openExisting(d)}>Continue</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setPreviewOpen(true); }}>Preview</Button>
                <Button size="sm" variant="ghost" disabled={busyId === d.certificateId} onClick={() => void submitForSign(d.certificateId)}>
                  <Send className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" disabled={busyId === d.certificateId} onClick={() => void doCancel(d.certificateId)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="signature">
          <DocTable
            list={rows}
            actions={(d) => (
              <>
                <Button size="sm" variant="outline" onClick={() => openExisting(d)}>Review</Button>
                <Button size="sm" disabled={busyId === d.certificateId} onClick={() => void doSign(d.certificateId)}>
                  {busyId === d.certificateId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sign'}
                </Button>
                <Button size="sm" variant="ghost" disabled={busyId === d.certificateId} onClick={() => void doCancel(d.certificateId)}>Cancel</Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="approval">
          <DocTable
            list={rows}
            actions={(d) => (
              <>
                <Button size="sm" variant="outline" onClick={() => openExisting(d)}>Review</Button>
                <Button size="sm" disabled={busyId === d.certificateId} onClick={() => void doApprove(d.certificateId)}>Approve</Button>
                <Button size="sm" variant="ghost" disabled={busyId === d.certificateId} onClick={() => void doCancel(d.certificateId)}>Return / Cancel</Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="issued">
          <DocTable
            list={rows}
            actions={(d) => (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setPreviewOpen(true); }}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => downloadCertificatePdf(d, normalizeFieldSchema(d.template?.fieldSchema))}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setVerifyOpen(d)}><QrCode className="h-3 w-3" /></Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="templates">
          {loadingTemplates ? (
            <Card className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
            </Card>
          ) : templates.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No templates found.</p></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((dt) => {
                const schema = normalizeFieldSchema(dt.fieldSchema);
                return (
                  <Card key={dt.templateId}>
                    <div className="font-medium text-sm">{dt.name}</div>
                    <p className="text-xs text-muted-foreground mt-1">{dt.description || dt.category}</p>
                    <ul className="text-xs mt-2 space-y-0.5">
                      {schema.map((f) => <li key={f.key}>• {f.label}</li>)}
                    </ul>
                    <Button size="sm" className="mt-2" variant="outline" onClick={() => { setTab('new'); openNewFromTemplate(dt); }}>
                      Use Template
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <DocTable
            list={rows}
            actions={(d) => (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setPreviewOpen(true); }}>View</Button>
                {d.status === 'Issued' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => downloadCertificatePdf(d, normalizeFieldSchema(d.template?.fieldSchema))}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setVerifyOpen(d)}><QrCode className="h-3 w-3" /></Button>
                  </>
                )}
              </>
            )}
          />
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur p-2 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => setTab('new')}><Plus className="h-4 w-4 mr-1" />New</Button>
        <Button size="sm" variant="outline" onClick={() => setPatientSearchOpen(true)}><User className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => setTab('issued')}><FileText className="h-4 w-4" /></Button>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.docNo}` : `New ${selectedTemplate?.name ?? 'Document'}`}</DialogTitle>
            <DialogDescription>
              {(editing ? certificatePatientName(editing) : selectedPatient?.name) ?? 'Patient'} ·{' '}
              {editing?.person?.hospitalNo ?? selectedPatient?.hospitalNo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Validity until (optional)</Label>
              <Input type="date" value={validityUntil} onChange={(e) => setValidityUntil(e.target.value)} disabled={!!editing?.locked} />
            </div>
            {editorSchema.map((f) => {
              const long = /summary|findings|comment|details|plan|assessment|opinion/i.test(f.key + f.label);
              return (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {long ? (
                    <Textarea
                      value={editorFields[f.key] ?? ''}
                      onChange={(e) => setEditorFields((fld) => ({ ...fld, [f.key]: e.target.value }))}
                      rows={2}
                      disabled={!!editing?.locked}
                    />
                  ) : (
                    <Input
                      value={editorFields[f.key] ?? ''}
                      onChange={(e) => setEditorFields((fld) => ({ ...fld, [f.key]: e.target.value }))}
                      disabled={!!editing?.locked}
                    />
                  )}
                </div>
              );
            })}
            {editorSchema.length === 0 && (
              <p className="text-sm text-muted-foreground">This template has no configured fields.</p>
            )}
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Checkbox checked={signConfirm} onCheckedChange={(v) => setSignConfirm(!!v)} disabled={!!editing?.locked} />
              <Label className="flex items-center gap-1"><FileSignature className="h-4 w-4" />Digital signature — {doctorName}</Label>
            </div>
            {editing?.locked && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <Lock className="h-3 w-3" />Document locked after signing.
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => void saveDraft()} disabled={saving || !!editing?.locked}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button variant="outline" onClick={() => void submitForSign()} disabled={saving || !!editing?.locked}>
              Submit for Signature
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>Preview</Button>
            <Button
              onClick={() => void doSign()}
              disabled={saving || !!editing?.locked || (editing?.status !== 'PendingSignature' && !signConfirm)}
            >
              <Send className="h-4 w-4 mr-1" />Sign Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto print:block">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription>{previewCert?.docNo ?? 'Draft'} · {previewType}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-6 text-sm space-y-3 bg-white">
            <div className="text-center border-b pb-3">
              <div className="font-bold">Federal Neuro-Psychiatric Hospital, Aro</div>
              <div className="text-muted-foreground">{previewType}</div>
            </div>
            <p><strong>Patient:</strong> {previewName}</p>
            <p><strong>Hospital No:</strong> {previewHospital}</p>
            {Object.entries(previewCert?.fields ?? editorFields).map(([k, v]) => (
              v ? (
                <p key={k}>
                  <strong>{editorSchema.find((f) => f.key === k)?.label ?? k}:</strong> {v}
                </p>
              ) : null
            ))}
            {previewCert?.signedBy && (
              <p className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />Digitally signed by {previewCert.signedBy}
              </p>
            )}
            {previewCert?.qrCode && <p className="text-xs font-mono">QR: {previewCert.qrCode}</p>}
            <div className="text-center pt-4 opacity-50"><Stamp className="h-8 w-8 mx-auto" />Official Stamp</div>
          </div>
          <DialogFooter>
            {previewCert?.status === 'Issued' && (
              <Button variant="outline" onClick={() => downloadCertificatePdf(previewCert, editorSchema)}>
                <Download className="h-4 w-4 mr-1" />Download PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verifyOpen} onOpenChange={(o) => !o && setVerifyOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Document</DialogTitle>
            <DialogDescription>QR verification for {verifyOpen?.docNo}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 p-4">
            <QrCode className="h-24 w-24 text-primary" />
            <code className="text-xs bg-muted px-2 py-1 rounded">{verifyOpen?.qrCode || 'No QR code'}</code>
            <StatusPill tone="green">Document verified — Issued {formatWhen(verifyOpen?.issuedAt)}</StatusPill>
            <p className="text-xs text-muted-foreground text-center">
              Signed by {verifyOpen?.signedBy || verifyOpen?.issuedBy || '—'}.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select Patient</SheetTitle>
            <SheetDescription>Search by name or hospital number (2+ characters).</SheetDescription>
          </SheetHeader>
          <Input className="mt-4" placeholder="Search…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
          {patientSearchLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          )}
          <div className="mt-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {!patientsApiOn && (
              <p className="text-sm text-muted-foreground">Patient API is not configured.</p>
            )}
            {patientsApiOn && patientQuery.trim().length < 2 && (
              <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>
            )}
            {patientsApiOn && patientQuery.trim().length >= 2 && !patientSearchLoading && patientResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No patients found.</p>
            )}
            {patientResults.map((p) => (
              <button
                key={p.personId}
                type="button"
                onClick={() => selectPatient({
                  personId: p.personId,
                  name: personDisplayName(p),
                  hospitalNo: p.hospitalNo || `PID-${p.personId}`,
                })}
                className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 text-sm"
              >
                <div className="font-medium">{personDisplayName(p)}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalNo ?? p.personId} · {p.patientPhoneNo ?? '—'}</div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Shell>
  );
};

export default DoctorCertificates;
