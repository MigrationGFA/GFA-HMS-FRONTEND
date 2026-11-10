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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileSignature, Loader2, RefreshCw, AlertTriangle, Search, CheckCircle2, Undo2, History,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  isLaboratoryApiEnabled,
  listLabResults,
  validateLabResult,
  returnLabResult,
  type ApiLabResult,
  type ApiTemplateField,
  type ApiLabResultValues,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone } from './LabPageShell';
import { ResultValuesView } from './LabResultFields';

type VTab = 'submitted' | 'revalidation';

export const LabValidationPage = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [tab, setTab] = useState<VTab>('submitted');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ApiLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState<ApiLabResult | null>(null);
  const [busy, setBusy] = useState<'validate' | 'return' | null>(null);
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabResults({
        status: 'Submitted,PendingRevalidation',
        q: q.trim() || undefined,
        limit: 100,
      });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load validation worklist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const submitted = useMemo(() => items.filter((r) => r.status === 'Submitted'), [items]);
  const revalidation = useMemo(() => items.filter((r) => r.status === 'PendingRevalidation'), [items]);
  const rows = tab === 'submitted' ? submitted : revalidation;

  const doValidate = async (r: ApiLabResult) => {
    setBusy('validate');
    try {
      await validateLabResult(r.labResultId);
      toast.success(`Result validated: ${r.testName} (${r.requestNo})`);
      setReviewing(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not validate result');
    } finally {
      setBusy(null);
    }
  };

  const doReturn = async (r: ApiLabResult) => {
    if (!returnReason.trim()) {
      toast.error('Return reason is required');
      return;
    }
    setBusy('return');
    try {
      await returnLabResult(r.labResultId, returnReason.trim());
      toast.success(`Result returned to bench: ${r.testName} (${r.requestNo})`);
      setReviewing(null);
      setReturning(false);
      setReturnReason('');
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not return result');
    } finally {
      setBusy(null);
    }
  };

  return (
    <LabShell title="Result Validation">
      <LabSection
        icon={<FileSignature className="h-5 w-5" />}
        title="Result Validation"
        desc="Review submitted results against reference ranges. Validate to release, or return to the bench with a reason (audited)."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Awaiting Validation" value={String(submitted.length)} icon={FileSignature} />
        <SummaryCard title="Pending Revalidation" value={String(revalidation.length)} icon={History} />
        <SummaryCard title="Total in Queue" value={String(items.length)} icon={CheckCircle2} />
      </div>

      <LabCard className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-md"
            placeholder="Search test / request no / patient…"
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as VTab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="submitted">Awaiting Validation ({submitted.length})</TabsTrigger>
            <TabsTrigger value="revalidation">Pending Revalidation ({revalidation.length})</TabsTrigger>
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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Entered By</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Nothing waiting in this queue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.labResultId}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.testName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.testCode ?? ''}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.requestNo ?? '—'}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{r.personName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.hospitalNo ?? '—'}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.enteredBy ?? '—'}
                          <div className="text-muted-foreground">
                            {r.enteredAt ? new Date(r.enteredAt).toLocaleString() : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">v{r.version}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(r.status === 'Submitted' ? 'purple' : 'rose')}>
                            {r.status === 'PendingRevalidation' ? 'Pending Revalidation' : r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => { setReviewing(r); setReturning(false); setReturnReason(''); }}>
                            <FileSignature className="h-3 w-3 mr-1" /> Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </LabCard>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && !busy && setReviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {reviewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewing.testName} — {reviewing.requestNo}
                </DialogTitle>
                <DialogDescription>
                  {reviewing.personName ?? '—'} · {reviewing.hospitalNo ?? '—'} · entered by{' '}
                  {reviewing.enteredBy ?? '—'} · v{reviewing.version}
                  {reviewing.status === 'PendingRevalidation' && ' · amended, needs revalidation'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Lab no: <span className="text-foreground">{reviewing.labNo || '—'}</span></div>
                <div>Flag: <span className="text-foreground">{reviewing.flag || '—'}</span></div>
                <div>Ref: <span className="text-foreground">{[reviewing.lBand, reviewing.hBand].filter(Boolean).join(' – ') || '—'}</span></div>
                <div>UOM: <span className="text-foreground">{reviewing.uom || '—'}</span></div>
                <div className="col-span-2">Instrument: <span className="text-foreground">{reviewing.machineName || reviewing.machineCode || '—'}</span></div>
              </div>
              <ResultValuesView
                fields={(reviewing.templateFields as ApiTemplateField[] | null) ?? null}
                values={(reviewing.values as ApiLabResultValues) ?? {}}
              />
              {reviewing.comment && (
                <div className="rounded-md border p-2 text-sm">
                  <div className="text-[11px] text-muted-foreground">Bench comment</div>
                  {reviewing.comment}
                </div>
              )}
              {returning && (
                <div>
                  <Label>Return reason (required)</Label>
                  <Textarea
                    rows={3}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Recheck platelets — value inconsistent with film"
                  />
                </div>
              )}
              <DialogFooter>
                {!returning ? (
                  <>
                    <Button variant="outline" onClick={() => setReturning(true)} disabled={!!busy}>
                      <Undo2 className="h-4 w-4 mr-1" /> Return to Bench
                    </Button>
                    <Button onClick={() => void doValidate(reviewing)} disabled={!!busy}>
                      {busy === 'validate' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Validate
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setReturning(false)} disabled={!!busy}>
                      Back
                    </Button>
                    <Button variant="destructive" onClick={() => void doReturn(reviewing)} disabled={!!busy}>
                      {busy === 'return' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
                      Confirm Return
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabValidationPage;
