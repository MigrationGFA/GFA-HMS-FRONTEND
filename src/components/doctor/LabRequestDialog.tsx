import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import {
  createLabRequest,
  isLaboratoryApiEnabled,
  listLabRequests,
  listLabTests,
  type ApiLabRequest,
  type ApiLabTest,
} from '@/lib/api/laboratory';

type Priority = 'Routine' | 'Urgent' | 'Stat';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: number;
  encounterId?: number;
  patientName: string;
  hospitalNo?: string;
};

function formatNgn(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

export function LabRequestDialog({
  open,
  onOpenChange,
  personId,
  encounterId,
  patientName,
  hospitalNo,
}: Props) {
  const apiOn = isLaboratoryApiEnabled();
  const [tests, setTests] = useState<ApiLabTest[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Map<number, ApiLabTest>>(new Map());
  const [priority, setPriority] = useState<Priority>('Routine');
  const [indication, setIndication] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [todayRequests, setTodayRequests] = useState<ApiLabRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(tests.map((t) => t.category));
    return ['All', ...Array.from(set).sort()];
  }, [tests]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tests.filter((t) => {
      const matchQ =
        !s ||
        `${t.name} ${t.testCode} ${t.category}`.toLowerCase().includes(s);
      const matchCat = category === 'All' || t.category === category;
      return matchQ && matchCat;
    });
  }, [tests, q, category]);

  const total = useMemo(
    () => Array.from(selected.values()).reduce((sum, t) => sum + t.unitPrice, 0),
    [selected],
  );

  const loadCatalog = async () => {
    if (!apiOn) return;
    setCatalogLoading(true);
    try {
      const data = await listLabTests({ status: 'Active', limit: 200 });
      setTests(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load lab catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadToday = async () => {
    if (!apiOn || !personId) return;
    setRequestsLoading(true);
    try {
      const data = await listLabRequests({
        personId,
        encounterId,
        status: 'Sent',
        limit: 20,
      });
      setTodayRequests(data.items);
    } catch {
      /* non-blocking */
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelected(new Map());
    setQ('');
    setCategory('All');
    setPriority('Routine');
    setIndication('');
    setNotes('');
    void loadCatalog();
    void loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, personId, encounterId]);

  const toggle = (t: ApiLabTest) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(t.labTestId)) next.delete(t.labTestId);
      else next.set(t.labTestId, t);
      return next;
    });
  };

  const submit = async () => {
    if (!apiOn) {
      toast.error('Laboratory API is not configured');
      return;
    }
    if (selected.size === 0) {
      toast.error('Select at least one test');
      return;
    }
    if (!indication.trim()) {
      toast.error('Clinical indication is required');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createLabRequest({
        personId,
        encounterId,
        priority,
        clinicalIndication: indication.trim(),
        clinicalNotes: notes.trim() || undefined,
        items: Array.from(selected.keys()).map((testId) => ({ testId })),
      });
      toast.success(
        `${created.requestNo} sent · ${formatNgn(created.totalAmount)} · Unpaid (cashier)`,
      );
      setSelected(new Map());
      setIndication('');
      setNotes('');
      await loadToday();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send lab request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Lab Request
          </DialogTitle>
          <DialogDescription>
            {patientName}
            {hospitalNo ? ` · ${hospitalNo}` : ''} — prices shown for awareness only.
            Payment is collected at Cashier (always Unpaid until confirmed).
          </DialogDescription>
        </DialogHeader>

        {!apiOn ? (
          <p className="text-sm text-rose-600 py-6 text-center">
            Laboratory API is not enabled. Set VITE_USE_API and VITE_API_BASE_URL.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search tests…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {catalogLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
              </div>
            ) : (
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No tests match.</p>
                ) : (
                  filtered.map((t) => {
                    const on = selected.has(t.labTestId);
                    return (
                      <button
                        key={t.labTestId}
                        type="button"
                        onClick={() => toggle(t)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-start gap-3 hover:bg-muted/40 ${
                          on ? 'bg-sky-50' : ''
                        }`}
                      >
                        <input type="checkbox" readOnly checked={on} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {t.name}{' '}
                            <span className="font-mono text-xs text-muted-foreground">
                              ({t.testCode})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.category} · {t.specimenType} · TAT {t.turnaround}
                          </div>
                        </div>
                        <div className="text-sm font-semibold shrink-0">{formatNgn(t.unitPrice)}</div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {selected.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selected.values()).map((t) => (
                  <span
                    key={t.labTestId}
                    className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 bg-muted/40"
                  >
                    {t.testCode}
                    <button type="button" onClick={() => toggle(t)} aria-label={`Remove ${t.testCode}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="text-xs font-semibold self-center ml-auto">
                  Est. total {formatNgn(total)}
                </span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Routine', 'Urgent', 'Stat'] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Clinical indication *</Label>
                <Textarea
                  rows={2}
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="Why are these tests ordered?"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Notes for lab</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional instructions for the laboratory…"
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Recent requests (this encounter)
              </h4>
              {requestsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : todayRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No requests yet for this visit.</p>
              ) : (
                <ul className="text-xs space-y-1">
                  {todayRequests.slice(0, 5).map((r) => (
                    <li key={r.labRequestId} className="flex justify-between gap-2 border-b py-1">
                      <span>
                        <span className="font-mono">{r.requestNo}</span> ·{' '}
                        {r.items.map((i) => i.testCode).join(', ')}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {r.paymentStatus} · {formatNgn(r.totalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!apiOn || submitting || selected.size === 0}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending…
              </>
            ) : (
              'Send Lab Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
