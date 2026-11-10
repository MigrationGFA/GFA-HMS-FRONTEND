import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Clock, Download, Eye, FileText, Loader2, Plus, RefreshCw, ScrollText,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  generateLabReport,
  getLabReport,
  isLaboratoryApiEnabled,
  listLabReports,
  type ApiLabReportDetail,
  type ApiLabReportListItem,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell } from './LabPageShell';

const REPORT_TYPES = [
  'Daily Report',
  'Weekly Report',
  'Monthly Report',
  'Revenue Report',
  'Drug Screen Report',
  'Culture Report',
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, lines: string[]) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Laboratory Report', 14, 16);
  doc.setFontSize(9);
  let y = 26;
  for (const line of lines) {
    doc.text(line.slice(0, 100), 14, y);
    y += 5;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  }
  doc.save(filename);
}

export const LabReports = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [items, setItems] = useState<ApiLabReportListItem[]>([]);
  const [kpis, setKpis] = useState({ reportsGenerated: 0, scheduled: 0, downloadsMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const [creating, setCreating] = useState(false);
  const [type, setType] = useState(REPORT_TYPES[0]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<ApiLabReportDetail | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabReports({ limit: 100 });
      setItems(data.items);
      setKpis(data.kpis ?? { reportsGenerated: 0, scheduled: 0, downloadsMonth: 0 });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load reports';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()) || r.reportType.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  const openPreview = async (id: number) => {
    setBusy(true);
    try {
      setPreview(await getLabReport(id));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load report');
    } finally {
      setBusy(false);
    }
  };

  const onGenerate = async () => {
    if (!from || !to) {
      toast.error('From and To dates are required');
      return;
    }
    setBusy(true);
    try {
      const report = await generateLabReport({ reportType: type, from, to });
      toast.success('Report generated');
      setCreating(false);
      setPreview(report);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  };

  const payloadLines = (p: ApiLabReportDetail) => {
    const pay = p.payload || {};
    const lines = [
      p.title,
      `Type: ${p.reportType}`,
      `Period: ${p.from} → ${p.to}`,
      pay.summary ? String(pay.summary) : '',
      `Tests / requests: ${pay.totalTestsPerformed ?? '—'}`,
      `Paid requests: ${pay.paidRequests ?? '—'}`,
      `Revenue: ${pay.revenue != null ? formatCurrency(Number(pay.revenue)) : '—'}`,
      `Drug screens: ${pay.drugScreens ?? '—'}`,
      `Cultures: ${pay.cultures ?? '—'}`,
      '',
      'Top tests:',
      ...(pay.topTests ?? []).map((t) => `  ${t.name}: ${t.count}`),
    ].filter(Boolean);
    return lines;
  };

  return (
    <LabShell title="Laboratory Reporting Center">
      <LabSection
        icon={<ScrollText className="h-5 w-5" />}
        title="Reports"
        desc="Generate, preview, and download laboratory report snapshots."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />Create Report
            </Button>
          </div>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>{error}</div>
          </div>
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <SummaryCard title="Reports Generated" value={loading ? '…' : String(kpis.reportsGenerated)} icon={ScrollText} />
        <SummaryCard title="Scheduled" value={loading ? '…' : String(kpis.scheduled)} icon={Clock} />
        <SummaryCard title="Downloads (Month)" value={loading ? '…' : String(kpis.downloadsMonth)} icon={Download} />
      </div>

      <LabCard>
        <div className="flex justify-between gap-2 mb-3">
          <Input placeholder="Search reports…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No reports yet. Generate one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.reportId}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell><Badge variant="outline">{r.reportType}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.fileSizeLabel || '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void openPreview(r.reportId)}>
                      <Eye className="h-3 w-3 mr-1" />Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const d = await getLabReport(r.reportId);
                          downloadPdf(`${r.title}.pdf`, payloadLines(d));
                        } catch (e) {
                          toast.error(e instanceof ApiError ? e.message : 'PDF failed');
                        }
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>Pick a report type and date range. Snapshot is persisted for history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Report Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onGenerate()}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>Preview from persisted snapshot payload.</DialogDescription>
              </DialogHeader>
              <div className="border rounded-lg p-4 text-sm bg-muted/30 max-h-[60vh] overflow-y-auto space-y-1">
                <div className="font-semibold mb-2">GFA Demo Hospital · Laboratory Report</div>
                <p>Period: {preview.from} to {preview.to}</p>
                <p>{preview.payload?.summary}</p>
                <p>Total tests / requests: {preview.payload?.totalTestsPerformed ?? '—'}</p>
                <p>Total revenue: {preview.payload?.revenue != null ? formatCurrency(Number(preview.payload.revenue)) : '—'}</p>
                <p>
                  Top tests:{' '}
                  {(preview.payload?.topTests ?? []).map((t) => `${t.name} (${t.count})`).join(', ') || '—'}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadCsv('report.csv', [
                      ['Item', 'Value'],
                      ['Tests', String(preview.payload?.totalTestsPerformed ?? '')],
                      ['Revenue', String(preview.payload?.revenue ?? '')],
                    ])
                  }
                >
                  <Download className="h-4 w-4 mr-1" />CSV
                </Button>
                <Button onClick={() => downloadPdf('report.pdf', payloadLines(preview))}>
                  <FileText className="h-4 w-4 mr-1" />PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabReports;
