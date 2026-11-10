import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import {
  ipdAdmissions, ipdBeds, ipdSyncQueue, longStayFlags, formatNGN,
  type AdmissionV2, type BedV2, type AdmissionStatus,
} from '@/data/ipdData';
import {
  BedDouble, Users, Activity, ShieldCheck, Building2, ClipboardList, ClipboardCheck,
  AlertTriangle, RefreshCw, FileCheck, Stethoscope, Pill, FlaskConical, Receipt,
  TrendingUp, History, LayoutDashboard, ArrowRightLeft, UserPlus, Wallet, Siren,
  HeartPulse, NotebookPen, BadgeAlert, Search, ArrowLeft, CreditCard, FilePlus2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Sidebar (IPD-focused — adapts for nurse / doctor / admin)
// ─────────────────────────────────────────────────────────────
const ipdSidebar = [
  { label: 'IPD Dashboard',      path: '/ipd',              icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Admission Requests', path: '/ipd/requests',     icon: <FilePlus2 className="h-4 w-4" /> },
  { label: 'Bed Board',          path: '/ipd/beds',         icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Active Admissions',  path: '/ipd/active',       icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Daily Care',         path: '/ipd/care',         icon: <HeartPulse className="h-4 w-4" /> },
  { label: 'Continuous Billing', path: '/ipd/billing',      icon: <Receipt className="h-4 w-4" /> },
  { label: 'Transfers',          path: '/ipd/transfers',    icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Long-Stay Alerts',   path: '/ipd/long-stay',    icon: <BadgeAlert className="h-4 w-4" /> },
  { label: 'Discharge Queue',    path: '/ipd/discharge',    icon: <FileCheck className="h-4 w-4" /> },
  { label: 'EMR Sync',           path: '/ipd/sync',         icon: <RefreshCw className="h-4 w-4" /> },
];

const IpdLayout = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user } = useAuth();
  void user;
  return <DashboardLayout title={title} navItems={ipdSidebar}>{children}</DashboardLayout>;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const statusTone: Record<AdmissionStatus, string> = {
  PENDING_ADMISSION:        'bg-slate-100 text-slate-700 ring-slate-200',
  BED_RESERVED:             'bg-amber-50 text-amber-800 ring-amber-200',
  AWAITING_DEPOSIT:         'bg-orange-50 text-orange-800 ring-orange-200',
  ACTIVE:                   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  DISCHARGE_REQUESTED:      'bg-sky-50 text-sky-800 ring-sky-200',
  AWAITING_FINAL_PAYMENT:   'bg-amber-50 text-amber-800 ring-amber-200',
  DISCHARGED:               'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELLED:                'bg-red-50 text-red-700 ring-red-200',
};

const StatusPill = ({ status }: { status: AdmissionStatus }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${statusTone[status]}`}>
    {status.replace(/_/g, ' ')}
  </span>
);

const bedTone = (s: BedV2['status']) => ({
  AVAILABLE:   'bg-emerald-50 border-emerald-200 text-emerald-900',
  RESERVED:    'bg-amber-50 border-amber-200 text-amber-900',
  OCCUPIED:    'bg-sky-50 border-sky-200 text-sky-900',
  CLEANING:    'bg-purple-50 border-purple-200 text-purple-900',
  MAINTENANCE: 'bg-red-50 border-red-200 text-red-900',
}[s]);

// Workflow ribbon for an admission
const AdmissionRibbon = ({ status }: { status: AdmissionStatus }) => {
  const steps: AdmissionStatus[] = ['PENDING_ADMISSION','BED_RESERVED','AWAITING_DEPOSIT','ACTIVE','DISCHARGE_REQUESTED','AWAITING_FINAL_PAYMENT','DISCHARGED'];
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`px-2 py-1 rounded-md text-[10px] font-semibold ring-1 ${
              current ? 'bg-primary text-primary-foreground ring-primary' :
              done    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' :
                        'bg-muted/40 text-muted-foreground ring-border'
            }`}>{s.replace(/_/g, ' ')}</div>
            {i < steps.length - 1 && <div className={`h-0.5 w-3 ${done ? 'bg-emerald-300' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 1. IPD DASHBOARD
// ─────────────────────────────────────────────────────────────
export const IpdDashboard = () => {
  const active   = ipdAdmissions.filter(a => a.status === 'ACTIVE').length;
  const pending  = ipdAdmissions.filter(a => ['PENDING_ADMISSION','BED_RESERVED','AWAITING_DEPOSIT'].includes(a.status)).length;
  const occupied = ipdBeds.filter(b => b.status === 'OCCUPIED').length;
  const totalBeds= ipdBeds.length;
  const occPct   = Math.round((occupied / totalBeds) * 100);
  const outstanding = ipdAdmissions.reduce((s,a) => s + Math.max(0, a.balance), 0);
  const todaysCharges = ipdAdmissions.reduce((s,a) =>
    s + a.charges.filter(c => c.postedAt.startsWith('2026-04-28')).reduce((x,c) => x + c.amount, 0), 0);

  return (
    <IpdLayout title="IPD Operations Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="teal"   icon={ClipboardList} title="Active Admissions" value={String(active)} subtitle={`${pending} awaiting admission`} />
        <SummaryCard tone="blue"   icon={BedDouble}     title="Bed Occupancy" value={`${occPct}%`} subtitle={`${occupied}/${totalBeds} occupied`} />
        <SummaryCard tone="amber"  icon={Wallet}        title="Outstanding IPD" value={formatNGN(outstanding)} subtitle="Across all wards" />
        <SummaryCard tone="green"  icon={TrendingUp}    title="Charges Posted Today" value={formatNGN(todaysCharges)} subtitle="Auto + manual" trend="up" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="hms-section p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/> Live Admission Pipeline</h3>
            <Link to="/ipd/active"><Button size="sm" variant="outline">View all</Button></Link>
          </div>
          <div className="space-y-2">
            {ipdAdmissions.slice(0, 6).map(a => (
              <Link key={a.id} to={`/ipd/admission/${a.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary text-xs font-bold">
                    {a.bedNumber ?? '—'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.patientName} <span className="text-xs text-muted-foreground">{a.hospitalId}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{a.ward ?? a.wardRequired} • {a.diagnosis}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.isEmergency && <span className="badge-danger">Emergency</span>}
                  <StatusPill status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="hms-section p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><BadgeAlert className="h-4 w-4 text-amber-600"/> Long-Stay Revenue Alerts</h3>
          <div className="space-y-2">
            {longStayFlags.map(f => (
              <div key={f.admissionId} className={`p-3 rounded-lg ring-1 ${
                f.alertLevel === 'CRITICAL' ? 'bg-red-50 ring-red-200'
                : f.alertLevel === 'WARNING' ? 'bg-amber-50 ring-amber-200'
                : 'bg-sky-50 ring-sky-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{f.patientName}</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${
                    f.alertLevel === 'CRITICAL' ? 'text-red-700' :
                    f.alertLevel === 'WARNING' ? 'text-amber-700' : 'text-sky-700'
                  }`}>{f.alertLevel}</span>
                </div>
                <div className="text-xs text-muted-foreground">{f.daysAdmitted} days • Last paid {f.lastPaymentDate}</div>
                <div className="text-xs mt-1">Outstanding: <b className="text-foreground">{formatNGN(f.outstandingBalance)}</b></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hms-section p-5">
        <h3 className="font-display font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4 text-primary"/> Ward Occupancy Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(ipdBeds.reduce<Record<string, BedV2[]>>((acc,b) => {
            (acc[b.ward] ||= []).push(b); return acc;
          }, {})).map(([ward, list]) => {
            const occ = list.filter(b => b.status === 'OCCUPIED').length;
            const pct = Math.round((occ / list.length) * 100);
            return (
              <div key={ward} className="p-3 rounded-lg border bg-card">
                <div className="text-xs font-medium truncate">{ward}</div>
                <div className="text-xl font-bold font-display mt-1">{occ}<span className="text-xs text-muted-foreground">/{list.length}</span></div>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-[hsl(180_100%_38%)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{pct}% occupied</div>
              </div>
            );
          })}
        </div>
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. ADMISSION REQUESTS (Doctor creates → Bed assignment → Deposit)
// ─────────────────────────────────────────────────────────────
export const AdmissionRequests = () => {
  const [open, setOpen] = useState(false);
  const requests = ipdAdmissions.filter(a => ['PENDING_ADMISSION','BED_RESERVED','AWAITING_DEPOSIT'].includes(a.status));
  const [form, setForm] = useState({
    patient: '', diagnosis: '', wardType: 'General', doctor: 'Dr. Adewale', emergency: false, deposit: 50000,
  });

  return (
    <IpdLayout title="Admission Requests">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="amber"  icon={FilePlus2}     title="Pending Requests" value={String(requests.filter(r=>r.status==='PENDING_ADMISSION').length)} />
        <SummaryCard tone="blue"   icon={BedDouble}     title="Beds Reserved"   value={String(requests.filter(r=>r.status==='BED_RESERVED').length)} />
        <SummaryCard tone="rose"   icon={Wallet}        title="Awaiting Deposit" value={String(requests.filter(r=>r.status==='AWAITING_DEPOSIT').length)} />
        <SummaryCard tone="purple" icon={Siren}         title="Emergency Cases"  value={String(requests.filter(r=>r.isEmergency).length)} />
      </div>

      <div className="hms-section p-4 mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold">Doctor → Admission Pipeline</h3>
          <p className="text-xs text-muted-foreground">Doctors initiate, Records assigns bed, Cashier confirms deposit before ward access.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><FilePlus2 className="h-4 w-4 mr-1"/> New Admission Request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Admission Request</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Patient (search)</Label><Input value={form.patient} onChange={e => setForm({...form, patient: e.target.value})} placeholder="Hospital ID or Name"/></div>
              <div className="col-span-2"><Label>Diagnosis</Label><Textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} placeholder="Provisional diagnosis"/></div>
              <div><Label>Ward Type</Label>
                <Select value={form.wardType} onValueChange={v => setForm({...form, wardType: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {['General','Private','ICU','Maternity','Pediatric','Isolation'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Admitting Doctor</Label><Input value={form.doctor} onChange={e => setForm({...form, doctor: e.target.value})}/></div>
              <div><Label>Required Deposit (₦)</Label><Input type="number" value={form.deposit} onChange={e => setForm({...form, deposit: +e.target.value})}/></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.emergency} onCheckedChange={v => setForm({...form, emergency: v})}/>
                <Label className="!mb-0">Emergency override (skip deposit gate)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { toast.success('Admission request created — pending bed allocation'); setOpen(false); }}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {requests.map(a => (
          <div key={a.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold">{a.patientName}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{a.id}</span>
                  <StatusPill status={a.status} />
                  {a.isEmergency && <span className="badge-danger">Emergency</span>}
                </div>
                <p className="text-sm mt-1">{a.diagnosis}</p>
                <p className="text-xs text-muted-foreground">Doctor: {a.admittingDoctor} • Ward: {a.ward ?? a.wardRequired} {a.bedNumber ? `• Bed ${a.bedNumber}` : '• Bed not yet assigned'}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">Required deposit</div>
                <div className="text-xl font-bold font-display">{formatNGN(a.depositRequired)}</div>
                <div className="text-xs">Paid: <b className={a.depositPaid >= a.depositRequired ? 'text-emerald-600' : 'text-amber-600'}>{formatNGN(a.depositPaid)}</b></div>
              </div>
            </div>
            <div className="mt-3"><AdmissionRibbon status={a.status} /></div>
            <div className="flex flex-wrap gap-2 mt-3">
              {a.status === 'PENDING_ADMISSION' && <Button size="sm" onClick={() => toast.success(`${a.patientName} → bed reserved (system suggested)`)}><BedDouble className="h-3 w-3 mr-1"/> Allocate Bed</Button>}
              {a.status === 'BED_RESERVED' && <Button size="sm" onClick={() => toast.success(`Billing initiated for ${a.patientName}`)}><Receipt className="h-3 w-3 mr-1"/> Initiate Billing</Button>}
              {a.status === 'AWAITING_DEPOSIT' && <Button size="sm" onClick={() => toast.success(`Deposit ${formatNGN(a.depositRequired)} confirmed — patient may enter ward`)}><CreditCard className="h-3 w-3 mr-1"/> Confirm Deposit</Button>}
              {!a.isEmergency && a.status === 'AWAITING_DEPOSIT' && <Button size="sm" variant="outline" onClick={() => toast.warning('Emergency override logged for audit')}><Siren className="h-3 w-3 mr-1"/> Emergency Override</Button>}
              <Link to={`/ipd/admission/${a.id}`}><Button size="sm" variant="outline">Open Chart</Button></Link>
            </div>
          </div>
        ))}
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. BED BOARD (real-time, color-coded)
// ─────────────────────────────────────────────────────────────
export const BedBoard = () => {
  const [filter, setFilter] = useState<'ALL' | BedV2['status']>('ALL');
  const grouped = useMemo(() => {
    const g: Record<string, BedV2[]> = {};
    ipdBeds.forEach(b => { if (filter === 'ALL' || b.status === filter) (g[b.ward] ||= []).push(b); });
    return g;
  }, [filter]);

  const counts = ipdBeds.reduce<Record<string, number>>((a,b) => ({ ...a, [b.status]: (a[b.status]||0)+1 }), {});

  return (
    <IpdLayout title="Bed Board — Real-Time Ward Status">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <SummaryCard tone="green"  icon={ShieldCheck} title="Available"   value={String(counts.AVAILABLE   ?? 0)} />
        <SummaryCard tone="amber"  icon={ClipboardCheck} title="Reserved" value={String(counts.RESERVED    ?? 0)} />
        <SummaryCard tone="blue"   icon={Users}      title="Occupied"     value={String(counts.OCCUPIED    ?? 0)} />
        <SummaryCard tone="purple" icon={RefreshCw}  title="Cleaning"     value={String(counts.CLEANING    ?? 0)} />
        <SummaryCard tone="rose"   icon={AlertTriangle} title="Maintenance" value={String(counts.MAINTENANCE ?? 0)} />
      </div>

      <div className="hms-section p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-2">Filter:</span>
        {(['ALL','AVAILABLE','RESERVED','OCCUPIED','CLEANING','MAINTENANCE'] as const).map(k => (
          <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{k}</Button>
        ))}
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([ward, list]) => (
          <div key={ward} className="hms-section p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary"/> {ward}</h3>
              <span className="text-xs text-muted-foreground">{list.filter(b => b.status === 'OCCUPIED').length}/{list.length} occupied</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {list.map(b => (
                <div key={b.id} className={`p-3 rounded-xl border-2 ${bedTone(b.status)} relative`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold font-mono">{b.bedNumber}</div>
                    <BedDouble className="h-4 w-4 opacity-70"/>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wide mt-1">{b.status}</div>
                  {b.patient && <div className="text-xs mt-1.5 truncate font-medium">{b.patient}</div>}
                  {b.occupiedSince && <div className="text-[10px] opacity-70">Since {b.occupiedSince}</div>}
                  <div className="text-[10px] opacity-80 mt-1">{formatNGN(b.ratePerDay)}/day</div>
                  {b.admissionId && (
                    <Link to={`/ipd/admission/${b.admissionId}`} className="absolute inset-0" aria-label={`Open ${b.patient}`}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 4. ACTIVE ADMISSIONS (table)
// ─────────────────────────────────────────────────────────────
export const ActiveAdmissions = () => {
  const [search, setSearch] = useState('');
  const list = ipdAdmissions.filter(a =>
    a.status === 'ACTIVE' && (
      !search ||
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.hospitalId.toLowerCase().includes(search.toLowerCase()) ||
      (a.bedNumber ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );
  return (
    <IpdLayout title="Active Admissions">
      <div className="hms-section p-3 mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient, ID or bed" className="pl-9"/>
        </div>
        <span className="text-xs text-muted-foreground">{list.length} active</span>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Patient</th>
                <th className="text-left p-3">Ward / Bed</th>
                <th className="text-left p-3">Doctor</th>
                <th className="text-left p-3">Diagnosis</th>
                <th className="text-left p-3">Days</th>
                <th className="text-right p-3">Running Bill</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-left p-3">Sync</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{a.patientName}</div>
                    <div className="text-xs text-muted-foreground">{a.hospitalId} • {a.age}/{a.gender[0]}</div>
                  </td>
                  <td className="p-3 text-xs">{a.ward}<br/><b>{a.bedNumber}</b></td>
                  <td className="p-3 text-xs">{a.admittingDoctor}</td>
                  <td className="p-3 text-xs">{a.diagnosis}</td>
                  <td className="p-3">{a.daysAdmitted}</td>
                  <td className="p-3 text-right font-medium">{formatNGN(a.runningBill)}</td>
                  <td className={`p-3 text-right font-semibold ${a.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(a.balance)}</td>
                  <td className="p-3"><StatusBadge status={a.emrSync === 'SYNCED' ? 'Synced' : a.emrSync === 'PENDING' ? 'Pending' : 'Failed'}/></td>
                  <td className="p-3"><Link to={`/ipd/admission/${a.id}`}><Button size="sm" variant="outline">Open</Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 5. DAILY CARE — vitals & nursing notes board
// ─────────────────────────────────────────────────────────────
export const DailyCare = () => {
  const active = ipdAdmissions.filter(a => a.status === 'ACTIVE');
  return (
    <IpdLayout title="Daily Care — Nursing & Doctor Rounds">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="teal"  icon={HeartPulse} title="Vitals Recorded Today" value={String(active.reduce((s,a)=>s+a.vitals.filter(v=>v.recordedAt.startsWith('2026-04-28')).length,0))} />
        <SummaryCard tone="blue"  icon={NotebookPen} title="Nursing Notes" value={String(active.reduce((s,a)=>s+a.nursingNotes.length,0))} />
        <SummaryCard tone="green" icon={Stethoscope} title="Doctor Rounds Today" value={String(active.reduce((s,a)=>s+a.rounds.filter(r=>r.timestamp.startsWith('2026-04-28')).length,0))} />
        <SummaryCard tone="amber" icon={AlertTriangle} title="Pending Vitals (>4h)" value="2" subtitle="Auto-flag" />
      </div>

      <div className="space-y-3">
        {active.map(a => {
          const lastVital = a.vitals[0];
          return (
            <div key={a.id} className="hms-section p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-display font-semibold">{a.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{a.bedNumber}</span></div>
                  <div className="text-xs text-muted-foreground">{a.ward} • {a.diagnosis}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`Vitals recorded for ${a.patientName}`)}><HeartPulse className="h-3 w-3 mr-1"/> Record Vitals</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Nursing note added')}><NotebookPen className="h-3 w-3 mr-1"/> Add Note</Button>
                  <Link to={`/ipd/admission/${a.id}`}><Button size="sm">Open Chart</Button></Link>
                </div>
              </div>
              {lastVital && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 pt-3 border-t">
                  <div><div className="text-xs text-muted-foreground">BP</div><div className="font-semibold">{lastVital.bp}</div></div>
                  <div><div className="text-xs text-muted-foreground">Pulse</div><div className="font-semibold">{lastVital.pulse} bpm</div></div>
                  <div><div className="text-xs text-muted-foreground">Temp</div><div className={`font-semibold ${lastVital.temp >= 38 ? 'text-red-600' : ''}`}>{lastVital.temp}°C</div></div>
                  <div><div className="text-xs text-muted-foreground">SpO₂</div><div className={`font-semibold ${lastVital.spo2 < 95 ? 'text-amber-600' : ''}`}>{lastVital.spo2}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Resp</div><div className="font-semibold">{lastVital.resp}/min</div></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 6. CONTINUOUS BILLING (per-admission running ledgers)
// ─────────────────────────────────────────────────────────────
export const ContinuousBilling = () => {
  const list = ipdAdmissions.filter(a => ['ACTIVE','DISCHARGE_REQUESTED','AWAITING_FINAL_PAYMENT'].includes(a.status));
  const totalRunning = list.reduce((s,a)=>s+a.runningBill,0);
  const totalOutstanding = list.reduce((s,a)=>s+Math.max(0,a.balance),0);
  const todayPosted = list.reduce((s,a)=>s+a.charges.filter(c=>c.postedAt.startsWith('2026-04-28')).reduce((x,c)=>x+c.amount,0),0);

  return (
    <IpdLayout title="Continuous Billing Engine">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="teal"  icon={Receipt} title="Total Running Bills" value={formatNGN(totalRunning)} />
        <SummaryCard tone="amber" icon={Wallet}  title="Outstanding"        value={formatNGN(totalOutstanding)} />
        <SummaryCard tone="green" icon={TrendingUp} title="Posted Today"    value={formatNGN(todayPosted)} trend="up" />
        <SummaryCard tone="blue"  icon={ClipboardList} title="Active Ledgers" value={String(list.length)} />
      </div>

      <div className="space-y-3">
        {list.map(a => (
          <div key={a.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <div className="font-display font-semibold">{a.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{a.id}</span></div>
                <div className="text-xs text-muted-foreground">{a.ward} • {a.bedNumber} • Day {a.daysAdmitted}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">{formatNGN(a.runningBill)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-emerald-700">{formatNGN(a.paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Balance</div><div className={`font-bold ${a.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(a.balance)}</div></div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr><th className="text-left p-2">Posted</th><th className="text-left p-2">Category</th><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Source</th></tr>
                </thead>
                <tbody>
                  {a.charges.map(c => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{c.postedAt}</td>
                      <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{c.category}</span></td>
                      <td className="p-2">{c.description}</td>
                      <td className="p-2 text-right">{c.qty}</td>
                      <td className="p-2 text-right">{formatNGN(c.unitPrice)}</td>
                      <td className="p-2 text-right font-semibold">{formatNGN(c.amount)}</td>
                      <td className="p-2 text-muted-foreground">{c.source ?? c.postedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success('Manual charge posted')}><FilePlus2 className="h-3 w-3 mr-1"/> Post Charge</Button>
              <Button size="sm" onClick={() => toast.success('Top-up payment recorded')}><CreditCard className="h-3 w-3 mr-1"/> Record Payment</Button>
              <Link to={`/ipd/admission/${a.id}`}><Button size="sm" variant="ghost">View Chart</Button></Link>
            </div>
          </div>
        ))}
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 7. TRANSFERS
// ─────────────────────────────────────────────────────────────
export const TransfersPage = () => {
  const all = ipdAdmissions.flatMap(a => a.transfers.map(t => ({ ...t, patientName: a.patientName, admissionId: a.id })));
  return (
    <IpdLayout title="Ward & Bed Transfers">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"  icon={ArrowRightLeft} title="Transfers Logged" value={String(all.length)} />
        <SummaryCard tone="amber" icon={Activity}       title="ICU Step-downs"   value="1" />
        <SummaryCard tone="rose"  icon={Siren}          title="Emergency Moves"  value="1" />
        <SummaryCard tone="green" icon={ShieldCheck}    title="Authorized"       value={String(all.length)} />
      </div>
      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Time</th><th className="text-left p-3">Patient</th><th className="text-left p-3">From</th><th className="text-left p-3">To</th><th className="text-left p-3">Reason</th><th className="text-left p-3">Authorized By</th></tr>
            </thead>
            <tbody>
              {all.map(t => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs whitespace-nowrap">{t.timestamp}</td>
                  <td className="p-3"><Link to={`/ipd/admission/${t.admissionId}`} className="font-medium hover:underline">{t.patientName}</Link></td>
                  <td className="p-3 text-xs">{t.fromWard} / <b>{t.fromBed}</b></td>
                  <td className="p-3 text-xs">{t.toWard} / <b>{t.toBed}</b></td>
                  <td className="p-3 text-xs">{t.reason}</td>
                  <td className="p-3 text-xs">{t.authorizedBy}</td>
                </tr>
              ))}
              {all.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-6">No transfers logged.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 8. LONG-STAY ALERTS
// ─────────────────────────────────────────────────────────────
export const LongStayAlerts = () => (
  <IpdLayout title="Long-Stay Revenue Alerts">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <SummaryCard tone="rose"   icon={BadgeAlert}    title="Critical"  value={String(longStayFlags.filter(f=>f.alertLevel==='CRITICAL').length)} />
      <SummaryCard tone="amber"  icon={AlertTriangle} title="Warning"   value={String(longStayFlags.filter(f=>f.alertLevel==='WARNING').length)} />
      <SummaryCard tone="blue"   icon={Activity}      title="Watch"     value={String(longStayFlags.filter(f=>f.alertLevel==='WATCH').length)} />
      <SummaryCard tone="amber"  icon={Wallet}        title="Total Outstanding" value={formatNGN(longStayFlags.reduce((s,f)=>s+f.outstandingBalance,0))} />
    </div>
    <div className="space-y-3">
      {longStayFlags.map(f => {
        const adm = ipdAdmissions.find(a => a.id === f.admissionId);
        return (
          <div key={f.admissionId} className={`hms-section p-5 border-l-4 ${
            f.alertLevel==='CRITICAL' ? 'border-l-red-500' :
            f.alertLevel==='WARNING'  ? 'border-l-amber-500' : 'border-l-sky-500'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold">{f.patientName}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${
                    f.alertLevel==='CRITICAL' ? 'bg-red-50 text-red-700 ring-red-200' :
                    f.alertLevel==='WARNING'  ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                                                'bg-sky-50 text-sky-700 ring-sky-200'
                  }`}>{f.alertLevel}</span>
                </div>
                <p className="text-xs text-muted-foreground">{adm?.ward} • {f.daysAdmitted} day(s) • Last payment {f.lastPaymentDate}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-2xl font-bold font-display">{formatNGN(f.outstandingBalance)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={() => toast.success('SMS reminder sent to next of kin')}>Send SMS Reminder</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success('Finance notified')}>Notify Finance</Button>
              <Link to={`/ipd/admission/${f.admissionId}`}><Button size="sm" variant="ghost">Open Chart</Button></Link>
            </div>
          </div>
        );
      })}
    </div>
  </IpdLayout>
);

// ─────────────────────────────────────────────────────────────
// 9. DISCHARGE QUEUE
// ─────────────────────────────────────────────────────────────
export const DischargeQueue = () => {
  const list = ipdAdmissions.filter(a => ['DISCHARGE_REQUESTED','AWAITING_FINAL_PAYMENT'].includes(a.status));
  return (
    <IpdLayout title="Discharge Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="blue"  icon={FileCheck}  title="Discharge Requests" value={String(list.length)} />
        <SummaryCard tone="amber" icon={Wallet}     title="Pending Final Payment" value={String(list.filter(a=>a.balance>0).length)} />
        <SummaryCard tone="green" icon={ShieldCheck} title="Cleared for Release" value={String(list.filter(a=>a.balance<=0).length)} />
        <SummaryCard tone="purple" icon={BedDouble}  title="Beds to Release"     value={String(list.length)} />
      </div>
      <div className="space-y-3">
        {list.map(a => (
          <div key={a.id} className="hms-section p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold">{a.patientName} <span className="text-xs text-muted-foreground font-mono ml-2">{a.hospitalId}</span></h3>
                <p className="text-xs text-muted-foreground">{a.ward} / {a.bedNumber} • Admitted {a.admittedOn} • {a.daysAdmitted} day(s)</p>
                <p className="text-sm mt-1">{a.diagnosis}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div><div className="text-xs text-muted-foreground">Final Bill</div><div className="font-bold">{formatNGN(a.runningBill)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-emerald-700">{formatNGN(a.paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Balance</div><div className={`font-bold ${a.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(a.balance)}</div></div>
              </div>
            </div>
            <div className="mt-3"><AdmissionRibbon status={a.status}/></div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success('Discharge summary printed')}><FileCheck className="h-3 w-3 mr-1"/> Print Summary</Button>
              {a.balance > 0
                ? <Button size="sm" onClick={() => toast.success(`Final payment ${formatNGN(a.balance)} recorded`)}><CreditCard className="h-3 w-3 mr-1"/> Settle Balance</Button>
                : <Button size="sm" onClick={() => toast.success(`${a.patientName} discharged. Bed ${a.bedNumber} released.`)}><BedDouble className="h-3 w-3 mr-1"/> Release Bed & Discharge</Button>}
              <Link to={`/ipd/admission/${a.id}`}><Button size="sm" variant="ghost">Open Chart</Button></Link>
            </div>
          </div>
        ))}
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 10. EMR SYNC
// ─────────────────────────────────────────────────────────────
export const IpdSyncPage = () => {
  const [online, setOnline] = useState(true);
  return (
    <IpdLayout title="IPD → EMR Sync Queue">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard tone="green"  icon={ShieldCheck} title="Synced"   value={String(ipdSyncQueue.filter(s=>s.status==='SYNCED').length)} />
        <SummaryCard tone="amber"  icon={RefreshCw}   title="Pending"  value={String(ipdSyncQueue.filter(s=>s.status==='PENDING').length)} />
        <SummaryCard tone="blue"   icon={Activity}    title="Retrying" value={String(ipdSyncQueue.filter(s=>s.status==='RETRYING').length)} />
        <SummaryCard tone="rose"   icon={AlertTriangle} title="Failed" value={String(ipdSyncQueue.filter(s=>s.status==='FAILED').length)} />
      </div>

      <div className="hms-section p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}/>
          <div>
            <div className="font-medium text-sm">EMR Endpoint: {online ? 'Online' : 'Offline (queueing locally)'}</div>
            <div className="text-xs text-muted-foreground">Background worker syncs every 60s.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><Switch checked={online} onCheckedChange={setOnline}/><Label className="!mb-0 text-xs">EMR Online</Label></div>
          <Button size="sm" variant="outline" onClick={() => toast.success('Retrying all failed sync jobs')}><RefreshCw className="h-3 w-3 mr-1"/> Retry All Failed</Button>
        </div>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Job</th><th className="text-left p-3">Admission</th><th className="text-left p-3">Payload</th><th className="text-left p-3">Attempts</th><th className="text-left p-3">Last Try</th><th className="text-left p-3">Status</th><th className="text-left p-3">Message</th><th className="text-left p-3"></th></tr>
            </thead>
            <tbody>
              {ipdSyncQueue.map(s => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{s.id}</td>
                  <td className="p-3"><Link to={`/ipd/admission/${s.admissionId}`} className="font-medium hover:underline">{s.admissionId}</Link></td>
                  <td className="p-3 text-xs">{s.payload}</td>
                  <td className="p-3">{s.attempts}</td>
                  <td className="p-3 text-xs">{s.lastTry}</td>
                  <td className="p-3"><StatusBadge status={s.status === 'SYNCED' ? 'Synced' : s.status === 'PENDING' ? 'Pending' : s.status === 'RETRYING' ? 'Retrying' : 'Failed'}/></td>
                  <td className="p-3 text-xs text-muted-foreground">{s.message}</td>
                  <td className="p-3">{s.status !== 'SYNCED' && <Button size="sm" variant="outline" onClick={() => toast.success(`Retrying ${s.id}`)}>Retry</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </IpdLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// 11. ADMISSION DETAIL — full inpatient chart
// ─────────────────────────────────────────────────────────────
export const AdmissionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const adm = ipdAdmissions.find(a => a.id === id);

  if (!adm) {
    return (
      <IpdLayout title="Admission not found">
        <div className="hms-section p-10 text-center">
          <p className="text-muted-foreground mb-4">No admission found for {id}.</p>
          <Button onClick={() => navigate('/ipd/active')}><ArrowLeft className="h-4 w-4 mr-1"/> Back</Button>
        </div>
      </IpdLayout>
    );
  }

  return (
    <IpdLayout title={`Inpatient Chart — ${adm.patientName}`}>
      <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"><ArrowLeft className="h-3 w-3"/> Back</button>

      {/* Header */}
      <div className="hms-section p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(180_100%_38%)] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/30">
              {adm.bedNumber}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-xl">{adm.patientName}</h2>
                <StatusPill status={adm.status}/>
                {adm.isEmergency && <span className="badge-danger">Emergency</span>}
                <StatusBadge status={adm.emrSync === 'SYNCED' ? 'Synced' : adm.emrSync === 'PENDING' ? 'Pending' : 'Failed'}/>
              </div>
              <p className="text-sm text-muted-foreground">{adm.hospitalId} • {adm.age}/{adm.gender} • {adm.insurance}</p>
              <p className="text-sm mt-1"><b>Diagnosis:</b> {adm.diagnosis}</p>
              <p className="text-xs text-muted-foreground">Doctor: {adm.admittingDoctor} • {adm.ward} / Bed {adm.bedNumber}</p>
              {adm.allergies && adm.allergies !== 'None' && <p className="text-xs text-red-700 mt-1"><AlertTriangle className="h-3 w-3 inline mr-1"/> Allergies: {adm.allergies}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <div><div className="text-xs text-muted-foreground">Day</div><div className="text-2xl font-bold font-display">{adm.daysAdmitted}</div></div>
            <div><div className="text-xs text-muted-foreground">Running Bill</div><div className="text-xl font-bold font-display">{formatNGN(adm.runningBill)}</div></div>
            <div><div className="text-xs text-muted-foreground">Balance</div><div className={`text-xl font-bold font-display ${adm.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(adm.balance)}</div></div>
          </div>
        </div>
        <div className="mt-4"><AdmissionRibbon status={adm.status}/></div>
      </div>

      <Tabs defaultValue="vitals">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="nursing">Nursing</TabsTrigger>
          <TabsTrigger value="rounds">Doctor Rounds</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="meds">Linked Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="hms-section p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary"/> Vital Signs</h3>
            <Button size="sm" onClick={() => toast.success('Vitals recorded')}><HeartPulse className="h-3 w-3 mr-1"/> Record Vitals</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Time</th><th className="text-left p-2">By</th><th className="text-left p-2">BP</th><th className="text-left p-2">Pulse</th><th className="text-left p-2">Temp</th><th className="text-left p-2">SpO₂</th><th className="text-left p-2">Resp</th><th className="text-left p-2">Notes</th></tr>
            </thead>
            <tbody>
              {adm.vitals.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-2 text-xs whitespace-nowrap">{v.recordedAt}</td>
                  <td className="p-2 text-xs">{v.recordedBy}</td>
                  <td className="p-2 font-medium">{v.bp}</td>
                  <td className="p-2">{v.pulse}</td>
                  <td className={`p-2 ${v.temp >= 38 ? 'text-red-600 font-semibold' : ''}`}>{v.temp}°C</td>
                  <td className={`p-2 ${v.spo2 < 95 ? 'text-amber-600 font-semibold' : ''}`}>{v.spo2}%</td>
                  <td className="p-2">{v.resp}</td>
                  <td className="p-2 text-xs">{v.notes ?? '—'}</td>
                </tr>
              ))}
              {adm.vitals.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No vitals recorded yet.</td></tr>}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="nursing" className="hms-section p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary"/> Nursing Notes</h3>
            <Button size="sm" onClick={() => toast.success('Nursing note added')}>Add Note</Button>
          </div>
          <div className="space-y-3">
            {adm.nursingNotes.map(n => (
              <div key={n.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{n.shift}</span>
                    <span className="text-muted-foreground">{n.timestamp}</span>
                  </div>
                  <span className="text-muted-foreground">{n.nurse}</span>
                </div>
                <p className="text-sm mt-2">{n.note}</p>
                {n.medsAdministered && n.medsAdministered.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.medsAdministered.map(m => <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">💊 {m}</span>)}
                  </div>
                )}
              </div>
            ))}
            {adm.nursingNotes.length === 0 && <p className="text-sm text-muted-foreground">No nursing notes yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="rounds" className="hms-section p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary"/> Doctor Rounds</h3>
            <Button size="sm" onClick={() => toast.success('Round logged')}>Log Round</Button>
          </div>
          <div className="space-y-3">
            {adm.rounds.map(r => (
              <div key={r.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{r.doctor}</span>
                  <span className="text-muted-foreground">{r.timestamp}</span>
                </div>
                <p className="text-sm mt-2"><b>Assessment:</b> {r.assessment}</p>
                <p className="text-sm"><b>Plan:</b> {r.plan}</p>
                {r.newOrders && r.newOrders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.newOrders.map(o => <span key={o} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">📝 {o}</span>)}
                  </div>
                )}
              </div>
            ))}
            {adm.rounds.length === 0 && <p className="text-sm text-muted-foreground">No rounds yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="charges" className="hms-section p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary"/> Continuous Charges Ledger</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.success('Charge posted')}><FilePlus2 className="h-3 w-3 mr-1"/> Post Charge</Button>
              <Button size="sm" onClick={() => toast.success('Top-up payment recorded')}><CreditCard className="h-3 w-3 mr-1"/> Record Payment</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr><th className="text-left p-2">Posted</th><th className="text-left p-2">Category</th><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Source</th></tr>
              </thead>
              <tbody>
                {adm.charges.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{c.postedAt}</td>
                    <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{c.category}</span></td>
                    <td className="p-2">{c.description}</td>
                    <td className="p-2 text-right">{c.qty}</td>
                    <td className="p-2 text-right">{formatNGN(c.unitPrice)}</td>
                    <td className="p-2 text-right font-semibold">{formatNGN(c.amount)}</td>
                    <td className="p-2 text-muted-foreground">{c.source ?? c.postedBy}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-semibold">
                <tr><td colSpan={5} className="p-2 text-right">Total Running Bill</td><td className="p-2 text-right">{formatNGN(adm.runningBill)}</td><td/></tr>
                <tr><td colSpan={5} className="p-2 text-right text-emerald-700">Paid</td><td className="p-2 text-right text-emerald-700">{formatNGN(adm.paid)}</td><td/></tr>
                <tr><td colSpan={5} className={`p-2 text-right ${adm.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Balance</td><td className={`p-2 text-right ${adm.balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatNGN(adm.balance)}</td><td/></tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="meds" className="hms-section p-5 mt-4">
          <h3 className="font-display font-semibold mb-3">Linked Pharmacy & Lab Orders</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Pill className="h-4 w-4 text-emerald-600"/> Active IPD Prescriptions</h4>
              {adm.charges.filter(c => c.category === 'Drug').map(c => (
                <div key={c.id} className="text-sm py-1 border-b last:border-0">
                  • {c.description} <span className="text-xs text-muted-foreground">({c.source ?? '—'})</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg border">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><FlaskConical className="h-4 w-4 text-sky-600"/> Lab Orders</h4>
              {adm.charges.filter(c => c.category === 'Lab').map(c => (
                <div key={c.id} className="text-sm py-1 border-b last:border-0">
                  • {c.description} <span className="text-xs text-muted-foreground">({c.source ?? '—'})</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer actions */}
      <div className="hms-section p-4 mt-4 flex flex-wrap gap-2 justify-end">
        {adm.status === 'ACTIVE' && (
          <>
            <Button variant="outline" onClick={() => toast.success(`Transfer initiated for ${adm.patientName}`)}><ArrowRightLeft className="h-4 w-4 mr-1"/> Transfer Patient</Button>
            <Button variant="outline" onClick={() => toast.warning('Discharge requested — sent to billing')}><FileCheck className="h-4 w-4 mr-1"/> Request Discharge</Button>
          </>
        )}
      </div>
    </IpdLayout>
  );
};
