import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { LoadingButton } from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/dummyData';
import { DepartmentReportBox } from '@/pages/admin/DepartmentReportBox';
import { InpatientPharmacyCard } from '@/components/inpatient/InpatientDemoPanels';
import {
  drugCatalog, prescriptionsFull, stockMovements, pharmacyStaff,
  type RxStatus,
} from '@/data/pharmacyData';
import {
  Pill, Boxes, ShieldCheck, AlertTriangle, Search, LayoutDashboard, History,
  CreditCard, ClipboardList, ClipboardCheck, FileSignature, RefreshCw, QrCode,
  Activity, CheckCircle2, XCircle, Clock, Package, PackagePlus, PackageMinus,
  Stethoscope, ArrowRight, ArrowLeft, Wifi, WifiOff, TrendingUp, Lock, Send, FilePlus,
  Printer, Download, UserPlus, ShoppingCart, Wallet, Plus, Trash2, Calendar as CalendarIcon,
  FileText, Filter, Eye, Edit, RotateCcw, Receipt, Settings2, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import {
  isPharmacyApiEnabled,
  listDrugs as apiListDrugs, createDrug as apiCreateDrug, updateDrug as apiUpdateDrug,
  adjustStock as apiAdjustStock, receiveStock,
  listSuppliers as apiListSuppliers, getInventoryStats as apiGetInventoryStats,
  type ApiSupplier, type ApiDrug,
} from '@/lib/api/pharmacy';
import {
  dispensePrescription,
  emergencyDispensePrescription,
  getPrescriptionByRxNo,
  isPrescriptionsApiEnabled,
  listPrescriptions,
  toPharmacyQueueRow,
  type ApiPrescription,
} from '@/lib/api/prescriptions';
import {
  createWalkInSale,
  listWalkInSales,
  dispenseWalkInSale,
  isWalkInSalesApiEnabled,
  walkInCustomerName,
  type ApiWalkInSale,
} from '@/lib/api/walk-in-sales';
import { searchPersons, type PersonRecord } from '@/lib/api/patients';
import { ApiError } from '@/lib/api/client';
import type { Prescription } from '@/data/pharmacyData';
import { useAuth } from '@/contexts/AuthContext';
import {
  PharmacyReceiveStockModal,
  loadReceivePurchaseOrders,
  monthToIso,
  type ReceivePurchaseOrder,
  type ReceiveStockFormInput,
} from '@/components/PharmacyReceiveStockModal';
import {
  getPharmacyAudit,
  getPharmacyDashboard,
  isPharmacyOpsApiEnabled,
  type PharmacyAuditEntry,
  type PharmacyAuditStats,
  type PharmacyDashboardData,
} from '@/lib/api/pharmacy-ops';

const submitDelay = () => new Promise<void>(r => setTimeout(r, 350));

// ============================================================
// SIDEBAR
// ============================================================
export const pharmacyNav = [
  { label: 'Dashboard',          path: '/pharmacy',                        icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Prescriptions',      path: '/pharmacy/queue',                  icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Inventory',          path: '/pharmacy/inventory',              icon: <Boxes className="h-4 w-4" /> },
  { label: 'Drug Catalog',       path: '/pharmacy/drugs',                  icon: <Pill className="h-4 w-4" /> },
  { label: 'Procurement',        path: '/pharmacy/procurement',            icon: <Send className="h-4 w-4" /> },
  { label: 'Inpatient Pharmacy', path: '/pharmacy/inpatient',    icon: <Package className="h-4 w-4" /> },
  { label: 'Revenue / Billing',  path: '/pharmacy/billing',      icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Returns',            path: '/pharmacy/returns',      icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Clinical Pharmacy',  path: '/pharmacy/interactions', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Reports',            path: '/pharmacy/reports',      icon: <FileText className="h-4 w-4" /> },
  { label: 'ADR Reporting',      path: '/dashboard/pharmacy/comms',        icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Audit Trail',        path: '/pharmacy/audit',                  icon: <History className="h-4 w-4" /> },
  { label: 'Analytics',          path: '/pharmacy/analytics',    icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'AI Features',        path: '/pharmacy/forecast',     icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Settings',           path: '/pharmacy/config',       icon: <Settings2 className="h-4 w-4" /> },
  { label: 'My Profile',         path: '/pharmacy/profile',      icon: <UserCog className="h-4 w-4" /> },
];

// ============================================================
// GLOBAL SUCCESS POPUP (toast + modal)
// ============================================================
const SUCCESS_EVENT = 'pharmacy-success';
type SuccessPayload = { title: string; message: string; actions?: { label: string; to?: string; onClick?: () => void }[] };

const notifySuccess = (payload: SuccessPayload) => {
  toast.success(payload.title, { description: payload.message });
  window.dispatchEvent(new CustomEvent(SUCCESS_EVENT, { detail: payload }));
};

const SuccessPopup = () => {
  const [data, setData] = useState<SuccessPayload | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: Event) => setData((e as CustomEvent).detail as SuccessPayload);
    window.addEventListener(SUCCESS_EVENT, h);
    return () => window.removeEventListener(SUCCESS_EVENT, h);
  }, []);
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && setData(null)}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <DialogTitle className="text-lg">{data?.title}</DialogTitle>
          <DialogDescription className="mt-1">{data?.message}</DialogDescription>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {data?.actions?.map((a, i) => (
            <Button key={i} variant={i === 0 ? 'default' : 'outline'} className="w-full sm:w-auto"
              onClick={() => { a.onClick?.(); if (a.to) navigate(a.to); setData(null); }}>
              {a.label}
            </Button>
          ))}
          {!data?.actions?.length && <Button onClick={() => setData(null)}>OK</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PharmacyPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout title={title} navItems={pharmacyNav as any}>
    <SuccessPopup />
    {children}
  </DashboardLayout>
);

// ============================================================
// Helpers
// ============================================================
const statusTone = (s: RxStatus): string => {
  switch (s) {
    case 'PENDING_PHARMACY': return 'Pending';
    case 'AWAITING_PAYMENT': return 'Unpaid';
    case 'PAID': return 'Paid';
    case 'EMERGENCY': return 'Critical';
    case 'UNDER_REVIEW': return 'In Progress';
    case 'STOCK_ISSUE': return 'Warning';
    case 'APPROVED': return 'Active';
    case 'PARTIALLY_DISPENSED': return 'Partial';
    case 'DISPENSED': return 'Dispensed';
    case 'REJECTED': return 'Cancelled';
    case 'PENDING_SYNC': return 'Retrying';
    case 'SYNCED': return 'Synced';
    default: return 'Pending';
  }
};

const stageOrder = ['Prescribe','Billing','Review','Stock Check','Dispense','Inventory','Complete','EMR Sync'];
const stagePosition = (s: RxStatus) => {
  switch (s) {
    case 'PENDING_PHARMACY': case 'AWAITING_PAYMENT': return 1;
    case 'PAID': case 'EMERGENCY': case 'UNDER_REVIEW': return 2;
    case 'STOCK_ISSUE': return 3;
    case 'APPROVED': return 4;
    case 'PARTIALLY_DISPENSED': return 5;
    case 'DISPENSED': return 6;
    case 'PENDING_SYNC': return 7;
    case 'SYNCED': return 8;
    default: return 0;
  }
};

const WorkflowRibbon = ({ status }: { status: RxStatus }) => {
  const pos = stagePosition(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {stageOrder.map((s, i) => {
        const done = i < pos; const active = i === pos;
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all
              ${done ? 'bg-[hsl(145_63%_94%)] text-[hsl(145_63%_28%)] ring-1 ring-[hsl(145_55%_70%)]/40' : ''}
              ${active ? 'bg-gradient-to-r from-primary to-[hsl(180_100%_38%)] text-primary-foreground shadow-md shadow-primary/30' : ''}
              ${!done && !active ? 'bg-muted text-muted-foreground' : ''}`}>
              {done && <CheckCircle2 className="h-3 w-3" />}
              {active && <Activity className="h-3 w-3 animate-pulse" />}
              {s}
            </div>
            {i < stageOrder.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
};

const stockOf = (drugId: string) => drugCatalog.find(d => d.id === drugId)?.stock ?? 0;
const drugById = (drugId: string) => drugCatalog.find(d => d.id === drugId);

// Expiry helpers (drug.expiry = YYYY-MM)
const expiryDate = (e: string) => {
  const [y,m] = e.split('-').map(Number);
  return new Date(y, (m||1) - 1, 28);
};
const isExpired = (e: string) => expiryDate(e) < new Date('2026-06-15');
const isExpiringSoon = (e: string) => {
  const d = expiryDate(e); const now = new Date('2026-06-15');
  const diff = (d.getTime() - now.getTime()) / (1000*60*60*24);
  return diff > 0 && diff <= 180;
};

// PDF receipt helper
const downloadReceipt = (title: string, lines: string[], filename: string) => {
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text('GFA HMS — Pharmacy', 105, 15, { align: 'center' });
  doc.setFontSize(11); doc.text(title, 105, 23, { align: 'center' });
  doc.setLineWidth(0.3); doc.line(15, 27, 195, 27);
  doc.setFontSize(10);
  let y = 35;
  lines.forEach(l => { doc.text(l, 15, y); y += 6; if (y > 280) { doc.addPage(); y = 20; } });
  doc.save(filename);
  toast.success('PDF downloaded', { description: filename });
};

// Date Picker
const DatePicker = ({ value, onChange, placeholder = 'Pick date' }: { value?: Date; onChange: (d: Date | undefined) => void; placeholder?: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9', !value && 'text-muted-foreground')}>
        <CalendarIcon className="h-4 w-4 mr-2" />
        {value ? format(value, 'PPP') : <span>{placeholder}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn('p-3 pointer-events-auto')} />
    </PopoverContent>
  </Popover>
);

// ============================================================
// 1. DASHBOARD
// ============================================================
export const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const apiOn = isPharmacyOpsApiEnabled();
  const [data, setData] = useState<PharmacyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getPharmacyDashboard());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pharmacy dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void load(); }, [load]);

  const k = data?.kpis;
  const charts = data?.charts;
  const kpis = [
    { tone:'blue',   title:'Total Prescriptions Today', value:String(k?.prescriptionsToday ?? '—'), icon:ClipboardList, sub:'OPD + Wards + ER',     to:'/pharmacy/queue' },
    { tone:'amber',  title:'Pending Prescriptions',     value:String(k?.pendingPrescriptions ?? '—'), icon:Clock,         sub:'Awaiting action',       to:'/pharmacy/queue' },
    { tone:'green',  title:'Dispensed Today',           value:String(k?.dispensedToday ?? '—'),     icon:CheckCircle2,  sub:'Released to patients',  to:'/pharmacy/completed' },
    { tone:'purple', title:'Total Pharmacy Revenue',    value:formatCurrency(k?.revenueToday ?? 0), icon:TrendingUp, sub:'Today',               to:'/pharmacy/billing' },
    { tone:'amber',  title:'Low Stock Drugs',           value:String(k?.lowStock ?? '—'),      icon:AlertTriangle, sub:'Below reorder',         to:'/pharmacy/inventory?filter=low' },
    { tone:'rose',   title:'Out of Stock Drugs',        value:String(k?.outOfStock ?? '—'),           icon:XCircle,       sub:'Action required',       to:'/pharmacy/inventory?filter=oos' },
    { tone:'amber',  title:'Expiring Soon',             value:String(k?.expiringSoon ?? '—'),      icon:Clock,         sub:'Configured window',     to:'/dashboard/pharmacy/expiry' },
    { tone:'rose',   title:'Expired Drugs',             value:String(k?.expired ?? '—'),       icon:AlertTriangle, sub:'Quarantine',            to:'/dashboard/pharmacy/expiry' },
    { tone:'indigo', title:'Pending Purchase Orders',   value:String(k?.pendingPurchaseOrders ?? '—'), icon:Send,          sub:'Awaiting approval',     to:'/pharmacy/procurement' },
    { tone:'teal',   title:'Inpatient Ward Requests',   value:String(k?.inpatientWardRequests ?? '—'), icon:Package,       sub:'Active admissions',     to:'/pharmacy/inpatient' },
    { tone:'blue',   title:'Drug Returns',              value:String(k?.drugReturns ?? '—'),                   icon:RotateCcw,     sub:'Today',                 to:'/pharmacy/returns' },
    { tone:'rose',   title:'Emergency Dispenses',       value:String(k?.emergencyDispenses ?? '—'),                 icon:AlertTriangle, sub:'Today',             to:'/pharmacy/audit' },
    { tone:'purple', title:'Audit Alerts',              value:String(k?.auditAlerts ?? '—'),                   icon:ShieldCheck,   sub:'Today',     to:'/pharmacy/audit' },
    { tone:'rose',   title:'Controlled Drug Balance',   value:`${k?.controlledDrugBalance ?? 0} units`,icon:Lock,          sub:'Register active',       to:'/pharmacy/inventory?filter=controlled' },
  ];

  const modules = [
    { label:'Procurement & Purchase Orders',       desc:'Requests, POs, suppliers', icon:Send,           tone:'from-blue-500 to-blue-600',     to:'/pharmacy/procurement' },
    { label:'Inpatient Pharmacy',                  desc:'Ward dispensing queue',    icon:Package,        tone:'from-teal-500 to-teal-600',     to:'/pharmacy/inpatient' },
    { label:'Pharmacy Revenue / Billing',          desc:'Sales, invoices, refunds', icon:CreditCard,     tone:'from-purple-500 to-purple-600', to:'/pharmacy/billing' },
    { label:'Returns Management',                  desc:'Drug returns & reversals', icon:RotateCcw,      tone:'from-amber-500 to-amber-600',   to:'/pharmacy/returns' },
    { label:'Drug Interaction & Clinical Pharmacy',desc:'Interaction checks',       icon:Stethoscope,    tone:'from-emerald-500 to-emerald-600', to:'/pharmacy/interactions' },
    { label:'Pharmacy Reports',                    desc:'Operational reporting',    icon:FileText,       tone:'from-indigo-500 to-indigo-600', to:'/pharmacy/reports' },
    { label:'ADR Reporting',                       desc:'Adverse drug reactions',   icon:AlertTriangle,  tone:'from-rose-500 to-rose-600',     to:'/dashboard/pharmacy/comms' },
    { label:'Audit Trail',                         desc:'Pharmacy activity log',    icon:History,        tone:'from-orange-500 to-orange-600', to:'/pharmacy/audit' },
    { label:'Analytics',                           desc:'Trends & KPIs',            icon:TrendingUp,     tone:'from-sky-500 to-sky-600',       to:'/pharmacy/analytics' },
    { label:'Pharmacy AI Features',                desc:'Forecast & insights',      icon:ShieldCheck,    tone:'from-fuchsia-500 to-fuchsia-600', to:'/pharmacy/forecast' },
  ];

  const rxTrend = charts?.rxTrend ?? [];
  const salesTrend = charts?.salesTrend ?? [];
  const fastMoving = charts?.fastMoving ?? [];
  const slowMoving = charts?.slowMoving ?? [];
  const stockValue = charts?.stockValue ?? [];
  const monthlyRevenue = charts?.monthlyRevenue ?? [];
  const expiryRisk = charts?.expiryRisk ?? [];

  return (
    <PharmacyPage title="Pharmacy Operations">
      <DepartmentReportBox department="Pharmacy" officer="Pharm. Yetunde Salami" />
      <InpatientPharmacyCard />
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {loading ? 'Loading dashboard…' : data?.asOf ? `Updated ${new Date(data.asOf).toLocaleString()}` : ''}
        </p>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {kpis.map(c => (
          <button key={c.title} onClick={() => navigate(c.to)} className="text-left hover:scale-[1.02] transition-transform" disabled={loading}>
            <SummaryCard tone={c.tone as any} title={c.title} value={loading ? '…' : c.value} icon={c.icon} subtitle={c.sub} />
          </button>
        ))}
      </div>

      <div className="hms-section p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> Pharmacy Modules</h3>
            <p className="text-xs text-muted-foreground">Jump into any operational area.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {modules.map(m => (
            <button
              key={m.label}
              onClick={() => navigate(m.to)}
              className={`group relative overflow-hidden rounded-xl p-4 text-left text-white bg-gradient-to-br ${m.tone} shadow-sm hover:shadow-lg transition-all`}
            >
              <m.icon className="h-6 w-6 mb-3 opacity-90" />
              <div className="text-sm font-semibold leading-tight">{m.label}</div>
              <div className="text-[11px] mt-1 opacity-80">{m.desc}</div>
              <ArrowRight className="h-4 w-4 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading pharmacy charts…</div>
      ) : (
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Prescription Trend" subtitle="Last 7 days">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rxTrend}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(184_75%_34%)" stopOpacity={0.6}/><stop offset="95%" stopColor="hsl(184_75%_34%)" stopOpacity={0.05}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="rx" stroke="hsl(184_75%_34%)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Drug Sales Trend" subtitle="Revenue ₦ / day">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v)=>`₦${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v:number)=>`₦${v.toLocaleString()}`} contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fast Moving Drugs" subtitle="Top 5 by qty">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fastMoving.length ? fastMoving : [{ name: 'No data', qty: 0 }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} /><YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Bar dataKey="qty" fill="#10b981" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Slow Moving Drugs" subtitle="Lowest 5 by qty">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slowMoving.length ? slowMoving : [{ name: 'No data', qty: 0 }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} /><YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Bar dataKey="qty" fill="#f59e0b" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock Value by Category" subtitle="Naira value">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockValue.length ? stockValue : [{ name: 'No data', v: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v)=>`₦${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v:number)=>`₦${v.toLocaleString()}`} contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Bar dataKey="v" fill="#3b82f6" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Revenue" subtitle="₦ millions">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenue}>
              <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.6}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v)=>`₦${v}M`} />
              <Tooltip formatter={(v:number)=>`₦${v}M`} contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="v" stroke="#a855f7" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expiry Risk Distribution" subtitle="Batches by expiry window">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={expiryRisk.length ? expiryRisk : [{ name: 'No data', value: 1, color: '#94a3b8' }]} dataKey="value" nameKey="name" outerRadius={80} label={(e:any)=>`${e.value}`}>
                {(expiryRisk.length ? expiryRisk : [{ color: '#94a3b8' }]).map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius:8, border:'1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(30_85%_42%)]" /> Live Alerts</h3>
          <div className="space-y-2 text-sm">
            {(data?.alerts ?? []).length === 0 && (
              <div className="rounded-lg p-3 bg-[hsl(145_63%_96%)] border border-[hsl(145_55%_82%)] text-[hsl(145_63%_30%)]">
                <div className="font-semibold">No critical pharmacy alerts right now</div>
              </div>
            )}
            {(data?.alerts ?? []).map((a) => (
              <button
                key={a.title}
                onClick={() => navigate(a.to)}
                className={`w-full text-left rounded-lg p-3 hover:brightness-95 border ${
                  a.tone === 'rose'
                    ? 'bg-[hsl(0_84%_96%)] border-[hsl(0_84%_85%)] text-[hsl(0_70%_38%)]'
                    : a.tone === 'amber'
                      ? 'bg-[hsl(36_100%_96%)] border-[hsl(36_100%_82%)] text-[hsl(30_85%_38%)]'
                      : 'bg-[hsl(209_79%_96%)] border-[hsl(209_79%_85%)] text-[hsl(209_79%_35%)]'
                }`}
              >
                <div className="font-semibold">{a.count} · {a.title}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
    </PharmacyPage>
  );
};

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="hms-section p-5">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ============================================================
// 2. INCOMING QUEUE — DOCTOR + WALK-IN
// ============================================================

// ---- Walk-in wizard ----
type WalkInPatient = {
  personId?: number;
  name: string;
  phone: string;
  hospitalNo: string;
  isNew: boolean;
};
type CartLine = { drugId: number; name: string; strength: string; unitPrice: number; stock: number; qty: number };

const WalkInWizard = ({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) => {
  const useApi = isWalkInSalesApiEnabled() && isPharmacyApiEnabled();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [patientHits, setPatientHits] = useState<WalkInPatient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patient, setPatient] = useState<WalkInPatient | null>(null);
  const [newCust, setNewCust] = useState<WalkInPatient>({ name: '', phone: '', hospitalNo: '', isNew: true });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drugQ, setDrugQ] = useState('');
  const [apiDrugs, setApiDrugs] = useState<ApiDrug[]>([]);
  const [payment, setPayment] = useState<'Cash' | 'POS Card' | 'Bank Transfer' | 'Wallet'>('Cash');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!useApi) return;
    void (async () => {
      try {
        const data = await apiListDrugs({ limit: 200 });
        setApiDrugs(data.items);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not load drugs');
      }
    })();
  }, [useApi]);

  useEffect(() => {
    if (!useApi || search.trim().length < 2) {
      setPatientHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        setSearchingPatients(true);
        try {
          const rows = await searchPersons(search.trim());
          setPatientHits(
            rows.map((p: PersonRecord) => ({
              personId: p.personId,
              name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
              phone: p.patientPhoneNo ?? '',
              hospitalNo: p.hospitalNo ?? '',
              isNew: false,
            })),
          );
        } catch {
          setPatientHits([]);
        } finally {
          setSearchingPatients(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [search, useApi]);

  const samplePatients = [
    { name: 'Adebayo Olawale', phone: '0803 555 1212', hospitalNo: 'GFA HMS/2025/04412', isNew: false },
    { name: 'Funmi Adeyemi', phone: '0809 432 8801', hospitalNo: 'GFA HMS/2026/00187', isNew: false },
    { name: 'Chukwudi Eze', phone: '0816 909 2244', hospitalNo: 'GFA HMS/2024/19023', isNew: false },
  ].filter(p => !search || `${p.name} ${p.phone} ${p.hospitalNo}`.toLowerCase().includes(search.toLowerCase()));

  const mockDrugList = drugCatalog.filter(d => !drugQ || `${d.name} ${d.genericName}`.toLowerCase().includes(drugQ.toLowerCase()));
  const apiDrugList = apiDrugs.filter(d =>
    !drugQ || `${d.name} ${d.genericName ?? ''}`.toLowerCase().includes(drugQ.toLowerCase()),
  );
  const total = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const cust = patient ?? newCust;

  const addApiDrug = (d: ApiDrug) => {
    if (d.stock <= 0) return toast.error('Out of stock');
    setCart(prev => {
      const existing = prev.find(c => c.drugId === d.drugId);
      if (existing) {
        return prev.map(c =>
          c.drugId === d.drugId ? { ...c, qty: Math.min(c.qty + 1, d.stock) } : c,
        );
      }
      return [...prev, {
        drugId: d.drugId,
        name: d.name,
        strength: d.strength ?? '',
        unitPrice: d.unitPrice,
        stock: d.stock,
        qty: 1,
      }];
    });
    toast.success('Added to cart');
  };

  const addMockDrug = (id: string) => {
    const d = drugById(id);
    if (!d || d.stock === 0) return;
    const drugId = Number(String(id).replace(/\D/g, '')) || Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    setCart(prev => {
      const existing = prev.find(c => c.drugId === drugId);
      if (existing) return prev.map(c => c.drugId === drugId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { drugId, name: d.name, strength: d.strength, unitPrice: d.unitPrice, stock: d.stock, qty: 1 }];
    });
    toast.success('Added to cart');
  };

  const submitRequest = async () => {
    if (!(patient || newCust.name.trim())) return toast.error('Select or enter a customer');
    if (cart.length === 0) return toast.error('Add at least one drug');

    if (!useApi) {
      toast.success('Walk-in request created (demo)', {
        description: 'Enable API to send to cashier. Payment required before dispense.',
      });
      onCreated?.();
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWalkInSale({
        personId: patient?.personId,
        customerName: patient ? undefined : newCust.name.trim(),
        phone: patient?.phone || newCust.phone || undefined,
        hospitalNo: patient?.hospitalNo || newCust.hospitalNo || undefined,
        items: cart.map(c => ({ drugId: c.drugId, quantity: c.qty })),
        preferredPaymentChannel: payment,
      });
      notifySuccess({
        title: 'Walk-in request sent to cashier',
        message: `${created.saleNo} · ${formatCurrency(created.total)} · Awaiting payment. Dispense only after cashier confirms.`,
        actions: [
          { label: 'View Walk-In Queue', onClick: () => onCreated?.() },
          { label: 'New Walk-In', onClick: () => { setStep(1); setPatient(null); setNewCust({ name: '', phone: '', hospitalNo: '', isNew: true }); setCart([]); } },
        ],
      });
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create walk-in request');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Customer', 'Select Drugs', 'Review', 'Send to Cashier'];

  return (
    <div className="hms-section p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" /> Walk-In Pharmacy Request
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}><XCircle className="h-4 w-4 mr-1" /> Close</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Create the request first. Customer pays at Cashier. Pharmacist dispenses only after payment is confirmed.
      </p>

      <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-4 border-b">
        {stepTitles.map((t, i) => {
          const n = i + 1; const done = step > n; const active = step === n;
          return (
            <div key={t} className="flex items-center gap-1 shrink-0">
              <div className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-2 ${done ? 'bg-[hsl(145_63%_92%)] text-[hsl(145_63%_28%)]' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${active ? 'bg-white/20' : 'bg-black/5'}`}>{done ? '✓' : n}</span>
                {t}
              </div>
              {i < stepTitles.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Search Existing Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Name, phone, or hospital number" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {search && (
              <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchingPatients && <div className="p-3 text-xs text-muted-foreground">Searching…</div>}
                {patientHits.map(p => (
                  <button
                    key={p.hospitalNo || p.name}
                    type="button"
                    onClick={() => { setPatient(p); toast.success('Patient selected'); }}
                    className={`w-full text-left p-3 hover:bg-muted/40 ${patient?.hospitalNo === p.hospitalNo ? 'bg-primary/5' : ''}`}
                  >
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.phone} · {p.hospitalNo || '—'}</div>
                  </button>
                ))}
                {!searchingPatients && patientHits.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No matches — enter a new walk-in customer below.</div>
                )}
              </div>
            )}
          </div>
          <div className="text-center text-xs text-muted-foreground">— OR —</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Full Name</Label><Input placeholder="Walk-in customer name" value={newCust.name} onChange={e => { setNewCust({ ...newCust, name: e.target.value }); setPatient(null); }} /></div>
            <div><Label>Phone</Label><Input placeholder="0800 000 0000" value={newCust.phone} onChange={e => { setNewCust({ ...newCust, phone: e.target.value }); setPatient(null); }} /></div>
            <div><Label>Hospital No (optional)</Label><Input placeholder="Auto-generated if blank" value={newCust.hospitalNo} onChange={e => { setNewCust({ ...newCust, hospitalNo: e.target.value }); setPatient(null); }} /></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Search Drug</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Drug name or generic" value={drugQ} onChange={e => setDrugQ(e.target.value)} />
            </div>
            <div className="mt-2 border rounded-lg divide-y max-h-80 overflow-y-auto">
              {apiDrugList.map(d => (
                  <div key={d.drugId} className="p-2.5 flex items-center justify-between hover:bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">{d.name} <span className="text-xs text-muted-foreground">{d.strength} {d.form}</span></div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(d.unitPrice)}/{d.unit ?? 'unit'} · Stock {d.stock}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addApiDrug(d)} disabled={d.stock === 0}><Plus className="h-3 w-3" /></Button>
                  </div>
                ))}
              {!useApi && (
                <div className="p-4 text-center text-xs text-muted-foreground">Backend API is not configured</div>
              )}
            </div>
          </div>
          <div>
            <Label>Cart ({cart.length})</Label>
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {cart.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No items yet.</div>}
              {cart.map(c => (
                <div key={c.drugId} className="p-2.5 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(c.unitPrice)}</div>
                  </div>
                  <Input type="number" min={1} max={c.stock} value={c.qty} onChange={e => setCart(prev => prev.map(x => x.drugId === c.drugId ? { ...x, qty: Math.max(1, parseInt(e.target.value) || 1) } : x))} className="h-8 w-20" />
                  <Button size="sm" variant="ghost" onClick={() => setCart(prev => prev.filter(x => x.drugId !== c.drugId))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-muted/40 flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/40 grid md:grid-cols-3 gap-3 text-sm">
            <div><Label className="text-xs">Customer</Label><div className="font-medium">{cust.name || '—'}</div></div>
            <div><Label className="text-xs">Phone</Label><div>{cust.phone || '—'}</div></div>
            <div><Label className="text-xs">Hospital No</Label><div className="font-mono text-xs">{cust.hospitalNo || 'Walk-in'}</div></div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-2">Drug</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Subtotal</th></tr></thead>
              <tbody>
                {cart.map(c => (
                  <tr key={c.drugId} className="border-t">
                    <td className="p-2"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.strength}</div></td>
                    <td className="p-2 text-right">{c.qty}</td>
                    <td className="p-2 text-right">{formatCurrency(c.unitPrice)}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(c.unitPrice * c.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t bg-muted/30"><td colSpan={3} className="p-2 text-right font-semibold">TOTAL</td><td className="p-2 text-right font-bold">{formatCurrency(total)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 max-w-md">
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-900 text-sm">
            Submitting creates an unpaid request. The customer must pay at <strong>Cashier → Pharmacy Walk-In</strong> before you can dispense.
          </div>
          <div>
            <Label>Preferred Payment Method (for cashier)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([['Cash', CreditCard], ['POS Card', CreditCard], ['Bank Transfer', Send], ['Wallet', Wallet]] as const).map(([m, Ic]) => (
                <button key={m} type="button" onClick={() => setPayment(m)} className={`p-4 rounded-lg border flex items-center gap-2 ${payment === m ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <Ic className="h-5 w-5 text-primary" /><span className="font-medium text-sm">{m}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 flex justify-between text-lg font-bold"><span>Amount Due</span><span>{formatCurrency(total)}</span></div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" disabled={step === 1 || submitting} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4 mr-1" /> Previous</Button>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Return to Queue</Button>
        </div>
        <div className="flex gap-2">
          {step < 4 && (
            <Button onClick={() => {
              if (step === 1 && !(patient || newCust.name.trim())) { toast.error('Select or enter a customer'); return; }
              if (step === 2 && cart.length === 0) { toast.error('Add at least one drug'); return; }
              setStep(step + 1);
            }}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
          )}
          {step === 4 && (
            <LoadingButton loading={submitting} loadingText="Submitting…" onClick={() => void submitRequest()}>
              <Send className="h-4 w-4 mr-1" /> Submit Request to Cashier
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  );
};

export const PharmacyQueue = () => {
  const [mode, setMode] = useState<'doctor'|'walkin'>(() => (new URLSearchParams(window.location.search).get('tab') === 'walkin' ? 'walkin' : 'doctor'));
  const [showWalkInWizard, setShowWalkInWizard] = useState(false);
  const [tab, setTab] = useState<'all'|'awaiting'|'paid'|'emergency'>('all');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const useApi = isPharmacyApiEnabled() && isPrescriptionsApiEnabled();
  const walkInApi = isWalkInSalesApiEnabled();
  const [apiRows, setApiRows] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(useApi);
  const [walkInSales, setWalkInSales] = useState<ApiWalkInSale[]>([]);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [dispensingId, setDispensingId] = useState<number | null>(null);
  const [walkInDispenseSale, setWalkInDispenseSale] = useState<ApiWalkInSale | null>(null);

  const openRx = (rxNo: string) => {
    navigate(`/pharmacy/rx/${encodeURIComponent(rxNo)}`);
  };

  const loadWalkIns = useCallback(async () => {
    if (!walkInApi) return;
    setWalkInLoading(true);
    try {
      const data = await listWalkInSales({ limit: 100 });
      setWalkInSales(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load walk-in sales');
    } finally {
      setWalkInLoading(false);
    }
  }, [walkInApi]);

  useEffect(() => {
    if (!useApi) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [sent, partial] = await Promise.all([
          listPrescriptions({ status: 'Sent', limit: 100 }),
          listPrescriptions({ status: 'Partially Dispensed', limit: 100 }),
        ]);
        if (!cancelled) {
          const merged = [...sent.items, ...partial.items];
          setApiRows(merged.map(toPharmacyQueueRow) as Prescription[]);
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : 'Failed to load prescriptions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useApi]);

  useEffect(() => {
    if (mode === 'walkin') void loadWalkIns();
  }, [mode, loadWalkIns]);

  const dispenseWalkIn = async (sale: ApiWalkInSale) => {
    if (sale.paymentStatus !== 'Paid') {
      toast.error('Customer must pay at cashier before dispensing');
      return;
    }
    setDispensingId(sale.saleId);
    try {
      const updated = await dispenseWalkInSale(sale.saleId);
      toast.success(`${updated.saleNo} dispensed`, {
        description: `Stock deducted · ${walkInCustomerName(updated.person)}`,
      });
      await loadWalkIns();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Dispense failed');
    } finally {
      setDispensingId(null);
    }
  };

  const source = apiRows;

  const list = useMemo(() => source.filter(r => {
    if (tab === 'awaiting' && r.status !== 'AWAITING_PAYMENT') return false;
    if (tab === 'paid' && !['PAID', 'PENDING_PHARMACY', 'PARTIALLY_DISPENSED'].includes(r.status)) return false;
    if (tab === 'emergency' && r.status !== 'EMERGENCY') return false;
    if (q && !`${r.patientName} ${r.id} ${r.patientId} ${r.items.map(i=>i.drug).join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tab, q, source]);

  const walkInFiltered = useMemo(() => walkInSales.filter(s => {
    if (tab === 'awaiting' && s.paymentStatus !== 'Unpaid') return false;
    if (tab === 'paid' && !(s.paymentStatus === 'Paid' && s.status !== 'Dispensed')) return false;
    if (q) {
      const name = walkInCustomerName(s.person);
      const hay = `${s.saleNo} ${name} ${s.person?.hospitalNo ?? ''} ${s.person?.phone ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return s.status !== 'Cancelled';
  }), [walkInSales, tab, q]);

  return (
    <PharmacyPage title="Incoming Prescriptions">
      {mode === 'doctor' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard tone="blue"   title="Total Today"      value={String(source.length)} icon={ClipboardList} />
          <SummaryCard tone="amber"  title="Awaiting Payment" value={String(source.filter(r=>r.status==='AWAITING_PAYMENT').length)} icon={CreditCard} />
          <SummaryCard tone="green"  title="Ready to Dispense" value={String(source.filter(r=>['PAID','PENDING_PHARMACY','PARTIALLY_DISPENSED'].includes(r.status)).length)} icon={ShieldCheck} />
          <SummaryCard tone="rose"   title="Emergency"        value={String(source.filter(r=>r.status==='EMERGENCY').length)} icon={AlertTriangle} />
        </div>
      )}

      {mode === 'walkin' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard tone="blue" title="Walk-In Requests" value={String(walkInSales.filter(s => s.status !== 'Cancelled').length)} icon={ShoppingCart} />
          <SummaryCard tone="amber" title="Awaiting Cashier" value={String(walkInSales.filter(s => s.paymentStatus === 'Unpaid').length)} icon={CreditCard} />
          <SummaryCard tone="green" title="Paid — Ready" value={String(walkInSales.filter(s => s.paymentStatus === 'Paid' && s.status !== 'Dispensed').length)} icon={ShieldCheck} />
          <SummaryCard tone="purple" title="Dispensed" value={String(walkInSales.filter(s => s.status === 'Dispensed').length)} icon={CheckCircle2} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <button onClick={()=>setMode('doctor')} className={`hms-section p-5 text-left transition-all ${mode==='doctor'?'ring-2 ring-primary shadow-md':''}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Stethoscope className="h-6 w-6 text-primary" /></div>
            <div>
              <div className="font-display font-semibold">Doctor Prescription Queue</div>
              <div className="text-xs text-muted-foreground">Prescriptions sent from clinics & wards</div>
            </div>
          </div>
        </button>
        <button onClick={()=>{ setMode('walkin'); setShowWalkInWizard(false); }} className={`hms-section p-5 text-left transition-all ${mode==='walkin'?'ring-2 ring-primary shadow-md':''}`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[hsl(180_100%_38%)]/10 flex items-center justify-center"><ShoppingCart className="h-6 w-6 text-[hsl(180_100%_38%)]" /></div>
            <div>
              <div className="font-display font-semibold">Walk-In Pharmacy Customer</div>
              <div className="text-xs text-muted-foreground">Request → cashier pay → then dispense</div>
            </div>
          </div>
        </button>
      </div>

      {mode === 'walkin' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={() => setShowWalkInWizard(true)}><UserPlus className="h-4 w-4 mr-1" /> New Walk-In Request</Button>
            <Button variant="outline" onClick={() => void loadWalkIns()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          </div>
          {showWalkInWizard && (
            <WalkInWizard
              onClose={() => setShowWalkInWizard(false)}
              onCreated={() => { setShowWalkInWizard(false); void loadWalkIns(); }}
            />
          )}
          <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <Tabs value={tab === 'emergency' ? 'all' : tab} onValueChange={(v) => setTab(v as 'all'|'awaiting'|'paid')}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="awaiting">Awaiting Payment</TabsTrigger>
                <TabsTrigger value="paid">Paid / Ready</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search sale, patient, phone" className="pl-9" />
            </div>
          </div>
          <div className="hms-section overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Sale #</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Items</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Payment</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {walkInLoading && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading walk-in sales…</td></tr>
                  )}
                  {!walkInLoading && walkInFiltered.map(s => (
                    <tr key={s.saleId} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs font-semibold">{s.saleNo}</td>
                      <td className="p-3">
                        <div className="font-medium">{walkInCustomerName(s.person)}</div>
                        <div className="text-xs text-muted-foreground">{s.person?.hospitalNo ?? '—'} · {s.person?.phone ?? '—'}</div>
                      </td>
                      <td className="p-3 text-xs">{s.items.map(i => `${i.drugName} ×${i.quantity}`).join(', ')}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(s.total)}</td>
                      <td className="p-3"><StatusBadge status={s.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'} /></td>
                      <td className="p-3"><StatusBadge status={s.status === 'Dispensed' ? 'Active' : s.status === 'Awaiting Payment' ? 'Pending' : 'Warning'} /></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {s.paymentStatus === 'Unpaid' && (
                            <span className="text-xs text-amber-700">Pay at cashier first</span>
                          )}
                          {s.paymentStatus === 'Paid' && s.status !== 'Dispensed' && (
                            <Button size="sm" onClick={() => setWalkInDispenseSale(s)}>
                              <Eye className="h-3 w-3 mr-1" />Review & Dispense
                            </Button>
                          )}
                          {s.status === 'Dispensed' && (
                            <span className="text-xs text-emerald-700">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!walkInLoading && walkInFiltered.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No walk-in sales in this view. Create a request to send to cashier.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Dialog open={!!walkInDispenseSale} onOpenChange={(o) => { if (!o) setWalkInDispenseSale(null); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dispense walk-in sale</DialogTitle>
                <DialogDescription>
                  Confirm details before deducting stock. Payment must already be confirmed by cashier.
                </DialogDescription>
              </DialogHeader>
              {walkInDispenseSale && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-xs text-muted-foreground">Sale</span><div className="font-mono font-semibold">{walkInDispenseSale.saleNo}</div></div>
                    <div><span className="text-xs text-muted-foreground">Payment</span><div>{walkInDispenseSale.paymentChannel ?? 'Paid'} · {walkInDispenseSale.paidBy ?? '—'}</div></div>
                    <div className="col-span-2"><span className="text-xs text-muted-foreground">Customer</span><div className="font-medium">{walkInCustomerName(walkInDispenseSale.person)}</div></div>
                  </div>
                  <div className="rounded-lg border divide-y">
                    {walkInDispenseSale.items.map((i) => (
                      <div key={i.itemId} className="flex justify-between gap-2 p-2">
                        <span>{i.drugName} {i.strength ?? ''} × {i.quantity}</span>
                        <span className="font-medium">{formatCurrency(i.lineTotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2 font-bold bg-muted/40">
                      <span>Total</span><span>{formatCurrency(walkInDispenseSale.total)}</span>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setWalkInDispenseSale(null)}>Cancel</Button>
                <LoadingButton
                  loading={dispensingId === walkInDispenseSale?.saleId}
                  loadingText="Dispensing…"
                  onClick={async () => {
                    if (!walkInDispenseSale) return;
                    await dispenseWalkIn(walkInDispenseSale);
                    setWalkInDispenseSale(null);
                  }}
                >
                  <Pill className="h-4 w-4 mr-1" />Confirm Dispense
                </LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {mode === 'doctor' && (
        <>
          <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="awaiting">Awaiting Payment</TabsTrigger>
                <TabsTrigger value="paid">Ready to Dispense</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Rx, patient or drug" className="pl-9" />
            </div>
          </div>

          <div className="hms-section overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Rx ID</th>
                    <th className="text-left p-3">Patient</th>
                    <th className="text-left p-3">Doctor / Clinic</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Payment</th>
                    <th className="text-left p-3">Stock</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading prescriptions…</td></tr>
                  )}
                  {!loading && list.map(r => {
                    const stockOk = true;
                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="p-3"><div className="font-mono text-xs font-semibold">{r.id}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                        <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.age}y · {r.gender}</div></td>
                        <td className="p-3 text-xs"><div>{r.prescribedBy}</div><div className="text-muted-foreground">{r.diagnosis ?? '—'}</div></td>
                        <td className="p-3 text-xs">{r.prescribedAt}</td>
                        <td className="p-3"><StatusBadge status={r.paymentStatus === 'PAID' ? 'Paid' : r.paymentStatus === 'EMERGENCY' ? 'Critical' : 'Unpaid'} /></td>
                        <td className="p-3"><StatusBadge status={stockOk ? 'Active' : 'Warning'} /></td>
                        <td className="p-3"><StatusBadge status={statusTone(r.status)} /></td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" onClick={() => openRx(r.id)}>
                              <Pill className="h-3 w-3 mr-1" />Start Processing
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openRx(r.id)}>
                              <Eye className="h-3 w-3 mr-1" />View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && list.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No prescriptions in this view.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PharmacyPage>
  );
};

// ============================================================
// 3. REVIEW & APPROVE — only for special cases
// ============================================================
export const PharmacyReview = () => {
  const [reject, setReject] = useState<string | null>(null);
  const [clarify, setClarify] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Special-case queue: controlled drug, stock issues, emergency, under review
  const special = prescriptionsFull.filter(r =>
    r.status === 'UNDER_REVIEW' || r.status === 'STOCK_ISSUE' || r.status === 'EMERGENCY' ||
    r.items.some(i => drugById(i.drugId)?.controlled)
  );

  return (
    <PharmacyPage title="Review & Approve (Special Cases)">
      <div className="hms-section p-4 mb-4 bg-amber-50/40 border-amber-200 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">This page is only for prescriptions requiring secondary review</div>
            <div className="text-xs">Controlled drugs · High-risk medications · Stock exceptions · Drug interaction warnings · Prescription clarification. Routine prescriptions go straight to Dispensing.</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="indigo" title="Awaiting Review" value={String(special.length)} icon={FileSignature} />
        <SummaryCard tone="green"  title="Approved"        value={String(prescriptionsFull.filter(r=>['APPROVED','DISPENSED','PARTIALLY_DISPENSED'].includes(r.status)).length)} icon={CheckCircle2} />
        <SummaryCard tone="rose"   title="Rejected"        value={String(prescriptionsFull.filter(r=>r.status==='REJECTED').length)} icon={XCircle} />
        <SummaryCard tone="amber"  title="Clarification"   value="2" icon={ClipboardCheck} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Rx</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Reason for Review</th><th className="text-left p-3">Drugs</th><th className="text-left p-3">Allergies</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {special.map(r => {
                const stockOk = r.items.every(i => stockOf(i.drugId) >= i.qty);
                const hasControlled = r.items.some(i => drugById(i.drugId)?.controlled);
                const reasons: string[] = [];
                if (hasControlled) reasons.push('Controlled drug');
                if (!stockOk) reasons.push('Stock exception');
                if (r.status === 'EMERGENCY') reasons.push('Emergency override');
                if (r.allergies && r.allergies !== 'None') reasons.push('Allergy alert');
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                    <td className="p-3 text-xs">{reasons.map(x => <span key={x} className="inline-block mr-1 mb-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{x}</span>)}</td>
                    <td className="p-3 text-xs">{r.items.map(i => `${i.drug} × ${i.qty}`).join(', ')}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.allergies && r.allergies !== 'None' ? 'bg-[hsl(0_84%_94%)] text-[hsl(0_70%_38%)]' : 'bg-muted text-muted-foreground'}`}>{r.allergies ?? 'None'}</span></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" onClick={() => notifySuccess({ title:'Prescription approved', message:`${r.id} approved & sent to dispensing.`, actions:[{label:'Open Dispensing', to:'/pharmacy/dispense'}]})}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => { setReject(r.id); setReason(''); }}>Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setClarify(r.id); setReason(''); }}>Clarify</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {special.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No prescriptions awaiting review.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject */}
      <Dialog open={!!reject} onOpenChange={(o)=>!o && setReject(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Prescription</DialogTitle><DialogDescription>Returned to prescribing doctor with reason.</DialogDescription></DialogHeader>
          <div><Label>Reason for rejection *</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Drug-allergy interaction; suggest alternative." /></div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setReject(null)}>Cancel</Button>
            <Button onClick={() => { if(!reason){toast.error('Reason required');return;} notifySuccess({ title:'Prescription rejected', message:`${reject} returned to doctor. Reason: ${reason}` }); setReject(null); }}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clarify */}
      <Dialog open={!!clarify} onOpenChange={(o)=>!o && setClarify(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Clarification</DialogTitle><DialogDescription>Message will be sent to the prescribing doctor.</DialogDescription></DialogHeader>
          <div><Label>Question for doctor *</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Please confirm dose for paediatric patient." /></div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setClarify(null)}>Cancel</Button>
            <Button onClick={() => { if(!reason){toast.error('Message required');return;} notifySuccess({ title:'Clarification requested', message:`Message sent for ${clarify}.` }); setClarify(null); }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PharmacyPage>
  );
};

// ============================================================
// 4. DISPENSING
// ============================================================
export const PharmacyDispense = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [scanned, setScanned] = useState('');
  const [pharmacist, setPharmacist] = useState(pharmacyStaff[0].name);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const queue = prescriptionsFull.filter(r => ['APPROVED','PAID','PENDING_PHARMACY','EMERGENCY','STOCK_ISSUE'].includes(r.status));
  const currentRx = open ? prescriptionsFull.find(r => r.id === open) : null;

  const printLabel = (rxId: string) => {
    const r = prescriptionsFull.find(x => x.id === rxId)!;
    downloadReceipt(`Medication Label — ${r.id}`, [
      `Patient: ${r.patientName} (${r.patientId})`,
      `Doctor: ${r.prescribedBy}`,
      '',
      ...r.items.map(i => `${i.drug} ${i.strength} — ${i.dose} for ${i.duration} (Qty ${i.qty})`),
    ], `label-${rxId}.pdf`);
  };

  const printReceipt = (rxId: string) => {
    const r = prescriptionsFull.find(x => x.id === rxId)!;
    downloadReceipt(`Dispense Receipt — ${r.id}`, [
      `Patient: ${r.patientName}`,
      `Doctor: ${r.prescribedBy}`,
      `Date: ${format(new Date(), 'PPpp')}`,
      `Pharmacist: ${pharmacist}`,
      '',
      ...r.items.map(i => `${i.drug} ${i.strength} × ${i.qty} = ${formatCurrency(i.qty * i.unitPrice)}`),
      '',
      `TOTAL: ${formatCurrency(r.total)}`,
    ], `dispense-${rxId}.pdf`);
  };

  return (
    <PharmacyPage title="Dispensing Workspace">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  title="Ready to Dispense" value={String(queue.length)} icon={Package} />
        <SummaryCard tone="indigo" title="Dispensed Today"   value={String(prescriptionsFull.filter(r=>r.status==='DISPENSED').length)} icon={CheckCircle2} />
        <SummaryCard tone="rose"   title="Stock Issues"      value={String(prescriptionsFull.filter(r=>r.status==='STOCK_ISSUE').length)} icon={AlertTriangle} />
        <SummaryCard tone="purple" title="Avg Time"          value="5 min" icon={Clock} />
      </div>

      <div className="hms-section p-5 mb-6 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><QrCode className="h-6 w-6 text-primary" /></div>
            <div>
              <h3 className="font-display font-semibold">Verify Patient ID before Dispensing</h3>
              <p className="text-xs text-muted-foreground">Unpaid prescriptions are blocked from release</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input value={scanned} onChange={e=>setScanned(e.target.value)} placeholder="RX-2026-XXX or GFA HMS/2026/00000" className="md:w-72" />
            <Button onClick={() => {
              const found = prescriptionsFull.find(r => r.id === scanned || r.patientId === scanned);
              if (!found) { toast.error('Prescription not found'); return; }
              if (found.status === 'AWAITING_PAYMENT') { toast.error('Payment not confirmed — pharmacy locked'); return; }
              setOpen(found.id);
              setDispensed(Object.fromEntries(found.items.map(i => [i.drugId, Math.min(i.qty, stockOf(i.drugId))])));
            }}>Verify & Open</Button>
          </div>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Rx</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Drugs (Stock)</th><th className="text-left p-3">Payment</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {queue.map(r => {
                const blocked = r.paymentStatus === 'UNPAID' && r.status !== 'EMERGENCY';
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                    <td className="p-3 text-xs">
                      {r.items.map(i => { const s = stockOf(i.drugId); const ok = s >= i.qty;
                        return <div key={i.drugId} className="flex items-center gap-1"><span className="font-medium">{i.drug}</span> × {i.qty}<span className={`px-1.5 rounded text-[10px] font-semibold ${ok ? 'bg-[hsl(145_63%_92%)] text-[hsl(145_63%_30%)]' : 'bg-[hsl(0_84%_92%)] text-[hsl(0_70%_38%)]'}`}>stock: {s}</span></div>;
                      })}
                    </td>
                    <td className="p-3"><StatusBadge status={r.paymentStatus === 'PAID' ? 'Paid' : r.paymentStatus === 'EMERGENCY' ? 'Critical' : 'Unpaid'} /></td>
                    <td className="p-3"><StatusBadge status={statusTone(r.status)} /></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" disabled={blocked} onClick={() => { setOpen(r.id); setDispensed(Object.fromEntries(r.items.map(i => [i.drugId, Math.min(i.qty, stockOf(i.drugId))]))); }}>
                          {blocked ? <><Lock className="h-3 w-3 mr-1"/>Locked</> : <><Pill className="h-3 w-3 mr-1" />Dispense</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={()=>printLabel(r.id)}><Printer className="h-3 w-3 mr-1" />Label</Button>
                        <Button size="sm" variant="ghost" onClick={()=>navigate(`/pharmacy/rx/${r.id}`)}><Eye className="h-3 w-3 mr-1" />View</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {queue.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nothing ready for dispensing.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o)=>!o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Dispense Medication</DialogTitle><DialogDescription>Stock will be deducted in real-time.</DialogDescription></DialogHeader>
          {currentRx && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm p-3 rounded-lg bg-muted/40">
                <div><Label className="text-xs">Patient</Label><div className="font-medium">{currentRx.patientName}</div></div>
                <div><Label className="text-xs">Hospital ID</Label><div className="font-mono text-xs">{currentRx.patientId}</div></div>
                <div><Label className="text-xs">Doctor</Label><div>{currentRx.prescribedBy}</div></div>
              </div>
              <div>
                <Label>Drugs to Dispense</Label>
                <div className="space-y-2 mt-2">
                  {currentRx.items.map(i => {
                    const stock = stockOf(i.drugId);
                    const allowed = Math.min(i.qty, stock);
                    const partial = allowed < i.qty;
                    return (
                      <div key={i.drugId} className={`p-3 rounded-lg border ${partial ? 'border-[hsl(36_100%_70%)] bg-[hsl(36_100%_98%)]' : 'border-border'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div><div className="font-medium text-sm">{i.drug} <span className="text-xs text-muted-foreground">{i.strength}</span></div><div className="text-xs text-muted-foreground">{i.dose} · {i.duration}</div></div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${stock >= i.qty ? 'bg-[hsl(145_63%_92%)] text-[hsl(145_63%_30%)]' : 'bg-[hsl(0_84%_92%)] text-[hsl(0_70%_38%)]'}`}>Stock: {stock}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><Label className="text-xs">Prescribed</Label><div className="font-semibold">{i.qty}</div></div>
                          <div><Label className="text-xs">Dispense Qty</Label><Input type="number" min={0} max={Math.min(i.qty, stock)} value={dispensed[i.drugId] ?? allowed} onChange={e=>setDispensed(prev => ({ ...prev, [i.drugId]: Math.min(i.qty, Math.max(0, parseInt(e.target.value)||0)) }))} className="h-8" /></div>
                          <div><Label className="text-xs">Subtotal</Label><div className="font-semibold">{formatCurrency((dispensed[i.drugId] ?? allowed) * i.unitPrice)}</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dispensed By</Label>
                  <Select value={pharmacist} onValueChange={setPharmacist}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{pharmacyStaff.map(s => <SelectItem key={s.id} value={s.name}>{s.name} — {s.role}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Total</Label><div className="h-10 rounded-md border px-3 flex items-center font-semibold">{formatCurrency(currentRx.items.reduce((s, i) => s + (dispensed[i.drugId] ?? 0) * i.unitPrice, 0))}</div></div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="ghost" onClick={() => { toast.info('Returned to queue'); setOpen(null); }}>Return to Queue</Button>
            <Button variant="outline" onClick={() => { toast.success('Prescription held'); setOpen(null); }}>Hold</Button>
            <Button variant="outline" onClick={() => currentRx && printLabel(currentRx.id)}><Printer className="h-3 w-3 mr-1" />Print Label</Button>
            <Button variant="outline" onClick={() => currentRx && printReceipt(currentRx.id)}><Receipt className="h-3 w-3 mr-1" />Print Receipt</Button>
            <Button onClick={() => {
              if (!currentRx) return;
              const fully = currentRx.items.every(i => (dispensed[i.drugId] ?? 0) === i.qty);
              notifySuccess({
                title: fully ? 'Medication dispensed successfully' : 'Partial dispense recorded',
                message: `${currentRx.id} — ${fully ? 'fully dispensed' : 'partial release'} · stock deducted · synced to EMR.`,
                actions: [
                  { label: 'Print Receipt', onClick: () => printReceipt(currentRx.id) },
                  { label: 'Print Label',   onClick: () => printLabel(currentRx.id) },
                  { label: 'Done', to: '/pharmacy/completed' },
                ],
              });
              setOpen(null); setScanned('');
            }}>Dispense & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PharmacyPage>
  );
};

// ============================================================
// 5. COMPLETED
// ============================================================
export const PharmacyCompleted = () => {
  const [view, setView] = useState<string | null>(null);
  const navigate = useNavigate();
  const completed = prescriptionsFull.filter(r => ['DISPENSED','PARTIALLY_DISPENSED'].includes(r.status));
  const viewRx = view ? prescriptionsFull.find(r => r.id === view) : null;

  const printReceipt = (rxId: string) => {
    const r = prescriptionsFull.find(x => x.id === rxId)!;
    downloadReceipt(`Receipt — ${r.id}`, [
      `Patient: ${r.patientName} (${r.patientId})`,
      `Dispensed: ${r.dispensedAt ?? '—'} by ${r.dispensedBy ?? '—'}`,
      '',
      ...r.items.map(i => `${i.drug} × ${i.qty} = ${formatCurrency(i.qty * i.unitPrice)}`),
      '',
      `TOTAL: ${formatCurrency(r.total)}`,
    ], `receipt-${rxId}.pdf`);
  };

  return (
    <PharmacyPage title="Completed Dispenses">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard tone="green"  title="Completed Today" value={String(completed.length)} icon={CheckCircle2} />
        <SummaryCard tone="blue"   title="This Week" value={String(completed.length + 18)} icon={Package} />
        <SummaryCard tone="indigo" title="This Month" value={String(completed.length + 84)} icon={TrendingUp} />
        <SummaryCard tone="teal"    title="Walk-In Completed" value="42" icon={ShoppingCart} />
        <SummaryCard tone="purple" title="Doctor Rx Completed" value={String(completed.length)} icon={Stethoscope} />
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Rx</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Drugs</th><th className="text-right p-3">Total</th><th className="text-left p-3">Dispensed By</th><th className="text-left p-3">Time</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {completed.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs"><Link to={`/pharmacy/rx/${r.id}`} className="text-primary hover:underline">{r.id}</Link></td>
                  <td className="p-3"><div className="font-medium">{r.patientName}</div><div className="text-xs text-muted-foreground">{r.patientId}</div></td>
                  <td className="p-3 text-xs">{r.items.map(i => `${i.drug} × ${i.qty}`).join(', ')}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(r.total)}</td>
                  <td className="p-3 text-xs">{r.dispensedBy ?? '—'}</td>
                  <td className="p-3 text-xs">{r.dispensedAt ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={()=>setView(r.id)}><Eye className="h-3 w-3 mr-1" />Details</Button>
                      <Button size="sm" variant="outline" onClick={()=>printReceipt(r.id)}><Printer className="h-3 w-3 mr-1" />Receipt</Button>
                      <Button size="sm" variant="outline" onClick={()=>{ downloadReceipt(`Label — ${r.id}`, r.items.map(i => `${i.drug} ${i.strength} — ${i.dose}`), `label-${r.id}.pdf`); }}><Printer className="h-3 w-3 mr-1" />Label</Button>
                      <Button size="sm" variant="outline" onClick={()=>printReceipt(r.id)}><Download className="h-3 w-3 mr-1" />PDF</Button>
                      <Button size="sm" variant="ghost" onClick={()=>navigate(`/pharmacy/rx/${r.id}`)}><History className="h-3 w-3 mr-1" />Audit</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {completed.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No completed dispenses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o)=>!o && setView(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Dispense Details — {viewRx?.id}</DialogTitle></DialogHeader>
          {viewRx && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40">
                <div><Label className="text-xs">Patient</Label><div className="font-medium">{viewRx.patientName}</div></div>
                <div><Label className="text-xs">Doctor</Label><div>{viewRx.prescribedBy}</div></div>
                <div><Label className="text-xs">Dispensed By</Label><div>{viewRx.dispensedBy ?? '—'}</div></div>
                <div><Label className="text-xs">Time</Label><div>{viewRx.dispensedAt ?? '—'}</div></div>
              </div>
              <table className="w-full text-sm border rounded">
                <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-2">Drug</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Subtotal</th></tr></thead>
                <tbody>{viewRx.items.map((i,ix)=>(<tr key={ix} className="border-t"><td className="p-2">{i.drug} {i.strength}</td><td className="p-2 text-right">{i.qty}</td><td className="p-2 text-right">{formatCurrency(i.qty * i.unitPrice)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={()=>setView(null)}>Close</Button>{viewRx && <Button onClick={()=>printReceipt(viewRx.id)}><Printer className="h-3 w-3 mr-1" />Print Receipt</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </PharmacyPage>
  );
};

// ============================================================
// 6. INVENTORY
// ============================================================

/** Inventory row — API-backed when enabled, drugCatalog fallback otherwise. */
type InvRow = {
  id: string; apiId?: number; name: string; genericName: string; category: string;
  form: string; strength: string; unitPrice: number; stock: number; reorderLevel: number;
  expiry: string; batch: string; shelf: string; status: 'Active' | 'Low' | 'Out of Stock' | 'Expired';
  controlled?: boolean; supplierName: string; recentlyAdded?: boolean;
};

const fallbackInvRows: InvRow[] = drugCatalog.map(d => ({
  id: d.id, name: d.name, genericName: d.genericName, category: d.category,
  form: d.form, strength: d.strength, unitPrice: d.unitPrice, stock: d.stock,
  reorderLevel: d.reorderLevel, expiry: d.expiry, batch: d.batch, shelf: d.shelf,
  status: d.status, controlled: d.controlled, supplierName: 'Emzor / Fidson',
  recentlyAdded: ['DRG011','DRG012','DRG013'].includes(d.id),
}));

const invErr = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export const PharmacyInventory = () => {
  const useApi = isPharmacyApiEnabled();
  const { user } = useAuth();
  const receiverName = user?.name?.trim() || user?.email || 'Pharmacist';
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all'|'low'|'oos'|'expired'|'expiring'|'recent'>('all');
  const [recvOpen, setRecvOpen] = useState(() => new URLSearchParams(window.location.search).get('receive') === '1');
  const [view, setView] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<string | null>(null);
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [rows, setRows] = useState<InvRow[]>([]);
  const [receivePos, setReceivePos] = useState<ReceivePurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [recentlyReceived, setRecentlyReceived] = useState<number | null>(useApi ? null : 3);
  const [invLoading, setInvLoading] = useState(useApi);
  const [addOpen, setAddOpen] = useState(false);
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editReorder, setEditReorder] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editShelf, setEditShelf] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingAdjust, setSavingAdjust] = useState(false);

  const loadInventory = async () => {
    if (!useApi) {
      setRows([]);
      toast.error('Backend API is not configured');
      return;
    }
    setInvLoading(true);
    try {
      const [drugs, sup, stats] = await Promise.all([
        apiListDrugs({ limit: 200 }),
        apiListSuppliers({ limit: 100 }),
        apiGetInventoryStats(),
      ]);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setRows(drugs.items.map(d => ({
        id: String(d.drugId), apiId: d.drugId, name: d.name,
        genericName: d.genericName ?? '—', category: d.category ?? '—',
        form: d.form ?? '—', strength: d.strength ?? '—', unitPrice: d.unitPrice,
        stock: d.stock, reorderLevel: d.reorderLevel,
        expiry: d.earliestExpiry ? d.earliestExpiry.slice(0, 7) : '—',
        batch: d.earliestBatchNo ?? '—', shelf: d.shelf ?? '—',
        status: d.stockStatus as InvRow['status'], controlled: d.controlled,
        supplierName: d.supplierName ?? '—',
        recentlyAdded: d.createdAt ? new Date(d.createdAt).getTime() >= weekAgo : false,
      })));
      setSuppliers(sup.items);
      setRecentlyReceived(stats.recentlyReceived);
    } catch (e) {
      toast.error(invErr(e, 'Could not load inventory'));
    } finally {
      setInvLoading(false);
    }
  };

  useEffect(() => { void loadInventory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [useApi]);

  const loadReceivePos = async () => {
    try {
      setReceivePos(await loadReceivePurchaseOrders());
    } catch (e) {
      toast.error(invErr(e, 'Could not load purchase orders'));
    }
  };

  useEffect(() => {
    if (recvOpen) void loadReceivePos();
  }, [recvOpen]);

  const byId = (id: string) => rows.find(r => r.id === id);

  const list = rows.filter(d => {
    if (q && !`${d.name} ${d.genericName} ${d.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (tab === 'low' && d.status !== 'Low') return false;
    if (tab === 'oos' && d.status !== 'Out of Stock') return false;
    if (tab === 'expired' && !(d.status === 'Expired' || isExpired(d.expiry))) return false;
    if (tab === 'expiring' && !isExpiringSoon(d.expiry)) return false;
    if (tab === 'recent' && !d.recentlyAdded) return false;
    return true;
  });

  const viewDrug = view ? byId(view) : null;
  const adjustDrug = adjust ? byId(adjust) : null;

  const openEdit = (id: string) => {
    const d = byId(id);
    if (!d) return;
    setEditName(d.name); setEditReorder(d.reorderLevel); setEditPrice(d.unitPrice); setEditShelf(d.shelf === '—' ? '' : d.shelf);
    setEditing(id);
  };

  const saveEdit = async () => {
    const d = editing ? byId(editing) : null;
    if (!d) return;
    setSavingEdit(true);
    try {
      if (useApi && d.apiId != null) {
        try {
          await apiUpdateDrug(d.apiId, { name: editName, reorderLevel: editReorder, unitPrice: editPrice, shelf: editShelf });
          setRows(prev => prev.map(r => r.id === d.id ? { ...r, name: editName, reorderLevel: editReorder, unitPrice: editPrice, shelf: editShelf || '—' } : r));
          notifySuccess({ title:'Drug updated', message:'Changes saved to inventory and logged to audit.' });
        } catch (e) { toast.error(invErr(e, 'Could not update drug')); return; }
      } else {
        await submitDelay();
        notifySuccess({ title:'Drug updated', message:'Changes saved to inventory.' });
      }
      setEditing(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmAdjust = async () => {
    if (!adjQty || !adjReason) { toast.error('Quantity and reason required'); return; }
    const d = adjustDrug;
    if (!d) return;
    setSavingAdjust(true);
    try {
      if (useApi && d.apiId != null) {
        try {
          const updated = await apiAdjustStock({ drugId: d.apiId, qty: adjQty, reason: adjReason });
          setRows(prev => prev.map(r => r.id === d.id ? { ...r, stock: updated.stock, status: updated.stockStatus as InvRow['status'] } : r));
          notifySuccess({ title:'Stock adjusted', message:`${d.name}: ${adjQty>0?'+':''}${adjQty} units. Logged to audit.` });
        } catch (e) { toast.error(invErr(e, 'Adjustment failed')); return; }
      } else {
        await submitDelay();
        notifySuccess({ title:'Stock adjusted', message:`${d.name}: ${adjQty>0?'+':''}${adjQty} units. Logged to audit.` });
      }
      setAdjust(null);
    } finally {
      setSavingAdjust(false);
    }
  };

  const receiveAgainstPo = async (input: ReceiveStockFormInput): Promise<boolean> => {
    const accepted = Math.max(input.received - input.damaged, 0);
    if (useApi && input.po.apiId != null) {
      try {
        const created = await receiveStock({
          poId: input.po.apiId,
          drugId: Number(input.item.drugId),
          batchNo: input.batch,
          mfgDate: monthToIso(input.mfg),
          expiryDate: monthToIso(input.exp),
          qtyOrdered: input.item.qty,
          qtyReceived: input.received,
          qtyDamaged: input.damaged,
          unitCost: input.item.unitCost,
          location: input.location || undefined,
        });
        toast.success(`Stock received · ${created.grnNo}`, { description: 'Inventory & batch records updated.' });
        await loadInventory();
        await loadReceivePos();
        return true;
      } catch (e) {
        toast.error(invErr(e, 'Could not receive stock'));
        return false;
      }
    }
    await submitDelay();
    setReceivePos(prev => prev.map(p => {
      if (p.id !== input.po.id) return p;
      const items = p.items.map(i =>
        i.drugId === input.item.drugId
          ? { ...i, qtyReceived: (i.qtyReceived ?? 0) + accepted }
          : i,
      );
      const fully = items.every(i => (i.qtyReceived ?? 0) >= i.qty);
      return {
        ...p,
        items,
        delivery: fully ? 'Delivered' : 'Partial',
        status: fully ? 'Completed' : 'Partially Delivered',
      };
    }));
    setRows(prev => prev.map(r =>
      r.id === input.item.drugId ? { ...r, stock: r.stock + accepted } : r,
    ));
    toast.success('Stock received', { description: 'Inventory & batch records updated.' });
    return true;
  };

  const tabs: { value: typeof tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: rows.length },
    { value: 'low', label: 'Low Stock', count: rows.filter(d=>d.status==='Low').length },
    { value: 'oos', label: 'Out of Stock', count: rows.filter(d=>d.status==='Out of Stock').length },
    { value: 'expired', label: 'Expired', count: rows.filter(d=>d.status==='Expired'||isExpired(d.expiry)).length },
    { value: 'expiring', label: 'Expiring Soon', count: rows.filter(d=>isExpiringSoon(d.expiry)).length },
    { value: 'recent', label: 'Recently Added', count: rows.filter(d=>d.recentlyAdded).length },
  ];

  return (
    <PharmacyPage title="Drug Inventory">
      {invLoading && (
        <div className="hms-section p-6 mb-4 flex items-center justify-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading inventory…
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        <SummaryCard tone="blue"   title="Total Drugs"   value={String(rows.length)} icon={Boxes} />
        <SummaryCard tone="green"  title="Available"     value={String(rows.filter(d=>d.status==='Active').length)} icon={CheckCircle2} />
        <SummaryCard tone="amber"  title="Low Stock"     value={String(rows.filter(d=>d.status==='Low').length)} icon={AlertTriangle} />
        <SummaryCard tone="rose"   title="Out of Stock"  value={String(rows.filter(d=>d.status==='Out of Stock').length)} icon={XCircle} />
        <SummaryCard tone="rose"   title="Expired"       value={String(rows.filter(d=>d.status==='Expired'||isExpired(d.expiry)).length)} icon={AlertTriangle} />
        <SummaryCard tone="amber"  title="Expiring Soon" value={String(rows.filter(d=>isExpiringSoon(d.expiry)).length)} icon={Clock} />
        <SummaryCard tone="indigo" title="Recently Recv" value={String(recentlyReceived ?? 0)} icon={PackagePlus} />
      </div>

      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search drug, generic name or category" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Drug</Button>
          <Button onClick={() => setRecvOpen(true)}><PackagePlus className="h-4 w-4 mr-1" /> Receive Stock</Button>
        </div>
      </div>

      <div className="hms-section p-3 mb-4 overflow-x-auto">
        <Tabs value={tab} onValueChange={(v)=>setTab(v as any)}>
          <TabsList className="flex-wrap h-auto">
            {tabs.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label} <span className="ml-1.5 px-1.5 rounded-full bg-muted text-[10px]">{t.count}</span></TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Drug</th><th className="text-left p-3">Category</th><th className="text-left p-3">Strength / Form</th><th className="text-left p-3">Batch</th><th className="text-right p-3">Qty</th><th className="text-left p-3">Expiry</th><th className="text-left p-3">Supplier</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><div className="font-medium flex items-center gap-1">{d.name} {d.controlled && <Lock className="h-3 w-3 text-[hsl(0_70%_45%)]" />}</div><div className="text-xs text-muted-foreground">{d.genericName}</div></td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{d.category}</span></td>
                  <td className="p-3 text-xs">{d.strength} · {d.form}</td>
                  <td className="p-3 text-xs font-mono">{d.batch}</td>
                  <td className="p-3 text-right font-semibold">{d.stock}</td>
                  <td className="p-3 text-xs">{d.expiry} {isExpired(d.expiry) && <span className="ml-1 text-[hsl(0_70%_45%)] font-semibold">EXPIRED</span>}{!isExpired(d.expiry) && isExpiringSoon(d.expiry) && <span className="ml-1 text-amber-700 font-semibold">SOON</span>}</td>
                  <td className="p-3 text-xs">{d.supplierName}</td>
                  <td className="p-3"><StatusBadge status={d.status === 'Expired' || isExpired(d.expiry) ? 'Cancelled' : d.status} /></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={()=>setView(d.id)}><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={()=>openEdit(d.id)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={()=>{ setAdjust(d.id); setAdjQty(0); setAdjReason(''); }}><PackageMinus className="h-3 w-3" /></Button>
                      {isExpired(d.expiry) || isExpiringSoon(d.expiry) ? <Button size="sm" variant="destructive" onClick={()=>notifySuccess({ title:'Marked expired', message:`${d.name} batch ${d.batch} quarantined.` })}>Mark Expired</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No drugs match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* View drug */}
      <Dialog open={!!view} onOpenChange={(o)=>!o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewDrug?.name}</DialogTitle><DialogDescription>{viewDrug?.genericName}</DialogDescription></DialogHeader>
          {viewDrug && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs">Strength</Label><div>{viewDrug.strength}</div></div>
              <div><Label className="text-xs">Form</Label><div>{viewDrug.form}</div></div>
              <div><Label className="text-xs">Stock</Label><div className="font-semibold">{viewDrug.stock}</div></div>
              <div><Label className="text-xs">Reorder</Label><div>{viewDrug.reorderLevel}</div></div>
              <div><Label className="text-xs">Unit Price</Label><div>{formatCurrency(viewDrug.unitPrice)}</div></div>
              <div><Label className="text-xs">Batch</Label><div className="font-mono">{viewDrug.batch}</div></div>
              <div><Label className="text-xs">Expiry</Label><div>{viewDrug.expiry}</div></div>
              <div><Label className="text-xs">Shelf</Label><div>{viewDrug.shelf}</div></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={()=>setView(null)}>Close</Button><Button onClick={()=>{ if(viewDrug){ window.location.href = '/pharmacy/movements?drug=' + viewDrug.id; }}}>View Movements</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit drug */}
      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Drug</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={editName} onChange={e=>setEditName(e.target.value)} /></div>
              <div><Label>Reorder Level</Label><Input type="number" value={editReorder} onChange={e=>setEditReorder(parseInt(e.target.value)||0)} /></div>
              <div><Label>Unit Price (₦)</Label><Input type="number" value={editPrice} onChange={e=>setEditPrice(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Shelf</Label><Input value={editShelf} onChange={e=>setEditShelf(e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditing(null)} disabled={savingEdit}>Cancel</Button>
            <LoadingButton loading={savingEdit} loadingText="Saving…" onClick={() => { void saveEdit(); }}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust stock */}
      <Dialog open={!!adjust} onOpenChange={(o)=>!o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock — {adjustDrug?.name}</DialogTitle><DialogDescription>Current stock: {adjustDrug?.stock}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Adjustment (+/-)</Label><Input type="number" value={adjQty} onChange={e=>setAdjQty(parseInt(e.target.value)||0)} placeholder="-5 to remove, +10 to add" /></div>
            <div><Label>Reason *</Label><Textarea value={adjReason} onChange={e=>setAdjReason(e.target.value)} placeholder="e.g. Damaged goods, count correction" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAdjust(null)} disabled={savingAdjust}>Cancel</Button>
            <LoadingButton loading={savingAdjust} loadingText="Adjusting…" onClick={() => { void confirmAdjust(); }}>Confirm Adjustment</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PharmacyReceiveStockModal
        open={recvOpen}
        onOpenChange={setRecvOpen}
        pos={receivePos}
        receivedByName={receiverName}
        onReceive={receiveAgainstPo}
      />

      {/* Add drug to catalog */}
      <AddDrugDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        suppliers={suppliers}
        onCreate={async (input) => {
          if (useApi) {
            try {
              await apiCreateDrug(input);
              await loadInventory();
              notifySuccess({ title:'Drug added', message:`${input.name} is now in the catalog. Receive stock to add quantities.` });
            } catch (e) { toast.error(invErr(e, 'Could not add drug')); return false; }
            return true;
          }
          await submitDelay();
          notifySuccess({ title:'Drug added', message:`${input.name} added to catalog.` });
          return true;
        }}
      />
    </PharmacyPage>
  );
};

export function AddDrugDialog({ open, onOpenChange, suppliers, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; suppliers: ApiSupplier[];
  onCreate: (input: { name: string; genericName?: string; category?: string; form?: string; strength?: string; unit?: string; unitPrice?: number; reorderLevel?: number; shelf?: string; controlled?: boolean; supplierId?: number }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState('Tablet');
  const [strength, setStrength] = useState('');
  const [unit, setUnit] = useState('tab');
  const [unitPrice, setUnitPrice] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [shelf, setShelf] = useState('');
  const [controlled, setControlled] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setGenericName(''); setCategory(''); setForm('Tablet'); setStrength('');
    setUnit('tab'); setUnitPrice(0); setReorderLevel(0); setShelf(''); setControlled(false); setSupplierId('');
  };

  const submit = async () => {
    if (!name.trim()) { toast.error('Drug name is required'); return; }
    setSaving(true);
    const ok = await onCreate({
      name: name.trim(),
      genericName: genericName || undefined,
      category: category || undefined,
      form: form || undefined,
      strength: strength || undefined,
      unit: unit || undefined,
      unitPrice: unitPrice || undefined,
      reorderLevel: reorderLevel || undefined,
      shelf: shelf || undefined,
      controlled,
      supplierId: supplierId ? Number(supplierId) : undefined,
    });
    setSaving(false);
    if (ok) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Drug to Catalog</DialogTitle>
          <DialogDescription>Stock quantities and expiry are added later via Receive Stock (batch-tracked).</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Drug Name *</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Amoxicillin" /></div>
          <div><Label>Generic Name</Label><Input value={genericName} onChange={e=>setGenericName(e.target.value)} placeholder="e.g. Amoxicillin 500mg" /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {['Antimalarial','Antibiotic','Analgesic','Antihypertensive','Antidiabetic','Supplement','IV Fluid','Antifungal','Antiviral','Controlled','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Form</Label>
            <Select value={form} onValueChange={setForm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Tablet','Capsule','Syrup','Injection','Bag','Cream','Other'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Strength</Label><Input value={strength} onChange={e=>setStrength(e.target.value)} placeholder="e.g. 500mg" /></div>
          <div><Label>Unit</Label><Input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="tab / cap / amp / bag" /></div>
          <div><Label>Unit Price (₦)</Label><Input type="number" value={unitPrice||''} onChange={e=>setUnitPrice(parseFloat(e.target.value)||0)} /></div>
          <div><Label>Reorder Level</Label><Input type="number" value={reorderLevel||''} onChange={e=>setReorderLevel(parseInt(e.target.value)||0)} /></div>
          <div><Label>Shelf</Label><Input value={shelf} onChange={e=>setShelf(e.target.value)} placeholder="e.g. B-1" /></div>
          <div>
            <Label>Preferred Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No suppliers — add one under Procurement.</div>}
                {suppliers.map(s => <SelectItem key={s.supplierId} value={String(s.supplierId)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Controlled Substance</Label>
            <Select value={controlled ? 'Y' : 'N'} onValueChange={v=>setControlled(v==='Y')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="N">No</SelectItem>
                <SelectItem value="Y">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)} disabled={saving}>Cancel</Button>
          <LoadingButton loading={saving} loadingText="Saving…" onClick={() => { void submit(); }}>Add Drug</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 7. STOCK MOVEMENTS
// ============================================================
export const PharmacyMovements = () => {
  const [tab, setTab] = useState<'all'|'in'|'out'|'adjust'|'returns'|'expired'|'transfer'>('all');
  const [view, setView] = useState<string | null>(null);

  const list = stockMovements.filter(m => {
    if (tab === 'out') return m.type === 'DISPENSE';
    if (tab === 'in') return m.type === 'RECEIVE';
    if (tab === 'adjust') return m.type === 'ADJUSTMENT';
    if (tab === 'expired') return m.type === 'EXPIRY';
    if (tab === 'transfer') return m.type === 'TRANSFER';
    if (tab === 'returns') return false;
    return true;
  });

  const exportCSV = () => {
    const rows = [['Time','Drug','Type','Qty','Before','After','Rx','Actor','Note'], ...list.map(m => [m.at, m.drug, m.type, String(m.qty), String(m.before), String(m.after), m.rxId??'', m.actor, m.note??''])];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `stock-movements-${Date.now()}.csv`; a.click();
    toast.success('CSV exported');
  };

  const exportPDF = () => downloadReceipt('Stock Movements Report', list.map(m => `${m.at} · ${m.drug} · ${m.type} · ${m.qty>0?'+':''}${m.qty} (${m.before}→${m.after}) · ${m.actor}`), `movements-${Date.now()}.pdf`);

  const viewMov = view ? stockMovements.find(m => m.id === view) : null;

  return (
    <PharmacyPage title="Stock Movements">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard tone="green"  title="Stock In"    value={String(stockMovements.filter(m=>m.type==='RECEIVE').length)} icon={PackagePlus} />
        <SummaryCard tone="rose"   title="Stock Out"   value={String(stockMovements.filter(m=>m.type==='DISPENSE').length)} icon={PackageMinus} />
        <SummaryCard tone="amber"  title="Adjustments" value={String(stockMovements.filter(m=>m.type==='ADJUSTMENT').length)} icon={AlertTriangle} />
        <SummaryCard tone="teal"    title="Returns"     value="2" icon={RotateCcw} />
        <SummaryCard tone="rose"   title="Expired"     value={String(stockMovements.filter(m=>m.type==='EXPIRY').length)} icon={XCircle} />
        <SummaryCard tone="indigo" title="Transfers"   value={String(stockMovements.filter(m=>m.type==='TRANSFER').length)} icon={ArrowRight} />
      </div>

      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <Tabs value={tab} onValueChange={(v)=>setTab(v as any)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in">Stock In</TabsTrigger>
            <TabsTrigger value="out">Stock Out</TabsTrigger>
            <TabsTrigger value="adjust">Adjustments</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="transfer">Transfers</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Time</th><th className="text-left p-3">Drug</th><th className="text-left p-3">Type</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Before → After</th><th className="text-left p-3">Source</th><th className="text-left p-3">Destination</th><th className="text-left p-3">Staff</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {list.map(m => (
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono">{m.at}</td>
                  <td className="p-3 font-medium">{m.drug}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${m.type==='DISPENSE'?'bg-[hsl(0_84%_94%)] text-[hsl(0_70%_38%)]':m.type==='RECEIVE'?'bg-[hsl(145_63%_94%)] text-[hsl(145_63%_30%)]':'bg-[hsl(36_100%_94%)] text-[hsl(30_85%_38%)]'}`}>{m.type}</span></td>
                  <td className={`p-3 text-right font-semibold ${m.qty<0?'text-[hsl(0_70%_45%)]':'text-[hsl(145_63%_30%)]'}`}>{m.qty>0?'+':''}{m.qty}</td>
                  <td className="p-3 text-right text-xs">{m.before} → <span className="font-semibold">{m.after}</span></td>
                  <td className="p-3 text-xs">{m.type==='RECEIVE'?'Supplier':'Main Store'}</td>
                  <td className="p-3 text-xs">{m.type==='DISPENSE'?(m.rxId??'Patient'):'Main Store'}</td>
                  <td className="p-3 text-xs">{m.actor}</td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={()=>setView(m.id)}><Eye className="h-3 w-3 mr-1" />Details</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o)=>!o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Movement Details</DialogTitle></DialogHeader>
          {viewMov && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs">Time</Label><div className="font-mono">{viewMov.at}</div></div>
              <div><Label className="text-xs">Type</Label><div>{viewMov.type}</div></div>
              <div><Label className="text-xs">Drug</Label><div>{viewMov.drug}</div></div>
              <div><Label className="text-xs">Quantity</Label><div className="font-semibold">{viewMov.qty}</div></div>
              <div><Label className="text-xs">Before</Label><div>{viewMov.before}</div></div>
              <div><Label className="text-xs">After</Label><div>{viewMov.after}</div></div>
              <div><Label className="text-xs">Actor</Label><div>{viewMov.actor}</div></div>
              <div><Label className="text-xs">Rx Link</Label><div className="font-mono">{viewMov.rxId ?? '—'}</div></div>
              <div className="col-span-2"><Label className="text-xs">Note / Reason</Label><div>{viewMov.note ?? '—'}</div></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={()=>setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PharmacyPage>
  );
};

// ============================================================
// 8. EMR SYNC (unchanged from before but kept)
// ============================================================
export const PharmacySyncQueue = () => {
  const [emrOnline, setEmrOnline] = useState(true);
  const pending = prescriptionsFull.filter(r => r.emrSync === 'PENDING' && ['DISPENSED','PARTIALLY_DISPENSED'].includes(r.status));
  const synced = prescriptionsFull.filter(r => r.emrSync === 'SYNCED');
  return (
    <PharmacyPage title="EMR Sync Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone={emrOnline ? 'green' : 'rose'} title="EMR Status" value={emrOnline ? 'Online' : 'Offline'} icon={emrOnline ? Wifi : WifiOff} />
        <SummaryCard tone="amber"  title="Pending Sync" value={String(pending.length)} icon={RefreshCw} />
        <SummaryCard tone="green"  title="Synced Today" value={String(synced.length)} icon={CheckCircle2} />
        <SummaryCard tone="rose"   title="Failed"       value="0" icon={XCircle} />
      </div>
      <div className="hms-section p-4 mb-4 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">Background Medication-History Sync</div>
          <div className="text-xs text-muted-foreground">Pushes dispensed medications to EMR. Falls back to local HMS storage when EMR is unreachable.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEmrOnline(!emrOnline); toast.info(`EMR ${!emrOnline ? 'Online' : 'Offline'}`); }}>{emrOnline ? <WifiOff className="h-4 w-4 mr-1" /> : <Wifi className="h-4 w-4 mr-1" />} Toggle EMR</Button>
          <Button size="sm" onClick={() => notifySuccess({ title:'Sync complete', message:`${pending.length} record(s) pushed to EMR.` })} disabled={!emrOnline}><RefreshCw className="h-4 w-4 mr-1" /> Retry Sync Now</Button>
        </div>
      </div>
      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Rx</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Drugs</th><th className="text-left p-3">Dispensed</th><th className="text-left p-3">Sync Status</th></tr></thead>
            <tbody>{[...pending, ...synced].map(r => (<tr key={r.id} className="border-t hover:bg-muted/30"><td className="p-3 font-mono text-xs">{r.id}</td><td className="p-3">{r.patientName}</td><td className="p-3 text-xs">{r.items.map(i => `${i.drug} × ${i.qty}`).join(', ')}</td><td className="p-3 text-xs">{r.dispensedAt ?? '—'}</td><td className="p-3"><StatusBadge status={r.emrSync === 'SYNCED' ? 'Synced' : 'Retrying'} /></td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </PharmacyPage>
  );
};

// ============================================================
// 9. AUDIT TRAIL
// ============================================================
export const PharmacyAudit = () => {
  const apiOn = isPharmacyOpsApiEnabled();
  const [rows, setRows] = useState<PharmacyAuditEntry[]>([]);
  const [stats, setStats] = useState<PharmacyAuditStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<PharmacyAuditEntry | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPharmacyAudit({
        q: q.trim() || undefined,
        category: category === 'all' ? undefined : category,
        status: status === 'all' ? undefined : status,
        page,
        limit: 50,
      });
      setRows(data.items);
      setTotal(data.meta.total);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load pharmacy audit');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiOn, q, category, status, page]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const exportCSV = () => {
    const header = ['Time', 'Officer', 'Action', 'Patient', 'Hospital No', 'Module', 'Status', 'Note'];
    const body = rows.map((e) => [
      e.time ?? '',
      e.officer,
      e.action,
      e.patient,
      e.hospitalId,
      e.module,
      e.status,
      e.item ?? '',
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pharmacy-audit-${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  const exportPDF = () =>
    downloadReceipt(
      'Pharmacy Audit Trail',
      rows.map(
        (e) =>
          `${e.time ?? '—'} · ${e.officer} · ${e.action} · ${e.patient}${e.item ? ` — ${e.item}` : ''}`,
      ),
      `pharmacy-audit-${Date.now()}.pdf`,
    );

  const formatTime = (t: string | null) => {
    if (!t) return '—';
    try {
      return new Date(t).toLocaleString();
    } catch {
      return t;
    }
  };

  return (
    <PharmacyPage title="Pharmacy Audit Trail">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <SummaryCard tone="blue" title="Events Today" value={String(stats?.totalToday ?? '—')} icon={History} />
        <SummaryCard tone="green" title="Dispenses" value={String(stats?.dispenses ?? '—')} icon={Package} />
        <SummaryCard tone="rose" title="Emergencies / Overrides" value={String(stats?.overrides ?? '—')} icon={AlertTriangle} />
        <SummaryCard tone="amber" title="Stock Events" value={String(stats?.stockEvents ?? '—')} icon={PackageMinus} />
        <SummaryCard tone="purple" title="Returns" value={String(stats?.returns ?? '—')} icon={RotateCcw} />
        <SummaryCard tone="indigo" title="Emergencies (all)" value={String(stats?.emergencies ?? '—')} icon={ShieldCheck} />
      </div>

      <div className="hms-section p-4 mb-4">
        <div className="flex items-center gap-2 mb-3"><Filter className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Filters</span></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <Label className="text-xs">Search</Label>
            <Input className="h-9" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Officer, action, patient" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => { setPage(1); setCategory(v); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="dispense">Dispense</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="stock">Stock / Drugs</SelectItem>
                <SelectItem value="procurement">Procurement</SelectItem>
                <SelectItem value="return">Returns</SelectItem>
                <SelectItem value="emergency">Emergency / Override</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Flagged">Flagged</SelectItem>
                <SelectItem value="Suspicious">Suspicious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 col-span-2">
            <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Actor</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Module</th>
                <th className="text-left p-3">Note</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading audit trail…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No pharmacy audit events match these filters.</td></tr>
              ) : rows.map((e) => (
                <tr key={e.auditId} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono">{formatTime(e.time)}</td>
                  <td className="p-3 text-xs">{e.officer}<div className="text-[10px] text-muted-foreground">{e.role}</div></td>
                  <td className="p-3 text-sm">{e.action}</td>
                  <td className="p-3 text-xs">{e.patient}<div className="text-[10px] text-muted-foreground">{e.hospitalId}</div></td>
                  <td className="p-3 text-xs">{e.module}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[220px] truncate">{e.item ?? '—'}</td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => setView(e)}><Eye className="h-3 w-3 mr-1" />View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
          <span>{total} event(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-2 py-1">Page {page}</span>
            <Button size="sm" variant="outline" disabled={page * 50 >= total || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Audit Event</DialogTitle></DialogHeader>
          {view && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs">Time</Label><div className="font-mono">{formatTime(view.time)}</div></div>
              <div><Label className="text-xs">Actor</Label><div>{view.officer} ({view.role})</div></div>
              <div><Label className="text-xs">Patient</Label><div>{view.patient}</div></div>
              <div><Label className="text-xs">Hospital No</Label><div className="font-mono">{view.hospitalId}</div></div>
              <div className="col-span-2"><Label className="text-xs">Action</Label><div className="font-medium">{view.action}</div></div>
              <div className="col-span-2"><Label className="text-xs">Note</Label><div className="text-muted-foreground">{view.item ?? '—'}</div></div>
              <div className="col-span-2"><Label className="text-xs">Entity</Label><div className="font-mono text-xs">{view.entity ?? '—'} {view.entityId ? `#${view.entityId}` : ''}</div></div>
              <div className="col-span-2"><Label className="text-xs">New Value</Label><pre className="text-[10px] bg-muted/40 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">{view.newValue ?? '—'}</pre></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PharmacyPage>
  );
};

// ============================================================
// 10. RX DETAIL + INLINE DISPENSE
// ============================================================
export const PharmacyRxDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const useApi = isPharmacyApiEnabled() && isPrescriptionsApiEnabled();
  const rxNo = id ? decodeURIComponent(id) : '';

  const [apiRx, setApiRx] = useState<ApiPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');

  const load = async () => {
    if (!useApi) {
      setApiRx(null);
      setError('Backend API is not configured');
      setLoading(false);
      return;
    }
    if (!rxNo) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPrescriptionByRxNo(rxNo);
      setApiRx(data);
      setPharmacyNotes(data.pharmacyNotes ?? '');
    } catch (err) {
      setApiRx(null);
      setError(err instanceof ApiError ? err.message : 'Prescription not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi, rxNo]);

  const paymentOk = apiRx
    ? ['Paid', 'Waived', 'Emergency'].includes(apiRx.paymentStatus)
    : false;
  const isUnpaid = apiRx?.paymentStatus === 'Unpaid';

  const onDispense = async () => {
    if (!apiRx) return;
    setDispensing(true);
    try {
      const updated = await dispensePrescription(apiRx.prescriptionId, {
        pharmacyNotes: pharmacyNotes.trim() || undefined,
      });
      setApiRx(updated);
      setDispenseOpen(false);
      toast.success(`${updated.rxNo} dispensed`, {
        description: `Logged as pharmacy:dispense by ${user?.name ?? 'pharmacist'}`,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Dispense failed');
    } finally {
      setDispensing(false);
    }
  };

  const onEmergencyDispense = async () => {
    if (!apiRx) return;
    if (!receivedBy.trim()) {
      toast.error('Enter the name of the staff who received the drugs');
      return;
    }
    setDispensing(true);
    try {
      const updated = await emergencyDispensePrescription(apiRx.prescriptionId, {
        receivedBy: receivedBy.trim(),
        note: emergencyNote.trim() || undefined,
        pharmacyNotes: pharmacyNotes.trim() || undefined,
      });
      setApiRx(updated);
      setEmergencyOpen(false);
      setDispenseOpen(false);
      toast.success(`${updated.rxNo} emergency dispensed`, {
        description: `Received by ${receivedBy.trim()} — unpaid bill remains for cashier`,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Emergency dispense failed');
    } finally {
      setDispensing(false);
    }
  };

  if (useApi && loading) {
    return (
      <PharmacyPage title="Loading prescription…">
        <div className="hms-section p-10 text-center text-muted-foreground">
          Loading {rxNo} from GET /api/prescriptions/by-rx/…
        </div>
      </PharmacyPage>
    );
  }

  if (error || !apiRx) {
    return (
      <PharmacyPage title="Prescription Not Found">
        <div className="hms-section p-10 text-center">
          <p className="text-muted-foreground mb-2">{error ?? 'No prescription found with that ID.'}</p>
          <p className="text-xs text-muted-foreground mb-4 font-mono">{rxNo}</p>
          <Button onClick={() => navigate('/pharmacy/queue')}>Back to Queue</Button>
        </div>
      </PharmacyPage>
    );
  }

  {
    const row = toPharmacyQueueRow(apiRx);
    const canDispense = ['Sent', 'Partially Dispensed'].includes(apiRx.status);
    const patientName = row.patientName;

    return (
      <PharmacyPage title={`${apiRx.rxNo} — ${patientName}`}>
        <div className="hms-section p-5 mb-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                {apiRx.rxNo} · id {apiRx.prescriptionId} · {apiRx.clinic ?? 'Clinic'}
              </div>
              <h2 className="font-display text-xl font-bold mt-1">
                {patientName}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({row.age}, {row.gender})
                </span>
              </h2>
              <div className="text-xs text-muted-foreground">
                {row.patientId} · Prescribed by {apiRx.prescribedBy ?? '—'} · {row.prescribedAt}
              </div>
              {apiRx.diagnosis && (
                <div className="text-sm mt-1">
                  <span className="text-xs text-muted-foreground">Dx:</span> {apiRx.diagnosis}
                </div>
              )}
              {apiRx.dispensedBy && (
                <div className="text-xs mt-1 text-emerald-700">
                  Dispensed by {apiRx.dispensedBy}
                  {apiRx.dispensedAt
                    ? ` · ${apiRx.dispensedAt.replace('T', ' ').slice(0, 16)}`
                    : ''}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <StatusBadge
                status={
                  apiRx.paymentStatus === 'Paid'
                    ? 'Paid'
                    : apiRx.paymentStatus === 'Emergency'
                      ? 'Critical'
                      : 'Unpaid'
                }
              />
              <StatusBadge status={statusTone(row.status as RxStatus)} />
            </div>
          </div>
          <WorkflowRibbon status={row.status as RxStatus} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="hms-section p-5">
              <h3 className="font-display font-semibold mb-3">Prescribed Drugs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Drug</th>
                      <th className="text-left p-2">Dose</th>
                      <th className="text-left p-2">Duration</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Dispensed</th>
                      <th className="text-right p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiRx.items.map((i) => (
                      <tr key={i.itemId} className="border-t">
                        <td className="p-2">
                          <div className="font-medium">{i.drugName}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.strength ?? '—'} · {i.source}
                          </div>
                        </td>
                        <td className="p-2 text-xs">
                          {i.dose} {i.frequency}
                        </td>
                        <td className="p-2 text-xs">{i.duration ?? '—'}</td>
                        <td className="p-2 text-right font-semibold">{i.quantity}</td>
                        <td className="p-2 text-right">{i.qtyDispensed}</td>
                        <td className="p-2 text-right">
                          {formatCurrency(i.quantity * i.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={5} className="p-2 text-right font-medium">
                        Total
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatCurrency(apiRx.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {apiRx.allergiesNote && apiRx.allergiesNote !== 'None' && (
                <div className="mt-3 p-3 rounded-lg bg-[hsl(0_84%_96%)] border border-[hsl(0_84%_85%)] text-[hsl(0_70%_38%)] text-sm flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Allergy alert:</strong> {apiRx.allergiesNote}
                  </span>
                </div>
              )}

              {canDispense && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">Dispense</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paymentOk
                        ? 'Review full details in the confirm dialog before stock is deducted (FEFO).'
                        : 'Payment required at cashier/billing before normal dispense. Use emergency only when clinically necessary — leaves an unpaid bill.'}
                    </p>
                    {apiRx.emergencyReceivedBy && (
                      <p className="text-xs text-amber-800 mt-1">
                        Emergency receiver on file: {apiRx.emergencyReceivedBy}
                        {apiRx.emergencyNote ? ` · ${apiRx.emergencyNote}` : ''}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Pharmacy notes (optional)</Label>
                    <Textarea
                      value={pharmacyNotes}
                      onChange={(e) => setPharmacyNotes(e.target.value)}
                      placeholder="Counselling notes, partial fill reason…"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {paymentOk ? (
                      <Button onClick={() => setDispenseOpen(true)}>
                        <Eye className="h-4 w-4 mr-1" />Review & Dispense
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        <Lock className="h-4 w-4 mr-1" />Pay at cashier first
                      </Button>
                    )}
                    {isUnpaid && (
                      <Button variant="destructive" onClick={() => { setEmergencyOpen(true); setReceivedBy(''); setEmergencyNote(''); }}>
                        <AlertTriangle className="h-4 w-4 mr-1" />Emergency Dispense
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate('/pharmacy/queue')}>
                      Back to Queue
                    </Button>
                  </div>
                </div>
              )}

              <Dialog open={dispenseOpen} onOpenChange={setDispenseOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Confirm dispense — {apiRx.rxNo}</DialogTitle>
                    <DialogDescription>
                      Review patient and drugs. Confirming deducts stock and marks the prescription dispensed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium">{patientName}</div>
                      <div className="text-xs text-muted-foreground">{row.patientId} · {apiRx.paymentStatus} · {formatCurrency(apiRx.total)}</div>
                    </div>
                    <div className="rounded-lg border divide-y">
                      {apiRx.items.map((i) => (
                        <div key={i.itemId} className="p-2 flex justify-between gap-2">
                          <div>
                            <div className="font-medium">{i.drugName}</div>
                            <div className="text-xs text-muted-foreground">{i.dose} {i.frequency} · qty {i.quantity}</div>
                          </div>
                          <div className="text-right">{formatCurrency(i.quantity * i.unitPrice)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDispenseOpen(false)}>Cancel</Button>
                    <LoadingButton loading={dispensing} loadingText="Dispensing…" onClick={() => void onDispense()}>
                      <Pill className="h-4 w-4 mr-1" />Confirm Dispense
                    </LoadingButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Emergency dispense — {apiRx.rxNo}</DialogTitle>
                    <DialogDescription>
                      Drugs will be issued now. Record who received them. The bill stays unpaid/emergency for cashier collection later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg border divide-y">
                      {apiRx.items.map((i) => (
                        <div key={i.itemId} className="p-2 flex justify-between gap-2">
                          <span>{i.drugName} × {i.quantity}</span>
                          <span>{formatCurrency(i.quantity * i.unitPrice)}</span>
                        </div>
                      ))}
                      <div className="p-2 flex justify-between font-bold bg-muted/40">
                        <span>Total due later</span><span>{formatCurrency(apiRx.total)}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Staff / person who received drugs *</Label>
                      <Input
                        className="mt-1"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder="e.g. Nurse Ama / Dr. Mensah / Ward 3"
                      />
                    </div>
                    <div>
                      <Label>Emergency note (optional)</Label>
                      <Textarea
                        className="mt-1"
                        value={emergencyNote}
                        onChange={(e) => setEmergencyNote(e.target.value)}
                        placeholder="Clinical reason for override…"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setEmergencyOpen(false)}>Cancel</Button>
                    <LoadingButton
                      loading={dispensing}
                      loadingText="Dispensing…"
                      variant="destructive"
                      onClick={() => void onEmergencyDispense()}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />Confirm Emergency Dispense
                    </LoadingButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {!canDispense && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => navigate('/pharmacy/queue')}>
                    Back to Queue
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadReceipt(
                        `Prescription ${apiRx.rxNo}`,
                        [
                          `Patient: ${patientName}`,
                          `Doctor: ${apiRx.prescribedBy ?? '—'}`,
                          '',
                          ...apiRx.items.map(
                            (i) =>
                              `${i.drugName} ${i.strength ?? ''} — ${i.dose} ${i.frequency} for ${i.duration ?? '—'} (Qty ${i.quantity})`,
                          ),
                        ],
                        `rx-${apiRx.rxNo}.pdf`,
                      )
                    }
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" /> Audit Timeline
            </h3>
            <div className="space-y-3">
              {(apiRx.auditTrail ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No audit events yet for this prescription.</p>
              )}
              {(apiRx.auditTrail ?? []).map((a, i, arr) => (
                <div key={`${a.at}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="text-xs text-muted-foreground font-mono">
                      {a.at.replace('T', ' ').slice(0, 16)}
                    </div>
                    <div className="text-sm font-medium">{a.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.actor}
                      {a.note ? ` · ${a.note}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PharmacyPage>
    );
  }
};

// ============================================================
// 11. DOCTOR-SIDE PRESCRIBE PANEL (kept)
// ============================================================
export const DoctorPrescribePanel = ({ patientName, patientId, visitId }: { patientName: string; patientId: string; visitId: string }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ drugId: string; qty: number; dose: string; duration: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const total = items.reduce((s, it) => s + it.qty * (drugById(it.drugId)?.unitPrice ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Pill className="h-4 w-4 mr-1" /> Prescribe</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create Prescription</DialogTitle><DialogDescription>System-generated only. Patient must clear billing before pharmacy dispenses.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm p-3 rounded-lg bg-muted/40">
            <div><Label className="text-xs">Patient</Label><div className="font-medium">{patientName}</div></div>
            <div><Label className="text-xs">Hospital ID</Label><div className="font-mono text-xs">{patientId}</div></div>
            <div><Label className="text-xs">Visit</Label><div className="font-mono text-xs">{visitId}</div></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Drugs</Label><Button variant="outline" size="sm" onClick={()=>setPickerOpen(true)}><FilePlus className="h-3 w-3 mr-1" /> Add Drug</Button></div>
            {items.length === 0 && <div className="text-xs text-muted-foreground p-4 text-center bg-muted/30 rounded-lg">No drugs added yet.</div>}
            {items.map((it, idx) => { const d = drugById(it.drugId)!; const oos = d.stock < it.qty; return (
              <div key={idx} className={`p-3 rounded-lg border ${oos ? 'border-[hsl(0_84%_70%)] bg-[hsl(0_84%_98%)]' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{d.name} <span className="text-xs text-muted-foreground">{d.strength}</span></div>
                  <Button variant="ghost" size="sm" onClick={()=>setItems(items.filter((_,i)=>i!==idx))}><XCircle className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Dose</Label><Input value={it.dose} onChange={e=>setItems(prev => prev.map((x,i)=>i===idx?{...x,dose:e.target.value}:x))} placeholder="1 tab BD" className="h-8" /></div>
                  <div><Label className="text-xs">Duration</Label><Input value={it.duration} onChange={e=>setItems(prev => prev.map((x,i)=>i===idx?{...x,duration:e.target.value}:x))} placeholder="5 days" className="h-8" /></div>
                  <div><Label className="text-xs">Qty</Label><Input type="number" min={1} value={it.qty} onChange={e=>setItems(prev => prev.map((x,i)=>i===idx?{...x,qty:parseInt(e.target.value)||0}:x))} className="h-8" /></div>
                </div>
                {oos && <div className="text-xs text-[hsl(0_70%_45%)] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Stock {d.stock} insufficient</div>}
              </div>
            ); })}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40"><span className="text-sm font-medium">Estimated Total</span><span className="font-bold">{formatCurrency(total)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button disabled={items.length===0} onClick={()=>{ notifySuccess({ title:'Prescription sent', message:`${items.length} drug(s) prescribed. Invoice generated — patient routed to billing.` }); setOpen(false); setItems([]); }}><Send className="h-4 w-4 mr-1" /> Send to Pharmacy</Button>
        </DialogFooter>
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Select Drug</DialogTitle></DialogHeader>
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {drugCatalog.map(d => (
                <button key={d.id} type="button" onClick={()=>{ setItems([...items, { drugId: d.id, qty: 10, dose: '', duration: '' }]); setPickerOpen(false); }} className="text-left p-3 rounded-lg border hover:bg-muted/40 flex items-center justify-between">
                  <div><div className="font-medium text-sm">{d.name} <span className="text-xs text-muted-foreground">{d.strength}</span></div><div className="text-xs text-muted-foreground">{d.category} · {formatCurrency(d.unitPrice)}/unit</div></div>
                  <StatusBadge status={d.status} />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
