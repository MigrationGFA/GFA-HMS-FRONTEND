import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Beaker, CheckCircle2, ClipboardCheck, FileSignature, FlaskConical, Loader2, Microscope, Plus, RefreshCw,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  createMicrobiology,
  isLaboratoryApiEnabled,
  listMicrobiology,
  patchMicrobiology,
  validateMicrobiology,
  type ApiMicroItem,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

const cultureTabs = [
  { key: 'Urine MCS', label: 'Urine MCS' },
  { key: 'Stool MCS', label: 'Stool MCS' },
  { key: 'Blood Culture', label: 'Blood Culture' },
  { key: 'Sputum Culture', label: 'Sputum Culture' },
  { key: 'Wound Swab', label: 'Wound Swab' },
  { key: 'CSF Culture', label: 'CSF Culture' },
  { key: 'Other', label: 'Others' },
];

const ORGANISMS = [
  'Escherichia coli', 'Klebsiella pneumoniae', 'Staphylococcus aureus',
  'Pseudomonas aeruginosa', 'Streptococcus pneumoniae', 'No growth',
];

type Picked = { personId: number; name: string; hospitalNo: string };

function displayStatus(r: ApiMicroItem): string {
  if (r.status === 'Provisional') return 'Awaiting Validation';
  if (r.status === 'Final') return r.microOutcome === 'Negative' ? 'Negative' : 'Positive';
  return r.status;
}

export const MicrobiologyWorkbench = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();
  const [rows, setRows] = useState<ApiMicroItem[]>([]);
  const [kpis, setKpis] = useState({
    pending: 0, positive: 0, negative: 0, awaitingValidation: 0, completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [analysis, setAnalysis] = useState<ApiMicroItem | null>(null);
  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [cultureType, setCultureType] = useState('Urine MCS');
  const [organism, setOrganism] = useState('Escherichia coli');
  const [colonyCount, setColonyCount] = useState('');
  const [gramStain, setGramStain] = useState('');

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listMicrobiology({ limit: 100 });
      setRows(data.items);
      setKpis(data.kpis);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load microbiology';
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
        .then((list) => {
          if (cancelled) return;
          setHits(
            list.slice(0, 8).map((r) => ({
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

  const byType = useMemo(() => {
    const known = new Set(cultureTabs.map((t) => t.key).filter((k) => k !== 'Other'));
    return (key: string) =>
      rows.filter((r) => (key === 'Other' ? !known.has(r.cultureType) : r.cultureType === key));
  }, [rows]);

  const onCreate = async () => {
    if (!patient) { toast.error('Select a patient'); return; }
    setBusy(true);
    try {
      await createMicrobiology({
        personId: patient.personId,
        cultureType,
        organism,
        colonyCount: colonyCount || undefined,
        gramStain: gramStain || undefined,
        status: 'Provisional',
      });
      toast.success('Culture started');
      setCreateOpen(false);
      setPatient(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysis) return;
    setBusy(true);
    try {
      await patchMicrobiology(analysis.cultureId, {
        organism,
        colonyCount: colonyCount || undefined,
        gramStain: gramStain || undefined,
        status: 'Provisional',
      });
      toast.success('Analysis saved');
      setAnalysis(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const onValidate = async (r: ApiMicroItem) => {
    setBusy(true);
    try {
      await validateMicrobiology(r.cultureId);
      toast.success(`${r.cultureNo} validated`);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Validate failed');
    } finally {
      setBusy(false);
    }
  };

  const startAnalysis = (r: ApiMicroItem) => {
    setAnalysis(r);
    setOrganism(r.organism || 'Escherichia coli');
    setColonyCount(r.colonyCount || '');
    setGramStain(r.gramStain || '');
  };

  return (
    <LabShell title="Microbiology Workbench">
      <LabSection
        icon={<Microscope className="h-5 w-5" />}
        title="Microbiology Workbench"
        desc="Process cultures and sensitivity panels across specimen types (backed by laboratory cultures)."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Start Culture
            </Button>
          </div>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{error}
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending Cultures" value={loading ? '…' : String(kpis.pending)} icon={FlaskConical} />
        <SummaryCard title="Positive" value={loading ? '…' : String(kpis.positive)} icon={AlertTriangle} />
        <SummaryCard title="Negative" value={loading ? '…' : String(kpis.negative)} icon={CheckCircle2} />
        <SummaryCard title="Awaiting Validation" value={loading ? '…' : String(kpis.awaitingValidation)} icon={FileSignature} />
        <SummaryCard title="Completed" value={loading ? '…' : String(kpis.completed)} icon={ClipboardCheck} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2 py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading cultures…
        </p>
      ) : (
        <Tabs defaultValue="Urine MCS">
          <TabsList className="flex-wrap h-auto">
            {cultureTabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {cultureTabs.map((t) => {
            const list = byType(t.key);
            return (
              <TabsContent key={t.key} value={t.key} className="mt-3">
                <LabCard>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No {t.label} cultures.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Culture ID</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Organism</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.cultureId}>
                            <TableCell className="font-mono text-xs">{r.cultureNo}</TableCell>
                            <TableCell>{r.patientName}</TableCell>
                            <TableCell className="italic">{r.organism || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={labTone(
                                displayStatus(r) === 'Positive' ? 'rose' : displayStatus(r) === 'Negative' || displayStatus(r) === 'Completed' ? 'green' : 'amber',
                              )}>
                                {displayStatus(r)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" variant="outline" onClick={() => startAnalysis(r)}>
                                <Beaker className="h-3 w-3 mr-1" />Edit
                              </Button>
                              {r.status === 'Provisional' && (
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => void onValidate(r)}>
                                  <FileSignature className="h-3 w-3 mr-1" />Validate
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
            );
          })}
        </Tabs>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Culture</DialogTitle>
            <DialogDescription>Creates a provisional culture record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient</Label>
              <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="Search…" />
              {patient && <p className="text-xs text-emerald-700 mt-1">{patient.name}</p>}
              <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y">
                {hits.map((p) => (
                  <button key={p.personId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40"
                    onClick={() => { setPatient(p); setPatientQ(''); setHits([]); }}>
                    {p.name} · {p.hospitalNo}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Culture type</Label>
              <Select value={cultureType} onValueChange={setCultureType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cultureTabs.filter((t) => t.key !== 'Other').map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organism</Label>
              <Select value={organism} onValueChange={setOrganism}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANISMS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onCreate()}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!analysis} onOpenChange={(o) => !o && setAnalysis(null)}>
        <DialogContent>
          {analysis && (
            <>
              <DialogHeader>
                <DialogTitle>Culture analysis · {analysis.cultureNo}</DialogTitle>
                <DialogDescription>{analysis.patientName} · {analysis.cultureType}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Organism</Label>
                  <Select value={organism} onValueChange={setOrganism}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORGANISMS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Colony count</Label><Input value={colonyCount} onChange={(e) => setColonyCount(e.target.value)} /></div>
                <div><Label>Gram stain</Label><Input value={gramStain} onChange={(e) => setGramStain(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAnalysis(null)}>Cancel</Button>
                <Button disabled={busy} onClick={() => void saveAnalysis()}>Save Analysis</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default MicrobiologyWorkbench;
