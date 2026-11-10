import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { LoadingButton } from '@/components/LoadingButton';
import { DbBootGate } from '@/components/DbBootGate';
import { SummaryCardsSkeleton, TableSkeleton, CardGridSkeleton } from '@/components/DataSkeletons';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/dummyData';
import {
  statusTone,
  type PaymentChannel, type PaymentStatus,
} from '@/data/billingData';
import { useBillingStore } from '@/contexts/BillingStore';
import { createVisitWithInvoice } from '@/lib/billing-actions';
import {
  Receipt, CreditCard, Smartphone, Banknote, Send, ShieldAlert, Lock, Unlock,
  RefreshCw, AlertTriangle, CheckCircle2, Hash, Building2, History,
  LayoutDashboard, ClipboardCheck, Stethoscope, FileText, Search,
} from 'lucide-react';
import { toast } from 'sonner';

// Sidebars per role with billing nav
const billingNav = [
  { label: 'Billing Overview', path: '/billing', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Visits & Invoices', path: '/billing/visits', icon: <FileText className="h-4 w-4" /> },
  { label: 'Multi-Channel Pay', path: '/billing/channels', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'POS Terminal', path: '/billing/pos', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Reconciliation', path: '/billing/reconciliation', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Consultation Gate', path: '/billing/gate', icon: <Lock className="h-4 w-4" /> },
  { label: 'Audit Trail', path: '/billing/audit', icon: <History className="h-4 w-4" /> },
];

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user } = useAuth();
  const role = user?.role ?? 'cashier';
  const fullNav = [
    { label: 'My Console', path: `/dashboard/${role}`, icon: <LayoutDashboard className="h-4 w-4" /> },
    ...billingNav,
  ];
  return <DashboardLayout title={title} navItems={fullNav as any}><DbBootGate>{children}</DbBootGate></DashboardLayout>;
};

const StatusPill = ({ status }: { status: PaymentStatus }) => (
  <span className={statusTone(status)}>{status}</span>
);

