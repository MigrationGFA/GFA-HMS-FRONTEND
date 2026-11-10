import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRightLeft, RefreshCw, Loader2, CheckCircle2, BedDouble, Send, XCircle,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  acceptTransfer,
  allocateTransfer,
  confirmArrivalTransfer,
  departTransfer,
  isTransfersApiEnabled,
  listTransfers,
  prepareTransfer,
  rejectTransfer,
  transferPatientName,
  type ApiTransfer,
} from '@/lib/api/transfers';
import { listBeds, listWards, type BedRecord, type WardRecord } from '@/lib/api/admissions';
import { nursingNav } from '@/pages/NursingCenter';
import DashboardLayout from '@/components/DashboardLayout';

const QUEUE_STATUSES =
  'Submitted,NursePreparing,AwaitingBed,BedReserved,ReceivingAccepted,InTransit';

export function NurseTransferQueue() {
  const apiOn = isTransfersApiEnabled();
  const [tab, setTab] = useState<'outgoing' | 'receiving'>('outgoing');
  const [rows, setRows] = useState<ApiTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [allocateRow, setAllocateRow] = useState<ApiTransfer | null>(null);
  const [departRow, setDepartRow] = useState<ApiTransfer | null>(null);
  const [rejectRow, setRejectRow] = useState<ApiTransfer | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [bedsLoading, setBedsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listTransfers({
        status: QUEUE_STATUSES,
        q: q.trim() || undefined,
        limit: 100,
      });
      setRows(data.items);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load transfers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const outgoing = rows.filter((r) =>
    ['Submitted', 'NursePreparing', 'AwaitingBed', 'ReceivingAccepted'].includes(r.status),
  );
  const receiving = rows.filter((r) =>
    ['BedReserved', 'InTransit'].includes(r.status),
  );

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

  const openAllocate = async (row: ApiTransfer) => {
    setAllocateRow(row);
    setWardId(row.toWardId ? String(row.toWardId) : '');
    setBedId('');
    setBeds([]);
    try {
      const w = await listWards({ status: 'Active' });
      setWards(w);
    } catch {
      toast.error('Failed to load wards');
    }
  };

  useEffect(() => {
    if (!allocateRow || !wardId) return;
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

  const list = tab === 'outgoing' ? outgoing : receiving;

  return (
    <DashboardLayout navItems={nursingNav} title="Nursing · Patient Transfers">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Transfer Queue</h1>
          <p className="text-sm text-muted-foreground">
            Prepare, allocate (optional), depart · Receiving: accept & confirm arrival
          </p>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            Backend API is not configured.
          </div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard title="Outgoing" value={String(outgoing.length)} icon={Send} />
          <SummaryCard title="Receiving" value={String(receiving.length)} icon={BedDouble} />
          <SummaryCard title="In queue" value={String(rows.length)} icon={ArrowRightLeft} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            className="max-w-xs"
            placeholder="Search transfer / patient"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="outgoing">Current ward</TabsTrigger>
            <TabsTrigger value="receiving">Receiving ward</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-xl border p-6 text-sm text-muted-foreground">No transfers in this queue.</div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3">Transfer</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.transferId} className="border-t">
                        <td className="p-3 font-medium">{r.transferNo}<div className="text-xs text-muted-foreground">{r.priority}</div></td>
                        <td className="p-3">{transferPatientName(r)}</td>
                        <td className="p-3">
                          {r.fromWard?.name ?? '—'} → {r.toWard?.name ?? r.toWardPreference ?? '—'}
                          {r.allocatedBed && <div className="text-xs">Bed {r.allocatedBed.label}</div>}
                        </td>
                        <td className="p-3">{r.status}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {['Submitted', 'NursePreparing'].includes(r.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === r.transferId}
                                onClick={() =>
                                  void run(r.transferId, () => prepareTransfer(r.transferId, { ready: true }), 'Marked ready for bed')
                                }
                              >
                                Prepare
                              </Button>
                            )}
                            {['Submitted', 'NursePreparing', 'AwaitingBed'].includes(r.status) && (
                              <Button size="sm" variant="outline" onClick={() => void openAllocate(r)}>
                                Allocate
                              </Button>
                            )}
                            {r.status === 'ReceivingAccepted' && (
                              <Button size="sm" onClick={() => { setDepartRow(r); setHandoverNotes(r.handoverNotes ?? ''); }}>
                                Depart
                              </Button>
                            )}
                            {r.status === 'BedReserved' && (
                              <Button
                                size="sm"
                                disabled={busyId === r.transferId}
                                onClick={() =>
                                  void run(r.transferId, () => acceptTransfer(r.transferId), 'Accepted by receiving ward')
                                }
                              >
                                Accept
                              </Button>
                            )}
                            {r.status === 'InTransit' && (
                              <Button
                                size="sm"
                                disabled={busyId === r.transferId}
                                onClick={() =>
                                  void run(r.transferId, () => confirmArrivalTransfer(r.transferId), 'Arrival confirmed — location updated')
                                }
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm arrival
                              </Button>
                            )}
                            {!['InTransit', 'Completed'].includes(r.status) && (
                              <Button size="sm" variant="ghost" onClick={() => { setRejectRow(r); setRejectReason(''); }}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={Boolean(allocateRow)} onOpenChange={(o) => !o && setAllocateRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocate bed — {allocateRow?.transferNo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Ward</Label>
                <Select value={wardId} onValueChange={(v) => { setWardId(v); setBedId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.wardId} value={String(w.wardId)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Available bed</Label>
                <Select value={bedId} onValueChange={setBedId} disabled={!wardId || bedsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={bedsLoading ? 'Loading…' : 'Select bed'} />
                  </SelectTrigger>
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
                onClick={() => {
                  if (!allocateRow) return;
                  void run(
                    allocateRow.transferId,
                    () => allocateTransfer(allocateRow.transferId, { wardId: Number(wardId), bedId: Number(bedId) }),
                    'Bed reserved',
                  ).then(() => setAllocateRow(null));
                }}
              >
                Reserve bed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(departRow)} onOpenChange={(o) => !o && setDepartRow(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark departed — {departRow?.transferNo}</DialogTitle></DialogHeader>
            <Textarea
              placeholder="Handover notes"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepartRow(null)}>Back</Button>
              <Button
                disabled={busyId != null}
                onClick={() => {
                  if (!departRow) return;
                  void run(
                    departRow.transferId,
                    () => departTransfer(departRow.transferId, { handoverNotes }),
                    'Patient in transit',
                  ).then(() => setDepartRow(null));
                }}
              >
                Depart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(rejectRow)} onOpenChange={(o) => !o && setRejectRow(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject transfer</DialogTitle></DialogHeader>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (required)" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectRow(null)}>Back</Button>
              <Button
                variant="destructive"
                disabled={rejectReason.trim().length < 3 || busyId != null}
                onClick={() => {
                  if (!rejectRow) return;
                  void run(
                    rejectRow.transferId,
                    () => rejectTransfer(rejectRow.transferId, rejectReason.trim()),
                    'Transfer rejected',
                  ).then(() => setRejectRow(null));
                }}
              >
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default NurseTransferQueue;
