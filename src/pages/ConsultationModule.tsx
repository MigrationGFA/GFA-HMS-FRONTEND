import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/dummyData';
import { visits as seedVisits, statusTone, type PaymentStatus } from '@/data/billingData';
import { useBillingStore } from '@/contexts/BillingStore';
import { useLabFlow } from '@/contexts/LabFlowStore';
import { resolvePatientForVisit } from '@/lib/patient-display';
import { LoadingButton } from '@/components/LoadingButton';
import { DbBootGate } from '@/components/DbBootGate';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { drugStock, labRequests } from '@/data/hmsData';
import {
  Activity, Stethoscope, Lock, Unlock, ShieldAlert, CreditCard, FlaskConical, Pill,
  ClipboardList, AlertTriangle, CheckCircle2, RefreshCw, FileText, Send, Plus,
  Trash2, History, User, ListChecks, LayoutDashboard, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

const consultNav = [
  { label: 'My Console', path: '/dashboard/doctor', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Queue', path: '/consultation/queue', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Active Consultations', path: '/consultation/active', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Completed Today', path: '/consultation/completed', icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'EMR Sync Queue', path: '/consultation/sync', icon: <RefreshCw className="h-4 w-4" /> },
];

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout title={title} navItems={consultNav as any}><DbBootGate>{children}</DbBootGate></DashboardLayout>
);

const StatusPill = ({ status }: { status: PaymentStatus }) => (
  <span className={statusTone(status)}>{status}</span>
);

// Build queue from live billing store so cashier payments unlock doctor instantly
const buildQueue = (visits: typeof seedVisits) => visits.map((v, i) => ({
  ...v,
  queueNo: `Q-${String(i + 1).padStart(3, '0')}`,
  visitType: v.type === 'Emergency' ? 'Emergency' : v.type === 'OPD' ? (i % 3 === 0 ? 'Follow-up' : 'OPD') : v.type,
  waitMin: 5 + i * 7,
}));

// ============================================================
// 1. PATIENT QUEUE
// ============================================================
export const ConsultationQueue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visits, emergencyOverride } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const queue = useMemo(() => buildQueue(visits), [visits]);
  const [denied, setDenied] = useState<string | null>(null);

  const tryOpen = (visitCode: string, unlocked: boolean) => {
    if (!unlocked) { setDenied(visitCode); return; }
    navigate(`/consultation/visit/${visitCode}`);
  };

  const grouped = {
    waiting: queue.filter(q => q.consultationUnlocked),
    locked: queue.filter(q => !q.consultationUnlocked),
  };

  return (
    <Page title="Doctor Patient Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="In Queue" value={String(queue.length)} icon={ListChecks} subtitle="Today" />
        <SummaryCard title="Eligible (Paid/Emergency)" value={String(grouped.waiting.length)} icon={Unlock} subtitle="Ready to see" />
        <SummaryCard title="Blocked (Unpaid)" value={String(grouped.locked.length)} icon={Lock} subtitle="Sent to billing" />
        <SummaryCard title="Avg Wait" value="18 min" icon={Activity} />
      </div>

      <div className="hms-section p-4 mb-4 bg-gradient-to-r from-sky-50 to-emerald-50">
        <div className="flex items-start gap-3">
          <Stethoscope className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-display font-semibold">HMS-only clinical workspace</h3>
            <p className="text-xs text-muted-foreground mt-1">You work entirely inside HMS. Diagnoses, prescriptions and lab orders sync to EMR automatically in the background.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({queue.length})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({grouped.waiting.length})</TabsTrigger>
          <TabsTrigger value="locked">Locked ({grouped.locked.length})</TabsTrigger>
          <TabsTrigger value="emergency">Emergency ({queue.filter(q => q.triagePriority === 'Emergency').length})</TabsTrigger>
        </TabsList>
        {(['all', 'ready', 'locked', 'emergency'] as const).map(tab => {
          const list = queue.filter(q =>
            tab === 'all' ? true :
            tab === 'ready' ? q.consultationUnlocked :
            tab === 'locked' ? !q.consultationUnlocked :
            q.triagePriority === 'Emergency'
          );
          return (
            <TabsContent key={tab} value={tab}>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.length === 0 && (
                  <div className="col-span-full hms-section p-8 text-center text-sm text-muted-foreground">
                    No patients in this queue category.
                  </div>
                )}
                {list.map(q => (
                  <div key={q.id} className="hms-section p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">{q.queueNo} • {q.visitCode}</p>
                        <h4 className="font-display font-semibold">{q.patientName}</h4>
                        <p className="text-xs text-muted-foreground">{q.hospitalId}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill status={q.paymentStatus} />
                        {q.triagePriority === 'Emergency' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">EMERGENCY</span>}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs border-t pt-3 mb-3">
                      <div className="flex justify-between"><span className="text-muted-foreground">Visit Type:</span><span className="font-medium">{q.visitType}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span>{q.department}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Wait:</span><span>{q.waitMin} min</span></div>
                    </div>
                    {q.consultationUnlocked ? (
                      <Button size="sm" className="w-full" onClick={() => tryOpen(q.visitCode, true)}>
                        <Unlock className="h-3 w-3 mr-1" /> Open Consultation
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="w-full" onClick={() => tryOpen(q.visitCode, false)}>
                        <Lock className="h-3 w-3 mr-1" /> Access Blocked
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!denied} onOpenChange={() => setDenied(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700"><Lock className="h-5 w-5" /> Access Denied</DialogTitle>
            <DialogDescription>This patient has not paid for consultation. Send them to the billing desk, or use Emergency Override (audited).</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-rose-50 ring-1 ring-rose-200 p-3 text-xs text-rose-900">
            Strict rule: <b>No payment = No consultation</b>. Manual unlock is not possible. Override is logged and reviewed by Finance.
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { navigate('/billing/channels'); setDenied(null); }}>
              <CreditCard className="h-4 w-4 mr-1" /> Redirect to Billing
            </Button>
            <LoadingButton variant="destructive" className="w-full sm:w-auto" loading={isBusy('queue-override')} loadingText="Logging override…" onClick={async () => {
              if (!denied) return;
              const doctor = user?.name ? `Dr. ${user.name}` : 'Dr. On-call';
              await run(
                'queue-override',
                `Logging emergency override for ${denied}…`,
                () => {
                  emergencyOverride({ visitCode: denied, doctor, reason: 'Emergency override from consultation queue — immediate clinical need.' });
                  return { ok: true as const };
                },
                () => `Override logged for ${denied}. Opening consultation.`,
              );
              setDenied(null);
              navigate(`/consultation/visit/${denied}`);
            }}>
              <ShieldAlert className="h-4 w-4 mr-1" /> Emergency Override
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

// ============================================================
// 2. CONSULTATION WORKSPACE (3-panel)
// ============================================================
interface RxItem { drug: string; dose: string; duration: string; qty: number; stock?: number; warning?: string }
interface LabItem { test: string; priority: 'Normal' | 'Urgent'; cost: number }

const labCatalog = [
  { test: 'Full Blood Count', cost: 8000 },
  { test: 'Malaria Parasite', cost: 5000 },
  { test: 'Urinalysis', cost: 3000 },
  { test: 'Liver Function Test', cost: 12000 },
  { test: 'Kidney Function Test', cost: 12000 },
  { test: 'HbA1c', cost: 9000 },
  { test: 'Lipid Profile', cost: 11000 },
  { test: 'ECG', cost: 8000 },
  { test: 'Chest X-Ray', cost: 10000 },
];

const interactions: Record<string, string> = {
  'Lisinopril 10mg': 'May interact with NSAIDs (e.g. Diclofenac) — monitor renal function.',
  'Metformin 500mg': 'Caution with contrast dye and renal impairment.',
};

export const ConsultationWorkspace = () => {
  const { visitCode } = useParams<{ visitCode: string }>();
  const navigate = useNavigate();
  const labFlow = useLabFlow();
  const { visits } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const visit = visits.find(v => v.visitCode === visitCode);
  const patient = visit ? resolvePatientForVisit(visit as import('@/data-access/types').Visit) : null;
  const canAccess = !!visit && (visit.consultationUnlocked || !!visit.emergencyOverride);

  // EMR sync state
  const [emrOnline, setEmrOnline] = useState(true);

  // Clinical inputs
  const [chief, setChief] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icd, setIcd] = useState('');

  // Prescriptions & lab
  const [rxList, setRxList] = useState<RxItem[]>([]);
  const [rxForm, setRxForm] = useState({ drug: '', dose: '', duration: '7 days', qty: 1 });
  const [labList, setLabList] = useState<LabItem[]>([]);
  const [labForm, setLabForm] = useState({ test: '', priority: 'Normal' as 'Normal' | 'Urgent' });

  // Live billing
  const baseFee = visit?.consultationFee ?? 0;
  const labCost = labList.reduce((s, l) => s + l.cost, 0);
  const rxCost = rxList.reduce((s, r) => s + (r.qty * 60), 0); // approx avg cost
  const liveTotal = baseFee + labCost + rxCost;

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!visit || !patient) {
    return <Page title="Consultation"><div className="hms-section p-6">Visit not found. <Button variant="link" onClick={() => navigate('/consultation/queue')}>Return to queue</Button></div></Page>;
  }

  if (!canAccess) {
    return (
      <Page title="Consultation — Access Denied">
        <div className="hms-section p-6 max-w-lg">
          <div className="flex items-center gap-2 text-rose-700 font-semibold mb-2"><Lock className="h-5 w-5" /> Payment required</div>
          <p className="text-sm text-muted-foreground mb-4">Consultation for <b>{visit.patientName}</b> ({visit.visitCode}) is locked until payment is confirmed at the billing desk.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/billing/channels')}>Go to Billing</Button>
            <Button variant="link" onClick={() => navigate('/consultation/queue')}>Return to queue</Button>
          </div>
        </div>
      </Page>
    );
  }

  const addRx = async () => {
    if (!rxForm.drug || !rxForm.dose) {
      notify.error('rx-add', 'Drug name and dose are required');
      return;
    }
    await run(
      'rx-add',
      `Adding ${rxForm.drug} to prescription…`,
      () => {
        const stockItem = drugStock.find(d => d.name === rxForm.drug);
        setRxList(prev => [...prev, {
          ...rxForm,
          stock: stockItem?.quantity,
          warning: interactions[rxForm.drug],
        }]);
        setRxForm({ drug: '', dose: '', duration: '7 days', qty: 1 });
        return { ok: true as const };
      },
      () => `${rxForm.drug} added to prescription for ${visit!.patientName}.`,
    );
  };

  const addLab = async () => {
    if (!labForm.test) {
      notify.error('lab-add', 'Select a laboratory test');
      return;
    }
    const cost = labCatalog.find(l => l.test === labForm.test)?.cost ?? 0;
    const catalog = labCatalog.find(l => l.test === labForm.test);
    await run(
      'lab-add',
      `Creating lab order: ${labForm.test}…`,
      () => {
        labFlow.addRequest({
          id: '',
          patientId: (visit as { patientId?: string }).patientId ?? visit!.hospitalId,
          patientName: visit!.patientName,
          age: patient!.age,
          gender: patient!.gender as 'Male' | 'Female',
          hospitalNo: visit!.hospitalId,
          doctor: visit!.attendingDoctor,
          department: visit!.department,
          source: 'Doctor',
          tests: [{ code: catalog?.test.slice(0, 3).toUpperCase() ?? 'TST', name: labForm.test, price: cost }],
          priority: labForm.priority === 'Urgent' ? 'Urgent' : 'Routine',
          clinicalNote: `Ordered during consultation ${visit!.visitCode}`,
        });
        setLabList(prev => [...prev, { ...labForm, cost }]);
        setLabForm({ test: '', priority: 'Normal' });
        return { ok: true as const };
      },
      () => `Lab order for ${labForm.test} sent to Laboratory Request Center.`,
    );
  };

  const completeVisit = async () => {
    if (!chief || !diagnosis) {
      notify.error('complete', 'Chief complaint and diagnosis are required before completing the visit');
      return;
    }
    await run(
      'complete-visit',
      `Completing visit ${visit!.visitCode}…`,
      () => {
        setCompleted(true);
        setCompleteOpen(false);
        return { ok: true as const };
      },
      () => `Visit ${visit!.visitCode} locked.${emrOnline ? ' Synced to EMR.' : ' Queued for EMR sync (offline).'}`,
    );
  };

  return (
    <Page title={`Consultation — ${visit.patientName}`}>
      {/* Top bar with status & access */}
      <div className={`hms-section p-3 mb-4 flex flex-wrap items-center gap-3 ${visit.emergencyOverride ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-emerald-50 ring-1 ring-emerald-200'}`}>
        {visit.emergencyOverride ? (
          <><ShieldAlert className="h-4 w-4 text-amber-700" /><span className="text-sm font-medium text-amber-900">EMERGENCY OVERRIDE — payment bypassed, audited</span></>
        ) : (
          <><Unlock className="h-4 w-4 text-emerald-700" /><span className="text-sm font-medium text-emerald-900">Access granted — payment verified</span></>
        )}
        <span className="text-xs font-mono text-muted-foreground ml-2">{visit.visitCode} • Q-{String(visits.indexOf(visit) + 1).padStart(3, '0')}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEmrOnline(!emrOnline)}>
            {emrOnline ? <><Wifi className="h-3 w-3 mr-1 text-emerald-600" /> EMR Online</> : <><WifiOff className="h-3 w-3 mr-1 text-rose-600" /> EMR Offline</>}
          </Button>
          {completed
            ? <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">Visit Locked</span>
            : <Button size="sm" onClick={() => setCompleteOpen(true)}><CheckCircle2 className="h-3 w-3 mr-1" /> Complete Visit</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* LEFT — Patient summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hms-section p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-white grid place-items-center font-bold">
                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="font-display font-semibold">{patient.name}</h3>
                <p className="text-xs text-muted-foreground">{patient.age}y • {patient.gender}</p>
              </div>
            </div>
            <div className="space-y-1 text-xs border-t pt-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Hospital ID:</span><span className="font-mono">{patient.hospitalId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span>{patient.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Blood Group:</span><span className="font-medium">{patient.bloodGroup}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Insurance:</span><StatusBadge status={patient.insurance === 'None' ? 'Pending' : 'Active'} /></div>
            </div>
          </div>

          <div className="hms-section p-4">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-600" /> Allergies</h4>
            <p className={`text-sm ${patient.allergies === 'None' ? 'text-muted-foreground' : 'text-rose-700 font-medium'}`}>{patient.allergies}</p>
          </div>

          <div className="hms-section p-4">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><History className="h-4 w-4 text-sky-600" /> Recent Visits (EMR)</h4>
            <div className="space-y-2 text-xs">
              <div className="border-l-2 border-sky-300 pl-2">
                <p className="font-medium">2026-02-14 • Internal Medicine</p>
                <p className="text-muted-foreground">Hypertension review — BP 150/90, continued Lisinopril.</p>
              </div>
              <div className="border-l-2 border-sky-300 pl-2">
                <p className="font-medium">2025-11-08 • General OPD</p>
                <p className="text-muted-foreground">Acute malaria — treated with Coartem, recovered.</p>
              </div>
              <div className="border-l-2 border-sky-300 pl-2">
                <p className="font-medium">2025-07-22 • Laboratory</p>
                <p className="text-muted-foreground">FBC normal, HbA1c 5.6%.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — Workspace */}
        <div className="lg:col-span-6 space-y-4">
          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Clinical Notes</h3>
            <div className="grid gap-3">
              <div><Label>Chief Complaint *</Label><Input disabled={completed} value={chief} onChange={e => setChief(e.target.value)} placeholder="e.g. Fever and headache for 3 days" /></div>
              <div><Label>Symptoms / History</Label><Textarea disabled={completed} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Onset, duration, associated symptoms…" rows={2} /></div>
              <div><Label>Examination & Notes</Label><Textarea disabled={completed} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Vitals, examination findings, plan…" rows={3} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label>Diagnosis *</Label><Input disabled={completed} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Uncomplicated falciparum malaria" /></div>
                <div><Label>ICD-10</Label>
                  <Select disabled={completed} value={icd} onValueChange={setIcd}>
                    <SelectTrigger><SelectValue placeholder="Code" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B54">B54 — Malaria</SelectItem>
                      <SelectItem value="I10">I10 — Hypertension</SelectItem>
                      <SelectItem value="E11">E11 — Type 2 DM</SelectItem>
                      <SelectItem value="J18">J18 — Pneumonia</SelectItem>
                      <SelectItem value="K35">K35 — Acute appendicitis</SelectItem>
                      <SelectItem value="O80">O80 — Normal delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Pill className="h-4 w-4 text-emerald-600" /> Prescriptions <span className="text-xs text-muted-foreground font-normal">(stock-checked, sent to pharmacy)</span></h3>
            <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2 mb-3">
              <div className="sm:col-span-5">
                <Select disabled={completed} value={rxForm.drug} onValueChange={v => setRxForm({ ...rxForm, drug: v })}>
                  <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
                  <SelectContent>
                    {drugStock.map(d => (
                      <SelectItem key={d.id} value={d.name} disabled={d.status === 'Out of Stock'}>
                        {d.name} <span className="text-xs text-muted-foreground">({d.status === 'Out of Stock' ? 'Out' : `${d.quantity} ${d.unit}s`})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input disabled={completed} className="sm:col-span-3" value={rxForm.dose} onChange={e => setRxForm({ ...rxForm, dose: e.target.value })} placeholder="Dose e.g. 1 tab BD" />
              <Input disabled={completed} className="sm:col-span-2" value={rxForm.duration} onChange={e => setRxForm({ ...rxForm, duration: e.target.value })} placeholder="Duration" />
              <Input disabled={completed} className="sm:col-span-1" type="number" value={rxForm.qty} onChange={e => setRxForm({ ...rxForm, qty: Number(e.target.value) })} />
              <LoadingButton disabled={completed} className="sm:col-span-1 w-full sm:w-auto" size="icon" loading={isBusy('rx-add')} onClick={addRx}><Plus className="h-4 w-4" /></LoadingButton>
            </div>
            {rxList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No prescriptions yet</p>
            ) : (
              <div className="space-y-2">
                {rxList.map((r, idx) => (
                  <div key={idx} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.drug}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Stock: {r.stock ?? '—'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.dose} • {r.duration} • Qty: {r.qty}</p>
                        {r.warning && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-amber-700">
                            <AlertTriangle className="h-3 w-3 mt-0.5" /> {r.warning}
                          </div>
                        )}
                      </div>
                      <Button disabled={completed} size="icon" variant="ghost" onClick={() => setRxList(rxList.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lab orders */}
          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-sky-600" /> Lab Orders <span className="text-xs text-muted-foreground font-normal">(auto-billed, sent to lab)</span></h3>
            <div className="grid grid-cols-12 gap-2 mb-3">
              <div className="col-span-7">
                <Select disabled={completed} value={labForm.test} onValueChange={v => setLabForm({ ...labForm, test: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lab test" /></SelectTrigger>
                  <SelectContent>
                    {labCatalog.map(l => <SelectItem key={l.test} value={l.test}>{l.test} — {formatCurrency(l.cost)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Select disabled={completed} value={labForm.priority} onValueChange={(v: any) => setLabForm({ ...labForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Urgent">Urgent (Stat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <LoadingButton disabled={completed} className="col-span-1" size="icon" loading={isBusy('lab-add')} onClick={addLab}><Plus className="h-4 w-4" /></LoadingButton>
            </div>
            {labList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No lab orders yet</p>
            ) : (
              <div className="space-y-2">
                {labList.map((l, idx) => (
                  <div key={idx} className="rounded-lg border p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium">{l.test}</span>
                      <span className="ml-2 text-xs"><StatusBadge status={l.priority === 'Urgent' ? 'Warning' : 'Info'} /></span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(l.cost)}</span>
                    </div>
                    <Button disabled={completed} size="icon" variant="ghost" onClick={() => setLabList(labList.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Live status */}
        <div className="lg:col-span-3 space-y-4">
          <div className="hms-section p-4 bg-gradient-to-br from-emerald-50 to-sky-50">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><CreditCard className="h-4 w-4 text-emerald-700" /> Live Billing</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Consultation:</span><span>{formatCurrency(baseFee)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Lab orders ({labList.length}):</span><span>{formatCurrency(labCost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pharmacy ({rxList.length}):</span><span>{formatCurrency(rxCost)}</span></div>
              <div className="flex justify-between border-t pt-1 mt-1 font-bold text-sm"><span>Visit Total:</span><span className="text-foreground">{formatCurrency(liveTotal)}</span></div>
            </div>
            {liveTotal > baseFee && !completed && (
              <div className="mt-2 text-[10px] text-amber-700 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5" /> Additional charges added — patient will receive payment request.
              </div>
            )}
          </div>

          <div className="hms-section p-4">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><FlaskConical className="h-4 w-4 text-sky-600" /> Lab Status</h4>
            <div className="space-y-2 text-xs">
              {labList.length === 0 ? <p className="text-muted-foreground">No orders</p> :
                labList.map((l, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="truncate">{l.test}</span>
                    <StatusBadge status="Pending" />
                  </div>
                ))}
            </div>
          </div>

          <div className="hms-section p-4">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><Pill className="h-4 w-4 text-emerald-600" /> Pharmacy Status</h4>
            <div className="space-y-2 text-xs">
              {rxList.length === 0 ? <p className="text-muted-foreground">No prescriptions</p> :
                rxList.map((r, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="truncate">{r.drug}</span>
                    <StatusBadge status={(r.stock ?? 0) >= r.qty ? 'Pending' : 'Low'} />
                  </div>
                ))}
            </div>
          </div>

          <div className="hms-section p-4">
            <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><Activity className="h-4 w-4 text-primary" /> Visit Progress</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Patient checked in</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payment {visit.emergencyOverride ? 'overridden' : 'verified'}</div>
              <div className="flex items-center gap-2">{chief ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <div className="h-3 w-3 rounded-full border" />} Chief complaint</div>
              <div className="flex items-center gap-2">{diagnosis ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <div className="h-3 w-3 rounded-full border" />} Diagnosis</div>
              <div className="flex items-center gap-2">{completed ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <div className="h-3 w-3 rounded-full border" />} Visit completed</div>
              <div className="flex items-center gap-2">{completed ? (emrOnline ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <RefreshCw className="h-3 w-3 text-amber-600" />) : <div className="h-3 w-3 rounded-full border" />} EMR sync {completed && !emrOnline && '(pending)'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Visit */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete & Lock Visit</DialogTitle>
            <DialogDescription>The consultation record will be locked. Billing will be finalised and the visit summary will sync to EMR.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Patient:</span><span className="font-medium">{visit.patientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Diagnosis:</span><span className="font-medium">{diagnosis || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prescriptions:</span><span>{rxList.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lab Orders:</span><span>{labList.length}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1 font-bold"><span>Final Bill:</span><span>{formatCurrency(liveTotal)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">EMR Sync:</span><span className={emrOnline ? 'text-emerald-700' : 'text-amber-700'}>{emrOnline ? 'Will sync now' : 'Queued (offline)'}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Continue Editing</Button>
            <LoadingButton loading={isBusy('complete-visit')} loadingText="Completing…" onClick={completeVisit}><CheckCircle2 className="h-4 w-4 mr-1" /> Lock & Complete</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

// ============================================================
// 3. ACTIVE & COMPLETED & SYNC PAGES
// ============================================================
export const ActiveConsultations = () => {
  const navigate = useNavigate();
  const { visits } = useBillingStore();
  const list = visits.filter(v => v.consultationUnlocked);
  return (
    <Page title="Active Consultations">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="col-span-full hms-section p-8 text-center text-sm text-muted-foreground">
            No active consultations. Paid visits appear here from the patient queue.
          </div>
        )}
        {list.map(v => (
          <div key={v.id} className="hms-section p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-mono text-muted-foreground">{v.visitCode}</p>
                <h4 className="font-display font-semibold">{v.patientName}</h4>
                <p className="text-xs text-muted-foreground">{v.attendingDoctor} • {v.department}</p>
              </div>
              <StatusPill status={v.paymentStatus} />
            </div>
            <Button size="sm" className="w-full mt-2" onClick={() => navigate(`/consultation/visit/${v.visitCode}`)}>
              <Stethoscope className="h-3 w-3 mr-1" /> Resume
            </Button>
          </div>
        ))}
      </div>
    </Page>
  );
};

export const CompletedConsultations = () => {
  const completed = labRequests.slice(0, 4); // demo completed visits using lab data
  return (
    <Page title="Completed Consultations Today">
      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-3">Visit</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Diagnosis</th><th className="text-left p-3">Locked</th><th className="text-left p-3">EMR Sync</th></tr>
          </thead>
          <tbody>
            {completed.map((c, i) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono text-xs">VST-30{String(i + 10).padStart(3, '0')}</td>
                <td className="p-3 font-medium">{c.patientName}</td>
                <td className="p-3 text-xs">{['Uncomplicated malaria', 'Hypertension review', 'UTI — empirical Rx', 'Pneumonia (mild)'][i]}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Locked</span></td>
                <td className="p-3"><StatusBadge status="Synced" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

export const ConsultationSyncQueue = () => {
  const items = [
    { id: 'SYN-CON-001', visit: 'VST-30025', module: 'Diagnosis + Rx', status: 'Synced', attempts: 1 },
    { id: 'SYN-CON-002', visit: 'VST-30027', module: 'Lab order', status: 'Pending', attempts: 0 },
    { id: 'SYN-CON-003', visit: 'VST-30029', module: 'Visit summary (override)', status: 'Retrying', attempts: 2 },
    { id: 'SYN-CON-004', visit: 'VST-30032', module: 'Diagnosis', status: 'Failed', attempts: 3 },
  ];
  return (
    <Page title="EMR Sync Queue">
      <div className="hms-section p-4 mb-4 bg-sky-50 ring-1 ring-sky-200">
        <p className="text-xs text-sky-900"><b>EMR is passive storage.</b> HMS is the source of truth. All clinical actions sync in the background; if EMR is down, records are kept locally and auto-retried.</p>
      </div>
      <div className="hms-section overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-3">Sync ID</th><th className="text-left p-3">Visit</th><th className="text-left p-3">Payload</th><th className="text-left p-3">Attempts</th><th className="text-left p-3">Status</th><th className="text-left p-3">Action</th></tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="p-3 font-mono text-xs">{i.id}</td>
                <td className="p-3 font-mono text-xs">{i.visit}</td>
                <td className="p-3">{i.module}</td>
                <td className="p-3 text-xs">{i.attempts}</td>
                <td className="p-3"><StatusBadge status={i.status} /></td>
                <td className="p-3">{(i.status === 'Failed' || i.status === 'Retrying') && <Button size="sm" variant="outline" onClick={() => toast.success('Manual retry queued')}><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};
