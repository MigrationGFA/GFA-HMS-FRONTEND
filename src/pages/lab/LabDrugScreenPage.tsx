import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, ClipboardList, FileCheck2, Loader2, Pill, Plus, Printer, RefreshCw, Save, Send,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  collectDrugScreen,
  createDrugScreen,
  getDrugScreen,
  isLaboratoryApiEnabled,
  listDrugScreens,
  patchDrugScreenResults,
  rejectDrugScreen,
  submitDrugScreen,
  validateDrugScreen,
  type ApiDrugCatalogItem,
  type ApiDrugScreen,
  type ApiDrugScreenKpis,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labBase, labTone } from './LabPageShell';

type BoardTab = 'all' | 'draft' | 'inProgress' | 'completed';

type Picked = { personId: number; name: string; hospitalNo: string; sex: string };

const STEPS = [
  'Select Patient',
  'Request Drug Screen',
  'Sample Collection',
  'Result Entry',
  'Validation',
  'Print Result',
];

function downloadPdf(filename: string, lines: string[]) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Urine Drug Screen Report', 14, 16);
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

export const LabDrugScreen = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();

  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<ApiDrugCatalogItem[]>([]);
  const [screen, setScreen] = useState<ApiDrugScreen | null>(null);
  const [recent, setRecent] = useState<ApiDrugScreen[]>([]);
  const [kpis, setKpis] = useState<ApiDrugScreenKpis>({
    draft: 0, inProgress: 0, validated: 0, rejected: 0, total: 0,
  });
  const [boardTab, setBoardTab] = useState<BoardTab>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const [sampleNo, setSampleNo] = useState('');
  const [sampleType, setSampleType] = useState('Urine');
  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().slice(0, 10));
  const [resultMap, setResultMap] = useState<Record<string, 'Negative' | 'Positive' | 'Pending'>>({});
  const [remarkMap, setRemarkMap] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [finished, setFinished] = useState(false);

  const loadList = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listDrugScreens({ limit: 100 });
      setRecent(data.items);
      setCatalog(data.drugCatalog?.length ? data.drugCatalog : []);
      if (data.kpis) setKpis(data.kpis);
      else {
        const draft = data.items.filter((x) => x.status === 'Draft').length;
        const validated = data.items.filter((x) => x.status === 'Validated').length;
        const rejected = data.items.filter((x) => x.status === 'Rejected').length;
        const inProgress = data.items.filter((x) =>
          ['Collected', 'ResultsEntered', 'Submitted'].includes(x.status),
        ).length;
        setKpis({ draft, inProgress, validated, rejected, total: data.items.length });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load drug screens';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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
              sex: r.sex ?? '—',
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

  const syncFromScreen = (s: ApiDrugScreen) => {
    setScreen(s);
    setSelectedCodes(s.results.map((r) => r.drugCode));
    setSampleNo(s.sampleNo || '');
    setSampleType(s.sampleType || 'Urine');
    setCollectedAt(s.collectedAt ? s.collectedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const rm: Record<string, 'Negative' | 'Positive' | 'Pending'> = {};
    const notes: Record<string, string> = {};
    for (const r of s.results) {
      rm[r.drugCode] = (r.result as 'Negative' | 'Positive' | 'Pending') || 'Pending';
      notes[r.drugCode] = r.remarks || '';
    }
    setResultMap(rm);
    setRemarkMap(notes);
    setPatient({
      personId: s.personId,
      name: s.patientName,
      hospitalNo: s.hospitalNo || `PID-${s.personId}`,
      sex: s.sex || '—',
    });
  };

  const openExisting = async (id: number) => {
    setBusy(true);
    try {
      const s = await getDrugScreen(id);
      syncFromScreen(s);
      if (s.status === 'Draft') setStep(2);
      else if (s.status === 'Collected') setStep(4);
      else if (s.status === 'ResultsEntered' || s.status === 'Submitted') setStep(5);
      else if (s.status === 'Validated' || s.status === 'Rejected') setStep(6);
      else setStep(3);
      toast.success(`Opened ${s.screenNo}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not open screen');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setPatient(null);
    setSelectedCodes([]);
    setScreen(null);
    setSampleNo('');
    setSampleType('Urine');
    setCollectedAt(new Date().toISOString().slice(0, 10));
    setResultMap({});
    setRemarkMap({});
    setRejectReason('');
    setFinished(false);
  };

  const canAdvance = useMemo(() => {
    if (step === 1) return !!patient;
    if (step === 2) return selectedCodes.length > 0 || !!screen;
    if (step === 3) return screen?.status === 'Collected' || screen?.status === 'ResultsEntered' || screen?.status === 'Submitted' || screen?.status === 'Validated';
    if (step === 4) return screen?.status === 'Submitted' || screen?.status === 'Validated' || screen?.status === 'ResultsEntered';
    if (step === 5) return screen?.status === 'Validated';
    return true;
  }, [step, patient, selectedCodes.length, screen?.status]);

  const onCreate = async () => {
    if (!patient || selectedCodes.length === 0) {
      toast.error('Select patient and at least one drug');
      return;
    }
    setBusy(true);
    try {
      const s = await createDrugScreen({ personId: patient.personId, drugCodes: selectedCodes });
      syncFromScreen(s);
      toast.success(`Created ${s.screenNo}`);
      setStep(3);
      void loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const onCollect = async () => {
    if (!screen) return;
    setBusy(true);
    try {
      const s = await collectDrugScreen(screen.screenId, {
        sampleNo: sampleNo.trim() || undefined,
        sampleType: sampleType.trim() || 'Urine',
        collectedAt: collectedAt || undefined,
      });
      syncFromScreen(s);
      toast.success('Sample collected');
      setStep(4);
      void loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Collect failed');
    } finally {
      setBusy(false);
    }
  };

  const onSaveResults = async (submit: boolean) => {
    if (!screen) return;
    const results = screen.results.map((r) => ({
      drugCode: r.drugCode,
      result: resultMap[r.drugCode] || 'Pending',
      remarks: remarkMap[r.drugCode]?.trim() || undefined,
    }));
    if (submit && results.some((r) => r.result === 'Pending')) {
      toast.error('Set Negative or Positive for every drug before submit');
      return;
    }
    setBusy(true);
    try {
      let s = await patchDrugScreenResults(screen.screenId, results);
      if (submit) s = await submitDrugScreen(screen.screenId);
      syncFromScreen(s);
      toast.success(submit ? 'Results submitted' : 'Draft saved');
      if (submit) setStep(5);
      void loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const onValidate = async () => {
    if (!screen) return;
    setBusy(true);
    try {
      const s = await validateDrugScreen(screen.screenId);
      syncFromScreen(s);
      toast.success('Result validated');
      setStep(6);
      void loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Validate failed');
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!screen || !rejectReason.trim()) return;
    setBusy(true);
    try {
      const s = await rejectDrugScreen(screen.screenId, rejectReason.trim());
      syncFromScreen(s);
      setShowReject(false);
      toast.error('Result rejected');
      void loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  const drugs = catalog.length
    ? catalog
    : [
        { code: 'thc', name: 'Cannabis' },
        { code: 'coc', name: 'Cocaine' },
        { code: 'opi', name: 'Opioids' },
        { code: 'bzo', name: 'Benzodiazepines' },
        { code: 'amp', name: 'Amphetamines' },
        { code: 'met', name: 'Methamphetamine' },
        { code: 'tra', name: 'Tramadol' },
        { code: 'alc', name: 'Alcohol' },
        { code: 'mdp', name: 'Multi-Drug Panel' },
      ];

  const boardRows = useMemo(() => {
    if (boardTab === 'draft') return recent.filter((r) => r.status === 'Draft');
    if (boardTab === 'inProgress') {
      return recent.filter((r) =>
        ['Collected', 'ResultsEntered', 'Submitted'].includes(r.status),
      );
    }
    if (boardTab === 'completed') {
      return recent.filter((r) => r.status === 'Validated' || r.status === 'Rejected');
    }
    return recent;
  }, [recent, boardTab]);

  return (
    <LabShell title="Urine Drug Screening (ARO)">
      <LabSection
        icon={<Pill className="h-5 w-5" />}
        title="Urine Drug Screening"
        desc="Worklist of drafts and completed screens, plus stepped create → collect → validate workflow."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void loadList()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => { reset(); setStep(1); }}>
              <Plus className="h-4 w-4 mr-1" />New Screen
            </Button>
          </div>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total" value={loading ? '…' : String(kpis.total)} icon={ClipboardList} />
        <SummaryCard title="Draft" value={loading ? '…' : String(kpis.draft)} icon={Pill} />
        <SummaryCard title="In Progress" value={loading ? '…' : String(kpis.inProgress)} icon={Send} />
        <SummaryCard title="Validated" value={loading ? '…' : String(kpis.validated)} icon={FileCheck2} />
        <SummaryCard title="Rejected" value={loading ? '…' : String(kpis.rejected)} icon={AlertTriangle} />
      </div>

      <LabCard className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="font-semibold text-sm">Drug screen worklist</h3>
          <Tabs value={boardTab} onValueChange={(v) => setBoardTab(v as BoardTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="inProgress">In progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading screens…
          </p>
        ) : boardRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No screens in this filter. Create a new screen below.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Screen</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boardRows.map((r) => (
                <TableRow key={r.screenId} className={screen?.screenId === r.screenId ? 'bg-primary/5' : ''}>
                  <TableCell className="font-mono text-xs">{r.screenNo}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.patientName}</div>
                    <div className="text-xs text-muted-foreground">{r.hospitalNo || '—'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={labTone(
                        r.status === 'Validated'
                          ? 'green'
                          : r.status === 'Rejected'
                            ? 'rose'
                            : r.status === 'Draft'
                              ? 'amber'
                              : 'sky',
                      )}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void openExisting(r.screenId)}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <LabCard className="mb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setStep(i + 1)}
                className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5
                  ${i + 1 < step ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${i + 1 === step ? 'bg-primary text-primary-foreground' : ''}
                  ${i + 1 > step ? 'bg-muted text-muted-foreground' : ''}`}
              >
                {i + 1 < step && <CheckCircle2 className="h-3 w-3" />}
                {i + 1}. {s}
              </button>
              {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
        {screen && (
          <p className="text-xs text-muted-foreground mt-2">
            Active: <span className="font-mono font-medium text-foreground">{screen.screenNo}</span> · {screen.status}
          </p>
        )}
      </LabCard>

      <LabCard>
        {step === 1 && (
          <div>
            <Input
              placeholder="Search patient by name or hospital no…"
              className="mb-3"
              value={patientQ}
              onChange={(e) => setPatientQ(e.target.value)}
              disabled={!patientsOn}
            />
            {!patientsOn && (
              <p className="text-sm text-amber-700 mb-2">Patient search API is not configured.</p>
            )}
            {patient && (
              <p className="text-sm text-emerald-700 mb-2">
                Selected: {patient.name} · {patient.hospitalNo}
              </p>
            )}
            <div className="divide-y border rounded-lg mb-4">
              {hits.length === 0 && patientQ.trim().length >= 2 ? (
                <p className="p-3 text-sm text-muted-foreground">No patients found.</p>
              ) : (
                hits.map((p) => (
                  <label
                    key={p.personId}
                    className={`flex items-center justify-between p-3 cursor-pointer ${
                      patient?.personId === p.personId ? 'bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={patient?.personId === p.personId}
                        onChange={() => setPatient(p)}
                      />
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.hospitalNo} · {p.sex}
                        </div>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Or open a draft / completed screen from the worklist above.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-sm mb-3 text-muted-foreground">
              Patient:{' '}
              <span className="font-medium text-foreground">
                {patient ? `${patient.name} · ${patient.hospitalNo}` : '—'}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {drugs.map((d) => (
                <label
                  key={d.code}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    selectedCodes.includes(d.code) ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    checked={selectedCodes.includes(d.code)}
                    onCheckedChange={() =>
                      setSelectedCodes((s) =>
                        s.includes(d.code) ? s.filter((x) => x !== d.code) : [...s, d.code],
                      )
                    }
                    disabled={!!screen}
                  />
                  <span className="text-sm font-medium">{d.name}</span>
                </label>
              ))}
            </div>
            {!screen && (
              <Button disabled={busy || !patient || selectedCodes.length === 0} onClick={() => void onCreate()}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Create Screen
              </Button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid md:grid-cols-2 gap-3">
            {!screen ? (
              <p className="md:col-span-2 text-sm text-muted-foreground">Create a screen first (step 2).</p>
            ) : (
              <>
                <div>
                  <Label>Collection Date</Label>
                  <Input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
                </div>
                <div>
                  <Label>Sample Type</Label>
                  <Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Sample ID</Label>
                  <Input value={sampleNo} onChange={(e) => setSampleNo(e.target.value)} placeholder="Optional" />
                </div>
                <div className="md:col-span-2">
                  <Button
                    className="w-full"
                    disabled={busy || screen.status !== 'Draft'}
                    onClick={() => void onCollect()}
                  >
                    {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Collect Sample
                  </Button>
                </div>
                {screen.status !== 'Draft' && (
                  <div className="md:col-span-2 text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Sample collected — proceed to result entry.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 4 && screen && (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screen.results.map((r) => (
                  <TableRow key={r.drugCode}>
                    <TableCell className="font-medium">{r.drugName}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={resultMap[r.drugCode] === 'Negative' ? 'default' : 'outline'}
                          onClick={() => setResultMap((m) => ({ ...m, [r.drugCode]: 'Negative' }))}
                        >
                          Negative
                        </Button>
                        <Button
                          size="sm"
                          variant={resultMap[r.drugCode] === 'Positive' ? 'default' : 'outline'}
                          className={resultMap[r.drugCode] === 'Positive' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                          onClick={() => setResultMap((m) => ({ ...m, [r.drugCode]: 'Positive' }))}
                        >
                          Positive
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        placeholder="Interpretation…"
                        value={remarkMap[r.drugCode] || ''}
                        onChange={(e) => setRemarkMap((m) => ({ ...m, [r.drugCode]: e.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 justify-end mt-3">
              <Button variant="outline" disabled={busy} onClick={() => void onSaveResults(false)}>
                <Save className="h-4 w-4 mr-1" />Save Draft
              </Button>
              <Button disabled={busy} onClick={() => void onSaveResults(true)}>
                <Send className="h-4 w-4 mr-1" />Submit
              </Button>
            </div>
          </div>
        )}

        {step === 5 && screen && (
          <div>
            <h4 className="font-semibold mb-2">Review Results</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screen.results.map((r) => (
                  <TableRow key={r.drugCode}>
                    <TableCell>{r.drugName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={labTone(resultMap[r.drugCode] === 'Positive' ? 'rose' : 'green')}
                      >
                        {resultMap[r.drugCode] || r.result}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 justify-end mt-3">
              <Button variant="destructive" disabled={busy || screen.status === 'Validated'} onClick={() => setShowReject(true)}>
                Reject
              </Button>
              <Button disabled={busy || screen.status === 'Validated'} onClick={() => void onValidate()}>
                <BadgeCheck className="h-4 w-4 mr-1" />Validate
              </Button>
            </div>
          </div>
        )}

        {step === 6 && screen && (
          <div className="border rounded-xl p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <div className="font-semibold">GFA Demo Hospital</div>
                <div className="text-xs text-muted-foreground">Urine Drug Screen Report · {screen.screenNo}</div>
              </div>
              <Badge variant="outline" className={labTone(screen.status === 'Validated' ? 'green' : 'rose')}>
                {screen.status}
              </Badge>
            </div>
            <div className="text-sm mb-3">
              <span className="text-muted-foreground">Patient:</span> {screen.patientName} · {screen.hospitalNo}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screen.results.map((r) => (
                  <TableRow key={r.drugCode}>
                    <TableCell>{r.drugName}</TableCell>
                    <TableCell className="font-semibold">{r.result}</TableCell>
                    <TableCell>{r.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  downloadPdf(
                    `${screen.screenNo}.pdf`,
                    screen.results.map((r) => `${r.drugName}: ${r.result}`),
                  )
                }
              >
                Download PDF
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />Print
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          <Button
            disabled={!canAdvance || busy}
            onClick={() => {
              if (step < 6) setStep((s) => s + 1);
              else setFinished(true);
            }}
          >
            {step < 6 ? 'Next' : 'Finish'} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </LabCard>

      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Result</DialogTitle>
            <DialogDescription>Reason is required to reject and return to the scientist.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || busy} onClick={() => void onReject()}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finished} onOpenChange={setFinished}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drug Screen Process Completed</DialogTitle>
            <DialogDescription>The workflow has been finalized for this screen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFinished(false); reset(); }}>
              <Plus className="h-4 w-4 mr-1" />New Drug Screen
            </Button>
            <Button onClick={() => { setFinished(false); window.location.href = labBase; }}>
              Return Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabDrugScreen;
