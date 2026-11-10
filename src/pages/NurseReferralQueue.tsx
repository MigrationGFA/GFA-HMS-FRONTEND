import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Send, RefreshCw, Loader2, BedDouble, CheckCircle2,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  admitReferral,
  allocateReferral,
  isReferralsApiEnabled,
  listReferrals,
  referralPatientName,
  type ApiReferral,
} from '@/lib/api/referrals';
import { listBeds, listWards, type BedRecord, type WardRecord } from '@/lib/api/admissions';
import { nursingNav } from '@/pages/NursingCenter';
import DashboardLayout from '@/components/DashboardLayout';

const QUEUE = 'AwaitingBed,BedAllocated,Submitted,UnderReview';

export function NurseReferralQueue() {
  const apiOn = isReferralsApiEnabled();
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [allocateRow, setAllocateRow] = useState<ApiReferral | null>(null);
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
      const data = await listReferrals({
        status: QUEUE,
        kind: 'Internal',
        q: q.trim() || undefined,
        limit: 100,
      });
      setRows(
        data.items.filter(
          (r) =>
            ['AwaitingBed', 'BedAllocated'].includes(r.status) ||
            (r.careSetting === 'Inpatient' && ['Submitted', 'UnderReview'].includes(r.status)),
        ),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [apiOn, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const awaiting = rows.filter((r) => r.status !== 'BedAllocated').length;
  const allocated = rows.filter((r) => r.status === 'BedAllocated').length;

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
    setBeds([]);
    try {
      setWards(await listWards({ status: 'Active' }));
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

  return (
    <DashboardLayout navItems={nursingNav} title="Nursing · Clinical Referrals">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Referral bed allocation</h1>
          <p className="text-sm text-muted-foreground">
            Inpatient internal referrals awaiting ward/bed — allocate then confirm admit
          </p>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">{error}</div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard title="Queue" value={String(rows.length)} icon={Send} />
          <SummaryCard title="Need bed" value={String(awaiting)} icon={BedDouble} />
          <SummaryCard title="Ready to admit" value={String(allocated)} icon={CheckCircle2} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">No inpatient referrals need allocation.</div>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Referral</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Bed</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.referralId} className="border-t">
                    <td className="p-3 font-medium">{r.referralNo}</td>
                    <td className="p-3">{referralPatientName(r)}</td>
                    <td className="p-3">{r.toDepartment ?? '—'}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3">{r.allocatedBed?.label ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {r.status !== 'BedAllocated' && (
                          <Button size="sm" variant="outline" onClick={() => void openAllocate(r)}>
                            Allocate
                          </Button>
                        )}
                        {r.status === 'BedAllocated' && (
                          <Button
                            size="sm"
                            disabled={busyId === r.referralId}
                            onClick={() => void run(r.referralId, () => admitReferral(r.referralId), 'Admitted')}
                          >
                            Admit
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
                      <SelectItem key={w.wardId} value={String(w.wardId)}>{w.name}</SelectItem>
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
      </div>
    </DashboardLayout>
  );
}

export default NurseReferralQueue;
