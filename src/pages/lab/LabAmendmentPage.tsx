import { useEffect, useState } from 'react';
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
  FileEdit, Loader2, RefreshCw, AlertTriangle, Search, History, CheckCircle2, ShieldAlert,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  isLaboratoryApiEnabled,
  listLabResults,
  listLabResultVersions,
  amendLabResult,
  type ApiLabResult,
  type ApiLabResultVersion,
  type ApiTemplateField,
  type ApiLabResultValues,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone } from './LabPageShell';
import { TemplateFieldInputs, ResultValuesView } from './LabResultFields';

export const LabAmendmentPage = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ApiLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amending, setAmending] = useState<ApiLabResult | null>(null);
  const [amendValues, setAmendValues] = useState<ApiLabResultValues>({});
  const [amendComment, setAmendComment] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendBusy, setAmendBusy] = useState(false);

  const [historyFor, setHistoryFor] = useState<ApiLabResult | null>(null);
  const [versions, setVersions] = useState<ApiLabResultVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
        status: 'Validated',
        q: q.trim() || undefined,
        limit: 100,
      });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load validated results');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const openAmend = (r: ApiLabResult) => {
    setAmending(r);
    setAmendValues({ ...(r.values as ApiLabResultValues) });
    setAmendComment(r.comment ?? '');
    setAmendReason('');
  };

  const openHistory = async (r: ApiLabResult) => {
    setHistoryFor(r);
    setHistoryLoading(true);
    try {
      setVersions(await listLabResultVersions(r.labResultId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load version history');
      setVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const doAmend = async () => {
    if (!amending) return;
    if (!amendReason.trim()) {
      toast.error('Amendment reason is required');
      return;
    }
    setAmendBusy(true);
    try {
      const updated = await amendLabResult(amending.labResultId, {
        values: amendValues,
        comment: amendComment.trim() || undefined,
        reason: amendReason.trim(),
      });
      toast.success(
        `Result amended (v${updated.version}): ${amending.testName}. It now needs revalidation.`,
      );
      setAmending(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not amend result');
    } finally {
      setAmendBusy(false);
    }
  };

  return (
    <LabShell title="Result Amendment">
      <LabSection
        icon={<FileEdit className="h-5 w-5" />}
        title="Result Amendment"
        desc="Amend validated results with a mandatory reason. Every version is snapshotted — nothing is ever overwritten. Amended results return to validation."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Validated Results" value={String(items.length)} icon={CheckCircle2} />
        <SummaryCard title="Amended (v>1)" value={String(items.filter((r) => r.version > 1).length)} icon={History} />
        <SummaryCard title="Audit Protected" value="100%" icon={ShieldAlert} />
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
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading validated results…
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
                <TableHead>Validated By</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No validated results yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
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
                      {r.validatedBy ?? '—'}
                      <div className="text-muted-foreground">
                        {r.validatedAt ? new Date(r.validatedAt).toLocaleString() : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={labTone(r.version > 1 ? 'amber' : 'green')}>
                        v{r.version}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => void openHistory(r)}>
                          <History className="h-3 w-3 mr-1" /> History
                        </Button>
                        <Button size="sm" onClick={() => openAmend(r)}>
                          <FileEdit className="h-3 w-3 mr-1" /> Amend
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </LabCard>

      {/* Amend dialog */}
      <Dialog open={!!amending} onOpenChange={(o) => !o && !amendBusy && setAmending(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {amending && (
            <>
              <DialogHeader>
                <DialogTitle>Amend — {amending.testName} ({amending.requestNo})</DialogTitle>
                <DialogDescription>
                  {amending.personName ?? '—'} · current version v{amending.version}. The previous values stay in the
                  version history; the amended result goes back through validation.
                </DialogDescription>
              </DialogHeader>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Current (validated) values</div>
                <ResultValuesView
                  fields={(amending.templateFields as ApiTemplateField[] | null) ?? null}
                  values={(amending.values as ApiLabResultValues) ?? {}}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">New values</div>
                {amending.templateFields?.length ? (
                  <TemplateFieldInputs
                    fields={amending.templateFields as ApiTemplateField[]}
                    values={amendValues}
                    onChange={(key, value) => setAmendValues((prev) => ({ ...prev, [key]: value }))}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This result has no template — edit is not available. Contact an administrator.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Comment</Label>
                <Textarea rows={2} value={amendComment} onChange={(e) => setAmendComment(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amendment reason (required, audited)</Label>
                <Textarea
                  rows={2}
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  placeholder="e.g. Transcription error — analyser read 11.2 not 12.1"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAmending(null)} disabled={amendBusy}>Cancel</Button>
                <Button onClick={() => void doAmend()} disabled={amendBusy || !amending.templateFields?.length}>
                  {amendBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Amend & Send to Revalidation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {historyFor && (
            <>
              <DialogHeader>
                <DialogTitle>Version History — {historyFor.testName} ({historyFor.requestNo})</DialogTitle>
                <DialogDescription>
                  Immutable snapshots of every draft, submission, validation, return and amendment.
                </DialogDescription>
              </DialogHeader>
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No versions recorded.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.versionId} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Badge variant="outline" className={labTone('blue')}>v{v.version}</Badge>
                        <Badge variant="outline" className={labTone(
                          v.action === 'validate' || v.action === 'revalidate' ? 'green'
                            : v.action === 'amend' ? 'amber'
                              : v.action === 'return' ? 'rose' : '',
                        )}>
                          {v.action}
                        </Badge>
                        <span className="text-muted-foreground">
                          {v.actedBy ?? '—'} · {new Date(v.actedAt).toLocaleString()}
                        </span>
                      </div>
                      {v.reason && (
                        <div className="text-xs"><span className="text-muted-foreground">Reason:</span> {v.reason}</div>
                      )}
                      <ResultValuesView
                        fields={(historyFor.templateFields as ApiTemplateField[] | null) ?? null}
                        values={(v.values as ApiLabResultValues) ?? {}}
                      />
                      {v.comment && (
                        <div className="text-xs"><span className="text-muted-foreground">Comment:</span> {v.comment}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setHistoryFor(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabAmendmentPage;
