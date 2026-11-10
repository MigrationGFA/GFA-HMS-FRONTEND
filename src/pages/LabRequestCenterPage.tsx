import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, ClipboardList, FlaskConical, AlertTriangle, Printer, Eye,
  Loader2, RefreshCw, CreditCard, UserPlus, QrCode, FilePlus, TestTubes,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';
import { ApiError } from '@/lib/api/client';
import {
  collectLabRequestSamples,
  isLaboratoryApiEnabled,
  isLabPaymentCleared,
  isLabProcessingLocked,
  labPatientName,
  listLabRequestCenter,
  listLabSamples,
  saveLabResults,
  type ApiLabRequest,
  type ApiLabSample,
} from '@/lib/api/laboratory';
import {
  LabShell as Shell,
  LabCard as Card,
  LabSection as Section,
  labBase as base,
  labStatusTone,
  labStatusLabel,
} from './lab/LabPageShell';

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

function paymentBadge(r: ApiLabRequest) {
  if (isLabPaymentCleared(r)) {
    return (
      <Badge variant="outline" className={tone('green')}>
        {r.paymentStatus}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={tone('amber')}>
      {r.paymentStatus === 'Unpaid' ? 'Pending Payment' : r.paymentStatus}
    </Badge>
  );
}

function printDoc(label: string) {
  window.print();
  void label;
}

function specimenTypesFor(r: ApiLabRequest): string[] {
  return [...new Set(r.items.map((i) => i.specimenType?.trim() || 'Specimen'))];
}

type RCTab = 'all' | 'unpaid' | 'ready' | 'doctor' | 'walkin' | 'urgent';

export const LabRequestCenter = () => {
  const navigate = useNavigate();
  const apiOn = isLaboratoryApiEnabled();
  const [tab, setTab] = useState<RCTab>('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ApiLabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ApiLabRequest | null>(null);

  const load = async (query?: string) => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabRequestCenter({
        q: query?.trim() || undefined,
        limit: 100,
      });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load lab requests');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (tab === 'unpaid') return !isLabPaymentCleared(r);
      if (tab === 'ready') return isLabPaymentCleared(r);
      if (tab === 'doctor') return r.source !== 'WalkIn';
      if (tab === 'walkin') return r.source === 'WalkIn';
      if (tab === 'urgent') return r.priority === 'Urgent' || r.priority === 'Stat';
      return true;
    });
  }, [items, tab]);

  const counts = useMemo(
    () => ({
      all: items.length,
      unpaid: items.filter((r) => !isLabPaymentCleared(r)).length,
      ready: items.filter((r) => isLabPaymentCleared(r)).length,
      doctor: items.filter((r) => r.source !== 'WalkIn').length,
      walkin: items.filter((r) => r.source === 'WalkIn').length,
      urgent: items.filter((r) => r.priority === 'Urgent' || r.priority === 'Stat').length,
    }),
    [items],
  );

  const openView = (r: ApiLabRequest) => {
    if (isLabProcessingLocked(r)) {
      toast.message('Awaiting payment', {
        description: 'Full clinical details unlock after Cashier confirms payment. Sample collection and result entry stay locked.',
      });
    }
    setViewing(r);
  };

  const [collecting, setCollecting] = useState<ApiLabRequest | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);
  const [collectSuccess, setCollectSuccess] = useState<{ request: ApiLabRequest; samples: ApiLabSample[] } | null>(null);
  const [existingSamples, setExistingSamples] = useState<{ request: ApiLabRequest; samples: ApiLabSample[] } | null>(null);
  const [loadingSampleRequestId, setLoadingSampleRequestId] = useState<number | null>(null);

  const openCollect = async (r: ApiLabRequest) => {
    if (isLabProcessingLocked(r)) {
      toast.error('Pending payment — cannot collect sample until Cashier marks Paid/Waived');
      return;
    }
    const status = r.labStatus ?? 'AwaitingCollection';
    if (status !== 'AwaitingCollection') {
      setLoadingSampleRequestId(r.labRequestId);
      try {
        const { items: samples } = await listLabSamples({ requestId: r.labRequestId, limit: 20 });
        setExistingSamples({ request: r, samples });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not load collected samples');
      } finally {
        setLoadingSampleRequestId(null);
      }
      return;
    }
    setCollecting(r);
  };

  const doCollect = async () => {
    if (!collecting) return;
    setCollectBusy(true);
    try {
      const result = await collectLabRequestSamples(collecting.labRequestId);
      setCollecting(null);
      setCollectSuccess(result);
      void load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not collect samples');
    } finally {
      setCollectBusy(false);
    }
  };

  const goResults = (r: ApiLabRequest) => {
    if (isLabProcessingLocked(r)) {
      toast.error('Pending payment — cannot record results until Cashier marks Paid/Waived');
      return;
    }
    navigate(`${base}/results?requestId=${r.labRequestId}`);
  };

  return (
    <Shell title="Unified Laboratory Request Center">
      <Section
        icon={<Search className="h-5 w-5" />}
        title="Laboratory Requests"
        desc="Unpaid requests are visible as Pending Payment with limited detail. Collect samples and record results only after Cashier confirms payment."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load(q)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`${base}/walk-in`)}>
              <UserPlus className="h-4 w-4 mr-1" /> New Walk-In
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="All Requests" value={String(counts.all)} icon={ClipboardList} />
        <SummaryCard title="Pending Payment" value={String(counts.unpaid)} icon={CreditCard} />
        <SummaryCard title="Ready (Paid)" value={String(counts.ready)} icon={FlaskConical} />
        <SummaryCard title="Urgent / Stat" value={String(counts.urgent)} icon={AlertTriangle} />
      </div>

      <Card className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-md"
            placeholder="Search request no / patient / hospital no…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(q);
            }}
          />
          <Button variant="outline" onClick={() => void load(q)}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          <strong>Pending Payment</strong> rows show limited info. Full clinical detail, sample collection, and result entry unlock after payment.
        </p>
      </Card>

      <Card>
        <Tabs value={tab} onValueChange={(v) => setTab(v as RCTab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="unpaid">Pending Payment ({counts.unpaid})</TabsTrigger>
            <TabsTrigger value="ready">Ready ({counts.ready})</TabsTrigger>
            <TabsTrigger value="doctor">Doctor ({counts.doctor})</TabsTrigger>
            <TabsTrigger value="walkin">Walk-In ({counts.walkin})</TabsTrigger>
            <TabsTrigger value="urgent">Urgent / Stat ({counts.urgent})</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading lab requests…
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                {error}
                <Button size="sm" variant="outline" onClick={() => void load(q)}>
                  Retry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Ordered By</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Specimens</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Lab Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                        No lab requests in this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const locked = isLabProcessingLocked(r);
                      return (
                        <TableRow key={r.labRequestId} className={locked ? 'opacity-90' : undefined}>
                          <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{labPatientName(r.person)}</div>
                            <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={tone(r.source === 'WalkIn' ? 'purple' : 'blue')}>
                              {r.source || 'Doctor'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.doctorName ?? '—'}</TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate">
                            {r.items.map((i) => i.testCode).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {locked ? '—' : specimenTypesFor(r).join(', ')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={tone(
                                r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky',
                              )}
                            >
                              {r.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{paymentBadge(r)}</TableCell>
                          <TableCell>
                            {locked ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Badge variant="outline" className={labStatusTone(r.labStatus)}>
                                {labStatusLabel(r.labStatus)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {locked ? '—' : formatCurrency(r.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title={locked ? 'Summary (payment pending)' : 'View'}
                                onClick={() => openView(r)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={locked || loadingSampleRequestId === r.labRequestId || (collectBusy && collecting?.labRequestId === r.labRequestId)}
                                title={
                                  locked
                                    ? 'Awaiting payment'
                                    : r.labStatus && r.labStatus !== 'AwaitingCollection'
                                      ? 'View collected samples'
                                      : 'Collect sample'
                                }
                                onClick={() => void openCollect(r)}
                              >
                                {(collectBusy && collecting?.labRequestId === r.labRequestId) || loadingSampleRequestId === r.labRequestId
                                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  : <QrCode className="h-3 w-3 mr-1" />}
                                {r.labStatus && r.labStatus !== 'AwaitingCollection' ? 'Samples' : 'Collect'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={locked}
                                title={locked ? 'Awaiting payment' : 'Record results'}
                                onClick={() => goResults(r)}
                              >
                                <FilePlus className="h-3 w-3 mr-1" /> Results
                              </Button>
                              {r.clinicalNotes?.includes('inpatient-demo') && r.status !== 'Validated' && (
                                <Button
                                  size="sm"
                                  disabled={locked}
                                  onClick={() => {
                                    void saveLabResults(r.labRequestId, {
                                      action: 'submit',
                                      items: [{ requestItemId: 1, values: { result: 'normal' }, comment: 'FBC within normal limits' }],
                                    }).then(() => {
                                      toast.success('Result stored for the doctor');
                                      void load(q);
                                    }).catch(() => toast.error('Could not store the result'));
                                  }}
                                >
                                  Mark resulted
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Print"
                                disabled={locked}
                                onClick={() => {
                                  if (locked) {
                                    toast.error('Print unlocks after payment');
                                    return;
                                  }
                                  printDoc(`Requisition ${r.requestNo}`);
                                }}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Requisition {viewing.requestNo}</DialogTitle>
                <DialogDescription>
                  {labPatientName(viewing.person)} · {viewing.person?.hospitalNo ?? '—'} ·{' '}
                  {viewing.doctorName ?? '—'} · {viewing.source}
                </DialogDescription>
              </DialogHeader>
              {isLabProcessingLocked(viewing) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Pending payment — clinical indication, notes, and prices are hidden. Send the patient to Cashier.
                  Sample collection and result entry stay locked until Paid/Waived.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <Badge variant="outline">{viewing.priority}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payment</div>
                  {paymentBadge(viewing)}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bill type</div>
                  <div>{viewing.billType || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Patient context</div>
                  <div>{viewing.patientContext || '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Clinical indication</div>
                  <div>
                    {isLabProcessingLocked(viewing)
                      ? 'Hidden until payment'
                      : viewing.clinicalIndication || viewing.requestReason || '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Notes for lab</div>
                  <div>
                    {isLabProcessingLocked(viewing)
                      ? 'Hidden until payment'
                      : viewing.clinicalNotes || '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Doctor comment</div>
                  <div>
                    {isLabProcessingLocked(viewing)
                      ? 'Hidden until payment'
                      : viewing.doctorComment || '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Lab comment</div>
                  <div>
                    {isLabProcessingLocked(viewing)
                      ? 'Hidden until payment'
                      : viewing.labComment || '—'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mt-2 mb-1">Requested tests</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Observation</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewing.items.map((t) => (
                      <TableRow key={t.itemId}>
                        <TableCell className="font-mono text-xs">{t.testCode}</TableCell>
                        <TableCell>
                          <div>{t.testName}</div>
                          {(t.conclusion || t.remark) && !isLabProcessingLocked(viewing) && (
                            <div className="text-[11px] text-muted-foreground">
                              {[t.conclusion, t.remark].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[12rem] truncate">
                          {isLabProcessingLocked(viewing) ? '—' : t.observation || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLabProcessingLocked(viewing) ? '—' : formatCurrency(t.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLabProcessingLocked(viewing) && (
                      <TableRow>
                        <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(viewing.totalAmount)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={isLabProcessingLocked(viewing)}
                  onClick={() => printDoc(`Requisition ${viewing.requestNo}`)}
                >
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                <Button
                  disabled={isLabProcessingLocked(viewing)}
                  onClick={() => {
                    const req = viewing;
                    setViewing(null);
                    void openCollect(req);
                  }}
                >
                  {viewing.labStatus && viewing.labStatus !== 'AwaitingCollection' ? 'View Samples' : 'Collect Sample'}
                </Button>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Collect confirmation — specimen types + tests to draw */}
      <AlertDialog open={!!collecting} onOpenChange={(o) => !o && !collectBusy && setCollecting(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Collect samples for {collecting?.requestNo}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {collecting && (
                <div className="space-y-3 text-sm text-foreground">
                  <p>
                    <strong>{labPatientName(collecting.person)}</strong>
                    {' · '}{collecting.person?.hospitalNo ?? '—'}
                    {' · '}{collecting.priority} priority
                  </p>
                  <p>
                    One sample label will be generated per specimen type:{' '}
                    <strong>{specimenTypesFor(collecting).join(', ')}</strong>
                  </p>
                  <div>
                    <p className="font-medium mb-1">Tests on this requisition</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {collecting.items.map((t) => (
                        <li key={t.itemId}>
                          <span className="font-mono text-xs">{t.testCode}</span> — {t.testName}
                          {t.specimenType ? ` (${t.specimenType})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {collecting.clinicalNotes && (
                    <p className="text-xs text-muted-foreground">
                      Lab notes: {collecting.clinicalNotes}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={collectBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={collectBusy}
              onClick={(e) => {
                e.preventDefault();
                void doCollect();
              }}
            >
              {collectBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Collect &amp; Log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success — show generated sample numbers */}
      <Dialog open={!!collectSuccess} onOpenChange={(o) => !o && setCollectSuccess(null)}>
        <DialogContent className="max-w-md">
          {collectSuccess && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TestTubes className="h-5 w-5 text-emerald-600" />
                  Samples collected
                </DialogTitle>
                <DialogDescription>
                  {collectSuccess.request.requestNo} · {labPatientName(collectSuccess.request.person)}
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample No</TableHead>
                    <TableHead>Specimen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectSuccess.samples.map((s) => (
                    <TableRow key={s.sampleId}>
                      <TableCell className="font-mono text-xs font-semibold">{s.sampleNo}</TableCell>
                      <TableCell>{s.specimenType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Label each tube with the sample number above. Request status is now Collected — proceed to result entry when ready.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCollectSuccess(null)}>Close</Button>
                <Button onClick={() => {
                  const id = collectSuccess.request.labRequestId;
                  setCollectSuccess(null);
                  navigate(`${base}/results?requestId=${id}`);
                }}>
                  Record Results
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Already collected — show existing sample numbers */}
      <Dialog open={!!existingSamples} onOpenChange={(o) => !o && setExistingSamples(null)}>
        <DialogContent className="max-w-md">
          {existingSamples && (
            <>
              <DialogHeader>
                <DialogTitle>Samples for {existingSamples.request.requestNo}</DialogTitle>
                <DialogDescription>
                  {labPatientName(existingSamples.request.person)} · Status: {labStatusLabel(existingSamples.request.labStatus)}
                </DialogDescription>
              </DialogHeader>
              {existingSamples.samples.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No sample records found for this request.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sample No</TableHead>
                      <TableHead>Specimen</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingSamples.samples.map((s) => (
                      <TableRow key={s.sampleId}>
                        <TableCell className="font-mono text-xs font-semibold">{s.sampleNo}</TableCell>
                        <TableCell>{s.specimenType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tone(s.status === 'Collected' ? 'green' : 'rose')}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setExistingSamples(null)}>Close</Button>
                <Button variant="outline" onClick={() => {
                  const id = existingSamples.request.labRequestId;
                  setExistingSamples(null);
                  navigate(`${base}/samples`);
                }}>
                  Open Sample Collection
                </Button>
                <Button onClick={() => {
                  const id = existingSamples.request.labRequestId;
                  setExistingSamples(null);
                  navigate(`${base}/results?requestId=${id}`);
                }}>
                  Record Results
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

export default LabRequestCenter;
