import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordsNav } from '@/pages/recordsNav';
import { ApiError } from '@/lib/api/client';
import {
  downloadCsv,
  generateRecordsReport,
  getReportsSummary,
  isRecordsOpsApiEnabled,
  type ReportGenerateResult,
  type ReportSummary,
} from '@/lib/api/records-ops';
import { Activity, BedDouble, FileCheck, FileText, Loader2, RefreshCw, Send, UserPlus, Users } from 'lucide-react';

const REPORTS = [
  'Daily Registration', 'Attendance', 'Walk-In', 'Internal Referral', 'Admission Request',
  'Discharge', 'Triage Queue', 'Patient Movement', 'HMO/NHIA', 'Document Upload', 'Records Officer Activity',
];

export const DailyReports = () => {
  const apiOn = isRecordsOpsApiEnabled();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(REPORTS[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dept, setDept] = useState('all');
  const [generated, setGenerated] = useState<ReportGenerateResult | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!apiOn) {
      setError('Records API is not enabled');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSummary(await getReportsSummary(new Date().getTimezoneOffset() * -1));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const generate = async () => {
    if (startDate > endDate) return toast.error('Start date must be before end date');
    setBusy(true);
    try {
      const res = await generateRecordsReport({
        reportType: type,
        from: startDate,
        to: endDate,
        department: dept === 'all' ? undefined : dept,
      });
      setGenerated(res);
      toast.success('Report generated & saved');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = () => {
    if (!generated) return toast.error('Generate a report first');
    downloadCsv(
      `records-report-${generated.from}-${generated.to}.csv`,
      ['Metric', 'Value'],
      generated.rows.map((r) => [r.col, r.val]),
    );
    toast.success('CSV exported');
  };

  return (
    <DashboardLayout title="Reports" navItems={recordsNav as any}>
      {loading && <div className="flex gap-2 text-muted-foreground mb-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading KPIs…</div>}
      {error && <div className="mb-4 text-sm text-destructive">{error} <Button size="sm" variant="outline" className="ml-2" onClick={() => void loadSummary()}>Retry</Button></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total Registered" value={summary ? String(summary.totalRegistered) : '…'} icon={Users} />
        <SummaryCard title="New Today" value={summary ? String(summary.newToday) : '…'} icon={UserPlus} />
        <SummaryCard title="Returning" value={summary ? String(summary.returning) : '…'} icon={RefreshCw} />
        <SummaryCard title="Walk-In / Triage" value={summary ? String(summary.walkIn) : '…'} icon={Activity} />
        <SummaryCard title="Referrals" value={summary ? String(summary.referrals) : '…'} icon={Send} />
        <SummaryCard title="Admissions" value={summary ? String(summary.admissions) : '…'} icon={BedDouble} />
        <SummaryCard title="Discharges" value={summary ? String(summary.discharges) : '…'} icon={FileCheck} />
        <SummaryCard title="Documents" value={summary ? String(summary.documents) : '…'} icon={FileText} />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3 mb-4">
        <h3 className="font-semibold">Generate Report</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><Label>Report Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REPORTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Start</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><Label>End</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Records">Records</SelectItem>
                <SelectItem value="OPD">OPD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void generate()}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : 'Generate'}
          </Button>
          <Button variant="outline" onClick={exportRows}>Export CSV</Button>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {generated && (
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-2">{generated.reportType}</h3>
          <p className="text-xs text-muted-foreground mb-3">{generated.from} → {generated.to} (snapshot #{generated.snapshotId})</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Metric</th><th>Value</th></tr></thead>
            <tbody>
              {generated.rows.map((r) => (
                <tr key={r.col} className="border-b"><td className="py-2">{r.col}</td><td className="font-medium">{r.val}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};
