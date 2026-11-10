import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBillingStore } from '@/contexts/BillingStore';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { StaffCommunicationCenter } from '@/components/comms/StaffCommunicationCenter';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard, Pill, ClipboardList, PackageSearch, PackagePlus, PackageMinus, Boxes,
  ShieldAlert, AlertTriangle, FlaskConical, Activity, CreditCard, Receipt, RotateCcw,
  Bed, FileText, BarChart3, MessageSquare, History, Smartphone, Settings2, Search,
  CheckCircle2, ShieldCheck, ArrowRight, ArrowLeftRight, ScrollText, ClipboardCheck,
  Truck, CalendarClock, AlertOctagon, TrendingUp, Send, Printer, FileSignature, Eye,
  ShieldX, Hospital, Stethoscope, UserPlus, Building2, BookOpen, UserCog,
} from 'lucide-react';
import { formatCurrency } from '@/data/dummyData';
import { drugCatalog, prescriptionsFull, stockMovements, pharmacyStaff, type Prescription } from '@/data/pharmacyData';
import { ApiError } from '@/lib/api/client';
import { isPharmacyApiEnabled } from '@/lib/api/pharmacy';
import {
  isPrescriptionsApiEnabled,
  listPrescriptions,
  toPharmacyQueueRow,
} from '@/lib/api/prescriptions';
import {
  getPharmacyBillingSummary,
  isPharmacyBillingApiEnabled,
  listPharmacyBills,
  type PharmacyBill,
  type PharmacyBillingSummary,
} from '@/lib/api/pharmacy-billing';
import {
  createPharmacyReturn,
  getPharmacyReturnsSummary,
  isPharmacyReturnsApiEnabled,
  listPharmacyReturns,
  lookupPharmacyReturnSource,
  type PharmacyReturn,
  type PharmacyReturnLookup,
  type PharmacyReturnsSummary,
} from '@/lib/api/pharmacy-returns';
import {
  getPharmacySettings,
  isPharmacySettingsApiEnabled,
  updatePharmacySettings,
  type PharmacySettings,
} from '@/lib/api/pharmacy-settings';
import {
  generatePharmacyReport,
  getPharmacyAnalytics,
  getPharmacyExpiry,
  getPharmacyInpatient,
  getPharmacyReportCatalog,
  isPharmacyOpsApiEnabled,
  quarantinePharmacyBatch,
  type PharmacyAnalyticsData,
  type PharmacyExpiryBucket,
  type PharmacyExpiryData,
  type PharmacyInpatientData,
  type PharmacyInpatientRow,
  type PharmacyReportCatalogItem,
  type PharmacyReportResult,
} from '@/lib/api/pharmacy-ops';
import jsPDF from 'jspdf';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

const base = '/dashboard/pharmacy';

export const pharmacyCenterNav = [
  { label: 'Pharmacy Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Prescription Queue', path: `${base}/queue`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Dispensing Workspace', path: `${base}/dispense`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Medication Reconciliation', path: `${base}/reconciliation`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'External Medications', path: `${base}/external`, icon: <Building2 className="h-4 w-4" /> },
  { label: 'Inventory Center', path: `${base}/inventory`, icon: <Boxes className="h-4 w-4" /> },
  { label: 'Stock Movement', path: `${base}/movements`, icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: 'Expiry Monitoring', path: `${base}/expiry`, icon: <CalendarClock className="h-4 w-4" /> },
  { label: 'Stock Forecast', path: '/pharmacy/forecast', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Drug Interaction Center', path: '/pharmacy/interactions', icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Controlled Drug Register', path: `${base}/controlled`, icon: <ShieldX className="h-4 w-4" /> },
  { label: 'Inpatient Medications', path: '/pharmacy/inpatient', icon: <Bed className="h-4 w-4" /> },
  { label: 'NHIA / HMO Workflow', path: `${base}/nhia`, icon: <Receipt className="h-4 w-4" /> },
  { label: 'Pharmacy Billing & Wallet', path: '/pharmacy/billing', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Returns & Reversals', path: '/pharmacy/returns', icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Reconciliation Report', path: `${base}/dispense-recon`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Medication Timeline', path: `${base}/timeline`, icon: <History className="h-4 w-4" /> },
  { label: 'Reporting Center', path: '/pharmacy/reports', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Analytics Dashboard', path: '/pharmacy/analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Mobile / Tablet Mode', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Pharmacy Settings', path: '/pharmacy/config', icon: <Settings2 className="h-4 w-4" /> },
  { label: 'My Profile', path: '/dashboard/pharmacy/profile', icon: <UserCog className="h-4 w-4" /> },
];

import { pharmacyNav } from './PharmacyModule';

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={pharmacyNav} title={`Pharmacy · ${title}`}>{children}</DashboardLayout>
);

const Section = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
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

