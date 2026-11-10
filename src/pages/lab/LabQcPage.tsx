import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, Plus, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  createQcRun,
  isLaboratoryApiEnabled,
  listLabMachines,
  listQc,
  upsertQcCapa,
  type ApiLabMachine,
  type ApiQcRun,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

const FREQS = ['Daily', 'Weekly', 'Monthly', 'Calibration'] as const;

type NewForm = {
  analyte: string;
  instrument: string;
  level: string;
  expected: string;
  observed: string;
  result: string;
  freq: string;
  runDate: string;
};

const emptyNew = (): NewForm => ({
  analyte: '',
  instrument: '',
  level: 'L1',
  expected: '',
  observed: '',
  result: 'Passed',
  freq: 'Daily',
  runDate: new Date().toISOString().slice(0, 10),
});

export const QualityControlCenter = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [items, setItems] = useState<ApiQcRun[]>([]);
  const [machines, setMachines] = useState<ApiLabMachine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [kpis, setKpis] = useState({ passed: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freqTab, setFreqTab] = useState<string>('Daily');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewForm>(emptyNew());
  const [capa, setCapa] = useState<ApiQcRun | null>(null);
  const [cForm, setCForm] = useState({
    corrective: '', preventive: '', assignedTo: '', targetDate: '',
  });

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listQc({ limit: 100 });
      setItems(data.items);
      setKpis(data.kpis);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load QC';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!createOpen || !apiOn) return;
    let cancelled = false;
    setMachinesLoading(true);
    listLabMachines({ limit: 100 })
      .then((data) => {
        if (!cancelled) setMachines(data.items);
      })
      .catch(() => {
        if (!cancelled) setMachines([]);
      })
      .finally(() => {
        if (!cancelled) setMachinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen, apiOn]);

  const filtered = items.filter((r) => r.freq === freqTab);

  const onCreate = async () => {
    if (!form.analyte.trim() || !form.instrument.trim()) {
      toast.error('Analyte and instrument are required');
      return;
    }
    setBusy(true);
    try {
      const run = await createQcRun(form);
      toast.success(`Created ${run.runNo}`);
      setCreateOpen(false);
      setForm(emptyNew());
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const onCapa = async () => {
    if (!capa || !cForm.corrective.trim() || !cForm.assignedTo.trim()) {
      toast.error('Corrective action and assignee required');
      return;
    }
    setBusy(true);
    try {
      await upsertQcCapa(capa.qcRunId, {
        corrective: cForm.corrective,
        preventive: cForm.preventive || '—',
        assignedTo: cForm.assignedTo,
        targetDate: cForm.targetDate || undefined,
        capaStatus: 'Open',
      });
      toast.success(`CAPA saved for ${capa.runNo}`);
      setCapa(null);
      setCForm({ corrective: '', preventive: '', assignedTo: '', targetDate: '' });
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'CAPA failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LabShell title="Laboratory · Quality Control">
      <LabSection
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Quality Control"
        desc="Track QC runs, calibrations, and CAPA actions across analytical platforms."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!apiOn}>
              <Plus className="h-3 w-3 mr-1" />New QC Entry
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <SummaryCard title="Passed" value={String(kpis.passed)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Failed" value={String(kpis.failed)} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Total runs" value={String(kpis.total)} icon={ClipboardCheck} tone="blue" />
      </div>

      <Tabs value={freqTab} onValueChange={setFreqTab}>
        <TabsList>
          {FREQS.map((f) => <TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}
        </TabsList>
        {FREQS.map((f) => (
          <TabsContent key={f} value={f} className="mt-3">
            <LabCard>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No {f.toLowerCase()} QC runs.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Analyte</TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Observed</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.qcRunId}>
                        <TableCell className="font-medium">{r.runNo}</TableCell>
                        <TableCell>{r.analyte}</TableCell>
                        <TableCell>{r.instrument}</TableCell>
                        <TableCell>{r.level}</TableCell>
                        <TableCell>{r.expected}</TableCell>
                        <TableCell>{r.observed}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={r.result === 'Passed' ? labTone('green') : labTone('rose')}
                          >
                            {r.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.runDate}</TableCell>
                        <TableCell className="text-right">
                          {(r.result === 'Failed' || r.capaStatus === 'Open') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCapa(r);
                                setCForm({
                                  corrective: r.corrective || '',
                                  preventive: r.preventive || '',
                                  assignedTo: r.assignedTo || '',
                                  targetDate: r.targetDate || '',
                                });
                              }}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />CAPA
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log QC run</DialogTitle>
            <DialogDescription>Record a new quality-control measurement.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label>Analyte</Label>
              <Input value={form.analyte} onChange={(e) => setForm((f) => ({ ...f, analyte: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2"><Label>Instrument</Label>
              {machinesLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading instruments…
                </div>
              ) : machines.length > 0 ? (
                <Select
                  value={form.instrument || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, instrument: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select instrument" /></SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m.machineId} value={m.name || m.code || String(m.machineId)}>
                        {m.name || m.code || `Machine ${m.machineId}`}
                        {m.code ? ` (${m.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="Instrument name" />
              )}
            </div>
            <div className="space-y-1.5"><Label>Level</Label>
              <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['L1', 'L2', 'L3'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Frequency</Label>
              <Select value={form.freq} onValueChange={(v) => setForm((f) => ({ ...f, freq: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQS.map((fq) => <SelectItem key={fq} value={fq}>{fq}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Expected</Label>
              <Input value={form.expected} onChange={(e) => setForm((f) => ({ ...f, expected: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Observed</Label>
              <Input value={form.observed} onChange={(e) => setForm((f) => ({ ...f, observed: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Result</Label>
              <Select value={form.result} onValueChange={(v) => setForm((f) => ({ ...f, result: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Date</Label>
              <Input type="date" value={form.runDate} onChange={(e) => setForm((f) => ({ ...f, runDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onCreate()}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!capa} onOpenChange={(o) => !o && setCapa(null)}>
        <DialogContent>
          {capa && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />CAPA — {capa.runNo}
                </DialogTitle>
                <DialogDescription>
                  QC on {capa.analyte} ({capa.instrument}). Document corrective and preventive action.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Corrective Action</Label>
                  <Textarea value={cForm.corrective} onChange={(e) => setCForm((s) => ({ ...s, corrective: e.target.value }))} />
                </div>
                <div className="space-y-1.5"><Label>Preventive Action</Label>
                  <Textarea value={cForm.preventive} onChange={(e) => setCForm((s) => ({ ...s, preventive: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Assigned To</Label>
                    <Input value={cForm.assignedTo} onChange={(e) => setCForm((s) => ({ ...s, assignedTo: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5"><Label>Target Date</Label>
                    <Input type="date" value={cForm.targetDate} onChange={(e) => setCForm((s) => ({ ...s, targetDate: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCapa(null)}>Cancel</Button>
                <Button disabled={busy} onClick={() => void onCapa()}>Save CAPA</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default QualityControlCenter;
