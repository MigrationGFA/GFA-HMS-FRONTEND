import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { ApiError } from '@/lib/api/client';
import {
  ackEmergencyAlert,
  clearDoctorEmergencyMockStorage,
  createEmergencySession,
  endEmergencySession,
  fetchEmergencyBoard,
  isEmergencyOverrideApiEnabled,
  listEmergencyAdmissions,
  listEmergencyAlerts,
  listEmergencyMedications,
  listEmergencyReferrals,
  listEmergencySessions,
  type EmergencyAlert,
  type EmergencyBoardPatient,
  type EmergencyKpis,
  type EmergencySession,
} from '@/lib/api/emergencyOverride';
import { searchPersons, type PersonRecord } from '@/lib/api/patients';
import {
  Siren, RefreshCw, Loader2, ShieldAlert, Bell, BedDouble, CheckCircle2,
  Plus, Download, MessageSquare, Pill, Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PENDING_ADMISSION = 'Emergency admission creation requires admission-requests module integration from this board.';
const PENDING_REFERRAL = 'Emergency referral creation requires clinical referrals module integration.';
const PENDING_PRESCRIBE = 'Stat prescribing from emergency override requires pharmacy prescription integration.';
const PENDING_MESSAGE = 'Ward messaging requires clinical communications integration.';
const PENDING_EXPORT = 'Emergency board export requires reporting service integration.';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Emergency Override">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const REASONS = [
  'Patient unconscious',
  'Life-threatening emergency',
  'Code Blue',
  'Trauma',
  'Psychiatric emergency',
  'Drug overdose',
  'Severe bleeding',
  'Emergency surgery',
  'Unknown identity patient',
  'Other',
];

function emptyKpis(): EmergencyKpis {
  return {
    emergencyPatients: 0,
    overrideRequests: 0,
    criticalAlerts: 0,
    activeSessions: 0,
    expiredSessions: 0,
    emergencyAdmissions: 0,
  };
}

function personLabel(p: PersonRecord): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `#${p.personId}`;
}

