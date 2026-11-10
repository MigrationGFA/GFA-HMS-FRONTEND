import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, BadgeCheck, BookOpen, Droplets, Loader2, Plus, RefreshCw, Save, Send,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  createSfa,
  isLaboratoryApiEnabled,
  listSfa,
  patchSfa,
  submitSfa,
  validateSfa,
  type ApiSfa,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

type Picked = { personId: number; name: string; hospitalNo: string };
type Form = {
  volumeMl: string; colour: string; viscosity: string; liquefactionMin: string; ph: string;
  countMMl: string; motilityPct: string; morphologyPct: string; pusCells: string; rbc: string;
  epithelial: string; interpretation: string;
};

const emptyForm = (): Form => ({
  volumeMl: '', colour: '', viscosity: '', liquefactionMin: '', ph: '',
  countMMl: '', motilityPct: '', morphologyPct: '', pusCells: '', rbc: '',
  epithelial: '', interpretation: '',
});

export const LabSfa = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();
  const [items, setItems] = useState<ApiSfa[]>([]);
  const [kpis, setKpis] = useState({ draft: 0, submitted: 0, validated: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [active, setActive] = useState<ApiSfa | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listSfa({ limit: 100 });
      setItems(data.items);
      setKpis(data.kpis);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load SFA';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!patientsOn || patientQ.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchPersons(patientQ.trim())
        .then((rows) => {
          if (cancelled) return;
          setHits(
            rows.slice(0, 8).map((r) => ({
              personId: r.personId,
              name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
              hospitalNo: r.hospitalNo || `PID-${r.personId}`,
            })),
          );
        })
        .catch(() => { if (!cancelled) setHits([]); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [patientQ, patientsOn]);

  const openRow = (s: ApiSfa) => {
    setActive(s);
    setPatient({ personId: s.personId, name: s.patientName, hospitalNo: s.hospitalNo || `PID-${s.personId}` });
    setForm({
      volumeMl: s.volumeMl || '', colour: s.colour || '', viscosity: s.viscosity || '',
      liquefactionMin: s.liquefactionMin || '', ph: s.ph || '', countMMl: s.countMMl || '',
      motilityPct: s.motilityPct || '', morphologyPct: s.morphologyPct || '',
      pusCells: s.pusCells || '', rbc: s.rbc || '', epithelial: s.epithelial || '',
      interpretation: s.interpretation || '',
    });
  };

  const onCreate = async () => {
    if (!patient) { toast.error('Select a patient'); return; }
    setBusy(true);
    try {
      const s = await createSfa({ personId: patient.personId, ...form });
      toast.success(`Created ${s.sfaNo}`);
      openRow(s);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const s = await patchSfa(active.sfaId, form);
      openRow(s);
      toast.success('Saved');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await patchSfa(active.sfaId, form);
      const s = await submitSfa(active.sfaId);
      openRow(s);
      toast.success('Submitted for validation');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const onValidate = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const s = await validateSfa(active.sfaId);
      openRow(s);
      toast.success('Validated');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Validate failed');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <LabShell title="Seminal Fluid Analysis (ARO)">
      <LabSection
        icon={<Droplets className="h-5 w-5" />}
        title="Male Fertility Evaluation"
        desc="WHO-aligned macroscopy, microscopy & interpretation."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{error}
        </LabCard>
      )}

      <LabCard className="mb-4 bg-blue-50 border-blue-200 text-blue-900 text-sm">
        <div className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 mt-0.5" />
          <div>SFA evaluates volume, sperm count, motility, morphology, viscosity and pH against WHO 2021 references.</div>
        </div>
      </LabCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Draft" value={loading ? '…' : String(kpis.draft)} icon={Droplets} />
        <SummaryCard title="Submitted" value={loading ? '…' : String(kpis.submitted)} icon={Send} />
        <SummaryCard title="Validated" value={loading ? '…' : String(kpis.validated)} icon={BadgeCheck} />
        <SummaryCard title="Rejected" value={loading ? '…' : String(kpis.rejected)} icon={AlertTriangle} />
      </div>

      <LabCard className="mb-4">
        <h3 className="font-semibold mb-2 text-sm">SFA worklist</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No SFA records yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.sfaId}>
                  <TableCell className="font-mono text-xs">{s.sfaNo}</TableCell>
                  <TableCell>{s.patientName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={labTone(s.status === 'Validated' ? 'green' : s.status === 'Rejected' ? 'rose' : 'amber')}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openRow(s)}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <LabCard className="mb-4">
        <Label>Patient</Label>
        <Input placeholder="Search patient…" value={patientQ} onChange={(e) => setPatientQ(e.target.value)} disabled={!patientsOn} />
        {patient && <p className="text-xs text-emerald-700 mt-1">Selected: {patient.name} · {patient.hospitalNo}</p>}
        <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y mb-3">
          {hits.map((p) => (
            <button key={p.personId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40"
              onClick={() => { setPatient(p); setPatientQ(''); setHits([]); setActive(null); setForm(emptyForm()); }}>
              {p.name} · {p.hospitalNo}
            </button>
          ))}
        </div>
        {active && (
          <p className="text-xs text-muted-foreground mb-2">
            Editing <span className="font-mono font-medium text-foreground">{active.sfaNo}</span> · {active.status}
          </p>
        )}
      </LabCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <LabCard>
          <h3 className="font-semibold mb-3">Macroscopy</h3>
          <div className="grid grid-cols-2 gap-3">
            {([['volumeMl', 'Volume (ml)'], ['colour', 'Colour'], ['viscosity', 'Viscosity'], ['liquefactionMin', 'Liquefaction (min)'], ['ph', 'pH']] as const).map(([k, label]) => (
              <div key={k}><Label>{label}</Label><Input value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>
            ))}
          </div>
        </LabCard>
        <LabCard>
          <h3 className="font-semibold mb-3">Microscopy</h3>
          <div className="grid grid-cols-2 gap-3">
            {([['countMMl', 'Count (M/ml)'], ['motilityPct', 'Motility (%)'], ['morphologyPct', 'Morphology (%)'], ['pusCells', 'Pus Cells'], ['rbc', 'RBC'], ['epithelial', 'Epithelial']] as const).map(([k, label]) => (
              <div key={k}><Label>{label}</Label><Input value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>
            ))}
          </div>
        </LabCard>
      </div>

      <LabCard className="mt-4">
        <Label>Interpretation</Label>
        <Textarea rows={3} value={form.interpretation} onChange={(e) => set('interpretation', e.target.value)} placeholder="WHO 2021 reference applied…" />
        <div className="flex flex-wrap gap-2 mt-3">
          {!active && (
            <Button disabled={busy || !patient} onClick={() => void onCreate()}>
              <Plus className="h-4 w-4 mr-1" />Create Draft
            </Button>
          )}
          {active && ['Draft', 'Submitted'].includes(active.status) && (
            <Button variant="outline" disabled={busy} onClick={() => void onSave()}>
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          )}
          {active && (active.status === 'Draft' || active.status === 'Rejected') && (
            <Button disabled={busy} onClick={() => void onSubmit()}>
              <Send className="h-4 w-4 mr-1" />Submit
            </Button>
          )}
          {active && active.status === 'Submitted' && (
            <Button disabled={busy} onClick={() => void onValidate()}>
              <BadgeCheck className="h-4 w-4 mr-1" />Validate
            </Button>
          )}
        </div>
      </LabCard>
    </LabShell>
  );
};

export default LabSfa;
