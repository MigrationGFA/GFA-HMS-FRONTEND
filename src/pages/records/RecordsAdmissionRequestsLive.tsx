import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Activity, ClipboardList, CheckCircle2, XCircle, BedDouble, UserPlus, Eye,
  Search, RefreshCw, Loader2, Printer,
} from 'lucide-react';
import { recordsNav } from '@/pages/recordsNav';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { ApiError } from '@/lib/api/client';
import {
  admissionRequestPatientName,
  isAdmissionRequestsApiEnabled,
  listAdmissionRequests,
  updateAdmissionRequest,
  type ApiAdmissionRequest,
} from '@/lib/api/admission-requests';
import {
  createAdmission,
  isAdmissionsApiEnabled,
  listBeds,
  listWards,
  type BedRecord,
  type WardRecord,
} from '@/lib/api/admissions';

const Shell = ({ title, breadcrumb, children }: { title: string; breadcrumb: string; children: React.ReactNode }) => (
  <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          Records Department / <span className="font-medium text-foreground">{breadcrumb}</span>
        </p>
        <h1 className="text-2xl font-bold font-display">{title}</h1>
      </div>
      {children}
    </div>
  </DashboardLayout>
);

function mapStatusLabel(status: string): string {
  switch (status) {
    case 'Submitted': return 'Pending';
    case 'UnderReview': return 'Under Review';
    case 'Admitted': return 'Admitted';
    default: return status;
  }
}

