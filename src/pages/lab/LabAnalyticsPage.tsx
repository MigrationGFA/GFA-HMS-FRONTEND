import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle, BarChart3, Clock, FlaskConical, Loader2, RefreshCw, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  fetchLabAnalyticsSummary,
  isLaboratoryApiEnabled,
  type ApiLabAnalyticsSummary,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell } from './LabPageShell';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const LabAnalytics = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<ApiLabAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchLabAnalyticsSummary({
          from,
          to,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        }),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load analytics';
      setError(msg);
      setData(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, from, to]);

  useEffect(() => { void load(); }, [load]);

  const maxCat = Math.max(1, ...(data?.workloadByCategory.map((c) => c.count) ?? [1]));

  return (
    <LabShell title="Laboratory Analytics Dashboard">
      <LabSection
        icon={<BarChart3 className="h-5 w-5" />}
        title="Operational & Financial Insights"
        desc="Revenue, workload, TAT, top tests, critical results."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        }
      />

      <LabCard className="mb-4">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={() => void load()} disabled={loading}>Apply range</Button>
        </div>
      </LabCard>

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{error}
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Revenue (period)" value={loading || !data ? '…' : formatCurrency(data.revenue)} icon={TrendingUp} />
        <SummaryCard title="Tests / requests" value={loading || !data ? '…' : String(data.tests)} icon={FlaskConical} />
        <SummaryCard title="Avg TAT" value={loading || !data ? '…' : data.avgTatLabel} icon={Clock} />
        <SummaryCard title="Critical / STAT" value={loading || !data ? '…' : String(data.criticalResults)} icon={ShieldAlert} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <LabCard>
          <h3 className="font-semibold mb-3">Top Tests</h3>
          {!data || data.topTests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{loading ? 'Loading…' : 'No test volume in range.'}</p>
          ) : (
            <div className="space-y-3">
              {data.topTests.map((t) => (
                <div key={t.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t.name}</span><span className="text-muted-foreground">{t.count}</span>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </LabCard>
        <LabCard>
          <h3 className="font-semibold mb-3">Workload by Category</h3>
          {!data || data.workloadByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{loading ? 'Loading…' : 'No category data.'}</p>
          ) : (
            <div className="space-y-3">
              {data.workloadByCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{c.category}</span><span className="text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </LabCard>
      </div>
    </LabShell>
  );
};

export default LabAnalytics;