const Card = ({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`} onClick={onClick}>{children}</div>
);

const tone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

const statusTone = (s: string): string => {
  if (['DISPENSED','PAID','APPROVED','SYNCED','Active'].includes(s)) return 'green';
  if (['PENDING_PHARMACY','UNDER_REVIEW','PENDING','PENDING_SYNC'].includes(s)) return 'amber';
  if (['STOCK_ISSUE','Low','PARTIALLY_DISPENSED'].includes(s)) return 'orange';
  if (['REJECTED','Out of Stock','Expired','FAILED'].includes(s)) return 'red';
  if (['EMERGENCY','AWAITING_PAYMENT'].includes(s)) return 'purple';
  if (['SYNCED'].includes(s)) return 'sky';
  return 'blue';
};

// ============================================================
// 1. PHARMACY DASHBOARD
// ============================================================
export const PharmacyCenterDashboard = () => {
  const today = prescriptionsFull.length;
  const dispensed = prescriptionsFull.filter(p => p.status === 'DISPENSED').length;
  const pending = prescriptionsFull.filter(p => ['PENDING_PHARMACY','PAID','UNDER_REVIEW'].includes(p.status)).length;
  const lowStock = drugCatalog.filter(d => d.status === 'Low' || d.status === 'Out of Stock').length;
  const expiring = drugCatalog.filter(d => new Date(d.expiry + '-01') < new Date('2027-07-01')).length;
  const nhia = 4;
  const revenue = prescriptionsFull.filter(p => p.paymentStatus === 'PAID').reduce((s,p) => s + p.total, 0);
  const controlled = prescriptionsFull.filter(p => p.items.some(i => drugCatalog.find(d => d.id === i.drugId)?.controlled)).length;

  const quickActions = [
    { label: 'Dispense Drug', path: `${base}/dispense`, icon: Pill, tone: 'bg-primary text-primary-foreground' },
    { label: 'Add Stock', path: `${base}/inventory`, icon: PackagePlus, tone: 'bg-emerald-600 text-white' },
    { label: 'Stock Take', path: `${base}/inventory`, icon: ClipboardCheck, tone: 'bg-blue-600 text-white' },
    { label: 'Inventory Review', path: `${base}/inventory`, icon: Boxes, tone: 'bg-sky-600 text-white' },
    { label: 'Controlled Drugs', path: `${base}/controlled`, icon: ShieldX, tone: 'bg-rose-600 text-white' },
    { label: 'View Reports', path: '/pharmacy/reports', icon: ScrollText, tone: 'bg-purple-600 text-white' },
  ];

  return (
    <Shell title="Enterprise Pharmacy Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Prescriptions Today" value={String(today)} icon={ClipboardList} />
        <SummaryCard title="Dispensed Today" value={String(dispensed)} icon={CheckCircle2} />
        <SummaryCard title="Pending Dispense" value={String(pending)} icon={Activity} />
        <SummaryCard title="Low Stock" value={String(lowStock)} icon={PackageMinus} />
        <SummaryCard title="Expiring Drugs" value={String(expiring)} icon={CalendarClock} />
        <SummaryCard title="NHIA Rx" value={String(nhia)} icon={Receipt} />
        <SummaryCard title="Revenue Today" value={formatCurrency(revenue)} icon={CreditCard} />
        <SummaryCard title="Controlled Rx" value={String(controlled)} icon={ShieldX} />
      </div>

      <Card className="mb-6">
        <Section icon={<Pill className="h-5 w-5" />} title="Quick Actions" desc="One-click access to dispensing, inventory and controlled drug operations." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(a => (
            <Link key={a.label} to={a.path} className={`rounded-xl p-4 flex flex-col gap-2 hover:opacity-90 transition ${a.tone}`}>
              <a.icon className="h-5 w-5" />
              <span className="font-semibold text-sm">{a.label}</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <Section icon={<ClipboardList className="h-5 w-5" />} title="Recent Prescriptions" desc="Live queue across OPD, Wards, ICU and Emergency."
            action={<Button asChild size="sm"><Link to={`${base}/queue`}>Open Full Queue</Link></Button>} />
          <Table>
            <TableHeader><TableRow><TableHead>Rx</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {prescriptionsFull.slice(0,6).map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell><div className="font-medium">{p.patientName}</div><div className="text-xs text-muted-foreground">{p.patientId}</div></TableCell>
                  <TableCell className="text-sm">{p.prescribedBy}</TableCell>
                  <TableCell><Badge className={`border ${tone(statusTone(p.paymentStatus))}`}>{p.paymentStatus}</Badge></TableCell>
                  <TableCell><Badge className={`border ${tone(statusTone(p.status))}`}>{p.status.replace(/_/g,' ')}</Badge></TableCell>
                  <TableCell><Button asChild size="sm" variant="outline"><Link to={`${base}/dispense?rx=${p.id}`}>Open</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <Section icon={<AlertTriangle className="h-5 w-5" />} title="Critical Alerts" desc="Stock, expiry, controlled & interaction warnings." />
          <div className="space-y-2">
            <Link to={`${base}/inventory`} className="block p-3 rounded-lg border bg-rose-50 hover:bg-rose-100 transition">
              <div className="flex justify-between"><span className="font-semibold text-rose-800">Metformin — Out of Stock</span><Badge className="border bg-rose-100 text-rose-700">Critical</Badge></div>
              <p className="text-xs text-rose-700">Substitute Glibenclamide suggested.</p>
            </Link>
            <Link to={`${base}/expiry`} className="block p-3 rounded-lg border bg-amber-50 hover:bg-amber-100 transition">
              <div className="flex justify-between"><span className="font-semibold text-amber-800">Diclofenac expiring</span><Badge className="border bg-amber-100 text-amber-700">90d</Badge></div>
              <p className="text-xs text-amber-700">Batch H14 expires 2026-09.</p>
            </Link>
            <Link to={`${base}/controlled`} className="block p-3 rounded-lg border bg-purple-50 hover:bg-purple-100 transition">
              <div className="flex justify-between"><span className="font-semibold text-purple-800">Morphine balance low</span><Badge className="border bg-purple-100 text-purple-700">42 amp</Badge></div>
              <p className="text-xs text-purple-700">Re-order through controlled register.</p>
            </Link>
            <Link to={'/pharmacy/interactions'} className="block p-3 rounded-lg border bg-orange-50 hover:bg-orange-100 transition">
              <div className="flex justify-between"><span className="font-semibold text-orange-800">3 interaction alerts</span><Badge className="border bg-orange-100 text-orange-700">Review</Badge></div>
              <p className="text-xs text-orange-700">Open Drug Interaction Center.</p>
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============================================================
// 2. PRESCRIPTION QUEUE
// ============================================================
export const PharmacyQueueCenter = () => {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const useApi = isPharmacyApiEnabled() && isPrescriptionsApiEnabled();
  const [apiRows, setApiRows] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(useApi);

  const loadQueue = async () => {
    if (!useApi) {
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const [sent, partial] = await Promise.all([
        listPrescriptions({ status: 'Sent', limit: 100 }),
        listPrescriptions({ status: 'Partially Dispensed', limit: 100 }),
      ]);
      setApiRows(
        [...sent.items, ...partial.items].map(toPharmacyQueueRow) as Prescription[],
      );
      toast.success('Queue refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!useApi) return;
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi]);

  const source = apiRows;
  const rows = useMemo(() => source.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (!q || `${p.patientName} ${p.id} ${p.patientId}`.toLowerCase().includes(q.toLowerCase()))
  ), [filter, q, source]);

  return (
    <Shell title="Centralized Prescription Queue">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Prescription Queue" desc="All incoming prescriptions with payment, stock and priority." />
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search by patient, Rx ID, hospital number..." className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING_PHARMACY">Pending</SelectItem>
              <SelectItem value="AWAITING_PAYMENT">Awaiting Payment</SelectItem>
              <SelectItem value="PAID">Paid - Ready</SelectItem>
              <SelectItem value="STOCK_ISSUE">Stock Issue</SelectItem>
              <SelectItem value="EMERGENCY">Emergency</SelectItem>
              <SelectItem value="DISPENSED">Dispensed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void loadQueue()}>Refresh</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Rx</TableHead><TableHead>Patient</TableHead><TableHead>Hospital #</TableHead><TableHead>Source</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading prescriptions…</TableCell></TableRow>
            )}
            {!loading && rows.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">{p.patientName}</TableCell>
                <TableCell className="text-xs">{p.patientId}</TableCell>
                <TableCell className="text-xs">{p.visitId.includes('045') ? 'OPD' : 'Ward'}</TableCell>
                <TableCell className="text-xs">{p.prescribedBy}</TableCell>
                <TableCell className="text-xs">{p.prescribedAt}</TableCell>
                <TableCell><Badge className={`border ${tone(statusTone(p.paymentStatus))}`}>{p.paymentStatus}</Badge></TableCell>
                <TableCell><Badge className={`border ${tone(statusTone(p.status))}`}>{p.status.replace(/_/g,' ')}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={p.status === 'EMERGENCY' ? 'border-rose-300 text-rose-700' : ''}>{p.status === 'EMERGENCY' ? 'STAT' : 'Normal'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline"><Link to={`/pharmacy/rx/${encodeURIComponent(p.id)}`}><Eye className="h-3 w-3" /></Link></Button>
                    <Button asChild size="sm"><Link to={`/pharmacy/rx/${encodeURIComponent(p.id)}`}><Pill className="h-3 w-3" /></Link></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No prescriptions in this view.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============================================================
// 3. DRUG DISPENSING WORKSPACE
// ============================================================
export const PharmacyDispenseWorkspace = () => {
  const [rx, setRx] = useState<Prescription>(prescriptionsFull[1]);
  const steps = ['Prescription', 'Payment', 'Stock Check', 'Interaction Review', 'Dispense', 'Confirm'];
  const [step, setStep] = useState(0);
  const { createInvoice } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const sendToCashier = async () => {
    await run(
      'pharm-send-cashier',
      `Creating pharmacy invoice for ${rx.patientName}…`,
      () => {
        const inv = createInvoice({
          patientName: rx.patientName,
          hospitalId: rx.patientId,
          phone: (rx as any).phone || '—',
          department: 'Pharmacy',
          amount: rx.total,
          visitCode: rx.visitId,
          source: 'Pharmacy',
        });
        setRx(p => ({ ...p, invoiceId: inv.invoiceId, paymentStatus: 'AWAITING PAYMENT' as any }));
        return inv;
      },
      inv => `Invoice ${inv.invoiceId} sent to Cashier — ${rx.patientName} · ₦${rx.total.toLocaleString()} (visible in POS).`,
    );
  };

  return (
    <Shell title="Drug Dispensing Workspace">
      <Section icon={<Pill className="h-5 w-5" />} title="Dispensing Workspace" desc="Six-stage validated workflow: prescription → payment → stock → interaction → dispense → confirm." />

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <div className="text-xs text-muted-foreground mb-2">Active Prescriptions</div>
          <div className="space-y-1 max-h-[420px] overflow-auto">
            {prescriptionsFull.map(p => (
              <button key={p.id} onClick={() => { setRx(p); setStep(0); }} className={`w-full text-left p-2 rounded-lg border text-xs hover:bg-muted ${rx.id === p.id ? 'bg-primary/10 border-primary' : ''}`}>
                <div className="font-mono">{p.id}</div>
                <div className="font-semibold">{p.patientName}</div>
                <Badge className={`border mt-1 ${tone(statusTone(p.status))}`}>{p.status.replace(/_/g,' ')}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold">{rx.patientName} <span className="text-sm font-normal text-muted-foreground">{rx.age}{rx.gender[0]}</span></div>
              <div className="text-xs text-muted-foreground">{rx.patientId} · {rx.visitId} · Allergies: {rx.allergies || 'NKDA'}</div>
            </div>
            <Badge className={`border ${tone(statusTone(rx.status))}`}>{rx.status.replace(/_/g,' ')}</Badge>
          </div>

          <div className="flex items-center justify-between mb-4 border rounded-lg p-3 bg-muted/30">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <button onClick={() => setStep(i)} className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i+1}</button>
                <span className={`text-xs ${i === step ? 'font-bold' : 'text-muted-foreground'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <div className="text-sm"><b>Diagnosis:</b> {rx.diagnosis}</div>
              <div className="text-sm"><b>Prescribed by:</b> {rx.prescribedBy} on {rx.prescribedAt}</div>
              <Table>
                <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Dose</TableHead><TableHead>Duration</TableHead><TableHead>Qty</TableHead><TableHead>Stock</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rx.items.map(i => {
                    const d = drugCatalog.find(x => x.id === i.drugId);
                    return (
                      <TableRow key={i.drugId}>
                        <TableCell><div className="font-medium">{i.drug}</div><div className="text-xs text-muted-foreground">{i.strength}</div></TableCell>
                        <TableCell>{i.dose}</TableCell>
                        <TableCell>{i.duration}</TableCell>
                        <TableCell>{i.qty}</TableCell>
                        <TableCell><Badge className={`border ${tone(statusTone(d?.status || ''))}`}>{d?.stock} {d?.unit}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {step === 1 && (
            <Card className="bg-muted/30">
              <div className="text-sm mb-2">Payment Status: <Badge className={`border ${tone(statusTone(rx.paymentStatus))}`}>{rx.paymentStatus}</Badge></div>
              <div className="text-sm">Invoice: {rx.invoiceId || '—'} · Total: {formatCurrency(rx.total)}</div>
              {rx.paymentStatus !== 'PAID' && rx.paymentStatus !== 'EMERGENCY' && (
                <LoadingButton className="mt-3" loading={isBusy('pharm-send-cashier')} loadingText="Sending to Cashier…" onClick={sendToCashier}><Send className="h-4 w-4 mr-1.5" />Send to Cashier</LoadingButton>
              )}
            </Card>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {rx.items.map(i => {
                const d = drugCatalog.find(x => x.id === i.drugId);
                const ok = (d?.stock || 0) >= i.qty;
                return (
                  <div key={i.drugId} className={`p-3 rounded-lg border flex items-center justify-between ${ok ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <span>{i.drug} — needs {i.qty}, available {d?.stock}</span>
                    {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertOctagon className="h-5 w-5 text-rose-600" />}
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <div className="p-3 rounded-lg border bg-amber-50">
                <div className="font-semibold text-amber-800">⚠ Moderate Interaction</div>
                <p className="text-xs text-amber-700">Concurrent use may increase sedation. Review dose.</p>
              </div>
              <div className="p-3 rounded-lg border bg-emerald-50">
                <div className="font-semibold text-emerald-800">✓ No allergy conflicts</div>
                <p className="text-xs">Cross-checked against {rx.allergies || 'NKDA'}.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              {rx.items.map(i => (
                <div key={i.drugId} className="grid grid-cols-3 gap-3 items-center p-3 border rounded-lg">
                  <div className="font-medium">{i.drug}</div>
                  <Input type="number" defaultValue={i.qty} />
                  <Select defaultValue={drugCatalog.find(d => d.id === i.drugId)?.batch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value={drugCatalog.find(d => d.id === i.drugId)?.batch || 'b'}>{drugCatalog.find(d => d.id === i.drugId)?.batch}</SelectItem></SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
              <div className="font-bold text-emerald-800">Ready to Confirm</div>
              <p className="text-sm text-emerald-700">Patient will receive SMS receipt. EMR will be updated.</p>
              <Button className="mt-3" onClick={() => toast.success(`${rx.id} dispensed`)}>Confirm Dispense</Button>
            </Card>
          )}

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step-1))} disabled={step === 0}>Back</Button>
            <Button onClick={() => setStep(Math.min(steps.length-1, step+1))} disabled={step === steps.length-1}>Next</Button>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============================================================
// 4. MEDICATION RECONCILIATION
// ============================================================
export const PharmacyReconciliationCenter = () => (
  <Shell title="Medication Reconciliation Center">
    <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Medication Reconciliation" desc="Resolve ARO doctor request: see active meds before prescribing — continue, discontinue, replace or add new." />
    <div className="grid lg:grid-cols-3 gap-4">
      <Card>
        <div className="font-semibold mb-3">Current Active Medications</div>
        {[
          { d: 'Lisinopril 10mg', f: '1 OD', since: '2026-03-15' },
          { d: 'Metformin 500mg', f: '1 BD', since: '2026-02-01' },
          { d: 'Atorvastatin 20mg', f: '1 ON', since: '2026-01-10' },
        ].map(m => (
          <div key={m.d} className="p-2 border rounded-lg mb-2">
            <div className="font-medium text-sm">{m.d}</div>
            <div className="text-xs text-muted-foreground">{m.f} · since {m.since}</div>
            <div className="flex gap-1 mt-2">
              <Button size="sm" variant="outline" className="text-xs">Continue</Button>
              <Button size="sm" variant="outline" className="text-xs">Discontinue</Button>
              <Button size="sm" variant="outline" className="text-xs">Replace</Button>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <div className="font-semibold mb-3">New Prescription Draft</div>
        <Label>Drug</Label>
        <Input placeholder="Search drug..." className="mb-2" />
        <Label>Dose</Label>
        <Input placeholder="e.g. 1 tab BD" className="mb-2" />
        <Label>Duration</Label>
        <Input placeholder="e.g. 14 days" className="mb-2" />
        <Label>Indication</Label>
        <Textarea placeholder="Clinical indication" />
        <Button className="mt-3 w-full" onClick={() => toast.success('Added to reconciliation list')}>Add to Plan</Button>
      </Card>
      <Card>
        <div className="font-semibold mb-3">Reconciliation Alerts</div>
        <div className="p-3 mb-2 rounded-lg bg-rose-50 border border-rose-200">
          <div className="font-semibold text-rose-800 text-sm">Duplicate Therapy</div>
          <p className="text-xs">Two antihypertensives — confirm.</p>
        </div>
        <div className="p-3 mb-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="font-semibold text-amber-800 text-sm">Dose Adjustment</div>
          <p className="text-xs">Renal impairment — reduce dose 50%.</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="font-semibold text-emerald-800 text-sm">No allergy conflicts</div>
        </div>
      </Card>
    </div>
  </Shell>
);

// ============================================================
// 5. EXTERNAL MEDICATIONS
// ============================================================
export const PharmacyExternalMeds = () => {
  const [meds, setMeds] = useState([
    { id: 1, drug: 'Vitamin D3 5000IU', source: 'HealthPlus Pharmacy, Abeokuta', prescriber: 'Self', date: '2026-04-15', dose: '1 tab daily', notes: 'Patient takes for bone health' },
    { id: 2, drug: 'Herbal Tonic (local)', source: 'Traditional Market', prescriber: 'Family', date: '2026-04-10', dose: '15ml BD', notes: 'Disclosed by patient — monitor LFT' },
  ]);
  return (
    <Shell title="External Medication Center">
      <Section icon={<Building2 className="h-5 w-5" />} title="External Medications" desc="ARO-specific: record drugs the patient purchased or uses outside the hospital. Visible to Doctor, Nurse, Pharmacy and EMR."
        action={
          <Dialog>
            <DialogTrigger asChild><Button><PackagePlus className="h-4 w-4" /> Record External Med</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record External Medication</DialogTitle><DialogDescription>This entry syncs to Doctor, Nursing and EMR timelines.</DialogDescription></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Drug Name</Label><Input id="d" /></div>
                <div><Label>Source / Pharmacy</Label><Input /></div>
                <div><Label>Prescribed By</Label><Input placeholder="Self / Doctor name / Other" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date Purchased</Label><Input type="date" /></div>
                  <div><Label>Quantity</Label><Input /></div>
                </div>
                <div><Label>Dose & Frequency</Label><Input placeholder="e.g. 1 tab BD" /></div>
                <div><Label>Administration Notes</Label><Textarea /></div>
              </div>
              <DialogFooter><Button onClick={() => { toast.success('External medication recorded and synced'); }}>Save & Sync</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Source</TableHead><TableHead>Prescriber</TableHead><TableHead>Date</TableHead><TableHead>Dose</TableHead><TableHead>Notes</TableHead><TableHead>Sync</TableHead></TableRow></TableHeader>
          <TableBody>
            {meds.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.drug}</TableCell>
                <TableCell className="text-xs">{m.source}</TableCell>
                <TableCell className="text-xs">{m.prescriber}</TableCell>
                <TableCell className="text-xs">{m.date}</TableCell>
                <TableCell className="text-xs">{m.dose}</TableCell>
                <TableCell className="text-xs max-w-[240px]">{m.notes}</TableCell>
                <TableCell><Badge className="border bg-emerald-100 text-emerald-700">Synced</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============================================================
// 6. INVENTORY CENTER
// ============================================================
export const PharmacyInventoryCenter = () => {
  const [tab, setTab] = useState('catalog');
  const lowStock = drugCatalog.filter(d => d.status === 'Low' || d.status === 'Out of Stock');
  return (
    <Shell title="Inventory Management Center">
      <Section icon={<Boxes className="h-5 w-5" />} title="Enterprise Inventory" desc="Real-time stock, batch tracking, transfers, adjustments and reconciliation." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total SKUs" value={String(drugCatalog.length)} icon={Boxes} />
        <SummaryCard title="Available" value={String(drugCatalog.filter(d => d.status === 'Active').length)} icon={CheckCircle2} />
        <SummaryCard title="Low Stock" value={String(drugCatalog.filter(d => d.status === 'Low').length)} icon={PackageMinus} />
        <SummaryCard title="Out of Stock" value={String(drugCatalog.filter(d => d.status === 'Out of Stock').length)} icon={AlertOctagon} />
        <SummaryCard title="Reserved" value="14" icon={PackageSearch} />
        <SummaryCard title="Expired" value="2" icon={CalendarClock} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="catalog">Drug Catalog</TabsTrigger><TabsTrigger value="low">Low / Out</TabsTrigger><TabsTrigger value="batch">Batch Tracking</TabsTrigger><TabsTrigger value="adjust">Adjustments</TabsTrigger><TabsTrigger value="transfer">Transfers</TabsTrigger></TabsList>
        <TabsContent value="catalog">
          <Card>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Search drug..." className="flex-1" />
              <Button onClick={() => toast.success('Stock entry recorded')}><PackagePlus className="h-4 w-4" /> Add Stock</Button>
              <Button variant="outline" onClick={() => toast('Stock take started')}><ClipboardCheck className="h-4 w-4" /> Stock Take</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Category</TableHead><TableHead>Strength</TableHead><TableHead>Stock</TableHead><TableHead>Reorder</TableHead><TableHead>Batch</TableHead><TableHead>Expiry</TableHead><TableHead>Shelf</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {drugCatalog.map(d => (
                  <TableRow key={d.id}>
                    <TableCell><div className="font-medium">{d.name}{d.controlled && <Badge variant="outline" className="ml-2 text-rose-600 border-rose-300">CTRL</Badge>}</div><div className="text-xs text-muted-foreground">{d.genericName}</div></TableCell>
                    <TableCell className="text-xs">{d.category}</TableCell>
                    <TableCell className="text-xs">{d.strength}</TableCell>
                    <TableCell className="font-semibold">{d.stock}</TableCell>
                    <TableCell className="text-xs">{d.reorderLevel}</TableCell>
                    <TableCell className="text-xs">{d.batch}</TableCell>
                    <TableCell className="text-xs">{d.expiry}</TableCell>
                    <TableCell className="text-xs">{d.shelf}</TableCell>
                    <TableCell>{formatCurrency(d.unitPrice)}</TableCell>
                    <TableCell><Badge className={`border ${tone(statusTone(d.status))}`}>{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="low"><Card><Table><TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Stock</TableHead><TableHead>Reorder</TableHead><TableHead>Status</TableHead><TableHead>Substitutes</TableHead></TableRow></TableHeader><TableBody>{lowStock.map(d => <TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.stock}</TableCell><TableCell>{d.reorderLevel}</TableCell><TableCell><Badge className={`border ${tone(statusTone(d.status))}`}>{d.status}</Badge></TableCell><TableCell className="text-xs">{d.alternatives?.map(a => drugCatalog.find(x => x.id === a)?.name).join(', ') || '—'}</TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>
        <TabsContent value="batch"><Card><p className="text-sm text-muted-foreground">Batch-level inventory with FEFO (First Expiry First Out) dispensing rule.</p></Card></TabsContent>
        <TabsContent value="adjust"><Card><div className="grid grid-cols-2 gap-3"><Input placeholder="Drug" /><Input placeholder="Adjustment qty (+/-)" type="number" /><Input placeholder="Reason" className="col-span-2" /><Button onClick={() => toast.success('Adjustment posted')}>Post Adjustment</Button></div></Card></TabsContent>
        <TabsContent value="transfer"><Card><div className="grid grid-cols-3 gap-3"><Select><SelectTrigger><SelectValue placeholder="From" /></SelectTrigger><SelectContent><SelectItem value="main">Main Pharmacy</SelectItem></SelectContent></Select><Select><SelectTrigger><SelectValue placeholder="To" /></SelectTrigger><SelectContent><SelectItem value="ward">Ward Stock</SelectItem></SelectContent></Select><Input placeholder="Qty" /></div><Button className="mt-3" onClick={() => toast.success('Transfer initiated')}>Transfer</Button></Card></TabsContent>
      </Tabs>
    </Shell>
  );
};

// ============================================================
// 7. STOCK MOVEMENTS
// ============================================================
export const PharmacyMovementCenter = () => (
  <Shell title="Drug Movement Audit Center">
    <Section icon={<ArrowLeftRight className="h-5 w-5" />} title="Stock Movement History" desc="Every inflow, outflow, transfer and adjustment with full audit trail." />
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Drug</TableHead><TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>Rx / Note</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader>
        <TableBody>
          {stockMovements.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-xs">{m.at}</TableCell>
              <TableCell className="font-medium">{m.drug}</TableCell>
              <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
              <TableCell className={m.qty < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>{m.qty > 0 ? '+' : ''}{m.qty}</TableCell>
              <TableCell>{m.before}</TableCell>
              <TableCell>{m.after}</TableCell>
              <TableCell className="text-xs">{m.rxId || m.note}</TableCell>
              <TableCell className="text-xs">{m.actor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============================================================
// 8. EXPIRY MONITORING
// ============================================================
export const PharmacyExpiryCenter = () => {
  const apiOn = isPharmacyOpsApiEnabled();
  const [data, setData] = useState<PharmacyExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<PharmacyExpiryBucket>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [quarantining, setQuarantining] = useState<number | null>(null);

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(
        await getPharmacyExpiry({
          bucket,
          q: q.trim() || undefined,
          page,
          limit: 50,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load expiry monitoring');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, page]);

  const quarantine = async (batchId: number) => {
    setQuarantining(batchId);
    try {
      await quarantinePharmacyBatch(batchId);
      toast.success('Batch quarantined');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Quarantine failed');
    } finally {
      setQuarantining(null);
    }
  };

  const bucketTone = (b: string) => {
    if (b === 'expired' || b === 'Expired') return 'red';
    if (b === 'critical') return 'red';
    if (b === 'warning') return 'orange';
    if (b === 'soon') return 'amber';
    return 'sky';
  };

  const summary = data?.summary;
  const thresholds = data?.thresholds;

  return (
    <Shell title="Drug Expiry Monitoring">
      <Section
        icon={<CalendarClock className="h-5 w-5" />}
        title="Expiry Monitoring"
        desc={`Track batches by expiry window using pharmacy settings (critical ≤${thresholds?.expiryCriticalDays ?? '—'}d, warning ≤${thresholds?.expiryWarningDays ?? '—'}d, soon ≤${thresholds?.expiringSoonDays ?? '—'}d).`}
        action={
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <Badge className={`border ${tone('red')}`}>Expired</Badge>
          <div className="text-3xl font-bold mt-2">{loading ? '…' : (summary?.expired ?? '—')}</div>
        </Card>
        <Card>
          <Badge className={`border ${tone('red')}`}>Critical</Badge>
          <div className="text-3xl font-bold mt-2">{loading ? '…' : (summary?.critical ?? '—')}</div>
        </Card>
        <Card>
          <Badge className={`border ${tone('orange')}`}>Warning</Badge>
          <div className="text-3xl font-bold mt-2">{loading ? '…' : (summary?.warning ?? '—')}</div>
        </Card>
        <Card>
          <Badge className={`border ${tone('amber')}`}>Soon</Badge>
          <div className="text-3xl font-bold mt-2">{loading ? '…' : (summary?.soon ?? '—')}</div>
        </Card>
        <Card>
          <Badge className={`border ${tone('purple')}`}>Value at risk</Badge>
          <div className="text-xl font-bold mt-2">{loading ? '…' : formatCurrency(summary?.valueAtRisk ?? 0)}</div>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drug, batch, location"
            className="max-w-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void load(); } }}
          />
          <Select value={bucket} onValueChange={(v) => { setPage(1); setBucket(v as PharmacyExpiryBucket); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Bucket" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All at risk</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="soon">Soon</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setPage(1); void load(); }}>
            <Search className="h-4 w-4 mr-1" />Search
          </Button>
        </div>
        {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Days left</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">Loading expiry batches…</TableCell></TableRow>
            ) : (data?.items ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">No batches in this expiry window.</TableCell></TableRow>
            ) : (data?.items ?? []).map((d) => (
              <TableRow key={d.batchId}>
                <TableCell className="font-medium">{d.drugName}</TableCell>
                <TableCell className="text-xs font-mono">{d.batchNo}</TableCell>
                <TableCell>{d.qtyAvailable}</TableCell>
                <TableCell className="text-xs">{new Date(d.expiryDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs">{d.daysLeft}</TableCell>
                <TableCell><Badge className={`border ${tone(bucketTone(d.bucket))}`}>{d.bucket}</Badge></TableCell>
                <TableCell className="text-xs">{formatCurrency(d.valueAtRisk)}</TableCell>
                <TableCell className="text-xs">{d.status}</TableCell>
                <TableCell>
                  {d.status === 'Quarantined' ? (
                    <span className="text-xs text-muted-foreground">Quarantined</span>
                  ) : (
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      loading={quarantining === d.batchId}
                      loadingText="…"
                      onClick={() => void quarantine(d.batchId)}
                    >
                      Quarantine
                    </LoadingButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{data?.meta.total ?? 0} batch(es) · {summary?.quarantined ?? 0} already quarantined in view</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-2 py-1">Page {page}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!data || page * data.meta.limit >= data.meta.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Shell>
  );
};

// ============================================================
// 9. STOCK FORECAST
// ============================================================
export const PharmacyForecastCenter = () => (
  <Shell title="Stock Forecast Dashboard">
    <Section icon={<TrendingUp className="h-5 w-5" />} title="Stock Forecast" desc="AI-assisted prediction of fast/slow movers and stock-out risk (UI prototype)." />
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <div className="font-semibold mb-2">Fast Moving Drugs</div>
        {['Paracetamol', 'Coartem', 'Amoxicillin'].map(n => (
          <div key={n} className="flex justify-between p-2 border-b text-sm"><span>{n}</span><Badge className="border bg-emerald-100 text-emerald-700">High velocity</Badge></div>
        ))}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Slow Moving Drugs</div>
        {['Quinine', 'Diclofenac'].map(n => (
          <div key={n} className="flex justify-between p-2 border-b text-sm"><span>{n}</span><Badge variant="outline">Low velocity</Badge></div>
        ))}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Predicted Stock Outs (14d)</div>
        {['Metformin (already out)', 'Amoxicillin', 'Diclofenac'].map(n => (
          <div key={n} className="flex justify-between p-2 border-b text-sm"><span>{n}</span><Badge className="border bg-rose-100 text-rose-700">Risk</Badge></div>
        ))}
      </Card>
      <Card>
        <div className="font-semibold mb-2">Suggested Reorders</div>
        <Table><TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Suggested Qty</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Metformin</TableCell><TableCell>800</TableCell><TableCell><Button size="sm" onClick={() => toast.success('PO drafted')}>Create PO</Button></TableCell></TableRow>
            <TableRow><TableCell>Amoxicillin</TableCell><TableCell>500</TableCell><TableCell><Button size="sm" onClick={() => toast.success('PO drafted')}>Create PO</Button></TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </Shell>
);

// ============================================================
// 10. DRUG INTERACTION CENTER — live Clinical Pharmacy page
// ============================================================
export { PharmacyInteractionCenter, PharmacyClinicalPharmacyPage } from './pharmacy/PharmacyClinicalPharmacyPage';

// ============================================================
// 11. CONTROLLED DRUG REGISTER
// ============================================================
export const PharmacyControlledRegister = () => {
  const controlled = drugCatalog.filter(d => d.controlled);
  const logs = stockMovements.filter(m => controlled.some(c => c.id === m.drugId));
  return (
    <Shell title="Controlled Drug Register">
      <Section icon={<ShieldX className="h-5 w-5" />} title="Controlled Drug Register" desc="Schedule II–IV drugs: balance, dispensing log, witness signatures, audit." />
      <Card className="mb-4">
        <Table>
          <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Balance</TableHead><TableHead>Last Movement</TableHead><TableHead>Reorder</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {controlled.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name} <Badge variant="outline" className="text-rose-600 border-rose-300">CTRL</Badge></TableCell>
                <TableCell>{d.stock} {d.unit}</TableCell>
                <TableCell className="text-xs">2026-04-28 11:48</TableCell>
                <TableCell>{d.reorderLevel}</TableCell>
                <TableCell><Badge className="border bg-emerald-100 text-emerald-700">Active</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <div className="font-semibold mb-3">Dispensing Log</div>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Drug</TableHead><TableHead>Qty</TableHead><TableHead>Rx</TableHead><TableHead>Pharmacist</TableHead><TableHead>Witness</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{l.at}</TableCell>
                <TableCell>{l.drug}</TableCell>
                <TableCell>{l.qty}</TableCell>
                <TableCell className="text-xs">{l.rxId}</TableCell>
                <TableCell className="text-xs">{l.actor}</TableCell>
                <TableCell className="text-xs">Pharm. Olumide</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============================================================
// 12. INPATIENT MEDICATION DASHBOARD
// ============================================================
export const PharmacyInpatientCenter = () => {
  const apiOn = isPharmacyOpsApiEnabled();
  const [data, setData] = useState<PharmacyInpatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [wardId, setWardId] = useState('all');
  const [status, setStatus] = useState('awaiting');
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPharmacyInpatient({
        q: q.trim() || undefined,
        wardId: wardId === 'all' ? undefined : Number(wardId),
        status,
        page,
        limit: 50,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load inpatient pharmacy queue');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardId, status, page]);

  const queueTone = (s: PharmacyInpatientRow['queueStatus']) => {
    switch (s) {
      case 'Awaiting Pharmacy': return 'amber';
      case 'Awaiting Payment': return 'purple';
      case 'Dispensed': return 'green';
      default: return 'sky';
    }
  };

  const summary = data?.summary;

  return (
    <Shell title="Inpatient Medication Management">
      <Section
        icon={<Bed className="h-5 w-5" />}
        title="Inpatient Pharmacy Queue"
        desc="Active admissions with ward prescriptions awaiting pharmacy action. Medication administration (MAR) remains in Nursing."
        action={
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            <RotateCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Admitted" value={String(summary?.admitted ?? '—')} icon={Bed} />
        <SummaryCard title="Awaiting Pharmacy" value={String(summary?.awaitingPharmacy ?? '—')} icon={CalendarClock} />
        <SummaryCard title="Awaiting Payment" value={String(summary?.awaitingPayment ?? '—')} icon={CreditCard} />
        <SummaryCard title="Dispensed" value={String(summary?.dispensed ?? '—')} icon={CheckCircle2} />
        <SummaryCard title="No Prescription" value={String(summary?.noPrescription ?? '—')} icon={FileText} />
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patient, ward, Rx, drug"
            className="max-w-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void load(); } }}
          />
          <Select value={wardId} onValueChange={(v) => { setPage(1); setWardId(v); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ward" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All wards</SelectItem>
              {(data?.wards ?? []).map((w) => (
                <SelectItem key={w.wardId} value={String(w.wardId)}>{w.wardName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="awaiting">Awaiting action</SelectItem>
              <SelectItem value="awaiting-pharmacy">Awaiting pharmacy</SelectItem>
              <SelectItem value="awaiting-payment">Awaiting payment</SelectItem>
              <SelectItem value="dispensed">Dispensed</SelectItem>
              <SelectItem value="no-rx">No prescription</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setPage(1); void load(); }}>
            <Search className="h-4 w-4 mr-1" />Search
          </Button>
        </div>
        {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Ward / Bed</TableHead>
              <TableHead>Rx</TableHead>
              <TableHead>Drugs</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Loading inpatient queue…</TableCell></TableRow>
            ) : (data?.items ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No admitted patients match this view.</TableCell></TableRow>
            ) : (data?.items ?? []).map((r) => (
              <TableRow key={`${r.admissionId}-${r.rxNo ?? 'none'}`}>
                <TableCell className="font-medium">
                  {r.patientName}
                  <div className="text-[10px] text-muted-foreground font-mono">{r.hospitalNo ?? '—'}</div>
                </TableCell>
                <TableCell className="text-xs">{r.wardName ?? '—'}{r.bedNo ? ` / ${r.bedNo}` : ''}</TableCell>
                <TableCell className="text-xs font-mono">{r.rxNo ?? '—'}</TableCell>
                <TableCell className="text-xs max-w-[220px] truncate">{r.drugSummary || '—'}</TableCell>
                <TableCell className="text-xs">{r.paymentStatus ?? '—'}</TableCell>
                <TableCell><Badge className={`border ${tone(queueTone(r.queueStatus))}`}>{r.queueStatus}</Badge></TableCell>
                <TableCell>
                  {r.rxNo ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/pharmacy/rx/${encodeURIComponent(r.rxNo)}`}>Open Rx</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{data?.meta.total ?? 0} row(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-2 py-1">Page {page}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={!data || page * data.meta.limit >= data.meta.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Shell>
  );
};

// ============================================================
// 13. NHIA WORKFLOW
// ============================================================
export const PharmacyNhiaCenter = () => (
  <Shell title="NHIA / HMO Pharmacy Workflow">
    <Section icon={<Receipt className="h-5 w-5" />} title="NHIA / HMO" desc="Approved drug list, rejections and claim status." />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <SummaryCard title="NHIA Patients" value="38" icon={UserPlus} />
      <SummaryCard title="Approved Drugs" value="142" icon={CheckCircle2} />
      <SummaryCard title="Rejected" value="6" icon={AlertOctagon} />
      <SummaryCard title="Claims Submitted" value={formatCurrency(2_840_000)} icon={CreditCard} />
    </div>
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>NHIA ID</TableHead><TableHead>Drug</TableHead><TableHead>Decision</TableHead><TableHead>Claim</TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { p: 'Amina Yusuf', n: 'NHIA/4291', d: 'Amoxicillin 500mg', dec: 'Approved', t: 'green', c: 'Submitted' },
            { p: 'John Doe', n: 'NHIA/4302', d: 'Coartem 80/480', dec: 'Approved', t: 'green', c: 'Paid' },
            { p: 'Chidi Eze', n: 'NHIA/4321', d: 'Atorvastatin 40mg', dec: 'Rejected', t: 'red', c: 'Patient pays cash' },
          ].map((r,i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.p}</TableCell>
              <TableCell className="text-xs">{r.n}</TableCell>
              <TableCell>{r.d}</TableCell>
              <TableCell><Badge className={`border ${tone(r.t)}`}>{r.dec}</Badge></TableCell>
              <TableCell className="text-xs">{r.c}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============================================================
// 14. PHARMACY BILLING (view only — payment collected by cashier)
// ============================================================
export const PharmacyBillingCenter = () => {
  const apiOn = isPharmacyBillingApiEnabled();
  const [summary, setSummary] = useState<PharmacyBillingSummary | null>(null);
  const [bills, setBills] = useState<PharmacyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sum, list] = await Promise.all([
        getPharmacyBillingSummary(),
        listPharmacyBills({
          q: q.trim() || undefined,
          paymentStatus: payFilter === 'all' ? undefined : payFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
          limit: 100,
        }),
      ]);
      setSummary(sum);
      setBills(list.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [payFilter, typeFilter]);

  const unpaid = (b: PharmacyBill) =>
    b.paymentStatus === 'Unpaid' || b.paymentStatus === 'Emergency';

  return (
    <Shell title="Pharmacy Wallet & Billing">
      <Section
        icon={<CreditCard className="h-5 w-5" />}
        title="Pharmacy Billing"
        desc="Revenue view for doctor prescriptions and walk-in sales. Payment collection is cashier-only."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/cashier/pharmacy">
                <CreditCard className="h-4 w-4 mr-1" />Collect at Cashier
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RotateCcw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>
        }
      />
      <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
        Pharmacy staff can view unpaid and emergency bills here. Only Cashiers collect payment at{' '}
        <Link to="/dashboard/cashier/pharmacy" className="underline font-medium">Cashier → Pharmacy Payments</Link>.
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Paid (period)" value={String(summary?.paidCount ?? '—')} icon={CheckCircle2} />
        <SummaryCard title="Pending" value={String(summary?.pendingCount ?? '—')} icon={Activity} />
        <SummaryCard title="Cash" value={formatCurrency(summary?.channelTotals?.Cash ?? 0)} icon={CreditCard} />
        <SummaryCard title="POS" value={formatCurrency(summary?.channelTotals?.['POS Card'] ?? 0)} icon={CreditCard} />
        <SummaryCard title="Transfer" value={formatCurrency(summary?.channelTotals?.['Bank Transfer'] ?? 0)} icon={CreditCard} />
        <SummaryCard title="Wallet" value={formatCurrency(summary?.channelTotals?.Wallet ?? 0)} icon={CreditCard} />
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Rx / sale / patient"
            className="max-w-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
          />
          <Select value={payFilter} onValueChange={setPayFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Unpaid,Emergency">Unpaid + Emergency</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="prescription">Prescription</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}><Search className="h-4 w-4 mr-1" />Search</Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading bills…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-600">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No bills found.</TableCell>
                </TableRow>
              ) : bills.map((b) => (
                <TableRow key={`${b.type}-${b.id}`}>
                  <TableCell className="font-mono text-xs">{b.refNo}</TableCell>
                  <TableCell className="text-xs">{b.type === 'prescription' ? 'Rx' : 'Walk-in'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.patientName}</div>
                    <div className="text-xs text-muted-foreground">{b.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(b.total)}</TableCell>
                  <TableCell className="text-xs">{b.paymentChannel ?? '—'}</TableCell>
                  <TableCell><Badge className={`border ${tone(b.paymentStatus === 'Paid' ? 'green' : b.paymentStatus === 'Emergency' ? 'red' : 'amber')}`}>{b.paymentStatus}</Badge></TableCell>
                  <TableCell className="text-xs">{b.status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {unpaid(b) ? 'Pay at cashier' : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Shell>
  );
};

// ============================================================
// 15. RETURNS & REVERSALS
// ============================================================
export const PharmacyReturnsCenter = () => {
  const apiOn = isPharmacyReturnsApiEnabled();
  const [summary, setSummary] = useState<PharmacyReturnsSummary | null>(null);
  const [returns, setReturns] = useState<PharmacyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookupQ, setLookupQ] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [source, setSource] = useState<PharmacyReturnLookup | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});
  const [role, setRole] = useState('Patient');
  const [returnedByName, setReturnedByName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sum, list] = await Promise.all([
        getPharmacyReturnsSummary(),
        listPharmacyReturns({ limit: 50 }),
      ]);
      setSummary(sum);
      setReturns(list.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const doLookup = async () => {
    if (!lookupQ.trim()) {
      toast.error('Enter an Rx or walk-in sale number');
      return;
    }
    setLookingUp(true);
    try {
      const data = await lookupPharmacyReturnSource(lookupQ.trim());
      setSource(data);
      const initial: Record<number, number> = {};
      for (const line of data.lines) {
        initial[line.sourceItemId] = line.qtyReturnable;
      }
      setQtyMap(initial);
      if (data.lines.length === 0) toast.message('No returnable quantities left on this document');
    } catch (err) {
      setSource(null);
      toast.error(err instanceof ApiError ? err.message : 'Lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const doSubmit = async () => {
    if (!source) return;
    if (!returnedByName.trim() || !reason.trim()) {
      toast.error('Returned-by name and reason are required');
      return;
    }
    const items = source.lines
      .map((l) => ({ sourceItemId: l.sourceItemId, quantity: qtyMap[l.sourceItemId] ?? 0 }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      toast.error('Enter at least one return quantity');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPharmacyReturn({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        items,
        reason: reason.trim(),
        returnedByRole: role,
        returnedByName: returnedByName.trim(),
      });
      toast.success(`Return ${created.returnNo} processed — stock restored`);
      setSource(null);
      setLookupQ('');
      setReason('');
      setReturnedByName('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Return failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title="Drug Returns & Reversal">
      <Section
        icon={<RotateCcw className="h-5 w-5" />}
        title="Drug Returns"
        desc="Return already-dispensed drugs from a patient, doctor, or nurse. Stock is restored to batches."
        action={<Button variant="outline" size="sm" onClick={() => void load()}><RotateCcw className="h-4 w-4 mr-1" />Refresh</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Returns today" value={String(summary?.todayCount ?? '—')} icon={RotateCcw} />
        <SummaryCard title="Units restored today" value={String(summary?.todayUnits ?? '—')} icon={PackagePlus} />
        <SummaryCard title="Value today" value={formatCurrency(summary?.todayValue ?? 0)} icon={Receipt} />
        <SummaryCard title="This week" value={String(summary?.weekCount ?? '—')} icon={Activity} />
      </div>

      <Tabs defaultValue="return">
        <TabsList>
          <TabsTrigger value="return">Returns</TabsTrigger>
          <TabsTrigger value="cancel" disabled>Cancellations</TabsTrigger>
          <TabsTrigger value="reverse" disabled>Dispensing Reversal</TabsTrigger>
          <TabsTrigger value="refund" disabled>Refunds</TabsTrigger>
        </TabsList>
        <TabsContent value="return" className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3">Look up dispensed Rx / walk-in sale</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Input
                value={lookupQ}
                onChange={(e) => setLookupQ(e.target.value)}
                placeholder="e.g. RX-2026-0001 or WS-2026-0003"
                className="max-w-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') void doLookup(); }}
              />
              <LoadingButton loading={lookingUp} loadingText="Looking up…" onClick={() => void doLookup()}>
                <Search className="h-4 w-4 mr-1" />Lookup
              </LoadingButton>
            </div>
            {source && (
              <div className="space-y-4 border-t pt-4">
                <div className="text-sm">
                  <span className="font-mono font-semibold">{source.refNo}</span>
                  <span className="text-muted-foreground"> · {source.sourceType} · {source.patientName} · {source.hospitalNo ?? '—'}</span>
                </div>
                {source.lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing left to return on this document.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
                        <tr>
                          <th className="text-left p-2">Drug</th>
                          <th className="text-right p-2">Dispensed</th>
                          <th className="text-right p-2">Already returned</th>
                          <th className="text-right p-2">Return qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {source.lines.map((l) => (
                          <tr key={l.sourceItemId} className="border-t">
                            <td className="p-2">{l.drugName} {l.strength ?? ''}</td>
                            <td className="p-2 text-right">{l.qtyDispensed}</td>
                            <td className="p-2 text-right">{l.qtyReturned}</td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                min={0}
                                max={l.qtyReturnable}
                                className="w-20 ml-auto"
                                value={qtyMap[l.sourceItemId] ?? 0}
                                onChange={(e) =>
                                  setQtyMap((m) => ({
                                    ...m,
                                    [l.sourceItemId]: Math.min(
                                      l.qtyReturnable,
                                      Math.max(0, Number(e.target.value) || 0),
                                    ),
                                  }))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Returned by role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Patient', 'Doctor', 'Nurse', 'Pharmacist', 'Other'].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Returned by name</Label>
                    <Input className="mt-1" value={returnedByName} onChange={(e) => setReturnedByName(e.target.value)} placeholder="Full name" />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being returned?" />
                </div>
                <LoadingButton loading={submitting} loadingText="Processing…" onClick={() => void doSubmit()} disabled={!source.lines.length}>
                  Process Return
                </LoadingButton>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Recent returns</h3>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-rose-600">{error}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No returns yet.</TableCell>
                    </TableRow>
                  ) : returns.map((r) => (
                    <TableRow key={r.returnId}>
                      <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                      <TableCell className="text-xs">{r.sourceRefNo ?? r.sourceType}</TableCell>
                      <TableCell>{r.patientName}</TableCell>
                      <TableCell className="text-xs">{r.returnedByRole}: {r.returnedByName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totalValue)}</TableCell>
                      <TableCell className="text-xs">{r.createdAt?.replace('T', ' ').slice(0, 16) ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="cancel">
          <Card><p className="text-sm text-muted-foreground">Coming soon — Rx cancellations before dispense.</p></Card>
        </TabsContent>
        <TabsContent value="reverse">
          <Card><p className="text-sm text-muted-foreground">Coming soon — full dispensing reversal.</p></Card>
        </TabsContent>
        <TabsContent value="refund">
          <Card><p className="text-sm text-muted-foreground">Coming soon — cash refund requests to Accounts.</p></Card>
        </TabsContent>
      </Tabs>
    </Shell>
  );
};

// ============================================================
// 16. RECONCILIATION REPORT
// ============================================================
export const PharmacyDispenseReconciliation = () => (
  <Shell title="Prescription & Dispensing Reconciliation">
    <Section icon={<FileSignature className="h-5 w-5" />} title="Reconciliation" desc="Prescribed vs Dispensed vs Returned vs Outstanding — closes the ARO tally gap." />
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Prescribed</TableHead><TableHead>Dispensed</TableHead><TableHead>Returned</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {[
            { d: 'Coartem 80/480', p: 240, di: 240, r: 0, t: 'green' },
            { d: 'Paracetamol 500mg', p: 600, di: 590, r: 5, t: 'amber' },
            { d: 'Amoxicillin 500mg', p: 210, di: 210, r: 0, t: 'green' },
            { d: 'Folic Acid 5mg', p: 90, di: 80, r: 0, t: 'orange' },
            { d: 'Metformin 500mg', p: 120, di: 0, r: 0, t: 'red' },
          ].map((r,i) => {
            const out = r.p - r.di - r.r;
            return (
              <TableRow key={i}>
                <TableCell>{r.d}</TableCell>
                <TableCell>{r.p}</TableCell>
                <TableCell>{r.di}</TableCell>
                <TableCell>{r.r}</TableCell>
                <TableCell className={out > 0 ? 'font-bold text-orange-600' : 'text-emerald-600'}>{out}</TableCell>
                <TableCell><Badge className={`border ${tone(r.t)}`}>{out === 0 ? 'Balanced' : 'Variance'}</Badge></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============================================================
// 17. MEDICATION TIMELINE
// ============================================================
export const PharmacyTimelineCenter = () => (
  <Shell title="Medication Timeline">
    <Section icon={<History className="h-5 w-5" />} title="Patient Medication Timeline" desc="Created → Dispensed → Administered → Returned → Refilled → Discontinued." />
    <Card>
      <div className="space-y-3">
        {[
          { at: '2026-04-28 10:15', a: 'Dr. Okafor', e: 'Prescription Created', d: 'Coartem 80/480 BD × 3 days', t: 'blue' },
          { at: '2026-04-28 10:20', a: 'Cashier Kemi', e: 'Payment Confirmed', d: 'POS — ₦7,200', t: 'green' },
          { at: '2026-04-28 10:32', a: 'Pharm. Adeyemi', e: 'Dispensed', d: '24 tabs Coartem + 30 Paracetamol', t: 'green' },
          { at: '2026-04-28 14:00', a: 'Nurse Tola', e: 'Dose Administered', d: '4 tabs PO', t: 'sky' },
          { at: '2026-04-28 20:00', a: 'Nurse Bola', e: 'Dose Administered', d: '4 tabs PO', t: 'sky' },
          { at: '2026-04-29 08:00', a: 'Nurse Tola', e: 'Refill Reminder Sent', d: 'SMS to NOK', t: 'amber' },
        ].map((ev,i) => (
          <div key={i} className="flex gap-3 items-start border-l-2 border-primary pl-3">
            <Badge className={`border ${tone(ev.t)}`}>{ev.e}</Badge>
            <div className="flex-1">
              <div className="text-sm">{ev.d}</div>
              <div className="text-xs text-muted-foreground">{ev.at} · {ev.a}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </Shell>
);

// ============================================================
// 18. REPORTING
// ============================================================
export const PharmacyReportsCenter = () => {
  const apiOn = isPharmacyOpsApiEnabled();
  const [catalog, setCatalog] = useState<PharmacyReportCatalogItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<PharmacyReportResult | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setLoadingCatalog(false);
      setError('Backend API is not configured.');
      return;
    }
    void (async () => {
      setLoadingCatalog(true);
      try {
        const data = await getPharmacyReportCatalog();
        setCatalog(data.items);
        setSelected(data.items[0]?.type ?? null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load report catalog');
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [apiOn]);

  const generate = async (type?: string) => {
    const reportType = type ?? selected;
    if (!reportType) return;
    setSelected(reportType);
    setGenerating(true);
    setError(null);
    try {
      const data = await generatePharmacyReport(reportType, {
        from: new Date(from).toISOString(),
        to: new Date(`${to}T23:59:59`).toISOString(),
        limit: 200,
      });
      setReport(data);
      toast.success('Report generated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate report');
      setReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      report.columns,
      ...report.items.map((item) =>
        report.columns.map((c) => String(item[c] ?? '')),
      ),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pharmacy-${report.type}-${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Pharmacy Report: ${report.type}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`From ${report.from ?? '—'} to ${report.to ?? '—'}`, 14, 24);
    let y = 34;
    Object.entries(report.summary).forEach(([k, v]) => {
      doc.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, 14, y);
      y += 6;
    });
    y += 4;
    report.items.slice(0, 40).forEach((item) => {
      const line = report.columns.map((c) => String(item[c] ?? '')).join(' · ');
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      doc.text(line.slice(0, 110), 14, y);
      y += 6;
    });
    doc.save(`pharmacy-${report.type}-${Date.now()}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <Shell title="Pharmacy Reporting Center">
      <Section
        icon={<ScrollText className="h-5 w-5" />}
        title="Reports"
        desc="Daily/monthly prescriptions, drug utilization, controlled drugs, revenue, inventory, expiry, and returns."
      />
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <LoadingButton
            className="w-full"
            loading={generating}
            loadingText="Generating…"
            disabled={!selected || loadingCatalog}
            onClick={() => void generate()}
          >
            <Printer className="h-3 w-3 mr-1" />Generate Selected
          </LoadingButton>
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loadingCatalog ? (
          <Card className="col-span-full text-center text-sm text-muted-foreground py-8">Loading report catalog…</Card>
        ) : catalog.map((r) => (
          <Card
            key={r.type}
            className={`hover:shadow-md transition cursor-pointer ${selected === r.type ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelected(r.type)}
          >
            <FileText className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">{r.label}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{r.description}</p>
            <Button
              size="sm"
              disabled={generating}
              onClick={(e) => {
                e.stopPropagation();
                void generate(r.type);
              }}
            >
              <Printer className="h-3 w-3" /> Generate
            </Button>
          </Card>
        ))}
      </div>

      {generating && (
        <div className="mb-4 text-sm text-muted-foreground">Generating report…</div>
      )}

      {report && !generating && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="font-semibold capitalize">{report.type.replace(/-/g, ' ')}</div>
              <div className="text-xs text-muted-foreground">
                {report.from ? new Date(report.from).toLocaleDateString() : '—'} →{' '}
                {report.to ? new Date(report.to).toLocaleDateString() : '—'} · {report.meta.total} row(s)
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV}>CSV</Button>
              <Button size="sm" variant="outline" onClick={exportPDF}>PDF</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {Object.entries(report.summary).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                <div className="font-semibold text-sm">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </div>
              </div>
            ))}
          </div>
          {report.items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No rows for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.columns.map((c) => (
                      <TableHead key={c} className="capitalize">{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.items.map((row, i) => (
                    <TableRow key={i}>
                      {report.columns.map((c) => (
                        <TableCell key={c} className="text-xs">
                          {row[c] == null ? '—' : String(row[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </Shell>
  );
};

// ============================================================
// 19. ANALYTICS
// ============================================================
export const PharmacyAnalyticsCenter = () => {
  const apiOn = isPharmacyOpsApiEnabled();
  const [data, setData] = useState<PharmacyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(
        await getPharmacyAnalytics({
          from: new Date(from).toISOString(),
          to: new Date(`${to}T23:59:59`).toISOString(),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pharmacy analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = data?.kpis;
  const charts = data?.charts;

  return (
    <Shell title="Pharmacy Analytics">
      <Section
        icon={<BarChart3 className="h-5 w-5" />}
        title="Analytics"
        desc="Live revenue, dispensing volume, inventory health, controlled usage, returns, and procurement snapshot."
        action={
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        }
      />
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end md:col-span-2 gap-2">
          <LoadingButton loading={loading} loadingText="Loading…" onClick={() => void load()}>
            Apply range
          </LoadingButton>
          <p className="text-xs text-muted-foreground self-center">
            {data?.asOf ? `Updated ${new Date(data.asOf).toLocaleString()}` : ''}
          </p>
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Revenue" value={loading ? '…' : formatCurrency(k?.revenue ?? 0)} icon={CreditCard} />
        <SummaryCard title="Rx Dispensed" value={String(loading ? '…' : (k?.prescriptionsDispensed ?? '—'))} icon={Pill} />
        <SummaryCard title="Walk-In Dispensed" value={String(loading ? '…' : (k?.walkInDispensed ?? '—'))} icon={PackagePlus} />
        <SummaryCard title="Emergency" value={String(loading ? '…' : (k?.emergencyDispenses ?? '—'))} icon={AlertTriangle} />
        <SummaryCard title="Returns" value={String(loading ? '…' : (k?.returnsCount ?? '—'))} icon={RotateCcw} />
        <SummaryCard title="Low Stock" value={String(loading ? '…' : (k?.lowStock ?? '—'))} icon={AlertOctagon} />
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading analytics…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="font-semibold mb-2">Revenue (7d)</div>
            <div className="text-3xl font-bold mb-2">{formatCurrency(k?.revenue ?? 0)}</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={charts?.revenueTrend ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="v" stroke="#0ea5e9" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="font-semibold mb-2">Top Dispensed</div>
            {(charts?.topDispensed ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No dispenses in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts?.topDispensed ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <div className="font-semibold mb-2">Payment Channels</div>
            {(charts?.channelMix ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No paid revenue in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts?.channelMix ?? []} dataKey="value" nameKey="name" outerRadius={80} label>
                    {(charts?.channelMix ?? []).map((_, i) => (
                      <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <div className="font-semibold mb-2">Inventory Health</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.inventoryHealth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {(charts?.inventoryHealth ?? []).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="font-semibold mb-2">Expiry Risk</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={(charts?.expiryRisk ?? []).length ? charts!.expiryRisk : [{ name: 'No data', value: 1, color: '#94a3b8' }]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={(e: { value: number }) => `${e.value}`}
                >
                  {((charts?.expiryRisk ?? []).length ? charts!.expiryRisk : [{ color: '#94a3b8' }]).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="font-semibold mb-2">Operational Snapshot</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b py-1"><span>Prescriptions sent</span><span className="font-medium">{k?.prescriptionsSent ?? 0}</span></div>
              <div className="flex justify-between border-b py-1"><span>Pending bills</span><span className="font-medium">{k?.pendingBills ?? 0}</span></div>
              <div className="flex justify-between border-b py-1"><span>Returns value</span><span className="font-medium">{formatCurrency(k?.returnsValue ?? 0)}</span></div>
              <div className="flex justify-between border-b py-1"><span>Controlled balance</span><span className="font-medium">{k?.controlledBalance ?? 0} units</span></div>
              <div className="flex justify-between border-b py-1"><span>Controlled dispensed</span><span className="font-medium">{k?.controlledDispensed ?? 0}</span></div>
              <div className="flex justify-between border-b py-1"><span>POs awaiting approval</span><span className="font-medium">{k?.pendingPurchaseOrders ?? 0}</span></div>
              <div className="flex justify-between py-1"><span>Expired / Expiring</span><span className="font-medium">{k?.expired ?? 0} / {k?.expiringSoon ?? 0}</span></div>
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
};

// ============================================================
// 20. COMMUNICATION CENTER — live Mongo/WebSocket chat
// ============================================================
export const PharmacyCommsCenter = () => (
  <StaffCommunicationCenter
    module="pharmacy"
    navItems={pharmacyNav}
    shellTitle="Pharmacy · Communication Center"
  />
);

// ============================================================
// 21. MOBILE / TABLET MODE
// ============================================================
export const PharmacyMobileMode = () => (
  <Shell title="Mobile / Tablet Mode">
    <Section icon={<Smartphone className="h-5 w-5" />} title="Bench-side & Counter Mode" desc="PWA-ready quick actions for dispensing, inventory and controlled drugs." />
    <div className="max-w-sm mx-auto bg-card rounded-3xl border-4 border-foreground/10 p-4">
      <div className="text-center mb-3"><div className="text-xs text-muted-foreground">GFA HMS · Pharmacy</div><div className="font-bold">Counter Mode</div></div>
      {[
        { l: 'Scan Prescription', i: Search, p: `${base}/queue` },
        { l: 'Quick Dispense', i: Pill, p: `${base}/dispense` },
        { l: 'Stock Check', i: Boxes, p: `${base}/inventory` },
        { l: 'Controlled Drug', i: ShieldX, p: `${base}/controlled` },
        { l: 'Expiry Scan', i: CalendarClock, p: `${base}/expiry` },
        { l: 'External Med', i: Building2, p: `${base}/external` },
      ].map(b => (
        <Link key={b.l} to={b.p} className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-primary/10 hover:bg-primary/20">
          <b.i className="h-5 w-5 text-primary" />
          <span className="font-semibold">{b.l}</span>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Link>
      ))}
    </div>
  </Shell>
);

// ============================================================
// 22. CONFIGURATION — thresholds & alert rules
// ============================================================
export const PharmacyConfigCenter = () => {
  const apiOn = isPharmacySettingsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PharmacySettings | null>(null);

  const load = async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setForm(await getPharmacySettings());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const setNum = (key: keyof PharmacySettings, raw: string) => {
    const n = parseInt(raw, 10);
    setForm((f) => (f ? { ...f, [key]: Number.isFinite(n) ? n : 0 } : f));
  };

  const setBool = (key: keyof PharmacySettings, v: boolean) => {
    setForm((f) => (f ? { ...f, [key]: v } : f));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await updatePharmacySettings({
        defaultReorderLevel: form.defaultReorderLevel,
        expiringSoonDays: form.expiringSoonDays,
        expiryCriticalDays: form.expiryCriticalDays,
        expiryWarningDays: form.expiryWarningDays,
        receiveStockWarnDays: form.receiveStockWarnDays,
        recentlyReceivedDays: form.recentlyReceivedDays,
        controlledRequiresWitness: form.controlledRequiresWitness,
        lowStockAlertEnabled: form.lowStockAlertEnabled,
        expiryAlertEnabled: form.expiryAlertEnabled,
      });
      setForm(updated);
      toast.success('Pharmacy thresholds saved', {
        description: 'Inventory and expiry alerts will use these values.',
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="Pharmacy Settings">
      <Section
        icon={<Settings2 className="h-5 w-5" />}
        title="Thresholds & Alert Rules"
        desc="Set when low stock and expiry alerts fire. Per-drug reorder levels still apply on each drug; these are hospital defaults and alert windows."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
              <RotateCcw className="h-4 w-4 mr-1" />Reload
            </Button>
            <LoadingButton loading={saving} loadingText="Saving…" onClick={() => void save()} disabled={!form || loading}>
              Save settings
            </LoadingButton>
          </div>
        }
      />

      {loading ? (
        <Card><div className="py-10 text-center text-sm text-muted-foreground">Loading settings…</div></Card>
      ) : error || !form ? (
        <Card><div className="py-10 text-center text-sm text-rose-600">{error ?? 'No settings'}</div></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <SummaryCard title="Default reorder" value={String(form.defaultReorderLevel)} icon={PackageMinus} />
            <SummaryCard title="Expiring soon" value={`${form.expiringSoonDays}d`} icon={CalendarClock} />
            <SummaryCard title="Critical expiry" value={`${form.expiryCriticalDays}d`} icon={AlertTriangle} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <PackageMinus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Reorder & low stock</h3>
                  <p className="text-xs text-muted-foreground">
                    Drugs alert as Low when stock is at or below their reorder level. New drugs without a reorder value use the default below.
                  </p>
                </div>
              </div>
              <div>
                <Label>Default reorder level (units)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1 max-w-xs"
                  value={form.defaultReorderLevel}
                  onChange={(e) => setNum('defaultReorderLevel', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Low-stock alerts enabled</div>
                  <div className="text-xs text-muted-foreground">Show low-stock signals on pharmacy dashboards</div>
                </div>
                <Switch
                  checked={form.lowStockAlertEnabled}
                  onCheckedChange={(v) => setBool('lowStockAlertEnabled', v)}
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Expiry alert windows</h3>
                  <p className="text-xs text-muted-foreground">
                    Inventory “Expiring Soon” and receive-stock warnings use these day thresholds.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Expiring soon (days)</Label>
                  <Input type="number" min={1} className="mt-1" value={form.expiringSoonDays} onChange={(e) => setNum('expiringSoonDays', e.target.value)} />
                </div>
                <div>
                  <Label>Warning window (days)</Label>
                  <Input type="number" min={1} className="mt-1" value={form.expiryWarningDays} onChange={(e) => setNum('expiryWarningDays', e.target.value)} />
                </div>
                <div>
                  <Label>Critical window (days)</Label>
                  <Input type="number" min={1} className="mt-1" value={form.expiryCriticalDays} onChange={(e) => setNum('expiryCriticalDays', e.target.value)} />
                </div>
                <div>
                  <Label>Receive-stock warn (days)</Label>
                  <Input type="number" min={1} className="mt-1" value={form.receiveStockWarnDays} onChange={(e) => setNum('receiveStockWarnDays', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Expiry alerts enabled</div>
                  <div className="text-xs text-muted-foreground">Surface expiring / expired alerts on dashboards</div>
                </div>
                <Switch
                  checked={form.expiryAlertEnabled}
                  onCheckedChange={(v) => setBool('expiryAlertEnabled', v)}
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Inventory rules</h3>
                  <p className="text-xs text-muted-foreground">How “recently received” is counted on inventory stats.</p>
                </div>
              </div>
              <div>
                <Label>Recently received window (days)</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 max-w-xs"
                  value={form.recentlyReceivedDays}
                  onChange={(e) => setNum('recentlyReceivedDays', e.target.value)}
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-800 flex items-center justify-center">
                  <ShieldX className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Controlled drugs</h3>
                  <p className="text-xs text-muted-foreground">Policy flag for witness requirements on controlled dispensing.</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Require witness</div>
                  <div className="text-xs text-muted-foreground">Flag for workflows that check controlled-drug policy</div>
                </div>
                <Switch
                  checked={form.controlledRequiresWitness}
                  onCheckedChange={(v) => setBool('controlledRequiresWitness', v)}
                />
              </div>
            </Card>
          </div>

          {form.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated {form.updatedAt.replace('T', ' ').slice(0, 16)}
              {form.updatedBy ? ` by ${form.updatedBy}` : ''}
            </p>
          )}
        </div>
      )}
    </Shell>
  );
};
