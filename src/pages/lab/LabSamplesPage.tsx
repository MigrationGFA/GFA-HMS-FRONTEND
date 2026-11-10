import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode, Loader2, RefreshCw, AlertTriangle, Search, TestTubes, XCircle, ClipboardList,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  isLaboratoryApiEnabled,
  labPatientName,
  listLabRequests,
  listLabSamples,
  collectLabRequestSamples,
  rejectLabSample,
  type ApiLabRequest,
  type ApiLabSample,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone, labStatusTone, labStatusLabel } from './LabPageShell';

type STab = 'queue' | 'collected' | 'rejected';

export const LabSamplesPage = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [tab, setTab] = useState<STab>('queue');
  const [q, setQ] = useState('');
  const [queue, setQueue] = useState<ApiLabRequest[]>([]);
  const [samples, setSamples] = useState<ApiLabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collecting, setCollecting] = useState<ApiLabRequest | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);
  const [rejecting, setRejecting] = useState<ApiLabSample | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [queueRes, samplesRes] = await Promise.all([
        listLabRequests({
          workQueue: true,
          labStatus: 'AwaitingCollection',
          q: q.trim() || undefined,
          limit: 100,
        }),
        listLabSamples({ q: q.trim() || undefined, limit: 100 }),
      ]);
      setQueue(queueRes.items);
      setSamples(samplesRes.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load sample queue');
      setQueue([]);
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const collected = useMemo(() => samples.filter((s) => s.status === 'Collected'), [samples]);
  const rejected = useMemo(() => samples.filter((s) => s.status === 'Rejected'), [samples]);

  const doCollect = async () => {
    if (!collecting) return;
    setCollectBusy(true);
    try {
      const { samples: created } = await collectLabRequestSamples(collecting.labRequestId);
      toast.success(
        `Samples collected for ${collecting.requestNo}: ${created.map((s) => s.sampleNo).join(', ')}`,
      );
      setCollecting(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not collect samples');
    } finally {
      setCollectBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setRejectBusy(true);
    try {
      await rejectLabSample(rejecting.sampleId, rejectReason.trim());
      toast.success(`Sample rejected: ${rejecting.sampleNo}. Request returned to Awaiting Collection.`);
      setRejecting(null);
      setRejectReason('');
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reject sample');
    } finally {
      setRejectBusy(false);
    }
  };

  return (
    <LabShell title="Sample Collection">
      <LabSection
        icon={<QrCode className="h-5 w-5" />}
        title="Sample Collection & Logging"
        desc="Paid requests awaiting collection. Collecting generates one sample number per specimen type. Rejected samples send the request back for a fresh draw."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Awaiting Collection" value={String(queue.length)} icon={ClipboardList} />
        <SummaryCard title="Collected Samples" value={String(collected.length)} icon={TestTubes} />
        <SummaryCard title="Rejected Samples" value={String(rejected.length)} icon={XCircle} />
        <SummaryCard title="All Samples" value={String(samples.length)} icon={QrCode} />
      </div>

      <LabCard className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-md"
            placeholder="Search request no / sample no / patient / hospital no…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
          />
          <Button variant="outline" onClick={() => void load()}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </div>
      </LabCard>

      <LabCard>
        <Tabs value={tab} onValueChange={(v) => setTab(v as STab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="queue">Awaiting Collection ({queue.length})</TabsTrigger>
            <TabsTrigger value="collected">Collected ({collected.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                {error}
                <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
              </div>
            ) : tab === 'queue' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Specimens</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No paid requests awaiting sample collection.
                      </TableCell>
                    </TableRow>
                  ) : (
                    queue.map((r) => {
                      const specimens = [...new Set(r.items.map((i) => i.specimenType || 'Specimen'))];
                      return (
                        <TableRow key={r.labRequestId}>
                          <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{labPatientName(r.person)}</div>
                            <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {r.items.map((i) => i.testCode).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="text-xs">{specimens.join(', ')}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={labTone(r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky')}
                            >
                              {r.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={labTone('green')}>{r.paymentStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => setCollecting(r)}>
                              <QrCode className="h-3 w-3 mr-1" /> Collect
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample No</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Specimen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{tab === 'rejected' ? 'Reason' : 'Collected By'}</TableHead>
                    <TableHead>Date</TableHead>
                    {tab === 'collected' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tab === 'collected' ? collected : rejected).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No {tab} samples.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (tab === 'collected' ? collected : rejected).map((s) => (
                      <TableRow key={s.sampleId}>
                        <TableCell className="font-mono text-xs">{s.sampleNo}</TableCell>
                        <TableCell className="font-mono text-xs">{s.requestNo ?? '—'}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{s.personName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{s.hospitalNo ?? '—'}</div>
                        </TableCell>
                        <TableCell className="text-xs">{s.specimenType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(s.status === 'Collected' ? 'green' : 'rose')}>
                            {s.status}
                          </Badge>
                          {s.labStatus && (
                            <Badge variant="outline" className={`ml-1 ${labStatusTone(s.labStatus)}`}>
                              {labStatusLabel(s.labStatus)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {tab === 'rejected' ? (s.rejectReason ?? '—') : (s.collectedBy ?? '—')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.collectedAt
                            ? new Date(s.collectedAt).toLocaleString()
                            : s.createdAt
                              ? new Date(s.createdAt).toLocaleString()
                              : '—'}
                        </TableCell>
                        {tab === 'collected' && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRejecting(s);
                                setRejectReason('');
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </LabCard>

      {/* Collect confirm */}
      <AlertDialog open={!!collecting} onOpenChange={(o) => !o && !collectBusy && setCollecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Collect samples for {collecting?.requestNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {collecting && (
                <>
                  {labPatientName(collecting.person)} · one sample number will be generated per specimen type:{' '}
                  <strong>
                    {[...new Set(collecting.items.map((i) => i.specimenType || 'Specimen'))].join(', ')}
                  </strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={collectBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={collectBusy} onClick={(e) => { e.preventDefault(); void doCollect(); }}>
              {collectBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Collect & Log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && !rejectBusy && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject sample {rejecting?.sampleNo}</DialogTitle>
            <DialogDescription>
              The request returns to Awaiting Collection so a fresh specimen can be drawn. A reason is mandatory (audited).
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Rejection reason</Label>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Haemolysed sample / insufficient volume / mislabelled"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={rejectBusy}>Cancel</Button>
            <Button variant="destructive" onClick={() => void doReject()} disabled={rejectBusy}>
              {rejectBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Reject Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabSamplesPage;
