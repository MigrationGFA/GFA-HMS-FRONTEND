import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { ApiError } from '@/lib/api/client';
import {
  cancelDischargeDraft,
  clearDoctorDischargeMockStorage,
  createDischargeDraft,
  dischargePatientName,
  isDischargeApiEnabled,
  listDischargeDrafts,
  submitDischargeDraft,
  updateDischargeDraft,
  type ApiDischargeDraft,
} from '@/lib/api/discharge';
import { listAdmissions, type AdmissionRecord } from '@/lib/api/admissions';
import { ClipboardCheck, Loader2, Plus, RefreshCw, Send, Eye } from 'lucide-react';

function admissionPatientName(a: AdmissionRecord): string {
  const p = a.person;
  if (!p) return `Person #${a.personId}`;
  return (
    [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') ||
    p.hospitalNo ||
    `#${a.personId}`
  );
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const emptyForm = () => ({
  dischargeType: 'Routine',
  admissionDiagnosis: '',
  finalDiagnosis: '',
  reasonForAdmission: '',
  clinicalSummary: '',
  investigations: '',
  treatmentGiven: '',
  dischargeMedications: '',
  medicationsChanged: '',
  followUpPlan: '',
  nextAppointment: '',
  patientEducation: '',
  riskSafetyNotes: '',
});

export const DocDischarge = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const apiOn = isDischargeApiEnabled();
  const [tab, setTab] = useState<'new' | 'open' | 'done'>('open');
  const [rows, setRows] = useState<ApiDischargeDraft[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiDischargeDraft | null>(null);
  const [admissionId, setAdmissionId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);

  const [pendingPersonId, setPendingPersonId] = useState<number | null>(null);

  useClinicalEmbeddedInit({ embedded, patientContext }, (ctx) => {
    const pid = Number(ctx.id);
    if (Number.isFinite(pid) && pid > 0) setPendingPersonId(pid);
    if (!embedded) toast.success(`Discharge workspace for ${ctx.name}`);
  });

  useEffect(() => {
    if (apiOn) clearDoctorDischargeMockStorage();
  }, [apiOn]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const status =
        tab === 'done'
          ? 'Discharged,Cancelled'
          : 'Draft,Returned,AwaitingPayment,PaymentCleared,Submitted';
      const data = await listDischargeDrafts({
        scope: 'mine',
        status,
        limit: 100,
      });
      setRows(data.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load discharge drafts');
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab]);

  const loadAdmissions = useCallback(async () => {
    if (!apiOn) return;
    try {
      const data = await listAdmissions({
        status: 'ADMITTED,ON_LEAVE,DISCHARGE_ORDERED',
        limit: 100,
      });
      setAdmissions(data.items ?? []);
    } catch {
      setAdmissions([]);
    }
  }, [apiOn]);

  useEffect(() => {
    if (tab === 'new') void loadAdmissions();
    else void load();
  }, [tab, load, loadAdmissions]);

  useEffect(() => {
    if (!pendingPersonId || admissions.length === 0 || editId) return;
    const match = admissions.find((a) => a.personId === pendingPersonId);
    if (match) {
      setAdmissionId(String(match.admissionId));
      setPendingPersonId(null);
    }
  }, [pendingPersonId, admissions, editId]);

  const admissionOptions = useMemo(
    () =>
      admissions.map((a) => ({
        value: String(a.admissionId),
        label: admissionPatientName(a),
        sub: [
          a.person?.hospitalNo,
          a.ward?.name,
          a.bed?.label ? `Bed ${a.bed.label}` : null,
          a.status,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [admissions],
  );

  const setField = (k: keyof ReturnType<typeof emptyForm>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (submit: boolean) => {
    if (!apiOn) return toast.error('Backend API is not configured');
    if (!editId && !admissionId) return toast.error('Select a patient');
    if (!form.finalDiagnosis.trim() && !form.clinicalSummary.trim()) {
      return toast.error('Final diagnosis or clinical summary is required');
    }
    setSubmitting(true);
    try {
      let id = editId;
      if (!id) {
        const created = await createDischargeDraft({
          admissionId: Number(admissionId),
          ...form,
        });
        id = created.draftId;
      } else {
        await updateDischargeDraft(id, form);
      }
      if (submit) {
        await submitDischargeDraft(id);
        toast.success('Discharge submitted — awaiting payment clearance');
        setTab('open');
      } else {
        toast.success('Draft saved');
        setTab('open');
      }
      setForm(emptyForm());
      setAdmissionId('');
      setEditId(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (row: ApiDischargeDraft) => {
    setSubmitting(true);
    try {
      await cancelDischargeDraft(row.draftId);
      toast.success('Draft cancelled');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (row: ApiDischargeDraft) => {
    setEditId(row.draftId);
    setAdmissionId(String(row.admissionId));
    setForm({
      dischargeType: row.dischargeType || 'Routine',
      admissionDiagnosis: row.admissionDiagnosis || '',
      finalDiagnosis: row.finalDiagnosis || '',
      reasonForAdmission: row.reasonForAdmission || '',
      clinicalSummary: row.clinicalSummary || '',
      investigations: row.investigations || '',
      treatmentGiven: row.treatmentGiven || '',
      dischargeMedications: row.dischargeMedications || '',
      medicationsChanged: row.medicationsChanged || '',
      followUpPlan: row.followUpPlan || '',
      nextAppointment: row.nextAppointment || '',
      patientEducation: row.patientEducation || '',
      riskSafetyNotes: row.riskSafetyNotes || '',
    });
    setTab('new');
  };

  const awaiting = rows.filter((r) =>
    ['AwaitingPayment', 'Submitted', 'PaymentCleared'].includes(r.status),
  ).length;
  const drafts = rows.filter((r) => ['Draft', 'Returned'].includes(r.status)).length;

  const body = (
    <div className="space-y-4">
      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard title="Open drafts" value={String(drafts)} icon={ClipboardCheck} />
        <SummaryCard title="Awaiting clearance" value={String(awaiting)} icon={Send} />
        <SummaryCard title="In list" value={String(rows.length)} icon={ClipboardCheck} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="new">New / Edit</TabsTrigger>
            <TabsTrigger value="open">My open</TabsTrigger>
            <TabsTrigger value="done">History</TabsTrigger>
          </TabsList>
          {tab !== 'new' && (
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          )}
        </div>

        <TabsContent value="new" className="mt-4">
          <Card className="space-y-3 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Doctor prepares the discharge draft. Cashier clears all unpaid bills; Records finalizes bed release.
            </p>
            {!editId && (
              <div className="space-y-1.5">
                <Label>Patient (admitted)</Label>
                <SearchableSelect
                  options={admissionOptions}
                  value={admissionId}
                  onChange={setAdmissionId}
                  placeholder="Type patient name…"
                  searchPlaceholder="Search by name, hospital no, ward…"
                  emptyText="No matching admitted patients."
                  allowClear
                  clearLabel="Clear selection"
                />
                <p className="text-xs text-muted-foreground">
                  Type to search admitted patients, then select one admission.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Final diagnosis</Label>
                <Textarea value={form.finalDiagnosis} onChange={(e) => setField('finalDiagnosis', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Discharge type</Label>
                <Input value={form.dischargeType} onChange={(e) => setField('dischargeType', e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Clinical summary</Label>
                <Textarea value={form.clinicalSummary} onChange={(e) => setField('clinicalSummary', e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Discharge medications</Label>
                <Textarea value={form.dischargeMedications} onChange={(e) => setField('dischargeMedications', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Follow-up plan</Label>
                <Textarea value={form.followUpPlan} onChange={(e) => setField('followUpPlan', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Risk / safety notes</Label>
                <Textarea value={form.riskSafetyNotes} onChange={(e) => setField('riskSafetyNotes', e.target.value)} rows={2} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={submitting || !apiOn} onClick={() => void onSave(false)}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Save draft
              </Button>
              <Button disabled={submitting || !apiOn} onClick={() => void onSave(true)}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit for clearance
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="open" className="mt-4">
          {loading ? (
            <Card className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </Card>
          ) : rows.length === 0 ? (
            <Card className="text-sm text-muted-foreground">No open discharge drafts.</Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Draft</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Ward</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.draftId} className="border-t">
                      <td className="p-3 font-medium">{r.draftNo}</td>
                      <td className="p-3">{dischargePatientName(r)}</td>
                      <td className="p-3">{r.admission?.ward?.name ?? '—'}</td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="h-4 w-4" /></Button>
                        {['Draft', 'Returned'].includes(r.status) && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                        )}
                        {['Draft', 'Returned', 'AwaitingPayment'].includes(r.status) && (
                          <Button size="sm" variant="ghost" disabled={submitting} onClick={() => void onCancel(r)}>Cancel</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          {loading ? (
            <Card className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </Card>
          ) : rows.length === 0 ? (
            <Card className="text-sm text-muted-foreground">No history yet.</Card>
          ) : (
            <Card className="space-y-2">
              {rows.map((r) => (
                <button
                  key={r.draftId}
                  type="button"
                  className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/40"
                  onClick={() => setDetail(r)}
                >
                  <p className="text-sm font-medium">{r.draftNo} · {dischargePatientName(r)}</p>
                  <p className="text-xs text-muted-foreground">{r.status}</p>
                </button>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.draftNo}</DialogTitle>
            <DialogDescription>
              {detail ? dischargePatientName(detail) : ''} · {detail?.status}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><b>Diagnosis:</b> {detail.finalDiagnosis || '—'}</p>
              <p><b>Summary:</b> {detail.clinicalSummary || '—'}</p>
              <p><b>Meds:</b> {detail.dischargeMedications || '—'}</p>
              <p><b>Follow-up:</b> {detail.followUpPlan || '—'}</p>
              {detail.returnReason && <p className="text-amber-800"><b>Returned:</b> {detail.returnReason}</p>}
              {detail.payment && (
                <p>
                  <b>Payment:</b>{' '}
                  {detail.payment.cleared
                    ? 'Cleared'
                    : `${detail.payment.unpaidCount} unpaid`}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Discharge Drafts"
      flowTitle="Discharge Drafts"
      flowSubtitle="Doctor drafts · Cashier clears payments · Records finalizes"
      onClose={onClose}
      onOpenFull={onOpenFull}
      patientContext={patientContext}
    >
      {body}
    </ClinicalPageShell>
  );
};

export default DocDischarge;
