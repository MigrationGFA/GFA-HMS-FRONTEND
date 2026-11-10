import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { recordsNav } from '@/pages/recordsNav';
import { ApiError } from '@/lib/api/client';
import {
  downloadCsv,
  getRecordsAnalytics,
  isRecordsOpsApiEnabled,
  type RecordsAnalyticsResult,
} from '@/lib/api/records-ops';
import { Activity, Loader2, TrendingUp, Users } from 'lucide-react';

function BarList({ items, valueKey }: { items: { label: string; count?: number; registrations?: number; triage?: number }[]; valueKey: 'count' | 'registrations' | 'triage' }) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey] ?? 0)));
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">No data in this range.</p>}
      {items.map((i) => {
        const v = Number(i[valueKey] ?? 0);
        return (
          <div key={i.label}>
            <div className="flex justify-between text-xs mb-0.5"><span>{i.label}</span><span className="font-medium">{v}</span></div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary/70" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const RecordsAnalytics = () => {
  const apiOn = isRecordsOpsApiEnabled();
  const [range, setRange] = useState('month');
  const [data, setData] = useState<RecordsAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Records API is not enabled');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getRecordsAnalytics({
        range,
        timezoneOffsetMinutes: new Date().getTimezoneOffset() * -1,
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiOn, range]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!data) return toast.error('No data');
    const rows: string[][] = [
      ['KPI', 'totalRegistered', String(data.kpis.totalRegistered)],
      ['KPI', 'newInPeriod', String(data.kpis.newInPeriod)],
      ['KPI', 'returningApprox', String(data.kpis.returningApprox)],
      ['KPI', 'peakHour', data.kpis.peakHourLabel],
      ['KPI', 'topClinic', data.kpis.topClinic],
      ...data.trends.map((t) => ['trend', t.label, `reg=${t.registrations};triage=${t.triage}`]),
      ...data.demographics.map((d) => ['demo', d.label, String(d.count)]),
      ...data.operations.map((o) => ['ops', o.label, String(o.count)]),
    ];
    downloadCsv('records-analytics.csv', ['Section', 'Label', 'Value'], rows);
    toast.success('CSV exported');
  };

  const k = data?.kpis;

  return (
    <DashboardLayout title="Records Analytics" navItems={recordsNav as any}>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="space-y-1">
          <Label>Time range</Label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button disabled={loading} onClick={() => void load()}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : 'Generate'}
        </Button>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
      </div>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total Registered" value={k ? String(k.totalRegistered) : '…'} icon={Users} />
        <SummaryCard title="New In Period" value={k ? String(k.newInPeriod) : '…'} icon={TrendingUp} />
        <SummaryCard title="Returning (approx)" value={k ? String(k.returningApprox) : '…'} icon={Activity} />
        <SummaryCard title="Peak Hour" value={k?.peakHourLabel ?? '…'} icon={Activity} />
        <SummaryCard title="Top Clinic" value={k?.topClinic ?? '…'} icon={Activity} />
        <SummaryCard title="Top Category" value={k?.topCategory ?? '…'} icon={Users} />
      </div>

      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="trends">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>
          <TabsContent value="trends" className="mt-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="grid md:grid-cols-2 gap-6">
                <div><h4 className="text-sm font-semibold mb-2">Registrations</h4><BarList items={data?.trends ?? []} valueKey="registrations" /></div>
                <div><h4 className="text-sm font-semibold mb-2">Triage</h4><BarList items={data?.trends ?? []} valueKey="triage" /></div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="demographics" className="mt-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarList items={data?.demographics ?? []} valueKey="count" />}
          </TabsContent>
          <TabsContent value="operations" className="mt-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarList items={data?.operations ?? []} valueKey="count" />}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
