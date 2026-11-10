import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Archive, Beaker, BookOpen, Download, Eye, FileEdit, Loader2, Microscope, Printer, RefreshCw, Save,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  createLabCulture,
  isLaboratoryApiEnabled,
  listLabCultures,
  patchLabCulture,
  type ApiLabCulture,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

const CULTURE_TYPES = ['Urine MCS', 'Stool MCS', 'Blood Culture', 'Sputum Culture', 'Wound Swab', 'CSF Culture'];
const ORGANISMS = [
  'Escherichia coli',
  'Klebsiella pneumoniae',
  'Staphylococcus aureus',
  'Pseudomonas aeruginosa',
  'Streptococcus pneumoniae',
  'No growth',
];
const ANTIBIOTICS = [
  'Ciprofloxacin',
  'Ceftriaxone',
  'Augmentin',
  'Gentamicin',
  'Meropenem',
  'Levofloxacin',
  'Amikacin',
  'Imipenem',
];

type Picked = { personId: number; name: string; hospitalNo: string };

function downloadPdf(filename: string, lines: string[], title: string) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  let y = 26;
  for (const line of lines) {
    doc.text(line.slice(0, 100), 14, y);
    y += 5;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  }
  doc.save(filename);
}

export const LabCulture = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();

  const [items, setItems] = useState<ApiLabCulture[]>([]);
  const [kpis, setKpis] = useState({
    savedCultures: 0,
    finalReports: 0,
    provisional: 0,
    organismsTracked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<string | null>(null);
  const [organism, setOrganism] = useState('Escherichia coli');
  const [colonyCount, setColonyCount] = useState('≥10⁵ CFU/mL');
  const [gramStain, setGramStain] = useState('Gram-negative rods');
  const [status, setStatus] = useState<'Provisional' | 'Final'>('Final');
  const [scientist, setScientist] = useState('');
  const [sensitivity, setSensitivity] = useState<Record<string, 's' | 'i' | 'r'>>({});

  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);

  const [view, setView] = useState<ApiLabCulture | null>(null);
  const [edit, setEdit] = useState<ApiLabCulture | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabCultures({ limit: 100 });
      setItems(data.items);
      setKpis(data.kpis ?? { savedCultures: 0, finalReports: 0, provisional: 0, organismsTracked: 0 });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load cultures';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

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
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientQ, patientsOn]);

  const onSave = async () => {
    if (!active) {
      toast.error('Open a culture workspace first');
      return;
    }
    if (!patient) {
      toast.error('Select a patient');
      return;
    }
    const sensitivities = Object.entries(sensitivity).map(([antibiotic, result]) => ({
      antibiotic,
      result: result.toUpperCase(),
    }));
    setBusy(true);
    try {
      await createLabCulture({
        personId: patient.personId,
        cultureType: active,
        organism,
        colonyCount,
        gramStain,
        status,
        scientist: scientist.trim() || undefined,
        sensitivities,
      });
      toast.success('Sensitivity matrix saved');
      setSensitivity({});
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const onEditSave = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await patchLabCulture(edit.cultureId, {
        organism: edit.organism || undefined,
        status: edit.status as 'Provisional' | 'Final' | 'Cancelled',
        scientist: edit.scientist || undefined,
      });
      toast.success('Culture record updated');
      setEdit(null);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LabShell title="Culture & Sensitivity Module">
      <LabSection
        icon={<Microscope className="h-5 w-5" />}
        title="MCS Workspace"
        desc="Culture types, organism identification and antimicrobial sensitivity matrix."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>{error}</div>
          </div>
        </LabCard>
      )}

      <LabCard className="mb-4 bg-blue-50 border-blue-200 text-blue-900 text-sm">
        <div className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold mb-1">About Culture & Sensitivity</div>
            Culture & Sensitivity identifies infectious organisms and determines which antibiotics are effective or resistant.
          </div>
        </div>
      </LabCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Saved Cultures" value={loading ? '…' : String(kpis.savedCultures)} icon={Archive} />
        <SummaryCard title="Final Reports" value={loading ? '…' : String(kpis.finalReports)} icon={Beaker} />
        <SummaryCard title="Active Workspaces" value={active ? '1' : '0'} icon={Microscope} />
        <SummaryCard title="Organisms Tracked" value={loading ? '…' : String(kpis.organismsTracked)} icon={Beaker} />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {CULTURE_TYPES.map((c) => (
          <LabCard key={c} className={active === c ? 'border-primary ring-1 ring-primary' : ''}>
            <div className="font-semibold mb-1">{c}</div>
            <p className="text-xs text-muted-foreground mb-3">Open workspace to record organism and sensitivity.</p>
            <Button size="sm" variant={active === c ? 'default' : 'outline'} onClick={() => setActive(c)}>
              Open
            </Button>
          </LabCard>
        ))}
      </div>

      {active && (
        <LabCard>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold">{active}</h3>
            <Badge variant="outline" className={labTone('amber')}>In Progress</Badge>
          </div>
          <div className="mb-4">
            <Label>Patient</Label>
            <Input
              placeholder="Search patient…"
              value={patientQ}
              onChange={(e) => setPatientQ(e.target.value)}
              disabled={!patientsOn}
            />
            {patient && (
              <p className="text-xs text-emerald-700 mt-1">
                Selected: {patient.name} · {patient.hospitalNo}
              </p>
            )}
            <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y">
              {hits.map((p) => (
                <button
                  key={p.personId}
                  type="button"
                  className="w-full text-left text-xs p-2 hover:bg-muted/40"
                  onClick={() => {
                    setPatient(p);
                    setPatientQ('');
                    setHits([]);
                  }}
                >
                  {p.name} · {p.hospitalNo}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Organism Identified</Label>
              <Select value={organism} onValueChange={setOrganism}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANISMS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Colony Count</Label>
              <Input value={colonyCount} onChange={(e) => setColonyCount(e.target.value)} />
            </div>
            <div>
              <Label>Gram Stain</Label>
              <Input value={gramStain} onChange={(e) => setGramStain(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'Provisional' | 'Final')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Final">Final</SelectItem>
                  <SelectItem value="Provisional">Provisional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scientist</Label>
              <Input value={scientist} onChange={(e) => setScientist(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <h4 className="font-semibold mb-2">Antimicrobial Sensitivity Matrix</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Antibiotic</TableHead>
                <TableHead>S</TableHead>
                <TableHead>I</TableHead>
                <TableHead>R</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ANTIBIOTICS.map((d) => (
                <TableRow key={d}>
                  <TableCell className="font-medium">{d}</TableCell>
                  {(['s', 'i', 'r'] as const).map((k) => (
                    <TableCell key={k}>
                      <input
                        type="radio"
                        name={d}
                        checked={sensitivity[d] === k}
                        onChange={() => setSensitivity((s) => ({ ...s, [d]: k }))}
                        className="h-4 w-4"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={labTone(
                        sensitivity[d] === 's' ? 'green' : sensitivity[d] === 'i' ? 'amber' : sensitivity[d] === 'r' ? 'rose' : 'sky',
                      )}
                    >
                      {sensitivity[d] === 's'
                        ? 'Sensitive'
                        : sensitivity[d] === 'i'
                          ? 'Intermediate'
                          : sensitivity[d] === 'r'
                            ? 'Resistant'
                            : '—'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <LabCard className="bg-emerald-50 border-emerald-200">
              <h4 className="font-semibold text-emerald-700 mb-2">Recommended Antibiotics</h4>
              <div className="text-sm">
                {Object.entries(sensitivity)
                  .filter(([, v]) => v === 's')
                  .map(([d]) => d)
                  .join(', ') || 'None selected yet.'}
              </div>
            </LabCard>
            <LabCard className="bg-rose-50 border-rose-200">
              <h4 className="font-semibold text-rose-700 mb-2">Resistance Profile</h4>
              <div className="text-sm">
                {Object.entries(sensitivity)
                  .filter(([, v]) => v === 'r')
                  .map(([d]) => d)
                  .join(', ') || 'None marked yet.'}
              </div>
            </LabCard>
          </div>
          <Button className="mt-4" disabled={busy} onClick={() => void onSave()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Matrix
          </Button>
        </LabCard>
      )}

      <LabCard className="mt-6">
        <LabSection icon={<Archive className="h-5 w-5" />} title="Saved Culture Records" desc="Sensitivity matrices from the laboratory API." />
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading cultures…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No culture records yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Organism</TableHead>
                <TableHead>Culture</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Scientist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.cultureId}>
                  <TableCell className="font-mono text-xs">{s.cultureNo}</TableCell>
                  <TableCell>{s.patientName}</TableCell>
                  <TableCell className="italic">{s.organism || '—'}</TableCell>
                  <TableCell>{s.cultureType}</TableCell>
                  <TableCell>{s.reportedAt ? new Date(s.reportedAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{s.scientist || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={labTone(s.status === 'Final' ? 'green' : 'amber')}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setView(s)}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(s)}>
                      <FileEdit className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        downloadPdf(
                          `${s.cultureNo}.pdf`,
                          [
                            `Patient: ${s.patientName}`,
                            `Organism: ${s.organism}`,
                            `Culture: ${s.cultureType}`,
                            '',
                            'Sensitivity:',
                            ...Object.entries(s.sensitivity || {}).map(
                              ([d, v]) =>
                                `  ${d}: ${v === 'S' || v === 's' ? 'Sensitive' : v === 'I' || v === 'i' ? 'Intermediate' : 'Resistant'}`,
                            ),
                          ],
                          'Culture & Sensitivity Report',
                        )
                      }
                    >
                      <Download className="h-3 w-3 mr-1" />PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>Culture Result · {view.cultureNo}</DialogTitle>
                <DialogDescription>
                  {view.patientName} · {view.cultureType}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Organism</div>
                  <div className="font-semibold italic">{view.organism || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Scientist</div>
                  <div className="font-semibold">{view.scientist || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline">{view.status}</Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" />Print
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          {edit && (
            <>
              <DialogHeader>
                <DialogTitle>Edit · {edit.cultureNo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div>
                  <Label>Organism</Label>
                  <Select
                    value={edit.organism || ORGANISMS[0]}
                    onValueChange={(v) => setEdit({ ...edit, organism: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORGANISMS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={edit.status}
                    onValueChange={(v) => setEdit({ ...edit, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Final">Final</SelectItem>
                      <SelectItem value="Provisional">Provisional</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                <Button disabled={busy} onClick={() => void onEditSave()}>Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabCulture;
