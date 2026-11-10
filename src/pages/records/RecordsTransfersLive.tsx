import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowRightLeft, RefreshCw, Loader2, BedDouble, CheckCircle2, Eye,
} from 'lucide-react';
import { recordsNav } from '@/pages/recordsNav';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { ApiError } from '@/lib/api/client';
import {
  allocateTransfer,
  confirmArrivalTransfer,
  getTransfer,
  isTransfersApiEnabled,
  listTransfers,
  transferPatientName,
  type ApiTransfer,
} from '@/lib/api/transfers';
import { listBeds, listWards, type BedRecord, type WardRecord } from '@/lib/api/admissions';

const OPEN =
  'Submitted,NursePreparing,AwaitingBed,BedReserved,ReceivingAccepted,InTransit';

export function RecordsTransfersLive() {
  const apiOn = isTransfersApiEnabled();
  const [rows, setRows] = useState<ApiTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiTransfer | null>(null);
  const [allocateRow, setAllocateRow] = useState<ApiTransfer | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [bedsLoading, setBedsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listTransfers({
        status: OPEN,
        q: q.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.meta?.total ?? data.items.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load transfers');
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

  const awaitingBed = rows.filter((r) =>
    ['Submitted', 'NursePreparing', 'AwaitingBed'].includes(r.status),
  ).length;
  const inTransit = rows.filter((r) => r.status === 'InTransit').length;

  const openAllocate = async (row: ApiTransfer) => {
    setAllocateRow(row);
    setWardId(row.toWardId ? String(row.toWardId) : '');
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
        const list = await listBeds({
          wardId: Number(wardId),
          status: 'AVAILABLE',
        });
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
            Records Department / <span className="font-medium text-foreground">Patient Transfers</span>
          </p>
          <h1 className="text-2xl font-bold font-display">Patient Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Allocate ward &amp; bed · verify arrival when needed
          </p>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">Backend API is not configured.</div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard title="Open transfers" value={String(rows.length)} icon={ArrowRightLeft} />
          <SummaryCard title="Need bed" value={String(awaitingBed)} icon={BedDouble} />
          <SummaryCard title="In transit" value={String(inTransit)} icon={CheckCircle2} />
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
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">No open transfers.</div>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Transfer</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Preference</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.transferId} className="border-t">
                    <td className="p-3 font-medium">{r.transferNo}</td>
                    <td className="p-3">{transferPatientName(r)}<div className="text-xs text-muted-foreground">{r.person?.hospitalNo}</div></td>
                    <td className="p-3">{r.toWard?.name ?? r.toWardPreference ?? '—'}{r.allocatedBed && <div className="text-xs">Bed {r.allocatedBed.label}</div>}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void getTransfer(r.transferId).then(setDetail).catch((e) =>
                            toast.error(e instanceof ApiError ? e.message : 'Failed'),
                          );
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {['Submitted', 'NursePreparing', 'AwaitingBed', 'BedReserved'].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => void openAllocate(r)}>
                          Allocate bed
                        </Button>
                      )}
                      {r.status === 'InTransit' && (
                        <Button
                          size="sm"
                          disabled={busyId === r.transferId}
                          onClick={async () => {
                            setBusyId(r.transferId);
                            try {
                              await confirmArrivalTransfer(r.transferId);
                              toast.success('Arrival verified — location updated');
                              void load();
                            } catch (e) {
                              toast.error(e instanceof ApiError ? e.message : 'Failed');
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          Verify arrival
                        </Button>
                      )}
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
          label="transfers"
        />

        <Dialog open={Boolean(allocateRow)} onOpenChange={(o) => !o && setAllocateRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocate — {allocateRow?.transferNo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Doctor preference: {allocateRow?.toWardPreference ?? allocateRow?.destinationLabel ?? '—'}
              </p>
              <div className="space-y-1.5">
                <Label>Ward</Label>
                <Select value={wardId} onValueChange={(v) => { setWardId(v); setBedId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Ward" /></SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.wardId} value={String(w.wardId)}>
                        {w.name} · {w.availableBeds ?? '?'} free
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bed</Label>
                <Select value={bedId} onValueChange={setBedId} disabled={!wardId || bedsLoading}>
                  <SelectTrigger><SelectValue placeholder={bedsLoading ? 'Loading…' : 'Available bed'} /></SelectTrigger>
                  <SelectContent>
                    {beds.map((b) => (
                      <SelectItem key={b.bedId} value={String(b.bedId)}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAllocateRow(null)}>Cancel</Button>
              <Button
                disabled={!wardId || !bedId || busyId != null}
                onClick={async () => {
                  if (!allocateRow) return;
                  setBusyId(allocateRow.transferId);
                  try {
                    await allocateTransfer(allocateRow.transferId, {
                      wardId: Number(wardId),
                      bedId: Number(bedId),
                    });
                    toast.success('Bed reserved');
                    setAllocateRow(null);
                    void load();
                  } catch (e) {
                    toast.error(e instanceof ApiError ? e.message : 'Allocate failed');
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Reserve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{detail?.transferNo}</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="text-sm space-y-2">
                <p>{transferPatientName(detail)} · {detail.status}</p>
                <p>{detail.reason}</p>
                {(detail.events ?? []).map((e) => (
                  <p key={e.eventId} className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()} · {e.eventType}
                  </p>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default RecordsTransfersLive;
