import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Send, RefreshCw, Loader2, BedDouble, Eye, Building2,
} from 'lucide-react';
import { recordsNav } from '@/pages/recordsNav';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { ApiError } from '@/lib/api/client';
import {
  ackReferral,
  admitReferral,
  allocateReferral,
  clearExternalReferral,
  getReferral,
  isReferralsApiEnabled,
  listReferrals,
  referralPatientName,
  rejectReferral,
  requestBedReferral,
  returnReferral,
  routeReferral,
  type ApiReferral,
} from '@/lib/api/referrals';
import { listBeds, listWards, type BedRecord, type WardRecord } from '@/lib/api/admissions';

const OPEN =
  'Submitted,UnderReview,QueuedForDept,AwaitingBed,BedAllocated,Accepted,InAttendance,Returned';

const DEST_DEPARTMENTS = [
  'GMPC', 'OPC', 'Emergency Unit', 'Psychology', 'Social Work', 'Occupational Therapy',
  'Nutrition', 'Physiotherapy', 'Medical Ward', 'Psychiatry Ward', 'Addiction Unit',
  'Child & Adolescent Unit', 'Consultant Review', 'Specialist Clinic',
];

export function RecordsReferralsLive() {
  const apiOn = isReferralsApiEnabled();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiReferral | null>(null);

  const [routeRow, setRouteRow] = useState<ApiReferral | null>(null);
  const [routeDept, setRouteDept] = useState('');
  const [routeDoctor, setRouteDoctor] = useState('');
  const [routeNote, setRouteNote] = useState('');

  const [allocateRow, setAllocateRow] = useState<ApiReferral | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [bedsLoading, setBedsLoading] = useState(false);

  const [reasonRow, setReasonRow] = useState<{ row: ApiReferral; mode: 'reject' | 'return' } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listReferrals({
        status: OPEN,
        q: q.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.meta?.total ?? data.items.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load referrals');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiOn, q, page]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam || !apiOn) return;
    const id = Number(idParam);
    if (!Number.isFinite(id)) return;
    getReferral(id)
      .then((r) => setDetail(r))
      .catch(() => toast.error('Referral not found'))
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete('id');
        setSearchParams(next, { replace: true });
      });
  }, [apiOn, searchParams, setSearchParams]);

  const needBed = rows.filter((r) =>
    ['Submitted', 'UnderReview', 'AwaitingBed'].includes(r.status) &&
    (r.careSetting === 'Inpatient' || r.status === 'AwaitingBed'),
  ).length;
  const externalOpen = rows.filter((r) => r.referralKind === 'External').length;

  const run = async (id: number, fn: () => Promise<unknown>, ok: string) => {
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

  const openAllocate = async (row: ApiReferral) => {
    setAllocateRow(row);
    setWardId(row.allocatedWardId ? String(row.allocatedWardId) : '');
    setBedId('');
    try {
      setWards(await listWards({ status: 'Active' }));
    } catch {
      toast.error('Failed to load wards');
    }
  };

  useEffect(() => {
    if (!allocateRow || !wardId) {
      setBeds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBedsLoading(true);
      try {
        const list = await listBeds({ wardId: Number(wardId), status: 'AVAILABLE' });
        if (!cancelled) setBeds(list);
      } catch {
        if (!cancelled) setBeds([]);
      } finally {
        if (!cancelled) setBedsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allocateRow, wardId]);

  return (
    <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Records Department / <span className="font-medium text-foreground">Clinical Referrals</span>
          </p>
          <h1 className="text-2xl font-bold font-display">Internal &amp; External Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Acknowledge · route to department · allocate bed · clear external
          </p>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">Backend API is not configured.</div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard title="Open referrals" value={String(rows.length)} icon={Send} />
          <SummaryCard title="Need bed / inpatient" value={String(needBed)} icon={BedDouble} />
          <SummaryCard title="External open" value={String(externalOpen)} icon={Building2} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">No open referrals.</div>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Referral</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Kind</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.referralId} className="border-t">
                    <td className="p-3 font-medium">{r.referralNo}</td>
                    <td className="p-3">{referralPatientName(r)}</td>
                    <td className="p-3">{r.referralKind} · {r.careSetting}</td>
                    <td className="p-3">{r.toDepartment ?? r.externalFacility ?? '—'}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="h-4 w-4" /></Button>
                        {r.status === 'Submitted' && (
                          <Button size="sm" variant="outline" disabled={busyId === r.referralId}
                            onClick={() => void run(r.referralId, () => ackReferral(r.referralId), 'Acknowledged')}>
                            Ack
                          </Button>
                        )}
                        {r.referralKind === 'Internal' && ['Submitted', 'UnderReview', 'Returned'].includes(r.status) && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setRouteRow(r);
                            setRouteDept(r.toDepartment || '');
                            setRouteDoctor(r.toDoctorLabel || '');
                            setRouteNote('');
                          }}>
                            Route
                          </Button>
                        )}
                        {r.referralKind === 'Internal' && ['Submitted', 'UnderReview'].includes(r.status) && (
                          <Button size="sm" variant="outline" disabled={busyId === r.referralId}
                            onClick={() => void run(r.referralId, () => requestBedReferral(r.referralId), 'Marked awaiting bed')}>
                            Need bed
                          </Button>
                        )}
                        {r.referralKind === 'Internal' && ['Submitted', 'UnderReview', 'AwaitingBed'].includes(r.status) && (
                          <Button size="sm" variant="outline" onClick={() => void openAllocate(r)}>Allocate</Button>
                        )}
                        {r.status === 'BedAllocated' && (
                          <Button size="sm" disabled={busyId === r.referralId}
                            onClick={() => void run(r.referralId, () => admitReferral(r.referralId), 'Patient admitted')}>
                            Admit
                          </Button>
                        )}
                        {r.referralKind === 'External' && ['Submitted', 'UnderReview'].includes(r.status) && (
                          <Button size="sm" disabled={busyId === r.referralId}
                            onClick={() => void run(r.referralId, () => clearExternalReferral(r.referralId), 'External cleared')}>
                            Clear external
                          </Button>
                        )}
                        {['Submitted', 'UnderReview', 'QueuedForDept'].includes(r.status) && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setReasonRow({ row: r, mode: 'return' }); setReasonText(''); }}>Return</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReasonRow({ row: r, mode: 'reject' }); setReasonText(''); }}>Reject</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
          label="referrals"
        />

        <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detail?.referralNo}</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="space-y-2 text-sm">
                <p>{referralPatientName(detail)} · {detail.status}</p>
                <p><b>Reason:</b> {detail.reason}</p>
                {detail.clinicalSummary && <p><b>Summary:</b> {detail.clinicalSummary}</p>}
                <p><b>Bed:</b> {detail.allocatedBed?.label ?? '—'}</p>
                {(detail.events ?? []).map((e) => (
                  <p key={e.eventId} className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()} · {e.eventType} · {e.oldStatus ?? '—'} → {e.newStatus ?? '—'}
                  </p>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(routeRow)} onOpenChange={(o) => !o && setRouteRow(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Route to department</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={routeDept || '__none'} onValueChange={(v) => setRouteDept(v === '__none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select…</SelectItem>
                    {DEST_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Doctor label (optional)</Label>
                <Input value={routeDoctor} onChange={(e) => setRouteDoctor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea value={routeNote} onChange={(e) => setRouteNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRouteRow(null)}>Back</Button>
              <Button
                disabled={!routeRow || !routeDept.trim() || busyId === routeRow?.referralId}
                onClick={() => {
                  if (!routeRow) return;
                  void run(
                    routeRow.referralId,
                    () => routeReferral(routeRow.referralId, {
                      toDepartment: routeDept.trim(),
                      toDoctorLabel: routeDoctor.trim() || undefined,
                      note: routeNote.trim() || undefined,
                    }),
                    'Routed to department',
                  ).then(() => setRouteRow(null));
                }}
              >
                Route
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(allocateRow)} onOpenChange={(o) => !o && setAllocateRow(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Allocate ward &amp; bed</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Ward</Label>
                <Select value={wardId || '__none'} onValueChange={(v) => { setWardId(v === '__none' ? '' : v); setBedId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select…</SelectItem>
                    {wards.map((w) => (
                      <SelectItem key={w.wardId} value={String(w.wardId)}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Available bed</Label>
                <Select value={bedId || '__none'} onValueChange={(v) => setBedId(v === '__none' ? '' : v)} disabled={!wardId || bedsLoading}>
                  <SelectTrigger><SelectValue placeholder={bedsLoading ? 'Loading…' : 'Select bed'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select…</SelectItem>
                    {beds.map((b) => (
                      <SelectItem key={b.bedId} value={String(b.bedId)}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAllocateRow(null)}>Back</Button>
              <Button
                disabled={!allocateRow || !wardId || !bedId}
                onClick={() => {
                  if (!allocateRow) return;
                  void run(
                    allocateRow.referralId,
                    () => allocateReferral(allocateRow.referralId, {
                      wardId: Number(wardId),
                      bedId: Number(bedId),
                    }),
                    'Bed reserved',
                  ).then(() => setAllocateRow(null));
                }}
              >
                Allocate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(reasonRow)} onOpenChange={(o) => !o && setReasonRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reasonRow?.mode === 'reject' ? 'Reject referral' : 'Return for more info'}</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Reason (required)"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReasonRow(null)}>Back</Button>
              <Button
                variant={reasonRow?.mode === 'reject' ? 'destructive' : 'default'}
                disabled={!reasonRow || reasonText.trim().length < 3}
                onClick={() => {
                  if (!reasonRow) return;
                  const { row, mode } = reasonRow;
                  void run(
                    row.referralId,
                    () => (mode === 'reject'
                      ? rejectReferral(row.referralId, reasonText.trim())
                      : returnReferral(row.referralId, reasonText.trim())),
                    mode === 'reject' ? 'Rejected' : 'Returned',
                  ).then(() => setReasonRow(null));
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}

export default RecordsReferralsLive;
