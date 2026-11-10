import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useBillingStore } from '@/contexts/BillingStore';
import { useLabFlow, statusTone, STATUS_LABEL, isCollectionReady, newSampleId, type LabFlowRequest, type LabFlowStatus } from '@/contexts/LabFlowStore';
import { db } from '@/db/database';
import { LoadingButton } from '@/components/LoadingButton';
import { DbBootGate } from '@/components/DbBootGate';
import { notify } from '@/lib/notify';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';
import { InpatientLabCard } from '@/components/inpatient/InpatientDemoPanels';
import { labResultTemplates, getTemplate, type ResultTemplate } from '@/lab/templates';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api/client';
import {
  emptyLabOverviewKpis,
  emptyLabOverviewPendingTasks,
  fetchLabOverview,
  isLaboratoryApiEnabled,
  type LabOverviewActivity,
  type LabOverviewAlert,
  type LabOverviewKpis,
  type LabOverviewPendingTasks,
} from '@/lib/api/laboratory';
import {
  LayoutDashboard, FlaskConical, Search, ClipboardList, QrCode, Microscope, FilePlus, FileSignature,
  CheckCircle2, ShieldCheck, History, Beaker, FileText, BarChart3, MessageSquare, ScrollText, Smartphone,
  CreditCard, Star, AlertTriangle, Printer, Receipt, PenSquare, Activity, Droplets, TestTube2,
  Pill, ShieldAlert, UserPlus, Send, TrendingUp, FileEdit, Archive, Clock, Settings2, BookOpen,
  Calculator, Tag, BadgeCheck, Save, Eye, ArrowRight, Download, Filter, ChevronLeft, ChevronRight,
  Paperclip, Bell, Plus, Trash2, X, Loader2, RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';
import { labCatalog, labRequestsFull, labStaff, labDevices } from '@/data/labData';
import { labBase as base, labCenterNav } from './lab/labCenterNav';

export { LabRequestCenter } from './LabRequestCenterPage';
export { LabWalkInWorkflow } from './LabWalkInWorkflowPage';
export { LabComms } from './LabCommsPage';
export { labCenterNav } from './lab/labCenterNav';

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={labCenterNav} title={`Laboratory · ${title}`}><DbBootGate>{children}</DbBootGate></DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">{desc}</p>
      </div>
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red':
    case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

// ----- Download helpers (real downloads, mock PDF as text blob) -----
const triggerDownload = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const downloadPdf = (filename: string, lines: string[], title = 'Laboratory Report') => {
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    // Header band
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageW, 72, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('GFA Demo Hospital', 40, 32);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text('Abeokuta · Laboratory Information System', 40, 50);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 64);
    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(title, 40, 104);
    doc.setDrawColor(200); doc.line(40, 112, pageW - 40, 112);
    // Body
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    let y = 132;
    lines.forEach((ln) => {
      const wrapped = doc.splitTextToSize(String(ln || ''), pageW - 80);
      wrapped.forEach((w: string) => {
        if (y > 780) { doc.addPage(); y = 60; }
        doc.text(w, 40, y); y += 16;
      });
    });
    // Footer
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text('This is a system-generated document from GFA HMS LIS.', 40, 820);
    doc.save(filename);
    toast.success(`${filename} downloaded`);
  } catch (e) {
    toast.error('Could not generate PDF');
  }
};
const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  triggerDownload(filename, csv, 'text/csv');
  toast.success(`${filename} downloaded`);
};
const printDoc = (title = 'Lab Document') => {
  const w = window.open('', '_blank');
  if (!w) { toast.error('Pop-up blocked — please allow pop-ups'); return; }
  w.document.write(`<html><head><title>${title}</title></head><body><h1>${title}</h1><p>Sent to printer by GFA HMS Laboratory.</p></body></html>`);
  w.document.close();
  w.print();
  toast.success('Sent to printer');
};

