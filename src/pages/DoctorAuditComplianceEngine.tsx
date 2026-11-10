import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import {
  clearDoctorAuditMockStorage,
  fetchAuditStats,
  isAuditApiEnabled,
  listAuditLogs,
  type ApiAuditLog,
  type ApiAuditStats,
} from '@/lib/api/audit';
import { ApiError } from '@/lib/api/client';
import {
  ScrollText, RefreshCw, Eye, FileText, Pill, Siren, AlertTriangle, Loader2,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Audit & Compliance">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

type TabId = 'all' | 'notes' | 'prescriptions' | 'access' | 'overrides' | 'exports' | 'flagged';

function categoryFromType(type: string | null): TabId | 'other' {
  const t = (type ?? '').toLowerCase();
  if (t.startsWith('clinical-note:') || t.includes('note')) return 'notes';
  if (t.startsWith('prescription:') || t.includes('rx') || t.includes('pharmacy:')) return 'prescriptions';
  if (t.startsWith('emergency:')) return 'overrides';
  if (t.includes('export')) return 'exports';
  if (t.includes('access') || t.startsWith('auth:') || t.startsWith('user:')) return 'access';
  return 'other';
}

function isFlagged(log: ApiAuditLog): boolean {
  const s = (log.status ?? '').toLowerCase();
  return s === 'flagged' || s === 'suspicious' || s.includes('fail');
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function emptyStats(): ApiAuditStats {
  return {
    asOf: new Date().toISOString(),
    total: 0,
    today: 0,
    emergencyOverrides: 0,
    noteEdits: 0,
    prescriptionChanges: 0,
    flagged: 0,
  };
}

export const DocAudit = () => {
  const apiOn = isAuditApiEnabled();
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [stats, setStats] = useState<ApiAuditStats>(emptyStats);
  const [selected, setSelected] = useState<ApiAuditLog | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setLogs([]);
      setStats(emptyStats());
      setLoading(false);
      return;
    }
    clearDoctorAuditMockStorage();
    setLoading(true);
    setError(null);
    try {
      const offset = -new Date().getTimezoneOffset();
      const [list, s] = await Promise.all([
        listAuditLogs({ limit: 200 }),
        fetchAuditStats({ timezoneOffsetMinutes: offset }),
      ]);
      setLogs(list.items ?? []);
      setStats(s);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(msg);
      setLogs([]);
      setStats(emptyStats());
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((log) => {
      if (tab === 'flagged' && !isFlagged(log)) return false;
      if (tab !== 'all' && tab !== 'flagged') {
        const cat = categoryFromType(log.type);
        if (tab === 'exports' && cat !== 'exports') return false;
        if (tab === 'notes' && cat !== 'notes') return false;
        if (tab === 'prescriptions' && cat !== 'prescriptions') return false;
        if (tab === 'overrides' && cat !== 'overrides') return false;
        if (tab === 'access' && cat !== 'access') return false;
      }
      if (!needle) return true;
      const hay = [
        log.type,
        log.item,
        log.entity,
        log.createdBy,
        log.status,
        log.entityId,
        String(log.personId ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [logs, q, tab]);

  const exportRows = useMemo(
    () => logs.filter((l) => categoryFromType(l.type) === 'exports'),
    [logs],
  );

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Audit & Compliance
            </h1>
            <p className="text-sm text-muted-foreground">
              Live hospital audit trail from the database. Empty database shows 0.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
        ) : null}

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <SummaryCard label="Total Events" value={String(stats.total)} icon={ScrollText} />
          <SummaryCard label="Today" value={String(stats.today)} icon={FileText} />
          <SummaryCard label="Emergency Overrides" value={String(stats.emergencyOverrides)} icon={Siren} />
          <SummaryCard label="Clinical Notes" value={String(stats.noteEdits)} icon={FileText} />
          <SummaryCard label="Prescription Changes" value={String(stats.prescriptionChanges)} icon={Pill} />
          <SummaryCard label="Flagged" value={String(stats.flagged)} icon={AlertTriangle} />
        </div>

        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search type, user, entity…"
              className="max-w-sm"
            />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
            <TabsList className="mb-3 flex h-auto flex-wrap">
              <TabsTrigger value="all">All Logs</TabsTrigger>
              <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="access">Patient Access</TabsTrigger>
              <TabsTrigger value="overrides">Emergency Overrides</TabsTrigger>
              <TabsTrigger value="exports">Export History</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No audit events{tab === 'exports' || exportRows.length === 0 ? '' : ''} yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2 font-medium">When</th>
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium">User</th>
                        <th className="p-2 font-medium">Patient</th>
                        <th className="p-2 font-medium">Status</th>
                        <th className="p-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((log) => (
                        <tr key={log.auditId} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="p-2 whitespace-nowrap">{formatWhen(log.createdAt)}</td>
                          <td className="p-2">{log.type ?? log.item ?? '—'}</td>
                          <td className="p-2">{log.createdBy ?? '—'}</td>
                          <td className="p-2">{log.personId != null ? `#${log.personId}` : '—'}</td>
                          <td className="p-2">{log.status ?? '—'}</td>
                          <td className="p-2 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setSelected(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Audit event</SheetTitle>
            <SheetDescription>{selected?.type ?? 'Details'}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-3 text-sm">
              <Row label="ID" value={String(selected.auditId)} />
              <Row label="When" value={formatWhen(selected.createdAt)} />
              <Row label="Type" value={selected.type ?? '—'} />
              <Row label="Item" value={selected.item ?? '—'} />
              <Row label="Entity" value={selected.entity ?? '—'} />
              <Row label="Entity ID" value={selected.entityId ?? '—'} />
              <Row label="User" value={selected.createdBy ?? '—'} />
              <Row label="Person" value={selected.personId != null ? String(selected.personId) : '—'} />
              <Row label="Status" value={selected.status ?? '—'} />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Before</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">
                  {selected.oldValue || '—'}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">After</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">
                  {selected.newValue || '—'}
                </pre>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Shell>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default DocAudit;