export const DocEmergency = () => {
  const apiOn = isEmergencyOverrideApiEnabled();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<EmergencyKpis>(emptyKpis);
  const [patients, setPatients] = useState<EmergencyBoardPatient[]>([]);
  const [sessions, setSessions] = useState<EmergencySession[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [admissions, setAdmissions] = useState<Awaited<ReturnType<typeof listEmergencyAdmissions>>>([]);
  const [referrals, setReferrals] = useState<Awaited<ReturnType<typeof listEmergencyReferrals>>>([]);
  const [meds, setMeds] = useState<Awaited<ReturnType<typeof listEmergencyMedications>>>([]);

  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<PersonRecord[]>([]);
  const [personId, setPersonId] = useState<number | null>(null);
  const [personName, setPersonName] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [justification, setJustification] = useState('');
  const [severity, setSeverity] = useState('3');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setKpis(emptyKpis());
      setLoading(false);
      return;
    }
    clearDoctorEmergencyMockStorage();
    setLoading(true);
    setError(null);
    try {
      const [board, sess, al, adm, ref, medication] = await Promise.all([
        fetchEmergencyBoard(),
        listEmergencySessions({ limit: 100 }),
        listEmergencyAlerts(100),
        listEmergencyAdmissions(),
        listEmergencyReferrals(),
        listEmergencyMedications(),
      ]);
      setKpis(board.kpis);
      setPatients(board.patients ?? []);
      setSessions(sess);
      setAlerts(al);
      setAdmissions(adm);
      setReferrals(ref);
      setMeds(medication);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load emergency board';
      setError(msg);
      setKpis(emptyKpis());
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const hits = await searchPersons(searchQ.trim());
      setSearchHits(hits);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const startOverride = async () => {
    if (!personId) {
      toast.error('Select a patient');
      return;
    }
    if (justification.trim().length < 5) {
      toast.error('Provide a clinical justification');
      return;
    }
    setBusy(true);
    try {
      await createEmergencySession({
        personId,
        reason,
        justification: justification.trim(),
        severity: Number(severity) || 3,
        durationMinutes: Number(duration) || 60,
        location: location.trim() || undefined,
      });
      toast.success('Override session started');
      setJustification('');
      setTab('dashboard');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start override');
    } finally {
      setBusy(false);
    }
  };

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'Active'),
    [sessions],
  );

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-2">
              <Siren className="h-5 w-5 text-rose-600" />
              Emergency Override
            </h1>
            <p className="text-sm text-muted-foreground">
              Break-glass access sessions and critical alerts from the live database.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <PendingAction label="Export" reason={PENDING_EXPORT} icon={Download} />
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
        ) : null}

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <SummaryCard title="Emergency Patients" value={String(kpis.emergencyPatients)} icon={Siren} />
          <SummaryCard title="Override Requests" value={String(kpis.overrideRequests)} icon={ShieldAlert} />
          <SummaryCard title="Critical Alerts" value={String(kpis.criticalAlerts)} icon={Bell} />
          <SummaryCard title="Active Sessions" value={String(kpis.activeSessions)} icon={CheckCircle2} />
          <SummaryCard title="Expired Sessions" value={String(kpis.expiredSessions)} icon={ShieldAlert} />
          <SummaryCard title="Emergency Admissions" value={String(kpis.emergencyAdmissions)} icon={BedDouble} />
        </div>

        <Card>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-3 flex h-auto flex-wrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="override">Override</TabsTrigger>
              <TabsTrigger value="active">Active patients</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="admissions">Admissions</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="medication">Medication</TabsTrigger>
              <TabsTrigger value="audit">Sessions</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="dashboard" className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground flex-1 min-w-[12rem]">
                      {activeSessions.length} active override session(s) · {alerts.filter((a) => !a.acknowledged).length} open alert(s)
                    </p>
                    <PendingAction label="Message team" reason={PENDING_MESSAGE} icon={MessageSquare} />
                  </div>
                  {patients.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No inpatient / emergency board patients yet.</p>
                  ) : (
                    <SimpleTable
                      headers={['Patient', 'Ward', 'Bed', 'Status']}
                      rows={patients.map((p) => [
                        p.patientName,
                        p.ward ?? '—',
                        p.bed ?? '—',
                        p.status,
                      ])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="override" className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label>Find patient</Label>
                    <div className="flex gap-2">
                      <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Name or hospital no" />
                      <Button type="button" variant="outline" onClick={() => void runSearch()}>Search</Button>
                    </div>
                    {searchHits.length > 0 ? (
                      <div className="rounded-md border divide-y">
                        {searchHits.map((p) => (
                          <button
                            key={p.personId}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
                            onClick={() => {
                              setPersonId(p.personId);
                              setPersonName(personLabel(p));
                              setSearchHits([]);
                            }}
                          >
                            <span>{personLabel(p)}</span>
                            <span className="text-muted-foreground">{p.hospitalNo ?? `#${p.personId}`}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {personId ? (
                      <p className="text-sm">Selected: <strong>{personName}</strong> (#{personId})</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Severity (1–5)</Label>
                      <Input value={severity} onChange={(e) => setSeverity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Resus Bay 2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Justification</Label>
                    <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={4} />
                  </div>
                  <Button onClick={() => void startOverride()} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Start override
                  </Button>
                </TabsContent>

                <TabsContent value="active">
                  {patients.length === 0 ? (
                    <Empty />
                  ) : (
                    <SimpleTable
                      headers={['Patient', 'Hospital No', 'Ward', 'Status']}
                      rows={patients.map((p) => [p.patientName, p.hospitalNo ?? '—', p.ward ?? '—', p.status])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="space-y-2">
                  {alerts.length === 0 ? (
                    <Empty />
                  ) : (
                    alerts.map((a) => (
                      <div key={a.alertId} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{a.type} · {a.severity}</p>
                          <p className="text-sm text-muted-foreground">{a.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {a.patientName ?? '—'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                          </p>
                        </div>
                        {!a.acknowledged ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void ackEmergencyAlert(a.alertId)
                                .then(() => load())
                                .catch((err) => toast.error(err instanceof Error ? err.message : 'Ack failed'));
                            }}
                          >
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-700">Acknowledged</span>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="admissions" className="space-y-3">
                  <PendingAction label="New admission from emergency" reason={PENDING_ADMISSION} icon={Plus} />
                  {admissions.length === 0 ? (
                    <Empty />
                  ) : (
                    <SimpleTable
                      headers={['Patient', 'Ward', 'Status', 'Admitted']}
                      rows={admissions.map((a) => [
                        a.patientName,
                        a.ward ?? '—',
                        a.status,
                        a.admittedAt ? new Date(a.admittedAt).toLocaleString() : '—',
                      ])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="referrals" className="space-y-3">
                  <PendingAction label="New emergency referral" reason={PENDING_REFERRAL} icon={Send} />
                  {referrals.length === 0 ? (
                    <Empty />
                  ) : (
                    <SimpleTable
                      headers={['Patient', 'Destination', 'Priority', 'Status']}
                      rows={referrals.map((r) => [r.patientName, r.destination, r.priority, r.status])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="medication" className="space-y-3">
                  <PendingAction label="Prescribe stat medication" reason={PENDING_PRESCRIBE} icon={Pill} />
                  {meds.length === 0 ? (
                    <Empty />
                  ) : (
                    <SimpleTable
                      headers={['Patient', 'Drug', 'Dose', 'Status']}
                      rows={meds.map((m) => [m.patientName, m.drug, m.dose ?? '—', m.status])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="audit" className="space-y-2">
                  {sessions.length === 0 ? (
                    <Empty />
                  ) : (
                    sessions.map((s) => (
                      <div key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{s.overrideNo} · {s.patientName}</p>
                          <p className="text-sm text-muted-foreground">{s.reason} · {s.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.startedAt).toLocaleString()} · {s.createdBy ?? '—'}
                          </p>
                        </div>
                        {s.status === 'Active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void endEmergencySession(s.sessionId)
                                .then(() => {
                                  toast.success('Session ended');
                                  return load();
                                })
                                .catch((err) => toast.error(err instanceof Error ? err.message : 'End failed'));
                            }}
                          >
                            End
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>
      </div>
    </Shell>
  );
};

function PendingAction({
  label,
  reason,
  icon: Icon,
}: {
  label: string;
  reason: string;
  icon: LucideIcon;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled title={reason}>
        <Icon className="h-4 w-4" />
        {label}
      </Button>
      <PendingIntegrationBanner compact reason={reason} />
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No records yet.</p>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="p-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              {row.map((cell, j) => (
                <td key={j} className="p-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DocEmergency;
