import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invoices } from '@/data/invoiceData';
import { formatCurrency } from '@/data/dummyData';
import { departmentRevenue, staffRevenueRows, paymentRecords, cashFlowDetails, revenueTrendDaily, revenueTrendMonthly } from '@/data/workflowData';
import { dischargeBillRecords, type DischargeBillRecord } from '@/data/dischargeBillingData';
import SimpleBarChart from '@/components/workflow/SimpleBarChart';
import AttendancePanel from '@/components/workflow/AttendancePanel';
import LeaveRequestPanel from '@/components/workflow/LeaveRequestPanel';
import ProfilePanel from '@/components/workflow/ProfilePanel';
import { Activity, DollarSign, Receipt, Wallet, FileText, BarChart3, Building2, Users, Banknote, TrendingUp, ClipboardList, Calendar, CalendarDays, UserCircle, Download, BedDouble, ShieldCheck, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

const financeNav = [
  { label: 'Overview', path: '/dashboard/finance', icon: <Activity className="h-4 w-4" /> },
  { label: 'Revenue Analytics', path: '/dashboard/finance/revenue', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Invoices', path: '/dashboard/finance/invoices', icon: <FileText className="h-4 w-4" /> },
  { label: 'Payments', path: '/dashboard/finance/payments', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Discharge & Billing', path: '/dashboard/finance/discharge-billing', icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Accommodation Ledger', path: '/dashboard/admission/accommodation', icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Department Revenue', path: '/dashboard/finance/departments', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Staff Revenue', path: '/dashboard/finance/staff', icon: <Users className="h-4 w-4" /> },
  { label: 'Cash Flow', path: '/dashboard/finance/cashflow', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Reports', path: '/dashboard/finance/reports', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Attendance', path: '/dashboard/finance/attendance', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Leave Request', path: '/dashboard/finance/leave', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Profile', path: '/dashboard/finance/profile', icon: <UserCircle className="h-4 w-4" /> },
];

const totalRevenue = 2_500_000_000;
const collectedToday = invoices.filter(i => i.date === '2026-03-25').reduce((s, i) => s + i.amountPaid, 0) + 6_400_000;
const totalPending = invoices.reduce((s, i) => s + i.balance, 0);

const overviewCards = (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle="Year-to-date" icon={DollarSign} />
    <SummaryCard title="Cash Collected Today" value={formatCurrency(collectedToday)} subtitle="↑ 12% vs yesterday" icon={Receipt} />
    <SummaryCard title="Pending Payments" value={formatCurrency(totalPending)} subtitle="Across all invoices" icon={Wallet} />
    <SummaryCard title="Total Invoices" value={String(invoices.length)} subtitle="This billing cycle" icon={FileText} />
  </div>
);

export const FinanceOverview = () => (
  <DashboardLayout navItems={financeNav} title="Finance Dashboard (CFO)">
    {overviewCards}
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Revenue Trend (Daily)</h3>
        <SimpleBarChart data={revenueTrendDaily} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Recent Invoices</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.slice(0, 5).map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium text-xs">{inv.invoiceId}</TableCell>
                <TableCell>{inv.patientName}</TableCell>
                <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                <TableCell><StatusBadge status={inv.paymentStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </DashboardLayout>
);

export const FinanceRevenue = () => (
  <DashboardLayout navItems={financeNav} title="Revenue Analytics">
    {overviewCards}
    <div className="grid lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Daily Revenue (This Week)</h3>
        <SimpleBarChart data={revenueTrendDaily} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Monthly Revenue (YTD)</h3>
        <SimpleBarChart data={revenueTrendMonthly} />
      </div>
    </div>
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display font-semibold mb-3">Revenue by Department</h3>
      <SimpleBarChart data={departmentRevenue.map(d => ({ label: d.department.split(' ')[0], amount: d.revenue }))} height={200} />
    </div>
  </DashboardLayout>
);

export const FinanceInvoices = () => {
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('card');
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  return (
    <DashboardLayout navItems={financeNav} title="Invoice Tracking">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Invoices" value={String(invoices.length)} icon={FileText} />
        <SummaryCard title="Revenue Collected" value={formatCurrency(totalCollected)} icon={DollarSign} />
        <SummaryCard title="Outstanding" value={formatCurrency(totalPending)} icon={Wallet} />
        <SummaryCard title="Cancelled" value={String(invoices.filter(i => i.paymentStatus === 'Cancelled').length)} icon={Receipt} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          {['all', 'paid', 'pending', 'partial', 'cancelled'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>NHIS Used (₦)</TableHead>
                      <TableHead>NHIS Status</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.filter(i => tab === 'all' || i.paymentStatus.toLowerCase() === tab).map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-xs">{inv.invoiceId}</TableCell>
                        <TableCell>{inv.patientName}</TableCell>
                        <TableCell>{inv.department}</TableCell>
                        <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell>{formatCurrency(inv.amountPaid)}</TableCell>
                        <TableCell>{formatCurrency(inv.balance)}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{inv.processedBy ?? '—'}</div>
                          {inv.processedByRole && <div className="text-muted-foreground">{inv.processedByRole}</div>}
                        </TableCell>
                        <TableCell>{inv.nhisAmountUsed ? formatCurrency(inv.nhisAmountUsed) : '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${inv.nhisStatus === 'Used' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-muted text-muted-foreground ring-border'}`}>
                            {inv.nhisStatus === 'Used' ? <ShieldCheck className="h-3 w-3" /> : null}
                            {inv.nhisStatus ?? 'Not Used'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{inv.paymentChannel ?? '—'}</TableCell>
                        <TableCell><StatusBadge status={inv.paymentStatus} /></TableCell>
                        <TableCell>
                          {inv.balance > 0 && inv.paymentStatus !== 'Cancelled' && (
                            <Button size="sm" onClick={() => setPayOpen(true)}>Record Payment</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount (₦)</Label><Input defaultValue="50000" /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="remita">Remita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setPayOpen(false)}>Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const FinancePayments = () => {
  const cash = paymentRecords.filter(p => p.method === 'Cash');
  const transfer = paymentRecords.filter(p => p.method === 'Transfer');
  const online = paymentRecords.filter(p => p.method === 'Card' || p.method === 'Remita' || p.method === 'Online');
  const nhis = paymentRecords.filter(p => p.method === 'NHIS');
  const total = paymentRecords.reduce((s, p) => s + p.amount, 0);
  const map: Record<string, typeof paymentRecords> = { all: paymentRecords, cash, transfer, online, nhis };

  return (
    <DashboardLayout navItems={financeNav} title="Payments">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard title="Total Payments" value={formatCurrency(total)} icon={DollarSign} />
        <SummaryCard title="Cash" value={formatCurrency(cash.reduce((s, p) => s + p.amount, 0))} icon={Banknote} />
        <SummaryCard title="Transfer" value={formatCurrency(transfer.reduce((s, p) => s + p.amount, 0))} icon={Wallet} />
        <SummaryCard title="Online" value={formatCurrency(online.reduce((s, p) => s + p.amount, 0))} icon={Receipt} />
        <SummaryCard title="NHIS" value={formatCurrency(nhis.reduce((s, p) => s + p.amount, 0))} icon={ShieldCheck} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cash">Cash</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="nhis">NHIS</TabsTrigger>
          </TabsList>
          {(['all', 'cash', 'transfer', 'online', 'nhis'] as const).map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Channel</TableHead><TableHead>Processed By</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {map[tab].map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.patient}</TableCell>
                      <TableCell className="text-xs">{p.invoiceId}</TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${
                          p.method === 'Cash' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                          p.method === 'Transfer' ? 'bg-sky-50 text-sky-700 ring-sky-200' :
                          p.method === 'NHIS' ? 'bg-violet-50 text-violet-700 ring-violet-200' :
                          'bg-amber-50 text-amber-700 ring-amber-200'
                        }`}>{p.method}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.channel ?? '—'}</TableCell>
                      <TableCell className="font-medium">{p.receivedBy}</TableCell>
                      <TableCell>{p.time}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export const FinanceDepartments = () => (
  <DashboardLayout navItems={financeNav} title="Department Revenue">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Total Departments" value={String(departmentRevenue.length)} icon={Building2} />
      <SummaryCard title="Top Earner" value="Surgery" subtitle={formatCurrency(45_000_000)} icon={TrendingUp} />
      <SummaryCard title="Total Services Rendered" value={String(departmentRevenue.reduce((s, d) => s + d.services, 0))} icon={Activity} />
      <SummaryCard title="Combined Revenue" value={formatCurrency(departmentRevenue.reduce((s, d) => s + d.revenue, 0))} icon={DollarSign} />
    </div>
    <div className="bg-card rounded-xl border p-4">
      <Table>
        <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Total Revenue</TableHead><TableHead>No. of Services</TableHead><TableHead>Top Service</TableHead></TableRow></TableHeader>
        <TableBody>
          {departmentRevenue.map(d => (
            <TableRow key={d.department}>
              <TableCell className="font-medium">{d.department}</TableCell>
              <TableCell>{formatCurrency(d.revenue)}</TableCell>
              <TableCell>{d.services}</TableCell>
              <TableCell>{d.topService}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export const FinanceStaffRevenue = () => (
  <DashboardLayout navItems={financeNav} title="Staff Revenue Tracking">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Tracked Staff" value={String(staffRevenueRows.length)} icon={Users} />
      <SummaryCard title="Top Performer" value="Dr. Adewale" subtitle={formatCurrency(12_400_000)} icon={TrendingUp} />
      <SummaryCard title="Invoices Created" value={String(staffRevenueRows.reduce((s, r) => s + r.invoicesCreated, 0))} icon={FileText} />
      <SummaryCard title="Combined Revenue" value={formatCurrency(staffRevenueRows.reduce((s, r) => s + r.totalRevenue, 0))} icon={DollarSign} />
    </div>
    <div className="bg-card rounded-xl border p-4 overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Invoices</TableHead><TableHead>Revenue</TableHead><TableHead>Payment Mix</TableHead></TableRow></TableHeader>
        <TableBody>
          {staffRevenueRows.map(r => (
            <TableRow key={r.staffName}>
              <TableCell className="font-medium">{r.staffName}</TableCell>
              <TableCell>{r.role}</TableCell>
              <TableCell>{r.invoicesCreated}</TableCell>
              <TableCell>{formatCurrency(r.totalRevenue)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.paymentMix}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export const FinanceCashFlow = () => {
  const [open, setOpen] = useState<typeof cashFlowDetails[0] | null>(null);
  const cashInHand = 1_240_000;
  const banked = 8_650_000;
  const collectionToday = cashFlowDetails.reduce((s, c) => s + c.amount, 0);
  return (
    <DashboardLayout navItems={financeNav} title="Cash Flow">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Cash in Hand" value={formatCurrency(cashInHand)} subtitle="Pending banking" icon={Banknote} />
        <SummaryCard title="Banked Amount" value={formatCurrency(banked)} subtitle="Today" icon={Wallet} />
        <SummaryCard title="Daily Collection" value={formatCurrency(collectionToday)} subtitle="All staff" icon={TrendingUp} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Cash Collection by Staff</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Time</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {cashFlowDetails.map((c, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{c.staffName}</TableCell>
                <TableCell>{formatCurrency(c.amount)}</TableCell>
                <TableCell>{c.method}</TableCell>
                <TableCell>{c.time}</TableCell>
                <TableCell><Button variant="outline" size="sm" onClick={() => setOpen(c)}>Details</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Cash Details</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Staff Name:</span> <span className="font-medium">{open.staffName}</span></p>
              <p><span className="text-muted-foreground">Amount Collected:</span> <span className="font-medium">{formatCurrency(open.amount)}</span></p>
              <p><span className="text-muted-foreground">Payment Method:</span> {open.method}</p>
              <p><span className="text-muted-foreground">Time:</span> {open.time}</p>
              <Button className="w-full mt-3" onClick={() => setOpen(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const FinanceReports = () => (
  <DashboardLayout navItems={financeNav} title="Reports">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Available Reports" value="12" icon={ClipboardList} />
      <SummaryCard title="Revenue (YTD)" value={formatCurrency(totalRevenue)} icon={DollarSign} />
      <SummaryCard title="Outstanding" value={formatCurrency(totalPending)} icon={Wallet} />
      <SummaryCard title="Last Export" value="Today, 09:14 AM" icon={Download} />
    </div>
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {['Daily Revenue Summary', 'Monthly Department Report', 'Outstanding Invoices', 'Staff Revenue Report', 'Cash vs Online Mix', 'NHIS vs Private Mix'].map(r => (
        <div key={r} className="bg-card rounded-xl border p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{r}</p>
            <p className="text-xs text-muted-foreground">Generated daily • Q1 2026</p>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      ))}
    </div>
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display font-semibold mb-3">Revenue Summary</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Revenue</TableHead><TableHead>Services</TableHead></TableRow></TableHeader>
        <TableBody>
          {departmentRevenue.slice(0, 5).map(d => (
            <TableRow key={d.department}><TableCell>{d.department}</TableCell><TableCell>{formatCurrency(d.revenue)}</TableCell><TableCell>{d.services}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export const FinanceAttendance = () => (
  <DashboardLayout navItems={financeNav} title="My Attendance">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Days Present (Apr)" value="22" icon={Calendar} />
      <SummaryCard title="Days Absent" value="1" icon={Calendar} />
      <SummaryCard title="Punctuality" value="95%" icon={TrendingUp} />
    </div>
    <AttendancePanel />
  </DashboardLayout>
);

export const FinanceLeave = () => (
  <DashboardLayout navItems={financeNav} title="Leave Request">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Annual Leave Balance" value="14 days" icon={CalendarDays} />
      <SummaryCard title="Pending Requests" value="0" icon={CalendarDays} />
      <SummaryCard title="Approved (YTD)" value="6 days" icon={CalendarDays} />
    </div>
    <LeaveRequestPanel staffName="Mrs. Adebimpe Lawal" />
  </DashboardLayout>
);

export const FinanceProfile = () => (
  <DashboardLayout navItems={financeNav} title="My Profile">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Role" value="Director, Finance" icon={UserCircle} />
      <SummaryCard title="Years of Service" value="35 yrs" icon={Activity} />
      <SummaryCard title="Pending Requests" value="0" icon={ClipboardList} />
    </div>
    <ProfilePanel />
  </DashboardLayout>
);

// =====================================================================
// Patient Billing & Discharge Management (Finance > Discharge & Billing)
// =====================================================================
const dischargeStatusTone = (s: DischargeBillRecord['status']): string => {
  switch (s) {
    case 'Fully Paid':            return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'Partially Paid':        return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'Discharged (Not Paid)': return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'Unpaid':                return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
};

export const FinanceDischargeBilling = () => {
  const [view, setView] = useState<DischargeBillRecord | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'online' | 'nhis'>('cash');

  const total = dischargeBillRecords.length;
  const discharged = dischargeBillRecords.filter(r => r.dischargeStatus === 'Discharged').length;
  const fullyPaid = dischargeBillRecords.filter(r => r.status === 'Fully Paid').length;
  const owingAmount = dischargeBillRecords.reduce((s, r) => s + r.balance, 0);

  const tabs: { value: string; label: string; filter: (r: DischargeBillRecord) => boolean }[] = [
    { value: 'all',        label: 'All Patients',  filter: () => true },
    { value: 'discharged', label: 'Discharged',    filter: r => r.dischargeStatus === 'Discharged' },
    { value: 'paid',       label: 'Fully Paid',    filter: r => r.status === 'Fully Paid' },
    { value: 'owing',      label: 'Owing',         filter: r => r.balance > 0 },
  ];

  const openView = (r: DischargeBillRecord) => { setView(r); setPayAmount(String(r.balance)); };
  const handlePay = () => { setPayOpen(false); setView(null); };

  return (
    <DashboardLayout navItems={financeNav} title="Patient Billing & Discharge Management">
      {/* Intro banner */}
      <div className="mb-6 rounded-2xl p-5 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <BedDouble className="h-6 w-6 mt-0.5 opacity-90" />
          <div>
            <h2 className="font-display text-xl font-bold">Discharge &amp; Billing Control Centre</h2>
            <p className="text-sm opacity-90 mt-1 max-w-3xl">
              Track every patient bill from admission through discharge. See exactly how each bill was calculated,
              who handled the patient, what NHIS covered, and which patients were discharged with outstanding balances.
            </p>
          </div>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Patients" value={String(total)} subtitle="In billing window" icon={Users} />
        <SummaryCard title="Discharged Patients" value={String(discharged)} subtitle="Cleared from ward" icon={CheckCircle2} />
        <SummaryCard title="Fully Paid" value={String(fullyPaid)} subtitle="Zero balance" icon={ShieldCheck} />
        <SummaryCard title="Outstanding Payments" value={formatCurrency(owingAmount)} subtitle="Across all patients" icon={AlertTriangle} />
      </div>

      {/* Table with tabs */}
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap">
            {tabs.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
          </TabsList>
          {tabs.map(t => (
            <TabsContent key={t.value} value={t.value}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Services Rendered</TableHead>
                      <TableHead>Staff Handled</TableHead>
                      <TableHead>Total Bill</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dischargeBillRecords.filter(t.filter).map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{r.patientName}</div>
                          <div className="text-[11px] text-muted-foreground">{r.hospitalId}</div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={r.diagnosis}>{r.diagnosis}</TableCell>
                        <TableCell className="text-xs">{r.department}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {r.services.slice(0, 2).map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{s.name}</span>
                            ))}
                            {r.services.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">+{r.services.length - 2} more</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{r.staffHandled}</div>
                          <div className="text-muted-foreground">{r.staffRole}</div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(r.totalBill)}</TableCell>
                        <TableCell className="text-emerald-700">{formatCurrency(r.totalPaid)}</TableCell>
                        <TableCell className={r.balance > 0 ? 'text-rose-700 font-semibold' : ''}>{formatCurrency(r.balance)}</TableCell>
                        <TableCell className="text-xs">{r.paymentChannel ?? '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${dischargeStatusTone(r.status)}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openView(r)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Bill
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* View Bill Modal */}
      <Dialog open={!!view} onOpenChange={() => { setView(null); setPayOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Patient Bill Breakdown</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-muted/40">
                <div><span className="text-muted-foreground">Patient:</span> <p className="font-semibold text-foreground">{view.patientName}</p></div>
                <div><span className="text-muted-foreground">Hospital ID:</span> <p className="font-medium text-foreground">{view.hospitalId}</p></div>
                <div><span className="text-muted-foreground">Department:</span> <p className="font-medium text-foreground">{view.department}</p></div>
                <div><span className="text-muted-foreground">Ward:</span> <p className="font-medium text-foreground">{view.ward ?? 'Outpatient'}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Treatment / Diagnosis:</span> <p className="font-medium text-foreground">{view.diagnosis}</p></div>
                <div><span className="text-muted-foreground">Handled by:</span> <p className="font-medium text-foreground">{view.staffHandled} <span className="text-xs text-muted-foreground">({view.staffRole})</span></p></div>
                <div><span className="text-muted-foreground">Status:</span>
                  <p><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${dischargeStatusTone(view.status)}`}>{view.status}</span></p>
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Services Rendered</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {view.services.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(s.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-semibold text-foreground">{formatCurrency(view.totalBill)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">NHIS Coverage</span><span className="font-medium text-violet-700">{view.nhisCoverage > 0 ? formatCurrency(view.nhisCoverage) : '— Not used'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-semibold text-emerald-700">{formatCurrency(view.totalPaid)}</span></div>
                <div className="flex justify-between border-t pt-1.5"><span className="text-muted-foreground">Balance</span><span className={`font-bold ${view.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(view.balance)}</span></div>
              </div>

              {/* Payment action */}
              {view.balance > 0 && !payOpen && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setPayOpen(true)}>Pay Remaining Balance</Button>
                  <Button variant="outline" className="flex-1" onClick={handlePay}>Mark as Paid</Button>
                </div>
              )}
              {view.balance > 0 && payOpen && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
                  <h4 className="text-sm font-semibold text-foreground">Record Payment</h4>
                  <div><Label>Amount (₦)</Label><Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                        <SelectItem value="online">Online (Card / Remita)</SelectItem>
                        <SelectItem value="nhis">NHIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handlePay}>Confirm Payment</Button>
                    <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {view.balance === 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> This patient bill is fully settled.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
