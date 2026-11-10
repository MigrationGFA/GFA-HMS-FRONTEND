import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, FileCheck, Loader2, RefreshCw, Eye } from 'lucide-react';
import { recordsNav } from '@/pages/recordsNav';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { ApiError } from '@/lib/api/client';
import {
  dischargePatientName,
  finalizeDischargeDraft,
  isDischargeApiEnabled,
  listDischargeDrafts,
  returnDischargeDraft,
  type ApiDischargeDraft,
} from '@/lib/api/discharge';

export function RecordsDischargeLive() {
  const apiOn = isDischargeApiEnabled();
  const [rows, setRows] = useState<ApiDischargeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiDischargeDraft | null>(null);
  const [returnRow, setReturnRow] = useState<ApiDischargeDraft | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listDischargeDrafts({
        status: 'AwaitingPayment,PaymentCleared,Submitted',
        q: q.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.meta?.total ?? data.items.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load discharges');
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

  const ready = rows.filter((r) => r.status === 'PaymentCleared').length;
  const awaitingPay = rows.filter((r) =>
    ['AwaitingPayment', 'Submitted'].includes(r.status),
  ).length;

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

  return (
    <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Records Department / <span className="font-medium text-foreground">Discharge Processing</span>
          </p>
          <h1 className="text-2xl font-bold font-display">Discharge Processing</h1>
          <p className="text-sm text-muted-foreground">
            Finalize only after cashier payment clearance · doctor drafts clinical content
          </p>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">Backend API is not configured.</div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard title="In queue" value={String(rows.length)} icon={ClipboardCheck} />
          <SummaryCard title="Awaiting payment" value={String(awaitingPay)} icon={ClipboardCheck} />
          <SummaryCard title="Ready to finalize" value={String(ready)} icon={FileCheck} />
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
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">No discharge drafts in queue.</div>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Draft</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Ward / Bed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.draftId} className="border-t">
                    <td className="p-3 font-medium">{r.draftNo}</td>
                    <td className="p-3">{dischargePatientName(r)}</td>
                    <td className="p-3">
                      {r.admission?.ward?.name ?? '—'} / {r.admission?.bed?.label ?? '—'}
                    </td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="h-4 w-4" /></Button>
                        {r.status === 'PaymentCleared' && (
                          <Button
                            size="sm"
                            disabled={busyId === r.draftId}
                            onClick={() =>
                              void run(r.draftId, () => finalizeDischargeDraft(r.draftId), 'Patient discharged')
                            }
                          >
                            Finalize
                          </Button>
                        )}
                        {['AwaitingPayment', 'Submitted', 'PaymentCleared'].includes(r.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReturnRow(r);
                              setReturnReason('');
                            }}
                          >
                            Return
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

        <RecordsListPagination
          page={page}
          pageSize={RECORDS_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          loading={loading}
          label="discharges"
        />

        <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{detail?.draftNo}</DialogTitle></DialogHeader>
            {detail && (
              <div className="space-y-2 text-sm">
                <p>{dischargePatientName(detail)}</p>
                <p><b>Diagnosis:</b> {detail.finalDiagnosis || '—'}</p>
                <p><b>Summary:</b> {detail.clinicalSummary || '—'}</p>
                <p><b>Meds:</b> {detail.dischargeMedications || '—'}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(returnRow)} onOpenChange={(o) => !o && setReturnRow(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Return to doctor</DialogTitle></DialogHeader>
            <Textarea
              placeholder="Reason (required)"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnRow(null)}>Back</Button>
              <Button
                disabled={!returnRow || returnReason.trim().length < 3}
                onClick={() => {
                  if (!returnRow) return;
                  void run(
                    returnRow.draftId,
                    () => returnDischargeDraft(returnRow.draftId, returnReason.trim()),
                    'Returned to doctor',
                  ).then(() => setReturnRow(null));
                }}
              >
                Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default RecordsDischargeLive;
