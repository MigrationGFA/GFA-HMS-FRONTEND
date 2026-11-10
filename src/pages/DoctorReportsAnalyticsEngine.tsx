import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { PendingIntegrationBanner } from '@/components/doctor/PendingIntegrationBanner';
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import {
  getDoctorAnalytics,
  isDoctorAnalyticsApiEnabled,
  type DoctorAnalyticsPayload,
} from '@/lib/api/doctorAnalytics';
import {
  BarChart3, FileText, Download, FileSpreadsheet, Printer, Eye, Users, Stethoscope,
  Pill, FlaskConical, BedDouble, Send, Filter, TrendingUp, Video, Clock, FileSignature,
  Activity, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Reports & Analytics">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const StatusPill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => {
  const cls = tone === 'red' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : tone === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : tone === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

type TabId = 'overview' | 'consultations' | 'patients' | 'diagnosis' | 'prescriptions' | 'investigations' | 'admission' | 'referrals' | 'export';
type KpiFilter = 'consultations' | 'patients' | 'diagnoses' | 'procedures' | 'admissions' | 'referrals' | 'prescriptions' | 'investigations' | 'discharges' | 'followUps' | 'telemedicine' | 'critical' | 'avgTime' | 'pendingNotes';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

type ConsultationRow = DoctorAnalyticsPayload['tables']['consultations'][number];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeRangeIso(
  range: DateRange,
  dateFrom: string,
  dateTo: string,
): { from: string; to: string } {
  const now = new Date();
  if (range === 'custom') {
    const from = dateFrom ? startOfDay(new Date(`${dateFrom}T00:00:00`)) : startOfDay(now);
    const to = dateTo ? endOfDay(new Date(`${dateTo}T00:00:00`)) : endOfDay(now);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const to = endOfDay(now);
  const from = startOfDay(now);
  if (range === 'week') from.setDate(from.getDate() - 6);
  else if (range === 'month') from.setDate(1);
  else if (range === 'quarter') {
    const q = Math.floor(from.getMonth() / 3) * 3;
    from.setMonth(q, 1);
  } else if (range === 'year') from.setMonth(0, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function emptyFilters() {
  const now = new Date();
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return {
    range: 'month' as DateRange,
    dateFrom: toDateInput(monthStart),
    dateTo: toDateInput(now),
    clinic: 'all',
  };
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  triggerDownload(filename, csv, 'text/csv;charset=utf-8;');
  toast.success(`${filename} downloaded`);
}

function downloadExcelCompatible(filename: string, rows: (string | number)[][]) {
  const csvName = filename.replace(/\.xlsx?$/i, '.csv');
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  triggerDownload(csvName, csv, 'text/csv;charset=utf-8;');
  toast.success('CSV (Excel-compatible) downloaded');
}

function downloadPdf(filename: string, title: string, lines: string[]) {
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('GFA HMS — Doctor Reports & Analytics', 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(title, 40, 60);
    let y = 80;
    lines.forEach((ln) => {
      doc.splitTextToSize(ln, 520).forEach((w: string) => {
        if (y > 780) {
          doc.addPage();
          y = 40;
        }
        doc.text(w, 40, y);
        y += 14;
      });
    });
    doc.save(filename);
    toast.success(`${filename} downloaded`);
  } catch {
    toast.error('PDF generation failed');
  }
}

function chartMax(vals: number[]) {
  return Math.max(1, ...vals);
}

export const DoctorAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Doctor';
  const apiOn = isDoctorAnalyticsApiEnabled();

  const [tab, setTab] = useState<TabId>('overview');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: 'Full doctor analytics',
    dateFrom: emptyFilters().dateFrom,
    dateTo: emptyFilters().dateTo,
    clinic: 'all',
    doctor: doctorName,
    charts: true,
    patientLevel: false,
    format: 'PDF',
  });
  const [consultDrawer, setConsultDrawer] = useState<ConsultationRow | null>(null);

  const [data, setData] = useState<DoctorAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { from, to } = computeRangeIso(applied.range, applied.dateFrom, applied.dateTo);
      const payload = await getDoctorAnalytics({
        from,
        to,
        clinic: applied.clinic,
      });
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError ? e.message : 'Failed to load doctor analytics');
    } finally {
      setLoading(false);
    }
  }, [apiOn, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis;
  const avgTimeLabel = kpis ? `${kpis.avgConsultMinutes} min` : '—';

  const kpiToTab = (k: KpiFilter): TabId => {
    const map: Partial<Record<KpiFilter, TabId>> = {
      consultations: 'consultations',
      patients: 'patients',
      diagnoses: 'diagnosis',
      prescriptions: 'prescriptions',
      investigations: 'investigations',
      admissions: 'admission',
      discharges: 'admission',
      referrals: 'referrals',
      telemedicine: 'consultations',
      followUps: 'consultations',
      critical: 'investigations',
      pendingNotes: 'consultations',
      procedures: 'overview',
      avgTime: 'consultations',
    };
    return map[k] ?? 'overview';
  };

  const exportData = (type: string, format: 'CSV' | 'Excel' | 'PDF') => {
    if (!data) {
      toast.error('No analytics data to export');
      return;
    }
    const { kpis: k, tables, referrals, admission } = data;
    let rows: (string | number)[][] = [
      ['Metric', 'Value'],
      ['Consultations', k.consultations],
      ['Patients', k.patients],
      ['Diagnoses', k.diagnoses],
      ['Procedures', k.procedures],
      ['Admissions', k.admissions],
      ['Referrals', k.referrals],
      ['Prescriptions', k.prescriptions],
      ['Investigations', k.investigations],
      ['Discharges', k.discharges],
      ['Follow-ups', k.followUps],
      ['Telemedicine', k.telemedicine],
      ['Critical', k.critical],
      ['Avg consult minutes', k.avgConsultMinutes],
      ['Pending notes', k.pendingNotes],
      ['From', data.from],
      ['To', data.to],
      ['Clinic', data.clinic || 'all'],
    ];

    if (type.includes('Consultation')) {
      rows = [
        ['Date', 'Patient', 'Clinic', 'Duration', 'Outcome'],
        ...tables.consultations.map((c) => [c.date, c.patient, c.clinic, c.duration, c.outcome]),
      ];
    } else if (type.includes('Diagnosis') || type.includes('Patient report')) {
      if (type.includes('Diagnosis')) {
        rows = [
          ['Diagnosis', 'Code', 'Count', 'New', 'Follow-Up', 'Clinic', 'Trend'],
          ...tables.diagnoses.map((d) => [d.diagnosis, d.code, d.count, d.newCases, d.followUp, d.clinic, d.trend]),
        ];
      } else {
        rows = [
          ['Metric', 'Value'],
          ['New patients', data.patients.newCount],
          ['Returning patients', data.patients.returningCount],
          ...data.patients.ageBands.map((a) => [`Age ${a.band}`, a.count]),
          ...data.patients.paymentMix.map((p) => [`Payment ${p.channel}`, p.count]),
        ];
      }
    } else if (type.includes('Prescription')) {
      rows = [
        ['Drug', 'Count', 'Patients', 'Clinic', 'Alerts', 'Stopped'],
        ...tables.prescriptions.map((r) => [r.drug, r.count, r.patients, r.clinic, r.alerts, r.stopped]),
      ];
    } else if (type.includes('Investigation')) {
      rows = [
        ['Test', 'Type', 'Count', 'Completed', 'Pending', 'Critical'],
        ...tables.investigations.map((i) => [i.name, i.type, i.count, i.completed, i.pending, i.critical]),
      ];
    } else if (type.includes('Referral')) {
      rows = [
        ['Metric', 'Count'],
        ['Sent', referrals.sent],
        ['Received', referrals.received],
        ['Completed', referrals.completed],
        ['Pending', referrals.pending],
        ['External', referrals.external],
      ];
    } else if (type.includes('Admission')) {
      rows = [
        ['Metric', 'Count'],
        ['Admissions', admission.admissions],
        ['Discharges', admission.discharges],
        ['Avg LOS (days)', admission.avgLosDays],
        ['Pending drafts', admission.pendingDrafts],
        ...admission.wardDistribution.map((w) => [`Ward ${w.ward}`, w.count]),
      ];
    }

    const fname = `${type.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    if (format === 'PDF') downloadPdf(`${fname}.pdf`, type, rows.map((r) => r.join(' · ')));
    else if (format === 'Excel') downloadExcelCompatible(`${fname}.csv`, rows);
    else downloadCsv(`${fname}.csv`, rows);
  };

  const openPatient = (c: ConsultationRow) => {
    setDocPatientContext({
      id: c.patientId,
      name: c.patient,
      hospitalId: c.hospitalId,
      clinic: c.clinic === 'Telemedicine' ? 'OPC' : c.clinic,
    } as DocPatientContext);
    navigate(`${base}/timeline`);
  };

  const overviewCharts = useMemo(() => {
    if (!data?.charts?.consultationTrend) return [];
    const { charts } = data;
    return [
      {
        title: 'Consultation Trend',
        data: charts.consultationTrend.map((d) => ({ label: d.date, val: d.count })),
      },
      {
        title: 'Patients by Clinic',
        data: charts.patientsByClinic.map((d) => ({ label: d.clinic, val: d.count })),
      },
      {
        title: 'Prescription Volume',
        data: charts.prescriptionVolume.map((d) => ({ label: d.date, val: d.count })),
      },
      {
        title: 'Referral Trend',
        data: charts.referralTrend.map((d) => ({ label: d.date, val: d.count })),
      },
    ];
  }, [data]);

  const withData = (render: (payload: DoctorAnalyticsPayload) => React.ReactNode) =>
    (data ? render(data) : null);

  const TableWrap = ({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[]; empty?: boolean }) => (
    <Card className="overflow-x-auto !p-0 hidden md:block">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {empty && <p className="text-center text-muted-foreground py-8 text-sm">No rows for this period.</p>}
    </Card>
  );

  const AnalyticsTabGate = ({ emptyMessage, children }: { emptyMessage?: string; children: React.ReactNode }) => {
    if (!apiOn) {
      return (
        <Card>
          <p className="text-sm text-muted-foreground">
            Configure VITE_USE_API and VITE_API_BASE_URL to load analytics from the backend.
          </p>
        </Card>
      );
    }
    if (loading && !data) {
      return (
        <Card className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </Card>
      );
    }
    if (error && !data) {
      return (
        <Card className="flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
          <p className="text-sm text-rose-800">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
        </Card>
      );
    }
    if (!data) {
      return <Card><p className="text-sm text-muted-foreground">{emptyMessage ?? 'No analytics data available.'}</p></Card>;
    }
    return <>{children}</>;
  };

  const kpiCards = [
    { id: 'consultations' as KpiFilter, title: 'Consultations', value: kpis?.consultations ?? '—', icon: Stethoscope, tone: 'blue' as const },
    { id: 'patients' as KpiFilter, title: 'Patients Seen', value: kpis?.patients ?? '—', icon: Users, tone: 'teal' as const },
    { id: 'diagnoses' as KpiFilter, title: 'Diagnoses', value: kpis?.diagnoses ?? '—', icon: FileText, tone: 'purple' as const },
    { id: 'procedures' as KpiFilter, title: 'Procedures', value: kpis?.procedures ?? '—', icon: Activity, tone: 'indigo' as const },
    { id: 'admissions' as KpiFilter, title: 'Admissions', value: kpis?.admissions ?? '—', icon: BedDouble, tone: 'amber' as const },
    { id: 'referrals' as KpiFilter, title: 'Referrals', value: kpis?.referrals ?? '—', icon: Send, tone: 'rose' as const },
    { id: 'prescriptions' as KpiFilter, title: 'Prescriptions', value: kpis?.prescriptions ?? '—', icon: Pill, tone: 'green' as const },
    { id: 'investigations' as KpiFilter, title: 'Investigations', value: kpis?.investigations ?? '—', icon: FlaskConical, tone: 'blue' as const },
    { id: 'discharges' as KpiFilter, title: 'Discharges', value: kpis?.discharges ?? '—', icon: TrendingUp, tone: 'teal' as const },
    { id: 'followUps' as KpiFilter, title: 'Follow-Ups', value: kpis?.followUps ?? '—', icon: Clock, tone: 'purple' as const },
    { id: 'telemedicine' as KpiFilter, title: 'Telemedicine', value: kpis?.telemedicine ?? '—', icon: Video, tone: 'indigo' as const },
    { id: 'critical' as KpiFilter, title: 'Critical Results', value: kpis?.critical ?? '—', icon: AlertTriangle, tone: 'rose' as const },
    { id: 'avgTime' as KpiFilter, title: 'Avg Consult Time', value: avgTimeLabel, icon: Clock, tone: 'amber' as const },
    { id: 'pendingNotes' as KpiFilter, title: 'Pending Notes', value: kpis?.pendingNotes ?? '—', icon: FileSignature, tone: 'amber' as const },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Clinical workload, performance trends, diagnosis patterns, prescriptions, investigations, referrals, and discharge analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setReportOpen(true)} disabled={!data}>
            <FileText className="h-4 w-4 mr-1" />Generate Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData('Doctor analytics', 'Excel')} disabled={!data}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />CSV (Excel-compatible)
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData('Doctor analytics', 'PDF')} disabled={!data}>
            <FileText className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportData('Doctor analytics', 'CSV')} disabled={!data}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </div>
      </div>

      {!apiOn && (
        <div className="mb-4">
          <PendingIntegrationBanner reason="Doctor analytics requires the backend API. Set VITE_USE_API=true and VITE_API_BASE_URL in your environment to load live data from GET /api/doctor/analytics." />
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1"><Filter className="h-4 w-4" />Filters</span>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setFiltersOpen((o) => !o)}>
            {filtersOpen ? 'Hide' : 'Show'}
          </Button>
        </div>
        {filtersOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-2">
            <Select value={filters.range} onValueChange={(v) => setFilters((f) => ({ ...f, range: v as DateRange }))}>
              <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
              <SelectContent>
                {(['today', 'week', 'month', 'quarter', 'year', 'custom'] as DateRange[]).map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r === 'custom' ? 'Custom Range' : r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.range === 'custom' && (
              <>
                <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
                <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              </>
            )}
            <Select value={filters.clinic} onValueChange={(v) => setFilters((f) => ({ ...f, clinic: v }))}>
              <SelectTrigger><SelectValue placeholder="Clinic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clinics</SelectItem>
                {['GMPC', 'OPC', 'Psychiatric', 'Emergency', 'Telemedicine'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setApplied({ ...filters });
              toast.success('Filters applied');
            }}
            disabled={loading}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const empty = emptyFilters();
              setFilters(empty);
              setApplied(empty);
              setKpiFilter(null);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      {!apiOn ? null : loading && !data ? (
        <Card className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </Card>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {kpiCards.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setKpiFilter(kpiFilter === k.id ? null : k.id);
                setTab(kpiToTab(k.id));
              }}
              className={`text-left rounded-xl ${kpiFilter === k.id ? 'ring-2 ring-primary' : ''}`}
            >
              <SummaryCard title={k.title} value={String(k.value)} icon={k.icon} tone={k.tone} />
            </button>
          ))}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {(['overview', 'consultations', 'patients', 'diagnosis', 'prescriptions', 'investigations', 'admission', 'referrals', 'export'] as TabId[]).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === 'admission' ? 'Admission & Discharge'
                : t === 'export' ? 'Export Center'
                : t === 'consultations' ? 'Consultation Analytics'
                : t === 'patients' ? 'Patient Analytics'
                : t === 'diagnosis' ? 'Diagnosis Analytics'
                : t === 'prescriptions' ? 'Prescription Analytics'
                : t === 'investigations' ? 'Investigation Analytics'
                : t === 'referrals' ? 'Referral Analytics'
                : t}
            </TabsTrigger>
          ))}
        </TabsList>

        {loading && data && (
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin" /> Refreshing…
          </p>
        )}

        <TabsContent value="overview">
          <AnalyticsTabGate emptyMessage="No chart data available.">
            <div className="grid md:grid-cols-2 gap-4">
              {overviewCharts.map((chart) => (
                <Card key={chart.title}>
                  <div className="font-semibold text-sm mb-3 flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />{chart.title}
                  </div>
                  {chart.data.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data for this period.</p>
                  ) : (
                    chart.data.map((d) => (
                      <div key={d.label} className="mb-2">
                        <div className="flex justify-between text-xs mb-0.5"><span>{d.label}</span><span>{d.val}</span></div>
                        <Progress value={Math.min(100, (d.val / chartMax(chart.data.map((x) => x.val))) * 100)} className="h-2" />
                      </div>
                    ))
                  )}
                </Card>
              ))}
            </div>
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="consultations">
          <AnalyticsTabGate emptyMessage="No consultations in this period.">
            {withData((data) => data.tables.consultations.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">No consultations in this period.</p></Card>
            ) : (
              <>
                <TableWrap
                  headers={['Date', 'Patient', 'Hospital No.', 'Clinic', 'Visit Type', 'Start', 'End', 'Duration', 'Outcome', 'Action']}
                  empty={false}
                  rows={data.tables.consultations.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b text-xs">{c.date}</td>
                    <td className="px-3 py-2 border-b">{c.patient}</td>
                    <td className="px-3 py-2 border-b font-mono text-xs">{c.hospitalId}</td>
                    <td className="px-3 py-2 border-b">{c.clinic}</td>
                    <td className="px-3 py-2 border-b">{c.visitType}</td>
                    <td className="px-3 py-2 border-b text-xs">{c.start}</td>
                    <td className="px-3 py-2 border-b text-xs">{c.end}</td>
                    <td className="px-3 py-2 border-b">{c.duration}</td>
                    <td className="px-3 py-2 border-b"><StatusPill tone="green">{c.outcome}</StatusPill></td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setConsultDrawer(c)}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openPatient(c)}><Activity className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              />
              <div className="md:hidden space-y-2 mt-2">
                {data.tables.consultations.map((c) => (
                  <Card key={c.id} className="!p-3">
                    <div className="font-medium">{c.patient}</div>
                    <div className="text-xs text-muted-foreground">{c.date} · {c.clinic} · {c.duration}</div>
                    <Button size="sm" className="w-full mt-2" onClick={() => setConsultDrawer(c)}>View</Button>
                  </Card>
                ))}
              </div>
            </>
            ))}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="patients">
          <AnalyticsTabGate emptyMessage="No patient analytics.">
            {withData((data) => <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <div className="font-semibold text-sm mb-2">New vs Returning</div>
                <div className="text-sm">New: {data.patients.newCount} · Returning: {data.patients.returningCount}</div>
              </Card>
              <Card>
                <div className="font-semibold text-sm mb-2">Age Distribution</div>
                {data.patients.ageBands.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No age data.</p>
                ) : (
                  data.patients.ageBands.map((a) => (
                    <div key={a.band} className="text-sm">{a.band}: {a.count}</div>
                  ))
                )}
              </Card>
              <Card>
                <div className="font-semibold text-sm mb-2">Payment Mix</div>
                {data.patients.paymentMix.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No payment data.</p>
                ) : (
                  data.patients.paymentMix.map((p) => (
                    <div key={p.channel} className="text-sm">{p.channel}: {p.count}</div>
                  ))
                )}
              </Card>
            </div>)}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="diagnosis">
          <AnalyticsTabGate emptyMessage="No diagnoses in this period.">
            {withData((data) => data.tables.diagnoses.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">No diagnoses in this period.</p></Card>
            ) : (
              <TableWrap
                headers={['Diagnosis', 'Code', 'Count', 'New', 'Follow-Up', 'Clinic', 'Trend', 'Action']}
                rows={data.tables.diagnoses.map((d) => (
                  <tr key={`${d.code}-${d.clinic}`} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b">{d.diagnosis}</td>
                    <td className="px-3 py-2 border-b font-mono text-xs">{d.code}</td>
                    <td className="px-3 py-2 border-b">{d.count}</td>
                    <td className="px-3 py-2 border-b">{d.newCases}</td>
                    <td className="px-3 py-2 border-b">{d.followUp}</td>
                    <td className="px-3 py-2 border-b">{d.clinic}</td>
                    <td className="px-3 py-2 border-b">{d.trend}</td>
                    <td className="px-3 py-2 border-b">
                      <Button size="sm" variant="ghost" onClick={() => exportData(`Diagnosis-${d.code}`, 'CSV')}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              />
            ))}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="prescriptions">
          <AnalyticsTabGate emptyMessage="No prescriptions in this period.">
            {withData((data) => data.tables.prescriptions.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">No prescriptions in this period.</p></Card>
            ) : (
              <TableWrap
                headers={['Drug', 'Rx Count', 'Patients', 'Clinic', 'Interaction Alerts', 'Stopped', 'Action']}
                rows={data.tables.prescriptions.map((r) => (
                  <tr key={`${r.drug}-${r.clinic}`} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b font-medium">{r.drug}</td>
                    <td className="px-3 py-2 border-b">{r.count}</td>
                    <td className="px-3 py-2 border-b">{r.patients}</td>
                    <td className="px-3 py-2 border-b">{r.clinic}</td>
                    <td className="px-3 py-2 border-b">{r.alerts > 0 ? <StatusPill tone="amber">{r.alerts}</StatusPill> : '—'}</td>
                    <td className="px-3 py-2 border-b">{r.stopped}</td>
                    <td className="px-3 py-2 border-b">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/prescriptions`)}><Eye className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              />
            ))}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="investigations">
          <AnalyticsTabGate emptyMessage="No investigations in this period.">
            {withData((data) => data.tables.investigations.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">No investigations in this period.</p></Card>
            ) : (
              <TableWrap
                headers={['Investigation', 'Type', 'Count', 'Completed', 'Pending', 'Critical', 'Action']}
                rows={data.tables.investigations.map((i) => (
                  <tr key={`${i.name}-${i.type}`} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b">{i.name}</td>
                    <td className="px-3 py-2 border-b">{i.type}</td>
                    <td className="px-3 py-2 border-b">{i.count}</td>
                    <td className="px-3 py-2 border-b">{i.completed}</td>
                    <td className="px-3 py-2 border-b">{i.pending}</td>
                    <td className="px-3 py-2 border-b">{i.critical > 0 ? <StatusPill tone="red">{i.critical}</StatusPill> : '—'}</td>
                    <td className="px-3 py-2 border-b">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${base}/results`)}><Eye className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              />
            ))}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="admission">
          <AnalyticsTabGate emptyMessage="No admission data.">
            {withData((data) => <>
              <div className="grid md:grid-cols-4 gap-3 mb-4">
                <Card className="!p-3 text-center"><div className="text-xs text-muted-foreground">Admissions</div><div className="text-xl font-bold">{data.admission.admissions}</div></Card>
                <Card className="!p-3 text-center"><div className="text-xs text-muted-foreground">Discharges</div><div className="text-xl font-bold">{data.admission.discharges}</div></Card>
                <Card className="!p-3 text-center"><div className="text-xs text-muted-foreground">Avg LOS</div><div className="text-xl font-bold">{data.admission.avgLosDays}d</div></Card>
                <Card className="!p-3 text-center"><div className="text-xs text-muted-foreground">Pending Drafts</div><div className="text-xl font-bold">{data.admission.pendingDrafts}</div></Card>
              </div>
              <Card>
                <div className="font-semibold text-sm mb-2">Ward Distribution</div>
                {data.admission.wardDistribution.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No ward distribution data.</p>
                ) : (
                  data.admission.wardDistribution.map((w) => (
                    <div key={w.ward} className="text-sm py-1 border-b">{w.ward}: {w.count}</div>
                  ))
                )}
              </Card>
            </>)}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="referrals">
          <AnalyticsTabGate emptyMessage="No referral data.">
            {withData((data) => <div className="grid md:grid-cols-5 gap-3">
              {[
                { l: 'Sent', v: data.referrals.sent },
                { l: 'Received', v: data.referrals.received },
                { l: 'Completed', v: data.referrals.completed },
                { l: 'Pending', v: data.referrals.pending },
                { l: 'External', v: data.referrals.external },
              ].map((r) => (
                <Card key={r.l} className="!p-3 text-center">
                  <div className="text-xs text-muted-foreground">{r.l}</div>
                  <div className="text-xl font-bold">{r.v}</div>
                </Card>
              ))}
            </div>)}
          </AnalyticsTabGate>
        </TabsContent>

        <TabsContent value="export">
          {!apiOn ? (
            <PendingIntegrationBanner reason="Exports require loaded analytics from the backend. Set VITE_USE_API=true and VITE_API_BASE_URL to enable GET /api/doctor/analytics." />
          ) : loading && !data ? (
            <Card className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics for export…
            </Card>
          ) : error && !data ? (
            <Card className="flex flex-wrap items-center justify-between gap-2 border-rose-200 bg-rose-50/50">
              <p className="text-sm text-rose-800">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
            </Card>
          ) : !data ? (
            <Card><p className="text-sm text-muted-foreground">No analytics data available to export.</p></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {['Full doctor analytics', 'Consultation report', 'Patient report', 'Diagnosis report', 'Prescription report', 'Investigation report', 'Admission/discharge report', 'Referral report'].map((r) => (
                <Card key={r}>
                  <div className="font-medium text-sm mb-2">{r}</div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => exportData(r, 'CSV')}>CSV</Button>
                    <Button size="sm" variant="outline" onClick={() => exportData(r, 'Excel')}>CSV (Excel-compatible)</Button>
                    <Button size="sm" variant="outline" onClick={() => exportData(r, 'PDF')}>PDF</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Report</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Report type</Label>
              <Select value={reportForm.type} onValueChange={(v) => setReportForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Full doctor analytics', 'Consultation report', 'Diagnosis report', 'Prescription report'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>From</Label><Input type="date" value={reportForm.dateFrom} onChange={(e) => setReportForm((f) => ({ ...f, dateFrom: e.target.value }))} /></div>
              <div><Label>To</Label><Input type="date" value={reportForm.dateTo} onChange={(e) => setReportForm((f) => ({ ...f, dateTo: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Clinic</Label>
              <Select value={reportForm.clinic} onValueChange={(v) => setReportForm((f) => ({ ...f, clinic: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="OPC">OPC</SelectItem>
                  <SelectItem value="GMPC">GMPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Doctor</Label><Input value={reportForm.doctor} onChange={(e) => setReportForm((f) => ({ ...f, doctor: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={reportForm.charts} onCheckedChange={(v) => setReportForm((f) => ({ ...f, charts: !!v }))} /><Label>Include charts</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={reportForm.patientLevel} onCheckedChange={(v) => setReportForm((f) => ({ ...f, patientLevel: !!v }))} /><Label>Include patient-level data</Label></div>
            <div>
              <Label>Format</Label>
              <Select value={reportForm.format} onValueChange={(v) => setReportForm((f) => ({ ...f, format: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="Excel">CSV (Excel-compatible)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                exportData(reportForm.type, reportForm.format as 'CSV' | 'Excel' | 'PDF');
                setReportOpen(false);
              }}
              disabled={!data}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!consultDrawer} onOpenChange={(o) => !o && setConsultDrawer(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Consultation Summary</SheetTitle>
            <SheetDescription>{consultDrawer?.patient}</SheetDescription>
          </SheetHeader>
          {consultDrawer && (
            <dl className="text-sm space-y-2 mt-4">
              {([
                ['Date', consultDrawer.date],
                ['Hospital No.', consultDrawer.hospitalId],
                ['Clinic', consultDrawer.clinic],
                ['Visit', consultDrawer.visitType],
                ['Duration', consultDrawer.duration],
                ['Outcome', consultDrawer.outcome],
                ['Payment', consultDrawer.payment],
              ] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
          <div className="flex gap-2 mt-4">
            {consultDrawer && <Button size="sm" onClick={() => openPatient(consultDrawer)}>Open Timeline</Button>}
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print Summary</Button>
          </div>
        </SheetContent>
      </Sheet>
    </Shell>
  );
};

export default DoctorAnalytics;
