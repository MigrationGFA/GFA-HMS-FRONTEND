import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ClinicalPageShell, type ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';
import { useClinicalEmbeddedInit } from '@/hooks/useClinicalEmbeddedInit';
import { ApiError } from '@/lib/api/client';
import { isNotificationsApiEnabled } from '@/lib/api/notifications';
import {
  acceptReferral,
  attendReferral,
  cancelReferral,
  clearDoctorReferralMockStorage,
  completeReferral,
  createReferral,
  isReferralsApiEnabled,
  listReferrals,
  referralPatientName,
  type ApiReferral,
  type CareSetting,
  type ReferralKind,
  type ReferralPriority,
} from '@/lib/api/referrals';
import {
  isPatientsApiEnabled,
  searchPersons,
  type PersonRecord,
} from '@/lib/api/patients';
import {
  Send, RefreshCw, Loader2, Plus, Eye, XCircle, Search, UserRound, CheckCircle2,
} from 'lucide-react';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const DEST_DEPARTMENTS = [
  'GMPC', 'OPC', 'Emergency Unit', 'Psychology', 'Social Work', 'Occupational Therapy',
  'Nutrition', 'Physiotherapy', 'Dental', 'Eye Clinic', 'ENT', 'Medical Ward',
  'Psychiatry Ward', 'Addiction Unit', 'Psychogeriatric Unit', 'Child & Adolescent Unit',
  'Consultant Review', 'Specialist Clinic',
];

const OPEN_MINE =
  'Submitted,UnderReview,QueuedForDept,AwaitingBed,BedAllocated,Accepted,InAttendance,Returned';
const OPEN_INBOUND = 'QueuedForDept,Accepted,InAttendance,Returned';
const HISTORY =
  'Completed,ClearedExternal,Rejected,Cancelled,Admitted';

