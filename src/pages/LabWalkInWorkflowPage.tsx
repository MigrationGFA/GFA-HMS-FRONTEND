import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardList, FlaskConical, UserPlus, CreditCard, CheckCircle2, ArrowRight, Send,
  Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  createLabRequest,
  isLaboratoryApiEnabled,
  isLabPaymentCleared,
  labPatientName,
  listLabTests,
  listLabWorkQueue,
  type ApiLabRequest,
  type ApiLabTest,
} from '@/lib/api/laboratory';
import { LabShell as Shell, LabCard as Card, LabSection as Section, labBase as base } from './lab/LabPageShell';

type WalkInPatient = {
  personId: number;
  name: string;
  hospitalNo: string;
  phone: string;
  age: number;
  gender: string;
};

export const LabWalkInWorkflow = () => {
  const navigate = useNavigate();
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [patientQ, setPatientQ] = useState('');
  const [patientResults, setPatientResults] = useState<WalkInPatient[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [patient, setPatient] = useState<WalkInPatient | null>(null);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ApiLabTest[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [testQ, setTestQ] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'Stat'>('Routine');
  const [indication, setIndication] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ApiLabRequest | null>(null);

  const [paidWalkIns, setPaidWalkIns] = useState<ApiLabRequest[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const loadCatalog = async (opts?: { silent?: boolean }) => {
    if (!apiOn) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await listLabTests({ status: 'Active', limit: 200 });
      setCatalog(data.items);
      if (data.items.length === 0 && !opts?.silent) {
        toast.message('Lab catalog is empty — ask admin to activate tests.');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load lab catalog';
      setCatalogError(msg);
      setCatalog([]);
      if (!opts?.silent) toast.error(msg);
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadPaidWalkIns = async () => {
    if (!apiOn) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await listLabWorkQueue({ source: 'WalkIn', limit: 50 });
      setPaidWalkIns(data.items.filter((r) => isLabPaymentCleared(r)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load paid walk-in queue';
      setQueueError(msg);
      setPaidWalkIns([]);
      toast.error(msg);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    void loadPaidWalkIns();
    void loadCatalog({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  useEffect(() => {
    if (!patientsOn) return;
    const q = patientQ.trim();
    if (q.length < 2) {
      setPatientResults([]);
      setPatientSearchError(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPatientSearching(true);
      setPatientSearchError(null);
      searchPersons(q)
        .then((rows) => {
          if (cancelled) return;
          setPatientResults(
            rows.map((r) => {
              const age = r.dateOfBirth
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(r.dateOfBirth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
                    ),
                  )
                : 0;
              return {
                personId: r.personId,
                name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
                hospitalNo: r.hospitalNo || `PID-${r.personId}`,
                phone: r.patientPhoneNo ?? '',
                age,
                gender: r.sex ?? '—',
              };
            }),
          );
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err instanceof ApiError ? err.message : 'Patient search failed';
          setPatientSearchError(msg);
          setPatientResults([]);
          toast.error(msg);
        })
        .finally(() => {
          if (!cancelled) setPatientSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientQ, patientsOn]);

  const selectPatient = async (p: WalkInPatient) => {
    setPatient(p);
    setStep(2);
    toast.success(`Selected ${p.name}`);
    if (catalog.length === 0 && !catalogLoading) {
      await loadCatalog();
    }
  };

  const filteredTests = useMemo(() => {
    const s = testQ.trim().toLowerCase();
    return catalog.filter(
      (t) => !s || `${t.name} ${t.testCode} ${t.category}`.toLowerCase().includes(s),
    );
  }, [catalog, testQ]);

  const selectedTests = useMemo(
    () => catalog.filter((t) => selected.has(t.labTestId)),
    [catalog, selected],
  );
  const total = selectedTests.reduce((s, t) => s + t.unitPrice, 0);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id);
      return next;
    });
  };

  const submit = async () => {
    if (!patient) {
      toast.error('Select a patient');
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
    if (!apiOn) {
      toast.error('Laboratory API is not configured');
      return;
    }
    setSubmitting(true);
    try {
      const row = await createLabRequest({
        personId: patient.personId,
        source: 'WalkIn',
        priority,
        clinicalIndication: indication.trim(),
        clinicalNotes: notes.trim() || undefined,
        items: Array.from(selected).map((testId) => ({ testId })),
      });
      setCreated(row);
      setStep(3);
      toast.success(`${row.requestNo} created · Unpaid — send patient to Cashier`);
      void loadPaidWalkIns();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create walk-in request');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setPatient(null);
    setPatientQ('');
    setSelected(new Set());
    setPriority('Routine');
    setIndication('');
    setNotes('');
    setCreated(null);
  };

  return (
    <Shell title="Walk-In Laboratory Workflow">
      <Section
        icon={<UserPlus className="h-5 w-5" />}
        title="Walk-In Lab Request"
        desc="Select an existing patient, choose tests, and submit. Payment stays Unpaid until Cashier confirms — then it appears on the Lab Request Center."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(`${base}/requests`)}>
            Open Request Center
          </Button>
        }
      />

      {!apiOn && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Backend API is not configured. Set <code>VITE_USE_API=true</code> and <code>VITE_API_BASE_URL</code>.
          </p>
        </Card>
      )}

      {apiOn && !patientsOn && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Patients API is off — patient search will not work until it is enabled.
          </p>
        </Card>
      )}

      {catalogError && (
        <Card className="mb-4 border-rose-200 bg-rose-50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {catalogError}
            </p>
            <Button size="sm" variant="outline" onClick={() => void loadCatalog()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry catalog
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Step" value={`${step} / 3`} icon={ClipboardList} />
        <SummaryCard title="Tests selected" value={String(selected.size)} icon={FlaskConical} />
        <SummaryCard title="Est. total" value={formatCurrency(total)} icon={CreditCard} />
        <SummaryCard title="Paid walk-ins (queue)" value={String(paidWalkIns.length)} icon={CheckCircle2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4 text-xs font-medium">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center ${
                      step === s
                        ? 'bg-primary text-primary-foreground'
                        : step > s
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-muted'
                    }`}
                  >
                    {s}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground">
                    {s === 1 ? 'Patient' : s === 2 ? 'Tests' : 'Done'}
                  </span>
                  {s < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div>
                <Label className="text-xs mb-1 block">Search registered patient</Label>
                <Input
                  placeholder="Name, hospital no, or phone…"
                  value={patientQ}
                  onChange={(e) => setPatientQ(e.target.value)}
                  className="mb-3"
                />
                {patientSearching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </div>
                )}
                <div className="max-h-[320px] overflow-y-auto border rounded-lg divide-y">
                  {patientResults.map((p) => (
                    <button
                      key={p.personId}
                      type="button"
                      className={`w-full text-left p-3 hover:bg-muted/40 ${
                        patient?.personId === p.personId ? 'bg-sky-50' : ''
                      }`}
                      onClick={() => void selectPatient(p)}
                    >
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.hospitalNo} · {p.gender} · {p.age}y · {p.phone || '—'}
                      </div>
                    </button>
                  ))}
                  {patientSearchError && (
                    <div className="text-sm text-rose-700 py-4 text-center px-3">{patientSearchError}</div>
                  )}
                  {!patientSearching && !patientSearchError && patientQ.trim().length >= 2 && patientResults.length === 0 && (
                    <div className="text-sm text-muted-foreground py-6 text-center">No patient found.</div>
                  )}
                  {patientQ.trim().length < 2 && (
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      Type at least 2 characters to search registered patients.
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && patient && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground">Patient</div>
                    <div className="font-semibold">
                      {patient.name}{' '}
                      <span className="text-xs text-muted-foreground font-normal">· {patient.hospitalNo}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
                    Change patient
                  </Button>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
                  </div>
                ) : catalog.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {catalogError || 'No active lab tests available.'}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => void loadCatalog()}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Reload catalog
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search tests…"
                      value={testQ}
                      onChange={(e) => setTestQ(e.target.value)}
                      className="mb-3"
                    />
                    <div className="max-h-[280px] overflow-y-auto border rounded-lg divide-y mb-4">
                      {filteredTests.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">No tests match your search.</div>
                      ) : (
                        filteredTests.map((t) => (
                          <label
                            key={t.labTestId}
                            className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selected.has(t.labTestId)}
                                onCheckedChange={() => toggle(t.labTestId)}
                              />
                              <div>
                                <div className="font-medium text-sm">
                                  {t.name}{' '}
                                  <span className="font-mono text-xs text-muted-foreground">({t.testCode})</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t.category} · {t.specimenType} · TAT {t.turnaround}
                                </div>
                              </div>
                            </div>
                            <div className="font-semibold text-sm">{formatCurrency(t.unitPrice)}</div>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                          <SelectTrigger>
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
                        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap border-t pt-3">
                      <div className="text-sm">
                        {selected.size} test(s) · <strong>{formatCurrency(total)}</strong>
                        <div className="text-xs text-muted-foreground">
                          Payment will be Unpaid until Cashier confirms.
                        </div>
                      </div>
                      <Button onClick={() => void submit()} disabled={submitting || selected.size === 0}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" /> Submit Walk-In Request
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && created && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h3 className="font-semibold text-lg">Request created</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  <span className="font-mono font-medium text-foreground">{created.requestNo}</span> for{' '}
                  {labPatientName(created.person)} · {formatCurrency(created.totalAmount)} ·{' '}
                  <strong>Unpaid</strong>. Direct the patient to Cashier (Pharmacy &amp; Lab Payments → Lab
                  Requests). After payment, it appears on the Lab Request Center.
                </p>
                <div className="flex justify-center gap-2 flex-wrap pt-2">
                  <Button variant="outline" onClick={reset}>
                    New Walk-In
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard/cashier?tab=lab')}>
                    <CreditCard className="h-4 w-4 mr-1" /> Open Cashier (Lab)
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`${base}/requests`)}>
                    Request Center
                  </Button>
                  <Button onClick={() => navigate(`${base}/samples`)}>
                    <ArrowRight className="h-4 w-4 mr-1" /> Sample Collection
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Paid walk-ins (ready for lab)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Only Paid/Waived walk-ins show here — unpaid stay with Cashier.
          </p>
          {queueLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : queueError ? (
            <div className="py-4 space-y-2 text-center">
              <p className="text-sm text-rose-700 flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" /> {queueError}
              </p>
              <Button size="sm" variant="outline" onClick={() => void loadPaidWalkIns()}>
                Retry
              </Button>
            </div>
          ) : paidWalkIns.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No paid walk-ins yet.</div>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto">
              {paidWalkIns.map((r) => (
                <li key={r.labRequestId} className="border rounded-lg p-2 text-xs">
                  <div className="font-mono font-medium">{r.requestNo}</div>
                  <div>{labPatientName(r.person)}</div>
                  <div className="text-muted-foreground">
                    {r.items.map((i) => i.testCode).join(', ')} · {formatCurrency(r.totalAmount)} ·{' '}
                    {r.paymentStatus}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`${base}/requests`)}>
                      Requests
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`${base}/samples`)}>
                      Samples
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => void loadPaidWalkIns()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </Card>
      </div>
    </Shell>
  );
};

export default LabWalkInWorkflow;