// ============================================================
// 1. BILLING OVERVIEW
// ============================================================
export const BillingOverview = () => {
  const { visits, invoices: billingInvoices, txns: billingTxns } = useBillingStore();
  const totalInvoiced = billingInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = billingInvoices.reduce((s, i) => s + i.amountPaid, 0);
  const unpaid = billingInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PENDING').length;
  const failed = billingInvoices.filter(i => i.status === 'FAILED').length;
  const overrides = visits.filter(v => v.emergencyOverride).length;

  return (
    <Page title="Billing Initiation Overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Today's Visits" value={String(visits.length)} icon={Stethoscope} subtitle="Auto-billed" />
        <SummaryCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={Receipt} subtitle="Auto-generated" />
        <SummaryCard title="Collected" value={formatCurrency(totalPaid)} icon={Banknote} subtitle="All channels" />
        <SummaryCard title="Unpaid / Pending" value={String(unpaid)} icon={AlertTriangle} subtitle="Consultation locked" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="hms-section p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="font-display font-semibold">Emergency Overrides</h3>
          </div>
          <p className="text-3xl font-bold font-display">{overrides}</p>
          <p className="text-xs text-muted-foreground mt-1">Doctor-bypassed payments. All flagged for finance review.</p>
        </div>
        <div className="hms-section p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-5 w-5 text-sky-600" />
            <h3 className="font-display font-semibold">Reconciliation Health</h3>
          </div>
          <p className="text-3xl font-bold font-display">{billingTxns.filter(t => t.matched).length}/{billingTxns.length}</p>
          <p className="text-xs text-muted-foreground mt-1">POS ↔ HMS ↔ Bank matched today</p>
        </div>
        <div className="hms-section p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h3 className="font-display font-semibold">Anti-Leakage Status</h3>
          </div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-sm">Manual mark-as-paid disabled</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-sm">Invoice-first rule enforced</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-sm">All channels logged</span></div>
        </div>
      </div>

      <div className="hms-section p-5">
        <h3 className="font-display font-semibold mb-3">Recent Auto-Generated Invoices</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Visit</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Department</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-left p-3">Consultation</th></tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No visits today. Create one from Visits &amp; Invoices.</td></tr>
              ) : visits.map(v => (
                <tr key={v.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{v.visitCode}</td>
                  <td className="p-3 font-medium">{v.patientName}<div className="text-xs text-muted-foreground">{v.hospitalId}</div></td>
                  <td className="p-3 text-xs">{v.department}<div className="text-muted-foreground">{v.type}</div></td>
                  <td className="p-3 font-semibold">{formatCurrency(v.consultationFee)}</td>
                  <td className="p-3"><StatusPill status={v.paymentStatus} /></td>
                  <td className="p-3">
                    {v.consultationUnlocked
                      ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><Unlock className="h-3 w-3" /> Unlocked{v.emergencyOverride ? ' (Override)' : ''}</span>
                      : <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-medium"><Lock className="h-3 w-3" /> Locked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
};

// ============================================================
// 2. VISITS & AUTO-INVOICES
// ============================================================
export const VisitsInvoices = () => {
  const { invoices: billingInvoices, visits, resendPayLink } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient: '', department: 'Internal Medicine', type: 'OPD', priority: 'Routine', fee: '10000' });

  const create = async () => {
    if (!form.patient) {
      notify.error('visit-create', 'Patient name is required');
      return;
    }
    await run(
      'visit-create',
      `Creating visit for ${form.patient}…`,
      () => createVisitWithInvoice({
        patientName: form.patient,
        department: form.department,
        type: form.type as 'OPD' | 'Surgery' | 'Maternity' | 'Pediatric' | 'Emergency',
        triagePriority: form.priority as 'Routine' | 'Urgent' | 'Emergency',
        amount: Number(form.fee),
        source: 'Records',
      }),
      ({ visit, invoice }) => `Visit ${visit.visitCode} created. Invoice ${invoice.invoiceId} for ${formatCurrency(invoice.amount)} — payment channels active.`,
    );
    setOpen(false);
  };

  return (
    <Page title="Visits & Auto-Generated Invoices">
      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div>
          <h3 className="font-display font-semibold">Strict Rule: Visit → Invoice → Payment → Consultation</h3>
          <p className="text-xs text-muted-foreground mt-1">Every new visit auto-generates an invoice. No manual invoice creation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Stethoscope className="h-4 w-4 mr-1" /> New Visit (Auto-Bill)</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Visit & Trigger Auto-Billing</DialogTitle>
              <DialogDescription>An invoice will be generated immediately and all payment channels activated.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div><Label>Patient (search by name / NIN / phone)</Label><Input value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} placeholder="e.g. Adebayo Ogundimu" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Maternity">Maternity</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Visit Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Maternity">Maternity</SelectItem>
                      <SelectItem value="Pediatric">Pediatric</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Triage Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Consultation Fee (₦)</Label><Input type="number" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} /></div>
              </div>
              <div className="rounded-lg bg-sky-50 ring-1 ring-sky-200 p-3 text-xs text-sky-900">
                <b>What happens next:</b> Invoice auto-generated → SMS pay link sent → POS / USSD / Bank transfer / Card all activated → Doctor access stays LOCKED until payment confirmed.
              </div>
            </div>
            <DialogFooter><LoadingButton loading={isBusy('visit-create')} loadingText="Creating visit…" onClick={create}>Create Visit & Generate Invoice</LoadingButton></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {billingInvoices.length === 0 && (
          <div className="col-span-full hms-section p-8 text-center text-muted-foreground text-sm">
            No invoices yet. Use <b>New Visit (Auto-Bill)</b> to create a visit and invoice.
          </div>
        )}
        {billingInvoices.map(inv => {
          const v = visits.find(x => x.invoiceId === inv.invoiceId);
          return (
            <div key={inv.id} className="hms-section p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{inv.invoiceId}</p>
                  <h4 className="font-display font-semibold">{inv.patientName}</h4>
                  <p className="text-xs text-muted-foreground">{inv.hospitalId}</p>
                </div>
                <StatusPill status={inv.status} />
              </div>
              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Visit:</span><span className="font-mono text-xs">{inv.visitCode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span>{inv.department}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="font-semibold">{formatCurrency(inv.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid:</span><span className="text-emerald-600">{formatCurrency(inv.amountPaid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance:</span><span className="text-rose-600 font-semibold">{formatCurrency(inv.balance)}</span></div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                {inv.channelsActive.slice(0, 4).map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">{c}</span>
                ))}
                {inv.channelsActive.length > 4 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">+{inv.channelsActive.length - 4}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                {v?.consultationUnlocked
                  ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><Unlock className="h-3 w-3" /> Doctor Unlocked</span>
                  : <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-medium"><Lock className="h-3 w-3" /> Doctor Locked</span>}
                <LoadingButton size="sm" variant="outline" loading={isBusy(`resend-${inv.invoiceId}`)} loadingText="Sending…" onClick={() => run(
                  `resend-${inv.invoiceId}`,
                  `Sending pay link to ${inv.phone}…`,
                  () => { resendPayLink(inv.invoiceId); return { ok: true as const }; },
                  () => `SMS pay link re-sent to ${inv.phone} for invoice ${inv.invoiceId}.`,
                )}><Send className="h-3 w-3 mr-1" /> Resend</LoadingButton>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
};

// ============================================================
// 3. MULTI-CHANNEL PAYMENT PANEL
// ============================================================
export const MultiChannelPay = () => {
  const navigate = useNavigate();
  const { invoices: billingInvoices, resendPayLink } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const [selected, setSelected] = useState(billingInvoices.find(i => i.status === 'UNPAID')?.invoiceId ?? billingInvoices[0]?.invoiceId ?? '');
  const inv = billingInvoices.find(i => i.invoiceId === selected);

  if (!inv) {
    return (
      <Page title="Multi-Channel Payment Activation">
        <div className="hms-section p-8 text-center text-muted-foreground">
          <p className="mb-3">No invoices available for payment.</p>
          <Button variant="outline" onClick={() => navigate('/billing/visits')}>Create a visit &amp; invoice</Button>
        </div>
      </Page>
    );
  }

  const channelAction = async (ch: PaymentChannel, cta: string) => {
    const key = `channel-${inv.invoiceId}-${cta}`;
    switch (cta) {
      case 'Open POS Terminal':
      case 'Log Cash':
        notify.loading(key, `Opening POS for ${inv.invoiceId}…`);
        await new Promise(r => setTimeout(r, 80));
        notify.success(key, `POS terminal ready for ${inv.patientName} (${formatCurrency(inv.balance)} due)`);
        navigate('/billing/pos');
        break;
      case 'Re-send SMS':
        await run(
          key,
          `Re-sending SMS to ${inv.phone}…`,
          () => { resendPayLink(inv.invoiceId); return { ok: true as const }; },
          () => `Pay link SMS sent to ${inv.phone} for invoice ${inv.invoiceId}.`,
        );
        break;
      case 'Copy Account':
        notify.loading(key, 'Copying virtual account…');
        try {
          await navigator.clipboard.writeText(inv.virtualAccount);
          notify.success(key, `Copied GTBank virtual account ${inv.virtualAccount} for ${inv.invoiceId}.`);
        } catch {
          notify.warning(key, `Could not copy automatically. Account: ${inv.virtualAccount}`);
        }
        break;
      case 'Show USSD':
        notify.success(key, `Patient dials ${inv.ussdCode} to pay ${formatCurrency(inv.balance)} for ${inv.invoiceId}.`,);
        break;
      default:
        notify.success(key, `${ch} channel ready for invoice ${inv.invoiceId}.`);
    }
  };

  const channels: { name: PaymentChannel; icon: typeof CreditCard; desc: string; cta: string }[] = [
    { name: 'POS Card', icon: CreditCard, desc: 'Tap or insert card at cashier desk. Auto-syncs to HMS.', cta: 'Open POS Terminal' },
    { name: 'SMS Pay Link', icon: Smartphone, desc: `Sent to ${inv.phone}. Hosted Remita / Paystack page.`, cta: 'Re-send SMS' },
    { name: 'USSD', icon: Hash, desc: `Dial ${inv.ussdCode} from any phone (works offline).`, cta: 'Show USSD' },
    { name: 'Bank Transfer', icon: Building2, desc: `Virtual a/c ${inv.virtualAccount} (GTBank). Auto-matches.`, cta: 'Copy Account' },
    { name: 'Online Card', icon: CreditCard, desc: 'Patient self-pays from dashboard.', cta: 'Open Patient Link' },
    { name: 'Cash', icon: Banknote, desc: 'Cashier desk only. Receipt issued instantly.', cta: 'Log Cash' },
  ];

  return (
    <Page title="Multi-Channel Payment Activation">
      <div className="hms-section p-4 mb-4">
        <Label>Select Invoice</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            {billingInvoices.map(i => (
              <SelectItem key={i.invoiceId} value={i.invoiceId}>{i.invoiceId} — {i.patientName} — {formatCurrency(i.balance)} due</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hms-section p-5 mb-4 bg-gradient-to-br from-sky-50 to-emerald-50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{inv.invoiceId}</p>
            <h3 className="font-display font-bold text-lg">{inv.patientName}</h3>
            <p className="text-sm text-muted-foreground">{inv.hospitalId} • {inv.department}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance Due</p>
            <p className="text-3xl font-bold font-display">{formatCurrency(inv.balance)}</p>
            <StatusPill status={inv.status} />
          </div>
        </div>
      </div>

      <h3 className="font-display font-semibold mb-3">All Channels Active Simultaneously</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(ch => {
          const Icon = ch.icon;
          return (
            <div key={ch.name} className="hms-section p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
                <h4 className="font-display font-semibold">{ch.name}</h4>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Active</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 min-h-[40px]">{ch.desc}</p>
              <LoadingButton size="sm" className="w-full" variant="outline" loading={isBusy(`channel-${inv.invoiceId}-${ch.cta}`)} loadingText="Please wait…" onClick={() => channelAction(ch.name, ch.cta)}>{ch.cta}</LoadingButton>
            </div>
          );
        })}
      </div>

      <div className="hms-section p-4 mt-4 bg-amber-50 ring-1 ring-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-900">
            <b>Anti-leakage rule:</b> No staff member can manually mark this invoice as paid. Status only updates from a verified gateway callback (POS terminal, Remita, Paystack, or matched bank settlement).
          </div>
        </div>
      </div>
    </Page>
  );
};

// ============================================================
// 4. POS TERMINAL (Cashier)
// ============================================================
export const PosTerminal = () => {
  const { invoices: billingInvoices, txns, capturePayment, reverseTxn, reprintReceipt, shift, openShift, closeShift } = useBillingStore();
  const { user } = useAuth();
  const { run, isBusy } = useAsyncAction();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentChannel>('POS Card');
  const [terminal, setTerminal] = useState('POS-A12');
  const [bankRef, setBankRef] = useState('');
  const [floatOpen, setFloatOpen] = useState('20000');
  // NHIA/HMO split
  const [splitOn, setSplitOn] = useState(false);
  const [coveragePct, setCoveragePct] = useState('90');
  const [scheme, setScheme] = useState<'NHIA' | 'HMO'>('NHIA');
  const [hmoName, setHmoName] = useState('Hygeia HMO');
  // Refund dialog
  const [refund, setRefund] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [supervisor, setSupervisor] = useState('');

  const inv = picked ? billingInvoices.find(i => i.invoiceId === picked) : null;
  const results = billingInvoices.filter(i =>
    !search || i.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
    i.patientName.toLowerCase().includes(search.toLowerCase()) ||
    i.visitCode.toLowerCase().includes(search.toLowerCase()) ||
    i.phone.includes(search)
  );
  const recent = txns.slice(0, 6);

  const handleCapture = async () => {
    if (!inv) {
      notify.error('pos-capture', 'Select an invoice before capturing payment');
      return;
    }
    const amt = Number(amount || inv.balance);
    if (!amt || amt <= 0) {
      notify.error('pos-capture', 'Enter a valid payment amount');
      return;
    }
    await run(
      'pos-capture',
      `Capturing ${formatCurrency(amt)} for ${inv.invoiceId}…`,
      () => {
        if (splitOn) {
          const pct = Math.max(0, Math.min(100, Number(coveragePct) || 0));
          const coveredAmt = Math.round((amt * pct) / 100);
          const patientAmt = amt - coveredAmt;
          if (coveredAmt > 0) {
            const r1 = capturePayment({ invoiceId: inv.invoiceId, amount: coveredAmt, channel: scheme, cashier: user?.name ?? shift.cashier, bankRef: scheme === 'HMO' ? hmoName : 'NHIA' });
            if (!r1.ok) return r1;
          }
          if (patientAmt > 0) {
            const r2 = capturePayment({ invoiceId: inv.invoiceId, amount: patientAmt, channel: method, cashier: user?.name ?? shift.cashier, terminal: method === 'POS Card' ? terminal : undefined, bankRef: method === 'Bank Transfer' ? bankRef : undefined });
            if (!r2.ok) return r2;
          }
          return { ok: true, message: `Split captured — ${scheme} ₦${coveredAmt.toLocaleString()} + ${method} ₦${patientAmt.toLocaleString()}` };
        }
        return capturePayment({
          invoiceId: inv.invoiceId, amount: amt, channel: method,
          cashier: user?.name ?? shift.cashier,
          terminal: method === 'POS Card' ? terminal : undefined,
          bankRef: method === 'Bank Transfer' ? bankRef : undefined,
        });
      },
      r => `${r.message}${'receipt' in r && r.receipt ? ` Receipt ${r.receipt}.` : ''}`,
      r => r.message ?? 'Payment capture failed',
    );
    setPicked(null); setAmount(''); setBankRef(''); setSplitOn(false);
  };

  const handleReprint = async (id: string) => {
    await run(
      `reprint-${id}`,
      'Sending receipt to printer…',
      () => reprintReceipt(id, user?.name ?? shift.cashier),
      r => r.message,
      r => r.message,
    );
  };

  const submitRefund = async () => {
    if (!refund) return;
    if (refundReason.trim().length < 8) {
      notify.error('refund', 'Reversal reason must be at least 8 characters');
      return;
    }
    if (supervisor.trim().length < 3) {
      notify.error('refund', 'Supervisor name is required');
      return;
    }
    await run(
      'refund',
      `Posting reversal for transaction ${refund}…`,
      () => { reverseTxn(refund, refundReason, supervisor); return { ok: true as const }; },
      () => 'Reversal posted. Invoice balance restored and audit entry logged.',
    );
    setRefund(null); setRefundReason(''); setSupervisor('');
  };

  const refundTxn = refund ? txns.find(t => t.id === refund) : null;

  return (
    <Page title="POS Terminal — Cashier Desk">
      {/* Shift bar */}
      <div className="hms-section p-3 mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${shift.open ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {shift.open ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Shift {shift.open ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-muted-foreground">Cashier: <b className="text-foreground">{shift.cashier}</b></span>
          <span className="text-muted-foreground">Float: <b className="text-foreground">{formatCurrency(shift.openingFloat)}</b></span>
          <span className="text-muted-foreground">Collected: <b className="text-emerald-700">{formatCurrency(shift.totalCollected)}</b></span>
        </div>
        <div className="flex gap-2">
          {!shift.open ? (
            <div className="flex gap-2 items-center">
              <Input className="w-32" value={floatOpen} onChange={e => setFloatOpen(e.target.value)} placeholder="Opening float" />
              <LoadingButton size="sm" loading={isBusy('shift-open')} loadingText="Opening…" onClick={() => run(
                'shift-open',
                'Opening cashier shift…',
                () => { openShift(user?.name ?? 'Cashier', Number(floatOpen) || 0); return { ok: true as const }; },
                () => `Shift opened with float ${formatCurrency(Number(floatOpen) || 0)}.`,
              )}>Open Shift</LoadingButton>
            </div>
          ) : (
            <LoadingButton size="sm" variant="outline" loading={isBusy('shift-close')} loadingText="Closing…" onClick={() => run(
              'shift-close',
              'Closing shift and generating Z-report…',
              () => { closeShift(); return { ok: true as const }; },
              () => `Shift closed. Collected ${formatCurrency(shift.totalCollected)} today.`,
            )}>Close Shift</LoadingButton>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="hms-section p-4 mb-4">
            <Label>Search Invoice (required — POS cannot operate without HMS invoice)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Invoice ID, patient name, visit code, phone…" className="pl-9" />
            </div>
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {results.filter(i => i.balance > 0).map(i => (
              <button key={i.id} onClick={() => { setPicked(i.invoiceId); setAmount(String(i.balance)); }} className={`w-full text-left hms-section p-3 hover:bg-muted/30 ${picked === i.invoiceId ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{i.invoiceId}</p>
                    <p className="font-medium">{i.patientName}</p>
                    <p className="text-xs text-muted-foreground">{i.department} • {i.visitCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(i.balance)}</p>
                    <StatusPill status={i.status} />
                  </div>
                </div>
              </button>
            ))}
            {results.filter(i => i.balance > 0).length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">No outstanding invoices match — all collected ✅</div>
            )}
          </div>

          {/* Recent receipts */}
          <div className="hms-section p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-semibold text-sm">Recent Receipts</h4>
              <span className="text-xs text-muted-foreground">Last {recent.length}</span>
            </div>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {recent.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No receipts yet this session</p>}
              {recent.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                  <div className="min-w-0">
                    <div className="font-mono truncate">{t.ref}</div>
                    <div className="text-muted-foreground truncate">{t.patientName} · {t.channel}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                    <Button size="sm" variant="ghost" title="Reprint" onClick={() => handleReprint(t.id)}><Receipt className="h-3.5 w-3.5" /></Button>
                    {t.status !== 'FAILED' && (
                      <Button size="sm" variant="ghost" title="Reverse / Refund" onClick={() => { setRefund(t.id); setRefundReason(''); setSupervisor(''); }}><RefreshCw className="h-3.5 w-3.5 text-rose-600" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hms-section p-5">
          <h3 className="font-display font-semibold mb-4">POS Payment Capture</h3>
          {!inv ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
              Search and select an invoice to begin
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Patient:</span><span className="font-medium">{inv.patientName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice:</span><span className="font-mono text-xs">{inv.invoiceId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance:</span><span className="font-bold text-rose-600">{formatCurrency(inv.balance)}</span></div>
              </div>
              <div><Label>Amount to Capture (₦)</Label><Input value={amount} onChange={e => setAmount(e.target.value)} type="number" /></div>

              {/* NHIA / HMO split */}
              <div className="rounded-lg ring-1 ring-border p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={splitOn} onChange={e => setSplitOn(e.target.checked)} className="h-4 w-4" />
                  <span>NHIA / HMO Co-pay Split</span>
                </label>
                {splitOn && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <Label className="text-xs">Scheme</Label>
                      <Select value={scheme} onValueChange={(v) => setScheme(v as 'NHIA' | 'HMO')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NHIA">NHIA</SelectItem>
                          <SelectItem value="HMO">Private HMO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Coverage %</Label>
                      <Input type="number" min="0" max="100" value={coveragePct} onChange={e => setCoveragePct(e.target.value)} />
                    </div>
                    {scheme === 'HMO' && (
                      <div className="col-span-2"><Label className="text-xs">HMO Name</Label><Input value={hmoName} onChange={e => setHmoName(e.target.value)} /></div>
                    )}
                    <div className="col-span-2 text-xs rounded bg-sky-50 p-2 text-sky-900">
                      {scheme} covers <b>{formatCurrency(Math.round((Number(amount || inv.balance) * (Number(coveragePct) || 0)) / 100))}</b> · Patient pays <b>{formatCurrency(Number(amount || inv.balance) - Math.round((Number(amount || inv.balance) * (Number(coveragePct) || 0)) / 100))}</b> via {method}
                    </div>
                  </div>
                )}
              </div>

              <div><Label>{splitOn ? 'Patient Co-pay Method' : 'Payment Method'}</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POS Card">POS Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer (with ref)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {method === 'POS Card' && (
                <div><Label>POS Terminal ID</Label><Input value={terminal} onChange={e => setTerminal(e.target.value)} /></div>
              )}
              {method === 'Bank Transfer' && (
                <div><Label>Bank Reference</Label><Input value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="e.g. GTB/REF/77821" /></div>
              )}
              <div className="rounded-lg bg-sky-50 ring-1 ring-sky-200 p-2 text-xs text-sky-900">
                Once captured, the system locks the receipt, syncs to HMS, and unlocks the doctor's consultation screen automatically.
              </div>
              <LoadingButton className="w-full" loading={isBusy('pos-capture')} loadingText="Capturing…" onClick={handleCapture}>
                <CreditCard className="h-4 w-4 mr-1" /> Capture Payment
              </LoadingButton>
            </div>
          )}
        </div>
      </div>

      {/* Refund / Reversal dialog */}
      <Dialog open={!!refund} onOpenChange={(o) => { if (!o) { setRefund(null); setRefundReason(''); setSupervisor(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-rose-600" /> Reversal / Refund</DialogTitle>
            <DialogDescription>Reversals require supervisor authorisation and a written reason. Both are permanently logged.</DialogDescription>
          </DialogHeader>
          {refundTxn && (
            <div className="space-y-3">
              <div className="rounded-lg bg-rose-50 p-3 text-xs space-y-1">
                <div>Receipt: <b className="font-mono">{refundTxn.ref}</b></div>
                <div>Patient: <b>{refundTxn.patientName}</b></div>
                <div>Channel: <b>{refundTxn.channel}</b> · Amount: <b>{formatCurrency(refundTxn.amount)}</b></div>
              </div>
              <div><Label>Supervisor Name</Label><Input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Authorising supervisor" /></div>
              <div><Label>Reason (min 8 chars)</Label><Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="e.g. Duplicate POS charge — patient debited twice." /></div>
            </div>
          )}
          <DialogFooter>
            <LoadingButton variant="destructive" loading={isBusy('refund')} loadingText="Posting…" onClick={submitRefund}>Post Reversal</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};


// ============================================================
// 5. RECONCILIATION ENGINE
// ============================================================
export const ReconciliationEngine = () => {
  const { txns: billingTxns } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const matched = billingTxns.filter(t => t.matched);
  const unmatched = billingTxns.filter(t => !t.matched);

  return (
    <Page title="Reconciliation Engine">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Matched" value={String(matched.length)} icon={CheckCircle2} subtitle="POS ↔ HMS ↔ Bank" />
        <SummaryCard title="Unmatched" value={String(unmatched.length)} icon={AlertTriangle} subtitle="Needs review" />
        <SummaryCard title="Total Reconciled" value={formatCurrency(matched.reduce((s, t) => s + t.amount, 0))} icon={Banknote} />
        <SummaryCard title="Match Rate" value={billingTxns.length ? `${Math.round((matched.length / billingTxns.length) * 100)}%` : '—'} icon={RefreshCw} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched / Mismatched</TabsTrigger>
        </TabsList>
        {(['all', 'matched', 'unmatched'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className="hms-section overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="text-left p-3">Receipt</th><th className="text-left p-3">Invoice</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Channel</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-left p-3">Match</th><th className="text-left p-3">Action</th></tr>
                  </thead>
                  <tbody>
                    {billingTxns.filter(t => tab === 'all' || (tab === 'matched' ? t.matched : !t.matched)).map(t => (
                      <tr key={t.id} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{t.ref}</td>
                        <td className="p-3 font-mono text-xs">{t.invoiceId}</td>
                        <td className="p-3 font-medium">{t.patientName}</td>
                        <td className="p-3"><StatusBadge status={t.channel} /></td>
                        <td className="p-3 font-semibold">{formatCurrency(t.amount)}</td>
                        <td className="p-3"><StatusPill status={t.status} /></td>
                        <td className="p-3">
                          {t.matched
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3 w-3" /> Matched</span>
                            : <span className="inline-flex items-center gap-1 text-rose-600 text-xs"><AlertTriangle className="h-3 w-3" /> Unmatched</span>}
                        </td>
                        <td className="p-3">
                          {!t.matched && (
                            <LoadingButton size="sm" variant="outline" loading={isBusy(`match-${t.id}`)} loadingText="Matching…" onClick={() => run(
                              `match-${t.id}`,
                              `Matching receipt ${t.ref} to ${t.invoiceId}…`,
                              () => ({ ok: true as const }),
                              () => `Receipt ${t.ref} queued for finance approval (₦${t.amount.toLocaleString()}).`,
                            )}>Resolve</LoadingButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="hms-section p-4 mt-4 bg-emerald-50 ring-1 ring-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-700 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <b>Daily reconciliation report</b> auto-generates at 23:59. Compares POS terminals, virtual accounts, and HMS invoice ledger.
            </div>
          </div>
          <LoadingButton size="sm" variant="outline" loading={isBusy('recon-run')} loadingText="Running…" onClick={() => run(
            'recon-run',
            'Generating daily reconciliation report…',
            () => ({ ok: true as const }),
            () => `Reconciliation report generated (${matched.length} matched, ${unmatched.length} unmatched). Sent to Finance.`,
          )}>Run Now</LoadingButton>
        </div>
      </div>
    </Page>
  );
};

// ============================================================
// 6. CONSULTATION ACCESS GATE
// ============================================================
export const ConsultationGate = () => {
  const navigate = useNavigate();
  const { visits, emergencyOverride, resendPayLink } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const submitOverride = async (visitCode: string) => {
    if (reason.trim().length < 10) {
      notify.error('override', 'Emergency override reason must be at least 10 characters');
      return;
    }
    await run(
      'override',
      `Logging emergency override for ${visitCode}…`,
      () => { emergencyOverride({ visitCode, doctor: 'Dr. On-call', reason }); return { ok: true as const }; },
      () => `Emergency override logged for ${visitCode}. Consultation unlocked — Finance review required.`,
    );
    setOverrideOpen(null);
    setReason('');
  };

  return (
    <Page title="Consultation Access Gate">
      <div className="hms-section p-4 mb-4 bg-gradient-to-r from-rose-50 to-amber-50">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-rose-700 mt-1" />
          <div>
            <h3 className="font-display font-semibold">Strict Rule: No Payment = No Consultation</h3>
            <p className="text-xs text-muted-foreground mt-1">Doctor's consultation screen will not load unless the invoice status = PAID. Emergency override is the only exception, and is fully audited.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visits.map(v => (
          <div key={v.id} className="hms-section p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{v.visitCode}</p>
                <h4 className="font-display font-semibold">{v.patientName}</h4>
                <p className="text-xs text-muted-foreground">{v.attendingDoctor} • {v.department}</p>
              </div>
              <StatusPill status={v.paymentStatus} />
            </div>

            {v.consultationUnlocked ? (
              <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-3">
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <Unlock className="h-4 w-4" />
                  Consultation Unlocked
                  {v.emergencyOverride && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ml-auto">EMERGENCY OVERRIDE</span>}
                </div>
                {v.emergencyOverride && (
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div><b>By:</b> {v.emergencyOverride.doctor}</div>
                    <div><b>Reason:</b> {v.emergencyOverride.reason}</div>
                    <div><b>At:</b> {v.emergencyOverride.timestamp}</div>
                    <div className="text-amber-700"><b>Status:</b> {v.emergencyOverride.reviewed ? 'Finance reviewed' : 'Pending finance review'}</div>
                  </div>
                )}
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => navigate(`/consultation/visit/${v.visitCode}`)}>
                  <Stethoscope className="h-3 w-3 mr-1" /> Open Consultation Screen
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-rose-50 ring-1 ring-rose-200 p-3">
                <div className="flex items-center gap-2 text-rose-800 font-medium mb-2">
                  <Lock className="h-4 w-4" /> Payment Required
                </div>
                <p className="text-xs text-muted-foreground">
                  Balance: <b className="text-foreground">{formatCurrency(v.consultationFee)}</b> via invoice <span className="font-mono">{v.invoiceId}</span>
                </p>
                <div className="flex gap-2 mt-3">
                  <LoadingButton size="sm" variant="outline" className="flex-1" loading={isBusy(`gate-sms-${v.invoiceId}`)} loadingText="Sending…" onClick={() => run(
                    `gate-sms-${v.invoiceId}`,
                    `Sending pay link to ${v.phone}…`,
                    () => { resendPayLink(v.invoiceId); return { ok: true as const }; },
                    () => `Pay link SMS sent to ${v.phone} for ${v.invoiceId}.`,
                  )}>
                    <Send className="h-3 w-3 mr-1" /> Resend Pay Link
                  </LoadingButton>
                  <Dialog open={overrideOpen === v.id} onOpenChange={(o) => { setOverrideOpen(o ? v.id : null); setReason(''); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="flex-1">
                        <ShieldAlert className="h-3 w-3 mr-1" /> Emergency
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-600" /> Emergency Payment Override</DialogTitle>
                        <DialogDescription>This bypass will be permanently logged with your name, time, and reason. Finance will review.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="rounded-lg bg-rose-50 p-3 text-xs">
                          Patient: <b>{v.patientName}</b> • Invoice: <b className="font-mono">{v.invoiceId}</b> • Amount: <b>{formatCurrency(v.consultationFee)}</b>
                        </div>
                        <div>
                          <Label>Clinical Reason (required, min 10 chars)</Label>
                          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Acute chest pain, ?MI, immediate intervention required." />
                        </div>
                      </div>
                      <DialogFooter>
                        <LoadingButton variant="destructive" loading={isBusy('override')} loadingText="Logging…" onClick={() => submitOverride(v.visitCode)}>Confirm Override & Log</LoadingButton>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
};

// ============================================================
// 7. AUDIT TRAIL
// ============================================================
export const BillingAuditTrail = () => {
  const { audit: billingAudit } = useBillingStore();
  const { user } = useAuth();
  const isCashier = user?.role === 'cashier';
  const [mineOnly, setMineOnly] = useState(isCashier);
  const [q, setQ] = useState('');

  const filtered = billingAudit.filter(a => {
    if (mineOnly && user?.name && a.actor !== user.name) return false;
    if (q && !(`${a.actor} ${a.action} ${a.invoiceRef}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <Page title="Billing Audit Trail">
      <div className="hms-section p-4 mb-4 bg-sky-50 ring-1 ring-sky-200">
        <div className="flex items-start gap-2">
          <ClipboardCheck className="h-4 w-4 text-sky-700 mt-0.5" />
          <p className="text-xs text-sky-900">
            Every billing event — invoice generation, payment capture, channel switch, override, reconciliation, reprint, reversal — is permanently logged. This trail is the basis for daily finance reconciliation and government audit.
          </p>
        </div>
      </div>

      <div className="hms-section p-3 mb-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by actor, action, invoice…" value={q} onChange={e => setQ(e.target.value)} className="max-w-md" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} className="h-4 w-4" />
          <span>{isCashier ? 'Show only my activity' : `Show only ${user?.name ?? 'my'} entries`}</span>
        </label>
        <span className="text-xs text-muted-foreground">{filtered.length} of {billingAudit.length} entries</span>
      </div>

      <div className="hms-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">Time</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Role</th><th className="text-left p-3">Action</th><th className="text-left p-3">Channel</th><th className="text-left p-3">Invoice</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">No audit entries match the current filter.</td></tr>
              )}
              {filtered.map(a => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{a.timestamp}</td>
                  <td className="p-3 font-medium">{a.actor}</td>
                  <td className="p-3 text-xs">{a.role}</td>
                  <td className="p-3 text-sm">{a.action}</td>
                  <td className="p-3">{a.channel ? <StatusBadge status={a.channel} /> : <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="p-3 font-mono text-xs">{a.invoiceRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
};
