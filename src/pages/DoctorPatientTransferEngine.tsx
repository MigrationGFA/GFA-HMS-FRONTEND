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
import {
  clearDoctorTransferMockStorage,
  isNotificationsApiEnabled,
} from '@/lib/api/notifications';
import {
  cancelTransfer,
  createTransfer,
  isTransfersApiEnabled,
  listTransfers,
  transferPatientName,
  type ApiTransfer,
  type TransferPriority,
  type TransferType,
} from '@/lib/api/transfers';
import { listAdmissions, listWards, type AdmissionRecord, type WardRecord } from '@/lib/api/admissions';
import {
  isPatientsApiEnabled,
  searchPersons,
  type PersonRecord,
} from '@/lib/api/patients';
import { ArrowRightLeft, RefreshCw, Loader2, Plus, Eye, XCircle, Search, UserRound } from 'lucide-react';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const TRANSFER_TYPES: { value: TransferType; label: string }[] = [
  { value: 'WardToWard', label: 'Ward → Ward' },
  { value: 'ClinicToWard', label: 'Clinic → Ward' },
  { value: 'WardToClinic', label: 'Ward → Clinic' },
  { value: 'Department', label: 'Department' },
  { value: 'ICU', label: 'ICU' },
  { value: 'ExternalReferral', label: 'External referral' },
];

const OPEN_STATUSES =
  'Submitted,NursePreparing,AwaitingBed,BedReserved,ReceivingAccepted,InTransit';

function statusTone(status: string): string {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'Rejected' || status === 'Cancelled') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (status === 'Emergency' || status.includes('Transit')) return 'bg-amber-100 text-amber-800 border-amber-200';
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

