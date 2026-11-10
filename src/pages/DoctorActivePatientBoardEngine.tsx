import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalPageShell } from '@/components/doctor/ClinicalEmbeddedFrame';
import { setDocPatientContext } from '@/utils/docClinicalPatientContext';
import { ApiError } from '@/lib/api/client';
import {
  getAdmissionStats,
  isAdmissionsApiEnabled,
  listAdmissions,
  listWards,
  type AdmissionRecord,
  type AdmissionStats,
  type WardRecord,
} from '@/lib/api/admissions';
import {
  isEncountersApiEnabled,
  listActiveEncounters,
  listConsultationQueue,
  type ConsultationQueueItem,
  type EncounterRecord,
} from '@/lib/api/encounters';
import { clearDoctorDischargeMockStorage } from '@/lib/api/discharge';
import { Activity, BedDouble, Loader2, RefreshCw, Stethoscope, Users } from 'lucide-react';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const WATCHLIST_KEY = 'gfa_doc_board_watchlist_v1';

function admissionName(a: AdmissionRecord): string {
  const p = a.person;
  if (!p) return `Person #${a.personId}`;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `#${a.personId}`;
}

export const DocActive = () => {
  const navigate = useNavigate();
  const apiOn = isAdmissionsApiEnabled() || isEncountersApiEnabled();
  const [tab, setTab] = useState<'inpatient' | 'opd' | 'queue' | 'watchlist'>('inpatient');
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [activeEncounters, setActiveEncounters] = useState<EncounterRecord[]>([]);
  const [queue, setQueue] = useState<ConsultationQueueItem[]>([]);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [wardId, setWardId] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (apiOn) clearDoctorDischargeMockStorage();
  }, [apiOn]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      /* ignore */
    }
  }, [watchlist]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [adm, enc, qRes, w, s] = await Promise.all([
        listAdmissions({
          status: 'ADMITTED,ON_LEAVE,DISCHARGE_ORDERED,BED_ALLOCATED',
          wardId: wardId ? Number(wardId) : undefined,
          q: q.trim() || undefined,
          limit: 100,
        }),
        listActiveEncounters({ limit: 100 }).catch(() => ({ items: [] as EncounterRecord[] })),
        listConsultationQueue({ limit: 100 }).catch(() => ({ items: [] as ConsultationQueueItem[] })),
        listWards({ status: 'Active' }).catch(() => [] as WardRecord[]),
        getAdmissionStats().catch(() => null),
      ]);
      setAdmissions(adm.items ?? []);
      setActiveEncounters(enc.items ?? []);
      setQueue(qRes.items ?? []);
      setWards(w);
      setStats(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [apiOn, wardId, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const watchedAdmissions = useMemo(
    () => admissions.filter((a) => watchlist.includes(a.personId)),
    [admissions, watchlist],
  );

  const openPatient = (personId: number, name: string, hospitalId: string, path: string) => {
    setDocPatientContext({ id: String(personId), name, hospitalId });
    navigate(path);
  };

  const toggleWatch = (personId: number) => {
    setWatchlist((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId],
    );
  };

  const body = (
    <div className="space-y-4">
      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">Backend API is not configured.</div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Active inpatients" value={String(stats?.active ?? admissions.length)} icon={BedDouble} />
        <SummaryCard title="Discharge ordered" value={String(stats?.dischargeOrdered ?? 0)} icon={Activity} />
        <SummaryCard title="Active consults" value={String(activeEncounters.length)} icon={Stethoscope} />
        <SummaryCard title="Consult queue" value={String(queue.length)} icon={Users} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search patients…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={wardId || '__all'} onValueChange={(v) => setWardId(v === '__all' ? '' : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All wards" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All wards</SelectItem>
            {wards.map((w) => (
              <SelectItem key={w.wardId} value={String(w.wardId)}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="inpatient">Inpatient</TabsTrigger>
          <TabsTrigger value="opd">Active OPD</TabsTrigger>
          <TabsTrigger value="queue">Consult queue</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="inpatient" className="mt-4">
          {loading ? (
            <Card className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</Card>
          ) : admissions.length === 0 ? (
            <Card className="text-sm text-muted-foreground">No active admissions.</Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Ward / Bed</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.admissionId} className="border-t">
                      <td className="p-3 font-medium">{admissionName(a)}</td>
                      <td className="p-3">{a.ward?.name ?? '—'} / {a.bed?.label ?? '—'}</td>
                      <td className="p-3">{a.status}</td>
                      <td className="p-3 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => openPatient(a.personId, admissionName(a), a.person?.hospitalNo || '', '/dashboard/doctor/clinical/workspace')}>
                          Open
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleWatch(a.personId)}>
                          {watchlist.includes(a.personId) ? 'Unwatch' : 'Watch'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openPatient(a.personId, admissionName(a), a.person?.hospitalNo || '', '/dashboard/doctor/clinical/discharge')}>
                          Discharge
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opd" className="mt-4">
          <Card className="space-y-2">
            {activeEncounters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active consultations.</p>
            ) : activeEncounters.map((e) => (
              <button
                key={e.encounterId}
                type="button"
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/40"
                onClick={() => {
                  openPatient(
                    e.personId,
                    e.patient?.name || `#${e.personId}`,
                    e.patient?.mrn || '',
                    '/dashboard/doctor/clinical/workspace',
                  );
                  toast.success('Opened workspace');
                }}
              >
                <p className="text-sm font-medium">{e.patient?.name || `Encounter #${e.encounterId}`}</p>
                <p className="text-xs text-muted-foreground">{e.status} · {e.patient?.clinic || '—'}</p>
              </button>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card className="space-y-2">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Consult queue is empty.</p>
            ) : queue.map((item) => (
              <div key={item.triageId} className="rounded-lg border px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.clinic} · {item.priority} · wait {item.wait}</p>
                </div>
                <Button size="sm" onClick={() => openPatient(item.personId, item.name, item.mrn, '/dashboard/doctor/clinical/workspace')}>
                  Start
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="watchlist" className="mt-4">
          <Card className="space-y-2">
            {watchedAdmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No watched inpatients (personal list in this browser).</p>
            ) : watchedAdmissions.map((a) => (
              <p key={a.admissionId} className="text-sm">{admissionName(a)} · {a.ward?.name}</p>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <ClinicalPageShell
      shellTitle="Doctor Clinical · Active Patient Board"
      flowTitle="Active Patient Board"
      flowSubtitle="Live inpatients, OPD consults, and triage queue"
    >
      {body}
    </ClinicalPageShell>
  );
};

export default DocActive;
