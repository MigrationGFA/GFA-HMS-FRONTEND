import { useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wallet, LayoutDashboard, Receipt, Building2, ShieldCheck, Brain, CreditCard, Split,
  FileText, RotateCcw, StickyNote, Activity, BedDouble, Printer, ScanLine, BarChart3,
  ScrollText, Sparkles, Plug, Wifi, CloudCog, Plus, CheckCircle2, XCircle, ArrowUpRight,
  ArrowDownRight, RefreshCw, Download, Send, AlertTriangle, Banknote, Smartphone,
  Building, TrendingUp, TrendingDown, Eye, Lock, Unlock,
} from 'lucide-react';
import ServiceBillingLive from '@/pages/billing/ServiceBillingLive';

const base = '/dashboard/superadmin/billing';

export const billingNavItems = [
  { label: 'Revenue Control Center', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Wallet', path: `${base}/wallet`, icon: <Wallet className="h-4 w-4" /> },
  { label: 'Service Billing', path: `${base}/services`, icon: <Receipt className="h-4 w-4" /> },
  { label: 'Departmental Billing', path: `${base}/departments`, icon: <Building2 className="h-4 w-4" /> },
  { label: 'NHIA / HMO Billing', path: `${base}/insurance`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Psychiatry Billing', path: `${base}/psychiatry`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Payment Processing', path: `${base}/payments`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Split Billing', path: `${base}/split`, icon: <Split className="h-4 w-4" /> },
  { label: 'Invoice Management', path: `${base}/invoices`, icon: <FileText className="h-4 w-4" /> },
  { label: 'Refunds & Reversals', path: `${base}/refunds`, icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Financial Notes', path: `${base}/notes`, icon: <StickyNote className="h-4 w-4" /> },
  { label: 'Payment Tracking', path: `${base}/tracking`, icon: <Activity className="h-4 w-4" /> },
  { label: 'Accommodation & Bed', path: `${base}/accommodation`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Receipt Generation', path: `${base}/receipts`, icon: <Printer className="h-4 w-4" /> },
  { label: 'Cashier & POS', path: '/dashboard/cashier', icon: <ScanLine className="h-4 w-4" /> },
  { label: 'Financial Dashboards', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Audit & Compliance', path: `${base}/audit`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'AI Financial Insights', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'HMS + EMR Integration', path: `${base}/integration`, icon: <Plug className="h-4 w-4" /> },
  { label: 'Offline / Low-Bandwidth', path: `${base}/offline`, icon: <Wifi className="h-4 w-4" /> },
  { label: 'Enterprise Deployment', path: `${base}/deployment`, icon: <CloudCog className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={billingNavItems} title={`Billing & Revenue · ${title}`}>{children}</DashboardLayout>
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

const ngn = (n: number) => `₦${n.toLocaleString()}`;

// ============ 1. REVENUE CONTROL CENTER ============
export const BillingOverview = () => {
  const stats = [
    { title: "Today's Revenue", value: ngn(4_842_500), subtitle: '+8.4% vs yesterday', icon: TrendingUp, tone: 'green' as const },
    { title: 'Outstanding', value: ngn(2_154_000), subtitle: '63 invoices', icon: AlertTriangle, tone: 'rose' as const },
    { title: 'Pending', value: ngn(986_200), subtitle: '28 awaiting payment', icon: Activity, tone: 'amber' as const },
    { title: 'Wallet Float', value: ngn(11_320_000), subtitle: '2,184 active wallets', icon: Wallet, tone: 'purple' as const },
    { title: 'NHIA Claims', value: ngn(3_540_000), subtitle: '18 submitted today', icon: ShieldCheck, tone: 'blue' as const },
    { title: 'Refunds (30d)', value: ngn(184_500), subtitle: '12 processed', icon: RotateCcw, tone: 'amber' as const },
    { title: 'POS Collected', value: ngn(1_245_000), subtitle: '5 terminals live', icon: ScanLine, tone: 'teal' as const },
    { title: 'Reconciled', value: '98.6%', subtitle: '12 exceptions', icon: CheckCircle2, tone: 'green' as const },
  ];
  const channels = [
    { c: 'Patient Wallet', v: 42, color: 'bg-purple-500' },
    { c: 'POS / Card', v: 24, color: 'bg-teal-500' },
    { c: 'Bank Transfer', v: 14, color: 'bg-blue-500' },
    { c: 'Cash', v: 9, color: 'bg-amber-500' },
    { c: 'NHIA / HMO', v: 11, color: 'bg-sky-500' },
  ];
  const recent = [
    { time: '11:24', ref: 'INV-50231', patient: 'Adebola O.', dept: 'OPC Psychiatry', amount: 18500, status: 'Paid', method: 'Wallet' },
    { time: '11:18', ref: 'INV-50230', patient: 'Chinwe E.', dept: 'GMPC', amount: 7500, status: 'Paid', method: 'POS' },
    { time: '11:05', ref: 'INV-50229', patient: 'Sodiq Y.', dept: 'Addiction', amount: 25000, status: 'Pending', method: '—' },
    { time: '10:58', ref: 'INV-50228', patient: 'Halimat B.', dept: 'Lab', amount: 12200, status: 'Paid', method: 'NHIA' },
    { time: '10:42', ref: 'INV-50227', patient: 'Kelechi N.', dept: 'Pharmacy', amount: 6850, status: 'Partial', method: 'Cash + Wallet' },
    { time: '10:31', ref: 'INV-50226', patient: 'Folake A.', dept: 'Telepsychiatry', amount: 15000, status: 'Failed', method: 'Card' },
  ];
  return (
    <Shell title="Control Center">
      <Section icon={<LayoutDashboard />} title="Revenue Control Center" desc="Hospital-wide financial command — live revenue, outstanding, wallets, NHIA claims, reconciliation."
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => toast.success('Live data refreshed')}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button><Button onClick={() => toast.success('Daily statement exported')}><Download className="h-4 w-4 mr-2" />Export Statement</Button></div>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <SummaryCard key={s.title} {...s} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-display font-bold mb-3">Recent Transactions</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead>Dept</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{recent.map(r => (
              <TableRow key={r.ref}>
                <TableCell className="font-mono text-sm">{r.time}</TableCell>
                <TableCell className="font-semibold">{r.ref}</TableCell>
                <TableCell>{r.patient}</TableCell>
                <TableCell>{r.dept}</TableCell>
                <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{ngn(r.amount)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-4">Revenue by Channel</h3>
          {channels.map(c => (
            <div key={c.c} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${c.color}`}></span>{c.c}</span><span className="font-semibold">{c.v}%</span></div>
              <Progress value={c.v} />
            </div>
          ))}
          <div className="mt-4 pt-4 border-t text-sm">
            <div className="flex justify-between mb-1"><span className="text-muted-foreground">Daily Target</span><span className="font-semibold">{ngn(5_500_000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Achieved</span><span className="font-bold text-tertiary">88%</span></div>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 2. PATIENT WALLET ============
export const WalletEngine = () => {
  const [openFund, setOpenFund] = useState(false);
  const wallets = [
    { id: 'W-2401', patient: 'Adebola Okafor', balance: 24500, status: 'Active', last: '2h ago' },
    { id: 'W-2402', patient: 'Chinwe Eze', balance: 0, status: 'Active', last: '1d ago' },
    { id: 'W-2403', patient: 'Sodiq Yusuf', balance: 152000, status: 'Active', last: '5m ago' },
    { id: 'W-2404', patient: 'Halimat Bello', balance: 8200, status: 'Frozen', last: '3d ago' },
    { id: 'W-2405', patient: 'Kelechi Nwosu', balance: 47600, status: 'Active', last: 'just now' },
  ];
  return (
    <Shell title="Patient Wallet">
      <Section icon={<Wallet />} title="Patient Wallet Engine" desc="Secure digital healthcare wallet — funding, deductions, freeze/unfreeze, fraud detection."
        action={<Button onClick={() => setOpenFund(true)}><Plus className="h-4 w-4 mr-2" />Fund Wallet</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Active Wallets" value="2,184" icon={Wallet} tone="purple" />
        <SummaryCard title="Total Float" value={ngn(11_320_000)} icon={Banknote} tone="green" />
        <SummaryCard title="Funded Today" value={ngn(842_000)} icon={ArrowUpRight} tone="teal" />
        <SummaryCard title="Frozen" value="14" icon={Lock} tone="rose" />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-3">Wallet Directory</h3>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead>Last Txn</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{wallets.map(w => (
            <TableRow key={w.id}>
              <TableCell className="font-mono">{w.id}</TableCell>
              <TableCell>{w.patient}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(w.balance)}</TableCell>
              <TableCell>{w.status === 'Frozen' ? <Badge variant="destructive">Frozen</Badge> : <Badge>Active</Badge>}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{w.last}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`Funded ${w.patient}`)}><Plus className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast(w.status === 'Frozen' ? `Unfrozen ${w.id}` : `Frozen ${w.id}`)}>{w.status === 'Frozen' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Statement downloaded')}><Download className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
      <Dialog open={openFund} onOpenChange={setOpenFund}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fund Patient Wallet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient Wallet</Label><Input placeholder="Search MPI or wallet ID..." /></div>
            <div><Label>Amount (₦)</Label><Input type="number" placeholder="10000" /></div>
            <div><Label>Channel</Label><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>
              <SelectItem value="paystack">Paystack</SelectItem><SelectItem value="flutter">Flutterwave</SelectItem>
              <SelectItem value="transfer">Bank Transfer</SelectItem><SelectItem value="pos">POS</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenFund(false)}>Cancel</Button><Button onClick={() => { toast.success('Wallet credited · receipt sent via SMS'); setOpenFund(false); }}>Fund</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 3. SERVICE BILLING ============
export const ServiceBilling = () => {
  const mockServices = [
    { cat: 'Consultation', svc: 'GMPC General', price: 5000, dept: 'GMPC' },
    { cat: 'Consultation', svc: 'OPC Psychiatry', price: 12000, dept: 'OPC' },
    { cat: 'Consultation', svc: 'Child Psychiatry', price: 15000, dept: 'CAP' },
    { cat: 'Therapy', svc: 'CBT Session (45m)', price: 18000, dept: 'Psychology' },
    { cat: 'Therapy', svc: 'Addiction Group Therapy', price: 8000, dept: 'Addiction' },
    { cat: 'Lab', svc: 'Full Blood Count', price: 4500, dept: 'Laboratory' },
    { cat: 'Lab', svc: 'Liver Function Test', price: 9500, dept: 'Laboratory' },
    { cat: 'Pharmacy', svc: 'Olanzapine 10mg x 30', price: 9800, dept: 'Pharmacy' },
    { cat: 'Admission', svc: 'General Ward (per day)', price: 8000, dept: 'IPD' },
    { cat: 'Admission', svc: 'Private Ward (per day)', price: 25000, dept: 'IPD' },
    { cat: 'Procedure', svc: 'ECT Session', price: 35000, dept: 'OPC' },
    { cat: 'Telemedicine', svc: 'Telepsychiatry (30m)', price: 10000, dept: 'Telepsych' },
  ];
  const mockFallback = (
    <Shell title="Service Billing">
      <Section icon={<Receipt />} title="Service Billing Engine" desc="Unified pricing catalog and auto-invoicing for every clinical service in the hospital." action={<Button onClick={() => toast.success('Catalog synced to EMR')}><RefreshCw className="h-4 w-4 mr-2" />Sync Catalog</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Service</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{mockServices.map(s => (
            <TableRow key={s.svc}>
              <TableCell><Badge variant="outline">{s.cat}</Badge></TableCell>
              <TableCell className="font-semibold">{s.svc}</TableCell>
              <TableCell>{s.dept}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(s.price)}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`Invoice drafted for ${s.svc}`)}>Bill Now</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );

  return (
    <ServiceBillingLive
      Shell={Shell}
      Section={Section}
      Card={Card}
      mockFallback={mockFallback}
    />
  );
};

// ============ 4. DEPARTMENTAL BILLING ============
export const DepartmentalBilling = () => {
  const depts = [
    { d: 'OPC Psychiatry', today: 1_240_000, mtd: 28_400_000, v: 84 },
    { d: 'GMPC', today: 540_000, mtd: 12_800_000, v: 62 },
    { d: 'Addiction Services', today: 420_000, mtd: 9_200_000, v: 48 },
    { d: 'Laboratory', today: 380_000, mtd: 11_500_000, v: 71 },
    { d: 'Pharmacy', today: 620_000, mtd: 16_300_000, v: 76 },
    { d: 'Radiology', today: 240_000, mtd: 6_400_000, v: 38 },
    { d: 'Inpatient (Wards)', today: 980_000, mtd: 24_100_000, v: 81 },
    { d: 'ICU', today: 280_000, mtd: 5_100_000, v: 52 },
    { d: 'Telemedicine', today: 142_000, mtd: 3_200_000, v: 34 },
  ];
  return (
    <Shell title="Departmental Billing">
      <Section icon={<Building2 />} title="Departmental Billing System" desc="Per-department revenue visibility, price lists, cost-centre allocation and automated EMR triggers." />
      <div className="grid md:grid-cols-2 gap-5">
        {depts.map(d => (
          <Card key={d.d}>
            <div className="flex justify-between items-start mb-2">
              <div><h3 className="font-display font-bold">{d.d}</h3><p className="text-xs text-muted-foreground">Cost Centre</p></div>
              <Badge>{d.v}% utilization</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><div className="text-xs text-muted-foreground">Today</div><div className="text-lg font-bold">{ngn(d.today)}</div></div>
              <div><div className="text-xs text-muted-foreground">MTD</div><div className="text-lg font-bold">{ngn(d.mtd)}</div></div>
            </div>
            <Progress className="mt-3" value={d.v} />
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success(`${d.d} price list opened`)}>Price List</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success(`${d.d} report exported`)}>Report</Button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 5. NHIA / HMO INSURANCE ============
export const InsuranceBilling = () => {
  const claims = [
    { id: 'CLM-1024', patient: 'Adebola O.', scheme: 'NHIA', amount: 84500, covered: 76050, copay: 8450, status: 'Submitted' },
    { id: 'CLM-1025', patient: 'Halimat B.', scheme: 'AXA Mansard', amount: 32000, covered: 32000, copay: 0, status: 'Approved' },
    { id: 'CLM-1026', patient: 'Tunde A.', scheme: 'Hygeia HMO', amount: 65000, covered: 52000, copay: 13000, status: 'Pending Auth' },
    { id: 'CLM-1027', patient: 'Folake A.', scheme: 'NHIS', amount: 18000, covered: 16200, copay: 1800, status: 'Rejected' },
  ];
  return (
    <Shell title="NHIA / HMO">
      <Section icon={<ShieldCheck />} title="NHIA / NHIS & HMO Billing" desc="Insurance verification, eligibility, co-payment split, claim generation and submission." action={<Button onClick={() => toast.success('Eligibility check started')}><CheckCircle2 className="h-4 w-4 mr-2" />Verify Patient</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Active Schemes" value="14" icon={ShieldCheck} tone="blue" />
        <SummaryCard title="Claims Today" value="38" icon={FileText} tone="teal" />
        <SummaryCard title="Approved (MTD)" value={ngn(18_400_000)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Rejection Rate" value="4.2%" icon={XCircle} tone="rose" />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-3">Claims Queue</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Claim</TableHead><TableHead>Patient</TableHead><TableHead>Scheme</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Covered</TableHead><TableHead className="text-right">Co-Pay</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{claims.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-mono">{c.id}</TableCell>
              <TableCell>{c.patient}</TableCell>
              <TableCell><Badge variant="outline">{c.scheme}</Badge></TableCell>
              <TableCell className="text-right">{ngn(c.amount)}</TableCell>
              <TableCell className="text-right text-tertiary">{ngn(c.covered)}</TableCell>
              <TableCell className="text-right text-amber-600">{ngn(c.copay)}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`${c.id} processed`)}><Send className="h-3 w-3" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 6. PSYCHIATRY BILLING ============
export const PsychiatryBilling = () => {
  const models = [
    { svc: 'Psychiatric Consultation (initial)', model: 'Per session', price: 15000 },
    { svc: 'Psychiatric Follow-up', model: 'Per session', price: 9000 },
    { svc: 'CBT Therapy Block (8 sessions)', model: 'Package', price: 120000 },
    { svc: 'Addiction Therapy Programme', model: 'Programme (6 weeks)', price: 280000 },
    { svc: 'Child & Adolescent Psychiatry', model: 'Per session', price: 15000 },
    { svc: 'Psychogeriatric Review', model: 'Per session', price: 12000 },
    { svc: 'Group Therapy', model: 'Per attendee per session', price: 6000 },
    { svc: 'Long-term Inpatient Care', model: 'Per day (banded)', price: 18000 },
    { svc: 'ECT Course (6 sessions)', model: 'Package', price: 180000 },
  ];
  return (
    <Shell title="Psychiatry Billing">
      <Section icon={<Brain />} title="Psychiatry Billing Models" desc="Session, package and programme billing tailored for psychiatric and behavioural-health services." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Pricing Model</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{models.map(m => (
            <TableRow key={m.svc}>
              <TableCell className="font-semibold">{m.svc}</TableCell>
              <TableCell><Badge variant="outline">{m.model}</Badge></TableCell>
              <TableCell className="text-right font-semibold">{ngn(m.price)}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`${m.svc} enrolled`)}>Enrol Patient</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 7. PAYMENT PROCESSING ============
export const PaymentProcessing = () => {
  const channels = [
    { name: 'Paystack', icon: CreditCard, status: 'Live', today: 1_840_000, txns: 142 },
    { name: 'Flutterwave', icon: CreditCard, status: 'Live', today: 920_000, txns: 78 },
    { name: 'Bank Transfer (GTB / Zenith)', icon: Building, status: 'Live', today: 1_280_000, txns: 34 },
    { name: 'POS Terminals (5)', icon: ScanLine, status: 'Live', today: 720_000, txns: 96 },
    { name: 'Cash', icon: Banknote, status: 'Live', today: 248_000, txns: 51 },
    { name: 'Wallet', icon: Wallet, status: 'Live', today: 1_420_000, txns: 184 },
    { name: 'NHIA Settlement', icon: ShieldCheck, status: 'Daily Batch', today: 540_000, txns: 12 },
  ];
  return (
    <Shell title="Payment Processing">
      <Section icon={<CreditCard />} title="Payment Processing Layer" desc="Multi-channel payment orchestration with verification, receipting and ledger updates." />
      <div className="grid md:grid-cols-2 gap-4">
        {channels.map(c => (
          <Card key={c.name}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><c.icon className="h-5 w-5" /></div>
                <div><h3 className="font-display font-bold">{c.name}</h3><Badge variant={c.status === 'Live' ? 'default' : 'outline'}>{c.status}</Badge></div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{ngn(c.today)}</div>
                <div className="text-xs text-muted-foreground">{c.txns} transactions</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast.success(`${c.name} reconciled`)}>Reconcile</Button>
              <Button size="sm" variant="outline" onClick={() => toast.success(`${c.name} settings opened`)}>Configure</Button>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 8. SPLIT BILLING ============
export const SplitBilling = () => {
  const splits = [
    { inv: 'INV-50231', patient: 'Adebola O.', total: 84500, nhia: 76050, wallet: 4225, cash: 4225 },
    { inv: 'INV-50225', patient: 'Halimat B.', total: 28000, nhia: 0, wallet: 18000, cash: 10000 },
    { inv: 'INV-50221', patient: 'Tunde A.', total: 65000, nhia: 52000, wallet: 13000, cash: 0 },
  ];
  return (
    <Shell title="Split Billing">
      <Section icon={<Split />} title="Split Billing Engine" desc="Split invoices across insurance, wallet, cash and installment plans with automatic reconciliation." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">NHIA</TableHead><TableHead className="text-right">Wallet</TableHead><TableHead className="text-right">Cash</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{splits.map(s => (
            <TableRow key={s.inv}>
              <TableCell className="font-mono">{s.inv}</TableCell>
              <TableCell>{s.patient}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(s.total)}</TableCell>
              <TableCell className="text-right text-sky-600">{ngn(s.nhia)}</TableCell>
              <TableCell className="text-right text-purple-600">{ngn(s.wallet)}</TableCell>
              <TableCell className="text-right text-amber-600">{ngn(s.cash)}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`${s.inv} split saved`)}>Adjust Split</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => toast.success('Installment plan created')}>+ Installment Plan</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Partial payment recorded')}>Record Partial</Button>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 9. INVOICE MANAGEMENT ============
export const InvoiceManagement = () => {
  const [open, setOpen] = useState(false);
  const invoices = [
    { id: 'INV-50231', patient: 'Adebola O.', total: 18500, status: 'Paid', date: '2026-05-28' },
    { id: 'INV-50230', patient: 'Chinwe E.', total: 7500, status: 'Paid', date: '2026-05-28' },
    { id: 'INV-50229', patient: 'Sodiq Y.', total: 25000, status: 'Pending', date: '2026-05-28' },
    { id: 'INV-50228', patient: 'Halimat B.', total: 12200, status: 'Paid', date: '2026-05-28' },
    { id: 'INV-50227', patient: 'Kelechi N.', total: 6850, status: 'Partial', date: '2026-05-28' },
    { id: 'INV-50226', patient: 'Folake A.', total: 15000, status: 'Failed', date: '2026-05-28' },
  ];
  return (
    <Shell title="Invoice Management">
      <Section icon={<FileText />} title="Invoice Management System" desc="Auto + manual invoice generation, controlled edits, approval workflow and duplicate prevention." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Invoice</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{invoices.map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-mono font-semibold">{i.id}</TableCell>
              <TableCell>{i.patient}</TableCell>
              <TableCell>{i.date}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(i.total)}</TableCell>
              <TableCell><StatusBadge status={i.status} /></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`${i.id} opened`)}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Sent to patient')}><Send className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast(`${i.id} cancellation logged`)}><XCircle className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Manual Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient</Label><Input placeholder="Search MPI..." /></div>
            <div><Label>Service</Label><Input placeholder="e.g. Therapy package" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Quantity</Label><Input type="number" defaultValue={1} /></div><div><Label>Amount (₦)</Label><Input type="number" /></div></div>
            <div><Label>Notes</Label><Textarea placeholder="Optional billing notes..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { toast.success('Invoice submitted for approval'); setOpen(false); }}>Submit for Approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 10. REFUNDS & REVERSALS ============
export const RefundsReversals = () => {
  const [open, setOpen] = useState(false);
  const requests = [
    { id: 'RFD-301', inv: 'INV-50180', patient: 'Bisi O.', amount: 18000, type: 'Partial', reason: 'Service not rendered', status: 'Pending' },
    { id: 'RFD-302', inv: 'INV-50172', patient: 'Tope A.', amount: 25000, type: 'Full', reason: 'Duplicate payment', status: 'Approved' },
    { id: 'RFD-303', inv: 'INV-50155', patient: 'Yusuf K.', amount: 4500, type: 'Partial', reason: 'Lab cancellation', status: 'Processed' },
  ];
  return (
    <Shell title="Refunds & Reversals">
      <Section icon={<RotateCcw />} title="Refund & Reversal Workflows" desc="Verified, finance-approved refunds and transaction reversals with full audit trail." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Refund Request</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{requests.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{r.id}</TableCell>
              <TableCell>{r.inv}</TableCell>
              <TableCell>{r.patient}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(r.amount)}</TableCell>
              <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
              <TableCell className="text-sm">{r.reason}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => toast.success(`${r.id} approved`)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.error(`${r.id} rejected`)}>Reject</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Refund / Reversal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice / Transaction Ref</Label><Input placeholder="INV-..." /></div>
            <div><Label>Type</Label><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>
              <SelectItem value="full">Full Refund</SelectItem><SelectItem value="partial">Partial Refund</SelectItem>
              <SelectItem value="reversal">Reversal</SelectItem><SelectItem value="duplicate">Duplicate Correction</SelectItem>
            </SelectContent></Select></div>
            <div><Label>Reason</Label><Textarea placeholder="Provide detailed reason..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { toast.success('Refund queued for verification'); setOpen(false); }}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 11. FINANCIAL NOTES ============
export const FinancialNotes = () => {
  const notes = [
    { ts: '11:02 today', author: 'Hafsat Bello · Cashier', patient: 'Tunde A.', note: 'Promised to pay outstanding ₦13,000 balance by tomorrow.' },
    { ts: '10:48', author: 'Adaeze Nwosu · Accountant', patient: 'Folake A.', note: 'NHIA rejection — switched to private billing track.' },
    { ts: 'Yesterday', author: 'Sola Ade · Finance Lead', patient: 'Sodiq Y.', note: 'Approved 3-month installment plan for addiction programme.' },
    { ts: '2d ago', author: 'Cashier B', patient: 'Bisi O.', note: 'Dispute logged: patient claims double charge on lab.' },
  ];
  return (
    <Shell title="Financial Notes">
      <Section icon={<StickyNote />} title="Financial Notes System" desc="Patient remarks, billing notes, dispute logs and account-officer comments." action={<Button onClick={() => toast.success('Note added')}><Plus className="h-4 w-4 mr-2" />Add Note</Button>} />
      <div className="space-y-3">
        {notes.map((n, i) => (
          <Card key={i}>
            <div className="flex justify-between items-start mb-2">
              <div><div className="font-semibold">{n.patient}</div><div className="text-xs text-muted-foreground">{n.author} · {n.ts}</div></div>
              <Badge variant="outline">Note</Badge>
            </div>
            <p className="text-sm">{n.note}</p>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 12. PAYMENT TRACKING ============
export const PaymentTracking = () => {
  const timeline = [
    { t: '11:24', s: 'INV-50231 paid via Wallet · ₦18,500', ok: true },
    { t: '11:18', s: 'INV-50230 paid via POS · ₦7,500', ok: true },
    { t: '11:05', s: 'INV-50229 awaiting payment · ₦25,000', ok: null },
    { t: '10:58', s: 'INV-50228 NHIA covered · ₦12,200', ok: true },
    { t: '10:42', s: 'INV-50227 partial · ₦4,000 of ₦6,850', ok: null },
    { t: '10:31', s: 'INV-50226 card declined · ₦15,000', ok: false },
  ];
  return (
    <Shell title="Payment Tracking">
      <Section icon={<Activity />} title="Payment Tracking" desc="Real-time payment status, reconciliation logs and patient payment timeline." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Successful" value="284" icon={CheckCircle2} tone="green" />
        <SummaryCard title="Pending" value="28" icon={Activity} tone="amber" />
        <SummaryCard title="Failed" value="6" icon={XCircle} tone="rose" />
        <SummaryCard title="Reconciled" value="98.6%" icon={ArrowDownRight} tone="teal" />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-4">Live Payment Timeline</h3>
        <div className="space-y-3">
          {timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${e.ok === true ? 'bg-tertiary/15 text-tertiary' : e.ok === false ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}>
                {e.ok === true ? <CheckCircle2 className="h-4 w-4" /> : e.ok === false ? <XCircle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              </div>
              <div className="flex-1"><div className="text-sm font-medium">{e.s}</div><div className="text-xs text-muted-foreground">{e.t}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============ 13. ACCOMMODATION & BED ============
export const AccommodationBilling = () => {
  const rooms = [
    { ward: 'General Ward', type: 'Shared (6 beds)', rate: 8000, occ: 28 },
    { ward: 'Female Acute Ward', type: 'Shared (4 beds)', rate: 10000, occ: 16 },
    { ward: 'Private Ward', type: 'Single', rate: 25000, occ: 8 },
    { ward: 'ICU', type: 'Critical Care', rate: 75000, occ: 4 },
    { ward: 'Long-Stay Psychiatric', type: 'Banded', rate: 18000, occ: 22 },
    { ward: 'Child & Adolescent Ward', type: 'Shared (4 beds)', rate: 12000, occ: 9 },
  ];
  const active = [
    { patient: 'Adebola O.', ward: 'Private Ward', days: 4, daily: 25000, accrued: 100000 },
    { patient: 'Halimat B.', ward: 'Female Acute', days: 7, daily: 10000, accrued: 70000 },
    { patient: 'Sodiq Y.', ward: 'Long-Stay Psych', days: 21, daily: 18000, accrued: 378000 },
  ];
  return (
    <Shell title="Accommodation & Bed">
      <Section icon={<BedDouble />} title="Accommodation & Bed Billing" desc="Daily ward charges, ICU pricing, long-term admission accrual and discharge settlement." />
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Ward Pricing</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Ward</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Rate / day</TableHead><TableHead className="text-right">Occupied</TableHead></TableRow></TableHeader>
            <TableBody>{rooms.map(r => (
              <TableRow key={r.ward}><TableCell className="font-semibold">{r.ward}</TableCell><TableCell>{r.type}</TableCell><TableCell className="text-right">{ngn(r.rate)}</TableCell><TableCell className="text-right">{r.occ}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Active Accruals</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Ward</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="text-right">Accrued</TableHead></TableRow></TableHeader>
            <TableBody>{active.map(a => (
              <TableRow key={a.patient}><TableCell>{a.patient}</TableCell><TableCell>{a.ward}</TableCell><TableCell className="text-right">{a.days}</TableCell><TableCell className="text-right font-bold">{ngn(a.accrued)}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 14. RECEIPTS ============
export const ReceiptGeneration = () => {
  const recent = [
    { rcp: 'RCP-90231', patient: 'Adebola O.', amount: 18500, channel: 'Email + SMS', sent: '11:24' },
    { rcp: 'RCP-90230', patient: 'Chinwe E.', amount: 7500, channel: 'Print + Email', sent: '11:18' },
    { rcp: 'RCP-90229', patient: 'Halimat B.', amount: 12200, channel: 'SMS', sent: '10:58' },
  ];
  return (
    <Shell title="Receipts">
      <Section icon={<Printer />} title="Receipt Generation System" desc="Digital, printable, QR-coded, email and SMS receipt delivery with full history." action={<Button onClick={() => toast.success('Test receipt sent')}><Send className="h-4 w-4 mr-2" />Send Test</Button>} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Patient</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Channel</TableHead><TableHead>Sent</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{recent.map(r => (
            <TableRow key={r.rcp}>
              <TableCell className="font-mono">{r.rcp}</TableCell>
              <TableCell>{r.patient}</TableCell>
              <TableCell className="text-right font-semibold">{ngn(r.amount)}</TableCell>
              <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
              <TableCell className="text-sm">{r.sent}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success('Downloaded')}><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Resent')}><Send className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success('QR opened')}><ScanLine className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 15. CASHIER & POS ============
export const CashierPos = () => {
  const cashiers = [
    { name: 'Hafsat Bello', shift: 'Morning 8–4', cash: 248_000, pos: 412_000, status: 'Open' },
    { name: 'Yetunde Salami', shift: 'Morning 8–4', cash: 184_000, pos: 308_000, status: 'Open' },
    { name: 'Femi Oduwole', shift: 'Afternoon 12–8', cash: 96_000, pos: 142_000, status: 'Open' },
  ];
  return (
    <Shell title="Cashier & POS">
      <Section icon={<ScanLine />} title="Cashier & POS Operations" desc="Cash register, POS terminals, shift tracking, daily cash reconciliation and offline capture." action={<Button onClick={() => toast.success('Shift opened')}><Plus className="h-4 w-4 mr-2" />Open Shift</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="POS Terminals" value="5" subtitle="all online" icon={ScanLine} tone="teal" />
        <SummaryCard title="Cashier Shifts" value="3" subtitle="open today" icon={Activity} tone="blue" />
        <SummaryCard title="Cash Collected" value={ngn(528_000)} icon={Banknote} tone="amber" />
        <SummaryCard title="POS Collected" value={ngn(862_000)} icon={CreditCard} tone="green" />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-3">Active Cashier Shifts</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Cashier</TableHead><TableHead>Shift</TableHead><TableHead className="text-right">Cash</TableHead><TableHead className="text-right">POS</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{cashiers.map(c => (
            <TableRow key={c.name}>
              <TableCell className="font-semibold">{c.name}</TableCell>
              <TableCell>{c.shift}</TableCell>
              <TableCell className="text-right">{ngn(c.cash)}</TableCell>
              <TableCell className="text-right">{ngn(c.pos)}</TableCell>
              <TableCell><Badge>{c.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toast.success(`${c.name} reconciled`)}>Reconcile</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(`${c.name} closed`)}>Close Shift</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 16. ANALYTICS ============
export const FinancialAnalytics = () => {
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  const deptRev = [
    { d: 'OPC Psychiatry', r: 28_400_000 }, { d: 'Pharmacy', r: 16_300_000 }, { d: 'Inpatient', r: 24_100_000 },
    { d: 'GMPC', r: 12_800_000 }, { d: 'Laboratory', r: 11_500_000 }, { d: 'Addiction', r: 9_200_000 },
  ];
  const max = Math.max(...deptRev.map(d => d.r));
  return (
    <Shell title="Financial Dashboards">
      <Section icon={<BarChart3 />} title="Financial Dashboards & Reports" desc="Daily, weekly and monthly revenue analytics with insurance, department and doctor breakdowns." action={
        <div className="flex gap-2">{(['day', 'week', 'month'] as const).map(v => <Button key={v} size="sm" variant={range === v ? 'default' : 'outline'} onClick={() => setRange(v)}>{v[0].toUpperCase() + v.slice(1)}</Button>)}</div>
      } />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Gross Revenue" value={ngn(118_400_000)} subtitle="MTD" icon={TrendingUp} tone="green" />
        <SummaryCard title="Net Collected" value={ngn(102_640_000)} subtitle="86.7%" icon={Banknote} tone="teal" />
        <SummaryCard title="Outstanding" value={ngn(15_760_000)} subtitle="13.3%" icon={TrendingDown} tone="rose" />
        <SummaryCard title="NHIA Reimbursed" value={ngn(18_400_000)} subtitle="MTD" icon={ShieldCheck} tone="blue" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-3">Revenue by Department (MTD)</h3>
          {deptRev.map(d => (
            <div key={d.d} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span>{d.d}</span><span className="font-semibold">{ngn(d.r)}</span></div>
              <Progress value={(d.r / max) * 100} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Insurance Performance</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Claims Approved</span><span className="font-bold text-tertiary">94.2%</span></div>
            <div className="flex justify-between"><span>Avg Settlement Time</span><span className="font-bold">21 days</span></div>
            <div className="flex justify-between"><span>Rejection Rate</span><span className="font-bold text-destructive">4.2%</span></div>
            <div className="flex justify-between"><span>Pre-Auth Pending</span><span className="font-bold text-amber-600">12</span></div>
          </div>
          <h3 className="font-display font-bold mt-5 mb-3">Top Earning Doctors</h3>
          <div className="space-y-2 text-sm">
            {[
              { n: 'Dr. Lawal (Psych)', r: 4_240_000 }, { n: 'Dr. Eze (GMPC)', r: 2_160_000 },
              { n: 'Dr. Bakare (Addiction)', r: 1_890_000 }, { n: 'Dr. Mohammed (CAP)', r: 1_420_000 },
            ].map(d => (
              <div key={d.n} className="flex justify-between p-2 rounded border"><span>{d.n}</span><span className="font-semibold">{ngn(d.r)}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 17. AUDIT ============
export const BillingAudit = () => {
  const logs = [
    { ts: '11:32 today', user: 'Hafsat Bello', action: 'Recorded POS payment ₦18,500 · INV-50231', module: 'Cashier' },
    { ts: '11:08', user: 'Adaeze Nwosu', action: 'Approved refund RFD-302 · ₦25,000', module: 'Refunds' },
    { ts: '10:42', user: 'System', action: 'Auto-invoice generated INV-50227', module: 'Service Billing' },
    { ts: '10:18', user: 'Sola Ade', action: 'Edited invoice INV-50195 amount ₦15,000→₦14,500', module: 'Invoice' },
    { ts: 'Yesterday', user: 'Finance Lead', action: 'Approved installment plan for Sodiq Y.', module: 'Split Billing' },
  ];
  return (
    <Shell title="Audit & Compliance">
      <Section icon={<ScrollText />} title="Audit & Compliance Layer" desc="Immutable transaction logs, modification history, approval chains and compliance reporting." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead></TableRow></TableHeader>
          <TableBody>{logs.map((l, i) => (
            <TableRow key={i}><TableCell className="text-sm">{l.ts}</TableCell><TableCell className="font-semibold">{l.user}</TableCell><TableCell>{l.action}</TableCell><TableCell><Badge variant="outline">{l.module}</Badge></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 18. AI INSIGHTS ============
export const AiInsights = () => {
  const insights = [
    { i: 'Revenue Forecast (next 30d)', v: ngn(132_000_000), tone: 'green', detail: '+11.4% vs prior 30d. Driven by addiction programme renewals.' },
    { i: 'Predicted NHIA Rejections', v: '6 invoices', tone: 'rose', detail: 'Missing pre-auth or coding mismatch detected.' },
    { i: 'High-Risk Debtors', v: '14 patients', tone: 'amber', detail: 'Outstanding > 30 days with low contact response.' },
    { i: 'Cash Flow Optimization', v: '+₦2.4M/mo', tone: 'teal', detail: 'Recommend tightening installment terms on therapy packages.' },
    { i: 'Payment Delay Prediction', v: '18% of pending', tone: 'amber', detail: '38 invoices likely to remain unpaid past 48h.' },
  ];
  return (
    <Shell title="AI Insights">
      <Section icon={<Sparkles />} title="AI Financial Insights" desc="Forecasting, risk scoring and optimization recommendations powered by ML." action={<Button onClick={() => toast.success('Models retrained on latest data')}><RefreshCw className="h-4 w-4 mr-2" />Retrain</Button>} />
      <div className="grid md:grid-cols-2 gap-4">
        {insights.map(x => (
          <Card key={x.i}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-display font-bold text-base">{x.i}</h3>
              <Badge variant={x.tone === 'green' || x.tone === 'teal' ? 'default' : 'destructive'}>{x.v}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{x.detail}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => toast.success('Action plan generated')}>View Action Plan</Button>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

// ============ 19. INTEGRATION ============
export const HmsIntegration = () => {
  const systems = [
    { s: 'Clinical EMR', status: 'Synced', last: 'just now' },
    { s: 'Appointment & Scheduling', status: 'Synced', last: '2m ago' },
    { s: 'Pharmacy Module', status: 'Synced', last: '4m ago' },
    { s: 'Laboratory Module', status: 'Synced', last: '1m ago' },
    { s: 'Radiology', status: 'Pending', last: '18m ago' },
    { s: 'Ward / IPD Management', status: 'Synced', last: '6m ago' },
    { s: 'Telemedicine', status: 'Synced', last: '3m ago' },
    { s: 'Patient Portal Wallet', status: 'Synced', last: 'just now' },
    { s: 'NHIA / NHIS Platform', status: 'Daily Batch', last: '06:00' },
    { s: 'Legacy EMR Financial Data', status: 'Migrating', last: '32m ago' },
  ];
  return (
    <Shell title="HMS + EMR Integration">
      <Section icon={<Plug />} title="HMS + EMR Integration" desc="Live integration status with every clinical and operational module across the platform." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>System</TableHead><TableHead>Status</TableHead><TableHead>Last Sync</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>{systems.map(s => (
            <TableRow key={s.s}>
              <TableCell className="font-semibold">{s.s}</TableCell>
              <TableCell><StatusBadge status={s.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.last}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => toast.success(`${s.s} re-synced`)}><RefreshCw className="h-3 w-3" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 20. OFFLINE ============
export const OfflineMode = () => {
  const [enabled, setEnabled] = useState(true);
  return (
    <Shell title="Offline / Low-Bandwidth">
      <Section icon={<Wifi />} title="Offline & Low-Bandwidth Mode" desc="Capture invoices, payments and receipts when offline; sync automatically when network restores." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-display font-bold">Offline Billing</h3><p className="text-sm text-muted-foreground">Local cache for cashiers and POS</p></div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <ul className="space-y-2 text-sm">
            {['Local invoice capture', 'Cached patient wallets', 'Offline receipt printing', 'Auto-sync when online', 'SMS payment confirmations', 'Conflict resolution engine'].map(x => (
              <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{x}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="font-display font-bold mb-3">Pending Sync Queue</h3>
          <div className="space-y-2 text-sm">
            {[
              { n: 'INV-50221', dev: 'POS-03', t: '2h ago' },
              { n: 'INV-50219', dev: 'Cashier B', t: '4h ago' },
              { n: 'RCP-90220', dev: 'POS-02', t: '5h ago' },
            ].map(q => (
              <div key={q.n} className="flex justify-between p-2 rounded border">
                <div><div className="font-semibold">{q.n}</div><div className="text-xs text-muted-foreground">{q.dev} · {q.t}</div></div>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${q.n} synced`)}>Sync</Button>
              </div>
            ))}
          </div>
          <Button className="w-full mt-3" onClick={() => toast.success('Full sync triggered')}><RefreshCw className="h-4 w-4 mr-2" />Sync All</Button>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 21. ENTERPRISE DEPLOYMENT ============
export const EnterpriseDeployment = () => (
  <Shell title="Enterprise Deployment">
    <Section icon={<CloudCog />} title="Enterprise Deployment Model" desc="Multi-site hospital scalability, central finance control, role-based access and hybrid cloud." />
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <h3 className="font-display font-bold mb-3">Deployment Architecture</h3>
        <ul className="space-y-2 text-sm">
          {['Multi-hospital tenant support', 'Central finance control (Super Admin)', 'Role-based financial access', 'Cloud + on-prem hybrid', 'Real-time inter-department sync', 'Disaster recovery & backup', 'Geo-redundant data centres'].map(x => (
            <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-tertiary" />{x}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="font-display font-bold mb-3">Sites Connected</h3>
        <div className="space-y-2 text-sm">
          {[
            { s: 'GFA HMS Main Campus, Abeokuta', st: 'Active' },
            { s: 'GFA HMS Outreach — Ijebu Ode', st: 'Active' },
            { s: 'GFA HMS Community Clinic — Sagamu', st: 'Active' },
            { s: 'DR Site — Lagos', st: 'Standby' },
          ].map(s => (
            <div key={s.s} className="flex justify-between p-2 rounded border">
              <span>{s.s}</span><Badge variant={s.st === 'Active' ? 'default' : 'outline'}>{s.st}</Badge>
            </div>
          ))}
        </div>
        <Button className="w-full mt-3" onClick={() => toast.success('Failover test successful')}>Run Failover Test</Button>
      </Card>
    </div>
  </Shell>
);
