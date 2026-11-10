import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, CheckCircle2, Eye, Loader2, RefreshCw, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  fetchLabOverview,
  isLaboratoryApiEnabled,
  type LabOverviewAlert,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

type UiAlert = LabOverviewAlert & { acked?: boolean };

function severityTone(s: LabOverviewAlert['severity']) {
  if (s === 'critical') return 'rose';
  if (s === 'stat') return 'amber';
  return 'blue';
}

export const LabAlerts = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [items, setItems] = useState<UiAlert[]>([]);
  const [ackedIds, setAckedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<UiAlert | null>(null);
  const [tab, setTab] = useState('active');

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLabOverview();
      setItems(data.criticalAlerts ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load alerts';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void load(); }, [load]);

  const active = useMemo(
    () => items.filter((a) => !ackedIds.has(a.id)),
    [items, ackedIds],
  );
  const acked = useMemo(
    () => items.filter((a) => ackedIds.has(a.id)),
    [items, ackedIds],
  );
  const shown = tab === 'active' ? active : acked;

  const acknowledge = (a: UiAlert) => {
    setAckedIds((prev) => new Set(prev).add(a.id));
    toast.success('Alert acknowledged');
  };

  return (
    <LabShell title="Laboratory · Critical Result Alerts">
      <LabSection
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Active Critical & Abnormal Results"
        desc="STAT and critical alerts from today’s laboratory worklist."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{error}
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Active Alerts" value={loading ? '…' : String(active.length)} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Acknowledged" value={loading ? '…' : String(acked.length)} icon={CheckCircle2} tone="green" />
        <SummaryCard
          title="Critical"
          value={loading ? '…' : String(active.filter((a) => a.severity === 'critical').length)}
          icon={ShieldAlert}
          tone="rose"
        />
        <SummaryCard
          title="STAT / High"
          value={loading ? '…' : String(active.filter((a) => a.severity === 'stat' || a.severity === 'warning').length)}
          icon={TrendingUp}
          tone="amber"
        />
      </div>

      <LabCard>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          </TabsList>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">No alerts.</div>
          ) : (
            <div className="space-y-2">
              {shown.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${labTone(severityTone(a.severity))}`}
                >
                  <div className="text-sm min-w-0">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={labTone(severityTone(a.severity))}>
                        {a.severity.toUpperCase()}
                      </Badge>
                      {a.requestNo || a.id}
                    </div>
                    <div className="text-xs mt-1">{a.message}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setView(a)}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    {tab === 'active' && (
                      <Button size="sm" onClick={() => acknowledge(a)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs>
      </LabCard>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>Alert details</DialogTitle>
                <DialogDescription>{view.requestNo || view.id}</DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Severity:</span>{' '}
                  <Badge variant="outline" className={labTone(severityTone(view.severity))}>
                    {view.severity}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Message:</span> {view.message}</div>
                {view.labRequestId != null && (
                  <div><span className="text-muted-foreground">Lab request ID:</span> {view.labRequestId}</div>
                )}
                {view.personId != null && (
                  <div><span className="text-muted-foreground">Person ID:</span> {view.personId}</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                {!ackedIds.has(view.id) && (
                  <Button onClick={() => { acknowledge(view); setView(null); }}>Acknowledge</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabAlerts;