function statusTone(status: string): string {
  if (['Completed', 'ClearedExternal', 'Admitted'].includes(status)) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (['Rejected', 'Cancelled'].includes(status)) {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  if (status === 'Returned' || status === 'Emergency') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-blue-100 text-blue-800 border-blue-200';
}

function personIdFromContext(ctx: DocPatientContext | null): number | null {
  if (!ctx?.id) return null;
  const n = Number(ctx.id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function personDisplayName(p: PersonRecord): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `Person #${p.personId}`;
}

type SelectedPatient = {
  personId: number;
  name: string;
  hospitalNo: string;
};

export const DocReferrals = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const apiOn = isReferralsApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();
  const [tab, setTab] = useState<'new' | 'mine' | 'inbound' | 'history'>('new');
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiReferral | null>(null);
  const [cancelRow, setCancelRow] = useState<ApiReferral | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [completeRow, setCompleteRow] = useState<ApiReferral | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [patientModal, setPatientModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PersonRecord[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  const [referralKind, setReferralKind] = useState<ReferralKind>('Internal');
  const [careSetting, setCareSetting] = useState<CareSetting>('Outpatient');
  const [priority, setPriority] = useState<ReferralPriority>('Routine');
  const [fromDepartment, setFromDepartment] = useState('OPC');
  const [toDepartment, setToDepartment] = useState('');
  const [toDoctorLabel, setToDoctorLabel] = useState('');
  const [externalFacility, setExternalFacility] = useState('');
  const [externalContact, setExternalContact] = useState('');
  const [reason, setReason] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [specificQuestion, setSpecificQuestion] = useState('');

  const selectPatient = useCallback((p: SelectedPatient) => {
    setSelectedPatient(p);
    setPatientModal(false);
    setPatientSearch('');
    setPatientResults([]);
  }, []);

  useClinicalEmbeddedInit({ embedded, patientContext }, (ctx) => {
    const pid = personIdFromContext(ctx);
    if (pid) {
      selectPatient({
        personId: pid,
        name: ctx.name,
        hospitalNo: ctx.hospitalId || `PID-${pid}`,
      });
    }
    if (!embedded) toast.success(`Referral workspace for ${ctx.name}`);
  });

  useEffect(() => {
    if (apiOn && isNotificationsApiEnabled()) {
      clearDoctorReferralMockStorage();
    }
  }, [apiOn]);

  useEffect(() => {
    if (!patientModal || !patientsApiOn) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPatientSearchLoading(true);
      searchPersons(q)
        .then((found) => {
          if (!cancelled) setPatientResults(found);
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
  }, [patientModal, patientsApiOn, patientSearch]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tab === 'mine') {
        const data = await listReferrals({
          scope: 'mine',
          status: OPEN_MINE,
          personId: selectedPatient?.personId,
          limit: 100,
        });
        setRows(data.items);
      } else if (tab === 'inbound') {
        const data = await listReferrals({
          scope: 'inbound',
          status: OPEN_INBOUND,
          limit: 100,
        });
        setRows(data.items);
      } else if (tab === 'history') {
        const data = await listReferrals({
          scope: 'mine',
          status: HISTORY,
          personId: selectedPatient?.personId,
          limit: 100,
        });
        setRows(data.items);
      } else {
        setRows([]);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load referrals';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab, selectedPatient?.personId]);

  useEffect(() => {
    if (tab !== 'new') void load();
  }, [tab, load]);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => !HISTORY.split(',').includes(r.status));
    return {
      pending: open.length,
      urgent: open.filter((r) => r.priority === 'Urgent' || r.priority === 'Emergency').length,
      inbound: tab === 'inbound' ? rows.length : 0,
    };
  }, [rows, tab]);

  const clearPatient = () => {
    if (embedded) return;
    setSelectedPatient(null);
  };

  const onSubmit = async () => {
    if (!apiOn) return toast.error('Backend API is not configured');
    if (!selectedPatient) return toast.error('Select a patient first');
    if (reason.trim().length < 3) return toast.error('Reason is required (min 3 characters)');
    if (referralKind === 'Internal' && !toDepartment.trim()) {
      return toast.error('Destination department is required');
    }
    if (referralKind === 'External' && !externalFacility.trim()) {
      return toast.error('External facility is required');
    }

    setSubmitting(true);
    try {
      await createReferral({
        personId: selectedPatient.personId,
        referralKind,
        careSetting: referralKind === 'External' ? 'Outpatient' : careSetting,
        priority,
        fromDepartment: fromDepartment.trim() || undefined,
        toDepartment: referralKind === 'Internal' ? toDepartment.trim() : undefined,
        toDoctorLabel: toDoctorLabel.trim() || undefined,
        externalFacility: referralKind === 'External' ? externalFacility.trim() : undefined,
        externalContact: externalContact.trim() || undefined,
        reason: reason.trim(),
        provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
        clinicalSummary: clinicalSummary.trim() || undefined,
        specificQuestion: specificQuestion.trim() || undefined,
      });
      toast.success('Referral submitted — Records will route or allocate');
      setReason('');
      setProvisionalDiagnosis('');
      setClinicalSummary('');
      setSpecificQuestion('');
      setToDoctorLabel('');
      setExternalFacility('');
      setExternalContact('');
      setTab('mine');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to submit referral');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (id: number, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async () => {
    if (!cancelRow) return;
    setSubmitting(true);
    try {
      await cancelReferral(cancelRow.referralId, cancelReason.trim() || undefined);
      toast.success('Referral cancelled');
      setCancelRow(null);
      setCancelReason('');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onComplete = async () => {
    if (!completeRow) return;
    setSubmitting(true);
    try {
      await completeReferral(completeRow.referralId, {
        outcomeNote: outcomeNote.trim() || undefined,
      });
      toast.success('Referral completed');
      setCompleteRow(null);
      setOutcomeNote('');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Complete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <div className="space-y-4">
      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Backend API is not configured. Set <code>VITE_USE_API=true</code> and <code>VITE_API_BASE_URL</code>.
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard title="Open (list)" value={String(kpis.pending)} icon={Send} />
        <SummaryCard title="Urgent / Emergency" value={String(kpis.urgent)} icon={Send} />
        <SummaryCard title="Inbound open" value={String(tab === 'inbound' ? rows.length : '—')} icon={CheckCircle2} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="new">New referral</TabsTrigger>
            <TabsTrigger value="mine">My open</TabsTrigger>
            <TabsTrigger value="inbound">Received / Inbound</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          {tab !== 'new' && (
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          )}
        </div>

        <TabsContent value="new" className="mt-4">
          <Card className="space-y-4 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Select a patient. Doctors set destination department/facility, priority, and clinical reason — no bed selection.
            </p>

            {!selectedPatient ? (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                <UserRound className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No patient selected</p>
                <Button onClick={() => setPatientModal(true)} disabled={!apiOn || !patientsApiOn}>
                  <Search className="h-4 w-4 mr-2" /> Select patient
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPatient.hospitalNo} · ID {selectedPatient.personId}
                    </p>
                  </div>
                  {!embedded && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPatientModal(true)}>Change</Button>
                      <Button size="sm" variant="ghost" onClick={clearPatient}>Clear</Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Kind</Label>
                    <Select value={referralKind} onValueChange={(v) => setReferralKind(v as ReferralKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Internal">Internal</SelectItem>
                        <SelectItem value="External">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as ReferralPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {referralKind === 'Internal' && (
                    <div className="space-y-1.5">
                      <Label>Care setting</Label>
                      <Select value={careSetting} onValueChange={(v) => setCareSetting(v as CareSetting)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Outpatient">Outpatient</SelectItem>
                          <SelectItem value="Inpatient">Inpatient (Records/Nurse allocates bed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>From department</Label>
                    <Input value={fromDepartment} onChange={(e) => setFromDepartment(e.target.value)} />
                  </div>
                  {referralKind === 'Internal' ? (
                    <>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Destination department</Label>
                        <Select value={toDepartment || '__none'} onValueChange={(v) => setToDepartment(v === '__none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Select…</SelectItem>
                            {DEST_DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Preferred doctor (optional)</Label>
                        <Input
                          value={toDoctorLabel}
                          onChange={(e) => setToDoctorLabel(e.target.value)}
                          placeholder="Name or specialty"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>External facility</Label>
                        <Input
                          value={externalFacility}
                          onChange={(e) => setExternalFacility(e.target.value)}
                          placeholder="Receiving hospital"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>External contact</Label>
                        <Input value={externalContact} onChange={(e) => setExternalContact(e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Reason</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Provisional diagnosis</Label>
                    <Textarea value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Clinical summary</Label>
                    <Textarea value={clinicalSummary} onChange={(e) => setClinicalSummary(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Specific question</Label>
                    <Input value={specificQuestion} onChange={(e) => setSpecificQuestion(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => void onSubmit()} disabled={submitting || !apiOn}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Submit referral
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <ReferralTable
            rows={rows}
            loading={loading}
            busyId={busyId}
            mode="mine"
            onView={setDetail}
            onCancel={(r) => {
              setCancelRow(r);
              setCancelReason('');
            }}
          />
        </TabsContent>
        <TabsContent value="inbound" className="mt-4">
          <ReferralTable
            rows={rows}
            loading={loading}
            busyId={busyId}
            mode="inbound"
            onView={setDetail}
            onAccept={(r) => void runAction(r.referralId, () => acceptReferral(r.referralId), 'Referral accepted')}
            onAttend={(r) => void runAction(r.referralId, () => attendReferral(r.referralId), 'Attendance started')}
            onComplete={(r) => {
              setCompleteRow(r);
              setOutcomeNote('');
            }}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ReferralTable rows={rows} loading={loading} busyId={busyId} mode="history" onView={setDetail} />
        </TabsContent>
      </Tabs>

      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select patient</DialogTitle>
            <DialogDescription>Search by name, hospital number, or phone</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Type at least 2 characters…"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto space-y-1">
            {patientSearchLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </p>
            )}
            {!patientSearchLoading && patientSearch.trim().length >= 2 && patientResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No patients found</p>
            )}
            {patientResults.map((p) => (
              <button
                key={p.personId}
                type="button"
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                onClick={() =>
                  selectPatient({
                    personId: p.personId,
                    name: personDisplayName(p),
                    hospitalNo: p.hospitalNo || `PID-${p.personId}`,
                  })
                }
              >
                <p className="text-sm font-medium">{personDisplayName(p)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.hospitalNo ?? `ID ${p.personId}`}
                  {p.patientPhoneNo ? ` · ${p.patientPhoneNo}` : ''}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.referralNo}</DialogTitle>
            <DialogDescription>
              {detail ? referralPatientName(detail) : ''} · {detail?.status}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><b>Kind:</b> {detail.referralKind} · <b>Setting:</b> {detail.careSetting} · <b>Priority:</b> {detail.priority}</p>
              <p><b>From:</b> {detail.fromDepartment ?? '—'} → <b>To:</b> {detail.toDepartment ?? detail.externalFacility ?? '—'}</p>
              {detail.toDoctorLabel && <p><b>Preferred doctor:</b> {detail.toDoctorLabel}</p>}
              <p><b>Reason:</b> {detail.reason}</p>
              {detail.clinicalSummary && <p><b>Summary:</b> {detail.clinicalSummary}</p>}
              {detail.returnReason && <p className="text-amber-800"><b>Return:</b> {detail.returnReason}</p>}
              {detail.rejectionReason && <p className="text-rose-700"><b>Rejection:</b> {detail.rejectionReason}</p>}
              <div className="pt-2 border-t space-y-1">
                <p className="font-medium">Timeline</p>
                {(detail.events ?? []).length === 0 && <p className="text-muted-foreground">No events yet</p>}
                {(detail.events ?? []).map((e) => (
                  <p key={e.eventId} className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()} · {e.eventType} · {e.oldStatus ?? '—'} → {e.newStatus ?? '—'}
                    {e.note ? ` — ${e.note}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelRow)} onOpenChange={(o) => !o && setCancelRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel referral</DialogTitle>
            <DialogDescription>{cancelRow?.referralNo}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Optional reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRow(null)}>Back</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void onCancel()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel referral'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(completeRow)} onOpenChange={(o) => !o && setCompleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete referral</DialogTitle>
            <DialogDescription>{completeRow?.referralNo}</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Outcome note (optional)" value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteRow(null)}>Back</Button>
            <Button disabled={submitting} onClick={() => void onComplete()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Referrals"
      flowTitle="Clinical Referrals"
      flowSubtitle="Internal/external referral — no bed selection by doctor"
      onClose={onClose}
      onOpenFull={onOpenFull}
      patientContext={patientContext ?? (selectedPatient
        ? { id: String(selectedPatient.personId), name: selectedPatient.name, hospitalId: selectedPatient.hospitalNo }
        : undefined)}
    >
      {body}
    </ClinicalPageShell>
  );
};

function ReferralTable({
  rows,
  loading,
  busyId,
  mode,
  onView,
  onCancel,
  onAccept,
  onAttend,
  onComplete,
}: {
  rows: ApiReferral[];
  loading: boolean;
  busyId: number | null;
  mode: 'mine' | 'inbound' | 'history';
  onView: (r: ApiReferral) => void;
  onCancel?: (r: ApiReferral) => void;
  onAccept?: (r: ApiReferral) => void;
  onAttend?: (r: ApiReferral) => void;
  onComplete?: (r: ApiReferral) => void;
}) {
  if (loading) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading referrals…
      </Card>
    );
  }
  if (rows.length === 0) {
    return <Card className="text-sm text-muted-foreground">No referrals in this list.</Card>;
  }
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Referral</th>
            <th className="p-3">Patient</th>
            <th className="p-3">Destination</th>
            <th className="p-3">Priority</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.referralId} className="border-t">
              <td className="p-3 font-medium">{r.referralNo}</td>
              <td className="p-3">{referralPatientName(r)}</td>
              <td className="p-3">{r.toDepartment ?? r.externalFacility ?? '—'}</td>
              <td className="p-3">{r.priority}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusTone(r.status)}`}>{r.status}</span>
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onView(r)}><Eye className="h-4 w-4" /></Button>
                  {mode === 'mine' && onCancel && ['Submitted', 'UnderReview', 'Returned', 'AwaitingBed'].includes(r.status) && (
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r)}><XCircle className="h-4 w-4" /></Button>
                  )}
                  {mode === 'inbound' && r.status === 'QueuedForDept' && onAccept && (
                    <Button size="sm" variant="outline" disabled={busyId === r.referralId} onClick={() => onAccept(r)}>
                      Accept
                    </Button>
                  )}
                  {mode === 'inbound' && r.status === 'Accepted' && onAttend && (
                    <Button size="sm" variant="outline" disabled={busyId === r.referralId} onClick={() => onAttend(r)}>
                      Attend
                    </Button>
                  )}
                  {mode === 'inbound' && ['Accepted', 'InAttendance'].includes(r.status) && onComplete && (
                    <Button size="sm" disabled={busyId === r.referralId} onClick={() => onComplete(r)}>
                      Complete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default DocReferrals;
