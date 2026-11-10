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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Beaker, CheckCircle2, Loader2, Plus, RefreshCw, Send,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  advanceHistopathology,
  createHistopathology,
  isLaboratoryApiEnabled,
  listHistopathology,
  patchHistopathology,
  releaseHistopathology,
  type ApiHistopathology,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

const SPECIMEN_TYPES = ['Biopsy', 'Surgical Specimens', 'Cytology', 'Special Stains'] as const;

type Picked = { personId: number; name: string; hospitalNo: string };
type ReportForm = { site: string; gross: string; micro: string; diagnosis: string; grade: string };

const emptyReport = (): ReportForm => ({
  site: '', gross: '', micro: '', diagnosis: '', grade: '',
});

export const HistopathologyCenter = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();
  const [items, setItems] = useState<ApiHistopathology[]>([]);
  const [kpis, setKpis] = useState({
    received: 0, grossing: 0, microscopy: 0, awaitingApproval: 0, released: 0, total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [specimenType, setSpecimenType] = useState<string>('Biopsy');
  const [active, setActive] = useState<ApiHistopathology | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyReport());

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listHistopathology({ limit: 100 });
      setItems(data.items);
      setKpis(data.kpis);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load histopathology';
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

  const openReport = (c: ApiHistopathology) => {
    setActive(c);
    setForm({
      site: c.site || '',
      gross: c.gross || '',
      micro: c.micro || '',
      diagnosis: c.diagnosis || '',
      grade: c.grade || '',
    });
    setReportOpen(true);
  };

  const onRegister = async () => {
    if (!patient) { toast.error('Select a patient'); return; }
    setBusy(true);
    try {
      const c = await createHistopathology({ personId: patient.personId, specimenType });
      toast.success(`Registered ${c.caseNo}`);
      setPatient(null);
      setPatientQ('');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Register failed');
    } finally {
      setBusy(false);
    }
  };

  const onAdvance = async (c: ApiHistopathology) => {
    setBusy(true);
    try {
      const updated = await advanceHistopathology(c.caseId);
      toast.success(`${updated.caseNo} → ${updated.stage}`);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Advance failed');
    } finally {
      setBusy(false);
    }
  };

  const onSaveReport = async (andRelease: boolean) => {
    if (!active) return;
    if (andRelease && !form.diagnosis.trim()) {
      toast.error('Diagnosis is required to release');
      return;
    }
    setBusy(true);
    try {
      await patchHistopathology(active.caseId, form);
      if (andRelease) {
        await releaseHistopathology(active.caseId);
        toast.success('Report saved and released');
      } else {
        toast.success('Report saved');
      }
      setReportOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const stageTone = (s: string) => {
    if (s === 'Released') return labTone('green');
    if (s === 'Awaiting Approval') return labTone('amber');
    if (s === 'Received') return labTone('sky');
    return labTone('blue');
  };

  return (
    <LabShell title="Laboratory · Histopathology">
      <LabSection
        icon={<Beaker className="h-5 w-5" />}
        title="Histopathology Centre"
        desc="Register specimens, advance stages, and release pathology reports."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Received" value={String(kpis.received)} icon={Beaker} tone="blue" />
        <SummaryCard title="Grossing" value={String(kpis.grossing)} icon={Beaker} tone="indigo" />
        <SummaryCard title="Microscopy" value={String(kpis.microscopy)} icon={Beaker} tone="purple" />
        <SummaryCard title="Awaiting Approval" value={String(kpis.awaitingApproval)} icon={AlertTriangle} tone="amber" />
        <SummaryCard title="Released" value={String(kpis.released)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Total" value={String(kpis.total)} icon={Beaker} tone="teal" />
      </div>

      <LabCard className="mb-5 space-y-3">
        <h3 className="font-medium text-sm">Register specimen</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5 relative">
            <Label>Patient</Label>
            <Input
              value={patient ? `${patient.name} (${patient.hospitalNo})` : patientQ}
              onChange={(e) => { setPatient(null); setPatientQ(e.target.value); }}
              placeholder="Search name or hospital no"
            />
            {hits.length > 0 && !patient && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-md max-h-48 overflow-auto">
                {hits.map((h) => (
                  <button
                    key={h.personId}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => { setPatient(h); setHits([]); setPatientQ(''); }}
                  >
                    {h.name} · {h.hospitalNo}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Specimen type</Label>
            <Select value={specimenType} onValueChange={setSpecimenType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPECIMEN_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => void onRegister()} disabled={busy || !apiOn}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Register
            </Button>
          </div>
        </div>
      </LabCard>

      <LabCard>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading cases…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No histopathology cases yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Specimen</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.caseId}>
                  <TableCell className="font-medium">{c.caseNo}</TableCell>
                  <TableCell>
                    <div>{c.patientName}</div>
                    <div className="text-xs text-muted-foreground">{c.hospitalNo}</div>
                  </TableCell>
                  <TableCell>{c.specimenType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={stageTone(c.stage)}>{c.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.receivedAt ? new Date(c.receivedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openReport(c)} disabled={busy}>
                      Report
                    </Button>
                    {c.stage !== 'Released' && (
                      <Button size="sm" onClick={() => void onAdvance(c)} disabled={busy}>
                        <Send className="h-3 w-3 mr-1" />Advance
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <Dialog open={reportOpen} onOpenChange={(o) => !o && setReportOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Histopathology Report — {active.caseNo}</DialogTitle>
                <DialogDescription>
                  {active.patientName} · {active.specimenType} · {active.stage}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Site</Label>
                  <Input value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))} disabled={active.stage === 'Released'} />
                </div>
                <div className="space-y-1.5"><Label>Gross</Label>
                  <Textarea value={form.gross} onChange={(e) => setForm((f) => ({ ...f, gross: e.target.value }))} disabled={active.stage === 'Released'} />
                </div>
                <div className="space-y-1.5"><Label>Microscopy</Label>
                  <Textarea value={form.micro} onChange={(e) => setForm((f) => ({ ...f, micro: e.target.value }))} disabled={active.stage === 'Released'} />
                </div>
                <div className="space-y-1.5"><Label>Diagnosis</Label>
                  <Textarea value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} disabled={active.stage === 'Released'} />
                </div>
                <div className="space-y-1.5"><Label>Grade</Label>
                  <Input value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} disabled={active.stage === 'Released'} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>Close</Button>
                {active.stage !== 'Released' && (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => void onSaveReport(false)}>Save</Button>
                    <Button disabled={busy} onClick={() => void onSaveReport(true)}>Save & Release</Button>
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

export default HistopathologyCenter;