export const DocTransfers = ({ embedded, patientContext, onClose, onOpenFull }: ClinicalEmbeddedProps = {}) => {
  const apiOn = isTransfersApiEnabled();
  const patientsApiOn = isPatientsApiEnabled();
  const [tab, setTab] = useState<'new' | 'mine' | 'completed'>('new');
  const [rows, setRows] = useState<ApiTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [detail, setDetail] = useState<ApiTransfer | null>(null);
  const [cancelRow, setCancelRow] = useState<ApiTransfer | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [patientModal, setPatientModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PersonRecord[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  const [admissionId, setAdmissionId] = useState('');
  const [transferType, setTransferType] = useState<TransferType>('WardToWard');
  const [priority, setPriority] = useState<TransferPriority>('Routine');
  const [toWardId, setToWardId] = useState('');
  const [toWardPreference, setToWardPreference] = useState('');
  const [reason, setReason] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [externalFacility, setExternalFacility] = useState('');

  const selectPatient = useCallback((p: SelectedPatient) => {
    setSelectedPatient(p);
    setAdmissionId('');
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
    if (!embedded) toast.success(`Transfer workspace for ${ctx.name}`);
  });

  useEffect(() => {
    if (apiOn && isNotificationsApiEnabled()) {
      clearDoctorTransferMockStorage();
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
      const status = tab === 'completed' ? 'Completed,Rejected,Cancelled' : OPEN_STATUSES;
      const data = await listTransfers({
        scope: 'mine',
        status,
        personId: selectedPatient?.personId,
        limit: 100,
      });
      setRows(data.items);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load transfers';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab, selectedPatient?.personId]);

  const loadMeta = useCallback(async () => {
    if (!apiOn) return;
    try {
      const w = await listWards({ status: 'Active' });
      setWards(w);
    } catch {
      /* optional */
    }
  }, [apiOn]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!apiOn || !selectedPatient) {
      setAdmissions([]);
      return;
    }
    let cancelled = false;
    listAdmissions({ status: 'ADMITTED', limit: 50 })
      .then((a) => {
        if (cancelled) return;
        setAdmissions((a.items ?? []).filter((row) => row.personId === selectedPatient.personId));
      })
      .catch(() => {
        if (!cancelled) setAdmissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, selectedPatient]);

  useEffect(() => {
    if (tab !== 'new') void load();
  }, [tab, load]);

  useEffect(() => {
    if (admissions.length === 1 && !admissionId) {
      setAdmissionId(String(admissions[0].admissionId));
    }
  }, [admissions, admissionId]);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => !['Completed', 'Rejected', 'Cancelled'].includes(r.status));
    return {
      pending: open.length,
      urgent: open.filter((r) => r.priority === 'Urgent' || r.priority === 'Emergency').length,
      completed: rows.filter((r) => r.status === 'Completed').length,
    };
  }, [rows]);

  const clearPatient = () => {
    if (embedded) return;
    setSelectedPatient(null);
    setAdmissionId('');
  };

  const onSubmit = async () => {
    if (!apiOn) return toast.error('Backend API is not configured');
    if (!selectedPatient) return toast.error('Select a patient first');
    if (reason.trim().length < 3) return toast.error('Reason is required (min 3 characters)');
    if (transferType === 'ExternalReferral' && !externalFacility.trim()) {
      return toast.error('External facility is required for external referrals');
    }

    setSubmitting(true);
    try {
      const pref =
        toWardPreference.trim() ||
        wards.find((w) => String(w.wardId) === toWardId)?.name ||
        undefined;
      await createTransfer({
        personId: selectedPatient.personId,
        admissionId: admissionId ? Number(admissionId) : undefined,
        transferType,
        priority,
        toWardId: toWardId ? Number(toWardId) : undefined,
        toWardPreference: pref,
        destinationLabel: pref,
        reason: reason.trim(),
        clinicalNotes: clinicalNotes.trim() || undefined,
        externalFacility: externalFacility.trim() || undefined,
      });
      toast.success('Transfer requested — Records/Nursing will allocate bed');
      setReason('');
      setClinicalNotes('');
      setExternalFacility('');
      setToWardId('');
      setToWardPreference('');
      setTab('mine');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to submit transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    if (!cancelRow) return;
    setSubmitting(true);
    try {
      await cancelTransfer(cancelRow.transferId, cancelReason.trim() || undefined);
      toast.success('Transfer cancelled');
      setCancelRow(null);
      setCancelReason('');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cancel failed');
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
        <SummaryCard title="Open (mine)" value={String(kpis.pending)} icon={ArrowRightLeft} />
        <SummaryCard title="Urgent / Emergency" value={String(kpis.urgent)} icon={ArrowRightLeft} />
        <SummaryCard title="Completed (list)" value={String(kpis.completed)} icon={ArrowRightLeft} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="new">New request</TabsTrigger>
            <TabsTrigger value="mine">My open</TabsTrigger>
            <TabsTrigger value="completed">History</TabsTrigger>
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
              Select a patient first. Doctors request destination unit, urgency, and reason only — no bed selection.
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
                      <Button size="sm" variant="outline" onClick={() => setPatientModal(true)}>
                        Change
                      </Button>
                      <Button size="sm" variant="ghost" onClick={clearPatient}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Active admission (optional)</Label>
                    <Select value={admissionId || '__none'} onValueChange={(v) => setAdmissionId(v === '__none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select admission" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None / auto-detect</SelectItem>
                        {admissions.map((a) => (
                          <SelectItem key={a.admissionId} value={String(a.admissionId)}>
                            #{a.admissionId} · {a.ward?.name ?? 'Ward'} · {a.bed?.label ?? '—'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {admissions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No active admission found for this patient (clinic transfers may still proceed).
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Transfer type</Label>
                    <Select value={transferType} onValueChange={(v) => setTransferType(v as TransferType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRANSFER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TransferPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred destination ward</Label>
                    <Select
                      value={toWardId || '__none'}
                      onValueChange={(v) => {
                        if (v === '__none') {
                          setToWardId('');
                          return;
                        }
                        setToWardId(v);
                        const w = wards.find((x) => String(x.wardId) === v);
                        if (w) setToWardPreference(w.name);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Preference only" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Text preference only</SelectItem>
                        {wards.map((w) => (
                          <SelectItem key={w.wardId} value={String(w.wardId)}>
                            {w.name} ({w.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destination preference / label</Label>
                    <Input
                      value={toWardPreference}
                      onChange={(e) => setToWardPreference(e.target.value)}
                      placeholder="e.g. Rehab Ward"
                    />
                  </div>
                  {transferType === 'ExternalReferral' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>External facility</Label>
                      <Input
                        value={externalFacility}
                        onChange={(e) => setExternalFacility(e.target.value)}
                        placeholder="Receiving hospital / facility"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Reason</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Clinical notes</Label>
                    <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} />
                  </div>
                </div>
                <Button onClick={() => void onSubmit()} disabled={submitting || !apiOn}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Submit transfer request
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <TransferTable
            rows={rows}
            loading={loading}
            onView={setDetail}
            onCancel={(r) => {
              setCancelRow(r);
              setCancelReason('');
            }}
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <TransferTable rows={rows} loading={loading} onView={setDetail} />
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
            <DialogTitle>{detail?.transferNo}</DialogTitle>
            <DialogDescription>
              {detail ? transferPatientName(detail) : ''} · {detail?.status}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><b>Type:</b> {detail.transferType} · <b>Priority:</b> {detail.priority}</p>
              <p><b>From:</b> {detail.fromWard?.name ?? '—'} → <b>To:</b> {detail.toWard?.name ?? detail.toWardPreference ?? '—'}</p>
              <p><b>Bed:</b> {detail.allocatedBed?.label ?? 'Not allocated (Records/Nurse)'}</p>
              <p><b>Reason:</b> {detail.reason}</p>
              {detail.clinicalNotes && <p><b>Notes:</b> {detail.clinicalNotes}</p>}
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
            <DialogTitle>Cancel transfer</DialogTitle>
            <DialogDescription>{cancelRow?.transferNo}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRow(null)}>Back</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void onCancel()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <ClinicalPageShell
      embedded={embedded}
      shellTitle="Doctor Clinical · Patient Transfers"
      flowTitle="Patient Transfers"
      flowSubtitle="Request ward/unit transfer — no bed selection by doctor"
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

function TransferTable({
  rows,
  loading,
  onView,
  onCancel,
}: {
  rows: ApiTransfer[];
  loading: boolean;
  onView: (r: ApiTransfer) => void;
  onCancel?: (r: ApiTransfer) => void;
}) {
  if (loading) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading transfers…
      </Card>
    );
  }
  if (rows.length === 0) {
    return <Card className="text-sm text-muted-foreground">No transfers in this list.</Card>;
  }
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Transfer</th>
            <th className="p-3">Patient</th>
            <th className="p-3">Destination</th>
            <th className="p-3">Priority</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.transferId} className="border-t">
              <td className="p-3 font-medium">{r.transferNo}</td>
              <td className="p-3">{transferPatientName(r)}</td>
              <td className="p-3">{r.toWard?.name ?? r.toWardPreference ?? r.destinationLabel ?? '—'}</td>
              <td className="p-3">{r.priority}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusTone(r.status)}`}>{r.status}</span>
              </td>
              <td className="p-3 flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onView(r)}><Eye className="h-4 w-4" /></Button>
                {onCancel && !['Completed', 'Rejected', 'Cancelled', 'InTransit'].includes(r.status) && (
                  <Button size="sm" variant="ghost" onClick={() => onCancel(r)}><XCircle className="h-4 w-4" /></Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default DocTransfers;
