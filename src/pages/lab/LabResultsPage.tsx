import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FilePlus, Loader2, RefreshCw, AlertTriangle, Search, Save, Send, ClipboardList, FileEdit,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  isLaboratoryApiEnabled,
  labPatientName,
  listLabRequests,
  getLabRequest,
  listLabResults,
  listLabTemplates,
  saveLabResults,
  type ApiLabRequest,
  type ApiLabResultValues,
  type ApiLabTemplate,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone, labStatusTone, labStatusLabel } from './LabPageShell';
import { TemplateFieldInputs } from './LabResultFields';

type ItemEntry = {
  requestItemId: number;
  testCode: string;
  testName: string;
  templateId: number | null;
  values: ApiLabResultValues;
  comment: string;
  existingStatus?: string;
};

function pickTemplate(templates: ApiLabTemplate[], testName: string, testCode: string): ApiLabTemplate | null {
  const name = testName.toLowerCase();
  const code = testCode.toLowerCase();
  return (
    templates.find((t) => t.name.toLowerCase() === name) ??
    templates.find((t) => t.code.toLowerCase() === `tpl-${code}`) ??
    templates.find((t) => t.name.toLowerCase().includes(name) || name.includes(t.name.toLowerCase())) ??
    null
  );
}

export const LabResultsPage = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ApiLabRequest[]>([]);
  const [templates, setTemplates] = useState<ApiLabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entry, setEntry] = useState<{ request: ApiLabRequest; items: ItemEntry[] } | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [reqRes, tplRes] = await Promise.all([
        listLabRequests({
          workQueue: true,
          labStatus: 'Collected,ResultDraft',
          q: q.trim() || undefined,
          limit: 100,
        }),
        listLabTemplates({ status: 'Active', limit: 200 }),
      ]);
      setItems(reqRes.items);
      setTemplates(tplRes.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load result worklist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const openEntry = async (requestOrId: ApiLabRequest | number) => {
    setEntryLoading(true);
    try {
      const request =
        typeof requestOrId === 'number' ? await getLabRequest(requestOrId) : requestOrId;
      const existing = await listLabResults({ requestId: request.labRequestId, limit: 100 });
      const byItem = new Map(existing.items.map((r) => [r.requestItemId, r]));
      const activeTemplates = templates.length
        ? templates
        : (await listLabTemplates({ status: 'Active', limit: 200 })).items;
      if (!templates.length) setTemplates(activeTemplates);
      const entries: ItemEntry[] = request.items.map((i) => {
        const prev = byItem.get(i.itemId);
        const tpl = prev?.templateId
          ? activeTemplates.find((t) => t.templateId === prev.templateId) ?? null
          : pickTemplate(activeTemplates, i.testName, i.testCode);
        return {
          requestItemId: i.itemId,
          testCode: i.testCode,
          testName: i.testName,
          templateId: prev?.templateId ?? tpl?.templateId ?? null,
          values: (prev?.values as ApiLabResultValues) ?? {},
          comment: prev?.comment ?? '',
          existingStatus: prev?.status,
        };
      });
      setEntry({ request, items: entries });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not open result entry');
    } finally {
      setEntryLoading(false);
    }
  };

  // Deep link: /dashboard/laboratory/results?requestId=123
  useEffect(() => {
    const rid = searchParams.get('requestId');
    if (rid && apiOn && !loading) {
      setSearchParams({}, { replace: true });
      void openEntry(Number(rid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn, loading]);

  const counts = useMemo(
    () => ({
      total: items.length,
      collected: items.filter((r) => r.labStatus === 'Collected').length,
      draft: items.filter((r) => r.labStatus === 'ResultDraft').length,
    }),
    [items],
  );

  const templateFor = (id: number | null) =>
    id != null ? templates.find((t) => t.templateId === id) ?? null : null;

  const updateEntryItem = (idx: number, patch: Partial<ItemEntry>) => {
    if (!entry) return;
    setEntry({
      ...entry,
      items: entry.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    });
  };

  const validateRequired = (): string | null => {
    if (!entry) return 'Nothing to save';
    for (const it of entry.items) {
      const tpl = templateFor(it.templateId);
      if (!tpl) continue;
      for (const f of tpl.fields) {
        if (!f.required) continue;
        const v = it.values[f.key];
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
          return `${it.testName}: "${f.label}" is required`;
        }
      }
    }
    return null;
  };

  const save = async (action: 'draft' | 'submit') => {
    if (!entry) return;
    if (action === 'submit') {
      const problem = validateRequired();
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setSaving(action);
    try {
      await saveLabResults(entry.request.labRequestId, {
        action,
        items: entry.items.map((it) => ({
          requestItemId: it.requestItemId,
          templateId: it.templateId ?? undefined,
          values: it.values,
          comment: it.comment.trim() || undefined,
        })),
      });
      toast.success(
        action === 'submit'
          ? `Results for ${entry.request.requestNo} submitted for validation`
          : `Draft saved for ${entry.request.requestNo}`,
      );
      setEntry(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save results');
    } finally {
      setSaving(null);
    }
  };

  return (
    <LabShell title="Result Entry">
      <LabSection
        icon={<FilePlus className="h-5 w-5" />}
        title="Result Entry"
        desc="Collected requests ready for results. Fields come from the DB result templates. Save Draft keeps editing open; Submit sends to validation."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Worklist" value={String(counts.total)} icon={ClipboardList} />
        <SummaryCard title="Awaiting Entry" value={String(counts.collected)} icon={FilePlus} />
        <SummaryCard title="Drafts" value={String(counts.draft)} icon={FileEdit} />
      </div>

      <LabCard className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-md"
            placeholder="Search request no / patient / hospital no…"
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
            <Loader2 className="h-4 w-4 animate-spin" /> Loading worklist…
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
                <TableHead>Request</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Lab Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No collected requests waiting for results. Collect samples first.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow key={r.labRequestId}>
                    <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{labPatientName(r.person)}</div>
                      <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[220px] truncate">
                      {r.items.map((i) => i.testCode).join(', ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={labTone(r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky')}
                      >
                        {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={labStatusTone(r.labStatus)}>
                        {labStatusLabel(r.labStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => void openEntry(r)} disabled={entryLoading}>
                        {entryLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FilePlus className="h-3 w-3 mr-1" />}
                        {r.labStatus === 'ResultDraft' ? 'Continue Draft' : 'Enter Results'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </LabCard>

      {/* Entry dialog */}
      <Dialog open={!!entry} onOpenChange={(o) => !o && !saving && setEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {entry && (
            <>
              <DialogHeader>
                <DialogTitle>Results — {entry.request.requestNo}</DialogTitle>
                <DialogDescription>
                  {labPatientName(entry.request.person)} · {entry.request.person?.hospitalNo ?? '—'} ·{' '}
                  {entry.request.priority}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {entry.items.map((it, idx) => {
                  const tpl = templateFor(it.templateId);
                  return (
                    <div key={it.requestItemId} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className="font-semibold text-sm">{it.testName}</span>{' '}
                          <span className="font-mono text-xs text-muted-foreground">({it.testCode})</span>
                          {it.existingStatus && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {it.existingStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="w-[240px]">
                          <Select
                            value={it.templateId != null ? String(it.templateId) : undefined}
                            onValueChange={(v) => updateEntryItem(idx, { templateId: Number(v), values: {} })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Choose result template…" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.templateId} value={String(t.templateId)}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {tpl ? (
                        <TemplateFieldInputs
                          fields={tpl.fields}
                          values={it.values}
                          onChange={(key, value) =>
                            updateEntryItem(idx, { values: { ...it.values, [key]: value } })
                          }
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No template selected — pick a result template above, or manage templates under Result Templates.
                        </p>
                      )}
                      <div>
                        <Label className="text-xs">Comment (optional)</Label>
                        <Textarea
                          rows={2}
                          value={it.comment}
                          onChange={(e) => updateEntryItem(idx, { comment: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEntry(null)} disabled={!!saving}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={() => void save('draft')} disabled={!!saving}>
                  {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Draft
                </Button>
                <Button onClick={() => void save('submit')} disabled={!!saving}>
                  {saving === 'submit' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Submit for Validation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabResultsPage;