export function RecordsAdmissionRequestsLive() {
  const navigate = useNavigate();
  const apiOn = isAdmissionRequestsApiEnabled() && isAdmissionsApiEnabled();

  const [rows, setRows] = useState<ApiAdmissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ApiAdmissionRequest | null>(null);
  const [approveRow, setApproveRow] = useState<ApiAdmissionRequest | null>(null);
  const [rejectRow, setRejectRow] = useState<ApiAdmissionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [admitRow, setAdmitRow] = useState<ApiAdmissionRequest | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [wardsError, setWardsError] = useState<string | null>(null);
  const [bedsError, setBedsError] = useState<string | null>(null);
  const [wardId, setWardId] = useState<string>('');
  const [bedId, setBedId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdmissionRequests({
        scope: 'all',
        status: 'Submitted,UnderReview,Approved,Admitted,Rejected,Cancelled',
        q: search.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.meta?.total ?? data.items.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load admission requests');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiOn, search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!apiOn || !admitRow) return;
    let cancelled = false;
    const sex = admitRow.person?.sex ?? undefined;
    setWardsLoading(true);
    setWardsError(null);
    setWards([]);
    listWards({ status: 'Active', personSex: sex || undefined })
      .then((list) => {
        if (cancelled) return;
        setWards(list);
        const preferred = admitRow.wardId != null ? String(admitRow.wardId) : '';
        const preferredOk = preferred && list.some((w) => String(w.wardId) === preferred);
        if (preferredOk) {
          setWardId(preferred);
        } else {
          const withBeds = list.find((w) => (w.availableBeds ?? 0) > 0) ?? list[0];
          setWardId(withBeds ? String(withBeds.wardId) : '');
        }
        if (list.length === 0) {
          setWardsError('No active wards found for this patient. Ask admin to seed standard wards/beds.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setWards([]);
        setWardId('');
        const msg = err instanceof ApiError ? err.message : 'Could not load wards';
        setWardsError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setWardsLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiOn, admitRow]);

  useEffect(() => {
    const n = Number(wardId);
    if (!wardId || !Number.isFinite(n) || n <= 0) {
      setBeds([]);
      setBedsError(null);
      setBedsLoading(false);
      return;
    }
    let cancelled = false;
    setBedsLoading(true);
    setBedsError(null);
    setBedId('');
    listBeds({ wardId: n, status: 'AVAILABLE' })
      .then((list) => {
        if (cancelled) return;
        setBeds(list);
        if (list.length === 1) setBedId(String(list[0].bedId));
        if (list.length === 0) {
          setBedsError('No AVAILABLE beds in this ward. Pick another ward or free a bed.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setBeds([]);
        const msg = err instanceof ApiError ? err.message : 'Could not load beds';
        setBedsError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setBedsLoading(false);
      });
    return () => { cancelled = true; };
  }, [wardId]);

  const selectedWard = wards.find((w) => String(w.wardId) === wardId);

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'Submitted' || r.status === 'UnderReview').length,
    approved: rows.filter((r) => r.status === 'Approved').length,
    admitted: rows.filter((r) => r.status === 'Admitted').length,
    rejected: rows.filter((r) => r.status === 'Rejected' || r.status === 'Cancelled').length,
  }), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const name = admissionRequestPatientName(r.person).toLowerCase();
      const hosp = (r.person?.hospitalNo || '').toLowerCase();
      return name.includes(q) || hosp.includes(q) || r.requestNo.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const approve = async (r: ApiAdmissionRequest) => {
    setBusyId(r.admissionRequestId);
    try {
      await updateAdmissionRequest(r.admissionRequestId, { status: 'Approved' });
      toast.success(`Approved ${r.requestNo}`);
      setApproveRow(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: ApiAdmissionRequest) => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setBusyId(r.admissionRequestId);
    try {
      await updateAdmissionRequest(r.admissionRequestId, {
        status: 'Rejected',
        rejectionReason: rejectReason.trim(),
      });
      toast.success(`Rejected ${r.requestNo}`);
      setRejectRow(null);
      setRejectReason('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const openAdmit = (r: ApiAdmissionRequest) => {
    setAdmitRow(r);
    setWardId(r.wardId != null ? String(r.wardId) : '');
    setBedId('');
  };

  const confirmAdmit = async () => {
    if (!admitRow) return;
    if (!wardId || !bedId) {
      toast.error('Select ward and available bed');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createAdmission({
        personId: admitRow.personId,
        wardId: Number(wardId),
        bedId: Number(bedId),
        diagnosis: admitRow.provisionalDiagnosis || undefined,
        admissionRequestId: admitRow.admissionRequestId,
      });
      const bill = result.admissionBill;
      toast.success(
        bill
          ? `Admitted · Invoice ${bill.billNo} · ₦${bill.totalAmount.toLocaleString()} Unpaid at cashier`
          : `Admitted successfully`,
        {
          action: bill
            ? {
                label: 'Open Cashier',
                onClick: () => navigate('/dashboard/cashier/pharmacy?tab=admission'),
              }
            : undefined,
        },
      );
      setAdmitRow(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Admit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title="Admission Requests" breadcrumb="Admission Requests">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total" value={String(counts.total)} icon={ClipboardList} tone="blue" />
        <SummaryCard title="Pending" value={String(counts.pending)} icon={Activity} tone="amber" />
        <SummaryCard title="Approved" value={String(counts.approved)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Admitted" value={String(counts.admitted)} icon={UserPlus} tone="purple" />
        <SummaryCard title="Rejected" value={String(counts.rejected)} icon={XCircle} tone="rose" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search patient, request no., hospital no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Allocate bed and admit — the system posts the configured admission package invoice (Unpaid). Cashier collects; no manual pricing.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading admission requests…
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 border border-rose-200 bg-rose-50/50 rounded-lg">
            <p className="text-sm text-rose-800">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>Retry</Button>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {['Request', 'Patient', 'Hospital No', 'Priority', 'Diagnosis', 'Doctor', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                      No admission requests in queue.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.admissionRequestId} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{r.requestNo}</td>
                      <td className="px-3 py-2 font-medium">{admissionRequestPatientName(r.person)}</td>
                      <td className="px-3 py-2 text-xs">{r.person?.hospitalNo || `PID-${r.personId}`}</td>
                      <td className="px-3 py-2 text-xs">{r.priority}</td>
                      <td className="px-3 py-2 text-xs max-w-[160px] truncate">{r.provisionalDiagnosis || '—'}</td>
                      <td className="px-3 py-2 text-xs">{r.requestedBy || '—'}</td>
                      <td className="px-3 py-2"><StatusBadge status={mapStatusLabel(r.status)} /></td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /></Button>
                          {(r.status === 'Submitted' || r.status === 'UnderReview') && (
                            <>
                              <Button size="sm" variant="ghost" disabled={busyId === r.admissionRequestId} onClick={() => setApproveRow(r)}>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRejectRow(r); setRejectReason(''); }}>
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              </Button>
                            </>
                          )}
                          {r.status !== 'Admitted' && r.status !== 'Rejected' && r.status !== 'Cancelled' && (
                            <Button size="sm" variant="outline" onClick={() => openAdmit(r)}>
                              <BedDouble className="h-3.5 w-3.5 mr-1" /> Admit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <RecordsListPagination
          page={page}
          pageSize={RECORDS_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          loading={loading}
          label="requests"
        />
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.requestNo}</DialogTitle></DialogHeader>
          {detail && (
            <div className="text-sm space-y-2">
              <div><b>Patient:</b> {admissionRequestPatientName(detail.person)}</div>
              <div><b>Hospital No:</b> {detail.person?.hospitalNo || `PID-${detail.personId}`}</div>
              <div><b>Priority:</b> {detail.priority}</div>
              <div><b>Diagnosis:</b> {detail.provisionalDiagnosis || '—'}</div>
              <div><b>Indication:</b> {detail.clinicalIndication || '—'}</div>
              <div><b>Ward preference:</b> {detail.ward?.name || detail.wardPreference || '—'}</div>
              <div><b>Requested by:</b> {detail.requestedBy || '—'}</div>
              <div><b>Status:</b> {mapStatusLabel(detail.status)}</div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setDetail(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveRow} onOpenChange={(v) => !v && setApproveRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve request</DialogTitle></DialogHeader>
          <p className="text-sm">Approve <b>{approveRow?.requestNo}</b> for {admissionRequestPatientName(approveRow?.person)}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveRow(null)}>Cancel</Button>
            <Button disabled={!!busyId} onClick={() => approveRow && void approve(approveRow)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectRow} onOpenChange={(v) => !v && setRejectRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject request</DialogTitle></DialogHeader>
          <Label>Reason *</Label>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!!busyId} onClick={() => rejectRow && void reject(rejectRow)}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!admitRow} onOpenChange={(v) => !v && setAdmitRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate bed &amp; admit — {admitRow?.requestNo}</DialogTitle>
          </DialogHeader>
          {admitRow && (
            <div className="space-y-3 text-sm">
              <p>
                {admissionRequestPatientName(admitRow.person)} ·{' '}
                {admitRow.person?.hospitalNo || `PID-${admitRow.personId}`}
              </p>
              <div>
                <Label>Ward *</Label>
                {wardsLoading ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading wards…
                  </p>
                ) : (
                  <Select value={wardId} onValueChange={(v) => { setWardId(v); setBedId(''); }} disabled={wards.length === 0}>
                    <SelectTrigger><SelectValue placeholder={wards.length ? 'Select ward' : 'No wards available'} /></SelectTrigger>
                    <SelectContent>
                      {wards.map((w) => (
                        <SelectItem key={w.wardId} value={String(w.wardId)}>
                          {w.name} · {w.gender ?? 'Mixed'} · {w.availableBeds ?? 0} free / {w.totalBeds ?? 0} · ₦{(w.dailyBedRate ?? 0).toLocaleString()}/day
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {wardsError && <p className="text-xs text-rose-600 mt-1">{wardsError}</p>}
              </div>
              {selectedWard && (
                <div className="text-xs p-2 bg-muted/40 rounded border space-y-0.5">
                  <div>Class: <b>{selectedWard.wardClass || '—'}</b></div>
                  <div>
                    Beds: <b className="text-emerald-700">{selectedWard.availableBeds ?? 0} available</b>
                    {' · '}
                    <b>{selectedWard.occupiedBeds ?? 0} occupied</b>
                    {' · '}
                    {selectedWard.totalBeds ?? 0} total
                  </div>
                  <div>Daily bed rate: <b>₦{(selectedWard.dailyBedRate ?? 0).toLocaleString()}</b> (configured)</div>
                  <div>Default deposit: <b>₦{(selectedWard.admissionDepositDefault ?? 0).toLocaleString()}</b></div>
                </div>
              )}
              <div>
                <Label>Available bed *</Label>
                {bedsLoading ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading free beds…
                  </p>
                ) : (
                  <Select value={bedId} onValueChange={setBedId} disabled={!wardId || beds.length === 0}>
                    <SelectTrigger><SelectValue placeholder={beds.length ? 'Select bed' : 'No free beds'} /></SelectTrigger>
                    <SelectContent>
                      {beds.map((b) => (
                        <SelectItem key={b.bedId} value={String(b.bedId)}>Bed {b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {bedsError && <p className="text-xs text-rose-600 mt-1">{bedsError}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                On admit, HMS auto-posts Admission Fee + Nursing + Folder + Consumables + Day-1 bed + Deposit. Cashier only collects.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitRow(null)}>Cancel</Button>
            <Button
              disabled={submitting || wardsLoading || bedsLoading || !wardId || !bedId}
              onClick={() => void confirmAdmit()}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Admit &amp; Post Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export default RecordsAdmissionRequestsLive;
