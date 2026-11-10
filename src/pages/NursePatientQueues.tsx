import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DesktopOnlyTable, MobileWorklist, MobileWorklistCard } from '@/components/MobileWorklist';
import { nursingNav } from '@/pages/NursingCenter';
import { ApiError } from '@/lib/api/client';
import {
  getPatientQueueStats,
  isNursingApiEnabled,
  listPatientQueues,
  nursingPersonDisplayName,
  recordQueueVitals,
  sendToDoctor,
  startPatientQueue,
  type PatientQueueRecord,
  type PatientQueueStats,
  type RecordQueueVitalsPayload,
} from '@/lib/api/nursing';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, HeartPulse,
  LayoutList, RefreshCw, Search, Send, Stethoscope, Users, Wallet,
} from 'lucide-react';

const CLINICS = [
  'General OPD',
  'Psychiatric OPC',
  'Psychology',
  'Child & Adolescent',
  'Addiction / Rehab',
  'Psychogeriatrics',
  'Emergency',
  'ICU',
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'In Triage', label: 'In Triage' },
  { value: 'Triage Completed', label: 'Triage Completed' },
  { value: 'Sent to Consultation', label: 'Sent to Doctor' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'Routine', label: 'Routine' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Elderly / Special Needs', label: 'Elderly / Special Needs' },
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All payments' },
  { value: 'Pending', label: 'Unpaid (Pending)' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Waived', label: 'Waived' },
];

const SEED: PatientQueueRecord[] = [
  {
    triageId: 1,
    personId: 101,
    queueNo: 'T-DEMO-0001',
    clinic: 'Psychiatric OPC',
    status: 'Waiting',
    priority: 'Routine',
    priorityReason: null,
    patientType: 'New',
    arrivalAt: new Date().toISOString(),
    weightKg: null,
    heightCm: null,
    bmi: null,
    bloodPressure: null,
    temperatureC: null,
    pulseBpm: null,
    respiratoryRate: null,
    spo2Pct: null,
    notes: 'Anxiety follow-up',
    createdAt: new Date().toISOString(),
    person: {
      personId: 101,
      hospitalNo: 'GFA/HMS/2026/00101',
      firstName: 'Ada',
      lastName: 'Okoro',
      middleName: null,
      sex: 'Female',
      dateOfBirth: '1990-04-12',
      age: 36,
      phone: '08030000001',
      nextOfKinName: null,
      nextOfKinRelationship: null,
      nextOfKinPhone: null,
      bloodGroup: 'O+',
    },
    paymentStatus: 'Paid',
    cardId: 1,
    cardNo: 'CARD-001',
    totalAmount: 3500,
    paymentCleared: true,
    hasVitals: false,
    reasonForVisit: 'Psychiatric OPC · New visit · Anxiety follow-up',
  },
  {
    triageId: 2,
    personId: 102,
    queueNo: 'T-DEMO-0002',
    clinic: 'General OPD',
    status: 'In Triage',
    priority: 'Urgent',
    priorityReason: 'Agitation',
    patientType: 'Returning',
    arrivalAt: new Date().toISOString(),
    weightKg: 70,
    heightCm: 170,
    bmi: 24.2,
    bloodPressure: '128/84',
    temperatureC: 36.9,
    pulseBpm: 88,
    respiratoryRate: 18,
    spo2Pct: 98,
    notes: 'Review meds',
    createdAt: new Date().toISOString(),
    person: {
      personId: 102,
      hospitalNo: 'GFA/HMS/2025/00442',
      firstName: 'Chidi',
      lastName: 'Eze',
      middleName: 'N.',
      sex: 'Male',
      dateOfBirth: '1985-01-20',
      age: 41,
      phone: '08030000002',
      nextOfKinName: null,
      nextOfKinRelationship: null,
      nextOfKinPhone: null,
      bloodGroup: 'A+',
    },
    paymentStatus: 'Pending',
    cardId: 2,
    cardNo: 'CARD-002',
    totalAmount: 3500,
    paymentCleared: false,
    hasVitals: true,
    reasonForVisit: 'General OPD · Returning visit · Urgent · Review meds',
  },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={nursingNav} title={`Nursing · ${title}`}>
    <DbBootGate>{children}</DbBootGate>
  </DashboardLayout>
);

const paymentBadge = (status: string | null, cleared: boolean) => {
  if (cleared && status !== 'Pending') {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
        {status || 'Paid'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
      {status || 'Pending'}
    </span>
  );
};

const statusBadge = (status: string) => {
  const tone =
    status === 'Sent to Consultation'
      ? 'border-teal-200 bg-teal-50 text-teal-800'
      : status === 'In Triage'
        ? 'border-sky-200 bg-sky-50 text-sky-800'
        : status === 'Waiting'
          ? 'border-border bg-muted text-muted-foreground'
          : 'border-border bg-card text-foreground';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${tone}`}>
      {status === 'Sent to Consultation' ? 'Sent to Doctor' : status}
    </span>
  );
};

export const NursePatientQueues = () => {
  const apiOn = isNursingApiEnabled();
  const [rows, setRows] = useState<PatientQueueRecord[]>(apiOn ? [] : SEED);
  const [stats, setStats] = useState<PatientQueueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [clinic, setClinic] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  const [vitalsRow, setVitalsRow] = useState<PatientQueueRecord | null>(null);
  const [sendRow, setSendRow] = useState<PatientQueueRecord | null>(null);
  const [sendClinic, setSendClinic] = useState('General OPD');
  const [sendNotes, setSendNotes] = useState('');
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    temperatureC: '',
    pulseBpm: '',
    respiratoryRate: '',
    spo2Pct: '',
    weightKg: '',
    heightCm: '',
    notes: '',
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!apiOn) {
      setStats({
        asOf: new Date().toISOString(),
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        waiting: SEED.filter((r) => r.status === 'Waiting').length,
        inTriage: SEED.filter((r) => r.status === 'In Triage').length,
        triageCompleted: 0,
        vitalsDone: SEED.filter((r) => r.hasVitals).length,
        sentToDoctor: SEED.filter((r) => r.status === 'Sent to Consultation').length,
        unpaid: SEED.filter((r) => !r.paymentCleared).length,
        paid: SEED.filter((r) => r.paymentCleared).length,
        total: SEED.length,
      });
      return;
    }
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        listPatientQueues({
          status: status === 'all' ? undefined : status,
          priority: priority === 'all' ? undefined : priority,
          clinic: clinic === 'all' ? undefined : clinic,
          paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
          q: q.trim() || undefined,
          limit: 100,
        }),
        getPatientQueueStats(),
      ]);
      setRows(Array.isArray(list?.items) ? list.items : []);
      setStats(s && typeof s.waiting === 'number' ? s : null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load patient queues';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, status, priority, clinic, paymentStatus, q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredLocal = useMemo(() => {
    const source = Array.isArray(rows) ? rows : [];
    if (apiOn) return source;
    return source.filter((r) => {
      const name = nursingPersonDisplayName(r.person).toLowerCase();
      const hn = (r.person?.hospitalNo ?? '').toLowerCase();
      const term = q.trim().toLowerCase();
      return (
        (!term || name.includes(term) || hn.includes(term) || r.queueNo.toLowerCase().includes(term)) &&
        (status === 'all' || r.status === status) &&
        (priority === 'all' || r.priority === priority) &&
        (clinic === 'all' || r.clinic === clinic) &&
        (paymentStatus === 'all' || (r.paymentStatus ?? '') === paymentStatus)
      );
    });
  }, [apiOn, rows, q, status, priority, clinic, paymentStatus]);

  const openVitals = (r: PatientQueueRecord) => {
    setVitalsRow(r);
    setVitals({
      bloodPressure: r.bloodPressure ?? '',
      temperatureC: r.temperatureC != null ? String(r.temperatureC) : '',
      pulseBpm: r.pulseBpm != null ? String(r.pulseBpm) : '',
      respiratoryRate: r.respiratoryRate != null ? String(r.respiratoryRate) : '',
      spo2Pct: r.spo2Pct != null ? String(r.spo2Pct) : '',
      weightKg: r.weightKg != null ? String(r.weightKg) : '',
      heightCm: r.heightCm != null ? String(r.heightCm) : '',
      notes: r.notes ?? '',
    });
  };

  const onStart = async (r: PatientQueueRecord) => {
    setBusyId(`start-${r.triageId}`);
    try {
      if (apiOn) {
        await startPatientQueue(r.triageId);
        await refresh();
      } else {
        setRows((prev) =>
          prev.map((x) => (x.triageId === r.triageId ? { ...x, status: 'In Triage' } : x)),
        );
      }
      toast.success(`Started triage for ${nursingPersonDisplayName(r.person)}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start triage');
    } finally {
      setBusyId(null);
    }
  };

  const onSaveVitals = async () => {
    if (!vitalsRow) return;
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
    const payload: RecordQueueVitalsPayload = {
      bloodPressure: vitals.bloodPressure.trim() || undefined,
      temperatureC: num(vitals.temperatureC),
      pulseBpm: num(vitals.pulseBpm),
      respiratoryRate: num(vitals.respiratoryRate),
      spo2Pct: num(vitals.spo2Pct),
      weightKg: num(vitals.weightKg),
      heightCm: num(vitals.heightCm),
      notes: vitals.notes.trim() || undefined,
    };
    setBusyId(`vitals-${vitalsRow.triageId}`);
    try {
      if (apiOn) {
        await recordQueueVitals(vitalsRow.triageId, payload);
        await refresh();
      } else {
        setRows((prev) =>
          prev.map((x) =>
            x.triageId === vitalsRow.triageId
              ? {
                  ...x,
                  ...payload,
                  temperatureC: payload.temperatureC ?? x.temperatureC,
                  pulseBpm: payload.pulseBpm ?? x.pulseBpm,
                  respiratoryRate: payload.respiratoryRate ?? x.respiratoryRate,
                  spo2Pct: payload.spo2Pct ?? x.spo2Pct,
                  weightKg: payload.weightKg ?? x.weightKg,
                  heightCm: payload.heightCm ?? x.heightCm,
                  bloodPressure: payload.bloodPressure ?? x.bloodPressure,
                  notes: payload.notes ?? x.notes,
                  hasVitals: true,
                  status: x.status === 'Waiting' ? 'In Triage' : x.status,
                }
              : x,
          ),
        );
      }
      toast.success('Vitals recorded');
      setVitalsRow(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save vitals');
    } finally {
      setBusyId(null);
    }
  };

  const onSend = async () => {
    if (!sendRow) return;
    if (!sendRow.paymentCleared) {
      toast.error('Payment still pending — cashier must confirm before sending to doctor');
      return;
    }
    setBusyId(`send-${sendRow.triageId}`);
    try {
      if (apiOn) {
        await sendToDoctor(sendRow.triageId, {
          clinic: sendClinic,
          notes: sendNotes.trim() || undefined,
        });
        await refresh();
      } else {
        setRows((prev) =>
          prev.map((x) =>
            x.triageId === sendRow.triageId
              ? {
                  ...x,
                  status: 'Sent to Consultation',
                  clinic: sendClinic,
                  notes: sendNotes.trim() || x.notes,
                }
              : x,
          ),
        );
      }
      toast.success(`Sent ${nursingPersonDisplayName(sendRow.person)} to doctor`);
      setSendRow(null);
      setSendNotes('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send to doctor');
    } finally {
      setBusyId(null);
    }
  };

  const overview = stats ?? {
    waiting: 0,
    inTriage: 0,
    vitalsDone: 0,
    sentToDoctor: 0,
    unpaid: 0,
    paid: 0,
    total: 0,
  };

  return (
    <Shell title="Patient Queues">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <LayoutList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Patient Queues</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Daily OPD queue from Records triage — check visit reason and payment, collect vitals, and send patients to doctors.
              {!apiOn && ' (Demo data — set VITE_USE_API=true to use the live API.)'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <SummaryCard title="Waiting" value={String(overview.waiting)} icon={Clock} tone="amber" />
        <SummaryCard title="In Triage" value={String(overview.inTriage)} icon={Activity} tone="blue" />
        <SummaryCard title="Vitals Done" value={String(overview.vitalsDone)} icon={HeartPulse} tone="teal" />
        <SummaryCard title="Sent to Doctor" value={String(overview.sentToDoctor)} icon={Stethoscope} tone="green" />
        <SummaryCard title="Unpaid" value={String(overview.unpaid)} subtitle="Pending card payment" icon={Wallet} tone="rose" />
        <SummaryCard title="Paid / Cleared" value={String(overview.paid)} icon={CheckCircle2} tone="indigo" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name / hospital no"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <SearchableSelect
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            placeholder="Status"
          />
          <SearchableSelect
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
            placeholder="Priority"
          />
          <SearchableSelect
            options={[
              { value: 'all', label: 'All clinics' },
              ...CLINICS.map((c) => ({ value: c, label: c })),
            ]}
            value={clinic}
            onChange={setClinic}
            placeholder="Clinic"
          />
          <SearchableSelect
            options={PAYMENT_OPTIONS}
            value={paymentStatus}
            onChange={setPaymentStatus}
            placeholder="Payment"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden p-2 sm:p-0">
        <MobileWorklist className="p-1">
          {filteredLocal.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {loading ? 'Loading queue…' : 'No patients in the queue for these filters.'}
            </div>
          ) : (
            filteredLocal.map((r) => (
              <MobileWorklistCard
                key={r.triageId}
                title={nursingPersonDisplayName(r.person)}
                subtitle={`${r.queueNo} · ${r.person?.hospitalNo ?? '—'}`}
                meta={
                  <div className="space-y-1">
                    <div className="text-xs">{r.clinic ?? '—'} · {r.priority}</div>
                    <div className="text-xs text-muted-foreground">{r.reasonForVisit}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(r.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                }
                status={
                  <div className="flex flex-col items-end gap-1">
                    {paymentBadge(r.paymentStatus, r.paymentCleared)}
                    {statusBadge(r.status)}
                  </div>
                }
                actions={
                  <>
                    {r.status === 'Waiting' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10"
                        disabled={busyId === `start-${r.triageId}`}
                        onClick={() => void onStart(r)}
                      >
                        Start
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-10" onClick={() => openVitals(r)}>
                      Vitals
                    </Button>
                    <Button
                      size="sm"
                      className="h-10"
                      disabled={!r.paymentCleared || r.status === 'Sent to Consultation'}
                      title={!r.paymentCleared ? 'Blocked until cashier confirms card payment' : undefined}
                      onClick={() => {
                        setSendRow(r);
                        setSendClinic(r.clinic || 'General OPD');
                        setSendNotes(r.notes ?? '');
                      }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Doctor
                    </Button>
                  </>
                }
              />
            ))
          )}
        </MobileWorklist>
        <DesktopOnlyTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Reason / Clinic</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  {loading ? 'Loading queue…' : 'No patients in the queue for these filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLocal.map((r) => (
                <TableRow key={r.triageId}>
                  <TableCell className="font-mono text-xs">{r.queueNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{nursingPersonDisplayName(r.person)}</div>
                    <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="text-sm truncate">{r.clinic ?? '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.reasonForVisit}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.priority}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {new Date(r.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>{paymentBadge(r.paymentStatus, r.paymentCleared)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === 'Waiting' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === `start-${r.triageId}`}
                        onClick={() => void onStart(r)}
                      >
                        Start
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openVitals(r)}>
                      Vitals
                    </Button>
                    <Button
                      size="sm"
                      disabled={!r.paymentCleared || r.status === 'Sent to Consultation'}
                      title={
                        !r.paymentCleared
                          ? 'Blocked until cashier confirms card payment'
                          : undefined
                      }
                      onClick={() => {
                        setSendRow(r);
                        setSendClinic(r.clinic || 'General OPD');
                        setSendNotes(r.notes ?? '');
                      }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Doctor
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </DesktopOnlyTable>
      </div>

      {!apiOn && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Linked to Records triage + card payment when API mode is on.
        </p>
      )}

      <Dialog open={!!vitalsRow} onOpenChange={(o) => !o && setVitalsRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Collect vitals</DialogTitle>
            <DialogDescription>
              {vitalsRow
                ? `${nursingPersonDisplayName(vitalsRow.person)} · ${vitalsRow.queueNo}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Blood pressure</Label>
              <Input
                value={vitals.bloodPressure}
                onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                placeholder="120/80"
              />
            </div>
            <div>
              <Label className="text-xs">Temperature (°C)</Label>
              <Input
                type="number"
                value={vitals.temperatureC}
                onChange={(e) => setVitals({ ...vitals, temperatureC: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Pulse (bpm)</Label>
              <Input
                type="number"
                value={vitals.pulseBpm}
                onChange={(e) => setVitals({ ...vitals, pulseBpm: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Respiratory rate</Label>
              <Input
                type="number"
                value={vitals.respiratoryRate}
                onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">SpO₂ (%)</Label>
              <Input
                type="number"
                value={vitals.spo2Pct}
                onChange={(e) => setVitals({ ...vitals, spo2Pct: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number"
                value={vitals.weightKg}
                onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Height (cm)</Label>
              <Input
                type="number"
                value={vitals.heightCm}
                onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={vitals.notes}
                onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
              />
            </div>
          </div>
          {vitalsRow && !vitalsRow.paymentCleared && (
            <p className="text-xs text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Payment is still pending — vitals can be saved; sending to doctor stays blocked until Accounts confirms.
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVitalsRow(null)}>Cancel</Button>
            <LoadingButton
              loading={busyId === `vitals-${vitalsRow?.triageId}`}
              loadingText="Saving…"
              onClick={() => void onSaveVitals()}
            >
              Save vitals
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendRow} onOpenChange={(o) => !o && setSendRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to doctor</DialogTitle>
            <DialogDescription>
              {sendRow
                ? `${nursingPersonDisplayName(sendRow.person)} · ${sendRow.queueNo}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Clinic / destination</Label>
              <SearchableSelect
                options={CLINICS.map((c) => ({ value: c, label: c }))}
                value={sendClinic}
                onChange={setSendClinic}
                placeholder="Select clinic"
              />
            </div>
            <div>
              <Label className="text-xs">Notes for doctor</Label>
              <Textarea
                rows={3}
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendRow(null)}>Cancel</Button>
            <LoadingButton
              loading={busyId === `send-${sendRow?.triageId}`}
              loadingText="Sending…"
              onClick={() => void onSend()}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send to doctor
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

export default NursePatientQueues;