// ----- Reusable Success Popup -----
const SuccessDialog = ({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children?: React.ReactNode; footer?: React.ReactNode }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CheckCircle2 className="h-6 w-6" /></div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </div>
      </DialogHeader>
      {children}
      {footer && <DialogFooter className="gap-2 flex-wrap">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);

// ----- Smart template-driven result entry (used by Walk-In + Result Entry) -----
// Auto-matches each cart test to a result template (HIV, HBsAg, BG, Malaria etc.)
// Falls back to numeric/text entry if no template matches.
const matchTemplate = (testName: string, code?: string): ResultTemplate | null => {
  const n = (testName + ' ' + (code || '')).toLowerCase();
  if (/hiv/.test(n)) return getTemplate('tpl-hiv') || null;
  if (/hbsag|hep.?b/.test(n)) return getTemplate('tpl-hbsag') || null;
  if (/hcv|hep.?c/.test(n)) return getTemplate('tpl-hcv') || null;
  if (/blood group|abo|rhesus|\bbg\b/.test(n)) return getTemplate('tpl-bloodgroup') || null;
  if (/genotype|\bgen\b/.test(n)) return getTemplate('tpl-genotype') || null;
  if (/pregnan|hcg/.test(n)) return getTemplate('tpl-pregnancy') || null;
  if (/malaria|\bmp\b/.test(n)) return getTemplate('tpl-malaria') || null;
  if (/drug|urine.?screen|udsa/.test(n)) return getTemplate('tpl-udsa') || null;
  if (/culture|sensitivity|mcs/.test(n)) return getTemplate('tpl-culture') || null;
  if (/seminal|sfa/.test(n)) return getTemplate('tpl-sfa') || null;
  if (/full blood count|\bfbc\b/.test(n)) return getTemplate('tpl-fbc') || null;
  if (/histo|biopsy/.test(n)) return getTemplate('tpl-histopath') || null;
  return null;
};

interface SmartTest { code: string; name: string; refRange?: string; }

const SmartResultEntry = ({ tests, values, onChange, onLoadTemplate }: {
  tests: SmartTest[];
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  onLoadTemplate?: (code: string, tplId: string) => void;
}) => (
  <div className="space-y-4">
    {tests.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No tests selected — add tests first.</div>}
    {tests.map(t => {
      const tpl = matchTemplate(t.name, t.code);
      const v = values[t.code] || {};
      return (
        <div key={t.code} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.code}{tpl ? ` · Template: ${tpl.name}` : ' · Free entry'}</div>
            </div>
            {tpl && (
              <Button size="sm" variant="outline" onClick={() => { onLoadTemplate?.(t.code, tpl.id); toast.success(`Template "${tpl.name}" loaded`); }}>
                <BookOpen className="h-3 w-3 mr-1" />Load Template
              </Button>
            )}
          </div>
          {tpl ? (
            <div className="grid grid-cols-2 gap-3">
              {tpl.fields.map(f => (
                <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                  <Label>{f.label}{f.required && <span className="text-rose-600"> *</span>}{f.unit ? ` (${f.unit})` : ''}</Label>
                  {f.type === 'select' ? (
                    <Select value={v[f.key] || ''} onValueChange={(val) => onChange({ ...values, [t.code]: { ...v, [f.key]: val } })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{f.options!.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.type === 'textarea' ? (
                    <Textarea rows={2} value={v[f.key] || ''} onChange={e => onChange({ ...values, [t.code]: { ...v, [f.key]: e.target.value } })} />
                  ) : (
                    <Input type={f.type === 'number' ? 'number' : 'text'} value={v[f.key] || ''} onChange={e => onChange({ ...values, [t.code]: { ...v, [f.key]: e.target.value } })} />
                  )}
                  {f.ref && <div className="text-xs text-muted-foreground mt-1">Ref: {f.ref}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Result</Label><Input value={v.value || ''} onChange={e => onChange({ ...values, [t.code]: { ...v, value: e.target.value } })} /></div>
              <div><Label>Reference</Label><Input value={t.refRange || v.range || ''} readOnly className="bg-muted/30" /></div>
              <div className="col-span-2"><Label>Comment</Label><Textarea rows={2} value={v.comment || ''} onChange={e => onChange({ ...values, [t.code]: { ...v, comment: e.target.value } })} /></div>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const WalkInResultEntry = ({ cart, onDraft, onSubmit }: {
  cart: { code: string; name: string; refRange?: string }[];
  onDraft: () => void;
  onSubmit: () => void;
}) => {
  const [values, setValues] = useState<Record<string, any>>({});
  return (
    <div>
      <SmartResultEntry tests={cart} values={values} onChange={setValues} />
      <div className="mt-3"><Label>Overall Interpretation / Comments</Label><Textarea rows={2} /></div>
      <div className="flex gap-2 justify-end mt-3 flex-wrap">
        <Button variant="outline" onClick={() => { toast.success('Draft saved'); onDraft(); }}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
        <Button variant="outline" onClick={() => printDoc('Result Draft')}><Printer className="h-4 w-4 mr-1" />Print Draft</Button>
        <Button onClick={() => { toast.success('Result submitted'); onSubmit(); }}><Send className="h-4 w-4 mr-1" />Submit For Validation</Button>
      </div>
    </div>
  );
};



// ====================================================================
// 1. LAB DASHBOARD
// ====================================================================
const overviewActivityTone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rose':
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const LabCenterDashboard = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<LabOverviewKpis>(emptyLabOverviewKpis);
  const [activity, setActivity] = useState<LabOverviewActivity[]>([]);
  const [alerts, setAlerts] = useState<LabOverviewAlert[]>([]);
  const [tasks, setTasks] = useState<LabOverviewPendingTasks>(emptyLabOverviewPendingTasks);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setKpis(emptyLabOverviewKpis());
      setActivity([]);
      setAlerts([]);
      setTasks(emptyLabOverviewPendingTasks());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLabOverview({
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        recentLimit: 8,
      });
      setKpis(data.kpis ?? emptyLabOverviewKpis());
      setActivity(data.recentActivity ?? []);
      setAlerts(data.criticalAlerts ?? []);
      setTasks(data.pendingTasks ?? emptyLabOverviewPendingTasks());
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load laboratory dashboard';
      setError(msg);
      setKpis(emptyLabOverviewKpis());
      setActivity([]);
      setAlerts([]);
      setTasks(emptyLabOverviewPendingTasks());
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
    <Shell title="Enterprise Laboratory Dashboard">
      <DepartmentReportBox department="Laboratory" officer="Mr. Sola Adebanjo" />
      <InpatientLabCard />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Live laboratory operations overview{loading ? ' · loading…' : ''}.
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
        <SummaryCard title="Requests Today" value={kpiValue(kpis.requestsToday)} icon={FlaskConical} />
        <SummaryCard title="Pending Requests" value={kpiValue(kpis.pendingRequests)} icon={Clock} />
        <SummaryCard title="Awaiting Collection" value={kpiValue(kpis.awaitingCollection)} icon={QrCode} />
        <SummaryCard title="Samples Collected" value={kpiValue(kpis.samplesCollected)} icon={Beaker} />
        <SummaryCard title="Awaiting Validation" value={kpiValue(kpis.awaitingValidation)} icon={FileSignature} />
        <SummaryCard title="Released" value={kpiValue(kpis.released)} icon={CheckCircle2} />
        <SummaryCard title="Emergency" value={kpiValue(kpis.emergency)} icon={ShieldAlert} />
        <SummaryCard
          title="Revenue Today"
          value={loading && !error ? '…' : formatCurrency(kpis.revenueToday)}
          icon={TrendingUp}
        />
      </div>

      <Card className="mb-6">
        <Section icon={<Activity className="h-5 w-5" />} title="Quick Actions" desc="One-tap entry to the most common laboratory workflows." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'New Walk-In', icon: <UserPlus />, to: `${base}/walk-in` },
            { label: 'New Request', icon: <FilePlus />, to: `${base}/requests` },
            { label: 'Collect Sample', icon: <QrCode />, to: `${base}/samples` },
            { label: 'Enter Result', icon: <PenSquare />, to: `${base}/results` },
            { label: 'Validate Result', icon: <FileSignature />, to: `${base}/validation` },
            { label: 'View Reports', icon: <ScrollText />, to: `${base}/reports` },
          ].map(a => (
            <a key={a.label} href={a.to} className="rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 p-4 flex flex-col items-start gap-2 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{a.icon}</div>
              <div className="text-sm font-medium">{a.label}</div>
            </a>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <Section icon={<ClipboardList className="h-5 w-5" />} title="Recent Activity" desc="Most recent laboratory requests across all units." />
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Charge</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {loading && activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading activity…</span>
                  </TableCell>
                </TableRow>
              ) : activity.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No lab requests yet.</TableCell></TableRow>
              ) : activity.map(r => (
                <TableRow key={r.labRequestId}>
                  <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{r.testSummary}</TableCell>
                  <TableCell>{formatCurrency(r.charge)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={overviewActivityTone(r.statusTone)}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <div className="space-y-4">
          <Card>
            <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Alerts" desc="Immediate clinician attention." />
            <div className="space-y-2">
              {loading && alerts.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">No critical or STAT alerts.</div>
              ) : alerts.map(a => (
                <div key={a.id} className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {a.message}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Pending Tasks</h3>
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span>Samples to collect</span><Badge variant="outline">{tasks.samplesToCollect}</Badge></li>
              <li className="flex justify-between"><span>Results to enter</span><Badge variant="outline">{tasks.resultsToEnter}</Badge></li>
              <li className="flex justify-between"><span>Awaiting validation</span><Badge variant="outline">{tasks.awaitingValidation}</Badge></li>
              <li className="flex justify-between"><span>EMR sync queue</span><Badge variant="outline">{tasks.emrSyncQueue}</Badge></li>
            </ul>
          </Card>
        </div>
      </div>
    </Shell>
  );
};

// ====================================================================
// Patient picker (reusable)
// ====================================================================
const recentPatients = db.patients.list().map(p => ({
  id: p.hospitalId,
  name: p.name,
  age: p.age ?? 0,
  gender: p.sex,
  phone: p.phone,
}));

const PatientPicker = ({ onSelect }: { onSelect: (p: { id: string; name: string; age: number; gender: string }) => void }) => {
  const [q, setQ] = useState('');
  const list = recentPatients.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.id.toLowerCase().includes(q.toLowerCase()) ||
    p.phone.includes(q)
  );
  return (
    <div>
      <Input className="mb-3" placeholder="Search by hospital number, phone or name…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y">
        {list.map(p => (
          <button key={p.id} onClick={() => onSelect(p)} className="w-full text-left p-3 hover:bg-muted/40 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.id} · {p.gender} · {p.age}y · {p.phone}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        {list.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No patient found.</div>}
      </div>
    </div>
  );
};

// ====================================================================
// 2. UNIFIED LAB REQUEST CENTER — patient-first, doctor requests only
// ====================================================================
type RCTab = 'pending' | 'billing' | 'awaiting' | 'paid' | 'ready' | 'rejected';

export const LegacyLabRequestCenter = () => {
  const flow = useLabFlow();
  const navigate = useNavigate();
  const [picker, setPicker] = useState(false);
  const [patient, setPatient] = useState<{ id: string; name: string; age: number; gender: string } | null>(null);
  const [tab, setTab] = useState<RCTab>('pending');
  const [confirmSend, setConfirmSend] = useState<LabFlowRequest | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<LabFlowRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewing, setViewing] = useState<LabFlowRequest | null>(null);
  const [labBusy, setLabBusy] = useState<string | null>(null);

  const withLabLoading = async (
    key: string,
    pending: string,
    action: () => void,
    successMessage?: string | (() => string),
  ) => {
    if (labBusy) return;
    setLabBusy(key);
    notify.loading(key, pending);
    await new Promise(r => setTimeout(r, 80));
    try {
      action();
      if (successMessage) {
        const msg = typeof successMessage === 'function' ? successMessage() : successMessage;
        notify.success(key, msg);
      } else {
        notify.dismiss(key);
      }
    } catch (e) {
      notify.error(key, e instanceof Error ? e.message : 'Laboratory action failed — please try again');
    } finally {
      setLabBusy(null);
    }
  };

  // Counts (all patients)
  const all = flow.requests.filter(r => r.source === 'Doctor');
  const allCounts = useMemo(() => ({
    pending: all.filter(r => r.status === 'PENDING_DOCTOR').length,
    billing: all.filter(r => r.status === 'SENT_TO_BILLING').length,
    awaiting: all.filter(r => ['AWAITING_PAYMENT', 'NHIA_PENDING', 'HMO_PENDING'].includes(r.status)).length,
    paid: all.filter(r => ['PAID', 'NHIA_APPROVED', 'HMO_APPROVED', 'WAIVED'].includes(r.status)).length,
    rejected: all.filter(r => ['REJECTED', 'CANCELLED'].includes(r.status)).length,
  }), [all]);

  // Patient-scoped lists
  const forPatient = patient ? all.filter(r => r.hospitalNo === patient.id || r.patientName === patient.name) : [];

  const tabFilter = (r: LabFlowRequest): boolean => {
    switch (tab) {
      case 'pending': return r.status === 'PENDING_DOCTOR';
      case 'billing': return r.status === 'SENT_TO_BILLING';
      case 'awaiting': return r.status === 'AWAITING_PAYMENT' || r.status === 'NHIA_PENDING' || r.status === 'HMO_PENDING';
      case 'paid': return ['PAID', 'NHIA_APPROVED', 'HMO_APPROVED', 'WAIVED'].includes(r.status);
      case 'ready': return isCollectionReady(r.status);
      case 'rejected': return r.status === 'REJECTED' || r.status === 'CANCELLED';
    }
  };

  const rows = forPatient.filter(tabFilter);

  const totalAmount = (r: LabFlowRequest) => r.tests.reduce((s, t) => s + t.price, 0);

  return (
    <Shell title="Unified Laboratory Request Center">
      <Section icon={<Search className="h-5 w-5" />} title="Doctor Lab Requisitions"
        desc="Select a patient to see only the laboratory tests requested by their doctor. Send to Billing → Payment → Sample Collection."
        action={<Badge variant="outline" className={tone('blue')}>Patient-First Flow</Badge>} />

      {/* Global counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending Doctor Requests" value={String(allCounts.pending)} icon={ClipboardList} />
        <SummaryCard title="Sent to Billing" value={String(allCounts.billing)} icon={Send} />
        <SummaryCard title="Awaiting Payment" value={String(allCounts.awaiting)} icon={Clock} />
        <SummaryCard title="Paid / Approved" value={String(allCounts.paid)} icon={CheckCircle2} />
        <SummaryCard title="Rejected / Cancelled" value={String(allCounts.rejected)} icon={X} />
      </div>

      {/* Patient selector */}
      <Card className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><UserPlus className="h-5 w-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">Selected patient</div>
            {patient ? (
              <div className="font-semibold">{patient.name} <span className="text-muted-foreground text-xs">· {patient.id} · {patient.gender} · {patient.age}y</span></div>
            ) : (
              <div className="text-sm text-muted-foreground">No patient selected — only this patient's doctor-requisitioned tests will appear.</div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {patient && <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>Clear</Button>}
          <Button variant="outline" onClick={() => setPicker(true)}><Search className="h-4 w-4 mr-1" />Select Patient</Button>
          <Button variant="outline" onClick={() => navigate(`${base}/walk-in`)}><UserPlus className="h-4 w-4 mr-1" />New Walk-In</Button>
        </div>
      </Card>

      {!patient ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <div className="font-medium mb-1">Select a patient to begin</div>
            <div className="text-sm">After selection, only the doctor's pending laboratory requisitions for that patient will be listed here.</div>
            <Button className="mt-4" onClick={() => setPicker(true)}><Search className="h-4 w-4 mr-1" />Select Patient</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Tabs value={tab} onValueChange={(v) => setTab(v as RCTab)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="pending">Pending Doctor Requests</TabsTrigger>
              <TabsTrigger value="billing">Sent to Billing</TabsTrigger>
              <TabsTrigger value="awaiting">Awaiting Payment</TabsTrigger>
              <TabsTrigger value="paid">Paid / Approved</TabsTrigger>
              <TabsTrigger value="ready">Sample Collection Ready</TabsTrigger>
              <TabsTrigger value="rejected">Rejected / Cancelled</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Dept / Ward</TableHead>
                    <TableHead>Requested Tests</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>NHIA/HMO</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                        No requisitions in this category for {patient.name}.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>{r.doctor}</TableCell>
                      <TableCell className="text-sm">{r.department}{r.ward ? ` · ${r.ward}` : ''}</TableCell>
                      <TableCell className="text-sm">{r.tests.map(t => t.name).join(', ')}</TableCell>
                      <TableCell><Badge variant="outline" className={tone(r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky')}>{r.priority}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                      <TableCell className="text-xs">{r.paymentType || '—'}{r.nhia?.authCode ? ` · ${r.nhia.authCode}` : ''}{r.hmo?.name ? ` · ${r.hmo.name}` : ''}</TableCell>
                      <TableCell className="text-xs">{r.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => setViewing(r)}><Eye className="h-3 w-3" /></Button>
                          {r.status === 'PENDING_DOCTOR' && (
                            <Button size="sm" onClick={() => setConfirmSend(r)}><Send className="h-3 w-3 mr-1" />Send to Billing</Button>
                          )}
                          {isCollectionReady(r.status) && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/samples`)}><QrCode className="h-3 w-3 mr-1" />Collect</Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Print requisition" onClick={() => printDoc(`Requisition ${r.id}`)}><Printer className="h-3 w-3" /></Button>
                          {(r.status === 'PENDING_DOCTOR' || r.status === 'SENT_TO_BILLING') && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" title="Cancel" onClick={() => setConfirmCancel(r)}><X className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </Card>
      )}

      {/* Patient picker */}
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Patient</DialogTitle>
            <DialogDescription>Only this patient's doctor-requested laboratory tests will be listed.</DialogDescription>
          </DialogHeader>
          <PatientPicker onSelect={(p) => {
            setPatient(p); setPicker(false);
            toast.success(`Patient ${p.name} selected — showing doctor requests only.`);
          }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPicker(false); navigate(`${base}/walk-in`); }}><UserPlus className="h-4 w-4 mr-1" />New Walk-In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to billing confirm */}
      <Dialog open={!!confirmSend} onOpenChange={(o) => !o && setConfirmSend(null)}>
        <DialogContent>
          {confirmSend && (
            <>
              <DialogHeader>
                <DialogTitle>Send to Billing?</DialogTitle>
                <DialogDescription>Send this laboratory requisition to billing for payment / approval?</DialogDescription>
              </DialogHeader>
              <div className="text-sm border rounded-lg p-3 bg-muted/30 space-y-1">
                <div className="flex justify-between"><span>Request ID</span><span className="font-mono">{confirmSend.id}</span></div>
                <div className="flex justify-between"><span>Patient</span><span>{confirmSend.patientName}</span></div>
                <div className="flex justify-between"><span>Doctor</span><span>{confirmSend.doctor}</span></div>
                <div className="flex justify-between"><span>Tests</span><span>{confirmSend.tests.length}</span></div>
                <div className="flex justify-between"><span>Total</span><span className="font-semibold">{formatCurrency(totalAmount(confirmSend))}</span></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmSend(null)}>Cancel</Button>
                <LoadingButton loading={labBusy === 'lab-send'} loadingText="Sending…" onClick={() => withLabLoading('lab-send', `Sending ${confirmSend.id} to billing…`, () => {
                  flow.sendToBilling(confirmSend.id, 'Lab Officer');
                  setConfirmSend(null);
                  setTab('billing');
                })}>
                  <Send className="h-4 w-4 mr-1" />Send to Billing
                </LoadingButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <DialogContent>
          {confirmCancel && (
            <>
              <DialogHeader><DialogTitle>Cancel Request {confirmCancel.id}?</DialogTitle><DialogDescription>State a reason for cancellation.</DialogDescription></DialogHeader>
              <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason…" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmCancel(null)}>Back</Button>
                <Button variant="destructive" disabled={!cancelReason.trim()} onClick={() => { flow.cancel(confirmCancel.id, cancelReason, 'Lab Officer'); setConfirmCancel(null); setCancelReason(''); }}>Confirm Cancellation</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View drawer / dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Requisition {viewing.id}</DialogTitle>
                <DialogDescription>{viewing.patientName} · {viewing.hospitalNo} · {viewing.doctor} · {viewing.department}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Priority</div><Badge variant="outline" className={tone(viewing.priority === 'Stat' ? 'rose' : viewing.priority === 'Urgent' ? 'amber' : 'sky')}>{viewing.priority}</Badge></div>
                <div><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline" className={statusTone(viewing.status)}>{STATUS_LABEL[viewing.status]}</Badge></div>
                <div className="col-span-2"><div className="text-xs text-muted-foreground">Clinical note</div><div>{viewing.clinicalNote || '—'}</div></div>
              </div>
              <div>
                <div className="text-sm font-semibold mt-2 mb-1">Requested tests</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.tests.map(t => <TableRow key={t.code}><TableCell>{t.name}</TableCell><TableCell className="text-right">{formatCurrency(t.price)}</TableCell></TableRow>)}
                    <TableRow><TableCell className="font-semibold">Total</TableCell><TableCell className="text-right font-semibold text-primary">{formatCurrency(totalAmount(viewing))}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
              <div>
                <div className="text-sm font-semibold mt-2 mb-1 flex items-center gap-1"><History className="h-4 w-4" /> Audit trail</div>
                <div className="space-y-1 max-h-[160px] overflow-y-auto">
                  {viewing.audit.map((a, i) => (
                    <div key={i} className="text-xs flex items-center justify-between border rounded px-2 py-1">
                      <span><span className="font-semibold">{a.action}</span> · {a.by}</span>
                      <span className="text-muted-foreground">{a.at}</span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => printDoc(`Requisition ${viewing.id}`)}><Printer className="h-4 w-4 mr-1" />Print Requisition</Button>
                {viewing.status === 'PENDING_DOCTOR' && (
                  <Button onClick={() => { setConfirmSend(viewing); setViewing(null); }}><Send className="h-4 w-4 mr-1" />Send to Billing</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ====================================================================
// 3. LAB BILLING — multi-tab (cash/NHIA/HMO/waived) wired to LabFlowStore
// ====================================================================
type BillingTab = 'awaiting_billing' | 'awaiting_payment' | 'paid' | 'nhia_pending' | 'nhia_approved' | 'hmo_pending' | 'hmo_approved' | 'waived' | 'cancelled';

export const LabBillingInterface = () => {
  const flow = useLabFlow();
  const navigate = useNavigate();
  const [labBusy, setLabBusy] = useState<string | null>(null);

  const withLabLoading = async (
    key: string,
    pending: string,
    action: () => void,
    successMessage?: string | (() => string),
  ) => {
    if (labBusy) return;
    setLabBusy(key);
    notify.loading(key, pending);
    await new Promise(r => setTimeout(r, 80));
    try {
      action();
      if (successMessage) {
        const msg = typeof successMessage === 'function' ? successMessage() : successMessage;
        notify.success(key, msg);
      } else {
        notify.dismiss(key);
      }
    } catch (e) {
      notify.error(key, e instanceof Error ? e.message : 'Laboratory action failed — please try again');
    } finally {
      setLabBusy(null);
    }
  };
  const [tab, setTab] = useState<BillingTab>('awaiting_billing');
  const [q, setQ] = useState('');

  // modals
  const [payFor, setPayFor] = useState<LabFlowRequest | null>(null);
  const [nhiaFor, setNhiaFor] = useState<LabFlowRequest | null>(null);
  const [approveNhiaFor, setApproveNhiaFor] = useState<LabFlowRequest | null>(null);
  const [hmoFor, setHmoFor] = useState<LabFlowRequest | null>(null);
  const [approveHmoFor, setApproveHmoFor] = useState<LabFlowRequest | null>(null);
  const [waiveFor, setWaiveFor] = useState<LabFlowRequest | null>(null);
  const [viewing, setViewing] = useState<LabFlowRequest | null>(null);
  const [receiptFor, setReceiptFor] = useState<LabFlowRequest | null>(null);

  const [payForm, setPayForm] = useState({ amount: 0, method: 'Cash' as 'Cash'|'POS'|'Transfer'|'Wallet', ref: '', cashier: 'Cashier Kemi', date: new Date().toISOString().slice(0, 10) });
  const [nhiaForm, setNhiaForm] = useState({ number: '', authCode: '' });
  const [nhiaApproval, setNhiaApproval] = useState({ number: '', hmoName: '', authCode: '', covered: '', nonCovered: '', copay: 0, status: 'Approved', approvedBy: 'NHIA Desk', date: new Date().toISOString().slice(0, 10) });
  const [hmoForm, setHmoForm] = useState({ name: 'AXA Mansard' });
  const [hmoApproval, setHmoApproval] = useState({ name: 'AXA Mansard', authCode: '', covered: '', nonCovered: '', copay: 0, approvedBy: 'HMO Desk' });
  const [waiveReason, setWaiveReason] = useState('Indigent patient');

  const all = flow.requests;
  const totalAmount = (r: LabFlowRequest) => r.tests.reduce((s, t) => s + t.price, 0);

  const counts = useMemo(() => ({
    awaiting_billing: all.filter(r => r.status === 'SENT_TO_BILLING').length,
    awaiting_payment: all.filter(r => r.status === 'AWAITING_PAYMENT').length,
    paid_today: all.filter(r => r.status === 'PAID').length,
    nhia_pending: all.filter(r => r.status === 'NHIA_PENDING').length,
    hmo_pending: all.filter(r => r.status === 'HMO_PENDING').length,
    outstanding: all.filter(r => r.status === 'AWAITING_PAYMENT').reduce((s, r) => s + totalAmount(r), 0),
    revenue_today: all.filter(r => r.status === 'PAID').reduce((s, r) => s + totalAmount(r), 0),
  }), [all]);

  const filtered = useMemo(() => {
    const byTab = (r: LabFlowRequest) => {
      switch (tab) {
        case 'awaiting_billing': return r.status === 'SENT_TO_BILLING';
        case 'awaiting_payment': return r.status === 'AWAITING_PAYMENT';
        case 'paid': return r.status === 'PAID';
        case 'nhia_pending': return r.status === 'NHIA_PENDING';
        case 'nhia_approved': return r.status === 'NHIA_APPROVED';
        case 'hmo_pending': return r.status === 'HMO_PENDING';
        case 'hmo_approved': return r.status === 'HMO_APPROVED';
        case 'waived': return r.status === 'WAIVED';
        case 'cancelled': return r.status === 'CANCELLED';
      }
    };
    return all.filter(r => byTab(r) && (q === '' || `${r.patientName} ${r.id} ${r.invoiceNo || ''}`.toLowerCase().includes(q.toLowerCase())));
  }, [all, tab, q]);

  const openPay = (r: LabFlowRequest) => { setPayFor(r); setPayForm(f => ({ ...f, amount: totalAmount(r), method: 'Cash', ref: '' })); };
  const openNhia = (r: LabFlowRequest) => { setNhiaFor(r); setNhiaForm({ number: r.nhia?.number || '', authCode: '' }); };
  const openApproveNhia = (r: LabFlowRequest) => { setApproveNhiaFor(r); setNhiaApproval(a => ({ ...a, number: r.nhia?.number || '', authCode: '', covered: r.tests.map(t => t.name).join(', '), nonCovered: '', copay: 0 })); };
  const openHmo = (r: LabFlowRequest) => { setHmoFor(r); setHmoForm({ name: r.hmo?.name || 'AXA Mansard' }); };
  const openApproveHmo = (r: LabFlowRequest) => { setApproveHmoFor(r); setHmoApproval({ name: r.hmo?.name || 'AXA Mansard', authCode: '', covered: r.tests.map(t => t.name).join(', '), nonCovered: '', copay: 0, approvedBy: 'HMO Desk' }); };

  const ensureInvoice = async (r: LabFlowRequest) => {
    if (r.invoiceNo) return r.invoiceNo;
    let inv = '';
    await withLabLoading(`inv-${r.id}`, `Generating invoice for ${r.id}…`, () => {
      inv = flow.generateInvoice(r.id, 'Cashier');
    }, () => inv ? `Invoice ${inv} generated for ${r.patientName} (${r.id}) — ready for payment.` : 'Invoice generated.');
    return inv;
  };

  return (
    <Shell title="Laboratory Billing">
      <Section icon={<CreditCard className="h-5 w-5" />} title="Lab Billing Workstation"
        desc="Receive requisitions from the Request Center and Walk-In Workflow. Capture payments, NHIA/HMO approvals and waivers."
        action={<Button variant="outline" onClick={() => navigate(`${base}/requests`)}><ChevronLeft className="h-4 w-4 mr-1" />Request Center</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Awaiting Billing" value={String(counts.awaiting_billing)} icon={Send} />
        <SummaryCard title="Awaiting Payment" value={String(counts.awaiting_payment)} icon={Clock} />
        <SummaryCard title="Paid Today" value={String(counts.paid_today)} icon={CheckCircle2} />
        <SummaryCard title="NHIA Pending" value={String(counts.nhia_pending)} icon={ShieldCheck} />
        <SummaryCard title="HMO Pending" value={String(counts.hmo_pending)} icon={ShieldCheck} />
        <SummaryCard title="Outstanding Bills" value={formatCurrency(counts.outstanding)} icon={AlertTriangle} />
        <SummaryCard title="Revenue Today" value={formatCurrency(counts.revenue_today)} icon={TrendingUp} />
      </div>

      <Card>
        <Tabs value={tab} onValueChange={(v) => setTab(v as BillingTab)}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="awaiting_billing">Awaiting Billing</TabsTrigger>
              <TabsTrigger value="awaiting_payment">Awaiting Payment</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="nhia_pending">NHIA Pending</TabsTrigger>
              <TabsTrigger value="nhia_approved">NHIA Approved</TabsTrigger>
              <TabsTrigger value="hmo_pending">HMO Pending</TabsTrigger>
              <TabsTrigger value="hmo_approved">HMO Approved</TabsTrigger>
              <TabsTrigger value="waived">Waived</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            <Input placeholder="Search invoice / patient…" value={q} onChange={e => setQ(e.target.value)} className="w-56" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Hospital No</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-10">No invoices in this category.</TableCell></TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.invoiceNo || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.patientName}</TableCell>
                    <TableCell className="text-xs">{r.hospitalNo}</TableCell>
                    <TableCell className="text-xs">{r.source}{r.department ? ` · ${r.department}` : ''}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate" title={r.tests.map(t => t.name).join(', ')}>{r.tests.map(t => t.name).join(', ')}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(totalAmount(r))}</TableCell>
                    <TableCell className="text-xs">{r.paymentType || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs">{r.cashier || '—'}</TableCell>
                    <TableCell className="text-xs">{r.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="View invoice" onClick={() => setViewing(r)}><Eye className="h-3 w-3" /></Button>
                        {r.status === 'SENT_TO_BILLING' && (
                          <LoadingButton size="sm" variant="outline" loading={labBusy === `inv-${r.id}`} loadingText="Generating…" onClick={() => ensureInvoice(r)}><Receipt className="h-3 w-3 mr-1" />Generate Invoice</LoadingButton>
                        )}
                        {r.status === 'AWAITING_PAYMENT' && (
                          <>
                            <Button size="sm" onClick={() => openPay(r)}><CheckCircle2 className="h-3 w-3 mr-1" />Mark as Paid</Button>
                            <Button size="sm" variant="outline" onClick={() => openNhia(r)}><ShieldCheck className="h-3 w-3 mr-1" />NHIA</Button>
                            <Button size="sm" variant="outline" onClick={() => openHmo(r)}><ShieldCheck className="h-3 w-3 mr-1" />HMO</Button>
                            <Button size="sm" variant="ghost" onClick={() => setWaiveFor(r)}>Waive</Button>
                          </>
                        )}
                        {r.status === 'NHIA_PENDING' && (
                          <Button size="sm" onClick={() => openApproveNhia(r)}><ShieldCheck className="h-3 w-3 mr-1" />Approve NHIA</Button>
                        )}
                        {r.status === 'HMO_PENDING' && (
                          <Button size="sm" onClick={() => openApproveHmo(r)}><ShieldCheck className="h-3 w-3 mr-1" />Approve HMO</Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Print invoice" onClick={() => printDoc(`Invoice ${r.invoiceNo || r.id}`)}><Printer className="h-3 w-3" /></Button>
                        {r.status === 'PAID' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Print receipt" onClick={() => setReceiptFor(r)}><Receipt className="h-3 w-3" /></Button>
                        )}
                        {(r.status === 'SENT_TO_BILLING' || r.status === 'AWAITING_PAYMENT') && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" title="Cancel invoice" onClick={() => flow.cancel(r.id, 'Cancelled by cashier', 'Cashier')}><X className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </Card>

      {/* Mark as Paid */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          {payFor && (
            <>
              <DialogHeader><DialogTitle>Mark as Paid · {payFor.invoiceNo}</DialogTitle><DialogDescription>{payFor.patientName} · {formatCurrency(totalAmount(payFor))}</DialogDescription></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount Paid</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
                <div><Label>Payment Method</Label>
                  <Select value={payForm.method} onValueChange={(v: any) => setPayForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Cash','POS','Transfer','Wallet'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Payment Reference</Label><Input value={payForm.ref} onChange={e => setPayForm(f => ({ ...f, ref: e.target.value }))} placeholder="POS slip / Transfer ref / Receipt no." /></div>
                <div><Label>Cashier</Label><Input value={payForm.cashier} onChange={e => setPayForm(f => ({ ...f, cashier: e.target.value }))} /></div>
                <div><Label>Payment Date</Label><Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
                <LoadingButton loading={labBusy === `pay-${payFor.id}`} loadingText="Saving…" onClick={() => withLabLoading(`pay-${payFor.id}`, `Recording ${formatCurrency(payForm.amount)} payment…`, () => {
                  flow.markPaid(payFor.id, payForm);
                  setPayFor(null);
                  setTab('paid');
                })}><CheckCircle2 className="h-4 w-4 mr-1" />Save Payment</LoadingButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit NHIA */}
      <Dialog open={!!nhiaFor} onOpenChange={(o) => !o && setNhiaFor(null)}>
        <DialogContent>
          {nhiaFor && (
            <>
              <DialogHeader><DialogTitle>Submit for NHIA Approval</DialogTitle><DialogDescription>{nhiaFor.patientName} · {nhiaFor.invoiceNo}</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div><Label>NHIA / NHIS Number</Label><Input value={nhiaForm.number} onChange={e => setNhiaForm(f => ({ ...f, number: e.target.value }))} /></div>
                <div><Label>Authorisation Code (optional)</Label><Input value={nhiaForm.authCode} onChange={e => setNhiaForm(f => ({ ...f, authCode: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNhiaFor(null)}>Cancel</Button>
                <Button disabled={!nhiaForm.number} onClick={() => { flow.submitNhia(nhiaFor.id, nhiaForm); setNhiaFor(null); setTab('nhia_pending'); }}>Submit for NHIA</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve NHIA */}
      <Dialog open={!!approveNhiaFor} onOpenChange={(o) => !o && setApproveNhiaFor(null)}>
        <DialogContent className="max-w-xl">
          {approveNhiaFor && (
            <>
              <DialogHeader><DialogTitle>NHIA Approval</DialogTitle><DialogDescription>{approveNhiaFor.patientName} · {approveNhiaFor.invoiceNo}</DialogDescription></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>NHIA Number</Label><Input value={nhiaApproval.number} onChange={e => setNhiaApproval(a => ({ ...a, number: e.target.value }))} /></div>
                <div><Label>HMO Name (if applicable)</Label><Input value={nhiaApproval.hmoName} onChange={e => setNhiaApproval(a => ({ ...a, hmoName: e.target.value }))} /></div>
                <div><Label>Authorisation Code</Label><Input value={nhiaApproval.authCode} onChange={e => setNhiaApproval(a => ({ ...a, authCode: e.target.value }))} /></div>
                <div><Label>Approval Status</Label>
                  <Select value={nhiaApproval.status} onValueChange={(v) => setNhiaApproval(a => ({ ...a, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Approved','Partially Approved','Declined'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Covered Tests</Label><Textarea rows={2} value={nhiaApproval.covered} onChange={e => setNhiaApproval(a => ({ ...a, covered: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Non-Covered Tests</Label><Textarea rows={2} value={nhiaApproval.nonCovered} onChange={e => setNhiaApproval(a => ({ ...a, nonCovered: e.target.value }))} placeholder="Tests not covered will be billed to patient as balance invoice." /></div>
                <div><Label>Copay Amount (₦)</Label><Input type="number" value={nhiaApproval.copay} onChange={e => setNhiaApproval(a => ({ ...a, copay: Number(e.target.value) }))} /></div>
                <div><Label>Approved By</Label><Input value={nhiaApproval.approvedBy} onChange={e => setNhiaApproval(a => ({ ...a, approvedBy: e.target.value }))} /></div>
                <div><Label>Approval Date</Label><Input type="date" value={nhiaApproval.date} onChange={e => setNhiaApproval(a => ({ ...a, date: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveNhiaFor(null)}>Cancel</Button>
                {nhiaApproval.status === 'Declined' ? (
                  <Button variant="destructive" onClick={() => { flow.reject(approveNhiaFor.id, 'NHIA declined', nhiaApproval.approvedBy); setApproveNhiaFor(null); }}>Mark Declined</Button>
                ) : (
                  <Button disabled={!nhiaApproval.authCode} onClick={() => {
                    flow.approveNhia(approveNhiaFor.id, { number: nhiaApproval.number, authCode: nhiaApproval.authCode, copay: nhiaApproval.copay, approvedBy: nhiaApproval.approvedBy });
                    if (nhiaApproval.nonCovered.trim()) toast.success('Balance invoice generated for non-covered tests.');
                    setApproveNhiaFor(null); setTab('nhia_approved');
                  }}>Approve NHIA</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit HMO */}
      <Dialog open={!!hmoFor} onOpenChange={(o) => !o && setHmoFor(null)}>
        <DialogContent>
          {hmoFor && (
            <>
              <DialogHeader><DialogTitle>Submit to HMO</DialogTitle><DialogDescription>{hmoFor.patientName} · {hmoFor.invoiceNo}</DialogDescription></DialogHeader>
              <div><Label>HMO Name</Label>
                <Select value={hmoForm.name} onValueChange={(v) => setHmoForm({ name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['AXA Mansard','Hygeia HMO','Avon HMO','Reliance HMO','Leadway Health','Total Health Trust','Other'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setHmoFor(null)}>Cancel</Button>
                <Button onClick={() => { flow.submitHmo(hmoFor.id, hmoForm); setHmoFor(null); setTab('hmo_pending'); }}>Submit to HMO</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve HMO */}
      <Dialog open={!!approveHmoFor} onOpenChange={(o) => !o && setApproveHmoFor(null)}>
        <DialogContent>
          {approveHmoFor && (
            <>
              <DialogHeader><DialogTitle>HMO Approval</DialogTitle><DialogDescription>{approveHmoFor.patientName} · {approveHmoFor.invoiceNo}</DialogDescription></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>HMO Name</Label><Input value={hmoApproval.name} onChange={e => setHmoApproval(a => ({ ...a, name: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Authorisation Code</Label><Input value={hmoApproval.authCode} onChange={e => setHmoApproval(a => ({ ...a, authCode: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Covered Tests</Label><Textarea rows={2} value={hmoApproval.covered} onChange={e => setHmoApproval(a => ({ ...a, covered: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Non-Covered Tests</Label><Textarea rows={2} value={hmoApproval.nonCovered} onChange={e => setHmoApproval(a => ({ ...a, nonCovered: e.target.value }))} /></div>
                <div><Label>Copay (₦)</Label><Input type="number" value={hmoApproval.copay} onChange={e => setHmoApproval(a => ({ ...a, copay: Number(e.target.value) }))} /></div>
                <div><Label>Approved By</Label><Input value={hmoApproval.approvedBy} onChange={e => setHmoApproval(a => ({ ...a, approvedBy: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveHmoFor(null)}>Cancel</Button>
                <Button disabled={!hmoApproval.authCode} onClick={() => { flow.approveHmo(approveHmoFor.id, { name: hmoApproval.name, authCode: hmoApproval.authCode, approvedBy: hmoApproval.approvedBy }); if (hmoApproval.nonCovered.trim()) toast.success('Balance invoice generated for non-covered tests.'); setApproveHmoFor(null); setTab('hmo_approved'); }}>Approve HMO</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Waive */}
      <Dialog open={!!waiveFor} onOpenChange={(o) => !o && setWaiveFor(null)}>
        <DialogContent>
          {waiveFor && (
            <>
              <DialogHeader><DialogTitle>Waive Payment · {waiveFor.invoiceNo}</DialogTitle><DialogDescription>Indigent / charity / write-off — requires reason.</DialogDescription></DialogHeader>
              <Textarea rows={3} value={waiveReason} onChange={e => setWaiveReason(e.target.value)} placeholder="Reason for waiving payment" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setWaiveFor(null)}>Cancel</Button>
                <Button disabled={!waiveReason.trim()} onClick={() => { flow.waive(waiveFor.id, waiveReason, 'Finance Supervisor'); setWaiveFor(null); setTab('waived'); }}>Waive Payment</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View invoice */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">GFA</div>
                    <div><DialogTitle>Invoice {viewing.invoiceNo || '—'}</DialogTitle><DialogDescription>{viewing.patientName} · {viewing.hospitalNo}</DialogDescription></div>
                  </div>
                  <Badge variant="outline" className={statusTone(viewing.status)}>{STATUS_LABEL[viewing.status]}</Badge>
                </div>
              </DialogHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewing.tests.map(t => <TableRow key={t.code}><TableCell>{t.name}</TableCell><TableCell className="text-right">{formatCurrency(t.price)}</TableCell></TableRow>)}
                  <TableRow><TableCell className="font-semibold">Total</TableCell><TableCell className="text-right font-semibold text-primary">{formatCurrency(totalAmount(viewing))}</TableCell></TableRow>
                </TableBody>
              </Table>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => printDoc(`Invoice ${viewing.invoiceNo}`)}><Printer className="h-4 w-4 mr-1" />Print Invoice</Button>
                {viewing.status === 'PAID' && <Button onClick={() => setReceiptFor(viewing)}><Receipt className="h-4 w-4 mr-1" />Print Receipt</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog open={!!receiptFor} onOpenChange={(o) => !o && setReceiptFor(null)}>
        <DialogContent className="max-w-md">
          {receiptFor && (
            <>
              <DialogHeader><DialogTitle>Receipt · {receiptFor.invoiceNo}</DialogTitle><DialogDescription>{receiptFor.patientName}</DialogDescription></DialogHeader>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>Method</span><span>{receiptFor.paymentType}</span></div>
                <div className="flex justify-between"><span>Reference</span><span>{receiptFor.paymentRef || '—'}</span></div>
                <div className="flex justify-between"><span>Cashier</span><span>{receiptFor.cashier || '—'}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1"><span>Amount</span><span>{formatCurrency(totalAmount(receiptFor))}</span></div>
              </div>
              <DialogFooter>
                <Button onClick={() => printDoc(`Receipt ${receiptFor.invoiceNo}`)}><Printer className="h-4 w-4 mr-1" />Print Receipt</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ====================================================================
// 4. WALK-IN WORKFLOW — with patient search + ongoing cases + finish popup
// ====================================================================
const ongoingCases = [
  { id: 'WLK-2401', patient: 'Bola Ade', stage: 4, stageName: 'Payment Pending' },
  { id: 'WLK-2402', patient: 'Yusuf Ola', stage: 5, stageName: 'Sample Pending' },
  { id: 'WLK-2403', patient: 'Chioma Eze', stage: 6, stageName: 'Result Pending' },
];

export const LegacyLabWalkInWorkflow = () => {
  const [mode, setMode] = useState<'menu' | 'new' | 'existing' | 'continue'>('menu');
  const [step, setStep] = useState(1);
  const [registered, setRegistered] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [paid, setPaid] = useState(false);
  const [collected, setCollected] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [patient, setPatient] = useState({ first: '', last: '', phone: '', gender: '', age: '', dob: '', address: '', referrer: '', reason: '' });
  const [method, setMethod] = useState('Cash');
  const [search, setSearch] = useState('');
  const [labInvoiceId, setLabInvoiceId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { createInvoice } = useBillingStore();

  const steps = ['Registration','Select Tests','Invoice','Payment','Sample Collection','Result Entry','Print Result'];
  const tests = labCatalog;
  const cart = tests.filter(t => selected.includes(t.code));
  const total = cart.reduce((s, t) => s + t.price, 0);
  const filteredTests = tests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()));

  const canAdvance = (() => {
    if (step === 1) return registered;
    if (step === 2) return cart.length > 0;
    if (step === 4) return paid;
    if (step === 5) return collected;
    if (step === 6) return resultSaved;
    return true;
  })();

  const resetWorkflow = () => {
    setMode('menu'); setStep(1); setRegistered(false); setSelected([]); setPaid(false);
    setCollected(false); setResultSaved(false); setFinished(false);
    setPatient({ first: '', last: '', phone: '', gender: '', age: '', dob: '', address: '', referrer: '', reason: '' });
  };

  if (mode === 'menu') {
    return (
      <Shell title="Walk-In Laboratory Workflow">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard title="Walk-Ins Today" value="12" icon={UserPlus} />
          <SummaryCard title="In Progress" value={String(ongoingCases.length)} icon={Clock} />
          <SummaryCard title="Completed" value="8" icon={CheckCircle2} />
          <SummaryCard title="Awaiting Payment" value="3" icon={CreditCard} />
        </div>
        <Section icon={<UserPlus className="h-5 w-5" />} title="Start a Walk-In Workflow" desc="New patient registration, existing patient lookup, or continue an in-progress case." />
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <button onClick={() => { setMode('new'); setStep(1); }} className="rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 p-6 text-left">
            <UserPlus className="h-8 w-8 text-primary mb-3" />
            <div className="font-semibold mb-1">New Patient</div>
            <div className="text-sm text-muted-foreground">Register a brand-new walk-in patient and start the lab journey.</div>
          </button>
          <button onClick={() => setMode('existing')} className="rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 p-6 text-left">
            <Search className="h-8 w-8 text-primary mb-3" />
            <div className="font-semibold mb-1">Existing Patient</div>
            <div className="text-sm text-muted-foreground">Search by hospital number, phone, or name then continue.</div>
          </button>
          <button onClick={() => setMode('continue')} className="rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 p-6 text-left">
            <History className="h-8 w-8 text-primary mb-3" />
            <div className="font-semibold mb-1">Continue Existing Workflow</div>
            <div className="text-sm text-muted-foreground">Resume any walk-in case from its last completed stage.</div>
          </button>
        </div>
        <Card>
          <h3 className="font-semibold mb-3">Ongoing Walk-In Cases</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Patient</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {ongoingCases.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.patient}</TableCell>
                  <TableCell><Badge variant="outline" className={tone('amber')}>{c.stageName}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" onClick={() => { setMode('new'); setRegistered(true); setStep(c.stage); setPatient(p => ({ ...p, first: c.patient.split(' ')[0], last: c.patient.split(' ')[1] || '' })); }}>Resume</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Shell>
    );
  }

  if (mode === 'existing') {
    return (
      <Shell title="Walk-In · Existing Patient">
        <Section icon={<Search className="h-5 w-5" />} title="Select Existing Patient" desc="Search and continue the laboratory workflow." action={<Button variant="outline" onClick={() => setMode('menu')}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>} />
        <Card>
          <PatientPicker onSelect={(p) => {
            const [first, ...rest] = p.name.split(' ');
            setPatient(s => ({ ...s, first, last: rest.join(' '), age: String(p.age), gender: p.gender }));
            setRegistered(true); setMode('new'); setStep(2);
            toast.success(`Continuing workflow for ${p.name}`);
          }} />
        </Card>
      </Shell>
    );
  }

  if (mode === 'continue') {
    return (
      <Shell title="Walk-In · Resume">
        <Section icon={<History className="h-5 w-5" />} title="Continue Existing Workflow" desc="Pick a case to resume from its last completed stage." action={<Button variant="outline" onClick={() => setMode('menu')}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>} />
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Patient</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {ongoingCases.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell>{c.patient}</TableCell>
                  <TableCell><Badge variant="outline" className={tone('amber')}>{c.stageName}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" onClick={() => { setMode('new'); setRegistered(true); setStep(c.stage); setPatient(p => ({ ...p, first: c.patient.split(' ')[0], last: c.patient.split(' ')[1] || '' })); }}>Resume</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title="Walk-In Laboratory Workflow">
      <Section icon={<UserPlus className="h-5 w-5" />} title="End-to-End Walk-In Pipeline"
        desc="Registration → tests → invoice → payment → sample → result → print."
        action={<Button variant="outline" size="sm" onClick={resetWorkflow}><ChevronLeft className="h-4 w-4 mr-1" />Back to Menu</Button>} />
      <Card className="mb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <button onClick={() => setStep(i + 1)}
                className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5
                  ${i + 1 < step ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${i + 1 === step ? 'bg-primary text-primary-foreground' : ''}
                  ${i + 1 > step ? 'bg-muted text-muted-foreground' : ''}`}>
                {i + 1 < step && <CheckCircle2 className="h-3 w-3" />}
                {i + 1}. {s}
              </button>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Step {step}: {steps[step - 1]}</h3>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={patient.first} onChange={e => setPatient({ ...patient, first: e.target.value })} /></div>
            <div><Label>Last Name</Label><Input value={patient.last} onChange={e => setPatient({ ...patient, last: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={patient.phone} onChange={e => setPatient({ ...patient, phone: e.target.value })} /></div>
            <div><Label>Gender</Label>
              <Select value={patient.gender} onValueChange={v => setPatient({ ...patient, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Age</Label><Input type="number" value={patient.age} onChange={e => setPatient({ ...patient, age: e.target.value })} /></div>
            <div><Label>Date of Birth</Label><Input type="date" value={patient.dob} onChange={e => setPatient({ ...patient, dob: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={patient.address} onChange={e => setPatient({ ...patient, address: e.target.value })} /></div>
            <div><Label>Referring Doctor</Label><Input value={patient.referrer} onChange={e => setPatient({ ...patient, referrer: e.target.value })} /></div>
            <div><Label>Walk-In Reason</Label><Input value={patient.reason} onChange={e => setPatient({ ...patient, reason: e.target.value })} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Input placeholder="Search test by name or code…" value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
              <div className="max-h-[360px] overflow-y-auto border rounded-lg divide-y">
                {filteredTests.map(t => (
                  <label key={t.code} className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selected.includes(t.code)} onCheckedChange={() => setSelected(s => s.includes(t.code) ? s.filter(x => x !== t.code) : [...s, t.code])} />
                      <div><div className="font-medium text-sm">{t.name}</div><div className="text-xs text-muted-foreground">{t.category} · {t.code}</div></div>
                    </div>
                    <div className="font-semibold text-sm">{formatCurrency(t.price)}</div>
                  </label>
                ))}
              </div>
            </div>
            <Card>
              <h4 className="font-semibold mb-2">Selected Tests</h4>
              {cart.length === 0 ? <div className="text-sm text-muted-foreground">No tests selected.</div> :
                <div className="space-y-1 text-sm mb-2">{cart.map(c => <div key={c.code} className="flex justify-between"><span>{c.name}</span><span>{formatCurrency(c.price)}</span></div>)}</div>}
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="border rounded-xl p-5 bg-muted/20">
            <div className="flex justify-between mb-3">
              <div>
                <div className="font-semibold">Invoice INV-WLK-{Math.floor(Math.random() * 9999)}</div>
                <div className="text-xs text-muted-foreground">{patient.first || 'Walk-In'} {patient.last} · {new Date().toLocaleDateString()}</div>
              </div>
              <Badge variant="outline" className={tone('amber')}>UNPAID</Badge>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Test</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{cart.map(c => <TableRow key={c.code}><TableCell>{c.name}</TableCell><TableCell className="text-right">{formatCurrency(c.price)}</TableCell></TableRow>)}</TableBody>
            </Table>
            <div className="flex justify-end mt-3 text-lg font-bold text-primary">Total: {formatCurrency(total)}</div>
            <div className="flex gap-2 justify-end mt-3">
              <Button variant="outline" onClick={() => printDoc('Walk-In Invoice')}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button onClick={() => {
                const inv = createInvoice({
                  patientName: `${patient.first || 'Walk-In'} ${patient.last}`.trim(),
                  hospitalId: 'WALK-IN',
                  phone: patient.phone || '—',
                  department: 'Laboratory',
                  amount: total,
                  source: 'Laboratory',
                });
                setLabInvoiceId(inv.invoiceId);
                toast.success(`Invoice ${inv.invoiceId} sent to Cashier`, { description: `₦${total.toLocaleString()} — now visible in Cashier POS.`, action: { label: 'Open Cashier', onClick: () => navigate('/billing/pos') } });
                setStep(4);
              }}>Generate Invoice & Send to Cashier</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['Cash','Transfer','POS','Wallet','NHIA'].map(m => (
                  <button key={m} onClick={() => setMethod(m)} className={`p-3 rounded-lg border text-sm font-medium ${method === m ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>{m}</button>
                ))}
              </div>
              <Button className="w-full mt-4" onClick={() => { setPaid(true); setShowSuccess('payment'); }}>Confirm Payment {formatCurrency(total)}</Button>
            </div>
            <Card className="bg-muted/20">
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Due</span><span className="font-semibold">{formatCurrency(total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline" className={tone(paid ? 'green' : 'amber')}>{paid ? 'PAID' : 'PENDING'}</Badge></div>
              </div>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm mb-3"><span className="text-muted-foreground">Patient:</span> <span className="font-medium">{patient.first} {patient.last}</span></div>
              <div className="text-sm mb-3"><span className="text-muted-foreground">Tests:</span> {cart.map(c => c.name).join(', ') || '—'}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Collected By</Label><Input defaultValue="Tech. Bola" /></div>
                <div><Label>Date</Label><Input type="date" defaultValue={new Date().toISOString().slice(0,10)} /></div>
                <div><Label>Time</Label><Input type="time" defaultValue="09:30" /></div>
                <div><Label>Sample ID</Label><Input defaultValue={`SMP-${Math.floor(Math.random() * 9999)}`} /></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} /></div>
              </div>
              <Button className="w-full mt-3" onClick={() => { setCollected(true); setShowSuccess('sample'); }}><QrCode className="h-4 w-4 mr-1" />Collect Sample</Button>
            </div>
            <Card className="bg-emerald-50/50 border-emerald-200">
              <h4 className="font-semibold mb-2 text-emerald-700">Collection Checklist</h4>
              <ul className="text-sm space-y-1 list-disc pl-5 text-emerald-900">
                <li>Verify patient identity</li>
                <li>Print and apply barcode label</li>
                <li>Use correct sample container</li>
                <li>Store/transport per protocol</li>
              </ul>
            </Card>
          </div>
        )}

        {step === 6 && (
          <WalkInResultEntry
            cart={cart}
            onDraft={() => { setResultSaved(true); setShowSuccess('result'); }}
            onSubmit={() => { setResultSaved(true); setShowSuccess('result'); }}
          />
        )}

        {step === 7 && (
          <div className="border rounded-xl p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">GFA</div>
                <div>
                  <div className="font-semibold">GFA Demo Hospital</div>
                  <div className="text-xs text-muted-foreground">Laboratory Result Report</div>
                </div>
              </div>
              <Badge variant="outline" className={tone('green')}>VALIDATED</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-muted-foreground">Patient:</span> {patient.first} {patient.last}</div>
              <div><span className="text-muted-foreground">Age/Sex:</span> {patient.age || '—'} / {patient.gender || '—'}</div>
              <div><span className="text-muted-foreground">Date:</span> {new Date().toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Scientist:</span> Sci. Adebanjo</div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Result</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
              <TableBody>{cart.map(c => <TableRow key={c.code}><TableCell>{c.name}</TableCell><TableCell className="font-semibold">Within Range</TableCell><TableCell>{c.refRange || '—'}</TableCell></TableRow>)}</TableBody>
            </Table>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => downloadPdf('walk-in-result.pdf', cart.map(c => `${c.name}: Within Range`))}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
              <Button onClick={() => printDoc('Lab Result')}><Printer className="h-4 w-4 mr-1" />Print Result</Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}>Back</Button>
          {step === 1 && !registered ? (
            <Button onClick={() => { setRegistered(true); setShowSuccess('register'); }}>Save & Continue</Button>
          ) : (
            <Button disabled={!canAdvance} onClick={() => step < 7 ? setStep(s => s + 1) : setFinished(true)}>
              {step < 7 ? 'Next' : 'Finish'} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>

      {/* Step success popups */}
      <SuccessDialog open={!!showSuccess} onOpenChange={(o) => !o && setShowSuccess(null)}
        title={
          showSuccess === 'register' ? 'Patient registered successfully' :
          showSuccess === 'payment' ? 'Payment confirmed' :
          showSuccess === 'sample' ? 'Sample collected successfully' :
          showSuccess === 'result' ? 'Result saved successfully' : 'Success'
        }
        description={
          showSuccess === 'register' ? 'Patient registered for laboratory services.' :
          showSuccess === 'payment' ? `Payment of ${formatCurrency(total)} confirmed via ${method}.` :
          showSuccess === 'sample' ? 'Sample logged. Proceed to result entry.' :
          showSuccess === 'result' ? 'Result submitted for validation.' : ''
        }
        footer={
          <>
            {showSuccess === 'payment' && <Button variant="outline" onClick={() => printDoc('Receipt')}><Printer className="h-4 w-4 mr-1" />Print Receipt</Button>}
            <Button onClick={() => { const nxt = step + 1; setShowSuccess(null); if (nxt <= 7) setStep(nxt); }}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </>
        }
      />

      {/* Final finish popup */}
      <SuccessDialog open={finished} onOpenChange={setFinished}
        title="Laboratory Workflow Completed Successfully"
        description="All steps for this walk-in patient have been completed."
        footer={
          <>
            <Button variant="outline" onClick={() => printDoc('Lab Result')}><Printer className="h-4 w-4 mr-1" />Print Result</Button>
            <Button variant="outline" onClick={() => downloadPdf('walk-in-result.pdf', cart.map(c => `${c.name}: Normal`))}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            <Button variant="outline" onClick={resetWorkflow}><UserPlus className="h-4 w-4 mr-1" />Start New Walk-In</Button>
            <Button onClick={() => { setFinished(false); window.location.href = base; }}>Return Dashboard</Button>
          </>
        }
      />
    </Shell>
  );
};

// ====================================================================
// 5. SAMPLE COLLECTION
// ====================================================================
export const LabSampleCenter = () => {
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<typeof labRequestsFull[0] | null>(null);
  const [viewing, setViewing] = useState<typeof labRequestsFull[0] | null>(null);

  return (
    <Shell title="Sample Collection Center">
      <Section icon={<QrCode className="h-5 w-5" />} title="Specimen Pipeline" desc="Track every sample from request to bench." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Awaiting Collection" value="6" icon={Clock} />
        <SummaryCard title="Collected Today" value="14" icon={CheckCircle2} />
        <SummaryCard title="Rejected" value="2" icon={X} />
        <SummaryCard title="Delayed" value="1" icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="pending">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
          <TabsList>
            <TabsTrigger value="pending">Pending Collection</TabsTrigger>
            <TabsTrigger value="collected">Collected</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="recollect">Recollect</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCsv('samples.csv', [['Request','Patient','Test','Status'], ...labRequestsFull.map(r => [r.id, r.patientName, r.testName, r.status])])}><Download className="h-3 w-3 mr-1" />CSV</Button>
            <Button size="sm" variant="outline" onClick={() => downloadPdf('samples.pdf', labRequestsFull.map(r => `${r.id} · ${r.patientName} · ${r.testName}`))}><FileText className="h-3 w-3 mr-1" />PDF</Button>
          </div>
        </div>
        {(['pending','collected','rejected','recollect'] as const).map(k => (
          <TabsContent key={k} value={k}>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Specimen</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {labRequestsFull.slice(0, 6).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>{r.patientName}</TableCell>
                      <TableCell>{r.testName}</TableCell>
                      <TableCell>{r.sampleId || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={tone(r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky')}>{r.priority}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={tone(collected[r.id] ? 'green' : 'amber')}>{collected[r.id] ? 'Collected' : 'Pending'}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setViewing(r)}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" disabled={collected[r.id]} onClick={() => { setCollected(c => ({ ...c, [r.id]: true })); setSuccess(r); }}><QrCode className="h-3 w-3 mr-1" />Collect</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <SuccessDialog
        open={!!success}
        onOpenChange={(o) => !o && setSuccess(null)}
        title="Sample Collected Successfully"
        description={success ? `Sample ${success.sampleId || 'SMP-' + success.id.slice(-3)} for ${success.patientName} has been logged.` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setSuccess(null)}>Back</Button>
            <Button onClick={() => { setSuccess(null); window.location.href = `${base}/results`; }}>Enter Result <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </>
        }
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          {viewing && (
            <>
              <DialogHeader><DialogTitle>Sample Information</DialogTitle><DialogDescription>{viewing.id}</DialogDescription></DialogHeader>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Patient:</span> {viewing.patientName}</div>
                <div><span className="text-muted-foreground">Test:</span> {viewing.testName}</div>
                <div><span className="text-muted-foreground">Sample Type:</span> {viewing.sampleId ? 'Collected' : 'Awaiting'}</div>
                <div><span className="text-muted-foreground">Sample ID:</span> {viewing.sampleId || '—'}</div>
                <div><span className="text-muted-foreground">Collection Date:</span> {viewing.collectedAt || '—'}</div>
                <div><span className="text-muted-foreground">Collector:</span> {viewing.collectedBy || '—'}</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ====================================================================
// 6. RESULT ENTRY — Worklist driven by LabFlowStore + smart templates
// ====================================================================
type REStatus = 'all' | 'pending' | 'processing' | 'draft' | 'accepted' | 'rejected' | 'awaiting' | 'completed';

export const LabResultEntry = () => {
  const flow = useLabFlow();
  const [tab, setTab] = useState<REStatus>('pending');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [rejectFor, setRejectFor] = useState<LabFlowRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const collected = flow.requests.filter(r =>
    ['SAMPLE_COLLECTED','IN_PROCESSING','DRAFT','AWAITING_VALIDATION','COMPLETED','REJECTED'].includes(r.status)
  );

  const counts = useMemo(() => ({
    pending: collected.filter(r => r.status === 'SAMPLE_COLLECTED').length,
    processing: collected.filter(r => r.status === 'IN_PROCESSING').length,
    draft: collected.filter(r => r.status === 'DRAFT').length,
    accepted: collected.filter(r => r.status === 'SAMPLE_COLLECTED').length,
    rejected: collected.filter(r => r.status === 'REJECTED').length,
    awaiting: collected.filter(r => r.status === 'AWAITING_VALIDATION').length,
    completed: collected.filter(r => r.status === 'COMPLETED').length,
  }), [collected]);

  const tabFilter = (r: LabFlowRequest) => {
    switch (tab) {
      case 'all': return true;
      case 'pending': return r.status === 'SAMPLE_COLLECTED';
      case 'processing': return r.status === 'IN_PROCESSING';
      case 'draft': return r.status === 'DRAFT';
      case 'accepted': return r.status === 'SAMPLE_COLLECTED' || r.status === 'IN_PROCESSING';
      case 'rejected': return r.status === 'REJECTED';
      case 'awaiting': return r.status === 'AWAITING_VALIDATION';
      case 'completed': return r.status === 'COMPLETED';
    }
  };
  const rows = collected.filter(r => tabFilter(r) && (q === '' || `${r.patientName} ${r.id} ${r.sampleId || ''}`.toLowerCase().includes(q.toLowerCase())));
  const active = collected.find(r => r.id === activeId) || null;

  const openEntry = (r: LabFlowRequest) => { setActiveId(r.id); setValues({}); };
  const tat = (r: LabFlowRequest) => {
    const created = new Date(r.createdAt).getTime();
    return Number.isFinite(created) ? `${Math.max(0, Math.round((Date.now() - created) / 60000))}m` : '—';
  };

  return (
    <Shell title="Result Entry Worklist">
      <Section icon={<FilePlus className="h-5 w-5" />} title="Result Entry Workspace"
        desc="Worklist of collected samples ready for result entry. Open a record, load template, save draft or send for validation."
        action={<Input placeholder="Search patient / sample…" value={q} onChange={e => setQ(e.target.value)} className="w-64" />} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Pending Results" value={String(counts.pending)} icon={Clock} />
        <SummaryCard title="In Processing" value={String(counts.processing)} icon={Beaker} />
        <SummaryCard title="Draft Results" value={String(counts.draft)} icon={FileEdit} />
        <SummaryCard title="Accepted Samples" value={String(counts.accepted)} icon={CheckCircle2} />
        <SummaryCard title="Rejected Samples" value={String(counts.rejected)} icon={X} />
        <SummaryCard title="Awaiting Validation" value={String(counts.awaiting)} icon={FileSignature} />
        <SummaryCard title="Completed Today" value={String(counts.completed)} icon={BadgeCheck} />
      </div>

      <Card>
        <Tabs value={tab} onValueChange={(v) => setTab(v as REStatus)}>
          <TabsList className="flex-wrap h-auto mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Validation</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Hospital No</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>TAT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">No samples in this category.</TableCell></TableRow>
                )}
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.sampleId || '—'}</TableCell>
                    <TableCell>{r.patientName}</TableCell>
                    <TableCell className="text-xs">{r.hospitalNo}</TableCell>
                    <TableCell className="text-xs">{r.tests.map(t => t.name).join(', ')}</TableCell>
                    <TableCell><Badge variant="outline" className={tone(r.priority === 'Stat' ? 'rose' : r.priority === 'Urgent' ? 'amber' : 'sky')}>{r.priority}</Badge></TableCell>
                    <TableCell className="text-xs">{r.paymentType || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs">{r.doctor}</TableCell>
                    <TableCell className="text-xs">{tat(r)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(r.status === 'SAMPLE_COLLECTED' || r.status === 'IN_PROCESSING') && (
                          <Button size="sm" onClick={() => openEntry(r)}><PenSquare className="h-3 w-3 mr-1" />Open Entry</Button>
                        )}
                        {r.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => openEntry(r)}><FileEdit className="h-3 w-3 mr-1" />Continue Draft</Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="History" onClick={() => toast.success('Loading patient lab history…')}><History className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" title="Reject sample" onClick={() => setRejectFor(r)}><X className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Print worksheet" onClick={() => printDoc(`Worksheet ${r.id}`)}><Printer className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </Card>

      {/* Full result entry drawer */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Result Entry · {active.sampleId || active.id}</DialogTitle>
                <DialogDescription>{active.patientName} · {active.hospitalNo} · {active.age}y {active.gender} · Requested by {active.doctor}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="border rounded p-2"><div className="text-muted-foreground">Patient</div><div className="font-medium">{active.patientName}</div></div>
                <div className="border rounded p-2"><div className="text-muted-foreground">Sample</div><div className="font-medium">{active.sampleId || '—'}</div></div>
                <div className="border rounded p-2"><div className="text-muted-foreground">Priority</div><div className="font-medium">{active.priority}</div></div>
              </div>

              <div className="mt-3">
                <SmartResultEntry
                  tests={active.tests.map(t => ({ code: t.code, name: t.name }))}
                  values={values} onChange={setValues}
                />
              </div>

              <div className="mt-3"><Label>Comments / Interpretation</Label><Textarea rows={2} /></div>
              <div className="mt-2"><Label>Attachment</Label><Input type="file" /></div>

              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { flow.saveDraftResult(active.id, 'Scientist'); }}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
                <Button variant="outline" onClick={() => printDoc(`Worksheet ${active.id}`)}><Printer className="h-4 w-4 mr-1" />Print Worksheet</Button>
                <Button onClick={() => { flow.submitForValidation(active.id, 'Scientist'); setActiveId(null); }}><Send className="h-4 w-4 mr-1" />Send for Validation</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject sample */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          {rejectFor && (
            <>
              <DialogHeader><DialogTitle>Reject Sample</DialogTitle><DialogDescription>{rejectFor.sampleId || rejectFor.id} · {rejectFor.patientName}</DialogDescription></DialogHeader>
              <Textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (haemolysed, insufficient volume, mislabelled…)" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
                <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => { flow.reject(rejectFor.id, rejectReason, 'Scientist'); setRejectFor(null); setRejectReason(''); }}>Reject Sample</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};



// ====================================================================
// 7. VALIDATION WORKFLOW — cards, tabs, reject-with-correction, notify
// ====================================================================
export const LabValidationWorkflow = () => {
  const queue = labRequestsFull.filter(r => ['COMPLETED','VERIFIED','PROCESSING','RELEASED'].includes(r.status));
  const [preview, setPreview] = useState<typeof queue[0] | null>(null);
  const [rejecting, setRejecting] = useState<typeof queue[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [postValidate, setPostValidate] = useState<typeof queue[0] | null>(null);
  const [tab, setTab] = useState('pending');

  const filterByTab = (r: typeof queue[0]) => {
    if (tab === 'pending') return r.status === 'PROCESSING' || r.status === 'COMPLETED';
    if (tab === 'rejected') return false;
    if (tab === 'validated') return r.status === 'VERIFIED';
    if (tab === 'released') return r.status === 'RELEASED';
    return true;
  };

  return (
    <Shell title="Result Validation Workflow">
      <Section icon={<FileSignature className="h-5 w-5" />} title="Draft → Submitted → Validation → Released" desc="Senior scientist sign-off before any result reaches the doctor." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Awaiting Validation" value={String(queue.filter(r => r.status === 'COMPLETED' || r.status === 'PROCESSING').length)} icon={Clock} />
        <SummaryCard title="Rejected" value="2" icon={X} />
        <SummaryCard title="Validated" value={String(queue.filter(r => r.status === 'VERIFIED').length)} icon={BadgeCheck} />
        <SummaryCard title="Released" value={String(queue.filter(r => r.status === 'RELEASED').length)} icon={Send} />
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="validated">Validated</TabsTrigger>
            <TabsTrigger value="released">Released</TabsTrigger>
          </TabsList>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Entered By</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {queue.filter(filterByTab).map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell>{r.processedBy || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={tone(r.status === 'VERIFIED' || r.status === 'RELEASED' ? 'green' : 'amber')}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {(tab === 'validated' || tab === 'released') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toast.success('Doctor notified again')}><Bell className="h-3 w-3 mr-1" />Notify Doctor</Button>
                        <Button size="sm" variant="outline" onClick={() => printDoc('Result')}><Printer className="h-3 w-3" /></Button>
                      </>
                    )}
                    {tab === 'pending' && <Button size="sm" variant="outline" onClick={() => setPreview(r)}><Eye className="h-3 w-3 mr-1" />Review</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {queue.filter(filterByTab).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items in this category.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Tabs>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>Result Preview — {preview.testName}</DialogTitle>
                <DialogDescription>Review before validation. Validate releases to the doctor; reject returns to scientist.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Patient:</span> {preview.patientName}</div>
                <div><span className="text-muted-foreground">Hospital No:</span> {preview.patientId}</div>
                <div><span className="text-muted-foreground">Entered By:</span> {preview.processedBy || '—'}</div>
                <div><span className="text-muted-foreground">Entry Date:</span> {preview.collectedAt || preview.requestedAt}</div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Value</TableHead><TableHead>Range</TableHead><TableHead>Flag</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(preview.results || [{ parameter: preview.testName, value: 'Within range', range: '—', flag: 'Normal' as const }]).map((rr, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{rr.parameter}</TableCell>
                      <TableCell className="font-semibold">{rr.value} {rr.unit || ''}</TableCell>
                      <TableCell className="text-muted-foreground">{rr.range || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={tone(rr.flag === 'Critical' || rr.flag === 'High' ? 'rose' : rr.flag === 'Low' ? 'amber' : 'green')}>{rr.flag || 'Normal'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setRejecting(preview); setPreview(null); }}>Reject With Correction</Button>
                <Button onClick={() => { const p = preview; setPreview(null); setPostValidate(p); }}><BadgeCheck className="h-4 w-4 mr-1" />Validate Result</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject With Correction</DialogTitle><DialogDescription>Provide the correction reason; the scientist will receive it.</DialogDescription></DialogHeader>
          <Label>Correction Required <span className="text-rose-600">*</span></Label>
          <Textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="State what needs correction…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => { setRejecting(null); setRejectReason(''); toast.success('Returned to scientist with correction note'); }}>Submit Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuccessDialog open={!!postValidate} onOpenChange={(o) => !o && setPostValidate(null)}
        title="Result Validated Successfully"
        description={postValidate ? `${postValidate.testName} for ${postValidate.patientName} has been signed off.` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => toast.success('Notification Sent Successfully — doctor notified')}><Bell className="h-4 w-4 mr-1" />Notify Doctor</Button>
            <Button variant="outline" onClick={() => printDoc('Result')}><Printer className="h-4 w-4 mr-1" />Print Result</Button>
            <Button onClick={() => { setPostValidate(null); toast.success('Result released to doctor'); }}>Release Result</Button>
          </>
        }
      />
    </Shell>
  );
};

// ====================================================================
// 8. RESULT AMENDMENT
// ====================================================================
export const LabAmendmentWorkflow = () => {
  const eligible = labRequestsFull.filter(r => ['VERIFIED','RELEASED','SYNCED'].includes(r.status));
  const [editing, setEditing] = useState<typeof eligible[0] | null>(null);
  const [history, setHistory] = useState<typeof eligible[0] | null>(null);
  const [original, setOriginal] = useState<typeof eligible[0] | null>(null);
  const [tab, setTab] = useState('requests');

  return (
    <Shell title="Result Amendment Workflow">
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 p-4 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div><div className="font-semibold">Amendments are audited and visible to all clinicians.</div>Every change requires a reason, supervisor approval and is stored as a new result version.</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Amendment Requests" value={String(eligible.length)} icon={FileEdit} />
        <SummaryCard title="Awaiting Revalidation" value="2" icon={Clock} />
        <SummaryCard title="Revalidated" value="6" icon={BadgeCheck} />
        <SummaryCard title="Completed" value="14" icon={CheckCircle2} />
      </div>

      <Card>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Revalidation</TabsTrigger>
            <TabsTrigger value="revalidated">Revalidated</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Validation Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell>{r.testName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.verifiedAt || r.releasedAt || '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setHistory(r)}><History className="h-3 w-3 mr-1" />Audit</Button>
                    <Button size="sm" variant="outline" onClick={() => setOriginal(r)}><Eye className="h-3 w-3 mr-1" />Original Result</Button>
                    <Button size="sm" onClick={() => setEditing(r)}><FileEdit className="h-3 w-3 mr-1" />Amend</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tabs>
      </Card>

      {/* Amend dialog — no Save Draft */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <>
              <DialogHeader><DialogTitle>Amend Result — {editing.testName}</DialogTitle><DialogDescription>{editing.patientName} · {editing.id}</DialogDescription></DialogHeader>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Original</h4>
                  <div className="p-3 rounded-lg border bg-muted/40 text-sm space-y-1">
                    {(editing.results || [{ parameter: editing.testName, value: '—' }]).map((rr, i) => (
                      <div key={i}><span className="text-muted-foreground">{rr.parameter}:</span> <span className="font-semibold">{rr.value} {rr.unit || ''}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Amendment</h4>
                  <div className="space-y-2">
                    <div><Label>New Result Value</Label><Input /></div>
                    <div><Label>Interpretation</Label><Input /></div>
                    <div><Label>Reason for Amendment <span className="text-rose-600">*</span></Label><Textarea rows={3} required /></div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => { setEditing(null); toast.success('Amendment Submitted Successfully'); }}><Send className="h-4 w-4 mr-1" />Submit For Revalidation</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Original result dialog */}
      <Dialog open={!!original} onOpenChange={(o) => !o && setOriginal(null)}>
        <DialogContent className="max-w-xl">
          {original && (
            <>
              <DialogHeader><DialogTitle>Original Result — {original.testName}</DialogTitle><DialogDescription>{original.patientName} · {original.id}</DialogDescription></DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-3 bg-muted/30">
                <div><span className="text-muted-foreground">Original:</span> <span className="font-semibold">{(original.results?.[0]?.value) || '—'}</span></div>
                <div><span className="text-muted-foreground">Amended:</span> <span className="font-semibold text-amber-700">{(original.results?.[0]?.value) || '—'}</span></div>
                <div><span className="text-muted-foreground">Amendment Reason:</span> Re-run sample</div>
                <div><span className="text-muted-foreground">Amended By:</span> Tech. Bola</div>
                <div><span className="text-muted-foreground">Validated By:</span> {original.verifiedBy || '—'}</div>
                <div><span className="text-muted-foreground">Approved By:</span> Sci. Adebanjo</div>
                <div className="col-span-2"><span className="text-muted-foreground">Date & Time:</span> {original.verifiedAt || original.requestedAt}</div>
              </div>
              <h4 className="font-semibold text-sm mt-3 mb-1">Audit Trail</h4>
              <div className="text-xs space-y-1 max-h-[180px] overflow-y-auto">
                {original.audit.map((a, i) => <div key={i} className="flex gap-2"><span className="text-muted-foreground w-12">{a.at}</span><span className="font-medium">{a.actor}</span><span>{a.action}</span></div>)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Amendment Audit History</DialogTitle><DialogDescription>{history?.patientName} · {history?.testName}</DialogDescription></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Event</TableHead><TableHead>Actor</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {(history?.audit || []).map((a, i) => (
                <TableRow key={i}><TableCell><Badge variant="outline">v{i + 1}</Badge></TableCell><TableCell>{a.action}</TableCell><TableCell>{a.actor}</TableCell><TableCell className="text-xs text-muted-foreground">{a.at}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ====================================================================
// 9. TEMPLATES
// ====================================================================
type TemplateDef = { name: string; category: string; status?: 'Active' | 'Custom' | 'Inactive'; updated?: string; params: { name: string; unit: string; range: string }[] };
const defaultTemplates: TemplateDef[] = [
  { name: 'Full Blood Count', category: 'Haematology', status: 'Active', updated: '08 Jun 2026', params: [{ name: 'Haemoglobin', unit: 'g/dL', range: '12.0 – 16.0' }, { name: 'PCV', unit: '%', range: '36 – 48' }, { name: 'WBC', unit: '×10⁹/L', range: '4.0 – 11.0' }, { name: 'Platelets', unit: '×10⁹/L', range: '150 – 400' }] },
  { name: 'Urinalysis', category: 'Chemistry', status: 'Active', updated: '02 Jun 2026', params: [{ name: 'Colour', unit: '', range: 'Pale Yellow' }, { name: 'pH', unit: '', range: '5.0 – 8.0' }, { name: 'Protein', unit: '', range: 'Negative' }, { name: 'Glucose', unit: '', range: 'Negative' }] },
  { name: 'Electrolytes', category: 'Chemistry', status: 'Active', updated: '18 May 2026', params: [{ name: 'Na', unit: 'mmol/L', range: '135 – 145' }, { name: 'K', unit: 'mmol/L', range: '3.5 – 5.0' }] },
  { name: 'Liver Function Test', category: 'Chemistry', status: 'Active', updated: '12 May 2026', params: [{ name: 'ALT', unit: 'U/L', range: '7 – 56' }, { name: 'AST', unit: 'U/L', range: '10 – 40' }] },
  { name: 'Urine Drug Screen', category: 'Toxicology', status: 'Custom', updated: '06 Jun 2026', params: [{ name: 'Cannabis', unit: '', range: 'Negative' }, { name: 'Cocaine', unit: '', range: 'Negative' }] },
];
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const LabTemplates = () => {
  const [templates, setTemplates] = useState<TemplateDef[]>(defaultTemplates);
  const [preview, setPreview] = useState<TemplateDef | null>(null);
  const [editing, setEditing] = useState<TemplateDef | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TemplateDef>({ name: '', category: 'Haematology', status: 'Custom', updated: today(), params: [{ name: '', unit: '', range: '' }] });

  const saveEdit = () => { if (!editing) return; setTemplates(t => t.map(x => x.name === editing.name ? { ...editing, updated: today() } : x)); toast.success('Template Saved Successfully'); setEditing(null); };
  const saveNew = () => { if (!draft.name) { toast.error('Template name required'); return; } setTemplates(t => [...t, { ...draft, updated: today() }]); toast.success('Template Created Successfully'); setCreating(false); setDraft({ name: '', category: 'Haematology', status: 'Custom', updated: today(), params: [{ name: '', unit: '', range: '' }] }); };

  const recentlyUpdated = templates.filter(t => /Jun 2026/.test(t.updated || '')).length;

  return (
    <Shell title="Result Template Library">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total Templates" value={String(templates.length)} icon={BookOpen} />
        <SummaryCard title="Active Templates" value={String(templates.filter(t => t.status === 'Active').length)} icon={CheckCircle2} />
        <SummaryCard title="Custom Templates" value={String(templates.filter(t => t.status === 'Custom').length)} icon={FileEdit} />
        <SummaryCard title="Recently Updated" value={String(recentlyUpdated)} icon={Clock} />
      </div>
      <Section icon={<BookOpen className="h-5 w-5" />} title="Reusable Result Templates" desc="Preview, edit, duplicate or create new templates."
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Create Template</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Template Name</TableHead><TableHead>Category</TableHead><TableHead>Last Updated</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {templates.map(t => (
              <TableRow key={t.name}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell><Badge variant="outline" className={tone('blue')}>{t.category}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.updated || '—'}</TableCell>
                <TableCell><Badge variant="outline" className={tone(t.status === 'Active' ? 'green' : 'amber')}>{t.status || 'Active'}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setPreview(t)}><Eye className="h-3 w-3 mr-1" />Preview</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...t, params: t.params.map(p => ({ ...p })) })}><FileEdit className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setTemplates(prev => [...prev, { ...t, name: `${t.name} (Copy)`, status: 'Custom', updated: today() }]); toast.success('Template Duplicated'); }}>Duplicate</Button>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => { setTemplates(prev => prev.filter(x => x.name !== t.name)); toast.success('Template Deleted'); }}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-xl">
          {preview && (
            <>
              <DialogHeader><DialogTitle>{preview.name}</DialogTitle><DialogDescription>{preview.category} · Sample Result Layout</DialogDescription></DialogHeader>
              <div className="border rounded-lg p-4">
                <div className="text-center mb-3"><div className="font-bold">GFA Demo Hospital</div><div className="text-xs text-muted-foreground">{preview.name} Report</div></div>
                <Table>
                  <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Reference Range</TableHead></TableRow></TableHeader>
                  <TableBody>{preview.params.map(p => <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="font-mono text-muted-foreground">_______</TableCell><TableCell>{p.unit}</TableCell><TableCell className="text-muted-foreground">{p.range}</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing || creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{creating ? 'Create Template' : `Edit ${editing?.name}`}</DialogTitle><DialogDescription>Define parameters, units and reference ranges.</DialogDescription></DialogHeader>
          {(() => {
            if (!creating && !editing) return null;
            const t = creating ? draft : editing!;
            const update = (next: TemplateDef) => creating ? setDraft(next) : setEditing(next);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Template Name</Label><Input value={t.name} onChange={e => update({ ...t, name: e.target.value })} /></div>
                  <div><Label>Category</Label>
                    <Select value={t.category} onValueChange={v => update({ ...t, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Haematology','Chemistry','Microbiology','Toxicology','Serology','Histopathology'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><Label>Parameters</Label>
                    <Button size="sm" variant="outline" onClick={() => update({ ...t, params: [...t.params, { name: '', unit: '', range: '' }] })}><Plus className="h-3 w-3 mr-1" />Add Parameter</Button>
                  </div>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {t.params.map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <Input className="col-span-4" placeholder="Name" value={p.name} onChange={e => { const np = [...t.params]; np[i] = { ...p, name: e.target.value }; update({ ...t, params: np }); }} />
                        <Input className="col-span-3" placeholder="Unit" value={p.unit} onChange={e => { const np = [...t.params]; np[i] = { ...p, unit: e.target.value }; update({ ...t, params: np }); }} />
                        <Input className="col-span-4" placeholder="Reference range" value={p.range} onChange={e => { const np = [...t.params]; np[i] = { ...p, range: e.target.value }; update({ ...t, params: np }); }} />
                        <Button size="sm" variant="ghost" className="col-span-1 text-rose-600" onClick={() => update({ ...t, params: t.params.filter((_, ix) => ix !== i) })}>×</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
            <Button onClick={creating ? saveNew : saveEdit}><Save className="h-4 w-4 mr-1" />Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ====================================================================
// 10. URINE DRUG SCREENING — fixes: submit gates next, no email, finish popup
// ====================================================================
export { LabDrugScreen } from './lab/LabDrugScreenPage';

// ====================================================================
// 11. CULTURE & SENSITIVITY — full workflow
// ====================================================================
export { LabCulture } from './lab/LabCulturePage';

export { LabSfa } from './lab/LabSfaPage';

// ====================================================================
// 13–14. BLOOD BANK + HISTORY — live pages
// ====================================================================
export { LabBloodBank } from './lab/LabBloodBankPage';
export { LabHistoryCenter } from './lab/LabHistoryCenterPage';

// ====================================================================
// 15. ALL RESULTS DASHBOARD — working dropdown + trend + printer
// ====================================================================
export const LabAllResults = () => {
  const all = useMemo(() => labRequestsFull.filter(r => r.results).flatMap(r => r.results!.map(res => ({ ...res, patient: r.patientName, date: r.requestedAt.split(' ')[0], id: r.id }))), []);
  const [filter, setFilter] = useState('all');
  const [trend, setTrend] = useState(false);
  const filtered = all.filter(r => {
    if (filter === 'critical') return r.flag === 'Critical' || r.flag === 'High';
    if (filter === 'abnormal') return r.flag !== 'Normal';
    if (filter === 'normal') return r.flag === 'Normal';
    return true;
  });
  return (
    <Shell title="All Laboratory Results">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="One-Screen Result Review" desc="Filter, compare, trend, print and download." />
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input placeholder="Search…" className="max-w-xs" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="abnormal">Abnormal</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={trend ? 'default' : 'outline'} onClick={() => setTrend(t => !t)}><BarChart3 className="h-4 w-4 mr-1" />Trend View</Button>
          <Button variant="outline" onClick={() => downloadCsv('all-results.csv', [['Date','Patient','Test','Value','Flag'], ...filtered.map(r => [r.date, r.patient, r.parameter, r.value, r.flag || ''])])}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" onClick={() => downloadPdf('all-results.pdf', filtered.map(r => `${r.date} · ${r.patient} · ${r.parameter}: ${r.value}`))}><FileText className="h-4 w-4 mr-1" />PDF</Button>
        </div>
        {trend ? (
          <div className="space-y-3">
            {filtered.slice(0, 6).map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span>{r.patient} — {r.parameter}</span><span className="font-semibold">{r.value} {r.unit || ''}</span></div>
                <Progress value={r.flag === 'High' ? 90 : r.flag === 'Low' ? 30 : 60} />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead><TableHead>Value</TableHead><TableHead>Flag</TableHead><TableHead className="text-right">Print</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((res, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{res.date}</TableCell>
                  <TableCell>{res.patient}</TableCell>
                  <TableCell>{res.parameter}</TableCell>
                  <TableCell className="font-semibold">{res.value} {res.unit || ''}</TableCell>
                  <TableCell><Badge variant="outline" className={tone(res.flag === 'High' || res.flag === 'Critical' ? 'rose' : res.flag === 'Low' ? 'amber' : 'green')}>{res.flag}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => printDoc(`Result · ${res.patient}`)}><Printer className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Shell>
  );
};

// ====================================================================
// 16. PRINT CENTER
// ====================================================================
export const LabPrintCenter = () => (
  <Shell title="Laboratory Result Print Center">
    <Section icon={<Printer className="h-5 w-5" />} title="Branded Print Preview" desc="GMPC-compliant printout with hospital logo and demographics." />
    <Card>
      <div className="border rounded-lg p-6 bg-white text-foreground max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <div className="font-display font-bold text-lg">GFA Demo Hospital</div>
            <div className="text-xs text-muted-foreground">Lagos · Ogun State</div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">GFA</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><span className="text-muted-foreground">Patient:</span> Amina Yusuf</div>
          <div><span className="text-muted-foreground">Hospital No.:</span> GFA HMS/2026/00146</div>
          <div><span className="text-muted-foreground">Age / Sex:</span> 28 / F</div>
          <div><span className="text-muted-foreground">Date:</span> 28 Apr 2026</div>
        </div>
        <table className="w-full text-sm border">
          <thead><tr className="bg-muted"><th className="p-2 text-left">Test</th><th className="p-2 text-left">Result</th><th className="p-2 text-left">Reference Range</th></tr></thead>
          <tbody>
            <tr><td className="p-2 border-t">Haemoglobin</td><td className="p-2 border-t font-semibold">11.2 g/dL</td><td className="p-2 border-t">12 – 16</td></tr>
            <tr><td className="p-2 border-t">PCV</td><td className="p-2 border-t font-semibold">34 %</td><td className="p-2 border-t">36 – 48</td></tr>
          </tbody>
        </table>
        <div className="flex justify-between mt-6 text-xs">
          <div>Laboratory Officer: <span className="font-semibold">Sci. Adebanjo</span></div>
          <div>Signed · 28 Apr 2026 10:02</div>
        </div>
      </div>
      <div className="flex justify-center mt-4 gap-2">
        <Button onClick={() => printDoc('Result Report')}><Printer className="h-4 w-4 mr-1" />Print</Button>
        <Button variant="outline" onClick={() => downloadPdf('result.pdf', ['Amina Yusuf — FBC report'])}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
      </div>
    </Card>
  </Shell>
);

// ====================================================================
// 17. COMMUNICATION CENTER — live Mongo/WebSocket chat (see LabCommsPage)
// ====================================================================

// ====================================================================
// 18. REPORTS — create modal, preview, search, downloads
// ====================================================================
export { LabReports } from './lab/LabReportsPage';

// ====================================================================
// 19. ANALYTICS
export { LabAnalytics } from './lab/LabAnalyticsPage';
export { LabAlerts } from './lab/LabAlertsPage';

// ====================================================================
// 21. MOBILE / TABLET
// ====================================================================
export const LabMobile = () => (
  <Shell title="Lab Mobile / Tablet Mode">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Bench-side PWA" desc="Optimised for tablets and phones." />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        ['Sample Collection', `${base}/samples`],
        ['Result Entry', `${base}/results`],
        ['Result Validation', `${base}/validation`],
        ['Result Review', `${base}/all-results`],
        ['Lab Dashboard', base],
        ['Critical Alerts', `${base}/alerts`],
      ].map(([t, href]) => (
        <Card key={t}>
          <div className="font-semibold mb-2">{t}</div>
          <p className="text-sm text-muted-foreground mb-3">Touch-first layout · large tap targets · offline-first.</p>
          <Button size="sm" variant="outline" onClick={() => { window.location.href = href; }}>Open</Button>
        </Card>
      ))}
    </div>
  </Shell>
);

export { LabConfig } from './lab/LabConfigPage';
export { LabProfile } from './lab/LabProfilePage';
