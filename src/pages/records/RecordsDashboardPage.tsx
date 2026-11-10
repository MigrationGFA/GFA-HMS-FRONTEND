import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { recordsNav } from '@/pages/recordsNav';
import { ApiError } from '@/lib/api/client';
import {
  emptyRecordsOverviewKpis,
  emptyRecordsOverviewTasks,
  fetchRecordsOverview,
  isRecordsApiEnabled,
  type RecordsOverviewActivity,
  type RecordsOverviewAlert,
  type RecordsOverviewArrival,
  type RecordsOverviewKpis,
  type RecordsOverviewPendingTasks,
} from '@/lib/api/records';
import {
  Activity, AlertTriangle, Archive, ClipboardList, FileCheck, FolderOpen, Loader2,
  LogIn, Pause, RefreshCw, Send, Stethoscope, UserPlus, Users,
} from 'lucide-react';
import { InpatientRegisterCard } from '@/components/inpatient/InpatientDemoPanels';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const alertClass = (type: RecordsOverviewAlert['type']) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'danger':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    default:
      return 'bg-sky-50 text-sky-800 border-sky-200';
  }
};

export const RecordsOverview = () => {
  const apiOn = isRecordsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [kpis, setKpis] = useState<RecordsOverviewKpis>(emptyRecordsOverviewKpis);
  const [tasks, setTasks] = useState<RecordsOverviewPendingTasks>(emptyRecordsOverviewTasks);
  const [activity, setActivity] = useState<RecordsOverviewActivity[]>([]);
  const [arrivals, setArrivals] = useState<RecordsOverviewArrival[]>([]);
  const [alerts, setAlerts] = useState<RecordsOverviewAlert[]>([]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setKpis(emptyRecordsOverviewKpis());
      setTasks(emptyRecordsOverviewTasks());
      setActivity([]);
      setArrivals([]);
      setAlerts([]);
      setAsOf(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecordsOverview({
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        recentLimit: 8,
      });
      setAsOf(data.asOf);
      setKpis(data.kpis ?? emptyRecordsOverviewKpis());
      setTasks(data.pendingTasks ?? emptyRecordsOverviewTasks());
      setActivity(data.recentActivity ?? []);
      setArrivals(data.recentArrivals ?? []);
      setAlerts(data.alerts ?? []);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load Records dashboard';
      setError(msg);
      setKpis(emptyRecordsOverviewKpis());
      setTasks(emptyRecordsOverviewTasks());
      setActivity([]);
      setArrivals([]);
      setAlerts([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiValue = (n: number) => (loading && !error ? '…' : String(n));

  return (
    <DashboardLayout title="Records Officer Overview" navItems={recordsNav}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Live Health Records operations
          {asOf ? ` · as of ${new Date(asOf).toLocaleTimeString()}` : ''}
          {loading ? ' · loading…' : ''}
        </p>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Could not load dashboard</div>
            <div className="text-rose-700/90">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Total Patients Today" value={kpiValue(kpis.totalToday)} icon={Users} />
        <SummaryCard title="New Patients Today" value={kpiValue(kpis.newToday)} icon={UserPlus} />
        <SummaryCard title="Returning Patients" value={kpiValue(kpis.returningToday)} icon={RefreshCw} />
        <SummaryCard title="Walk-In Patients" value={kpiValue(kpis.walkInToday)} icon={LogIn} />
        <SummaryCard title="Emergency Patients" value={kpiValue(kpis.emergencyToday)} icon={AlertTriangle} />
        <SummaryCard title="Pending Registrations" value={kpiValue(kpis.pendingRegistration)} icon={Pause} />
        <SummaryCard title="Awaiting Triage" value={kpiValue(kpis.awaitingTriage)} icon={Activity} />
        <SummaryCard title="Awaiting Consultation" value={kpiValue(kpis.awaitingConsultation)} icon={Stethoscope} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Directory Total" value={kpiValue(kpis.totalPatients)} icon={Users} />
        <SummaryCard title="Incomplete Profiles" value={kpiValue(kpis.incompleteProfiles)} icon={ClipboardList} />
        <SummaryCard title="Duplicates Flagged" value={kpiValue(kpis.duplicatesFlagged)} icon={AlertTriangle} />
        <SummaryCard title="Open File Requests" value={kpiValue(kpis.openFileRequests)} icon={FolderOpen} />
        <SummaryCard title="Admission Requests" value={kpiValue(kpis.openAdmissionRequests)} icon={ClipboardList} />
        <SummaryCard title="Open Transfers" value={kpiValue(kpis.openTransfers)} icon={Send} />
        <SummaryCard title="Open Referrals" value={kpiValue(kpis.openReferrals)} icon={Send} />
        <SummaryCard title="Discharges Pending" value={kpiValue(kpis.dischargesPending)} icon={FileCheck} />
      </div>

      <Card className="mb-6">
        <h3 className="font-display font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Patient Entry', to: '/hms/identity', icon: UserPlus },
            { label: 'Arrivals', to: '/records/arrivals', icon: Users },
            { label: 'Triage', to: '/records/triage', icon: Activity },
            { label: 'Admissions', to: '/records/admissions', icon: ClipboardList },
            { label: 'File Retrieval', to: '/records/retrieval', icon: FolderOpen },
            { label: 'Archive', to: '/records/archive', icon: Archive },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 p-4 flex flex-col items-start gap-2 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <a.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-medium">{a.label}</div>
            </Link>
          ))}
        </div>
      </Card>

      <InpatientRegisterCard />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Activity
          </h3>
          {loading && activity.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
            </div>
          ) : activity.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No recent audit activity yet.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {activity.map((a) => (
                <Link
                  key={a.id}
                  to={a.href || '/records/audit'}
                  className="flex items-start justify-between gap-2 pb-2 border-b last:border-0 hover:bg-muted/40 rounded px-1 -mx-1"
                >
                  <div>
                    <div className="font-medium text-xs">{a.actor}</div>
                    <div className="text-xs text-muted-foreground">{a.action}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Alerts & Queues
            </h3>
            <div className="space-y-2">
              {loading && alerts.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
                </div>
              ) : (
                alerts.map((a, i) =>
                  a.href ? (
                    <Link key={i} to={a.href} className="block hover:opacity-90">
                      <div className={`p-3 rounded-lg text-sm border ${alertClass(a.type)}`}>
                        {a.message}
                      </div>
                    </Link>
                  ) : (
                    <div key={i} className={`p-3 rounded-lg text-sm border ${alertClass(a.type)}`}>
                      {a.message}
                    </div>
                  ),
                )
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Overdue files</div>
                <div className="font-semibold text-base">{kpiValue(tasks.overdueFileRequests)}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Archive reviews due</div>
                <div className="font-semibold text-base">{kpiValue(tasks.archivesDueReview)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="font-display font-semibold mb-3">Today&apos;s Arrivals</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arrival</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && arrivals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading arrivals…
                  </span>
                </TableCell>
              </TableRow>
            ) : arrivals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No arrivals recorded today.
                </TableCell>
              </TableRow>
            ) : (
              arrivals.map((r) => (
                <TableRow key={`${r.arrivalNo}-${r.personId}`}>
                  <TableCell className="font-mono text-xs">{r.arrivalNo}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.hospitalId}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell className="text-sm">{r.routing}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.arrival}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </DashboardLayout>
  );
};

export default RecordsOverview;
